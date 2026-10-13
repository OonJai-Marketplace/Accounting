# HR → Payroll

`attendance-v96/` owns the existing attendance legend, day calculations,
approved-leave lookup and leave-usage integration. `roster-v97.js` synchronizes
the draft roster. `save-attendance14306.js` is the HR attendance save handoff.

These sections read the existing `Work82.employees`, `Work82.leaves`, `Work82.run`
and finalized-run snapshots. `runResults82` and `payroll95` remain the public
contracts. Salary calculations and payroll tables live in `../../payroll/`;
employee directory presentation lives in `../../hr/`.

The v96 sections share their original closure and lexical variables. They are
assembled in manifest order into the original asset and desktop bundle.
Contract dates, approved leave, attendance marks, currency groups, deduction
rules and snapshot behavior are unchanged.
