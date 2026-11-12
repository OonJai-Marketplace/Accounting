-- Preserve the highest two priorities on devices that used the three-line dock.
update private.dock_checklists set pins=pins[1:2] where cardinality(pins)>2;
alter table private.dock_checklists drop constraint dock_checklists_pins_check,
  add constraint dock_checklists_pins_check check (cardinality(pins)<=2);

create or replace function private.sample_desktop_dock(include_storage boolean, only_owner uuid default null)
returns void language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(143351, 1);
  if include_storage then
    insert into private.dock_quota (checked_at, db_bytes, file_bytes)
    select clock_timestamp(), pg_database_size(current_database()),
           coalesce(sum((metadata->>'size')::bigint) filter (where metadata->>'size' ~ '^[0-9]+$'), 0)
    from storage.objects
    on conflict (singleton) do update set checked_at = excluded.checked_at,
      db_bytes = excluded.db_bytes, file_bytes = excluded.file_bytes;
  end if;

  insert into private.dock_checklists (owner_id, checked_at, tasks)
  select p.id, clock_timestamp(), coalesce(list.tasks, '[]'::jsonb)
  from public.profiles p
  cross join lateral (
    select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title,
               'steps', t.steps, 'revision', t.updated_at,
               'done', counts.done, 'total', counts.total) order by t.created_at,t.id) as tasks
    from public.workspace_todos136 t
    cross join lateral (
      select count(*) as total, count(*) filter (where step->>'done' = 'true') as done
      from jsonb_array_elements(case when jsonb_typeof(t.steps)='array' then t.steps else '[]'::jsonb end) step
    ) counts
    where t.owner_id = p.id and not coalesce(t.is_template1438,false)
      and coalesce(t.todo_config1438->>'type',case when t.sequential then 'sequential' else 'regular' end)='sequential'
      and coalesce(t.todo_config1438->>'archived1443','false') <> 'true'
  ) list
  where p.role='admin' and p.status='active' and (only_owner is null or p.id=only_owner)
  on conflict (owner_id) do update set checked_at=excluded.checked_at, tasks=excluded.tasks;
end;
$$;
create or replace function private.desktop_dock_for_session(p_action text, p_pins uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  items jsonb;
begin
  if actor is null or not public.is_admin() then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  if p_action = 'refresh' then
    perform private.sample_desktop_dock(true, actor);
  elsif p_action = 'tasks' then
    perform private.sample_desktop_dock(false, actor);
  elsif p_action = 'pins' then
    select tasks into items from private.dock_checklists where owner_id=actor for update;
    if items is null or p_pins is null or cardinality(p_pins)>2 or
      (select count(distinct id) from unnest(p_pins) id) <> cardinality(p_pins) or
      exists (select 1 from unnest(p_pins) id where not items @> jsonb_build_array(jsonb_build_object('id',id))) then
      raise exception 'Choose up to two current checklists' using errcode='22023';
    end if;
    update private.dock_checklists set pins=p_pins where owner_id=actor;
  elsif p_action is distinct from 'read' then
    raise exception 'Unknown status action' using errcode='22023';
  end if;
  return jsonb_build_object(
    'tasks', coalesce((select tasks from private.dock_checklists where owner_id=actor),'[]'::jsonb),
    'tasks_at', (select checked_at from private.dock_checklists where owner_id=actor),
    'pins', (select pins from private.dock_checklists where owner_id=actor),
    'storage', (select jsonb_build_object('checked_at',checked_at,'db_bytes',db_bytes,
       'file_bytes',file_bytes,'db_limit',500000000,'file_limit',1000000000) from private.dock_quota));
end;
$$;

-- Save through the same RLS policies, checklist validation and completion-history
-- trigger as the To-do Lists screen. Update the saved task status in this transaction.
create function public.set_desktop_dock_step(p_task uuid,p_revision timestamptz,p_index integer,p_done boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  actor uuid := auth.uid();
  item public.workspace_todos136%rowtype;
  edited jsonb;
  outcome text := 'saved';
begin
  if actor is null or not public.is_admin() then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  if p_done is null or p_index is null or p_revision is null then
    raise exception 'Incomplete step selection' using errcode='22023';
  end if;
  select * into item from public.workspace_todos136 t
    where t.id=p_task and t.owner_id=actor and not coalesce(t.is_template1438,false)
      and coalesce(t.todo_config1438->>'archived1443','false') <> 'true'
      and coalesce(t.todo_config1438->>'type',case when t.sequential then 'sequential' else 'regular' end)='sequential'
    for update;
  if not found or item.updated_at is distinct from p_revision then
    outcome := 'changed';
  elsif p_index<0 or p_index>=jsonb_array_length(item.steps) then
    raise exception 'Step unavailable' using errcode='22023';
  elsif p_done and exists (
    select 1 from jsonb_array_elements(item.steps) with ordinality x(step,n)
    where n<=p_index and step->>'done' is distinct from 'true'
  ) then
    outcome := 'order';
  else
    -- Reopening a sequential step also reopens all following steps.
    select jsonb_agg(case when n=p_index+1 or (not p_done and n>p_index+1)
      then jsonb_set(step,'{done}',to_jsonb(p_done)) else step end order by n)
      into edited from jsonb_array_elements(item.steps) with ordinality x(step,n);
    if item.steps is distinct from edited then
      update public.workspace_todos136 set steps=edited,updated_at=clock_timestamp()
        where id=item.id and owner_id=actor;
      if not found then raise exception 'Step could not be saved' using errcode='42501'; end if;
    end if;
  end if;
  return private.desktop_dock_for_session('tasks',null) || jsonb_build_object('outcome',outcome);
end;
$$;
revoke all on function public.set_desktop_dock_step(uuid,timestamptz,integer,boolean) from public,anon,authenticated;
grant execute on function public.set_desktop_dock_step(uuid,timestamptz,integer,boolean) to authenticated;

-- Existing accounts can open checklists immediately. Storage and the cron schedules stay as configured.
select private.sample_desktop_dock(false);
