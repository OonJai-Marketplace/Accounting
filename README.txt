OON JAI ACCOUNTING

Current source is in src/ and mapped by src/manifest.json. Edit canonical files,
then run python tools/build-modules.py and python tools/build-modules.py --check.
Preserve the application foundations in AGENTS.md.

AUDIT v143.70: docs/AUDIT-CONTINUATION.md records first-party source coverage,
repairs, dependency-review limits, verification and production rollout status.

NEW INDEPENDENT INSTALLATION
Start at setup/fresh/START-HERE.md. The numbered fresh installer is for an empty
Supabase project only. Never replay it against an existing company's database.
Public website connection settings belong in deployment-config.js; server secrets
belong in the backend service's secret store.

EXISTING INSTALLATION
Use only the forward migrations required by the installed version and the reviewed
release. A website push does not apply SQL or deploy Edge functions. Preserve
historical records, pending device work and account permissions during updates.
Do not run every SQL file in setup/ or apply fixture schemas to production.

MAINTENANCE
Read setup/maintenance/START-HERE.md and docs/MAINTENANCE-v143.24.md.
Archive/audit working copies are separate from the live company's records.

DOCUMENTATION AND VALIDATION
Versioned docs describe their historical releases; later requirements in AGENTS.md
and current source supersede older layout and loading descriptions. See docs/README.txt.
The previous root README is retained in docs/history/README-through-v14242.txt.
Validation scripts and saved results are not all current release gates. Older scripts
may use retired fixtures, release constants or behavior. Local fixture success does
not certify hosted Auth, email delivery, Storage, physical devices or production data.
