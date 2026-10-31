-- Supporting document metadata only: no journal amounts, dates or posting changes.
create table public.scanner_documents208 (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 scan_id uuid not null,
 group_id uuid not null,
 revision integer not null check (revision between 0 and 100000000),
 title text not null check (length(title) between 1 and 180),
 entry_label text not null check (length(entry_label) between 1 and 120),
 journal_ids uuid[] not null default '{}',
 staff_line_ids uuid[] not null default '{}',
 pages jsonb not null check (jsonb_typeof(pages)='array' and jsonb_array_length(pages) between 1 and 1000),
 pdf_provider text not null check (pdf_provider in ('drive','supabase')),
 pdf_path text not null,
 pdf_sha256 text not null check (pdf_sha256 ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now(),
 unique(owner_id,scan_id,group_id,revision)
);
create index scanner_documents208_journals on public.scanner_documents208 using gin(journal_ids);
create index scanner_documents208_staff on public.scanner_documents208 using gin(staff_line_ids);
alter table public.scanner_documents208 enable row level security;
revoke all on public.scanner_documents208 from anon,authenticated;
grant select on public.scanner_documents208 to authenticated;
grant all on public.scanner_documents208 to service_role;
create policy scanner_documents208_read on public.scanner_documents208 for select to authenticated using (
 (select public.active_account14228()) and (select public.accounting_workspace_allowed123())
 and not (select public.password_change_required14257())
 and (owner_id=(select auth.uid())
   or exists(select 1 from public.journal_entries j where j.id=any(journal_ids))
   or exists(select 1 from public.staff_journal_lines l where l.id=any(staff_line_ids)))
);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('scan-documents208','scan-documents208',false,67108864,array['image/jpeg','application/pdf','application/json']);
create policy scanner_objects208_insert on storage.objects for insert to authenticated with check (
 bucket_id='scan-documents208' and split_part(name,'/',1)=(select auth.uid())::text
 and (select public.active_account14228())
 and ((select public.can_action113('sub-users-workspace','view')) or (select public.can_action113('journal','edit')))
);
create policy scanner_objects208_read on storage.objects for select to authenticated using (
 bucket_id='scan-documents208' and (select public.active_account14228()) and (
 split_part(name,'/',1)=(select auth.uid())::text or exists (
   select 1 from public.scanner_documents208 d where
   (d.pdf_provider='supabase' and d.pdf_path=name)
   or exists(select 1 from jsonb_array_elements(d.pages) p where p->>'path'=name)
 ))
);
-- No client UPDATE/DELETE: existing object versions cannot be replaced underneath a journal link.

create or replace function public.scanner_register208(p_rows jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare incoming public.scanner_documents208; saved public.scanner_documents208; pinned public.scanner_documents208;
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>100 then raise exception 'Invalid document batch';end if;
 for incoming in select * from jsonb_populate_recordset(null::public.scanner_documents208,p_rows) order by owner_id,scan_id,group_id loop
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(incoming.owner_id::text||incoming.scan_id::text||incoming.group_id::text,208));
  select * into pinned from public.scanner_documents208 d where d.owner_id=incoming.owner_id and d.scan_id=incoming.scan_id and d.group_id=incoming.group_id and d.entry_label=incoming.entry_label and (cardinality(d.journal_ids)>0 or cardinality(d.staff_line_ids)>0) order by d.revision limit 1;
  if found then incoming.journal_ids:=pinned.journal_ids;incoming.staff_line_ids:=pinned.staff_line_ids;end if;
  insert into public.scanner_documents208(owner_id,scan_id,group_id,revision,title,entry_label,journal_ids,staff_line_ids,pages,pdf_provider,pdf_path,pdf_sha256)
  values(incoming.owner_id,incoming.scan_id,incoming.group_id,incoming.revision,incoming.title,incoming.entry_label,incoming.journal_ids,incoming.staff_line_ids,incoming.pages,incoming.pdf_provider,incoming.pdf_path,incoming.pdf_sha256)
  on conflict(owner_id,scan_id,group_id,revision) do nothing;
  select * into strict saved from public.scanner_documents208 d where d.owner_id=incoming.owner_id and d.scan_id=incoming.scan_id and d.group_id=incoming.group_id and d.revision=incoming.revision;
  if saved.title<>incoming.title or saved.entry_label<>incoming.entry_label or saved.pages<>incoming.pages or saved.pdf_sha256<>incoming.pdf_sha256 then raise exception 'Document version already exists with different contents';end if;
  update public.scanner_documents208 set pdf_provider=incoming.pdf_provider,pdf_path=incoming.pdf_path where id=saved.id;
  if cardinality(saved.journal_ids)=0 and cardinality(saved.staff_line_ids)=0 then update public.scanner_documents208 set journal_ids=incoming.journal_ids,staff_line_ids=incoming.staff_line_ids where id=saved.id;end if;
 end loop;
 return true;
end $$;
revoke all on function public.scanner_register208(jsonb) from public,anon,authenticated;
grant execute on function public.scanner_register208(jsonb) to service_role;
