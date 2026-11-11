-- Independent Google file imports replace the database mirror. Preserve its history and pending revisions.
do $$
declare job record; captured record;
begin
 for job in select jobid from cron.job where jobname in ('accounting-sheet-retry201','accounting-yearly-storage231') loop
  perform cron.unschedule(job.jobid);
 end loop;
 for captured in select tgrelid::regclass as target,tgname from pg_trigger
     where tgfoid='private.sheet_archive_capture194()'::regprocedure and not tgisinternal loop
  execute format('drop trigger %I on %s',captured.tgname,captured.target);
 end loop;
end $$;

update private.sheet_archive_config194 set enabled=false, sheet='', connection_sheet='',
 lease=null, lease_until=null, copy_requested239=false where id;
alter table private.sheet_archive_config194 drop constraint if exists accounting_sheet_disconnected332;
alter table private.sheet_archive_config194 add constraint accounting_sheet_disconnected332
 check (not enabled and sheet='' and connection_sheet='');
create or replace function public.sheet_archive_wake194() returns bigint
 language sql set search_path='' as $$ select null::bigint $$;

drop function if exists public.portable_sheet_lease328(uuid,boolean);
drop function if exists public.sheets_journal_import_v2(date,date);
revoke execute on function public.storage_year_activate231(uuid,text,text,text,text) from service_role,public,anon,authenticated;
update public.budget_settings14313 set data=data #- '{googleSheets143129,archiveDrive230}',version=version+1
 where data->'googleSheets143129' ? 'archiveDrive230';
