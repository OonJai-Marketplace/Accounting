-- Read-only owner support evidence: a matched FX bridge transfers Remaining
-- between currencies. It is neither a new owner contribution nor spending.
-- Retain administrator authorization and the explicitly referenced entry scope.
create or replace function public.budget_owner_equity_evidence(p_refs text[], p_reports uuid[])
returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
begin
  if public.is_admin() is not true or public.can_action113('transactions-budget14313','view') is not true then
    raise exception 'Budget administrator access is required';
  end if;
  return (
    with links as (
      select b.report_id, b.entry_id from private.budget_utilization_journals b
      where b.report_id = any(p_reports)
    ), entries as (
      select j.id, j.entry_no from public.journal_entries j
      where j.status = 'posted' and (j.entry_no = any(p_refs) or j.id in (select entry_id from links))
    ), support_lines as (
      select e.entry_no, l.*,
        (a.code in ('3023','3028','3020-02') or a.parent_code='3023') as remaining,
        (a.code in ('3024','3029','3020-03') or a.parent_code='3024') as used_account,
        exists (
          select 1 from public.journal_lines b
          join public.accounts ba on ba.id=b.account_id
          where b.journal_entry_id=l.journal_entry_id
            and abs(b.line_no-l.line_no)=1
            and ba.code in ('9010','9011','9012','9021','9022')
            and b.currency_code=l.currency_code
            and b.description is not distinct from l.description
            and b.line_date is not distinct from l.line_date
            and b.fx_rate_lak is not distinct from l.fx_rate_lak
            and b.book_rate_lak is not distinct from l.book_rate_lak
            and ((l.debit>0 and l.credit=0 and b.credit=l.debit and b.debit=0)
              or (l.credit>0 and l.debit=0 and b.debit=l.credit and b.credit=0))
        ) as exchange_pair
      from entries e join public.journal_lines l on l.journal_entry_id=e.id
      join public.accounts a on a.id=l.account_id
      where a.code in ('3023','3028','3020-02','3024','3029','3020-03') or a.parent_code in ('3023','3024')
    ), amounts as (
      select entry_no, currency_code as currency,
        sum(case when remaining and not exchange_pair then credit else 0 end) as received,
        sum(case when remaining then debit else 0 end) as debited,
        sum(case when used_account then credit-debit else 0 end) as used,
        sum(case when remaining and exchange_pair then credit else 0 end) as exchanged_in,
        sum(case when remaining and exchange_pair then debit else 0 end) as exchanged_out
      from support_lines
      group by entry_no, currency_code
    )
    select jsonb_build_object(
      'amounts',coalesce((select jsonb_agg(to_jsonb(a)) from amounts a),'[]'::jsonb),
      'links',coalesce((select jsonb_object_agg(l.report_id::text,e.entry_no) from links l join entries e on e.id=l.entry_id),'{}'::jsonb)
    )
  );
end $$;
revoke all on function public.budget_owner_equity_evidence(text[],uuid[]) from public, anon;
grant execute on function public.budget_owner_equity_evidence(text[],uuid[]) to authenticated;
