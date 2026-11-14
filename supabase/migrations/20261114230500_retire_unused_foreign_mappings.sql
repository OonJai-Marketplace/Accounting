-- Retire only the three reviewed, unused THB expense mappings. The records
-- and their identities remain available for recovery. Run as the signed-in
-- chart administrator, never as a side effect of loading a page or a report.
create function public.retire_unused_foreign_mappings_2026()
returns integer language plpgsql security definer set search_path=pg_catalog as $$
declare
    actor uuid := public.require_admin136();
    mapping public.accounts;
    replacement public.accounts;
    sub public.sub_accounts;
    spec record;
    retired integer := 0;
begin
    if actor is null or not public.accounting_workspace_allowed123()
        or public.password_change_required14257() or not public.can_action113('sec-chart-accounts','edit') then
        raise exception 'An active accounting administrator is required' using errcode='42501';
    end if;
    perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
    for spec in select * from (values ('9212','5122'),('9234','5321'),('9242','5423')) v(old_code,new_code) loop
        select a.* into strict replacement from public.accounts a
          join private.fx_reclass_chart_2026 c on c.code=a.code and c.original_code=spec.old_code
          join public.sub_accounts s on s.posting_account_id14285=a.id and s.is_active
          where a.code=spec.new_code and not c.defer_support and a.currency_code='THB'
            and a.parent_code=c.parent_code and a.account_type='EXPENSE'
            and a.is_active and a.is_posting and not a.is_technical and a.account_purpose='regular'
          for share of a,s;
        select * into strict sub from public.sub_accounts s where s.code=spec.old_code for update;
        select * into strict mapping from public.accounts a
          where a.id=sub.posting_account_id14285 and a.code=spec.old_code and a.currency_code=replacement.currency_code
            and a.parent_code='9200' and a.is_posting and a.is_technical and a.account_purpose='mapping'
          for update;
        if sub.is_active is distinct from mapping.is_active then
            raise exception 'Chart and posting account differ for %',spec.old_code;
        end if;
        if not mapping.is_active then continue; end if;
        if exists(select from public.journal_lines where account_id=mapping.id or sub_account_id=sub.id)
           or exists(select from public.staff_journal_lines where account_id=mapping.id or fund_account_id=mapping.id)
           or exists(select from public.entry_submissions where mapping.id in (debit_account_id,credit_account_id))
           or exists(select from public.transaction_template_lines where account_id=mapping.id)
           or exists(select from public.recurring_transactions where mapping.id in (debit_account_id,credit_account_id))
           or exists(select from public.scheduled_journals where mapping.id in (debit_account_id,credit_account_id))
           or exists(select from public.cashier_currency_counts where deposit_account_id=mapping.id)
           or exists(select from public.cashier_custody_start where mapping.id in (cash_id,clearing_id))
           or exists(select from public.fund_adjustment_requests where fund_account_id=mapping.id)
           or exists(select from public.user_fund_assignments where account_id=mapping.id)
           or exists(select from private.reconciliation_records305 where account_id=mapping.id)
           or exists(select from private.journal_plans280 where definition::text like '%'||mapping.id::text||'%')
           or exists(select from private.journal_plan_occurrences280 where lines::text like '%'||mapping.id::text||'%')
           or exists(select from public.book_sessions136 where status='editing' and operations::text like '%'||mapping.id::text||'%')
           or exists(select from public.journal_template_collections275 t,
                        lateral jsonb_array_elements(t.data->'templates') x
                      where x::text like '%'||mapping.id::text||'%' or x::text ~ ('(^|[^0-9])'||spec.old_code||'([^0-9]|$)'))
           or exists(select from public.user_permissions u left join public.profiles p on p.id=u.user_id
                      where (p.role is distinct from 'admin' or not coalesce(u.allow_any_account,false))
                        and to_jsonb(u)::text like '%'||mapping.id::text||'%') then
            raise exception 'Account % has a dependent record and is still active',spec.old_code;
        end if;
        update public.sub_accounts set is_active=false where id=sub.id;
        if not exists(select from public.accounts where id=mapping.id and not is_active) then
            raise exception 'Could not verify retirement of %',spec.old_code;
        end if;
        retired:=retired+1;
    end loop;
    return retired;
end $$;
revoke all on function public.retire_unused_foreign_mappings_2026() from public,anon,authenticated,service_role;
grant execute on function public.retire_unused_foreign_mappings_2026() to authenticated;
