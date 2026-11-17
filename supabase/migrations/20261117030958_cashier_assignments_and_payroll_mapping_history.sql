-- Replace like-for-like cashier revenue selections. Historical staff entries and
-- closed payroll records retain their original account IDs and amounts.
do $cashier$
declare
    cashier uuid;
    allowed uuid[];
    destinations uuid[];
    pair record;
    old_id uuid;
    direct_id uuid;
begin
    cashier:=(select distinct j.owner_id
    from public.staff_journal_lines l join public.staff_journals j on j.id=l.staff_journal_id
    join public.profiles p on p.id=j.owner_id and p.role='submitter' and p.status='active'
    where l.workspace_entry_no='SGC260077' and l.transaction_date=date '2026-08-26'
      and l.currency_code='THB' and l.amount=1000 and not j.is_sample);
    if cashier is null then return; end if;
    select allowed_account_ids,destination_account_ids into strict allowed,destinations
    from public.user_permissions where user_id=cashier and not allow_any_account for update;
    for pair in select * from (values
      ('9101','4021','THB'),('9102','4020','USD'),('9131','4131','USD'),('9132','4132','THB')
    ) as replacements(old_code,new_code,currency) loop
        select id into strict old_id from public.accounts
        where code=pair.old_code and currency_code=pair.currency and account_purpose='mapping';
        select id into strict direct_id from public.accounts
        where code=pair.new_code and currency_code=pair.currency and lower(account_type)='revenue'
          and account_purpose='regular' and is_active and is_posting and not is_technical;
        allowed:=case when direct_id=any(allowed) then array_remove(allowed,old_id)
                      else array_replace(allowed,old_id,direct_id) end;
        destinations:=case when direct_id=any(destinations) then array_remove(destinations,old_id)
                           else array_replace(destinations,old_id,direct_id) end;
    end loop;
    update public.user_permissions set allowed_account_ids=allowed,destination_account_ids=destinations,updated_at=now()
    where user_id=cashier and (allowed_account_ids,destination_account_ids) is distinct from (allowed,destinations);
end $cashier$;

create or replace function private.mapping_account_inventory()
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
           or exists(select from private.payroll_corrections277 where state in ('editing','ready') and
               (corrected::text like '%'||m.id::text||'%' or original::text like '%'||m.id::text||'%'))
         then 'Payroll configuration, run or correction' end,
    case when exists(select from public.payroll_runs where status='finalized' and data::text like '%'||m.id::text||'%')
         then 'Finalized payroll snapshot' end,
    case when exists(select from private.payroll_corrections277 where state='posted' and
               (corrected::text like '%'||m.id::text||'%' or original::text like '%'||m.id::text||'%'))
         then 'Posted payroll correction' end,
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
         when cardinality(e.refs)>0 and e.refs <@ array['Finalized payroll snapshot','Posted payroll correction']::text[]
           then 'Keep payroll history'
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

create or replace function public.retire_unused_foreign_mappings_2026()
returns integer language plpgsql security definer set search_path=pg_catalog as $retire$
declare
    actor uuid := public.require_admin136();
    retired integer := 0;
    item record;
    affected integer;
begin
    if actor is null or not public.accounting_workspace_allowed123()
       or public.password_change_required14257() or not public.can_action113('sec-chart-accounts','edit') then
        raise exception 'An active accounting administrator is required' using errcode='42501';
    end if;
    perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
    perform pg_advisory_xact_lock(143180);
    for item in
        select a.id, a.code, s.id as sub_id, review.replacement
        from private.mapping_account_inventory() review
        join public.accounts a on a.code=review.code
        left join public.sub_accounts s on s.posting_account_id14285=a.id
        where review.recommendation='Retirement candidate'
          and review.active and review.balance=0 and review.posting_count=0 and cardinality(review.reasons)=0
          and a.is_active and a.is_posting and a.is_technical and a.account_purpose='mapping'
        order by a.code for update of a
    loop
        if item.code='9490' and exists(select from public.accounts where parent_code='9400' and is_active and code<>'9490') then
            continue;
        end if;
        if exists(
            select from public.accounts a left join public.sub_accounts s on s.posting_account_id14285=a.id
            left join public.accounts n on n.code=item.replacement
            where a.id=item.id and (
                exists(select from public.account_groups143180 g where a.id=any(g.account_ids) and (n.id is null or not n.id=any(g.account_ids)))
                or exists(select from private.reconciliation_settings305 where preferences::text like '%'||a.id::text||'%')
                or exists(select from private.reconciliation_periods305 where requirements::text like '%'||a.id::text||'%')
                or exists(select from private.reconciliation_records305 where account_id=a.id)
                or exists(select from public.journal_lines where account_id=a.id or sub_account_id=s.id)
                or exists(select from public.staff_journal_lines where account_id=a.id or fund_account_id=a.id)
                or exists(select from public.entry_submissions where a.id in (debit_account_id,credit_account_id))
                or exists(select from public.transaction_template_lines where account_id=a.id)
                or exists(select from public.recurring_transactions where a.id in(debit_account_id,credit_account_id))
                or exists(select from public.scheduled_journals where a.id in(debit_account_id,credit_account_id))
                or exists(select from public.cashier_currency_counts where deposit_account_id=a.id)
                or exists(select from private.cashier_custody_start where a.id in(cash_id,clearing_id))
                or exists(select from public.fund_adjustment_requests where fund_account_id=a.id)
                or exists(select from public.user_fund_assignments where account_id=a.id)
                or exists(select from private.journal_plans280 where definition::text like '%'||a.id::text||'%')
                or exists(select from private.journal_plan_occurrences280 where lines::text like '%'||a.id::text||'%')
                or exists(select from public.book_sessions136 where status='editing' and operations::text like '%'||a.id::text||'%')
                or exists(select from public.journal_template_collections275 t, lateral jsonb_array_elements(t.data->'templates') x where x::text like '%'||a.id::text||'%' or x::text ~ ('(^|[^0-9])'||a.code||'([^0-9]|$)'))
                or exists(select from public.user_permissions u left join public.profiles p on p.id=u.user_id where (p.role is distinct from 'admin' or not coalesce(u.allow_any_account,false)) and to_jsonb(u)::text like '%'||a.id::text||'%')
                or exists(select from public.accounts where parent_code=a.code union all select from public.sub_accounts where parent_account_id=a.id)
                or exists(select from public.user_permissions u where a.id in(u.default_in_debit_account_id,u.default_out_credit_account_id,u.money_in_counterpart_account_id))
            )
        ) then continue; end if;
        if item.sub_id is not null then
            update public.sub_accounts set is_active=false where id=item.sub_id and is_active;
        else
            update public.accounts set is_active=false where id=item.id and is_active;
        end if;
        get diagnostics affected=row_count;
        if affected<>1 or not exists(select from public.accounts where id=item.id and not is_active) then
            raise exception 'Could not verify retirement of %',item.code;
        end if;
        retired:=retired+1;
    end loop;
    return retired;
end $retire$;
