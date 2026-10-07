# Oon Jai v142.85

Run `setup/INSTALL-SUBACCOUNT-POSTING-v142.85.sql` in the Supabase SQL Editor, then refresh the app. The installer links existing sub-accounts to actual posting accounts and synchronizes new sub-accounts, edits and deletion. It aborts on conflicting codes. It preserves journal rows and blocks currency/classification changes or deletion when a child has journal history. Sub-user posting and ledger access continue to require the administrator's account assignments.

The assigned company ledger uses the existing `setup/INSTALL-ASSIGNED-LEDGER-v142.81.sql`. Run that installer if it has not already been applied. Configure **Ledger viewing access** in Users & Permissions.

## Changes

- Phone: removed the top universal search and ledger shortcut; moved administrator workspace tabs below the logo/profile header. Assigned Account Ledger is in the profile menu.
- Desktop and phone: workspace tabs follow the Organization & Reporting tree, with stable alphabetical sibling order. Refreshing or opening a user does not reorder tabs.
- Phone: account type tabs show only populated assigned classifications. Current view, filters, category and horizontal scroll persist on reload. Loading covers the viewport with background blur; data finishes loading before the new view appears.
- Desktop searches reject identity autofill while retaining intentional queries.
- Sub-accounts appear in the chart and every chart-backed account selector after the SQL installer runs. Child edits from the chart use the sub-account editor.
- Account picker type filters stay visible. Currency symbols retain their existing independent currency palette.
- Document imports no longer have the previous 12 MB file or 40 MB expanded ZIP caps. Content detection supports renamed Word/OpenDocument archives, legacy Word text, PDF, Markdown, HTML, RTF, XML, plain text, JSON, EPUB, presentation text and workbook tables. Corrupt or unreadable binary documents still need a readable export. Complex layout should be reviewed. PDFs, including scans, import as printable page images.
- Fixed the import/render race that could save a parsed document while displaying an empty editor.
- Documents include a Reports menu with the approved accounting, journal, HR, payroll, tax, operational and saved sub-user report types. Date-based reports offer monthly, quarterly and yearly periods. Current account/employee registers are clearly identified as current registers rather than historical snapshots. Saved payroll and operational reports keep original period data.
- Each page reserves header/footer space only where configured. Empty headers no longer reserve a full header band. First-page headers, last-page footers, all pages and none are supported, including documents longer than two pages.
- Phone Post includes Add Template and Templates. Templates belong to the signed-in user on that browser/device; they retain accounts, entry type, direction, line count and line memos. Applying a template clears dates, amounts, reference and General Description and rechecks current assignments. Applying a template starts a new entry.

## Validation

Browser checks cover desktop 1600/1280, tablets 1024/768 and phones 390/360; organization order; delayed loading; reload/scroll restoration; picker visibility and currency colors; document imports through the editor; five-page header/footer placement and flowing 200-row reports; report periods; and phone template resets. Isolated PostgreSQL tests cover assigned ledger restrictions and sub-account synchronization. No installer was run against the live database.
