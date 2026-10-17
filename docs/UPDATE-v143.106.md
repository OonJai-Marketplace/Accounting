# Reporting and archive integrity — v143.106

Date: 17 October 2026

The reporting and archive paths now use the revised chart of accounts and saved foreign-currency carrying values. Excel exports and Google Sheets integration were not changed in this release. No live bookkeeping records were deleted, rewritten or year-closed during validation.

## Corrected behavior

- Period JSON archives include opening balances in original currency and LAK. Linked older journals remain complete without counting their balances twice, including when selecting an already prepared archive again.
- Audit trial balance and general ledger show opening balance, period debits/credits, closing balance, LAK balance and average carrying rate. Income and expenses include posted period activity, exclude year-closing entries, and exclude technical/mapping accounts classified as System.
- Audit comparison shows both original-currency and LAK differences. Editing amounts or exchange rates recalculates the local working copy's valuation; the original copy stays intact. Missing valuations are identified rather than treated as zero.
- Year closing preserves LAK carrying values when transferring foreign income/expense balances into retained earnings. Missing valuations, incompatible foreign results and residual foreign income/expense valuations block closing. Closing entries must balance in LAK. A zero original-currency balance with a nonzero LAK residual remains in the saved carry-forward checkpoint.
- Saved carry-forward presentation includes the LAK carrying balance and average rate, with an explicit residual-value indication.
- When the app removes a voided journal after its last audit entry is cleared, the database first saves the complete journal header, lines, saved exchange rates, account definitions and final audit record in `record_deletions108`. Archiving and removal happen in one transaction: a failed archive insert rolls back deletion.

## What deletion and archiving mean

A downloaded JSON archive is an independent file. The audit working copy is saved locally in the browser and does not change Supabase. The app's deleted-record snapshots are stored in Supabase and included in its audit/archive data.

Direct SQL or Supabase dashboard deletion is **not** a universal automatic archive operation. The existing protected deletion/reset workflows still require their backup and confirmation checks. Posted historic journals must remain available: the live ledger calculates opening balances from posted history; a year-end checkpoint is not permission to remove that history. No automatic historical purge was introduced.

Older period archive files cannot reconstruct opening balances that were never included. The audit workspace identifies that limitation; prepare a new JSON archive from the database for complete period reporting. This release intentionally leaves the existing Excel export layout unchanged.

## Evidence

- Independently compared seven live financial report models and their print models against SQL aggregates across the read-only snapshot of 1,015 ledger lines: income statement, expense report, balance sheet, trial balance, general ledger, account activity, and cash movement. All passed.
- The reviewed live ledger had saved LAK valuations on all posted THB and USD lines. No completed year-end closing existed at the time of review.
- Isolated PostgreSQL tests cover original-currency System balances, foreign retained earnings with saved LAK values, residual LAK checkpoints, missing-rate and stale-balance blockers, locked months and repeat-close protection. Archive failure rolls back a simulated voided-journal deletion.
- Independent archive fixtures cover opening/period/closing balances, transaction versus carrying rates, missing valuations, local edits, linked older journals, repeated selection, and JSON round trips.
- Browser tests load the actual archive page and verify currency columns, period income, comparison and print visibility. Existing foreign-fund regressions passed.
- The complete empty-database installer passed 35 acceptance checks, including report posting, returned submissions, guarded deletion, permissions and complete routine compilation.
- The deployed database's new archive read returned a complete October opening context. Anonymous execution is denied; authenticated access also requires the function's administrator check.
- Update tests passed both normal and interrupted-download/retry paths, retained drafts and pending entries, and reopened offline.

The new export routine uses invoker security, an administrator guard and a fixed search path. Existing administrator-only closing and trigger permissions are retained. This release does not claim to resolve the project's unrelated existing security advisor notices or constitute an external financial audit.

Reproducible checks: `test-live-reports143106.cjs` (requires a private read-only snapshot supplied through `REPORT_SNAPSHOT`), `test-report-close143106.cjs`, `test-archive-fx143106.cjs`, `test-archive-ui143106.cjs`, `test-fresh-backend14322.cjs`, `test-foreign-funds14386.cjs`, and `test-update143103.cjs` under `validation/`. Private ledger data is not included in this repository.
