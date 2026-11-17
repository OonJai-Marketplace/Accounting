-- On-demand inventory. No changes to account status, templates or books.
create function private.mapping_account_inventory()
returns table (code text, name text, currency text, active boolean, recommendation text,
               replacement text, posting_count integer, balance numeric, reasons text[], journals text[])
language sql stable set search_path = pg_catalog as $inventory$
with mapping as (
  select a.*, s.id sub_id, n.id replacement_id, n.code new_code
  from public.accounts a
  left join public.sub_accounts s on s.posting_account_id14285=a.id
  left join lateral (
    select c.code, c.currency_code, c.account_type, c.parent_code from private.fx_reclass_chart_2026 c where c.original_code=a.code
    union all
    select v.new_code, v.currency_code, 'equity', '3100' from
      (values ('9341','3111','USD'),('9342','3112','THB')) v(old_code,new_code,currency_code) where v.old_code=a.code
  ) target on true
  left join public.accounts n on n.code=target.code and n.is_active and n.is_posting
    and not n.is_technical and n.account_purpose='regular' and n.currency_code=a.currency_code
    and n.currency_code=target.currency_code and lower(n.account_type)=lower(target.account_type) and n.parent_code=target.parent_code
  where a.account_purpose='mapping' or a.name ilike '%mapping%' or a.code ~ '^(91|92|93|94)[0-9]{2}$'
), evidence as (
  select m.*, ledger.postings, ledger.net, ledger.numbers, array_remove(array[
    case when exists(select from public.journal_lines where sub_account_id=m.sub_id and account_id is distinct from m.id)
         then 'Journal uses linked sub-account' end,
    case when ledger.other then 'Unposted or voided journal history' end,
    case when exists(select from public.staff_journal_lines where m.id in (account_id,fund_account_id))
           or exists(select from public.entry_submissions where m.id in (debit_account_id,credit_account_id)) then 'Staff journal or submission' end,
    case when exists(select from public.transaction_template_lines where account_id=m.id)
           or exists(select from public.journal_template_collections275 t,
            lateral jsonb_array_elements(t.data->'templates') tpl, lateral jsonb_array_elements(tpl->'lines') ln
            where ln->>'accountId'=m.id::text or ln->>'account_id'=m.id::text or ln->>'code'=m.code
               or split_part(trim(ln->>'account'),' ',1)=m.code or lower(ln->>'account') in (lower(m.name),lower(m.name||' ('||m.currency_code||')')))
         then 'Saved journal template' end,
    case when exists(select from public.recurring_transactions where m.id in (debit_account_id,credit_account_id))
           or exists(select from public.scheduled_journals where m.id in (debit_account_id,credit_account_id))
           or exists(select from private.journal_plans280 where status='active' and definition::text like '%'||m.id::text||'%')
           or exists(select from private.journal_plan_occurrences280 where status='pending' and lines::text like '%'||m.id::text||'%')
         then 'Recurring, scheduled or pending plan' end,
    case when exists(select from private.journal_plans280 where status is distinct from 'active' and definition::text like '%'||m.id::text||'%')
           or exists(select from private.journal_plan_occurrences280 where status is distinct from 'pending' and lines::text like '%'||m.id::text||'%')
         then 'Recorded plan history' end,
    case when exists(select from public.scheduled_journal_occurrences where schedule_snapshot::text like '%'||m.id::text||'%')
         then 'Saved schedule occurrence' end,
    case when exists(select from public.payroll_tax_settings where data::text like '%'||m.id::text||'%')
           or exists(select from public.payroll_employees where data::text like '%'||m.id::text||'%')
           or exists(select from public.payroll_runs where status is distinct from 'finalized' and data::text like '%'||m.id::text||'%')
           or exists(select from private.payroll_corrections277 where corrected::text like '%'||m.id::text||'%' or original::text like '%'||m.id::text||'%')
         then 'Payroll configuration, run or correction' end,
    case when exists(select from public.payroll_runs where status='finalized' and data::text like '%'||m.id::text||'%')
         then 'Finalized payroll snapshot' end,
    case when exists(select from public.book_sessions136 where status='editing' and operations::text like '%'||m.id::text||'%')
         then 'Open book correction' end,
    case when exists(select from private.reconciliation_settings305 where preferences::text like '%'||m.id::text||'%')
           or exists(select from private.reconciliation_periods305 where requirements::text like '%'||m.id::text||'%')
           or exists(select from private.reconciliation_records305 where account_id=m.id)
         then 'Reconciliation record or setup' end,
    case when exists(select from public.cashier_currency_counts where deposit_account_id=m.id)
           or exists(select from private.cashier_custody_start where m.id in (cash_id,clearing_id))
           or exists(select from public.fund_adjustment_requests where fund_account_id=m.id)
           or exists(select from public.user_fund_assignments where account_id=m.id)
         then 'Cashier or fund assignment' end,
    case when exists(select from public.user_permissions u left join public.profiles p on p.id=u.user_id
                     where m.id in (u.default_in_debit_account_id,u.default_out_credit_account_id,u.money_in_counterpart_account_id)
                        or ((p.role is distinct from 'admin' or not coalesce(u.allow_any_account,false)) and to_jsonb(u)::text like '%'||m.id::text||'%'))
         then 'User account permission or default' end,
    case when exists(select from public.account_groups143180 g where m.id=any(g.account_ids)
                     and (m.replacement_id is null or not coalesce(m.replacement_id=any(g.account_ids),false)))
         then 'Account group needs review' end,
    case when exists(select from public.sub_account_reporting_links where lak_account_id=m.id or sub_account_id=m.sub_id)
         then 'Reporting link' end,
    case when exists(select from public.accounts where parent_code=m.code)
           or exists(select from public.sub_accounts where parent_account_id=m.id) then 'Chart has child accounts' end
  ],null) refs
  from mapping m cross join lateral (
    select count(distinct j.id) filter(where j.status='posted')::int postings,
           coalesce(sum(l.debit-l.credit) filter(where j.status='posted'),0) net,
           bool_or(j.status is distinct from 'posted') other,
           array_remove(array_agg(distinct j.entry_no order by j.entry_no) filter(where j.status='posted'),null) numbers
    from public.journal_lines l join public.journal_entries j on j.id=l.journal_entry_id
    where l.account_id=m.id
  ) ledger
), assessment as (
  select e.*,
    case when not e.is_active then 'Already inactive'
         when not e.is_posting then 'Keep heading'
         when e.code in ('9311','9312','9321','9322','9390') then 'Keep for owner support'
         when e.postings>0 then 'Keep posted history'
         when e.code in ('9190','9290','9490') and exists(
           select from public.accounts sibling where sibling.parent_code=e.parent_code and sibling.is_active and sibling.is_posting and sibling.id<>e.id)
           then 'Keep family offset'
         when e.code in ('9331','9332','9361') and exists(select from private.fx_reclass_chart_2026 c where c.original_code=e.code and c.defer_support)
           then 'Review owner equity'
         when cardinality(e.refs)>0 then 'Review dependencies'
         when e.new_code is null and e.code not in ('9190','9290','9490') then 'Review replacement'
         when e.account_purpose is distinct from 'mapping' or not e.is_technical then 'Review classification'
         else 'Retirement candidate' end decision
  from evidence e
)
select e.code::text,e.name::text,e.currency_code::text,e.is_active,e.decision,e.new_code::text,e.postings,e.net,
       array_cat(e.refs,case e.decision
         when 'Keep for owner support' then array['Owner-support allocation workflow']
         when 'Review owner equity' then case when e.new_code is null then array['Deferred owner-equity mapping','No verified active direct account'] else array['Deferred owner-equity mapping'] end
         when 'Keep family offset' then array['Active posting accounts in the same mapping family']
         when 'Review replacement' then array['No verified active direct account']
         else array[]::text[] end), coalesce(e.numbers,array[]::text[])
from assessment e order by e.code
$inventory$;
revoke all on function private.mapping_account_inventory() from public, anon, authenticated, service_role;

create function public.review_mapping_accounts()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $review$
begin
  if public.require_admin136() is null or public.accounting_workspace_allowed123() is not true
     or public.password_change_required14257() is distinct from false
     or public.can_action113('sec-chart-accounts','view') is not true
     or public.can_action113('journal','view') is not true then
    raise exception 'An active chart administrator is required' using errcode='42501';
  end if;
  return (select coalesce(jsonb_agg(to_jsonb(r) order by r.code),'[]'::jsonb) from private.mapping_account_inventory() r);
end $review$;
revoke all on function public.review_mapping_accounts() from public, anon, authenticated, service_role;
grant execute on function public.review_mapping_accounts() to authenticated;
