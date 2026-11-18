-- Administrators are exempt. Account access does not establish a funding shortage.
-- Preserve negative balances, journal posting, existing fund calculations and event-only checks.
begin;
create function private.fund_notice_scope481(p_owner uuid,p_deficits jsonb)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(jsonb_agg(d order by d->>'id'),'[]'::jsonb)
 from jsonb_array_elements(p_deficits) d
 join public.accounts a on a.id=(d->>'id')::uuid
 join public.user_permissions u on u.user_id=p_owner and a.id=any(u.assigned_fund_account_ids)
 join public.profiles p on p.id=u.user_id and p.status='active' and p.role<>'admin'
 where a.account_type='ASSET' and a.is_active and a.is_posting and not a.is_technical
  and coalesce(a.account_purpose,'regular')='regular'
  and a.code ~ '^10[0-9]{2}$' and a.code<>'1099'
  and a.currency_code=d->>'currency' and (d->>'remaining')::numeric<0
$$;
revoke all on function private.fund_notice_scope481(uuid,jsonb) from public,anon,authenticated;

create or replace function private.notify_negative_fund475() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare standing jsonb; shortages jsonb; person text;
begin
 select coalesce(nullif(full_name,''),email,'User') into person
 from public.profiles where id=new.owner_id and status='active' and role<>'admin';
 if person is null then
  update public.negative_fund_notices475 set deficits='[]'::jsonb,revision=revision+1
   where owner_id=new.owner_id and deficits<>'[]'::jsonb;
  return null;
 end if;
 standing:=private.workspace_standing_data475(new.owner_id);
 select coalesce(jsonb_agg(jsonb_build_object('id',a->>'id','name',a->>'name','currency',a->>'currency',
  'remaining',round((a->>'opening')::numeric+(a->>'received')::numeric-(a->>'used')::numeric,2)) order by a->>'id'),'[]'::jsonb)
 into shortages from jsonb_array_elements(standing->'accounts') a
 where round((a->>'opening')::numeric+(a->>'received')::numeric-(a->>'used')::numeric,2)<0;
 shortages:=private.fund_notice_scope481(new.owner_id,shortages);
 if shortages<>'[]'::jsonb then
  insert into public.negative_fund_notices475 as existing(owner_id,owner_name,deficits)
  values(new.owner_id,person,shortages)
  on conflict(owner_id) do update set owner_name=excluded.owner_name,deficits=excluded.deficits,revision=existing.revision+1
  where existing.deficits is distinct from excluded.deficits or existing.owner_name is distinct from excluded.owner_name;
 else
  -- One clearing event after funding recovers; keep the row to reject stale deliveries.
  update public.negative_fund_notices475 set deficits='[]'::jsonb,revision=revision+1
   where owner_id=new.owner_id and deficits<>'[]'::jsonb;
 end if;
 return null;
exception when others then
 -- A notification must never reject an otherwise valid accounting save.
 raise warning 'Negative fund notification failed for owner %, SQLSTATE %',new.owner_id,SQLSTATE;
 return null;
end $$;
revoke all on function private.notify_negative_fund475() from public,anon,authenticated;

-- Remove only ineligible notification items. No journal, balance or permission changes.
with cleaned as (
 select owner_id,private.fund_notice_scope481(owner_id,deficits) deficits
 from public.negative_fund_notices475
)
update public.negative_fund_notices475 n set deficits=c.deficits,revision=n.revision+1
 from cleaned c where c.owner_id=n.owner_id and n.deficits is distinct from c.deficits;
commit;
