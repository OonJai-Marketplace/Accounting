# v143.31 — Payroll visibility and shared period calendar

Payroll attendance deductions, internal deductions, entries and breakdown,
mandatory deductions, final payments, and exchange-rate dates stay visible.
Working sections no longer collapse. Calculation rules are unchanged.

The period calendar contains Monthly, Quarterly, and Yearly controls below its
grid. Monthly supports multiple selected months; Quarterly shows Q1–Q4.
This month, All months, Clear, and Apply are inside the popup. Financial reports
also retain a Custom date range. Summary, financial reports, assigned ledgers,
and the report-to-editor chooser share this calendar. Transaction dates and
payroll-run dates keep their single-date behavior.

Separate selected months produce separate financial periods, preserving opening
and closing balances. Balance Sheet comparisons show the chosen period ends.
Screen, CSV, and print use the same selected periods. Summary loads each chosen
month independently. All months means all available data except in the assigned
ledger, where it means the displayed year, as stated by the control and status;
this preserves the server's existing one-year request limit and access checks.

Reports begin with General Ledger, Trial Balance, Income Statement, Balance
Sheet, and Cash Flow. The duplicate tab-scroll track is removed, and the remaining
scrollbar is thin. Clicked table rows use a consistent soft green highlight;
grouped journal entries highlight together without inner cell outlines.

Voucher IDs is a separate settings section following Accounting. Sub-user action
buttons and journal panels align, and HR employee selectors match between
Performance and Contracts & Documents.

Validation: 17 focused browser checks cover visibility, unchanged sample payroll
calculations, month/quarter/all/custom filtering, report exports, cumulative
balance columns, ledger authorization, row selection, and desktop alignment.
Offline release assets and the maintenance manifest are synchronized. No database
migration or historic-record rewrite is required.
