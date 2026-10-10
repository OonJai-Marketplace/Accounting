# Maintenance & Audit — v143.25

Open **Settings → Maintenance & Audit** as an active accounting administrator for investigation, exports and code diagnostics. Open **Bookkeeping → Closing & Data Checks** for month-end checks and reconciliation. The existing v143.24 SQL update is still required; this UI adjustment adds no new migration.

The release retains the v143.23 stability repairs compared with v143.16
(`14d724e15c057bbd4e63324754f89959ea48a784`), before colored action buttons.
Later approved features remain in place. The phone layout is unchanged.

## Database installation

For an existing database, run `setup/INSTALL-MAINTENANCE-v143.24.sql` once in
the company's Supabase SQL editor. It requires the existing v143.22 schema.
It adds inspection functions and a closing trigger. It does not reset records.
For a new database, follow `setup/fresh/manifest.json`, including step 004.

Publishing the repository does **not** execute SQL in Supabase. Until this
update is installed, the new tools identify the missing update and closing
fails closed. Ordinary reading, posting and other existing tools remain available.
No service-role key belongs in the browser or this repository.

## Closing & Data Checks

**Test Data** opens a month and check-category selector. Results open in a fixed dialog with internal scrolling. The complete dated closing flags remain visible underneath the controls in Bookkeeping even when only selected checks are displayed. A selective report never authorizes closing. Checks cover the current saved ledger through the chosen month-end:

- Journal debits and credits, separately by currency; cumulative trial balance.
- Duplicate/missing Entry IDs, missing parents/accounts, invalid amounts,
  wrong account currency, non-posting accounts and mismatched posting months.
- Posted entries with fewer than two lines; unresolved findings and audit reviews.
- Draft journals, pending entry submissions, draft payroll, deferred staff reports,
  missing descriptions and nonzero clearing/suspense/settlement accounts.

Blocking errors cannot be waived. Warnings require a separate checkbox and reason
for each item. Unposted reports remain excluded and retain their original source
dates. Existing approval, scheduled-entry, year-end and locked-book rules still apply.

**Reconcile Accounts** opens a review without changing period status and downloads
the review for maintenance records. Actual balances are required for suggested
cash/bank accounts. Suggestions use account names and codes; add any other cash or
bank accounts and confirm list completeness. Enter statement/cash-count balances at
the selected month-end, with debit positive and credit negative. Zero is an actual
amount; blank is not zero. Variances need an explicit checkbox and explanation.

**Review & Close Month** is the guided shortcut in Bookkeeping. It runs the complete required review, then asks for explicit **Confirm & Close Month** before submitting. It does not bypass missing records, unbalanced trials or unresolved findings.

Month close, month lock, correction-session completion and year close all use the
same review. Year close uses the December cumulative review. Reopened-book cash
balances include staged corrections; the server validates the committed balances.
The database rechecks the source fingerprint while holding write locks. A change
after review requires a fresh review. Successful closing saves the check results,
reconciliations, reasons and actor in the audit log. The existing opening checkpoint
is retained; the update does not create duplicate opening balances.

Checks cannot establish whether an entirely unrecorded real-world transaction
exists. Confirm actual balances and source-document completeness yourself.

## Investigator

Search an exact Entry ID, UUID, reference, voucher number, account code or employee
ID. Results show raw connected rows, their table, why they are connected, and saved
audit history. Explicit journal/source/report/payroll/voucher links are followed.
Saved JSON documents are included when they contain exact matching identifiers.
Shared account or employee references do not expand an entry search into unrelated
entries. The first 200 results are displayed; raw exports contain the full snapshot.
Deleted records can only be traced when their retained audit records still exist.

## Independent comparison

**Export Maintenance Data** opens a selection window. Choose journal, payroll,
sub-user records, vouchers, chart references or audit records, and choose selected
month or all dates. You may instead select **Complete raw snapshot**, which always
includes all datasets and all dates. Related detail rows follow their parent records;
chart and employee references are retained without date filtering when needed.

Choose **ZIP** for selected source tables as CSV and JSON, a selection manifest,
comparison CSV and import instructions. Choose **Comparison CSV** to download
account balances and/or payroll figures directly without a ZIP. Comparison figures
always use the chosen comparison month: balances are cumulative through month-end,
and payroll results cover that month. Raw exports and comparisons preserve currency
separation and identify each payroll run separately. Draft results remain labeled.

Raw CSV text starting like a spreadsheet formula is escaped; use JSON when exact
original text fidelity matters. No exchange-rate conversions are applied.

Download **Excel Comparison Template** in the same area. Paste the comparison CSV's
six columns without its header into App Data, and your independently obtained
records into External Data. IDs, month and currency must match exactly. Amounts must
be numeric. Use the same status and period basis in both sources. The workbook
flags missing keys in either direction, duplicates, invalid amounts and differences.
It supports 1,000 input rows per source; split larger comparisons into matching key
groups. Clear old input rows between uses and retain the calculated columns.
The workbook compares supplied amounts independently; it does not recalculate
statutory payroll formulas. No company records are preloaded in the blank template.

## System Diagnostics

**Run System Diagnostics** is a separate read-only module:

- SHA-256 comparison of release files against the recorded, tested v143.25 release.
- Bundle segment attribution to original source filenames when a bundle differs.
- Required module initialization and independent cents/void/cutoff arithmetic tests.
- Native desktop scale, current maintenance action height and workspace overflow.
- Runtime errors observed after diagnostic monitoring begins at page load.

Findings include status, file, problem and likely effect. Download the complete
diagnostic report for investigation. A failed fetch is reported as unverified,
never as a pass. There are no automatic code repairs or data changes.

The pre-color v143.16 commit is the comparison foundation, not an instruction to
undo approved additions. `assets/maintenance/release14324.json` records expected
release bytes and tested approved rules. A hash match proves byte identity only.
Diagnostics cannot infer new approvals, prove every workflow correct, inspect
browser-hidden source locations, or verify all layouts without exercising them.
Server data checks are separate. Rerun diagnostics after reloading the published
release if stale or mixed files are reported.

## Code ownership and validation

- `scripts/maintenance14324.js`: hub, review UI, exports and closing integration.
- `scripts/maintenance-engine14324.js`: independent pure calculations and tracing.
- `scripts/system-diagnostics14324.js`: file and runtime checks.
- `styles/maintenance14324.css`: scoped layout and controls.
- `setup/INSTALL-MAINTENANCE-v143.24.sql`: server checks, atomic close and audit trail.
- `validation/test-polish14325.cjs`: isolated browser workflows and layout.
- `scripts/maintenance-selection14325.js`: pure export filtering.
- `styles/polish14325.css`: fixed dialogs, desktop spacing, borders and fund amounts.
- `validation/test-recovery14325.cjs`: shared module and layout regressions.
- `validation/test-release-assets14325.cjs`: offline release asset versions.
- `validation/test-maintenance-db14324.cjs`: actual installer and SQL on isolated
  PostgreSQL, including bypass attempts, stale review, exceptions, corrections,
  access controls and year-end carry-forward.

Local fixtures never write to the company's live database. Production SQL
installation must be confirmed separately from repository publication.
