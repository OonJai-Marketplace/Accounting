# Settings cleanup — v143.230

## What administrators can save now

Settings → Accounting → Google Drive and Sheets starts with **Company Google Drive — storage folders**:

| Field | Purpose | Current behavior |
| --- | --- | --- |
| Company Google account email | Account that will write the company folders | Saved before Google authorization; changing it does not change ownership or permissions |
| Receipts and supporting documents — folder link or ID | Scanned receipts and supporting PDFs | Verified and explicitly activated for all phone scanners |
| Approved accounting data — archive folder link or ID | Parent folder intended for separate yearly accounting workbooks | Saved and access-checkable; yearly exports into this folder are **not implemented or activated** |

Use **Save both destinations**, **Connect company Google account**, and **Check saved folder access**. Then use **Activate receipt folder for everyone** to change new receipt uploads. Google authorization remains a manual step and company domain policies still apply.

The page shows the currently configured archive account and links to its actual workbook. Saving the new archive folder does not move old records, change the current export, transfer ownership, or delete anything. The existing archive continues until a verified yearly migration is available. Its connection was still the Marketplace account during this review. Full separation of approved records from the AI-accessible account is therefore pending that migration.

## AI journal and HR connection

Expand **AI journal and HR connection**, enter the submission spreadsheet URL, use **Save AI spreadsheet**, then **Connect AI workspace account**. This authorizes the AI submission workspace separately from company receipt uploads. Google credentials are managed on the server; no client secret belongs in browser settings. Changing a reference bookmark does not change either connection.

The setup panel retains links to the current Google Cloud project’s Drive API, Sheets API, OAuth audience/test users, and Workspace app access settings. A different Cloud project requires its credentials to be configured on the server by its maintainer. Saving an email or folder URL cannot override company authorization policies.

## Removed or replaced

| Removed control or code | Reason / replacement |
| --- | --- |
| Temporary browser Audit Workspace | Replaced by the agreed future audit workflow in yearly Google Sheets |
| Copy current data for audit | No longer creates a temporary local editing workspace |
| Upload JSON and Open Audit Workspace | Retired with the workspace; downloaded files are untouched |
| Embedded audit iframe and its message/write bridge | No longer needed after removing the workspace |
| Standalone legacy archive viewer and audit workspace scripts/styles | Removed from source, generated assets, and offline cache lists; the old `archive.html` URL now explains the retirement and points back to Accounting |
| Old duplicate backup form in `recovery-v113.js` and its export-only helpers | Superseded by the current portable backup form; encrypted credential recovery remains |
| Browser Google OAuth client ID textbox | Actual authorization uses server-managed Google credentials; existing stored configuration is retained for compatibility |
| Hardcoded archive workbook link in Backup & Recovery | Now reads the actual configured workbook from the server |
| Audit-only navigation entries and styles | Removed with their retired controls |

Deleted modules: `src/maintenance/archive/archive-v128.js`, `src/maintenance/archive/archive-v128.css`, `src/maintenance/audit/audit-workspace14232.js`, `src/maintenance/audit/audit-workspace14232.css`, and their four generated `scripts/` / `styles/` counterparts.

## Retained and still connected

- **Portable data backup:** period/module selection, Excel and source JSON exports, supporting records and document inclusion.
- **Previous local audit copy — recovery only:** downloads an existing copy for the current administrator from this browser. It does not overwrite or delete the stored copy.
- **Current archive connection:** current saves, status, closed-year comparisons, backup verification and protected cleanup. These must remain while the current export is live.
- **Reset Operational Data safeguards:** administrator password, exact backup verification, explicit confirmation, and a fresh server comparison before deletion.
- **Encrypted recovery vault, settings recovery and unsynced-work protections.**
- **AI journal and HR connection:** separately labeled; its spreadsheet remains distinct from the company storage fields.
- **Reference links:** bookmarks only, clearly labeled as not controlling upload/export destinations.
- Shared accounting/report calculations and audit-event history. These are not the retired temporary audit workspace.
- Existing database routines and migration history, including legacy audit routines, remain for compatibility. This release removes the obsolete browser path, not production database objects.

No Google Drive files, receipts, financial records, Google connections, or saved local working copies were deleted by this release. No destination was activated on the administrator's behalf.

## Validation

- DOM tests: both destinations persist together; stale AI settings cannot replace newer settings; failed saves retain input; activation stays explicit; popup fallback remains available.
- Server tests: only administrators can check the company folders; wrong identities and read-only folders fail; access checks do not activate exports or expose credentials.
- Recovery tests: retired UI is absent, current backup/reset controls remain, and an account change blocks an in-flight local recovery download.
- Existing phone destination, journal-draft and shared archive-engine regression checks.
- Generated-module, source syntax, release integrity and structural checks.

These are automated DOM/server tests, not a physical-phone scan or completed authorization using the company Google account. Yearly export creation and migration remain separate unfinished work.
