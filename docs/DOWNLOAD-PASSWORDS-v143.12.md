# Database password recovery v143.12

Encrypted-download recovery history now uses the existing Supabase database instead of browser storage. Each record contains the signed-in owner's ID, a stable record ID, filename, selected format, recoverable password, preparation date, and database save date. Passwords remain visible in Document Editor → Settings as requested.

## Activation

Run `setup/INSTALL-DOWNLOAD-PASSWORDS-v143.12.sql` once in the existing Supabase project's SQL Editor. This creates a dedicated table and its row-level policies; it does not alter financial, HR, or other existing records. The application update cannot create this table through the public client. The migration has not been applied to the live database by this release.

Only active users with Document Editor export permission can insert or read their own records. Anonymous users cannot access the table, and administrators do not receive access to other users' passwords through this feature. Client UPDATE and DELETE are not granted. Passwords are recoverable values, not hashes; database administrators can access them. The new table does not feed public news files, general audit payloads, or client backup exports.

## Save and recovery behavior

- A protected download starts only after the database confirms its password record. Offline, missing setup, denied access, or failed writes stop the download with an actionable message. Ordinary unencrypted downloads remain available without this password-table dependency.
- Opening Download Settings or making a protected download transfers this account's old browser history to the database. Browser records are removed only after every entry is confirmed. Retries use stable IDs and verify existing values, so partial transfers cannot overwrite an old password or silently duplicate history.
- Settings retrieves records from the database, including on another device signed in to the same account, and loads all result pages. Nothing depends on a browser-local password cache after transfer.
- Account changes during requests prevent download completion and remove a previous account's visible password list. The database separately enforces ownership against the authenticated identity.
- Records represent prepared downloads; the browser cannot verify the operating system's final save. Encryption remains an AES-256 ZIP containing the selected document format.

## Validation

All 12 deployed-browser navigation/document checks passed with the database-backed history mock. Seven focused persistence checks passed: write acknowledgement before download, recovery on a fresh device, failed/missing database blocking, interrupted migration with duplicate prevention, account isolation, account switching during a write, and history pagination. Results are in `validation/download-passwords14312.json` and `validation/navigation-documents14311.json`.

These use database fixtures, not the live database. SQL policies were reviewed against the repository's existing profile and permission functions; they still require installation in Supabase.
