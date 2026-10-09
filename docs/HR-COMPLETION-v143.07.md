# HR completion review — v143.07

The current v143.06 implementation already included most of the requested HR work. This update completes the remaining history/document access, corrects half-day leave usage, prevents stale calendar forms from overwriting newer records, and verifies the whole requested scope.

## The 18 requested items

| # | Requirement | Implemented behavior / verification |
|---|---|---|
| 1 | Flashing Print button | HR is excluded from the legacy auto-inserted Print control. HR suppression styles now load in the document head. The intended Employee Print / Preview stays in its toolbar. |
| 2 | Employee table border | One green edge; removes the additional border on the archived employee summary. Browser geometry/style check and screenshot review. |
| 3 | Contracts & Documents | Save Document writes the employee-linked editable copy to company records. Employee document lists reopen it in the editor. Private uploads retain contract links and explicit signed/unsigned/supporting-document labels. Browser save/reopen/upload checks. |
| 4 | Employment contract template | Document Editor → Company Templates has an editable Employment Contract starter that can be saved as a company template. The employer comes from Settings' legal name, with a placeholder if unset. Browser template save check. |
| 5 | Expiration reminders | Notification bell and Upcoming Events within Upcoming Transactions open the correct employee contract directly. Both links exercised. |
| 6 | Contract outcomes | Ended normally, Terminated, On vacation awaiting renewal and Renewed. Required reasons, retained prior revisions and direct supporting-document uploads. Renewal retains the old term and creates a new linked contract. |
| 7 | Compact employee popup | Sectioned dialog, internal scrolling, short payroll-code field, working date and account pickers. Checked at desktop and tablet widths, including 1024 × 600 landscape. |
| 8 | Sample checkbox | Removed from the employee form; existing saved data retained. |
| 9 | Employee tab cleanup | No Manage Employees and Leave / Reload controls. Leave reporting, requests, balances and records live in Leave. |
| 10 | Archiving | Required reason (Contract ended, Terminated, Other) and explanation. Termination archives the employee. History action exposes retained reasons, actions, contracts and documents. |
| 11 | Tab order | Employee → Attendance → Leave → Assessment → Contract Documents → Calendar, including the visible upper navigation labels. |
| 12 | Calendar dates | Opens the current Lao month/year, circles today, navigates months, and provides Today. Design B retained. |
| 13 | Company events | Holidays, occasions, non-working exceptions and project timelines. Only explicit schedule effects affect attendance. Informational occasion check confirms no change. |
| 14 | Working schedule | Effective-dated weekdays, start/end hours and half-days feed Attendance. Stale schedule/event forms are rejected. |
| 15 | Attendance popup | Compact 510 px maximum dialog with advanced override fields behind their checkbox. |
| 16 | Attendance defaults | Green / Present on scheduled working days; calendar holidays/days off and approved leave applied. Recorded exceptions retained; finalized payroll uses saved snapshots. |
| 17 | Uniform squares | 32 × 32 px attendance controls checked across month lengths. |
| 18 | Centered dates | All dates align with their columns in 28-, 29-, 30- and 31-day months. |

Additional scope: Lao public holidays default in Calendar; company activities only; pending and approved leave project into Calendar, with approved leave in Attendance. The 2026 holiday dates were checked against the ASEAN–Japan Centre list: https://www.asean.or.jp/en/learn-about-asean-japan/public-holidays-laopdr/ . Future substitute/additional days require confirmation and can be edited in Calendar.

## Changes in this update

- Employee history is available from each employee's action menu, including archived employees.
- Contract details offer a linked draft and direct supporting-document upload.
- Contract outcomes and uploaded-file classifications use complete human-readable labels.
- Employment templates use the configured legal employer name.
- Half-day attendance legend leave consumes 0.5 days instead of 1 day; finalized payroll results are not recalculated.
- Calendar forms retain their original record versions, including when records refresh while a form is open.
- HR styles load before the body renders; archived summary has no second top border.
- Finalized attendance leave is included in displayed balances using saved half-day fractions; older rows without fractions retain their original full-day count. Existing accrual policy is preserved.
- Pending leave approval recalculates working days against the current schedule, checks the updated allowance and retains the original requested count. Archived employees and finalized employee payroll months reject new leave requests.
- Employee editing cannot bypass the archive reason flow. Renewed contract records cannot generate duplicate outcomes; future status changes cannot take effect immediately by mistake.
- Contract and Assessment employee selectors are independent, and old form drafts cannot overwrite navigation selections.
- Signed uploads remain accessible when the editable-document query fails. Repeated Save submits are guarded while the first save completes.
- Desktop and tablet HR tables stay readable with internal horizontal scrolling, wrapped labels and consistent green borders. Leave day counts no longer receive currency symbols. Short landscape dialogs remain within the viewport and scroll internally.
- Changed desktop assets use v143.07; the approved phone layout is untouched.

## Validation and limits

`validation/test-hr-completion14307.cjs`: 36 browser checks passed, including all original HR checks and the added document/template/history/reminder/half-day/stale-form/layout cases. Results: `validation/hr-completion14307.json`. All six HR tabs were exercised at 1440 × 900, 1024 × 768, 768 × 1024 and 1024 × 600; screenshots were reviewed for layout and readability.

`validation/test-hr-calendar-model14306.cjs`: date, holiday, schedule, half-day and reminder checks passed.

`validation/test-regressions14305.cjs`: 11 desktop regression checks passed, including navigation, control sizing, audit layout and calendar selection.

`validation/test-offline14294.cjs`: 14 checks passed, including a fully cached v143.07 shell reopening offline. Syntax, whitespace, and edited source-to-bundle consistency checks passed.

These are local browser tests with isolated authenticated database fixtures, not production database tests or physical-iPad tests. Production records were not changed. No new SQL is introduced by v143.07.

## Existing installation requirement

The calendar tables and private employee-file bucket require `setup/INSTALL-HR-CALENDAR-v143.06.sql` to have been run in the existing Supabase project. This update does not execute it and cannot confirm its production installation. If it has not been installed, run that existing script once; it preserves existing employees and payroll records. User-side SQL execution remains the established workflow.
