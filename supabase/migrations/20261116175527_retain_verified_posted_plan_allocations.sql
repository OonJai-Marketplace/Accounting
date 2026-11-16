-- Keep an independently verified allocation for an already posted installment
-- when the posting accounts change for the rest of its plan.
create table private.prior_posted_plan_allocations (
  plan_id uuid not null,
  occurrence_no integer not null,
  due_date date not null,
  journal_entry_id uuid not null,
  expected_lines jsonb not null check (jsonb_typeof(expected_lines)='array'),
  primary key (plan_id, occurrence_no),
  foreign key (plan_id, occurrence_no) references private.journal_plan_occurrences280(plan_id, occurrence_no) on delete cascade
);
revoke all on private.prior_posted_plan_allocations from public, anon, authenticated, service_role;

do $migration$
declare
  definition text:=pg_get_functiondef('private.extended_check281(date)'::regprocedure);
  needle text:='snapshot_lines IS DISTINCT FROM m.lines';
  replacement text:=$compare$snapshot_lines IS DISTINCT FROM coalesce((
      select prior.expected_lines from private.prior_posted_plan_allocations prior
      where o.status='posted' and prior.plan_id=o.plan_id and prior.occurrence_no=o.occurrence_no
        and prior.due_date=o.due_date and prior.journal_entry_id=o.journal_entry_id
    ),m.lines)$compare$;
begin
  if (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 then
    raise exception 'Expected allocation comparison has changed';
  end if;
  execute replace(definition,needle,replacement);
end $migration$;
