# Installation and administrator handover

The current release supports GitHub hosting and Supabase. Change public deployment values in **deployment-config.js**. This is the single public connection file used by desktop, phone and recovery. Never put a service key, database password, recovery encryption key, or personal password there.

## Existing website

1. On the existing v143.21 database, run `setup/INSTALL-BACKEND-AND-MAINTENANCE-v143.22.sql`. It fixes the setup routine and adds owner-only maintenance tools while preserving records and roles. Earlier historical upgrades remain a separate existing-site process; the clean installer is only for a new project.
2. Open **Settings → System → Installation & Handover**. Company & Deployment edits shared company, email, workspace and repository defaults. Handover selects an existing active administrator and requires service verification. The incoming administrator must first be created in Users & Permissions.
3. Changing these details does not transfer service ownership. Invite the incoming owner in GitHub and Supabase, verify their login, configure Auth recovery URLs and function origins, authorize Gmail, then create/test their ChatGPT task and pause the previous task. Keep the outgoing administrator until access is verified; role removal is a separate explicit action in Users & Permissions.
4. Download Configuration and replace the repository's `deployment-config.js` when publishing under a different URL or repository. Browser-local workspace overrides are cleared when shared installation settings load. Refresh other open devices after changing shared settings.

The Supabase connection remains a deployment choice, outside handover saves. Pointing the website at another database does not transfer bookkeeping records, Auth users, or storage files.

## Fresh independent installation

The original schema and backend routines have now been recovered and consolidated. **The complete clean installer is `setup/fresh/001-Install-Empty-Database.sql`.** No source-database export or historical repair sequence is needed for a new installation.

Follow `setup/fresh/START-HERE.md`, then run numbered files 001, 002 and 003. File 001 includes all current backend definitions, initial reference/settings rows, private bucket policies, Data API request gate and owner-only maintenance tools. File 002 explicitly bootstraps the first confirmed Auth administrator. File 003 checks frontend RPC coverage and access protections.

The portable ZIP uses an empty deployment configuration for your new Supabase project and GitHub repository. Copy all its frontend folders into the new repository and configure the public values using setup.html. Complete the hosted Auth, Edge, email and upload checks after connecting the new account. Local PostgreSQL verification does not exercise those hosted transports.

`tools/portability/backend-package.py validate setup/fresh/001-Install-Empty-Database.sql` checks the packaged contracts. Its `install setup/fresh` command verifies the checksums and executes file 001 through your private PG environment connection. The SQL Editor route requires no local PostgreSQL tools. The older export command remains an advanced schema-export utility; it is unnecessary for this new package.

## Edge services

The package now includes source for `admin-create-user`, `recovery-vault113` and `admin-password14257`. The fresh installer includes their tables, service-only routines, `private.password_reset14257` and `admin_save_access14281`. Existing sites retain their separate forward-update route.

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

## Verification and remaining hosted checks

The new clean package is tested against an independently empty local PostgreSQL engine with pgcrypto. The test executes the delivered SQL, validates every routine body, bootstraps a temporary Auth profile, completes company setup, posts balanced/rejected journals, tests idempotent saves, payroll/budget guards, staff submission/final approval, archives, permissions and backed-up deletion. Results are recorded in `validation/fresh-backend14322-results.json`.

After installing under your new accounts, check real Auth recovery/email, the three deployed Edge functions, vault save/unlock, Storage uploads and a different GitHub Pages repository path. Gmail authorization, ChatGPT scheduled tasks, physical-device keyboard/print behavior and concurrent hosted users are outside the local database test.

The desktop canvas scales down on narrow desktop windows and up on larger windows, capped at 150%; extra-wide displays use the remaining room. Phone/tablet layouts keep their established behavior. Print retains its original page dimensions.

## Running the fresh-package local check

The ZIP includes the actual fresh-install PostgreSQL test and its Auth/Storage platform fixture. It does not connect to production. Use Node 24 and install `@electric-sql/pglite`, then run:

```bash
node validation/test-fresh-backend14322.cjs
```

The current source repository also contains the older frontend and Edge regression suites; their local fixtures are development tools, not installation scripts. The ZIP contains the latest fresh-backend result in both validation and docs.

The bundled clean installer includes the required Storage bucket rows/policies, singleton state and composed Data API request hook. An optional generic pg_dump schema-only export does not include those platform/configuration rows by itself. Auth users, Storage file bytes, Edge deployment/secrets, SMTP and service-account ownership remain external installation steps.

The SQL maintenance templates are separated into add, edit, read, backup and delete folders. See `setup/maintenance/START-HERE.md`; they are owner-only and do not loosen browser permissions.
