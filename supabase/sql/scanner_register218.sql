-- Receipt choices change document links only, including entries in closed periods.
alter table public.scanner_documents208 add column if not exists superseded_by218 uuid references public.scanner_documents208(id);

create or replace function public.scanner_register218(p_rows jsonb,p_decisions jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare incoming public.scanner_documents208; decision jsonb; conflicts uuid[]; expected uuid[]; replacement uuid; prior public.scanner_documents208;
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 100 then raise exception 'Invalid document batch';end if;
 if jsonb_typeof(p_decisions)<>'array' or jsonb_array_length(p_decisions)<>jsonb_array_length(p_rows) then raise exception 'Confirm each receipt choice';end if;
 -- Stable order prevents concurrent batches from racing or deadlocking.
 for incoming in select * from jsonb_populate_recordset(null::public.scanner_documents208,p_rows) order by entry_label,owner_id loop
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(incoming.entry_label,215));
 end loop;
 for incoming in select * from jsonb_populate_recordset(null::public.scanner_documents208,p_rows) order by entry_label,owner_id loop
  perform 1 from public.journal_entries j where j.id=any(incoming.journal_ids) for share;
  if exists(select 1 from unnest(incoming.journal_ids) t(id) where not exists(select 1 from public.journal_entries j where j.id=t.id and j.entry_no=incoming.entry_label and j.status::text not ilike '%void%')) then raise exception 'Journal identity changed: %',incoming.entry_label;end if;
  perform 1 from public.staff_journal_lines l where l.id=any(incoming.staff_line_ids) for share;
  if exists(select 1 from unnest(incoming.staff_line_ids) t(id) where not exists(select 1 from public.staff_journal_lines l join public.staff_journals s on s.id=l.staff_journal_id where l.id=t.id and l.workspace_entry_no=incoming.entry_label and s.owner_id=incoming.owner_id)) then raise exception 'Workspace identity changed: %',incoming.entry_label;end if;
  select * into prior from public.scanner_documents208 d where d.owner_id=incoming.owner_id and d.scan_id=incoming.scan_id and d.group_id=incoming.group_id and d.revision=incoming.revision;
  if found then
   if prior.superseded_by218 is not null then raise exception 'These receipts were replaced. Start a new scan to add documents';end if;
   -- Exact retries remain idempotent; scanner_register208 verifies immutable contents.
   perform public.scanner_register208(jsonb_build_array(to_jsonb(incoming)));continue;
  end if;
  if exists(select 1 from public.scanner_documents208 d where d.owner_id=incoming.owner_id and d.scan_id=incoming.scan_id and d.group_id=incoming.group_id and d.superseded_by218 is not null) then raise exception 'These receipts were replaced. Start a new scan to add documents';end if;
  select d into decision from jsonb_array_elements(p_decisions) d where d->>'group_id'=incoming.group_id::text;
  if decision is null or decision->>'mode' not in ('new','add','replace') or jsonb_typeof(decision->'expected')<>'array' then raise exception 'Confirm add or replace receipts';end if;
  select coalesce(array_agg(x::uuid order by x::uuid),'{}'::uuid[]) into expected from jsonb_array_elements_text(decision->'expected') x;
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into conflicts from (
   select distinct on(d.owner_id,d.scan_id,d.group_id) d.id
   from public.scanner_documents208 d where d.superseded_by218 is null and d.scan_id<>incoming.scan_id and
    ((d.owner_id=incoming.owner_id and d.entry_label=incoming.entry_label) or d.journal_ids && incoming.journal_ids or d.staff_line_ids && incoming.staff_line_ids)
   order by d.owner_id,d.scan_id,d.group_id,d.revision desc
  ) active_receipts;
  if conflicts<>expected then raise exception 'Receipts changed for %. Review add or replace again',incoming.entry_label;end if;
  if cardinality(conflicts)>0 and decision->>'mode'='new' then raise exception 'Choose Add supporting documents or Replace existing receipts for %',incoming.entry_label;end if;
  perform public.scanner_register208(jsonb_build_array(to_jsonb(incoming)));
  if decision->>'mode'='replace' then
   select id into strict replacement from public.scanner_documents208 d where d.owner_id=incoming.owner_id and d.scan_id=incoming.scan_id and d.group_id=incoming.group_id and d.revision=incoming.revision;
   -- Supersede only the chosen entry sections, retaining original PDFs and history.
   update public.scanner_documents208 d set superseded_by218=replacement
   where exists(select 1 from public.scanner_documents208 old where old.id=any(conflicts) and old.owner_id=d.owner_id and old.scan_id=d.scan_id and old.group_id=d.group_id);
  end if;
 end loop;
 return true;
end $$;
revoke all on function public.scanner_register218(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.scanner_register218(jsonb,jsonb) to service_role;
