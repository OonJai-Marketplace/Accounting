-- Review correction: acknowledge only events captured before the snapshot; retain TRUNCATE deletion events.
create or replace function public.sheet_archive_job194(p_lease uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c private.sheet_archive_config194; queued jsonb; snapshot jsonb; begin
 update private.sheet_archive_config194 set lease=p_lease,lease_until=now()+interval '5 minutes'
 where id and enabled and (lease_until is null or lease_until<now()) returning * into c;
 if not found then return null; end if;
 -- Capture acknowledgement IDs first: an event committed during the subsequent snapshot remains queued.
 select coalesce(jsonb_agg(q order by id),'[]') into queued from (select * from private.sheet_archive_queue194 order by id limit 1000) q;
 snapshot:=private.sheet_archive_snapshot194();
 return jsonb_build_object('config',to_jsonb(c),'tables',snapshot,'queue',queued,
  'years',(select coalesce(jsonb_agg(y order by year),'[]') from private.sheet_archive_years194 y));
end $$;

create or replace function public.scoped_reset14232(p_backup jsonb,p_apply boolean default false,p_confirmation text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare permit private.sheet_archive_permits194; result jsonb; t record; begin
 if coalesce(p_apply,false) then
  select * into permit from private.sheet_archive_permits194 where actor=auth.uid() and mode='reset' and expires_at>now() for update;
  if not found or permit.pack is distinct from p_backup then raise exception 'Compare the selected database records with Google Sheets again before permanent deletion'; end if;
  delete from private.sheet_archive_permits194 where actor=auth.uid();
  delete from private.sheet_archive_excel194 where actor=auth.uid();
 end if;
 result:=public.scoped_reset_before194(p_backup,p_apply,p_confirmation);
 if coalesce(p_apply,false) then
  -- TRUNCATE has no row DELETE triggers. Keep its exact pre-delete rows in the durable queue.
  for t in select * from jsonb_each(p_backup->'tables') loop
   insert into private.sheet_archive_queue194(table_name,operation,record) select t.key,'DELETE',value from jsonb_array_elements(t.value);
  end loop;
  perform public.sheet_archive_wake194();
 end if;
 return result;
end $$;
