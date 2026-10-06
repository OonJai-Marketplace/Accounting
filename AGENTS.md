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
