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
