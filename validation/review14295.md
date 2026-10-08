# Reset, archive, audit and feedback review — v142.95

17 targeted checks passed using synthetic samples only. No live database records were created, changed or deleted during this review.

## Verified

- Production reset SQL executed in temporary PostgreSQL/PGlite: preview is non-destructive; protected scopes, wrong administrator/database, missing linked tables, stale backups, bad confirmation and custom truncate triggers are rejected. Successful selected reset physically clears selected tables across all dates. Accounts, settings, users, unselected audit history and sequence continuity remain.
- Production archive selection and audit engine tested with 2018 and 2021 samples: complete linked journal lines, local edit and comparisons, undo/redo, invalid edit rollback, balanced adjustments, invalid adjustment rejection and JSON round-trip.
- Browser tests on desktop, touch tablet and phone: login images loaded; notifications/loading centered in visual viewport, including a synthetic zoom/scroll viewport. Sandbox lacks same-origin access; network attempts blocked by CSP; audit edits and saves make no parent Supabase RPC/write calls. Original mode is read-only. Edited working/original JSON downloads, CSV balance export and saved working-file upload/reload passed. Local payroll adjustment passed. Reset preview downloads backup, rejects mismatched file and requires further confirmation before enabling deletion.

## Boundaries

- Reset is selected operational cleanup, not a factory reset and not restricted by archive dates. It does not remove storage attachment objects or reset journal numbering. Linked modules may have to be selected together. Database migrations must already be installed; no live reset was executed to verify installation.
- Ordinary delete/void behavior is specific to each module and can retain history. Do not infer physical cleanup from a record disappearing on screen.
- Archive preparation copies data; it does not automatically purge old years. JSON archive/working files can be loaded into audit. Excel exports cannot.
- Audit is a separate local workspace. It supports editable loaded records, local journal adjustments, original/working comparison, undo/redo, payroll amount adjustments, account balance/ledger/income summaries, notes, local save, JSON/CSV downloads and print/PDF.
- Live posting, approvals/submission routing, scheduling execution, login/user administration, live document storage and full live payroll calculation are not replicated. Editing related raw records does not run the live module business workflow.
- Reports use journals actually present in the file, keep currencies separate and do not fabricate missing opening balances or exchange rates. A file from a partial period may not reproduce full live balances.
- Local browser storage can be cleared. Download working JSON to preserve work; download a full backup before reset. The selected reset backup is a different format and is not an audit input.

## Changes

Company logo replaces initials on desktop login/recovery and appears on the phone login. Shared visual-viewport positioning covers existing status messages, confirmation overlays, login dialogs, audit dialogs and full-screen loading/reconnect feedback without changing navigation or accounting calculations. Archive/reset instructions clarify supported JSON inputs, all-date deletion and attachment storage behavior. The matching deployed bundle segment is synchronized without rebuilding older bundles.

## Reproduce

Run `node validation/test-archive-engine14295.cjs`. Run `validation/test-reset-db14295.cjs` with `PGLITE_MODULE` set to an installed PGlite module, and `validation/test-audit-feedback14295.cjs` with `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` set to installed Playwright and Chromium. Browser fixtures abort nonlocal requests and stub Supabase; the SQL fixture creates an in-memory database.
