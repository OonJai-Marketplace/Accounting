# Accounting workflow verification — 6 November 2026

This release completes the recovered checklist from “Fix accounting workflows.”
The unpublished work was recovered from its original checkout, checked in an isolated checkout against published 143.311, and retained with its canonical source and generated assets.

| Requested change | Implementation and verification |
| --- | --- |
| Neutral monthly cash slip signatures | Signature 1 / Signature 2; preserved 40 blank numbered rows, nine columns, editable month, continued numbering, legend and reviewer defaults. Creation, saved defaults, cancellation and account-change guards passed. |
| Payroll Overview redesign | Monthly employee count, gross payroll, employee PIT/SSO, separate final-payment currency totals, processing status, employee detail table and monthly leave. Checked mixed USD/LAK sample totals and desktop/tablet layouts; payroll calculations are unchanged. |
| Remember horizontal tabs in every main area | Account-scoped navigation memory; returns to Entries and other selected destinations; resets after 12 hours without interaction. Checked regular areas, all grouped Bookkeeping/Settings destinations, reload, and account isolation. |
| All shortcut commands | Checked 11 module prefixes, 65 destinations and 33 Editor commands, title-bar/content Save, uppercase events, undo/redo, Escape, iframe navigation, and retained-modifier sequences. |
| Fund Utilization navigation and spending | Main navigation stays available; return to Budget Request; direct request save; typed spending description, selected budget item and actual-versus-budget comparison. Save/reopen, November activity for an October request, currency conversion, advances and partial repayments passed. |
| Budget Request alignment | Aligned month/date, recipient/purpose, notes, item entry and action controls. Desktop and tablet-width screenshots inspected. |

## Checks

- `node validation/test-workspace312.cjs`
- `node validation/test-all-shortcuts312.cjs`
- `node validation/test-budget-utilization290.cjs`
- `node validation/test-budget-lifecycle14316.cjs`
- `node validation/test-monthly-cash-slip277.cjs`
- `node validation/test-payroll-navigation289.cjs`
- `node validation/test-release-integrity143198.cjs`
- `python tools/build-modules.py --check`
- `python validation/test-phase0-structure.py`
- `python tools/refresh-release-manifest.py --check`
- `python validation/test-release-cache-keys236.py`
- `git diff --check`

The utilization fixture was updated to supply its synthetic payroll settings and wait for the row action menu before reopening; its initial timeout was in that fixture. The database lifecycle suite was rerun after resolving its local test dependency.

Verification uses synthetic records and a local PostgreSQL-compatible test database. No live financial journals, payroll amounts or period state were changed. Desktop Chromium/tablet-width rendering is not a physical iPad Safari or printer test. Deployment verification is recorded in the release handoff after publication.
