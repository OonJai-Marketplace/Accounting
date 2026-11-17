create or replace function public.deactivate_reviewed_mapping_accounts(p_codes text[])
returns integer language plpgsql security invoker set search_path=pg_catalog set statement_timeout='45s' as $$
declare
    reviewed text[];
    visible_codes text[];
    affected integer;
begin
    if public.can_action113('sec-chart-accounts','view') is not true or public.can_action113('journal','view') is not true then
        raise exception 'An active chart administrator is required' using errcode='42501';
    end if;
    perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
    perform pg_advisory_xact_lock(143180);
    select array_agg(code order by code) into reviewed from unnest(p_codes) as c(code);
    select array_agg(code::text order by code::text) into visible_codes from public.accounts where is_active and code=any(reviewed);
    if reviewed is null or reviewed is distinct from visible_codes then
        raise exception 'The candidates changed. Refresh the mapping review before deactivating accounts.';
    end if;
    -- The existing operation performs the full inventory and all posting and dependency checks.
    affected := public.retire_unused_foreign_mappings_2026();
    select array_agg(code::text order by code::text) into visible_codes from public.accounts where not is_active and code=any(reviewed);
    -- The count and exact code readback also reject additional candidates, rolling back the whole batch.
    if affected <> cardinality(reviewed) or reviewed is distinct from visible_codes then
        raise exception 'The candidates or their dependencies changed. No accounts were deactivated. Refresh the review.';
    end if;
    return affected;
end $$;
notify pgrst, 'reload schema';
