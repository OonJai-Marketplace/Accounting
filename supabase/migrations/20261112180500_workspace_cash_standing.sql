-- Manager-confirmed handover checkpoints are operational evidence, separate from accounting entries.
create table if not exists private.cashier_custody_start (
 owner_id uuid not null references public.profiles(id), cash_id uuid not null references public.accounts(id),
 clearing_id uuid references public.accounts(id), through_date date not null,
 outstanding numeric(18,2) not null default 0, settled numeric(18,2) not null default 0,
 settlement_from date, settlement_through date,
 primary key(owner_id,cash_id)
);
revoke all on private.cashier_custody_start from public,anon,authenticated;

-- Only assigned-account totals may leave the ledger boundary. Sub-users cannot read company journals.
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
  select a.id,l.id line_id,l.editor_group1437 grp,l.transaction_date movement_date,l.entry_kind,l.journal_entry_id,
   (case when l.direction='in' then l.amount else -l.amount end) *
     (coalesce((l.fund_account_id=a.id)::int,0) - (l.account_id=a.id)::int) movement
  from tracked a join public.staff_journal_lines l on a.id in (l.account_id,l.fund_account_id)
  join public.staff_journals j on j.id=l.staff_journal_id and j.owner_id=p_owner
  where l.transaction_date between coalesce(a.through_date+1,date_trunc('year',today)::date) and today
   and (j.status in ('draft','returned','submitted','approved') or (a.cashier and j.status in ('posted','reviewed','approved_posted')))
 ), movements as (
  select id,movement_date,debit-credit movement,handover as settlement from ledger
  union all
  select s.id,s.movement_date,s.movement,s.entry_kind='handover' from staff s
   where not exists(select 1 from ledger g where g.id=s.id and g.journal_entry_id=s.journal_entry_id)
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
  'lines',coalesce((select jsonb_agg(jsonb_build_object('id',line_id,'account',id,'group',grp,'amount',movement))
    from staff where grp is not null and movement_date>=date_trunc('year',today)::date),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function private.workspace_standing379(uuid) from public,anon;
grant execute on function private.workspace_standing379(uuid) to authenticated;
create or replace function public.workspace_standing379(p_owner uuid) returns jsonb
language sql stable security invoker set search_path=pg_catalog as 'select private.workspace_standing379(p_owner)';
revoke all on function public.workspace_standing379(uuid) from public,anon;
grant execute on function public.workspace_standing379(uuid) to authenticated;
notify pgrst,'reload schema';

-- Invalidate only affected workspaces, once per owner per transaction. No financial data travels on the channel.
create table if not exists public.workspace_fund_revision379 (
 owner_id uuid primary key references public.profiles(id) on delete cascade, revision bigint not null
);
alter table public.workspace_fund_revision379 enable row level security;
revoke all on public.workspace_fund_revision379 from public,anon,authenticated;
grant select on public.workspace_fund_revision379 to authenticated;
create policy read_assigned_standing379 on public.workspace_fund_revision379 for select to authenticated
 using (public.active_account14228() and not public.password_change_required14257() and public.can_workspace113(owner_id));
create or replace function private.touch_standing379() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare owners uuid[]; ids uuid[]; batches uuid[];
begin
 if tg_table_name='journal_lines' then
  ids:=array[case when tg_op<>'INSERT' then old.account_id end, case when tg_op<>'DELETE' then new.account_id end];
 elsif tg_table_name='journal_entries' then
  select array_agg(distinct account_id) into ids from public.journal_lines where journal_entry_id=new.id;
 elsif tg_table_name='staff_journals' then
  owners:=array[new.owner_id];
 else
  batches:=array[case when tg_op<>'INSERT' then old.staff_journal_id end, case when tg_op<>'DELETE' then new.staff_journal_id end];
  select array_agg(distinct owner_id) into owners from public.staff_journals where id=any(batches);
 end if;
 if ids is not null then
  select array_agg(u.user_id) into owners from public.user_permissions u where u.assigned_fund_account_ids && ids
    or exists(select 1 from private.cashier_custody_start b where b.owner_id=u.user_id and b.clearing_id=any(ids));
 end if;
 insert into public.workspace_fund_revision379 as r(owner_id,revision)
 select distinct o,txid_current() from unnest(owners) o where o is not null order by o
 on conflict(owner_id) do update set revision=excluded.revision where r.revision<>excluded.revision;
 return null;
end $$;
revoke all on function private.touch_standing379() from public,anon,authenticated;
create trigger standing379_lines after insert or delete or update of account_id,debit,credit,line_date,journal_entry_id on public.journal_lines for each row execute function private.touch_standing379();
create trigger standing379_status after update of status,transaction_date,voided_at on public.journal_entries for each row execute function private.touch_standing379();
create trigger standing379_staff after insert or delete or update on public.staff_journal_lines for each row execute function private.touch_standing379();
create trigger standing379_batch after update of status on public.staff_journals for each row execute function private.touch_standing379();
alter publication supabase_realtime add table public.workspace_fund_revision379;
