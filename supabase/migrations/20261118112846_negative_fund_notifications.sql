-- A saved transaction already touches one revision per affected owner, once per transaction.
-- Defer the shortfall check until all its journal lines/status changes are complete.
-- No cron, job queue, balance polling or historical financial-data changes.
begin;
-- Keep the existing custody and ledger calculation, and identify the saved staff movements already included.
create or replace function private.workspace_standing_data475(p_owner uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare result jsonb; today date := (statement_timestamp() at time zone 'Asia/Vientiane')::date;
begin

 with assigned as (
  select a.id,a.code,a.name,a.currency_code currency,lower(trim(u.job_title))='cashier' cashier,
   b.clearing_id,b.through_date,b.outstanding,b.settled,b.settlement_from,b.settlement_through
  from public.user_permissions u join public.accounts a on a.id=any(u.assigned_fund_account_ids)
  left join private.cashier_custody_start b on b.cash_id=a.id and b.owner_id=u.user_id
  where u.user_id=p_owner
 ), tracked as (
  select * from assigned where not coalesce(cashier,false) or code in ('1016','1017','1018') or through_date is not null
 ), ledger as (
  select a.id,l.journal_entry_id,coalesce(l.line_date,e.transaction_date) movement_date,l.debit,l.credit,
   l.credit>0 and exists(select 1 from public.journal_lines hand
    join public.accounts dest on dest.id=hand.account_id where hand.journal_entry_id=e.id
    and hand.debit>0 and dest.code in ('1010','1011','1012') and dest.currency_code=a.currency) handover
  from tracked a join public.journal_lines l on l.account_id in (a.id,a.clearing_id)
  join public.journal_entries e on e.id=l.journal_entry_id and e.status='posted' and e.voided_at is null
  where coalesce(l.line_date,e.transaction_date) between
    coalesce(a.through_date+1,date_trunc('year',today)::date) and today
   and (a.through_date is null or not (coalesce(e.reference,'') like 'ANNUAL-OPENING-%' or coalesce(e.memo,'') like 'Annual opening balances %'))
   and (l.account_id=a.id or (l.credit>0 and exists(
     select 1 from public.journal_lines other join public.accounts dest on dest.id=other.account_id
     where other.journal_entry_id=e.id and other.debit>0 and dest.currency_code=a.currency
     and (dest.code in ('1010','1011','1012') or dest.account_type='EXPENSE'))
     and not exists(select 1 from public.journal_lines other where other.journal_entry_id=e.id and other.account_id=a.id)))
 ), staff as (
  select a.id,l.id line_id,l.editor_group1437 grp,l.transaction_date movement_date,l.entry_kind,l.journal_entry_id,j.status,l.memo,l.line_no,l.created_at,
   j.status in ('draft','returned','submitted','approved') as pending,a.cashier,
   (case when l.direction='in' then l.amount else -l.amount end) *
     (coalesce((l.fund_account_id=a.id)::int,0) - (l.account_id=a.id)::int) movement
  from tracked a join public.staff_journal_lines l on a.id in (l.account_id,l.fund_account_id)
  join public.staff_journals j on j.id=l.staff_journal_id and j.owner_id=p_owner
  where l.transaction_date between coalesce(a.through_date+1,date_trunc('year',today)::date) and today
   and j.status in ('draft','returned','submitted','approved','posted','reviewed','approved_posted')
 ), staff_state as (
  select s.*,(s.pending or coalesce(s.cashier,false)) and not exists(
   select 1 from ledger g where g.id=s.id and g.journal_entry_id=s.journal_entry_id) counted
  from staff s
 ), movements as (
  select id,movement_date,debit-credit movement,handover as settlement from ledger
  union all
  select s.id,s.movement_date,s.movement,s.entry_kind='handover' from staff_state s where s.counted
 ), totals as (
  select a.*,coalesce(sum(greatest(m.movement,0)),0) received,
   coalesce(sum(greatest(-m.movement,0)),0) used,
   coalesce(bool_or(m.settlement and m.movement=-a.settled and m.movement_date between a.settlement_from and a.settlement_through),false) settlement_recorded
  from tracked a left join movements m on a.id=m.id group by a.id,a.code,a.name,a.currency,a.cashier,
   a.clearing_id,a.through_date,a.outstanding,a.settled,a.settlement_from,a.settlement_through
 )
 select jsonb_build_object('cashier',coalesce((select bool_or(cashier) from assigned),false),'asOf',today,
  'accounts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'currency',currency,
    'start',through_date,'opening',coalesce(outstanding,0),'settled',coalesce(settled,0),'settledThrough',settlement_through,
    'received',received,'used',used+case when settled>0 and not settlement_recorded and settlement_through<=today then settled else 0 end)
    order by code) from totals),'[]'::jsonb),
  'detailVersion',1,
  'lines',coalesce((select jsonb_agg(jsonb_build_object(
    'id',line_id,'account',id,'group',grp,'amount',movement,'counted',counted) ||
    case when pending and counted then jsonb_build_object('status',status,'date',movement_date,
      'memo',memo,'line_no',line_no,'created_at',created_at) else '{}'::jsonb end)
    from staff_state where grp is not null or (pending and counted)),'[]'::jsonb)) into result;
 return result;
end $$;

revoke all on function private.workspace_standing_data475(uuid) from public,anon,authenticated;
-- Preserve the existing API and access checks; both callers share the same calculation.
create or replace function private.workspace_standing379(p_owner uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if auth.uid() is null or not coalesce(public.active_account14228() and not public.password_change_required14257()
   and public.can_workspace113(p_owner),false) then raise exception 'Workspace access required' using errcode='42501'; end if;
 return private.workspace_standing_data475(p_owner);
end $$;

create table public.negative_fund_notices475 (
 owner_id uuid primary key references public.profiles(id) on delete cascade,
 owner_name text not null,
 deficits jsonb not null check(jsonb_typeof(deficits)='array'),
 revision bigint not null default 1
);
alter table public.negative_fund_notices475 enable row level security;
revoke all on public.negative_fund_notices475 from public,anon,authenticated;
grant select on public.negative_fund_notices475 to authenticated;
create policy admin_negative_funds475 on public.negative_fund_notices475
 for select to authenticated using (
  (select public.is_admin()) and (select public.active_account14228())
  and not (select public.password_change_required14257())
  and (select public.can_action113('sub-users-home14229','view'))
  and exists(select 1 from public.profiles p where p.id=owner_id and p.status='active')
 );

create or replace function private.notify_negative_fund475() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare standing jsonb; shortages jsonb; person text;
begin
 select coalesce(nullif(full_name,''),email,'User') into person
 from public.profiles where id=new.owner_id and status='active';
 if person is null then return null; end if;
 standing:=private.workspace_standing_data475(new.owner_id);
 select coalesce(jsonb_agg(jsonb_build_object('id',a->>'id','name',a->>'name','currency',a->>'currency',
  'remaining',round((a->>'opening')::numeric+(a->>'received')::numeric-(a->>'used')::numeric,2)) order by a->>'id'),'[]'::jsonb)
 into shortages from jsonb_array_elements(standing->'accounts') a
 where round((a->>'opening')::numeric+(a->>'received')::numeric-(a->>'used')::numeric,2)<0;
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
create constraint trigger notify_negative_fund475
 after insert or update on public.workspace_fund_revision379
 deferrable initially deferred for each row execute function private.notify_negative_fund475();
alter publication supabase_realtime add table public.negative_fund_notices475;
notify pgrst,'reload schema';
commit;
