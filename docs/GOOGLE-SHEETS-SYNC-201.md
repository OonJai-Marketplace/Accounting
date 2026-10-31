# Reliable Google Sheets sync and calculated reports

The existing business-owned Current and History workbook remains the destination.
No journal, payroll, attendance or leave source record is modified by this repair.

## Failure and repair

A verbose operational report exceeded the 49,000-character display-cell guard.
Raw record parts were already safe, but the readable Budget Requests tab was not.
Large display text now uses lossless continuation columns; raw records remain
exact JSON parts. Workbook writes are bounded below 1.9 MB per request, including
large Raw Data and revision append writes. Live tabs are written one at a time,
and source matrices are compared cell by cell to keep verification memory bounded. Source revision retries read only IDs
and overlapping payloads, avoiding repeated full-history downloads.

Writes and readback resume in groups of ten tabs per worker, with checkpoints
tied to the database revision. A changed revision restarts the write phase.
Readback checks both formula/source content and calculated results. A failed
write or calculation never acknowledges queued changes or advances saved_revision.
Only a verified live snapshot advances that revision. Queued historical revisions
then drain without repeatedly rewriting the same current workbook. A five-minute
conditional database job retries pending or interrupted work while idle workbooks
are untouched. The internal snapshot RPC alone has a 60-second timeout.

## Calculation basis

Journal retains every saved status, original currency, dates, IDs and saved LAK
valuations. General Ledger uses posted lines. Trial Balance, Income Statement,
Balance Sheet, Monthly Results and print views contain formulas referencing the
journal or their parent report. Dedicated rounding helpers reproduce per-line
cent rounding without altering original numbers. P&L excludes technical mapping
and system closing lines; Balance Sheet retains untransferred earnings once.

Payroll exposes saved components, net/adjusted-net formulas, summaries and tax
contribution formulas. Attendance includes finalized daily records and the same
validated historical evidence used by the web app. Historical deduction formulas
retain the employee/period's percentage bands, time component, special lookup and
waiver. Source rule formulas are literal evidence, never executed as external
spreadsheet references. Saved results and formula comparisons remain separate.

Historical leave records and entitlement snapshots embedded in employee records
are included, including previous contract periods and negative remaining days.
Remaining allowance is calculated from that snapshot's allowance and used days;
source available-vacation values are preserved separately. No historic TODAY()
formula is reapplied to old entitlements. Calendar records remain in HR Events.

Closed-year history and all existing deletion/backup confirmation gates remain
unchanged. Formula generation is only used by live Sheets sync; immutable history
and database Excel backup use the existing value-based reports.

Validation: existing record/report and Edge archive tests, module structure checks,
new large-text/period-rule/leave tests, and live formula plus source readback.
