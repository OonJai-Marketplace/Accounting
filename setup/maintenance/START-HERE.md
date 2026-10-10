# SQL maintenance templates

Open [the download page](index.html) to choose a clearly named SQL file.

Use these files separately in your own Supabase project's **SQL Editor**, with its database owner role. These tools are deliberately unavailable to browser users, staff and API keys. On a fresh installation, they are already installed. On the existing v143.21 site, run `../INSTALL-BACKEND-AND-MAINTENANCE-v143.22.sql` once; it fixes the setup function and installs these tools without deleting records.

Choose one operation, open its file, change only the marked values, and run the whole file. Do not combine all maintenance SQL files. Both boundary dates are included. Text goes inside single quotes; double a literal apostrophe, such as `Owner''s Office`. The default EDIT values refuse to run.

| Folder | File | Purpose |
|---|---|---|
| add | Add-Currency.sql | Add a currency without changing the base currency or past amounts |
| add | Add-Budget-Category.sql | Add a Budget Request suggestion, independent of Chart of Accounts |
| edit | Edit-Company-Contact-Details.sql | Edit company email, phone, website and address |
| edit | Edit-Budget-Category-Name.sql | Rename a suggestion for future requests; preserve saved documents |
| read | Count-All-Tables.sql | Exact record count and storage size for every public application table |
| read | Count-Journals-By-Date.sql | Count journal headers and lines in a selected date range |
| read | Count-Transactions-By-Date.sql | Count staff workspace transactions separately from posted journals |
| read | Check-Journal-Balances.sql | Identify unbalanced or invalid posted journals; healthy result is empty |
| read | Check-Database-Size.sql | Show database and table/index storage sizes |
| delete | Preview-Journal-Deletion-By-Date.sql | Preview complete journals, line counts and blockers |
| backup | Export-Journal-Backup-By-Date.sql | Export selected journal headers, lines and posting receipts |
| delete | Delete-Journals-By-Date-After-Backup.sql | Remove the unchanged, backed-up eligible journals |
| delete | Preview-Draft-Transaction-Deletion-By-Date.sql | Preview unposted staff transaction lines and blockers |
| backup | Export-Draft-Transaction-Backup-By-Date.sql | Export selected staff transaction rows |
| delete | Delete-Draft-Transactions-By-Date-After-Backup.sql | Remove eligible unposted transactions; retain report headers |

For removal, use **Preview → Export → save the full JSON backup outside Supabase → Delete**, with identical dates. Keep your full application archive and Auth/Storage backups as well. In Delete, replace `NOT_CONFIRMED` with `I_SAVED_THE_BACKUP` only after saving the exported file. This is the only additional confirmation value; no record IDs or SQL logic need editing.

The delete function refuses changed backups, partial editor groups, partial posting batches, linked records, approved staff reports, closed periods and year-closing balances. Journal deletion also refuses earlier history when later posted journals remain. Preserving later balances while removing their earlier source history requires a verified carry-forward migration, not a raw date delete. These restrictions are shown in Preview.

Deletion keeps identifiers, sequences, posting receipts and audit history. Removed posting requests are marked so a retry cannot recreate deleted journals. Application trigger states are restored, and failure rolls back the entire removal. The private temporary backup copy is cleared after successful removal; its fingerprint and deletion metadata remain. Your saved external JSON is then the copy needed for recovery. Counting and preview scripts do not delete anything.

Refresh the website after SQL edits. Use the app's existing review, void, archive and reset workflows for linked/finalized records. For ownership, login emails, passwords and permissions, use Installation & Handover or Users & Permissions; company-contact editing does not transfer service accounts. The complete operating protocol will describe those workflows separately.
