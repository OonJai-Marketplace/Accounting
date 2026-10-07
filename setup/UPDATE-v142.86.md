# Oon Jai v142.86 — instruction and report audit

Compared the deployed v142.85 source with the latest October 7 instructions. The original v142.85 implementation was already on GitHub; this update corrects the gaps found during the follow-up audit.

## Corrections in this update

- Keep section headings with the first table row or paragraph when that content moves to another page. Tables still split at complete row groups and repeat their column headings.
- In the Document Editor Reports menu, begin each employee's salary voucher on a new page. Preserve English 10pt and Lao 10.5pt layouts and voucher signature language instead of applying the generic register formatter.
- Saved daily-shift reports use the existing default labels when neither the snapshot nor current settings contains POS labels. Older reports can open without an undefined-settings error.
- Synchronize the changed source modules with their deployed bundle segments and advance the application/cache version.

## Latest instruction comparison

| Requested behavior | Code and verification |
| --- | --- |
| Remove phone universal search and top Ledger shortcut | Present in v142.85; 360px and 390px browser checks passed. |
| Put administrator workspace tabs below logo/profile | Present; both phone widths passed. |
| Follow Organization & Reporting order and avoid reordering on selection/refresh | Desktop and phone sequence checks passed. |
| Show only populated, assigned account classifications | Restricted user and administrator classification checks passed. |
| Preserve user, tab, category, search and horizontal scroll on reload | Phone checks passed after waiting for the actual loading/font/layout completion. Earlier immediate assertions were timing-sensitive. |
| Full-screen blurred loading; display the new workspace after loading | Login/workspace overlay and delayed-loading checks passed. |
| Assigned Account Ledger in profile menu with administrator-controlled access | Separate ledger assignment, revoked/denied access, and return-to-draft checks passed. |
| Stop email/name autofill in desktop searches | Identity autofill rejection and intentional search checks passed. |
| Imports without the former file/expanded-ZIP limits; fix blank imported editor | Removed the former 12 MB/40 MB application caps. Generated Word, renamed/wrapped archives, legacy Word text, PDF/scans, Markdown, workbook/presentation text, large text and unsafe-content checks passed. Readable supported content is required; corrupt or unsupported proprietary binary formats still need conversion. |
| Reports menu and month/quarter/year selection | All 35 menu entries built from test records; period selection/filtering and restoration checks passed. Current registers remain identified as current snapshots. |
| Connect sub-accounts to the chart and every chart-backed selector | v142.85 contains the database posting identity and synchronization installer. Chart/posting-picker checks passed using linked test records. Live operation depends on the installer and existing user assignments. |
| Keep dropdown classification icons visible; retain currency colors | Picker rail visibility and independent USD symbol palette checks passed. |
| Page Setup header all/first/none and footer all/last/none; no unused bands | Every report layout below passed all nine combinations. Empty-band and flowing-table checks passed. Heading placement was corrected in this update. |
| Phone Add Template/Templates retain accounts and structure but clear entry-specific values | Single/double template persistence, accounts/line counts, dates/amounts/reference/general-description resets passed. |

## Report coverage

`validation/test-page-setup-audit14286.cjs` covers all 35 report menu entries plus standalone English and Lao vouchers, using long descriptions, large amounts, attendance calendars, saved payroll, approved sub-user reports, petty-cash and daily-shift reports, financing, closing findings and all seven Tax & SSO reports. Each runs through header **none / first / all** × footer **none / last / all**: 333 layout cases.

`validation/test-page-setup-detail14286.cjs` adds the detailed bank reconciliation print path, including 80 ledger lines, 35 findings, notes and signatures, under the same nine combinations. Combined coverage: **342 report/layout cases**. Checks verify overflow, row preservation, original values and identifiers, configured page spacing and section-heading placement. First/last reconciliation pages were visually reviewed.

`validation/test-documents14285.cjs` also passed after the corrections: five-page documents, flowing 200-row reports, repeated headings, original total, imports, Reports menu/periods, phone templates and no uncaught runtime errors.

`validation/test-phone-navigation14286.cjs` waits for loading and fonts/layout to finish before checking the restored phone surface. It passed organization order, 360/390 phone headers, populated classifications, filters/scroll reload, profile-ledger draft retention and assigned-ledger restrictions. No phone application redesign was introduced in this update.

These checks use isolated test records and Chromium. They do not certify every historical live document, printer driver or physical iPad/Safari print dialog. An indivisible block taller than the available page remains blocked from printing rather than being cropped.

## Database setup

No new SQL is required for v142.86. If it has not already been applied, run the existing [INSTALL-SUBACCOUNT-POSTING-v142.85.sql](INSTALL-SUBACCOUNT-POSTING-v142.85.sql), then refresh. Assigned company ledgers use the existing [INSTALL-ASSIGNED-LEDGER-v142.81.sql](INSTALL-ASSIGNED-LEDGER-v142.81.sql) if not already installed. Do not rerun older installers simply for this website update.

No installer was run on the live database during this audit. Financial calculation rules and source journal/payroll records were not changed.
