# Cross-module integrations

These sources are the existing integration implementations, separated for focused
debugging. They use the same globals and database calls as before; no new RPCs,
data stores, event handlers or runtime loaders are introduced.

| Bridge | Responsibility | Existing contracts |
| --- | --- | --- |
| `subusers-bookkeeping/` | Submit/reconcile reports, prepare detailed or consolidated journal forms, approval and return | `Reports14253`, `workflow136`, `prepareReviewJournal`, `submitJournalEntry`, `JournalModule`, `reviewStaffJournals` |
| `hr-payroll/` | Shared employee/leave inputs and payroll grouping | Existing payroll grouping and HR wrappers; see directory README |
| `payroll-bookkeeping/` | Payroll journal templates and posting handoff | Existing payroll journal/template wrappers; see directory README |
| `bookkeeping-startup/` | Existing foreground-first posting and login wrapper | `workspace-v99.js`; startup/auth and local-first services |

Source report IDs, transaction dates, line memos, currencies, per-user ownership,
approval status, posting receipts and idempotency keys pass through unchanged.
The database continues to enforce permissions and transaction integrity.

`subusers-bookkeeping/report-workflow/` separates submission, loading,
consolidation and journal preparation inside the original `workflow14253.js`
closure. Its user lifecycle section is owned by `settings/users/` but remains
at its original position in the build manifest.

Do not merge overlapping versioned wrappers without tracing runtime order and
testing their callers. Apparent duplication can be a later override or a
different standalone/desktop path.
