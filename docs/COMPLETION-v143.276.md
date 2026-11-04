# Payroll and report audit — v143.276

## Corrected after the audit
- Payroll Use default journal now confirms completion. Save journal and Prepare in Transactions show results/errors immediately beside the controls, above the long table. A draft payroll explains that finalization is needed. Saving is separate from preparing and posting; a device-only save explicitly says server sync is pending.
- The saved journal template is also kept in the payroll recovery copy. Duplicate button presses cannot start simultaneous saves, editable controls are temporarily disabled during the action, failed saves allow retry, and closing the dialog during a save does not later open Transactions. A changed account/payroll cannot redirect stale work.
- Saving salary-voucher defaults preserves per-report defaults and unrelated preferences, including preference changes made while the dialog was open.
- Signatory defaults use a stable report-source key rather than a changing report title/date range. Legacy keys remain a fallback. Payroll calculation defaults retain their existing key.
- Salary vouchers opened through the Reports chooser retain each employee receiver ID/name, page breaks and compact signing gap.

## Verification
- `test-report-crossflows276.cjs` reproduced the report-key mismatch, erased defaults and missing voucher receiver before correction; all now pass using the actual report/signatory modules.
- `test-payroll-buttons276.cjs` uses the actual modal, confirmation, payroll template, journal button and shared feedback modules. Checks reset confirmation/result, save/readback/recovery, draft block, save failure/retry, duplicate protection, unfinished-journal preservation, finalized transfer and close-during-save. Posting is blocked in the fixture.
- Browser checks clicked Use default journal, Confirm, Save journal and Prepare in Transactions. A draft showed the visible finalization reason. A finalized synthetic payroll closed the dialog and opened Transactions with its saved rate/date, account lines and Post Payroll Journal action. `PAYROLL-BUTTONS276-QA.jpg` is synthetic test evidence, not the live financial record or a physical iPad test.
- Re-ran payroll accrual, preparation, reimbursements, overview, protected fields, report signatories/notices, account typing, sidebar sync, custom-template recovery/cloud/database, login selector, startup/report preparation and journal completion tests (132 generation scenarios). The database fixture tests owner isolation, revision checks, permanent numbers and removals.
- Release checks verify canonical source builds, parsed JavaScript, asset integrity and changed cache URLs. Hosted deployment and byte identity are verified separately after publication.

## Limits and separate work
- This audit does not certify the version currently running on the user's installed device. A hosted release and a currently open tab are separate states.
- Custom-template sync/recovery mechanisms are tested; specific missing historical templates have not been recovered. Built-in templates do not count as recovery.
- No actual payroll was finalized, no journal posted, and no amortization or schedule record changed. Those remain separate reviewed financial actions.
- Read-only live payroll/template/schedule findings are reported privately to the user rather than committed as financial data in this public repository.
