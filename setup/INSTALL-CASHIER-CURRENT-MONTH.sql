-- Cashier self-entry is limited to the business month. The manager can review
-- original dates through the existing permission-checked correction workflow.
create or replace function private.guard_cashier_entry_month()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  actor uuid := auth.uid();
  owner uuid;
  stored_date date;
  proposed_date date;
  month_start date := date_trunc('month', statement_timestamp() at time zone 'Asia/Vientiane')::date;
begin
  if actor is not null and exists (
    select 1 from public.user_permissions u
    where u.user_id = actor and lower(btrim(u.job_title)) = 'cashier'
  ) then
    if tg_table_name = 'staff_journals' then
      owner := new.owner_id;
      proposed_date := new.period_start;
      if tg_op = 'UPDATE' then stored_date := old.period_start; end if;
    else
      if tg_op <> 'DELETE' then proposed_date := new.transaction_date; end if;
      if tg_op <> 'INSERT' then stored_date := old.transaction_date; end if;
      select j.owner_id into owner from public.staff_journals j
      where j.id = case when tg_op = 'DELETE' then old.staff_journal_id else new.staff_journal_id end;
    end if;
    if owner = actor and (
      date_trunc('month', stored_date)::date <> month_start or
      date_trunc('month', proposed_date)::date <> month_start
    ) then
      raise exception 'Cashier entries must be dated in the current month.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.guard_cashier_entry_month() from public, anon, authenticated;
drop trigger if exists cashier_entry_month on public.staff_journal_lines;
create trigger cashier_entry_month before insert or update or delete on public.staff_journal_lines
for each row execute function private.guard_cashier_entry_month();
drop trigger if exists cashier_entry_month on public.staff_journals;
create trigger cashier_entry_month before insert or update of period_start,owner_id on public.staff_journals
for each row execute function private.guard_cashier_entry_month();
