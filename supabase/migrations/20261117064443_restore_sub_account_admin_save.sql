-- Keep chart writes under the caller’s existing row policies and active-admin check.
create or replace function public.save_sub_account_with_reporting_link(p_id uuid,p_fields jsonb,p_old_link uuid,p_link uuid)
returns table(id uuid,code text) language plpgsql security invoker set search_path=pg_catalog as $$
declare s public.sub_accounts; current_link uuid;
begin
  if public.is_admin() is not true then raise exception 'An active administrator is required' using errcode='42501'; end if;
  if p_id is not null then
    select * into strict s from public.sub_accounts where sub_accounts.id=p_id for update;
    select lak_account_id into current_link from public.sub_account_reporting_links where sub_account_id=p_id;
    if current_link is distinct from p_old_link then raise exception 'Reporting link changed. Reopen the sub-account and review it.'; end if;
    if current_link is distinct from p_link then delete from public.sub_account_reporting_links where sub_account_id=p_id; end if;
    update public.sub_accounts set parent_account_id=(p_fields->>'parent_account_id')::uuid,
      currency_code=p_fields->>'currency_code',code=p_fields->>'code',name=p_fields->>'name',
      description=p_fields->>'description',track_foreign_funds=(p_fields->>'track_foreign_funds')::boolean
      where sub_accounts.id=p_id returning * into strict s;
  else
    insert into public.sub_accounts(parent_account_id,currency_code,code,name,description,track_foreign_funds)
      values((p_fields->>'parent_account_id')::uuid,p_fields->>'currency_code',p_fields->>'code',
        p_fields->>'name',p_fields->>'description',(p_fields->>'track_foreign_funds')::boolean) returning * into strict s;
  end if;
  if p_link is not null and p_link is distinct from current_link then
    insert into public.sub_account_reporting_links values(s.id,p_link);
  end if;
  return query select s.id,s.code::text;
end $$;
