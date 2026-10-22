-- Draft dispositions affect the AI inbox only. Source Sheets and posted books remain intact.
create table if not exists public.drive_draft_dispositions143160 (
 sheet text not null check (sheet ~ '^[a-zA-Z0-9_-]{20,120}$'),
 draft text not null check (draft ~ '^[a-zA-Z0-9_-]{8,64}$'),
 status text not null check (status in ('rejected','deleted')),
 updated_by uuid not null,
 updated_at timestamptz not null default now(),
 primary key (sheet,draft)
);
alter table public.drive_draft_dispositions143160 enable row level security;
revoke all on public.drive_draft_dispositions143160 from public,anon,authenticated;

create or replace function public.drive_draft_dispositions143160(p_sheet text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or public.can_action113('journal','post') is not true or public.accounting_workspace_allowed123() is not true then
  raise exception 'Journal posting permission required' using errcode='42501';
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object('draft',draft,'status',status)) from public.drive_draft_dispositions143160 where sheet=p_sheet),'[]'::jsonb);
end $$;

create or replace function public.set_drive_draft_disposition143160(p_sheet text,p_draft text,p_status text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or public.can_action113('journal','post') is not true or public.accounting_workspace_allowed123() is not true then
  raise exception 'Journal posting permission required' using errcode='42501';
 end if;
 if p_sheet is null or p_sheet !~ '^[a-zA-Z0-9_-]{20,120}$' or p_draft is null or p_draft !~ '^[a-zA-Z0-9_-]{8,64}$' or p_status is null or p_status not in ('rejected','deleted','pending') then
  raise exception 'Invalid draft disposition';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('drive-v1:'||p_sheet||':'||p_draft,0));
 if public.drive_journal_receipt143128(p_sheet,p_draft) is not null then
  raise exception 'This draft has already been posted. Use the posted journal correction controls.';
 end if;
 if exists(select 1 from public.drive_draft_dispositions143160 where sheet=p_sheet and draft=p_draft and status='deleted') then
  if p_status='deleted' then return; end if;
  raise exception 'This draft was deleted from the AI inbox. Submit a new draft reference to prepare it again.';
 end if;
 if p_status='pending' then
  delete from public.drive_draft_dispositions143160 where sheet=p_sheet and draft=p_draft;
 else
  insert into public.drive_draft_dispositions143160(sheet,draft,status,updated_by) values(p_sheet,p_draft,p_status,auth.uid())
  on conflict(sheet,draft) do update set status=excluded.status,updated_by=excluded.updated_by,updated_at=now();
 end if;
end $$;

-- Keep the original per-draft receipt and cross-user lock for older clients too.
create or replace function public.approve_drive_journal143128(p_sheet text,p_draft text,p_entry jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare k text; old jsonb; result jsonb;
begin
 if auth.uid() is null or public.can_action113('journal','post') is not true or public.accounting_workspace_allowed123() is not true then
  raise exception 'Journal posting permission required' using errcode='42501';
 end if;
 if p_sheet is null or p_draft is null or p_sheet !~ '^[a-zA-Z0-9_-]{20,120}$' or p_draft !~ '^[a-zA-Z0-9_-]{8,64}$' then raise exception 'Invalid Drive draft reference'; end if;
 k:='drive-v1:'||p_sheet||':'||p_draft;
 perform pg_advisory_xact_lock(hashtextextended(k,0));
 old:=public.drive_journal_receipt143128(p_sheet,p_draft);
 if old is not null then
  if old->'payload' is distinct from jsonb_build_array(p_entry) then raise exception 'This Drive draft was already posted with different content. Review its existing journal; do not change its reference.'; end if;
  return old->'result';
 end if;
 if exists(select 1 from public.drive_draft_dispositions143160 where sheet=p_sheet and draft=p_draft) then
  raise exception 'This AI draft was rejected or deleted. Refresh the AI Journal.';
 end if;
 result:=public.post_journal_batch14228(k,jsonb_build_array(p_entry));
 return result;
end $$;

-- One transaction, separate entries and receipts, including when posting dates match.
create or replace function public.approve_drive_journal_batch143160(p_sheet text,p_drafts jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; result jsonb:='[]'::jsonb;
begin
 if auth.uid() is null or public.can_action113('journal','post') is not true or public.accounting_workspace_allowed123() is not true then
  raise exception 'Journal posting permission required' using errcode='42501';
 end if;
 if p_sheet is null or p_sheet !~ '^[a-zA-Z0-9_-]{20,120}$' or jsonb_typeof(p_drafts) is distinct from 'array' then raise exception 'Invalid AI batch'; end if;
 if jsonb_array_length(p_drafts) not between 1 and 100 then raise exception 'Prepare 1 to 100 separate entries'; end if;
 if exists(select 1 from jsonb_array_elements(p_drafts) d where d->>'draft_id' is null or d->>'draft_id' !~ '^[a-zA-Z0-9_-]{8,64}$' or jsonb_typeof(d->'entry') is distinct from 'object') then raise exception 'Invalid draft in AI batch'; end if;
 if (select count(distinct d->>'draft_id') from jsonb_array_elements(p_drafts) d)<>jsonb_array_length(p_drafts) then raise exception 'Duplicate draft in AI batch'; end if;
 for item in select value from jsonb_array_elements(p_drafts) order by value->>'draft_id' loop
  perform pg_advisory_xact_lock(hashtextextended('drive-v1:'||p_sheet||':'||(item->>'draft_id'),0));
 end loop;
 for item in select value from jsonb_array_elements(p_drafts) loop
  result:=result||jsonb_build_array(jsonb_build_object('draft_id',item->>'draft_id','result',public.approve_drive_journal143128(p_sheet,item->>'draft_id',item->'entry')));
 end loop;
 return result;
end $$;
revoke all on function public.drive_draft_dispositions143160(text),public.set_drive_draft_disposition143160(text,text,text),public.approve_drive_journal_batch143160(text,jsonb),public.approve_drive_journal143128(text,text,jsonb) from public,anon;
grant execute on function public.drive_draft_dispositions143160(text),public.set_drive_draft_disposition143160(text,text,text),public.approve_drive_journal_batch143160(text,jsonb),public.approve_drive_journal143128(text,text,jsonb) to authenticated;
