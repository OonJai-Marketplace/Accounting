-- Bind the administrator's action to the candidate codes shown in the review.
create or replace function public.deactivate_reviewed_mapping_accounts(p_codes text[])
returns integer language plpgsql security invoker set search_path=pg_catalog as $$
declare
    reviewed text[];
    live_codes text[];
    affected integer;
begin
    perform pg_advisory_xact_lock(hashtext('oonjai-fx-reclass-2026'));
    perform pg_advisory_xact_lock(143180);
    select array_agg(code order by code) into reviewed from unnest(p_codes) as c(code);
    select array_agg(r->>'code' order by r->>'code') into live_codes
      from jsonb_array_elements(public.review_mapping_accounts()) r
     where r->>'recommendation'='Retirement candidate' and (r->>'active')::boolean;
    if reviewed is null or reviewed is distinct from live_codes then
        raise exception 'The candidates changed. Refresh the mapping review before deactivating accounts.';
    end if;
    affected := public.retire_unused_foreign_mappings_2026();
    if affected <> cardinality(reviewed) or exists (
        select from jsonb_array_elements(public.review_mapping_accounts()) r
        where r->>'code'=any(reviewed) and (r->>'active')::boolean
    ) then
        raise exception 'A reviewed account has a dependency. No accounts were deactivated.';
    end if;
    return affected;
end $$;
revoke all on function public.deactivate_reviewed_mapping_accounts(text[]) from public, anon;
grant execute on function public.deactivate_reviewed_mapping_accounts(text[]) to authenticated;
