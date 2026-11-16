-- Reporting families may span chart parents, but always share one account type.
create table public.sub_account_reporting_links (
    sub_account_id uuid primary key references public.sub_accounts(id) on delete cascade,
    lak_account_id uuid not null references public.accounts(id)
);
create index on public.sub_account_reporting_links(lak_account_id);
alter table public.sub_account_reporting_links enable row level security;
revoke all on public.sub_account_reporting_links from public, anon, authenticated;
grant select, insert, update, delete on public.sub_account_reporting_links to authenticated;

create policy reporting_link_read on public.sub_account_reporting_links for select to authenticated
using (exists(select from public.sub_accounts s where s.id=sub_account_id)
   and exists(select from public.accounts a where a.id=lak_account_id));
create policy reporting_link_admin on public.sub_account_reporting_links for all to authenticated
using ((select public.is_admin()) and (select public.accounting_workspace_allowed123())
   and (select public.active_account14228()) and not (select public.password_change_required14257()))
with check ((select public.is_admin()) and (select public.accounting_workspace_allowed123())
   and (select public.active_account14228()) and not (select public.password_change_required14257()));

create function private.validate_sub_account_reporting_link() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  perform 1 from public.sub_accounts s
    join public.accounts src on src.id=s.posting_account_id14285
    join public.accounts dest on dest.id=new.lak_account_id
    where s.id=new.sub_account_id and src.currency_code not in ('LAK','NA')
      and src.account_type=dest.account_type and dest.currency_code='LAK'
      and src.is_active and dest.is_active and src.is_posting and dest.is_posting
      and not src.is_technical and not dest.is_technical
      and src.account_purpose='regular' and dest.account_purpose='regular'
    for share of s,src,dest;
  if not found then raise exception 'Choose an active regular LAK posting account of the same account type.'; end if;
  return new;
end $$;
create trigger validate_reporting_link before insert or update on public.sub_account_reporting_links
for each row execute function private.validate_sub_account_reporting_link();

create function private.keep_reporting_link_classification() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin
  if exists (select from public.sub_account_reporting_links l join public.sub_accounts s on s.id=l.sub_account_id
    where new.id in (l.lak_account_id,s.posting_account_id14285)) then
    raise exception 'Remove the reporting link before changing the currency or classification of this account.';
  end if;
  return new;
end $$;
create trigger protect_reporting_link before update of account_type,currency_code,is_posting,is_technical,account_purpose on public.accounts
for each row when ((old.account_type,old.currency_code,old.is_posting,old.is_technical,old.account_purpose)
 is distinct from (new.account_type,new.currency_code,new.is_posting,new.is_technical,new.account_purpose))
execute function private.keep_reporting_link_classification();

-- Existing clients may still edit names and descriptions through their usual route.
create function public.save_sub_account_with_reporting_link(p_id uuid,p_fields jsonb,p_old_link uuid,p_link uuid)
returns table(id uuid,code text) language plpgsql security invoker set search_path=pg_catalog as $$
declare s public.sub_accounts; current_link uuid;
begin
  perform public.require_admin136();
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
revoke all on function public.save_sub_account_with_reporting_link(uuid,jsonb,uuid,uuid) from public,anon;
grant execute on function public.save_sub_account_with_reporting_link(uuid,jsonb,uuid,uuid) to authenticated;

insert into public.sub_account_reporting_links(sub_account_id,lak_account_id)
select s.id,a.id from (values
  ('1314','1310'),('4020','4010'),('4021','4010'),('4111','4110'),('4112','4110'),
  ('4121','4120'),('4131','4130'),('4132','4130'),('5011','5010'),('5012','5010'),
  ('5121','5111'),('5122','5111'),('5123','5119'),('5124','5120'),('5316','5311'),
  ('5317','5311'),('5320','5315'),('5321','5315'),('5422','5414'),('5423','5414'),('5424','5421')
) f(src,dest) join public.sub_accounts s on s.code=f.src and s.is_active
join public.accounts a on a.code=f.dest and a.is_active;
notify pgrst,'reload schema';
