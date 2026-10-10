# v143.25 — approved desktop and maintenance adjustments

Approved for repository publication on 10 October 2026.

## Changes

- Transactions is displayed as **Bookkeeping**, with **Ctrl+Alt+B** and the existing
  second-key navigation. Internal transaction IDs, routes and database names stay intact.
- The floating dock has a 4px corner inset and uses the normal 38px buttons in both
  screen modes. The working-area clearance accounts for the actual scrollbar width.
  The collapsed navigation logo is smaller, centered and contained in its tile.
- Action colors use green for supporting actions, emerald for commits and red for
  destructive/reversal actions. Color changes do not animate during row rendering.
  Navigation and connection-status indicators retain their separate meanings.
- Single/Double Entry uses a compact fixed-width control without the Entry Type
  heading. The voucher field is narrower. Date, description and voucher positions
  stay fixed between modes in the main and personal journal editors. The next-ID
  prefix label is removed without altering ID allocation.
- Closing & Data Checks and its complete dated flags live in Bookkeeping. Test Data
  opens a category selector and result dialog. Choosing a subset does not remove
  the full flag list or relax any closing requirement.
- Review & Close Month runs the existing guarded closing review, requiring actual
  balances, complete cash/bank coverage, individual exception reasons and explicit
  confirmation. Existing month lock, correction and year-end paths retain the same
  database safeguards.
- Investigator, exports and System Diagnostics remain under Maintenance & Audit.
  Their dialogs stay fixed in the viewport while their contents scroll internally.
  Background scrolling is locked; the month picker remains above the dialog.
- Exports offer dataset selection, selected-month/all-date scope, and ZIP or direct
  comparison CSV. Complete snapshot is an explicit all-datasets/all-dates option.
  The Excel template opens an explanation before download. Its existing formulas
  compare supplied figures; it does not independently recalculate the whole ledger.
- Darker field and section borders improve boundaries across the desktop workspace,
  including News. Fund snapshots separate the amounts and keep each currency symbol
  beside its value. Submitted Entries and Submission History have matching edges.

## Verification

- 30 browser workflow checks: `validation/test-polish14325.cjs`.
- 10 recovery checks, including 114 desktop/tablet page visits:
  `validation/test-recovery14325.cjs`.
- 19 isolated database installation and closing checks:
  `validation/test-maintenance-db14324.cjs`.
- 8 phone/offline checks: `validation/test-phone-tools14317.cjs`.
- 142 offline assets present and 23 changed-asset versions matched:
  `validation/test-release-assets14325.cjs`.
- 198 JavaScript files parsed; 97 release file hashes matched.
- Rendered screens inspected, including the reconciliation dialog at a 720px-high
  viewport, fullscreen logo/dock, fund amounts and finalization alignment.

The tests use isolated fixtures and a local PostgreSQL-compatible database.
They do not establish the state of the live company database. The existing
`setup/INSTALL-MAINTENANCE-v143.24.sql` is still required for maintenance and closing;
this UI release adds no SQL migration. No live financial records were changed.
The portable ZIP was not regenerated.
