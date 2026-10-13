# Human Resources

- `employees/`: employee directory, employment history and employee workspace.
- `contracts/`: contract editing, renewal/outcome and document preparation.
- `documents/`: existing employee and contract attachment access.
- `leave/`: leave request rendering and approval data.
- `calendar/`: pure calendar model, saved events, projections and news review.

`hrWorkspace14306` and `hrCalendar14306` keep their existing public interfaces.
Both still use the shared `Work82` model and the existing version-protected save
functions. Attendance persistence and leave-to-payroll calculations are traced
through `../bridges/hr-payroll/`. Finalized payroll snapshots are unchanged.

The workspace sections retain one closure. Do not execute its attachment,
contract or leave sections separately from the manifest build.
