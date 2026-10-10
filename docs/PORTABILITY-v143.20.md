# Installation and administrator handover

The current release supports GitHub hosting and Supabase. Change public deployment values in **deployment-config.js**. This is the single public connection file used by desktop, phone and recovery. Never put a service key, database password, recovery encryption key, or personal password there.

## Existing website

1. Run `setup/INSTALL-PORTABILITY-v143.20.sql` on the existing verified database. It adds setup/handover metadata and does not change transactions or user roles. Existing companies are marked initialized, even when their transaction history is empty.
2. Open **Settings → System → Installation & Handover**. Company & Deployment edits shared company, email, workspace and repository defaults. Handover selects an existing active administrator and requires service verification. The incoming administrator must first be created in Users & Permissions.
3. Changing these details does not transfer service ownership. Invite the incoming owner in GitHub and Supabase, verify their login, configure Auth recovery URLs and function origins, authorize Gmail, then create/test their ChatGPT task and pause the previous task. Keep the outgoing administrator until access is verified; role removal is a separate explicit action in Users & Permissions.
4. Download Configuration and replace the repository's `deployment-config.js` when publishing under a different URL or repository. Browser-local workspace overrides are cleared when shared installation settings load. Refresh other open devices after changing shared settings.

The Supabase connection remains a deployment choice, outside handover saves. Pointing the website at another database does not transfer bookkeeping records, Auth users, or storage files.

## Fresh independent installation — foundation prerequisite

**The original complete server schema is not in repository history. The SQL folder contains incremental updates. A verified server schema export is required before this release can be distributed as a complete fresh database package.** Do not run every historical SQL file, guess missing functions, or include one-time cleanup/sample installers in normal installation.

The provided export tool assembles a schema-only package from the established, working database. It preserves security policies, grants, functions and triggers; it excludes company records and Auth users. It validates client function coverage and creates a checksum manifest. PostgreSQL client utilities (`pg_dump`, `psql`) must match or exceed the server major version.

Set connection values privately in your local terminal using `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` and `PGSSLMODE=require`. Use the database owner connection shown in your Supabase project. Do not paste credentials into ChatGPT, commit them, or pass them in command arguments.

```bash
python tools/portability/backend-package.py export /safe/path/fresh-backend
```

Create a new Supabase project. Change the private PG environment variables to the **new empty target**, then run:

```bash
python tools/portability/backend-package.py install /safe/path/fresh-backend
```

The installer checks checksums, refuses a target with existing public tables and restores in one transaction. This package still requires a disposable-project restore and full acceptance test before final distribution. Schema validation alone does not prove financial behavior.

Create and confirm the first administrator in the new project's Auth dashboard, then edit/run `setup/portable/BOOTSTRAP-ADMIN.sql` with that user's UUID. On first sign-in, the website detects the persisted uninitialized installation and prompts for company details. A missing service, offline read or empty transaction list never triggers new-install setup.

Copy `deployment-config.example.js` to `deployment-config.js`, enter the **new** Supabase URL/public key and GitHub repository/website links, then publish through GitHub Pages. Add the website and recovery page URLs to Supabase Auth's allowed redirect URLs. Open the website, sign in and complete setup.

## Edge services

The package now includes source for `admin-create-user`, `recovery-vault113` and `admin-password14257`. The two new implementations require `setup/INSTALL-EDGE-SERVICES-v143.20.sql` and the existing complete foundation, including `private.password_reset14257` and `admin_save_access14281`.

Deploy the new source to a staging project first. **Do not overwrite an established recovery service until its original encrypted data/export format has been backed up and its matching implementation/key has been obtained.** The bundled replacement uses AES-256-GCM and its own versioned storage; it cannot read unknown historical encryption formats. Keep original emergency recovery instructions until staging restore and unlock are verified.

Server secrets:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (platform supplies these for hosted functions).
- `APP_ORIGINS`: comma-separated allowed website origins (scheme + host, without repository path). `APP_ORIGIN` is supported for the existing password handler.
- `RECOVERY_VAULT_KEY`: a separately generated, base64 encoded 32-byte random key. Keep a separate offline copy; never place it in the browser configuration or GitHub.

```bash
supabase functions deploy admin-create-user
supabase functions deploy recovery-vault113
supabase functions deploy admin-password14257
```

JWT gateway verification is disabled in `supabase/config.toml` because each handler verifies the token itself. Administrator operations also check current server roles. Recovery unlock requires the administrator's current password, limits attempts, issues an expiring actor-bound ticket, and never stores plaintext recovery details.

## Required acceptance test before the final ZIP

- Fresh disposable project: restore the actual exported foundation, bootstrap the admin, complete first setup, refresh, then confirm setup does not recur.
- Different GitHub owner/repository path: desktop, phone, recovery, offline reload and shared workspace links.
- Temporary accounts: create a user, retry a lost response, change temporary password, grant/revoke permissions, then remove test users using supported workflows.
- Temporary records: balanced/rejected journals, submissions/review/finalization, payroll/attendance/leave, budgets/templates/deletion, vouchers, reports, archive/export/reset. Verify security using an unauthorized account as well as an administrator.
- Incoming-owner login, Gmail delivery, recovery email, recovery vault save/export/restore, ChatGPT task and GitHub publication.
- Physical phone/tablet keyboard, print dialogs and multiple simultaneous users.

The desktop canvas scales down on narrow desktop windows and up on larger windows, capped at 150%; extra-wide displays use the remaining room. Phone/tablet layouts keep their established behavior. Print retains its original page dimensions.

## Running the included local checks

Install Playwright plus a Chromium binary and PGlite in a local development environment. The suites use temporary fixtures; they do not connect to the production database. Set `CHROMIUM_PATH` (and `CHROMIUM_EXECUTABLE` for the existing phone-control suite) to your browser binary, and `PGLITE_MODULE` to your PGlite module when it is outside standard module resolution. The Edge handler tests require Node 24's TypeScript stripping support.

```bash
node validation/test-portability-browser14320.cjs
node validation/test-portability-db14320.cjs
node validation/test-edge-services14320.cjs
python validation/test-backend-package14320.py
```

A schema-only export of `public` and `private` does **not** export Supabase platform settings, Auth accounts, Storage buckets/files or policies on `storage.objects`. It also excludes table rows used as runtime singleton state. Recreate the required private buckets and their access policies, Data API pre-request hook configuration, and schema-required singleton defaults in the new staging project before running acceptance tests. Obtain these definitions from the verified source project; do not loosen upload policies or seed company records to bypass missing setup. This is another reason the export tool alone is not a certified complete backend installer.
