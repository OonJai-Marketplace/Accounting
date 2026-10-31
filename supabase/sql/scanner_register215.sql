-- Serialize ID checks and link registration. No journal data or numbering changes.
create or replace function public.scanner_register215(p_rows jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare incoming public.scanner_documents208;
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>100 then raise exception 'Invalid document batch';end if;
 for incoming in select * from jsonb_populate_recordset(null::public.scanner_documents208,p_rows) order by entry_label,owner_id loop
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(incoming.entry_label,215));
  perform 1 from public.journal_entries j where j.id=any(incoming.journal_ids) for share;
  perform 1 from public.staff_journal_lines l where l.id=any(incoming.staff_line_ids) for share;
  if exists(select 1 from public.scanner_documents208 d where d.scan_id<>incoming.scan_id and
    ((d.owner_id=incoming.owner_id and d.entry_label=incoming.entry_label) or d.journal_ids && incoming.journal_ids or d.staff_line_ids && incoming.staff_line_ids)) then
   raise exception 'ID % already belongs to another scan batch',incoming.entry_label;
  end if;
  if exists(select 1 from unnest(incoming.journal_ids) as target(id) where not exists(select 1 from public.journal_entries j where j.id=target.id and j.entry_no=incoming.entry_label and j.status::text not ilike '%void%')) then
   raise exception 'Journal identity changed: %',incoming.entry_label;
  end if;
  if exists(select 1 from unnest(incoming.staff_line_ids) as target(id) where not exists(select 1 from public.staff_journal_lines l join public.staff_journals s on s.id=l.staff_journal_id where l.id=target.id and l.workspace_entry_no=incoming.entry_label and s.owner_id=incoming.owner_id)) then
   raise exception 'Workspace identity changed: %',incoming.entry_label;
  end if;
 end loop;
 return public.scanner_register208(p_rows);
end $$;
revoke all on function public.scanner_register215(jsonb) from public,anon,authenticated;
grant execute on function public.scanner_register215(jsonb) to service_role;
