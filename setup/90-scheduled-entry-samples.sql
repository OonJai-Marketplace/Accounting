-- Oon Jai — two demonstration schedules and their journal previews.
-- These examples never enter journal_entries, affect balances or run a timer.
-- Re-running replaces only these two demonstration records.
begin;
create table if not exists public.accounting_feature_samples (
 sample_key text primary key,
 data jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.accounting_feature_samples enable row level security;
revoke all on public.accounting_feature_samples from anon,authenticated;
grant select on public.accounting_feature_samples to authenticated;
drop policy if exists accounting_feature_samples_admin_read on public.accounting_feature_samples;
create policy accounting_feature_samples_admin_read on public.accounting_feature_samples
for select to authenticated using (exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active'));
insert into public.accounting_feature_samples(sample_key,data) values
('demo-monthly-bank-fee', '{
 "title":"Monthly bank service fee", "frequency":"Monthly", "dayRule":"15th of each month", "firstDate":"2026-09-15", "nextDate":"2026-10-15", "occurrences":12, "currency":"LAK", "amount":25000,
 "debitAccount":"Bank Charges Expense", "creditAccount":"BCEL Bank",
 "memo":"Monthly bank service fee — verify against bank statement", "reminderDays":3,
 "journalDate":"2026-09-15", "reviewStatus":"Needs review", "exampleNumber":1
}'::jsonb),
('demo-prepaid-rent', '{
 "title":"Monthly prepaid rent allocation", "frequency":"Monthly", "dayRule":"Last day of each month", "firstDate":"2026-09-30", "nextDate":"2026-10-31", "occurrences":12, "currency":"LAK", "amount":3000000,
 "debitAccount":"Rent Expense", "creditAccount":"Prepaid Rent",
 "memo":"One month of a 36,000,000 LAK annual prepayment — allocation only", "reminderDays":2,
 "journalDate":"2026-09-30", "reviewStatus":"Needs review", "exampleNumber":2
}'::jsonb)
on conflict(sample_key) do update set data=excluded.data,updated_at=now();
commit;
select sample_key,data->>'title' as example,data->>'amount' as amount,data->>'nextDate' as next_date
from public.accounting_feature_samples where sample_key in ('demo-monthly-bank-fee','demo-prepaid-rent') order by sample_key;
