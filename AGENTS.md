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

Sources are packed into desktop14245-*.js. Preserve later deployed extensions
when updating a bundle; do not run the older full builder blindly. Keep changed
source modules and their deployed bundle segments synchronized.

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
containers. NEVER apply a universal button/[role=button] size or appearance rule.
Top tabs, sidebar navigation, profile/name cards, sub-user cards, dashboard
summaries, calendar cells, and document tabs retain their component designs.
Attendance squares are 22px within 26px columns; center the rendered day number,
not just its table cell. Phone navigation keeps its original icon/label layout.
