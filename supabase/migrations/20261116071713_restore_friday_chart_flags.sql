-- A one-time action for the original chart. The caller uses the same table
-- permissions and row triggers as the regular Accounting chart editor.
create function public.restore_friday_chart_flags_2026()
returns integer language plpgsql security invoker
set search_path=pg_catalog set lock_timeout='5s' as $$
declare
    codes constant text[] := array['9111','9112','9121','9201','9202','9211','9212','9231','9232','9234','9241','9242','9251','9411','9490'];
    original_fingerprint constant text := '2188f845f6729977a290c2f6c35d2f1a96d30af29481568f9b55270b938c0820';
    actual_fingerprint text;
    count_accounts integer;
    count_subaccounts integer;
    active_accounts integer;
    active_subaccounts integer;
begin
    if auth.uid() is null or public.is_admin() is distinct from true
        or public.accounting_workspace_allowed123() is distinct from true
        or public.password_change_required14257() is distinct from false
        or public.can_action113('sec-chart-accounts','edit') is distinct from true then
        raise exception 'An active accounting administrator is required' using errcode='42501';
    end if;
    perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
    perform pg_advisory_xact_lock(143180);
    perform 1 from public.sub_accounts where code=any(codes) order by id for update;
    perform 1 from public.accounts where code=any(codes) order by id for update;
    select count(a.id),count(s.id),count(*) filter(where a.is_active),
           count(*) filter(where s.is_active),
           encode(sha256(convert_to(string_agg(concat_ws('|',a.code,a.id,a.name,a.currency_code,
              coalesce(a.parent_code,''),a.account_purpose,coalesce(s.id::text,'-'),
              coalesce(s.parent_account_id::text,'-')),chr(10) order by a.code),'UTF8')),'hex')
       into count_accounts,count_subaccounts,active_accounts,active_subaccounts,actual_fingerprint
       from public.accounts a left join public.sub_accounts s on s.posting_account_id14285=a.id
       where a.code=any(codes) and a.is_posting and a.is_technical and a.account_purpose='mapping'
         and (s.id is null or (s.code=a.code and s.currency_code=a.currency_code));
    if (count_accounts,count_subaccounts) is distinct from (15,14)
       or actual_fingerprint is distinct from original_fingerprint then
        raise exception 'The original chart identities or classifications have changed. Review the chart before recovering it.';
    end if;
    if (active_accounts,active_subaccounts)=(15,14) then return 0; end if;
    if (active_accounts,active_subaccounts)<>(0,0) then
        raise exception 'An account has changed since the recovery comparison. Review the current chart.';
    end if;
    -- The documented sub-account trigger reactivates its original posting
    -- account. Code 9251 was a standalone posting account on Friday.
    update public.sub_accounts set is_active=true where code=any(codes) and is_active=false;
    update public.accounts set is_active=true where code='9251' and is_active=false;
    if (select count(*) from public.accounts where code=any(codes) and is_active)<>15
       or (select count(*) from public.sub_accounts where code=any(codes) and is_active)<>14 then
        raise exception 'The original account and sub-account flags could not be verified';
    end if;
    return 15;
end $$;
revoke all on function public.restore_friday_chart_flags_2026() from public,anon,authenticated,service_role;
grant execute on function public.restore_friday_chart_flags_2026() to authenticated;
