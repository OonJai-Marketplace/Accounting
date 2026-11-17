-- Read-only evidence for the fund-utilization report. Account reads are limited
-- to the support families and the explicitly referenced, posted journals.
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
    ), amounts as (
      select e.entry_no, l.currency_code as currency,
        sum(case when a.code in ('3023','3028','3020-02') or a.parent_code='3023' then l.credit else 0 end) as received,
        sum(case when a.code in ('3023','3028','3020-02') or a.parent_code='3023' then l.debit else 0 end) as debited,
        sum(case when a.code in ('3024','3029','3020-03') or a.parent_code='3024' then l.credit-l.debit else 0 end) as used
      from entries e join public.journal_lines l on l.journal_entry_id=e.id
      join public.accounts a on a.id=l.account_id
      where a.code in ('3023','3028','3020-02','3024','3029','3020-03') or a.parent_code in ('3023','3024')
      group by e.entry_no, l.currency_code
    )
    select jsonb_build_object(
      'amounts',coalesce((select jsonb_agg(to_jsonb(a)) from amounts a),'[]'::jsonb),
      'links',coalesce((select jsonb_object_agg(l.report_id::text,e.entry_no) from links l join entries e on e.id=l.entry_id),'{}'::jsonb)
    )
  );
end $$;
revoke all on function public.budget_owner_equity_evidence(text[],uuid[]) from public, anon;
grant execute on function public.budget_owner_equity_evidence(text[],uuid[]) to authenticated;
