# Payroll

- `engine/`: existing salary, PIT and SSO calculations (`calcPay82`, `pit82`).
- `workspace/`: draft runs, editing, finalization and attendance presentation.
- `reports/`: payroll, attendance and voucher rendering.

The earlier `payroll-reports-v82.js` also contained shared persistence, HR forms,
operational reports and financing tools. Those now have their own source owners;
their exact ordered contents still build the same compatibility file.

The shared `Work82` store is at `../shared/state/workforce-store-v82.js`, and its
`loadWork82`/`saveWork82` interfaces are in `../shared/data/workforce-storage-v82.js`.
Roster, approved leave, attendance and payroll integration are under
`../bridges/hr-payroll/`. Journal preparation is under
`../bridges/payroll-bookkeeping/`.

The mixed v97 presentation wrapper is also separated: its recurring reminders,
search, journal history and lazy loading belong to those features. Its closure,
registration order and initialization timing are unchanged. Financial formulas,
currency treatment, saved runs and report designs have not been altered.
