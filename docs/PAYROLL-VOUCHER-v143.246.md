# Salary voucher spacing and paid-day summary

Employee name now follows the title. Voucher number, salary month, payment date and currency use two text lines. Optional zero-value salary and attendance rows are omitted; contract, gross and final payment remain visible. The color attendance strip, notes, signatures, language choice and configured letterhead remain.

The draft engine counts eligible paid calendar holidays even without attendance rows. Legacy H marks use the calendar paid fraction and are not counted twice. EX retains its recorded minutes and exemption, but contributes no paid-leave days. The voucher shows excused late separately from chargeable late. Saved finalized results are not recalculated or overwritten.

Validation: test-paid-holidays246.cjs covers holidays with/without legacy H or zero placeholders, approved leave, EX, employment starts, targeted/cancelled events and saved history. test-voucher-compact246.cjs checks title/name order, metadata, zero-row removal and separate EX details. Existing contract, attendance/calendar and English/Lao voucher layout regressions pass, including extended notes and pagination. A private read-only comparison of the October draft confirmed all six employees retain identical salary, deduction, tax, SSO and payment amounts. No payroll database records were changed.
