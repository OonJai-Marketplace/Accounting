# v143.26 — Data Check and Excel report comparison

Approved desktop adjustments:

- HR employee actions show one three-dot menu. The table cell no longer adds a second overflow ellipsis. Edit, Documents, History and Archive/Restore remain available.
- The Single/Double Entry button is in the top-right journal header, including the shared personal editor. Date, description and voucher stay in place when switching modes.
- Bookkeeping begins Journal → Finalization → Data Check → Period Review. The Data Check page banner remains “Closing & Data Checks / Before period closing.” Its shortcut is Ctrl+Alt+B, then D.
- Reconcile Accounts reviews actual cash/bank amounts and exports the review without changing the period status. Review & Close Month performs the full guarded review and requires confirmation before closing.
- Maintenance Excel exports are populated for the selected month. They include formula-based General Ledger, Trial Balance and Payroll, saved Journal/Payroll source data, and editable independent comparisons. ZIP exports also include the workbook; direct CSV remains available.
- The report sheets follow the approved compact green A4 print family. Payroll reuses the application's print renderer for sections and attendance summaries; its day-color grid is on a separate attendance sheet.
- Payroll formulas independently recalculate gross, taxable, net and payment from saved component values. Attendance deductions, PIT and SSO amounts remain source inputs for review; the workbook does not claim to independently recalculate every attendance or tax rule.
- Foreign payroll CSV amounts now use the final payment and its currency. When only net salary is saved, it is explicitly labeled LAK instead of using the employee's contract currency.

Empty external comparison cells remain “not compared”; zero is a valid independent amount. Re-export after adding records or changing the month. Cash/bank reconciliation, classification and source-document review remain necessary even when totals balance.

System Diagnostics reads the version from the validated release manifest, including the new Excel module, instead of reporting later releases as unsupported.

No database migration, live financial writes, phone redesign or portable ZIP changes are part of this release.
