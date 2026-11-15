-- Retire reviewed, unused posting mappings. Keep their identities for historical lookups.
-- The sub-account trigger synchronizes its posting account. 9251 has no sub-account.
create or replace function private.fx_reclass_retirement_pairs_2026()
returns table(old_code text,new_code text) language sql immutable set search_path=pg_catalog as $pairs$
    values ('9111','4111'),('9201','5012'),('9202','5011'),('9212','5122'),('9232','5317'),('9234','5321'),('9242','5423'),
           ('9112','4112'),('9121','4121'),('9211','5121'),('9231','5316'),('9241','5422'),('9251','5124'),('9411','1314'),('9490',null)
$pairs$;

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
        select a.id, a.code, s.id as sub_id, n.code as replacement
        from private.fx_reclass_retirement_pairs_2026() v
        join public.accounts a on a.code=v.old_code
        left join public.sub_accounts s on s.posting_account_id14285=a.id
        left join private.fx_reclass_chart_2026 c on c.original_code=a.code and c.code=v.new_code and not c.defer_support
        left join public.accounts n on n.code=c.code and n.currency_code=a.currency_code and n.is_active and n.is_posting
              and n.account_type=c.account_type and n.parent_code=c.parent_code and n.account_purpose='regular' and not n.is_technical
        where a.is_active and a.is_posting and a.is_technical and a.account_purpose='mapping'
          and (n.id is not null or (a.code='9490' and a.currency_code='LAK' and a.parent_code='9400'))
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
revoke all on function public.retire_unused_foreign_mappings_2026() from public,anon,authenticated,service_role;
grant execute on function public.retire_unused_foreign_mappings_2026() to authenticated;
