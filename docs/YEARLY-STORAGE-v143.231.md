# Automatic yearly company storage — v143.231

Use Settings → Accounting → Google Drive and Sheets. Save the company Google account and these **parent** folder links:

| Setting | Select this folder | Created by Accounting |
| --- | --- | --- |
| Receipts and documentation | Database / Receipt and Documentation | A child folder named 2026, then 2027, and so on |
| Accounting data | Database / Accounting Data | Accounting 2026, Accounting 2027, etc., directly inside this folder |

No yearly accounting subfolders or Google template file are required. The versioned workbook builder generates the structure, source tabs and report formulas. The Accounts, Journal, Ledger, financial reports, sub-user summaries, HR/payroll views and raw records are generated from the existing report definitions. Workbook formulas use their own saved source tabs; reading these reports does not require Supabase to remain online.

Save both destinations, connect the company Google account, check saved folder access, then select **Activate automatic yearly storage**. Saving or checking links alone does not activate storage. Settings lists prepared years and verified saves, and **Refresh storage status** reads current progress and errors. **Prepare next year now** queues the same preparation manually.

## Dates and preparation

An hourly server job prepares the next year from December 30, using Asia/Vientiane time. It retries after outages. When both the workbook structure and receipt folder are ready, active administrators receive one Accounting notification. This notification confirms preparation; Settings separately reports when data has been verified.

Preparation does not change the year used for records. The journal's transaction date determines its accounting year. January records entered in December wait until January 1. December records entered in January still go to December's workbook; associated receipts use the journal date too. HR and other supporting PDFs use the document date selected when saving. PDFs spanning different accounting years must be saved separately. Neither automatic preparation nor January 1 automatically posts journals or closes a financial year.

Next year's workbook is initialized without transaction rows. On and after January 1, the normal export worker writes that year's records and shared reference data. There is no manual yearly link replacement.

## Preservation and permissions

Annual workbook and folder IDs are stored server-side. Stable file markers recover interrupted creation, provisioning leases prevent concurrent duplicates, and removed or moved registered items block saving rather than silently replacing archived data. A same-named folder can be reused; an unrelated same-named workbook is preserved and requires resolution.

Source Records retains revisions, including final contents of deleted database rows. Closing a year creates verified immutable history and freezes that workbook's generated financial views. Receipt Documents keeps PDF links and versions, including supporting receipts added later. The existing fresh comparison, separate Excel backup and explicit confirmation gates remain required before database cleanup.

Code can rebuild an empty workbook structure. It cannot recover deleted historical records without a retained verified archive or backup. Existing legacy workbooks and Google files are not deleted or automatically moved. Changing an activated annual account or root folder is blocked until a verified migration is provided; reconnecting the same account and roots is supported.

The company connection belongs to Accounting's server. It does not connect the company's Drive to the ChatGPT plugin. The AI journal/HR inbox retains its separate connection. Google Workspace approval rules and account verification still apply. Console links remain in Settings; both Drive and Sheets APIs must be enabled for the application project.

## Release validation

Isolated PostgreSQL tests cover atomic activation, stale settings rejection, service-only functions, dated child/deletion routing, receipt-year stamping, changed-date rejection, provisioning leases, notification deduplication and reconnection consistency. Mocked Google transport tests exercise the real workbook initializer and append/immutable writers, interrupted creation, folder placement, missing/moved resources, annual routing and future-year isolation. Receipt permission/date and Settings DOM tests cover the administrator/scanner paths. Existing archive, backup and company-Drive tests remain required.

Production company OAuth, a real company-folder upload, Google formula calculation in the new yearly workbooks, and physical-phone use require the company's own setup and have not been claimed by these isolated tests. At implementation time no company Accounting Data parent had been activated; the existing Marketplace archive remained active.

## Installed Android test app

Update the installed Accounting test app through Settings → App updates before activating yearly storage. v143.231-test bundles the new receipt-year request and verification fields. The existing update link and application ID are retained, and the APK is signed with the same retained preview certificate. Do not uninstall to update. Package identity, versionCode 143231, signature and all 454 bundled web files were verified. This is the existing test distribution, not a new production signing release; physical installation and device operation were not tested here.
