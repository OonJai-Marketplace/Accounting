# Company Google archives

In Accounting, open **Backup & Recovery → Refresh both Google archives** and choose the company Google account. This manual operation compares current business records, updates both connected workbooks and verifies the published values. The annual destination is the 2026 archive. Closed annual books stay sealed. A failed refresh displays its error and can be retried. New revision parts have deterministic identifiers.

## Accounting file import

In the archive workbook, open **Accounting → Upload Excel or JSON**. Choose the original Raw Excel or restorable JSON from Backup & Recovery and select **Append to Source Records**. Importing a second copy skips identical revisions. Changed records append as new revisions. The importer runs inside the spreadsheet and uses no accounting database credentials.

The bound project contains Code.gs and ArchiveUpload.html. The Excel file must retain its embedded accounting payload. Existing report tabs are historical snapshots.
