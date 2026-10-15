# Fresh installation

This folder contains the complete backend for a new, independent Supabase project. Use the numbered files here; do not run the historical upgrade files or cleanup scripts.

1. Create a **new Supabase project**. In its SQL Editor, run the entire **001-Install-Empty-Database.sql**. It installs tables, current routines, constraints, identities, numbering sequences, permissions, RLS, triggers, private Storage buckets/policies, initial settings and maintenance tools in one transaction. It refuses existing application schemas. It installs no bookkeeping records or demo users.
2. In Supabase Authentication, create and confirm your first administrator's email. Copy that user's UUID. In **002-Create-First-Administrator.sql**, replace only the UUID in the declaration and run the file. Ordinary signups remain submitters; this explicit bootstrap creates the first administrator.
3. Apply `../INSTALL-FOREIGN-CURRENCY-v143.83.sql`, followed by `../COMPATIBILITY-FX-v143.83.sql` (required rate columns and rate-preserving routines), then `../../supabase/migrations/20261015121608_journal_durable_changes14385.sql`, then `../../supabase/migrations/20261015122604_journal_recovery_receipts14385.sql`. These additive Phase 1 routines are required by v143.85. Then run **003-Verify-Installation.sql**. It checks every frontend RPC contract and key access protections. It reports the required private buckets as well.
4. Maintenance inspection and the mandatory closing review are included in file 001. **004-Install-Maintenance-Audit.sql** remains available for older v143.22 installations; a new installation does not need to repeat it.
5. Deploy the three folders under `supabase/functions`: **admin-create-user**, **admin-password14257**, **recovery-vault113**. Preserve the bundled `supabase/config.toml` settings. Set **APP_ORIGINS** to your published site's origin, e.g. `https://new-owner.github.io` (no repository path). Set **RECOVERY_VAULT_KEY** to a new base64-encoded 32-byte random key and retain an offline copy. Hosted Supabase supplies the Supabase service environment variables. Server secrets never belong in the website or repository.
6. Open **setup.html**, enter your new project's public URL/key and new GitHub repository/site URL, then download and replace **deployment-config.js**. The portable ZIP starts with an empty connection file. Keep every web asset and folder in the repository; host the repository root through GitHub Pages. No Node build is needed for this static frontend.
7. In Supabase Auth URL Configuration, set your published website as Site URL and allow the exact `recovery.html` URL under that repository path. Set up SMTP/recovery email delivery for your account. Disable public account creation if you only intend administrators to create staff.
8. Sign in and complete the website's first-install company form. The saved installation state controls this prompt; an empty transaction list never resets setup. Then check actual email recovery, user creation, temporary-password change, vault save/unlock and file uploads on your new hosted project.

The SQL supplies database objects and Storage bucket access rules. Supabase Auth accounts, hosted Edge deployments/secrets, SMTP and third-party account authorizations are configured through their own services. GitHub and Supabase service ownership are separate from the website's administrator role.

The installer was independently restored into an empty local PostgreSQL engine with pgcrypto and tested using temporary records. Local tests do not emulate the hosted Auth/email, Edge gateway or Storage HTTP services. Finish those real connection checks before entering actual bookkeeping data. The full operational and handover protocol is a separate deliverable.

For SQL maintenance, see `../maintenance/START-HERE.md`. Its installer is already included in file 001.

Official references: [SQL functions](https://supabase.com/docs/guides/database/functions), [Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Edge function secrets](https://supabase.com/docs/guides/functions/secrets), [function configuration](https://supabase.com/docs/guides/functions/function-configuration).

## Current backend and older installations

File 001 includes the reviewed backend updates through v143.70, including maintenance, paged year windows, reconciliation, returned submissions, report posting and statement-cached permission checks. File 004 is retained for older installations that predate the maintenance update. Never replay file 001 against an existing project. See `../../docs/MAINTENANCE-v143.24.md` for maintenance coverage and use.
