# Accounting file import

In the archive workbook, open **Accounting → Upload Excel or JSON**. Choose the original Raw Excel or restorable JSON from Backup & Recovery and select **Append to Source Records**. Importing a second copy skips identical revisions. Changed records append as new revisions. The importer runs inside the spreadsheet and uses no accounting database credentials.

The bound project contains Code.gs and ArchiveUpload.html. The Excel file must retain its embedded accounting payload. Existing report tabs are historical snapshots.
