-- Derive balances from the current saved report; do not duplicate or rewrite
-- finalized financial records. Both offline UI and server use native currencies.
create or replace function public.budget_native_currency_totals(p_data jsonb)
returns table (
 currency text, requested numeric, approved numeric, receipt numeric,
 coverage numeric, borrow numeric, repay numeric, refund numeric,
 used numeric, cash_paid numeric, exchanged_out numeric, exchanged_in numeric,
 available numeric, remaining numeric, cash_remaining numeric,
 payment_pending boolean
)
language sql immutable security invoker set search_path = ''
as $function$
with lines as (
 select l.value as line,
  p_data->'fundingByItem'->case when coalesce(l.value->>'key117','')<>''
   then 'item:'||(l.value->>'key117') else 'row:'||(l.ordinality-1)::text end as decision
 from jsonb_array_elements(coalesce(p_data->'lines','[]'::jsonb)) with ordinality l
), request_totals as (
 select line->>'currency' as currency,
  sum(coalesce(nullif(line->>'amount','')::numeric,0)) as requested,
  case when bool_or(decision->>'status'='unconfirmed') then null else
   sum(case coalesce(nullif(decision->>'status',''),'approved')
    when 'approved' then coalesce(nullif(line->>'amount','')::numeric,0)
    when 'declined' then 0 else coalesce(nullif(decision->>'received','')::numeric,0) end) end as approved
 from lines group by line->>'currency'
), movements as (
 select m, coalesce(nullif(m->>'type290',''),case when coalesce(nullif(m->>'inflow','')::numeric,0)>0 then 'receipt' else 'spend' end) as kind
 from jsonb_array_elements(coalesce(p_data->'movements','[]'::jsonb)) m
), normalized as (
 select m, case when kind='receipt' and trim(m->>'account') ~* '^restaurant funds$'
  and m->>'description290' ~* '^restaurant covered\y.*\y(shortage|shortfall)\y'
  then 'coverage' else kind end as kind,
 coalesce(nullif(nullif(m->>'inflow','')::numeric,0),nullif(m->>'outflow','')::numeric,0) as amount
 from movements
), movement_totals as (
 select m->>'currency' as currency,
 coalesce(sum(amount) filter(where kind='receipt'),0) as receipt,
 coalesce(sum(amount) filter(where kind='coverage'),0) as coverage,
 coalesce(sum(amount) filter(where kind='borrow'),0) as borrow,
 coalesce(sum(amount) filter(where kind='repay'),0) as repay,
 coalesce(sum(amount) filter(where kind='refund'),0) as refund,
 coalesce(sum(coalesce(nullif(m->>'outflow','')::numeric,0)) filter(where kind='spend'),0) as used,
 coalesce(sum(coalesce(nullif(m->>'cashDistributed','')::numeric,nullif(m->>'outflow','')::numeric,0)) filter(where kind='spend'),0) as cash_paid,
 coalesce(bool_or(coalesce((m->>'cashUnconfirmed')::boolean,false)) filter(where kind='spend'),false) as payment_pending
 from normalized group by m->>'currency'
), exchanges as (
 select f->>'currency' as currency, coalesce(nullif(f->>'amount','')::numeric,0) as exchanged_out, 0::numeric as exchanged_in
 from jsonb_array_elements(coalesce(p_data->'conversions','[]'::jsonb)) f
 union all
 select f->>'target',0,coalesce(nullif(f->>'targetAmount290','')::numeric,
 round(coalesce(nullif(f->>'amount','')::numeric,0)*coalesce(nullif(f->>'rate','')::numeric,0),2))
 from jsonb_array_elements(coalesce(p_data->'conversions','[]'::jsonb)) f
), exchange_totals as (
 select currency,sum(exchanged_out) as exchanged_out,sum(exchanged_in) as exchanged_in from exchanges group by currency
), codes as (
 select currency from request_totals union select currency from movement_totals union select currency from exchange_totals
), totals as (
 select c.currency,coalesce(r.requested,0) as requested,
 case when r.currency is null then 0 else r.approved end as approved,
 coalesce(m.receipt,0) as receipt,coalesce(m.coverage,0) as coverage,
 coalesce(m.borrow,0) as borrow,coalesce(m.repay,0) as repay,coalesce(m.refund,0) as refund,
 coalesce(m.used,0) as used,coalesce(m.cash_paid,0) as cash_paid,
 coalesce(e.exchanged_out,0) as exchanged_out,coalesce(e.exchanged_in,0) as exchanged_in,
 coalesce(m.payment_pending,false) as payment_pending
 from codes c left join request_totals r using(currency)
 left join movement_totals m using(currency) left join exchange_totals e using(currency)
), balances as (
 select *,round(receipt+coverage+borrow-repay+exchanged_in-exchanged_out,2) as available
 from totals
)
select currency,round(requested,2),round(approved,2),round(receipt,2),round(coverage,2),
 round(borrow,2),round(repay,2),round(refund,2),round(used,2),round(cash_paid,2),
 round(exchanged_out,2),round(exchanged_in,2),available,round(available-round(used,2),2),
 case when payment_pending then null else round(receipt+coverage+borrow-repay+exchanged_in-exchanged_out-cash_paid,2) end,
 payment_pending from balances order by currency;
$function$;

revoke all on function public.budget_native_currency_totals(jsonb) from public, anon;
grant execute on function public.budget_native_currency_totals(jsonb) to authenticated, service_role;

create or replace view public.budget_utilization_currency_summary
with (security_invoker=true) as
select r.id as report_id,r.version,coalesce(r.data->>'budgetMonth290',left(r.data->>'date',7)) as month,
 r.data->>'status' as status,t.*
from public.operational_reports r
cross join lateral public.budget_native_currency_totals(r.data) t
where r.data->>'mode'='utilization';

revoke all on public.budget_utilization_currency_summary from public, anon;
grant select on public.budget_utilization_currency_summary to authenticated, service_role;
comment on view public.budget_utilization_currency_summary is
 'Native-currency utilization: receipts plus coverage/advances minus repayments plus exchange in minus exchange out minus gross expense. Remaining is before cash handover. Underlying report RLS applies.';
