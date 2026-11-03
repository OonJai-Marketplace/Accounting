# Approved application foundation

The phone layout at v142.53 is approved and frozen. Preserve its navigation,
spacing, colors, controls, and responsive behavior unless the user explicitly
requests a phone design change. Report printing and necessary correctness fixes
are separate scopes; do not redesign phone screens while working on them.

Print foundation: A4 portrait, compact readable 10pt English / 10.5pt Lao,
settings-owned header/footer images, small table padding, repeated headings,
original IDs, and configured signature lines. Salary vouchers alone support Lao.
Attendance cells contain color-only indicators using the application's legend.
Sub-user reports have account/liquidation summaries, no journal summary or checks.
Payroll has no separate currency-summary or paid-leave-payment section.
Do not change calculation rules or historic financial data to fit a print design.

Canonical extracted sources are under src/ and mapped by src/manifest.json.
Edit those modules, then run python tools/build-modules.py and its --check mode.
Do not edit generated desktop bundles or compatibility files directly. The old
full builder is retired because its HTML snapshot discards later extensions.
Phase 0 preserves runtime bytes; run python validation/test-phase0-structure.py.
Keep changed source modules and their generated assets committed together.

Numeric editing: clicking inside an existing amount must preserve the value and
place the caret. Never select all or clear amounts on focus. Keep calculations
and blur formatting intact.

Journal print: show a shared general description once per entry, retain distinct
line memos, and use the general description as the ledger fallback for blank
line memos. IDs come from the posting sequence, never visible row counts.
Opening-balance reopening and sequence reset are explicit initial-setup actions
only; never trigger either on deletion, voiding, or an empty filtered screen.

Action control rule: Save, Open, Templates, Print, Add, Edit, Delete and similar
small action buttons use the 32px Template / Post Entry height in
styles/controls14305.css. Scope sizing to explicit action classes or action
containers. Exception approved 2026-10-10: Active Journal Edit and Void stay
vertically stacked (Edit above Void), 24px each with a 3px gap, including the
shared sub-user journal. This is the only exception to the small-action height.
Post Transaction table cells use borderless, transparent editing fields; do not
add nested textbox borders or backgrounds inside the cell boundaries.
NEVER apply a universal button/[role=button] size or appearance rule.
Top tabs, sidebar navigation, profile/name cards, sub-user cards, dashboard
summaries, calendar cells, and document tabs retain their component designs.
Attendance squares stay compact at 22px; distribute date columns across the module width (scroll only when too narrow). Center the rendered day number,
not just its table cell. Phone navigation keeps its original icon/label layout.

Recovery comparison baseline (user instruction, 2026-10-10): v143.16 commit
14d724e15c057bbd4e63324754f89959ea48a784, before the v143.17 action colors.
Use it to compare stability and layout while preserving later approved features.
Desktop remains native 100% with existing responsive styles; do not restore
automatic whole-document zoom or rewrite all stylesheet media queries.

Publishing workflow (user instruction, 2026-10-10): after completing approved edits,
commit and push them, then verify the deployment. Do not stop at local changes or
ask again unless the user explicitly puts publication on hold.

Date presentation: visible full dates and date-picker labels use formatAppDate
and the saved System dateFormat. Keep ISO values for storage, sorting, native
input values, data exports and identifiers. Calendar month/day tiles and
month-only period labels remain calendar components, not full date strings.

Journal ID exception (user clarification, 2026-10-20): only the highest issued
ID for the year and format may be reused after permanent deletion of its voided
entry and audit history. Older deleted IDs remain visible gaps forever; never
fill them or choose the lowest released number. Keeping the audit blocks reuse.

Audit retention (user clarification, 2026-10-20): older voided journal audit
records must remain to explain missing IDs. Only green routine records may be
deleted when the referenced journal entry still exists. Orange/red records are
protected. The sole exception is the latest issued voided journal ID: explicit
single-record deletion may remove its linked audit history to release that ID.
Enforce this on the database, including bulk deletes; never use cache decisions.

2026-10-20 correction: released trailing IDs do not cover older IDs. Reuse the
first released ID above every remaining journal/audit record; never fill gaps
below a retained higher journal. Latest journal audit may be explicitly deleted,
including important events; deleting audit for an active journal keeps the entry.
No audit tier colors or Details column. Rows open details. Notification opening
never marks read; only successful item navigation does. Template numbers are
permanent, separate from names, and never renumbered or reused after deletion.

Post Entry 2026-10-20: mixed-month receipt dates warn but do not block posting.
The main date determines the accounting month; other-month line dates are saved
as receipt-date text in their memos and their posting date uses the main date.
Keep existing same-month line dates. Amount inputs accept immediate H/K/M/T
suffix expansion after a number, case-insensitive; no suffix in names or memos.
Selected cells use a single 1px blue outline, without a second inset border.

Reconciliation 2026-10-22: Bank statement is an explicit opt-in receipt-date mode;
non-bank/cash reconciliation keeps posting dates. Include receipts from closed
books without reopening, redating or reposting journals. Keep all four statement
amounts together above the comparison, with expandable details below. Closing
is entered independently; never silently overwrite it from the other amounts.
Remove instructional paragraphs and redundant notices from this report window.

Opening Balance 2026-10-22: Keep the Journal option visible and available after
earlier openings and without requiring the prior year to be closed. Confirm each
use. A 1 January entry is an initial opening; any later recording date is an
Opening balance adjustment that affects its actual period, never January's
opening retrospectively. Preserve period/year locks, permissions, balanced
posting, immutable retries, and the user's entered date.

Offline clarification 2026-10-24: ID, void/delete and audit exceptions also work
on the local browser. Save offline intent durably, show pending confirmation and
provisional ID availability, and sync edits/voids and audit deletion before new
posting. Recheck permissions, original UUID/content and latest-ID eligibility on
the database. Conflicts remain pending; cached intent never overrides another
device's changes. Online exception reads remain fresh.

Phone scope 2026-10-31: phones use the independent own-account sub-user client
for every role. Administrators additionally manage authorizations in Settings.
Do not preload the user directory or other users' journals on phones; the user
directory is loaded only for Settings. Full accounting and cross-user workspace
review remain on laptop/tablet. Preserve the embedded Accounting scanner.

Printing scope 2026-10-31: report printing/export and document editing belong to
tablets/iPads and desktops only. No print/report-export controls on phones, for
any role. Keep phone receipt scanning and saving scanned PDFs available.

Scanner scope 2026-10-31: scanner use is company-only, connected to Accounting,
with private document previews and journal links. The cancelled separate native
app must be removed, including its source package, build dependencies, generated
packages and saved development patches; stopping its builds alone is insufficient.
Do not recreate an external scanner app. Retain the existing phone/print restrictions.

Login scope 2026-10-31: the independent phone client must keep the approved web
login: the 430px ivory card, emerald backdrop, company logo, matching controls,
and the shared full-screen six orbiting/pulsing marbles during session restore
and sign-in. Do not substitute a simplified phone login or a different spinner.

Scanner interaction 2026-10-31: Scan opens the camera directly. Detect the paper's
four corners live and automatically straighten the captured photo before review.
Keep retake, optional manual crop, delete, next receipt, next entry and finish in
one focused interface with phone-sized icon controls. Put destination, batch,
numbering and other secondary options behind settings. Retain the previous
photo until its replacement is durably stored; preserve pending scan recovery.

Phone refinements 2026-10-31: remember phone sign-in across app closure until
explicit sign-out or revoked access. Preserve encrypted drafts and account
isolation; do not apply remembered phone unlocking to desktop tabs. Show the
captured photo immediately while correction finishes. Retake replaces the same
scan only after its new original is protected. Bottom navigation has exactly
five items: Home, Accounts, Post, Entries, Scan. History is a view inside Entries.

Scanner detection 2026-10-31: use the local trained document-corner detector in
a dedicated worker; keep model assets pinned and on the same origin. Never send
camera frames to a third-party detection service. Keep live tracking stable and
restart it after foregrounding. Detect the captured frame afresh; uncertain or
invalid predictions preserve the whole original. Verify photographed documents
and failure paths, and do not claim perfect accuracy or physical-phone testing
from synthetic or desktop-browser fixtures.

Native scanner clarification 2026-10-31: the user now authorizes an Android APK
and iPhone integration of the same connected Accounting app. Use Google's ML Kit
on Android and public VisionKit APIs on iPhone. Do not recreate an independent
external scanner. Normal Android scanning leaves the SDK page limit unset; do
not impose a 24-page cap. Keep Google's native capture/cleanup and embed returned
JPEGs unchanged. Naming and grouping remain Accounting controls around the native
session. Preserve account isolation, encrypted drafts, atomic retakes and recovery.
A successful build does not establish physical-phone speed or Google-equivalent
accuracy. Keep test builds distinguished from signed production releases.

Scanner workflow 2026-10-31 v143.215: Scan first asks for document type, starting
ID, PDF name and destination. Remember the next ID and separate Drive/phone/SD
folders. Verify journal IDs against permitted database entries before capture
and saving; save and verify the single bookmarked PDF before registering links.
Native return screens use explicit text buttons: Add receipts, Next ID, Skip ID,
Save PDF. Do not repeat crop/delete/enhancement controls already in native capture.
Keep destination, names, document type and sequence editable without losing pages.

Native updates 2026-10-31: the user rejects separate app names/installations for
each release. Keep the v143.215 application ID and retained signing certificate
for all later Android updates. Restore the displayed name Oon Jai Accounting.
Provide Check for updates and the current APK link inside the account menu.
Never clear drafts, reset login or change the application ID to ship an update.

Destination correction 2026-10-31: choosing Drive, phone or SD immediately opens
that provider's folder browser at its remembered path. No intermediate Choose
folder/New folder/Google account control panel. Create folders inside the folder
browser; use the native system folder picker for phone and SD-card locations.

Scanner feedback 2026-10-31 v143.217: show delayed action feedback after 300 ms,
remove setup Document month but keep PDF name, and suggest actual existing IDs
while typing and after the last scanned entry. Main journal IDs are OJM260001,
not the previous scanner-generated OJM26-0001. Preserve RLS and journal numbering.
App updates belong in Settings; automatically download and verify the existing
APK update, then request Android's install confirmation. Keep package, signer,
login and drafts. Never silently reload or replace active scanner work.

Scanner receipts 2026-11-01: existing/closed journal IDs remain selectable for supporting documents. If receipts already exist, offer Add supporting documents, Replace existing receipts, or Cancel. Confirm replacement against the current receipt set; save/verify first, retain prior versions, and never change journal amounts or reopen closed periods. All destination shortcuts use one direct provider folder browser with visible delayed loading feedback.

Scanner picker 2026-11-01 v143.219: use an opaque in-app ID suggestion list with manual entry, remove the duplicate scanner header Settings button, and keep Destination. Skip ID opens only later ID choices/manual entry, preserving the current PDF name, type, destination and pages; never reopen initial batch setup for Skip ID.

Scanner cleanup 2026-11-01 v143.220: put Delete directly on the existing View batch screen; the user can already find their scans. Confirm deletion of the selected local device copy or unfinished draft, warning about unsaved changes and unfinished links. Never delete saved PDFs or Accounting attachments as part of device-draft cleanup. Preserve other batches and account isolation.

Scanner dropdown 2026-11-01 v143.221: ID suggestions open only through the dropdown button. Text-field focus, taps and typing close the list; initial setup, Edit ID and Skip ID start closed. Background results must not reopen it. Keep manual editing and keyboard activation of the dropdown button.

Scanner ID cache 2026-11-01 v143.221: cache only recent verified ID labels in the account-scoped encrypted device vault for fast opening/skipping; typing must not trigger repeated network verification. Cache availability is provisional across phones. Freshly validate IDs and Add/Replace receipt choices before new capture and before saving to Drive; retain final server-side target/receipt-set validation and native recovery.

Scanner save/sequence 2026-11-01 v143.223: Save PDF checks all IDs and continues automatically if no new conflicts exist. Reuse a pre-capture Add/Replace approval only while its receipt set is unchanged; changed or unapproved conflicts open saved/new image comparison with page counts, navigation, enlargement, Add/Replace, Change ID and Cancel. Cancel preserves the whole batch. Editing an earlier numbered ID shifts later IDs of the same type/prefix by the same amount, preserving Next/Skip gaps; keep page/group UUIDs and other sequences intact, reject collisions, clear approvals for changed IDs, and verify them when saving. Fetch saved previews through the authorized view endpoint and close them on account lock. Final server checks remain authoritative.

Main-journal receipts 2026-11-01 v143.224: scope this update to desktop/tablet/iPad. Add Receipts to the existing journal/History row menu and the source details opened by General Ledger Entry ID links. Preserve ledger navigation, financial data, numbering and closed-period restrictions. Show only linked entry groups in a vertically scrolling private-image dialog, load previews near the viewport, keep captions outside the images, and offer full PDF opening separately. Preserve original sub-user receipt references, source-detail tables, and the current phone scanner/viewer. Clear previews on account lock/change.

Journal corrections 2026-11-01 v143.225: desktop/tablet Receipts belongs exclusively in the double-click row menu beside Edit/Void (including the personal-journal layout), or inside journal details opened from ledger links; never append receipt buttons in Entry ID cells. Keep the phone viewer unchanged. Remove the General description prefix from entry headers. Display shared entry wording once and retain distinct line memos, links and stored data; blank line memos must not repeat the shared header.

Scheduled journals 2026-11-01 v143.225: due schedules stay in Upcoming and notify the administrator. Never post automatically, including old clients and cron jobs. Require explicit Approve & Post for each occurrence, then validate and allocate its entry ID atomically. Preserve posted history, period locks, dated occurrences, retry protection and numbering.

Receipt placement reversal 2026-11-01 v143.226: the user replaces the menu-only choice with a small link icon immediately to the right of the Entry ID on desktop/tablet journal, History and ledger rows. The link icon is visible only for entries with supporting documents. Entries without documents have no icon. Delayed checks and connection errors use a small table status notice rather than an icon beside the ID. Clicking opens the same private entry-group viewer. Batch visible status checks, preserve ledger ID navigation and phone UI, and do not treat every document-free journal as invalid.

Journal display correction 2026-11-01 v143.227: receipt icons must not move Edit/Void out of the existing double-click menu, including after redraws. Preserve each saved line memo/reference in its own cell even when identical to the header or another line; this supersedes v143.225 shared-line suppression. Keep the General description prefix removed, the receipt-only icon beside Entry ID, and stored journal data unchanged.

Company Drive 2026-11-01 v143.228: Settings is named Google Drive and Sheets. Administrators save the intended Google email and receipt folder before authorization, then explicitly verify and activate one company destination for every phone user. Keep active and pending authorization separate; ordinary users never receive company tokens or browse unrelated Drive folders. Server-side uploads enforce the activated folder and per-user scan ownership. Preserve journal receipt identity and private previews across account changes. Saved Accounting links use company-owned files in oonjaimarketplace@gmail.com.

Receipt setup recovery 2026-11-01 v143.229: load the receipt destination from the server when Settings opens, independently of cached AI inbox settings. Save only the intended receipt email/folder while preserving newer Sheets settings and the active connection. Activation requires the latest saved account/folder to match the verified destination. Preserve typed inputs on errors and show save, authorization and activation results beside the controls, with an explicit Google authorization link if the popup does not open.

Storage settings 2026-11-01 v143.230: save separate receipt and approved-data archive folders together. Receipt activation remains explicit; show the actual current archive and never imply a saved archive folder is an active yearly export. Retire the temporary browser audit workspace and its launch paths. Preserve portable backups, existing local-copy recovery, the credential vault, current archive saves and all deletion verification until a verified migration replaces them. See docs/SETTINGS-CLEANUP-v143.230.md.

Yearly storage 2026-11-01 v143.231: build separate Accounting YYYY workbooks directly in the configured Accounting Data parent, with no template dependency or yearly accounting subfolder. Create YYYY receipt folders under the receipt/documentation parent. Prepare upcoming storage on December 30 in Asia/Vientiane, allow manual preparation and notify administrators. Route by accounting/document date; future-year data waits until January 1, and late December records/receipts retain their December year. Preserve verified closed history, receipt versions, cleanup gates, separate AI inbox credentials and active/pending destination distinctions.

Cleanup and hardening 2026-11-01 v143.233: the old embedded phone presentation and nine exclusively related assets are retired. Keep phone-accounting.html as a parameter-preserving redirect to the independent phone client. Preserve the PhoneApp132 helpers still used by desktop and the legacy encrypted-draft importer; do not reintroduce the iframe, its keyboard observer or background refresh loop. New postgres-owned public database tables, sequences and functions require explicit grants to intended API roles. Add RLS/ownership checks before granting table access; never restore blanket anonymous/authenticated defaults to fix a new feature. Existing users and endpoint grants are unchanged.

Payroll policy 2026-11-02 v143.234: use the existing contract start dates (earliest non-cancelled contract, or employee contract/entitlement date when no contract record exists) for Not yet employed days. Never treat later renewals as first employment. First-month pay uses eligible scheduled paid days divided by the configured fixed salary-day basis, capped at monthly salary; preserve source attendance and finalized history. The configured basis is 22 days. Circular confirmed 2026-11-02: progressive monthly late incidents use 5,000 / 7,000 / 10,000 LAK for occurrences 1–5 / 6–10 / 11+. Only non-exempt arrivals more than five minutes late count toward penalties; arrivals up to and including five minutes incur neither penalty nor time deduction. Time deductions use only minutes beyond the five-minute grace. This supersedes the earlier provisional amounts and zero penalty threshold. Administrators can change penalty amounts and the qualifying threshold in Payroll Settings independently of automatic time-deduction grace. Do not override calculated totals to match a PDF.

Payroll/calendar correction 2026-11-02 v143.235: reconcile saved payroll into untouched local drafts after records load; preserve real unsaved inputs and finalized snapshots. Calendar non-work days remain muted when source attendance contains only a zero-minute placeholder. Explicit exceptions and recorded overtime retain their status. Day headers and draft calculations use the same dated company calendar. Work Schedule must load shared settings before editing and show the schedule applying to the selected effective date. Enhance payroll date controls before paint and never focus their hidden native inputs on redraw.

Release cache rule 2026-11-02 v143.236: the offline updater reuses matching versioned asset URLs from older caches. Whenever cached file bytes change, update its versioned URLs in the offline workers and entrypoints. Check changed cache keys before publishing; do not assume a shell-version bump refreshes every asset.

Attendance detail correction 2026-11-02 v143.237: approved leave-only days open the linked HR leave record and saved reason. Preserve attendance editing for overtime, actual late minutes and manual overrides. Show recorded holiday/excused labels and notes; distinguish their default colors without replacing configured colors or finalized snapshots. Leave Records has one 32px row menu with no overflow ellipsis. Do not alter payroll inputs or formulas to repair display issues.

HR workflow 2026-11-02 v143.238: leave belongs in HR Leave and holidays in HR Calendar. Remove H, L and leave-type codes from new attendance status choices while preserving imported marks and finalized history. Add Holiday preselects company holiday and paid time off. Holiday indicators and date headers are amber, regular days off gray; future holidays stay identifiable but excluded from elapsed counts. Ordinary zero-minute defaults cannot hide approved leave or suppress its day allocation; explicit attendance exceptions retain precedence. Reconcile compatible partial drafts with saved payroll and provide an explicit guarded reload for conflicting local edits.

Performance policy 2026-11-02 v143.239: AI inbox discovery is manual; navigation,
focus, reconnect and idle startup must not fetch inboxes. Keep device snapshots
and explicit Refresh drafts / Sync now. Word of Hope copies run at 06:00 Laos,
and ordinary messages save immediately. History revisions stay durable locally
in the database until month closure or explicit Save pending changes starts a
verified copy; only unfinished requested copies get the daily retry. Preserve
year preparation, immutable history, formula readback and cleanup guards. Account
averages load on demand; retain a fresh check before online posting. No timer may
rewrite the rate Sheet. Retention applies only to old successful technical cron
logs, never accounting records or audit history.

Cashbooks 2026-11-02 v143.240: administrators choose cashbook or double-entry mode per sub-user; double-entry has simplified/full forms. Existing users retain their modes unless explicitly changed. Cashbooks display each saved receipt ID independently, in source line order, with one view per assigned fund; transfers share the same underlying transaction across both views. Preserve IDs, reference text, amounts, approval and posting rules. Do not regroup cashbook edits/voids by date. Signed reconciliation inputs must retain empty and minus-only editing states. Receipt metadata checks are silent, cached per session (including absence/errors), and invalidated only by explicit refresh, relevant saved-receipt events, or identity changes. No periodic network polling or focus invalidation. Post Entry link controls are for foreign-currency rate sources; keep saved links and receipt icons intact.

Voucher layout 2026-11-02 v143.241: header/footer placement uses direct native selectors in Page Setup and Header and Footer Images. Keep every-page, first-header/last-footer and none options synchronized with visibility and durable document settings. Salary vouchers use compact spacing, readable 10pt English / 10.5pt Lao type, complete employee notes and usable signatures. Fit normal and extended-note vouchers on A4 with proportional letterhead; exceptional content must paginate without clipping or changing source payroll. Preserve customized saved documents.

Entry choice correction 2026-11-03 v143.243: every sub-user may choose Single Entry (Cashbook) or Double Entry in Entry options, on desktop/tablet and phone. This supersedes the administrator-restricted cashbook/simplified/full choices in v143.240. Settings provide a default only. Preserve per-user preferences, draft amounts/memos and all posting/approval permissions. Tablet cells edit directly on one tap; amount focus preserves value and caret, and Enter commits in place. Reserve scroll range for the software keyboard and keep account choices usable. Separate personal Ledger/History modules with padding while tables remain flush inside their own card.

Tablet refresh 2026-11-03 v143.244: pull down from the top of the nested tablet workspace to refresh saved records and check website updates. Show pull/release/progress feedback. Preserve unfinished drafts; never auto-reload or install an update from a gesture. Exclude input editing, nested vertical scrollers, dialogs, account pickers, horizontal movement, pinch and cancelled touches. Suppress duplicate refreshes and stale completion notices after account changes.

Receipts 2026-11-03 v143.245: general payment vouchers and receipts share the seven-line A4 portrait design, changing the title and payer/payee wording; preserve salary voucher breakdowns. Administrators may issue typed receipts on phones as an explicit exception to the earlier document/export restriction. Keep preview, automatic totals, retained company PDFs before print/download/share, optional stamps omitted, and blank batches available. Receipt and general voucher IDs share OJMYY-LMMNN, count 01–99 then advance A–Z, continuous across months with month in the ID, new-year restart, collision checks, immutable retries and no reuse of issued IDs. Preserve historical IDs.

Salary vouchers 2026-11-03 v143.246: employee name directly below the title, compact text metadata instead of a table, retain the compact attendance strip and omit zero-value optional salary/attendance rows. Excused late (EX) never represents paid leave/holiday. Include scheduled paid holidays once, including legacy H rows, with their included-salary value. Preserve original attendance evidence, saved finalized amounts, salary calculations, signatures and letterhead.

Journal stability 2026-11-03 v143.247: tablet/iPad main and personal journal receipt-presence checks stay silent. Apply link-button attributes only when changed, keep known links stable during rechecks, and remove legacy metadata notices. Preserve receipt opening, account-isolation clears, journal contents, Edit/Void and ledger navigation.

Salary voucher spacing 2026-11-03 v143.248: user rejects the overly compressed rows and sections. Keep the employee-first structure and zero-row omission, but restore comfortable cell padding, paragraph line height, section gaps and signature spacing. Scope the change to salary voucher presentation.

Voucher refinements 2026-11-03 v143.249: salary header has three two-column rows: code/full name with position, salary month with voucher number, and payment date with currency. Keep improved salary-calculation spacing; attendance uses Code, wider dates and centered date glyphs even in the editor. Add two blank lines of signing space and preserve it during print regeneration. Payment voucher/receipt share wide payer/contact fields, smaller ID/date fields, seven rows, automatic currency-aware amount in words with LAK/USD/THB choices, Cash/Bank then transaction reference, and larger signatures. Payroll shortcut opens the voucher register. Preserve accounting values, shared numbering, retained PDFs, blank batches and silent journal metadata. Long notes paginate without clipping or shrinking the approved readable layout.

2026-11-03 v143.250: AI Journal follows PDF source order and shows provisional
next journal IDs separately from source references. Preserve posted records and
prepared edits. Edit keeps its label and becomes gray while queued. General
descriptions stop before Debit; debit, credit and actions retain their columns.
Processing stays top-right above dialogs without inline button spinners; pause
launcher feedback while awaiting a dialog and finish saves at completion.
Payment vouchers/receipts default to blank date, amount words and unchecked
currency/payment choices. Contact number is one line; use Reference / Unit,
Reference, consistent square checks, no amount-words suffix, and live commas.
Keep Details, Download and Share beside Save Voucher on the right. Create blank
batches inside Details, retain one shared ID and PDF per page, reuse IDs on
reprints, and remove the separate handwritten/blank launchers. Salary voucher
reference is PAY-YYMM-CODE (e.g. PAY-2610-R04); employee codes and posted journal
IDs stay unchanged. Omit internal attendance calculation commentary and label
value/deduction currency in the headings.

Verification follow-up 2026-11-03 v143.251: phone receipt entry shows the provisional available ID before Preview, refreshes it when the date changes, and never allocates on preview. Download and Share perform their named actions after company PDF retention. Use native/browser sharing when available; preserve the browser-required second-tap and unsupported-browser download fallback. Keep blank defaults, all v143.250 requirements, shared numbering, account guards and existing saved PDFs.
After confirmed phone issuance, clear only the matching completed draft; preserve newer unfinished details during interrupted-save recovery. Keep the retained record accessible for PDF recovery.

Workspace consistency 2026-11-03 v143.252: use one delayed foreground Processing indicator; pause launcher feedback while a dialog awaits input and keep actual dialog saves above the dialog. No inline button or tab spinners. User-tab layout must be idempotent so pointer clicks are not cancelled by reparenting; render the selected account even when the legacy tab strip was removed. Bind desktop panels, personal journals and prepared views to the selected owner. Generated documents retain their incoming titles. Remove the Payroll voucher shortcut, preserving Transactions vouchers. Salary metadata has a blank payment date and a spacer before calculation; numeric attendance headings and cells align right and editor defaults must respect inline alignment. Bind payroll form reads to their run and employee identities; conflicting advance amounts or explicit recovery notes block new vouchers without changing payroll data. Header/footer Settings images use separate company presentation records with verified readback, safe migration of existing device images, and persistent removals; logo previews follow the company record.

Salary advance correction 2026-11-03 v143.253: an administrator may increase an employee advance after additional money is released. Current payroll input/results determine the deduction and final payment; a historical free-text note must never cap, reset or block that amount. Keep run/employee ownership and calculated-result consistency checks. For new draft vouchers, refresh only the generated recovery sentence using the current calculated advance; preserve stored notes, finalized snapshots and unrelated prose. Never reload old database payroll over the administrator's newer device draft to solve a note mismatch.

Template journal generation 2026-11-03 v143.258: this supersedes the first
transaction-questionnaire implementation. Generate beside Add opens a separate
editable journal window. Reuse saved template structures; the user enters the
business rows, description and header exchange rates. Generate writes actual
missing debit/credit amounts and mapping/valuation/FX rows in that window, not
only a calculation summary. Recalculate without duplicate rows, preserve manual
business amounts and descriptions, and identify inconsistencies. Support each
configured foreign currency with valid chart counterparts. Missing accounts,
ambiguous tax allocation and unsupported historical rates must not become FX
plugs. Keep a separate recoverable draft per owner/template. Use in Post Entry
copies the completed draft, with normal review and explicit posting. Never
allocate journal IDs or write financial records while generating.

Sub-user reporting correction 2026-11-03 v143.260: liquidation/account reports
print as cashbooks for every sub-user, regardless of Cashbook or Double Entry
input preference. Use one saved transaction row per fund view with Money In and
Money Out; preserve source receipt IDs, line order, descriptions and references.
Separate fund accounts/currencies, reflect internal transfers in both known fund
views, and keep account/category summaries, reconciliation and signatures below.
Apply the same format in Submitted review, user workspaces and report history.
Do not change entry modes, saved financial records or company journal/ledger prints.

Report journaling 2026-11-03 v143.260: after final approval, preview three choices:
Consolidated category totals; Detailed with each main fund totaled once; As entered
individual source transactions. Only Use in Journal transfers the previewed rows,
explicitly selecting the main Journal even after AI Journal. Post Entry remains
separate. Cancel preserves drafts. The first two formats share an editable date
within the report month; retain original receipt dates/references in source links.
Keep funds, currencies, FX rates and debit/credit sides separate. Preserve exact
approved sources, permissions, immutable retries and period locks on the server.

Long journals 2026-11-03 v143.261: keep the real Generate/Delete/Add/Reset/Post
Entry actions visible at the bottom during desktop/tablet scrolling. Batch bulk
row preparation; memo-only typing must not recalculate unchanged amounts. Keep
amount validation, draft recovery, undo and explicit posting. Report line memos
contain item numbers and user descriptions, without generated dates, names,
receipt IDs or document references. Retain source provenance separately. Preserve
source links in saved drafts; recover older missing links from approved snapshots.
Allow supported manual regrouping that exactly matches approved accounts, amounts,
currencies, rates and dates. Do not reset or return an approved report just to
change its posting layout. Preserve manually edited descriptions.

Tablet correction 2026-11-03 v143.262: preserve the approved desktop workspace
fitted independently to iPad portrait and landscape, with pinch zoom available.
Keyboard height changes and pinch zoom must not refit the document. Account
selection on iPad/tablet is dropdown-only, with no software keyboard or search
textbox, for every sub-user workspace in Single Entry and Double Entry and the
main journal. Keep the account field's text size when making it read-only.
Do not move a visible field to reserve space for a list; the list chooses the
available space above or below. Resize the named visible column, excluding hidden
Date/Action cells, and refresh the mapping when date mode changes. Preserve
financial data and unrelated phone/desktop layouts. Synthetic viewport checks
are not physical iPad Safari verification.

Report recovery 2026-11-03 v143.263: the user explicitly requested returning the
unposted Ryan October petty-cash report to Submitted before approval. This
supersedes the v143.261 instruction against returning this report. Revoke only
that unposted approval, retain its snapshot and review history in the audit, and
preserve every source line and journal ID. Generated memos use original source
item numbers (including a shared item split across accounts), never PDF filenames.
Legacy memo recognition must handle separators inside source memos/references.
Do not claim an existing device draft was rewritten or posted without evidence.

Tablet follow-up 2026-11-03 v143.264: user reports v143.262 still opens the
keyboard and moves Memo when dragging Account on a real iPad. Do not describe
simulated tablet tests as physical-device verification. Tablet account triggers
must be native non-text controls, including all sub-user entry modes. Use the
owning header for resize targeting, capture the pointer, suppress header text
selection, and provide a usable touch target. On tablet single-header tables,
apply widths directly to visible native headers without a compressed COLGROUP;
legacy column defaults must not overwrite manual widths. Preserve approved
orientation fitting, pinch zoom, desktop/phone entry behavior and financial data.

Report dates and user settings 2026-11-03 v143.265: Detailed — fund total once
keeps each original detail date and enables Multiple dates. The combined fund
rows use an editable report-month date, defaulting to month-end. This supersedes
v143.260's shared-date rule for this format only. Preserve source dates when the
header date changes or a draft is restored. Server matching must still enforce
exact approved accounts, amounts, source IDs, rates, permission and period locks.
Picker Done accepts selections into the unsaved parent form, without a discard
prompt. Explicit Cancel/discard restores the prior account/module selections;
only Save User persists them. Keep desktop/tablet Current Users actions in a
2×2 grid with role/status beside user details. Keep user-edit and account-picker
windows compact, aligned and scrollable; preserve phone styling.

Journal pagination 2026-11-03 v143.266: apply newest-posted-first screen order
before the 100-line page is selected. A monthly report with earlier receipt
dates must remain visible with the newest posting. Preserve original detail
dates, line order, amounts, IDs, source links, pending priority and print ordering.
