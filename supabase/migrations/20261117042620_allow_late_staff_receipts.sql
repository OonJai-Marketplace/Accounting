-- Staff use the receipt date. Cashier month-end deadlines are an internal procedure.
drop trigger if exists cashier_entry_month on public.staff_journal_lines;
drop trigger if exists cashier_entry_month on public.staff_journals;
drop function if exists private.guard_cashier_entry_month();
