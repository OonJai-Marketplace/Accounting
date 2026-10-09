# v143.06 — HR workspace and company calendar

Design B adds a chronological agenda beside the monthly calendar, centering the next unfinished event. Lao public holidays, company events, effective-dated working schedules, planned leave and contract dates share attendance and reminder rules. Reminder lead times support calendar months and additional days. Upcoming Events and the notification bell link back to the relevant record.

Employee editing is a compact dialog. Leave controls and records have moved into Leave. Employee documents support editable contracts and private signed/unsigned uploads. Contract outcomes retain history; termination archives the employee with a required explanation. Attendance defaults to present on scheduled working days and saves monthly exceptions as payroll drafts. Finalized payroll keeps snapshots; older finalized records retain their original behavior.

## Deployment requirement

Run `setup/INSTALL-HR-CALENDAR-v143.06.sql` once in the existing Supabase project SQL Editor. It adds shared calendar settings/events, an audit history and a private employee-document bucket. Existing payroll and employee records are retained. This migration was prepared and reviewed locally; it was not executed against the production database during this release. Database integration was exercised with authenticated browser fixtures, not a live Supabase installation.

The client reports missing calendar setup and blocks new calendar-dependent saves until the shared calendar is available. Uploaded files are limited to 10 MB (PDF, PNG, JPEG or DOCX). Calendar writes and employee files require an active administrator. Complete archive downloads include the new HR records and linked files.

## Verification

- Pure model checks: holidays, substitute dates, leap/month boundaries, employee-scoped days, half-days, reminders and effective schedules.
- HR browser integration: navigation, compact employee dialog, date/account pickers, holiday propagation, planned/approved leave, saved attendance, finalized snapshots, contract termination, private uploads, archive coverage, stale-write rejection and desktop/tablet sizing.
- Existing account/workspace, period/audit layout, voucher-numbering and offline-shell regression checks.
- Browser viewport checks at 1280, 1024 and 768 px; no physical iPad test.

2026 Lao holiday source: https://www.asean.or.jp/en/learn-about-asean-japan/public-holidays-laopdr/
Future years carry fixed annual dates; substitute or additional holidays must be confirmed and adjusted through Calendar. Company observance and affected employees are editable. Leave crossing payroll months remains split into separate requests, as required by the existing payroll model.
