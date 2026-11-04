# Synchronization details — v143.284

The Synchronization window now identifies retained requests by journal number (or date, description and saved request reference before numbering), payroll month/reference, employee/leave details, and document/template title. Long lists summarize and expand to the full list. Consecutive official numbers are grouped only when their prefixes, years and pending operation match; gaps are preserved.

Pending edits, voids and voucher links are distinguished from their already confirmed original journal entries. Confirmed copies waiting for refresh/cleanup are excluded from the waiting-save list. Downloaded data refresh is a separate disclosure and never a save confirmation.

Unresolved sync notices survive being marked read. Success feedback for local-first document/template, employee/HR, leave, payroll draft, attendance and operational/budget report saves now checks that operation's returned pending flag. Existing payroll finalization receipt requirements remain unchanged.

Retry uses the retained request and original ID. Record retry targets its own dependency chain. Version checks, ownership, encryption, accounting validation and journal RPC idempotency remain authoritative. No financial records, database schema, permission rules or payroll calculations were changed.

## Troubleshooting

- Waiting / confirmation not received: reconnect, expand the item, and retry the saved request. Do not re-enter it: the server may already have committed the save.
- Conflict / rejected request: open Bookkeeping → Data Check, retain the reference/error and review the current database record before correcting or retrying. No force-overwrite action was added.
- Storage failure: keep the editor open, check device storage, and export/verify a recovery backup where available. Never clear browser data or uninstall with pending work.
- Confirmed but refresh failed: refresh the view, rather than creating another entry.

## Scope and validation

The list covers existing retained queues on the current device/account. It does not claim to inventory unsaved editor changes, another device's queues, or every failed network request (such as a standalone receipt PDF upload or an online-only configuration save). It is not evidence that past failed requests lost records.

Synthetic validation: 12 sync description/dialog/notification/save-feedback scenarios, 4 real IndexedDB retry scenarios, and the existing 15 performance/recovery/accounting regression suites. These include lost-response confirmation without a duplicate insert, conflict protection, actor switches, exact IDs, long lists, escaping, and confirmed-vs-pending document/template handlers. No live financial test writes.

Release checks: canonical build and ownership, aligned offline cache keys, diagnostics manifest and release integrity. The browser used for verification is not signed in to Accounting; live financial workflows were not exercised. The synthetic dialog fixture permits visual review without a database connection.
