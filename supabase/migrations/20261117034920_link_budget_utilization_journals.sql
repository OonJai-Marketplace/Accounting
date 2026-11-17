-- Attach a saved report to the receipt produced by the existing manual posting transaction.
create table private.budget_utilization_journals (
 report_id uuid primary key references public.operational_reports(id) on delete cascade,
 report_version integer not null,
 entry_id uuid not null unique references public.journal_entries(id) on delete cascade
);
revoke all on private.budget_utilization_journals from public,anon,authenticated;

create function private.link_budget_utilization_journal() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare
 parts text[]:=string_to_array(new.request_key,':');
 report public.operational_reports;
begin
 if public.can_action113('transactions-budget14313','view') is not true or public.is_admin() is not true then
  raise exception 'Budget administrator access is required';
 end if;
 select * into strict report from public.operational_reports where id=parts[2]::uuid for share;
 if cardinality(parts)<>3 or report.version<>parts[3]::integer or report.data->>'mode' is distinct from 'utilization'
  or report.data->>'kind' is distinct from 'finance' or jsonb_array_length(new.result)<>1 then
  raise exception 'The saved utilization report changed. Reopen it before posting';
 end if;
 insert into private.budget_utilization_journals(report_id,report_version,entry_id)
 values(report.id,report.version,(new.result->0->>'entry_id')::uuid);
 return new;
exception when unique_violation then
 raise exception 'This utilization report already has a journal entry';
end $$;
revoke all on function private.link_budget_utilization_journal() from public,anon,authenticated;
create trigger link_budget_utilization_journal after insert on public.operation_receipts14228
 for each row when (new.operation='journal' and new.request_key like 'budget-use:%')
 execute function private.link_budget_utilization_journal();

create function public.budget_utilization_journal(p_report uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if public.is_admin() is not true or public.can_action113('transactions-budget14313','view') is not true then
  raise exception 'Budget administrator access is required';
 end if;
 return (select jsonb_build_object('entry_no',j.entry_no,'status',j.status,'report_version',b.report_version)
         from private.budget_utilization_journals b join public.journal_entries j on j.id=b.entry_id where b.report_id=p_report);
end $$;
revoke all on function public.budget_utilization_journal(uuid) from public,anon;
grant execute on function public.budget_utilization_journal(uuid) to authenticated;
