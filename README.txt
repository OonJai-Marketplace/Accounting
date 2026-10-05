OON JAI ACCOUNTING v142.42 — INDEPENDENT PHONE WORKSPACE

Phones now open phone.html directly from the main link. The phone downloads only
its own small interface, sign-in library, and existing entry validator. It loads
only the signed-in user's access, assigned fund accounts, balances, and entries.
Home, Accounts, Post, Entries, and Totals support gathering data and submitting
the user's saved period for review. Settings and the full accounting interface
remain available on desktop and tablet through desktop.html.

Downloaded own records, unfinished drafts, and pending entries stay on the device.
Offline reopening needs the phone files and own records to finish downloading once.
Sync now retains the original save reference after an interrupted response.
Earlier own phone drafts and pending staff saves are recovered without importing
another user's workspace. Submission requires a connection and confirmed saves.

No new SQL is required. Desktop/tablet retain the original application body and
script order; their offline worker also includes the new desktop.html entry point.
See docs/PHONE-v142.42.txt and validation/test-phone-independent14242.cjs.

PREVIOUS RELEASE NOTES
OON JAI ACCOUNTING v142.38 — FULL WEBSITE

v142.38: keep phone navigation usable during missing-user lookups; ignore superseded navigation responses; time out workspace reads after 12 seconds; retain previously loaded records with a refresh-failure notice. No offline/sync features or connection indicators added. No database changes. Validated with 5 focused network checks and 12 populated phone regression checks using simulated responses.

v142.37: repair phone workspace loading, show all worklist months with pagination, preserve drafts per user, submit the selected period, and close report history when opening the editor. Stop repeated currency/account DOM updates that slowed phones. No database update required.
Validation: 12 populated phone checks and 11 existing UI regression checks passed with a simulated backend. Phone checks include 320/390/430 widths, restricted staff, error/retry, saving/editing, and report Back navigation. Local CPU-throttled timings are not real-device or live-backend guarantees.

v142.36: phone Home now has horizontal named sub-user tabs; the administrator’s own listed workspace opens; failed directory loads show a visible retry on the phone. No database update required.

v142.35 phone fixes: refresh missing sub-user directory before opening; formatting controls appear only when Format is tapped; Back returns from the document editor to the previous workspace. No database update is required for these phone fixes.

Upload the extracted contents to the Accounting repository, keeping folders intact.
Keep the Restaurant package in its own repository.

INSTALL ONCE
Run setup/INSTALL-OPENING-BALANCES-v142.34.sql in your existing Supabase SQL Editor.
It requires the existing SECURITY v142.28 and DATA TOOLS v142.32 updates.
The SQL adds opening-balance protection. It does not reset or alter existing journals.
Until installed, a fresh Chart of Accounts shows installation guidance instead of posting openings.

CHANGES
- General Ledger: equal side padding for account sections; remove the duplicate top accent.
- Successful ordinary main/personal entry saves run silently.
- Failed main saves appear under the red notification bell with Retry Save.
- Phone sub-user Entries shows a red marker and a failure panel with retry details.
- Pending requests are kept on the device and retries retain the original request ID.
  An expired login or rejected permission must be resolved before retry can succeed.
  Do not clear browser/site storage while you have unsent entries.
- Chart of Accounts: one search for name, code, currency and description; no separate
  currency filter. Add Account and Opening Balances occupy the toolbar.
- Opening Balances: administrator-only dated journal, balanced per currency, included
  in normal History and General Ledger. Finalization closes setup. Normal posting also
  closes it. Zero balances and archiving never reopen it.
- The supported explicit transaction reset reopens setup only when Journal, Periods,
  Staff and Submissions are all selected and successfully cleared with their dependencies.
  Old opening requests are rejected after a new setup generation.
- Audit workspace: aligned controls, responsive content and explicit empty-state messages
  for current copies and loaded external files. Audit edits stay local.
- Accounting / Restaurant switch: Workspace links in the switch menu accepts actual
  published URLs or repository paths. Defaults remain /Accounting/ and /Restaurant/.
  From local HTML, set complete published URLs. Separate hostnames may require sign-in
  again; no passwords or access tokens are passed in links.
- No in-app refresh button added; browser refresh behavior unchanged.

VALIDATION
11 targeted browser checks and 9 isolated PostgreSQL checks passed. Screenshots and
results are in validation. Tests used fixture records and made no live database writes.
Live repository destinations and the installed production SQL were not verified here.

PREVIOUS RELEASE NOTES
OON JAI ACCOUNTING v142.33 — COMPLETE WEBSITE FOR REVIEW

Extract the entire ZIP. Keep every folder together and open index.html.
This is the full website, including earlier fixes. Nothing was published.
The existing Supabase configuration is retained: ordinary website saves use
that configured database. Audit-workspace edits remain separate and local.

NEW IN THIS UPDATE
- Compact module-selection dropdowns for archive, audit copy and reset.
- Accounting Archive contains only archiving. Copy Current Data for Audit is
  with Open a Saved Audit / Archive File, with separate period/module choices.
- Equal module widths and spacing in Archive & Recovery; consistent orange
  top borders, thicker on outer modules and thinner on nested modules.
- Temporary access-check connection failures pause protected actions and retry,
  keeping sign-in and the current view. Confirmed revoked access still signs out.
- Activity inside the audit workspace now counts toward the inactivity timer.
- Keyboard editing across editable tables and ordinary editing forms, including
  journal Single/Double Entry, settings, dialogs, sub-user rows and local audit.
  Arrow keys move between cells/fields. Enter applies the current edit and moves
  forward; at the end of an ordinary form it activates Save/Apply. Shift+Enter
  inserts a newline in multiline text, or moves back in a single-line field.
  Open dropdowns keep their choice-navigation keys. Invalid inputs stay focused.
  Live commas and the fixed left-hand currency symbols remain in place.

Cell/draft edits are different from posting a journal. Posting, approval, reset
and recovery keep their explicit actions and confirmations. Rich document-body
editing retains its normal paragraph/cursor keys; this change targets data fields.

NO NEW SQL FOR THIS UPDATE
If v142.32 is already installed, do not run SQL again for v142.33.
If the v142.32 data-tools SQL has not been installed, the same original file is
included at setup/INSTALL-DATA-TOOLS-v142.32.sql; DATABASE-README.txt explains it.
All database setup files and image assets are unchanged from v142.32.

VERIFICATION
Targeted offline browser checks cover the new controls, borders, reconnecting,
revoked access and keyboard editing. Existing client saving/permissions checks
were also rerun. See validation/ui-results14233.json and validation/README.txt.
The previously completed v142.32 SQL results are retained as history; SQL did not
change in this update. No live database was changed during preparation/testing.
Your actual connection issue cannot be diagnosed conclusively from offline tests.

PREVIOUS RELEASE DETAILS (retained for reference)

OON JAI ACCOUNTING v142.32 — COMPLETE WEBSITE FOR REVIEW

Extract the entire ZIP. Keep every folder together and open index.html.
The existing Supabase configuration is retained. Normal website saves still use
that configured database. No hosted website, repository or live database was edited.

This complete website includes the earlier v142.31 corrections plus this batch:
- Switch Single/Double Entry while keeping accounts, amounts, dates and descriptions,
  including Money In. Complex multi-line journals retain their full draft in Double
  Entry and show a read-only preview in Single Entry, avoiding lost details.
- Orange top borders are thicker on outer modules and thinner inside them.
- Currency Manager is inset to match the Accounting Settings content.
- Sub-user administrator notices collapse faster and close when leaving Sub-users.
- Sequential To-do checkboxes save without an irreversible-confirmation popup.
- Choose periods and modules/sub-modules for archive copies; Everything is recommended.
- Choose only the modules to reset, with linked-record checks and a verified backup.
- Upload a JSON copy in Archive & Recovery, then open Audit Workspace inside Settings.
- Copy selected current data for audit without creating an archive or history entry.

AUDIT WORKSPACE
Loaded records open as an active working journal, payroll and employee records.
Only the loaded dataset is available. No missing data is fetched from Supabase.
Original records stay unchanged. Journal and record edits, balanced adjustments,
payroll net adjustments, notes, undo/redo, comparisons and local saves affect only
this separate working copy. Compare Original / Adjusted / Difference; export CSV,
print/PDF, or download original and adjusted JSON. A new file requires confirmation
before replacing the existing local workspace. Nothing is automatically merged.

The current-data copy uses a read-only SQL endpoint, with no archive/history write.
The audit page has no database client or database connection. It is isolated from
the main app, with a separate local working-file store. There is no bookkeeping
restore-to-main control. Audit reports calculate from contained journal lines only;
missing opening balances/rates are not invented. Payroll uses saved net values plus
local audit adjustments; it does not rerun the live statutory payroll engine.

SETUP
Your existing v142.29 SQL update stays installed. For the new selective-reset and
To-do behavior, run only setup/INSTALL-DATA-TOOLS-v142.32.sql in your test database.
The installer does not reset anything. DATABASE-README.txt has the four simple steps.
You can review the audit page with a saved JSON file without applying that SQL.

TESTING
See validation/ui-results14232.json and validation/data-tools-results14232.json.
72 browser checks and 191 isolated client/SQL checks pass.
Tests use synthetic data and an isolated PostgreSQL reconstruction. No live
Supabase writes were made. Actual database policies/triggers, Storage permissions,
network concurrency and real printer output still require your test-project check.

Current-data audit copies include stored database records. External Storage files
are not automatically fetched in that path; an uploaded complete archive JSON
retains any file attachments that were included when it was prepared.
