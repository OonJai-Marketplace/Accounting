-- Apply the first reviewed batch using the existing closed-book revision workflow.
create table private.phase3_direct_receipts_2026 (
  period_month date primary key, session_id uuid not null references public.book_sessions136(id),
  entry_numbers text[] not null, actor_id uuid not null, applied_at timestamptz not null default now()
);
alter table private.phase3_direct_receipts_2026 enable row level security;
revoke all on private.phase3_direct_receipts_2026 from public,anon,authenticated,service_role;

create function public.phase3_direct_month_2026(p_month date) returns jsonb
language plpgsql security definer set search_path=pg_catalog set lock_timeout='4s' set statement_timeout='55s' as $$
declare actor uuid:=public.require_admin136(); period public.accounting_periods; h public.journal_entries;
  j private.fx_reclass_journals_2026; nums text[]; sid uuid; rec private.phase3_direct_receipts_2026;
  fx jsonb; payload jsonb; checks jsonb; warnings jsonb; outcome jsonb; actual jsonb; kinds jsonb;
  fingerprints jsonb; problems text; reason text:='January–April direct foreign account transfer at original posted amounts and rates';
begin
  if not public.accounting_workspace_allowed123() or public.password_change_required14257() or
     not public.has_user_permission('post') or not public.can_action113('sec-chart-accounts','edit') or
     not public.can_action113('journal','post') then raise exception 'Posting and chart administrator required.'; end if;
  if p_month is null or p_month not in (date '2026-01-01','2026-02-01','2026-03-01','2026-04-01') then raise exception 'Outside the January–April review.'; end if;
  perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
  select array_agg(entry_no order by entry_no) into nums from private.fx_reclass_journals_2026
    where period_month=p_month and classification='direct accounts' and exists
     (select from jsonb_array_elements(original_lines) v where v->>'code' in ('9222','9231','9112'));
  if cardinality(nums) is distinct from (case when p_month=date '2026-03-01' then 3 else 2 end) then raise exception 'Unexpected journal list.'; end if;
  select * into rec from private.phase3_direct_receipts_2026 where period_month=p_month;
  if found then
    if exists(select from private.fx_reclass_journals_2026 j2 where j2.entry_no=any(nums) and
      private.fx_reclass_values_2026(private.fx_reclass_live_lines_2026(j2.entry_id),p_month) is distinct from
      private.fx_reclass_values_2026(j2.proposed_lines,p_month)) then raise exception 'The posted entries have changed since this batch.'; end if;
    return jsonb_build_object('alreadyApplied',nums);
  end if;
  select * into strict period from public.accounting_periods where period_month=p_month for update;
  if period.status<>'closed' or period.locked_at is not null or exists(select from public.year_closings136 where year=2026) or
     exists(select from public.book_sessions136 where period_id=period.id and status='editing') then raise exception 'Period is locked, open, or has a correction in progress.'; end if;
  fingerprints:=private.fx_reclass_fingerprints_2026(p_month,null);
  sid:=(public.begin_book_session136(p_month,reason)->>'id')::uuid;
  for j in select * from private.fx_reclass_journals_2026 where entry_no=any(nums) order by entry_no loop
    select * into strict h from public.journal_entries where id=j.entry_id and status='posted' for update;
    select to_jsonb(f) into fx from public.journal_fx_evidence288 f where f.entry_id=h.id for share;
    if to_jsonb(h) is distinct from j.original_header or private.fx_reclass_live_lines_2026(h.id) is distinct from j.original_lines
      or fx is distinct from j.original_evidence or exists(select from public.journal_lines l where l.journal_entry_id=h.id and
      (l.sub_account_id is not null or exists(select from public.journal_sources14253 s where s.journal_line_id=l.id))) then
      raise exception 'Original journal or evidence changed for %.',j.entry_no; end if;

    -- Enforce retained-line identity, both posted rates and values, and exactly one reviewed account change.
    if exists (select from jsonb_array_elements(j.proposed_lines) v left join jsonb_array_elements(j.original_lines) o on o->>'id'=v->>'id'
      where o is null or (o->>'code'<>v->>'code' and (o->>'code',v->>'code') not in (('9222','5123'),('9231','5316'),('9112','4112')))
        or private.fx_reclass_values_2026(jsonb_build_array(v||jsonb_build_object('code',o->>'code')),h.transaction_date)
           is distinct from private.fx_reclass_values_2026(jsonb_build_array(o),h.transaction_date))
      or jsonb_array_length(j.original_lines)-jsonb_array_length(j.proposed_lines)<>2
      or exists(select from jsonb_array_elements(j.original_lines) o where not exists
        (select from jsonb_array_elements(j.proposed_lines) v where v->>'id'=o->>'id')
        and (o->>'currency_code'<>'LAK' or o->>'code' not in ('5119','5311','4110','9190','9290'))) then
      raise exception 'Unsupported changes to original values in %.',j.entry_no; end if;
    -- Preserve every financial-statement category and verify native balance for each currency.
    if exists(with movement as (
      select a.account_type,z.sign*((v->>'base_debit')::numeric-(v->>'base_credit')::numeric) delta
      from (values (-1,j.original_lines),(1,j.proposed_lines)) z(sign,lines)
      cross join jsonb_array_elements(z.lines) v join public.accounts a on a.code=v->>'code' where not a.is_technical)
      select from movement group by account_type having sum(delta)<>0) then raise exception 'Statement total changes in %.',j.entry_no; end if;
    select jsonb_agg((v-'code'-'id'-'line_no'-'base_debit'-'base_credit')||jsonb_build_object('account_id',a.id) order by n)
      into payload from jsonb_array_elements(j.proposed_lines) with ordinality q(v,n)
      join public.accounts a on a.code=v->>'code' and a.currency_code=v->>'currency_code' and a.is_active and a.is_posting;
    if jsonb_array_length(payload) is distinct from jsonb_array_length(j.proposed_lines) then raise exception 'Account unavailable for %.',j.entry_no; end if;
    perform public.stage_book_operation136(sid,'revise',jsonb_build_object('p_request_key','phase3-direct-'||h.id,
      'p_entry_id',h.id,'p_reason',reason,'p_transaction_date',h.transaction_date,'p_memo',h.memo,'p_lines',payload));
  end loop;
  if fingerprints is null or fingerprints is distinct from private.fx_reclass_fingerprints_2026(p_month,sid) then
    raise exception 'Staged cash or bank movements differ.'; end if;
  checks:=public.maintenance_preflight14324(p_month);
  select string_agg(coalesce(v->>'title',v->>'id')||' ('||coalesce(v->>'detail',v->>'id')||')',', ')
    into problems from jsonb_array_elements(checks->'issues') v where v->>'severity'='block' or
      (v->>'severity'='warning' and nullif(trim(checks->'decisions319'->(v->>'id')->'saved'->>'reason'),'') is null);
  if problems is not null then raise exception 'Close review required: %',problems; end if;
  if checks->'reconciliation305'->>'complete' is distinct from 'true' then raise exception 'Cash and bank reconciliation is incomplete.'; end if;
  select coalesce(jsonb_object_agg(v->>'id',jsonb_build_object('acknowledged',true,'reason',
    checks->'decisions319'->(v->>'id')->'saved'->>'reason')),'{}') into warnings
    from jsonb_array_elements(checks->'issues') v where v->>'severity'='warning';
  outcome:=public.maintenance_finish14324(p_month,'session',checks->>'fingerprint',
    jsonb_build_object('coverageConfirmed',true,'acknowledgments',warnings),'closed',sid);
  if outcome->>'status' is distinct from 'committed' or fingerprints is distinct from private.fx_reclass_fingerprints_2026(p_month,null) then
    raise exception 'Final cash or bank comparison failed.'; end if;
  for j in select * from private.fx_reclass_journals_2026 where entry_no=any(nums) loop
    select * into strict h from public.journal_entries where id=j.entry_id;
    actual:=private.fx_reclass_live_lines_2026(h.id);
    if (to_jsonb(h)-'updated_at'-'accounting_period_id') is distinct from (j.original_header-'updated_at'-'accounting_period_id')
      or private.fx_reclass_values_2026(actual,h.transaction_date) is distinct from private.fx_reclass_values_2026(j.proposed_lines,h.transaction_date) then
      raise exception 'Final journal verification failed for %.',j.entry_no; end if;
    if j.original_evidence is not null and (j.original_evidence->>'entry_updated_at')::timestamptz=(j.original_header->>'updated_at')::timestamptz then
      select coalesce(jsonb_object_agg(n::text,j.original_evidence->'line_kinds'->(v->>'line_no')),'{}')
      into kinds from jsonb_array_elements(j.proposed_lines) with ordinality q(v,n)
      where j.original_evidence->'line_kinds' ? (v->>'line_no');
      update public.journal_fx_evidence288 f set entry_updated_at=h.updated_at,line_kinds=kinds,
        revision=gen_random_uuid() where f.entry_id=h.id and to_jsonb(f)=j.original_evidence;
      if not found then raise exception 'Evidence binding failed for %.',j.entry_no; end if;
    end if;
  end loop;
  insert into private.phase3_direct_receipts_2026(period_month,session_id,entry_numbers,actor_id) values(p_month,sid,nums,actor);
  return jsonb_build_object('posted',nums,'period',p_month);
end $$;
revoke all on function public.phase3_direct_month_2026(date) from public,anon,service_role;
grant execute on function public.phase3_direct_month_2026(date) to authenticated;
notify pgrst,'reload schema';
