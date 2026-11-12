-- Reporting snapshots only. Each scheduled run replaces a bounded set of rows.
create table private.dock_quota (
  singleton boolean primary key default true check (singleton),
  checked_at timestamptz not null,
  db_bytes bigint not null,
  file_bytes bigint not null
);
create table private.dock_checklists (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  checked_at timestamptz not null,
  tasks jsonb not null,
  pins uuid[] check (cardinality(pins) <= 3)
);
alter table private.dock_quota enable row level security;
alter table private.dock_checklists enable row level security;
revoke all on private.dock_quota, private.dock_checklists from public, anon, authenticated;

-- Only the scheduler and the explicitly authorized manual refresh call this.
create function private.sample_desktop_dock(include_storage boolean, only_owner uuid default null)
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
revoke all on function private.sample_desktop_dock(boolean,uuid) from public, anon, authenticated;

create function private.desktop_dock_for_session(p_action text, p_pins uuid[])
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
  elsif p_action = 'pins' then
    select tasks into items from private.dock_checklists where owner_id=actor for update;
    if items is null or p_pins is null or cardinality(p_pins)>3 or
      (select count(distinct id) from unnest(p_pins) id) <> cardinality(p_pins) or
      exists (select 1 from unnest(p_pins) id where not items @> jsonb_build_array(jsonb_build_object('id',id))) then
      raise exception 'Choose up to three current checklists' using errcode='22023';
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
revoke all on function private.desktop_dock_for_session(text,uuid[]) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.desktop_dock_for_session(text,uuid[]) to authenticated;

create function public.desktop_dock_status(p_action text default 'read', p_pins uuid[] default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.desktop_dock_for_session(p_action,p_pins);
$$;
revoke all on function public.desktop_dock_status(text,uuid[]) from public, anon, authenticated;
grant execute on function public.desktop_dock_status(text,uuid[]) to authenticated;

select private.sample_desktop_dock(true);
-- pg_cron uses GMT. Vientiane is UTC+7 year round.
select cron.schedule('desktop-dock-morning','0 23 * * *','select private.sample_desktop_dock(true)');
select cron.schedule('desktop-dock-midday','0 5 * * *','select private.sample_desktop_dock(false)');
