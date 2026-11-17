-- Keep the existing custody and ledger calculation, and identify the saved staff movements already included.
create or replace function private.workspace_standing379(p_owner uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare result jsonb; today date := (statement_timestamp() at time zone 'Asia/Vientiane')::date;
begin
 if auth.uid() is null or not coalesce(public.active_account14228() and not public.password_change_required14257()
   and public.can_workspace113(p_owner),false) then raise exception 'Workspace access required' using errcode='42501'; end if;
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
