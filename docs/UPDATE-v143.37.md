# v143.37 — Workspace and export workflow

- Bookkeeping Finalization now contains Submitted Entries, Fund Allocation, and Reconciliation. Reports keeps a read-only reconciliation summary.
- Upcoming opens an Upcoming Transactions banner and connected Recurring, Scheduled, To-dos, and Calendar tabs. The recurring list is titled Recurring Transaction.
- To-do headings are compact, numbered steps are indented, Add Step is right aligned, and unsaved changes use a confirmation dialog. Only due, saved reminders contribute to notifications.
- Settings top tabs sit together. Accounting contains Accounting, Vouchers, and Currency Manager sections.
- Sub-user tabs meet their bottom divider without a hover scrollbar line.
- Payroll shows employee names, displays mandatory currency labels beside amounts, and orders USD before LAK with descending salaries within each currency. Editing continues to use original row indices. Payroll metadata has the requested exchange-rate order and a separate Note row.
- Related export/print controls share an entry point and send generated files to Document Editor first. The editor offers original data files alongside document formats. Original file downloads preserve their exact bytes; editor formatting and signatories apply to document outputs.
- Encryption is selected by default. Protected downloads use password-encrypted ZIP files; the account's prior password is restored from encrypted local preference or its existing password history. Existing password-history database setup is still required.
- Tablet landscape uses the icon rail; portrait uses the hamburger drawer. The phone layout remains unchanged.

Validation: browser fixture workflows, source/bundle synchronization, release asset checks, and encrypted ZIP round-trip with wrong-password rejection. Tablet layouts were checked in browser simulation, not on physical hardware. No financial calculation rules or historical records were changed.
