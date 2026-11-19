-- The worker stores only Drive metadata and page counts. Accounting entries are never written.
create table public.receipt_drive_preview_state (
  scope text primary key, generation uuid not null default gen_random_uuid(), cursor jsonb,
  lease uuid, lease_until timestamptz, last_complete timestamptz, last_error text
);
create table public.receipt_drive_preview_files (
  scope text not null references public.receipt_drive_preview_state(scope),
  file_id text not null, name text not null, folder text not null, content_key text not null,
  modified timestamptz not null, pages integer check (pages > 0), issue text, retry boolean not null,
  seen uuid not null, primary key(scope,file_id)
);
create index receipt_drive_preview_recent on public.receipt_drive_preview_files(scope,modified desc,file_id);
alter table public.receipt_drive_preview_state enable row level security;
alter table public.receipt_drive_preview_files enable row level security;
revoke all on public.receipt_drive_preview_state,public.receipt_drive_preview_files from public,anon,authenticated;
grant select,insert,update,delete on public.receipt_drive_preview_state,public.receipt_drive_preview_files to service_role;

create function public.receipt_preview_claim(p_scope text,p_lease uuid) returns jsonb
language plpgsql set search_path='' as $$
declare job public.receipt_drive_preview_state;
begin
  insert into public.receipt_drive_preview_state(scope,lease,lease_until)
  values(p_scope,p_lease,now()+interval '2 minutes')
  on conflict(scope) do update set lease=excluded.lease,lease_until=excluded.lease_until
  where receipt_drive_preview_state.lease_until is null or receipt_drive_preview_state.lease_until<now()
  returning * into job;
  if job.scope is null then return null; end if;
  return jsonb_build_object('cursor',job.cursor,'generation',job.generation);
end $$;

create function public.receipt_preview_step(p_scope text,p_lease uuid,p_files jsonb,p_cursor jsonb,p_done boolean)
returns void language plpgsql set search_path='' as $$
declare cycle uuid;
begin
  select generation into strict cycle from public.receipt_drive_preview_state
  where scope=p_scope and lease=p_lease and lease_until>now() for update;
  insert into public.receipt_drive_preview_files(scope,file_id,name,folder,content_key,modified,pages,issue,retry,seen)
  select p_scope,f.file_id,f.name,f.folder,f.content_key,f.modified,f.pages,f.issue,f.retry,cycle
  from jsonb_to_recordset(p_files) as f(file_id text,name text,folder text,content_key text,modified timestamptz,pages integer,issue text,retry boolean)
  on conflict(scope,file_id) do update set name=excluded.name,folder=excluded.folder,content_key=excluded.content_key,
    modified=excluded.modified,pages=excluded.pages,issue=excluded.issue,retry=excluded.retry,seen=excluded.seen;
  if p_done then
    delete from public.receipt_drive_preview_files where scope=p_scope and seen<>cycle;
  end if;
  update public.receipt_drive_preview_state set
    cursor=case when p_done then null else p_cursor end,
    generation=case when p_done then gen_random_uuid() else cycle end,
    last_complete=case when p_done then now() else last_complete end,last_error=null
  where scope=p_scope;
end $$;

do $$begin
  if not exists(select 1 from vault.secrets where name='receipt_drive_preview_job') then
    perform vault.create_secret(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'receipt_drive_preview_job');
  end if;
end$$;
create function private.receipt_preview_job_allowed(p_key text) returns boolean
language sql security definer set search_path='' as $$
  select exists(select 1 from vault.decrypted_secrets where name='receipt_drive_preview_job' and decrypted_secret=p_key)
$$;
create function public.receipt_preview_job_allowed(p_key text) returns boolean
language sql set search_path='' as $$select private.receipt_preview_job_allowed(p_key)$$;
revoke all on function private.receipt_preview_job_allowed(text),public.receipt_preview_job_allowed(text),public.receipt_preview_claim(text,uuid),public.receipt_preview_step(text,uuid,jsonb,jsonb,boolean) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.receipt_preview_job_allowed(text),public.receipt_preview_job_allowed(text),public.receipt_preview_claim(text,uuid),public.receipt_preview_step(text,uuid,jsonb,jsonb,boolean) to service_role;

create function private.run_receipt_drive_preview() returns bigint
language sql security definer set search_path='' as $$
  select net.http_post(
    url:='https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/receipt-drive-preview',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||s.decrypted_secret),
    body:='{"action":"scan"}'::jsonb,timeout_milliseconds:=90000)
  from vault.decrypted_secrets s
  where s.name='receipt_drive_preview_job' and exists(
    select 1 from public.budget_settings14313 where id=true and data#>>'{googleSheets143129,receiptDrive228,active,folderURL}' is not null)
$$;
revoke all on function private.run_receipt_drive_preview() from public,anon,authenticated;
select cron.schedule('receipt-drive-preview','*/5 * * * *','select private.run_receipt_drive_preview()');
notify pgrst,'reload schema';
