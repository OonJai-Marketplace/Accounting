-- Reapply the one recovered November restaurant-rent revision through the normal
-- open-period posting workflow, together with its already-posted plan receipt.
create function public.apply_reviewed_restaurant_rent_2026()
returns text language plpgsql security definer set search_path=pg_catalog set lock_timeout='5s' as $$
declare
  actor uuid:=public.require_admin136();
  target constant text:='AMO26-000006';
  due constant date:=date '2026-11-01';
  h public.journal_entries; draft private.fx_reclass_journals_2026;
  occurrence private.journal_plan_occurrences280; plan private.journal_plans280;
  prior private.prior_posted_plan_allocations; per public.accounting_periods;
  expense uuid; prepaid uuid; current_layout jsonb; current_amounts jsonb;
  expected jsonb; desired jsonb; original jsonb; args jsonb;
  already_revised boolean;
begin
  if actor is null or public.accounting_workspace_allowed123() is not true
     or public.password_change_required14257() is distinct from false
     or public.has_user_permission('post') is not true
     or public.can_action113('journal','post') is not true
     or public.can_action113('sec-chart-accounts','edit') is not true then
    raise exception 'A signed-in posting administrator is required.' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
  select * into strict draft from private.fx_reclass_journals_2026 where entry_no=target and period_month=due for share;
  select p.* into strict plan from private.journal_plans280 p join private.journal_plan_occurrences280 o on p.id=o.plan_id
    where o.journal_entry_id=draft.entry_id and o.occurrence_no=1 and o.due_date=due and p.kind='amortization' for update of p;
  select * into strict occurrence from private.journal_plan_occurrences280
    where plan_id=plan.id and occurrence_no=1 and status='posted' and journal_entry_id=draft.entry_id for update;
  select * into strict per from public.accounting_periods where period_month=due for update;
  select * into strict h from public.journal_entries where id=draft.entry_id and entry_no=target and status='posted'
    and transaction_date=due and reference='PLAN280:'||plan.id::text||':1' for update;
  perform 1 from public.journal_lines where journal_entry_id=h.id order by line_no for update;
  select id into strict expense from public.accounts where code='5123' and is_active and is_posting and not is_technical
    and currency_code='THB' and account_type='EXPENSE' for share;
  select id into strict prepaid from public.accounts where code='1312' and is_active and is_posting and not is_technical
    and currency_code='THB' and account_type='ASSET' for share;
  select e.lines into strict expected from private.expected_amortization281(plan.definition) e where e.occurrence_no=1 and e.due_date=due;
  if expected is distinct from jsonb_build_array(jsonb_build_array(expense,'THB',20000,0,13559109.33,0),
                                                jsonb_build_array(prepaid,'THB',0,20000,0,13559109.33)) then
    raise exception 'November installment differs from the verified prepaid allocation.';
  end if;
  select jsonb_agg(jsonb_build_object('account_id',a.id,'currency_code',a.currency_code,'description',v->>'description',
      'debit',(v->>'debit')::numeric,'credit',(v->>'credit')::numeric,
      'fx_rate_lak',(v->>'fx_rate_lak')::numeric,'book_rate_lak',(v->>'book_rate_lak')::numeric) order by n)
    into desired from jsonb_array_elements(draft.proposed_lines) with ordinality t(v,n)
    join public.accounts a on a.code=v->>'code' and a.currency_code=v->>'currency_code';
  if jsonb_array_length(desired) is distinct from 2 or jsonb_array_length(draft.proposed_lines)<>2
     or desired->0->>'account_id' is distinct from expense::text or desired->1->>'account_id' is distinct from prepaid::text
     or exists(select from jsonb_array_elements(draft.proposed_lines) v where
       (v->>'fx_rate_lak')::numeric is distinct from 677.9554666000 or (v->>'book_rate_lak')::numeric is distinct from 677.9554666000
       or (v->>'line_date')::date is distinct from due or v->>'sub_account_id' is not null) then
    raise exception 'The archived two-line revision changed.';
  end if;
  perform private.validate_plan_lines280(desired,'amortization');
  select jsonb_agg(jsonb_build_object('account_id',l.account_id,'currency_code',l.currency_code,'description',l.description,
    'debit',l.debit,'credit',l.credit,'fx_rate_lak',l.fx_rate_lak,'book_rate_lak',l.book_rate_lak) order by l.line_no),
    jsonb_agg(jsonb_build_array(l.account_id,l.currency_code,l.debit,l.credit,l.base_debit,l.base_credit) order by l.line_no)
    into current_layout,current_amounts from public.journal_lines l where l.journal_entry_id=h.id;
  select * into prior from private.prior_posted_plan_allocations where plan_id=plan.id and occurrence_no=1 for update;
  already_revised:=current_layout=desired and current_amounts=expected;
  if already_revised and occurrence.lines=desired and prior.plan_id is null then return target; end if;
  if per.status<>'open' or per.locked_at is not null or exists(select from public.year_closings136 where year=2026)
     or exists(select from public.book_sessions136 where period_id=per.id and status='editing') then
    raise exception 'The November book must be open for this revision.';
  end if;
  original:=private.fx_reclass_live_lines_2026(h.id);
  if to_jsonb(h) is distinct from draft.original_header or original is distinct from draft.original_lines
     or draft.original_evidence is not null or exists(select from public.journal_fx_evidence288 where entry_id=h.id)
     or occurrence.lines is distinct from current_layout or prior.expected_lines is distinct from current_amounts
     or prior.journal_entry_id is distinct from h.id or prior.due_date is distinct from due
     or (select array_agg(v->>'code' order by n) from jsonb_array_elements(original) with ordinality t(v,n))
        is distinct from array['9222','1312','5119','9290']
     or exists(select from public.journal_sources14253 s join public.journal_lines l on l.id=s.journal_line_id where l.journal_entry_id=h.id)
     or exists(select from jsonb_array_elements(original) v where v->>'sub_account_id' is not null) then
    raise exception 'The recorded journal, its evidence or its schedule changed. Refresh before proceeding.';
  end if;
  select jsonb_agg(v||jsonb_build_object('line_date',due) order by n) into args
    from jsonb_array_elements(desired) with ordinality t(v,n);
  perform public.revise_open_journal_entry(h.id,
    'Reclassify the November release of OJM260143 to Restaurant Rent THB (5123) at its original carrying rate; reconcile its posted amortization installment.',
    due,h.memo,args);
  perform private.fx_reclass_verify_result_2026(target);
  select jsonb_agg(jsonb_build_array(l.account_id,l.currency_code,l.debit,l.credit,l.base_debit,l.base_credit) order by l.line_no)
    into current_amounts from public.journal_lines l where l.journal_entry_id=h.id;
  if current_amounts is distinct from expected then raise exception 'Posted November rent differs from the plan.'; end if;
  update private.journal_plan_occurrences280 set lines=desired where plan_id=plan.id and occurrence_no=1 and journal_entry_id=h.id;
  -- The original is preserved in the audit and the immutable recovery snapshot.
  -- The standard plan calculation now verifies this installment without an exception.
  delete from private.prior_posted_plan_allocations where plan_id=plan.id and occurrence_no=1;
  return target;
end $$;
revoke all on function public.apply_reviewed_restaurant_rent_2026() from public,anon,authenticated,service_role;
grant execute on function public.apply_reviewed_restaurant_rent_2026() to authenticated;
