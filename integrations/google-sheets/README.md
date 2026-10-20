# Direct journal import into Google Sheets

Workbook: https://docs.google.com/spreadsheets/d/1fxa4WzOHUA0bpEhz12-IPkG5Ps6sZMb_1RVptqiv_QA/edit

Choose Year, Quarter, Month, or Custom, then click Import from database. There is no website download or manual data-file upload.

## One-time installation

The database endpoint is deployed and the workbook contains an initial verified 2026 import. The recurring button requires this container-bound script installation; it has not been installed remotely.

1. Open this workbook, then Extensions > Apps Script. Replace the former file-import helper's Code.gs with this package's Code.gs. Do not keep both versions of the same functions.
2. Add an HTML file named Import and paste Import.html into it.
3. In Project Settings, show appsscript.json. Replace its contents with the supplied appsscript.json and save.
4. Run openImportHome once and authorize the requested Google permissions. Reload the Sheet.
5. Choose Accounting > Import from database. Sign in with your accounting administrator credentials, select a period and click Import from database. Do not enter your Google password unless it is independently the same credential as your accounting login.

Do not deploy a web app, create a trigger, or paste a database secret key. The included publishable key is public application configuration, and the database requires an active authorized administrator session. Passwords are not stored; refresh tokens are stored in per-user Apps Script properties. Only trusted people should have edit access to this bound script.

Normal imports require no code changes. Changes to the integration itself may require replacing the helper again.

## Receipt and comparison

Import Receipt shows requested dates, snapshot time, database versus received lines and distinct entry counts, first and last IDs by date order, earliest/latest received dates, earlier lines used for opening balances, total imported lines, a source checksum, and the individual entry list.

Use the same dates and posted status in the website. Lines use line_date with transaction_date as fallback, matching the journal source mapping. An entry UUID is counted once even if it has several lines; an entry spanning periods is counted in each period where it has selected lines. First/last IDs follow date, entry ID, entry UUID and line order; these are not numeric minimum/maximum IDs. Empty periods report zero selected lines while still retaining earlier history for balances.

Changing defaults on Home does not alter the last completed report period. The last successful receipt controls the report dates. Reimport to change the active period. The report currency remains selectable in Import!B7; receipt counts always cover all currencies.

## Safety and scope

The RPC is STABLE SECURITY INVOKER, retains existing RLS, checks the established accounting admin authorization and password-change gate, and denies anonymous execution. It only reads journal lines, entries and accounts. It returns one database snapshot, including receipt totals, avoiding page-to-page changes.

The client verifies the payload checksum, unique line IDs, required fields, selected and history counts, dates and endpoint IDs. It stages raw data using the Sheets RAW API, reads it back, then switches one named range. Receipt and report period are part of that same snapshot. Failed validation leaves the previous snapshot active. Previous raw snapshots are retained hidden. Imports replace, never append to, the active journal data, so repeat imports do not double-count.

This button refreshes the journal and chart of accounts. Existing payroll and other module data is retained but NOT refreshed; those tabs must not be interpreted as covered by the journal receipt. Formula reports remain original-currency views. Exact website print matching is still pending.

Limits: 10,000 journal lines including earlier history, 5,000 accounts, and 50,000 raw rows including retained modules and receipt rows. Exceeding a limit stops the import rather than silently truncating.

## Verification

Run `node integrations/google-sheets/test-import.cjs` from the repository root. Tests cover year/quarter/month/custom dates, leap years, selected versus history counts, multi-date entries, duplicates, checksums, empty periods, literal formula-like text, successful publication and failed readback.

The deployed RPC was tested under the authenticated database role with the existing accounting administrator identity; anonymous/no-identity execution was rejected. A live 2026 snapshot returned 15 posted lines and 6 distinct entries, and native Sheet readback matched both counts. A separate October query returned 0 selected lines and 15 earlier lines. The initial import was loaded through the connected tools, not by running the installed Apps Script button. Google authorization and the actual sidebar runtime remain to be verified after installation.

Deployment source: install-direct-import.sql, applied using migration name sheets_journal_import_v2. This adds a read endpoint without changing website UI, postings, or existing data.
