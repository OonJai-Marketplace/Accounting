# v143.35 — Visible Settings groups and device storage diagnosis

Settings now groups the actual category navigation into Company, Accounting,
People & Statutory, and System & Tools. All nine existing settings pages remain
available, including Organization & Reporting, Archive & Recovery, and Maintenance
& Audit. Forms, permissions and phone workspace navigation are retained. The old
implementation changed a hidden, retired settings bar; the live bar was untouched.

Device sync assessment retains its heading/icon and changes its content only when
the findings change. Opening Connection & sync from a finding shows that same
finding. Both downloaded-copy and durable-save failures appear with their details.
Check device storage retries failed cached operations, verifies a temporary encrypted
write/read, and reads the existing save queue without resetting data. A failed editor
save remains flagged until saved again; an unrelated successful operation does not
clear it. Opening IndexedDB has an 8-second timeout and can retry after failure;
operations allow 10 seconds instead of the previous 1.5-second read timeout.

Word export, document import and their heavy Word/Markdown/ZIP dependencies load
when needed. Their files remain in the offline preparation set. Shared application
modules remain bundled; this is not a complete route-by-route rewrite.

The owner confirmed on 2026-10-11 that both year-window SQL scripts installed
successfully, and verified offline password sign-in on their device. No further SQL
is required for the storage/settings fixes. The subsequent to-do request needs the SQL below. No financial rows or calculation rules are changed.

## To-do change requested during this release

Upcoming is now Recurring Transaction. Removed the template strip and Save as
template controls. Lists support Edit and Delete, including completed lists;
completed step text can be edited, reordered or removed.

Run `setup/INSTALL-EDITABLE-TODOS-v143.35.sql` in the existing project. It updates
the old completed-step protection rule and adds a private first-use installer.
After installation, opening the to-do list online adds Journal / Period Closing,
Payable Processing, Bank & Cash Reconciliation, and PIT & SSO Preparation once
per account. Existing matching lists are retained; edited/deleted starters do not
reappear. Existing saved templates and formerly archived lists remain accessible
for editing/deletion rather than being silently erased. Delete also removes that
list’s completion records. Accounting data and other users’ tasks are unaffected.
The new SQL has been prepared/tested, not installed in the production project.

## Validation

Ten current-SDK browser checks cover visible desktop/tablet Settings navigation,
shortcuts, starter checklist edit/delete, stable sync headings, quota recovery,
unreadable queues, unloaded optional tools, first-use offline import/export, and
encrypted editor drafts after reload. Database tests cover repeat installation,
owner isolation, completed-step edit/delete, no starter recreation, recurring
cycles and denied inactive/unauthenticated access. Release asset checks validate
177 offline files. Existing durable-save conflict/lost-reply checks pass.
Legacy editor tests use a pre-vault authentication stub and cannot exercise this
release’s authenticated cache; the current-SDK editor check replaces that gate.
