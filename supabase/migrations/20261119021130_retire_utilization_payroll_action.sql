-- Retire the removed Fund Utilization "Payroll amounts" action.
-- Historical amendment records and finalized-report guards retain their existing definitions.
drop function if exists public.budget_payroll_protocol(uuid, integer, boolean, text);
drop function if exists private.budget_payroll_name(text);
