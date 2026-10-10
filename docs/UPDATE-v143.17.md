# Accounting v143.17

This release completes the held keyboard, Finalization and control changes and repairs the five confirmed v143.16 defects.

## Navigation and editor commands

Use Ctrl+Alt plus the main module initial, release the modifiers, then press the child initial. Payroll (P) and Reports (R) do not trigger printing. Plain Ctrl/Cmd+P prints. Escape cancels a sequence.

Editor opens with Ctrl+Alt+E. Continue with F → O for File → Open, or I → T for Insert → Table. The same sequence works from the editable document. The bottom guide shows the available keys. Fast consecutive keys are retained while Editor opens. Colliding editor menu labels have been renamed: Layout replaces Format; Templates, Copy document and Adjust page are unique within File; Magnify, Reduce zoom and Toolbar visibility are unique within View; Banners / header & footer is unique within Insert. Existing formatting shortcuts remain available.

## Layout and action colors

Finalization retains Submitted Entries and Fund Allocation. Allocation headers separate the request title from actions; funding and conversion fields align at desktop and tablet widths. Tables keep readable text and scroll horizontally when needed. Shared module cards use a 3px top border and a minimum 56px internal header; banners keep their 104px height. Long headings/actions may wrap without clipping.

Action colors: green for save/post/approve/finalize; blue for add/create; purple for templates; teal for print/export/share; amber for reset/reopen/restore/lock; red for delete/void/reject; slate for neutral actions. These apply to action controls, preserving navigation, profile cards, calendar cells and the approved phone design. Disabled actions remain visibly disabled.

## Save and offline fixes

A budget's first save persists its stable record identity before insertion. Edits made during that save remain dirty and keep the returned ID/version, so the next save updates the existing request. A lost reply retries the same ID instead of creating a second request. Editable budget and conversion dates validate actual calendar dates, including leap years. Concurrent allocation save attempts cannot release another attempt's save lock.

Downloaded phone document/report and admin Settings tools use the same runtime and service-worker version, so previously opened tools can reopen after an offline reload. Shell assets and changed source/bundle segments are synchronized.

## Closing with deferred submissions

Before a monthly close or lock, the server lists reports with unposted lines dated in that month, including submitted, returned and saved draft reports. The dialog shows submitter, status, original date range and entry count. Continue requires explicit acknowledgment; Cancel leaves the period unchanged. Pending reports are excluded from the closing and are retained for later review. The acknowledged snapshot is recorded in the existing audit log; changed pending data requires a new acknowledgment.

After the reporting month closes or locks, an approved report can post in a later open month. Preparation selects the first later open month by default; the posting date remains editable. The official journal uses that posting date. Original source dates, entry numbers, submitter identity, line details and report links remain unchanged in the source report and journal-source records. Backdating into closed books is still blocked. An open reporting month continues to use its original month.

Closing a correction session and year closing use the same acknowledgment check. Existing permissions, balance/finding checks, report approval, exact source validation, optimistic versions and year fingerprints remain in force. These changes neither auto-approve nor auto-post pending reports. Archive/reset/deletion continue through the existing report/source/audit lifecycle.

### Required database installation

Run [INSTALL-DEFERRED-SUBMISSIONS-v143.17.sql](../setup/INSTALL-DEFERRED-SUBMISSIONS-v143.17.sql) once in Supabase SQL Editor. It requires the existing accounting workflows and money-in v142.78 update. It is non-destructive and rerunnable, and does not change historical dates, transactions or totals. It adds acknowledgment functions and a closing guard, and patches only the installed summary-posting date gate while preserving other installed checks. An unsupported summary-function definition aborts the entire transaction.

The source and installer are published together. The production database is not changed by a repository push. Closing reports a setup message until this installer is present. No live financial data, real email or production close/reset was used during validation.

## Validation

- Current workflow regression: 20 assertions, including budget sharing, allocations, reserved vouchers, archive/delete/reset and navigation.
- Current navigation/documents regression: 22 assertions, including formats, downloads, permissions and integration.
- New release regression: 12 assertions, including concurrent/lost-reply saves, real dates, fast editor shortcuts, readable desktop/tablet layouts and closing acknowledgment.
- Isolated PostgreSQL closing/deferred-posting regression: 10 assertions, including direct closing guard, changed snapshots, close/lock, source dates/IDs, denied backdating/closed targets, correction sessions, year fingerprints and non-admin access.
- Independent phone/offline regression: 8 assertions, including cached report tools and admin Settings after offline reload.
- Existing budget lifecycle database regression: 3 assertions, plus money-in mapping/source integrity checks.

Browser transports use local fixtures; database tests use a disposable PostgreSQL-compatible engine. These checks do not claim that the new installer is already installed in production or that physical iOS/Android devices were tested.
