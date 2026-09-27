# Version 82 — desktop update

## Implemented

- Journal Add Row moved beside Reset/Post, with selected-row up/down controls that preserve entered values. The date uses an abbreviated month and the width of the date-mode controls.
- Upcoming transaction fields arranged on one row: type, frequency, currency, date, amount, memo. Reference entry removed from desktop. Reminder unit adapts to its text.
- Transaction History uses its search; desktop year selector removed.
- Ledger Account/Search controls compacted; ledger and trial sections inset from their outer module. Balance Sheet uses stacked Assets, Liabilities and Equity statements with subtotals.
- Payroll employee contracts, leave requests/approval, attendance, late grace, overtime, internal deductions, advance recovery, reimbursements, currency conversion, SSO and PIT calculations. Finalized runs retain their applied settings and results.
- Printable payroll register, individual salary vouchers, and leave report.
- Sub-user liquidation and daily-shift reports, plus financing requests/utilization and documented conversions. Saved reports retain source records and entered figures.
- Shared desktop printing uses paper, orientation, margins, company identity, header/footer, filename and page-number settings.

## Settings review

No PIT/SSO defaults were replaced. Existing PIT starts at 1,300,000 LAK; the supplied spreadsheet formula starts at 2,500,000. Review Statutory Settings before finalizing. Statutory SSO rates are the single calculation source.

| Area | Settings | Status | Behavior |
|---|---|---|---|
| Accounting | baseCurrency | Connected | Currency defaults and separate-currency reporting; amounts are not automatically converted. |
| Accounting | journalPrefix, subUserPrefix, journalDigits, subUserDigits | Connected | Entry numbering and previews; existing identifiers are retained. |
| Accounting | decimalPlaces | Connected | Number display across ledger and new reports. Payroll monetary calculations round to two decimal places. |
| Accounting | defaultCashAccount, defaultBankAccount | Connected | Daily shift source classification. Account names must match the assigned fund names. |
| Accounting | fiscalYearStart | Not integrated | Existing yearly/quarterly filters use calendar periods. No fiscal rollover is performed. |
| Accounting | exchangeRatePolicy | Not integrated | Rates are explicitly entered with date/source; no rate service or central rate history exists. |
| Accounting | lockClosedPeriods | Policy override | Closed/archived books remain protected through the period workflow; disabling this setting does not bypass book protection. |
| Payroll | payCurrency, payCurrencyLAK, payCurrencyUSD, payCurrencyTHB | Connected | Employee currency choices and draft validation. Rates are entered per payroll run. |
| Payroll | workDaysMonth, hoursPerDay, lateGraceMinutes, overtimeRate | Connected | Daily/hourly salary, unpaid time, per-day late grace and overtime. |
| Payroll | weeklyHours | Reference only | Shown in applied rules. Monthly salary uses workDaysMonth × hoursPerDay. |
| Payroll | payFrequency | Partially integrated | Displayed and validated. This release finalizes monthly payroll only. |
| Payroll | payrollCutoff, paymentDay | Schedule only | Displayed schedule; no automatic attendance cutoff or bank payment. |
| Payroll | pitSharing | Connected | Equal, employee-only, employer-only or per-employee custom shares. |
| Payroll | employeeSsoRate, employerSsoRate | Superseded duplicate | Calculation reads Statutory Settings. Payroll fields display that source; no conflicting second rate is used. |
| Statutory | pit1From…pit6Rate | Connected | All saved PIT brackets drive marginal tax. Bounds must be contiguous. The supplied spreadsheet formula is a comparison, not a replacement of saved settings. |
| Statutory | ssoEmployeeRate, ssoEmployerRate, ssoMaxBase | Connected | Employee and employer contributions, with optional ceiling, using gross earnings as the contribution base. |
| Statutory | pitDeadline, ssoDeadline, pitReminderDays, ssoReminderDays | Schedule only | Following-month reference dates shown in Payroll Overview. No background notifications or statutory filing. |
| Statutory | pitAccount, ssoAccount | Reference only | Shown beside contributions schedule. Payroll does not automatically post to these accounts. |
| Statutory | vatRate, filingPeriod, vatDeadline, vatReminderDays, vatAccount | Not integrated | VAT transaction treatment and statutory filing/payment modules still need a defined workflow. |
| POS | cashLabel, bankLabel, usdLabel, thbLabel | Connected | Daily shift report headings, retained in saved report snapshots. |
| POS | reportingCurrency, shiftCloseFrequency, salesAccountLabel, clearingAccountLabel | Not integrated | Shift cover sheets use LAK with separate USD/THB receipts and entered rates. No POS import or automatic posting mapping. |
| Printing | paperSize, orientation, marginSize, headerPlacement, footerPlacement | Connected | Desktop financial reports, payroll, vouchers, leave and operational reports use the same print layout. Header/footer images use existing Print Settings. |
| Printing | showBusinessName, fileNamePattern | Connected | Printed business heading and print-document title for Save as PDF. |
| Printing | showPageNumbers, pageNumberFormat | Browser dependent | Printed CSS page counters; browser support varies. Disable browser-added headers/footers if they duplicate these. |
| System | dateFormat, numberFormat | Connected | Report numbers and date labels. Native calendar controls follow browser locale. Journal desktop date uses your requested abbreviated month. |
| System | sessionTimeout, sessionWarning | Connected | Existing inactivity warning and sign-out manager. |
| System | defaultLandingPage | Policy override | Existing seven-hour desktop resume and mobile navigation behavior take precedence. |
| System | retentionYears, archiveFrequency | Not integrated | No automatic deletion or archive job is enabled. Existing records are retained. |
| System | confirmHighRisk | Policy override | Required confirmations remain in financial workflows. This switch does not suppress them. |
| Business / Access | Business information, account permissions | Existing integration | Business identity is used in printing. Existing Supabase authentication/permissions remain. New payroll/report records require an administrator. |
| Storage | ApplicationSettings / PrintSettings | Browser-local | General settings and print images are currently saved in this browser. Finalized payroll stores its applied settings snapshot in Supabase after database setup. |

## Required database setup

Run **82-payroll-reports.sql** in the SQL Editor of the existing Supabase project. It adds payroll_employees, payroll_leave_records, payroll_runs and operational_reports. It relies on the existing public.is_admin() function and profiles table. Access is administrator-only. It does not change existing transactions or Settings. Finalized payroll cannot be updated; leave included in a finalized period is also protected. Optimistic revisions prevent silent concurrent overwrites.

This migration has **not been executed**: this session has no database-administration connection. Payroll/report saves require it. The UI reports save/load failures and offers a payroll draft backup export/restore. Drafts are otherwise held in the current page session.

## Validation and limitations

- Formula tests passed at eight PIT boundaries, SSO caps, late grace per day, unpaid leave, overtime, reimbursement/advance and JSON snapshot round-trip.
- Browser tests passed row movement, finalized-result stability after settings changes, save-error/conflict handling using a simulated database, liquidation detail/category totals, and Balance Sheet section totals.
- Desktop screenshots and a printed one-page salary voucher were checked. Mobile checks confirmed the new desktop controls and tabs are hidden; existing phone layouts were retained.
- Live Supabase persistence and RLS have not been exercised; database tests used simulated responses.
- Payroll supports monthly calculations only. It does not post journals, transfer salaries, submit statutory returns or issue background reminders. Gross earnings are the SSO base; PIT taxable earnings are gross less employee SSO. Review these rules and saved rates against your intended payroll policy.
- General Settings remain browser-local; finalized payroll stores the settings used. No live exchange-rate service, fiscal-year rollover, automatic retention/archive job or complete VAT workflow is added.
- PDF examples supplied layout/workflow references only; no sample payroll or employee values were imported. The Ryan category total omitted a 5,000 transport line; new liquidation category totals use the same records as the detail.
