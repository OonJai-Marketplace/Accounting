# Payroll → Bookkeeping

`payroll-template1431.js` owns the existing configurable payroll posting template;
`payroll-journal1429.js` owns the existing payroll journal preparation and posting
integration. Their companion CSS is kept here in the original cascade position.

The handoff continues to use the existing finalized payroll run and configured
account mappings to prepare the shared Bookkeeping journal. Currency, tax,
salary-payable and deduction treatment is unchanged. Posting still goes through
the existing journal workflow, with its permissions and duplicate protection.

Keep these sources separate from payroll calculation in `../../payroll/engine/`
and journal entry validation in `../../bookkeeping/journal/`. Consult the manifest
for their actual runtime order; directory order is not execution order.
