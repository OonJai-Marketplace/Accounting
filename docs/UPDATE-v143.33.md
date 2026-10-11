# v143.33 — Device work, resumed sessions, and sync recovery

## Shipped behavior

- Current saved sessions can reopen their downloaded workspace after token expiry during a connection outage. This uses the same retained, previously verified account; explicit logout removes that local resume permission. An actual server authorization denial still takes precedence.
- Startup restores the active area first. A fresh login prepares the journal, payroll/attendance calendar, company reference data and documents. A resumed session uses downloaded datasets and revalidates in sequence without hiding the workspace.
- New single-date and multiple-date manual journal postings persist their complete request before the editor clears. Pending entries feed ledger, account and report calculations using device references. The database assigns final journal numbers. Retries preserve the original server-idempotent key, including after a lost response.
- Payroll, attendance, employee, leave, operational report, and ordinary company document/template saves persist in an IndexedDB outbox before returning success. Saved device versions remain available on restart, including a confirmed save whose next full data refresh failed. Online reconciliation uses stable record IDs and expected versions; competing edits become explicit conflicts instead of overwrites.
- Document and payroll snapshots retain complete pages. The HR calendar is downloaded as a complete snapshot so offline payroll can use the same holiday and schedule rules.
- Shared notification and Data Check reports include queued record changes, journal batches, conflicts, storage failures and closed-period items. Relevant unresolved saves block local month-close assessment. Reports generated through the document editor disclose outstanding device saves.
- Journal recovery storage is separate per database, account and posting reference. A tab cannot replace another tab's entire pending list. Completion markers prevent stale tabs from resurrecting completed requests.
- Phone fund displays include unconfirmed device movements while avoiding known saved staff references. The standalone phone entry page can reopen a retained verified session after expiry and keeps confirmed queue entries until its refreshed figures arrive.

## Database installation required for journal year windows

Run `setup/INSTALL-OFFLINE-YEAR-WINDOW-v143.33.sql` once in the existing Supabase project's SQL Editor. This only installs a read-only, RLS-respecting function. It changes no financial rows.

The endpoint supplies the requested year(s), compact pre-period opening balances, and a revision fingerprint. Historical journal rows are requested when the reporting period expands. A changing revision prevents an incomplete multi-page journal from replacing the saved dataset.

Without that endpoint, the existing complete journal reader remains active. This is a deliberate correctness fallback: filtering away previous years without their opening balances would produce incorrect financial statements. The UI reports the outstanding loading setup.

Payroll history remains available because existing leave-entitlement calculations use finalized attendance from earlier years. It has a complete durable snapshot and does not need to redownload before working after a restart, but its background validation is not yet restricted to one year. Recovery/maintenance code is still part of the existing packed application; this release does not claim full route-level code splitting.

## Boundaries

- Approvals, journal edits/voids, reopened-book corrections, destructive maintenance, access changes and closing still use their existing server-authorized paths. This release does not turn these into offline queued commands.
- Prepared payroll can be calculated, saved, finalized locally and printed while offline. Its company journal link still uses the existing server-confirmed workflow.
- Browser storage is not a backup against clearing browser data, storage eviction or device loss. Recovery exports remain available; a disconnected device cannot prove another disconnected device has no outstanding work.
- The read-only migration has been prepared, but could not be applied from the available GitHub connection. No production financial data was altered by this release.

## Validation

- Browser tests with real IndexedDB: saved work/restart, actor isolation, lost response after commit with one database write, competing-version conflict, storage abort preserving the editor, journal receipt replacement without double totals, and explicit logout disabling local session resume.
- Actual application offline posting test: a two-date balanced batch persists as one stable request, clears the editor after storage, contributes exactly the expected four ledger lines, and appears in Data Check.
- Real Supabase SDK and service-worker fixtures: administrator/staff login and offline reopen after token expiry on desktop, tablet and phone; downloaded HR calendar remains usable offline.
- Shared red numbered notification badge, closed-period close block, possible-duplicate report and Settings/statutory navigation regression checks.
- Release asset version/cache completeness checks, JavaScript syntax, and whitespace checks.

These are controlled failure tests, not a claim of testing every possible device, network or production account. A signed-in production multi-device payroll/reconciliation test and applying the year-window SQL remain outside the access available here.
