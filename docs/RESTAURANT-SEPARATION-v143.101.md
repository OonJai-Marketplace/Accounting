# Independent Restaurant project

The owner authorized a separate Restaurant Supabase project and removal of restaurant links, tables, and dependencies from Accounting. Accounting continues using its existing project; no financial data, user identity, calculation rules, or approved phone layout is migrated or redesigned.

Restaurant Back Office is published at https://oonjai-marketplace.github.io/Restaurant-Back-Office/ using its own Supabase project, dfrulsnparrouuzjbtih. The administrator profile and email identity, 78 active restaurant records, and six legacy records have been copied and verified. Legacy records remain in a private migration archive. Restaurant sign-in, recovery, staff management, and offline order storage are independent of Accounting.

This Accounting release removes the public restaurant/back-office links from navigation, deployment configuration, installation forms, and downloaded configuration. Old saved browser or installation links cannot reintroduce these destinations. Accounting account switching and eligibility checks remain available.

Database cleanup is prepared separately and must be verified before being described as complete. It removes only 18 explicitly identified restaurant tables and 20 restaurant routines, and edits seven shared Accounting routines to remove restaurant membership dependencies. The transaction checks source record fingerprints, checks the current definitions of shared routines, and verifies unchanged data in accounts, journal entries/lines, payroll employees/runs, staff journals, profiles, and user permissions. Unexpected dependencies or changed data cancel the transaction. No DROP CASCADE is used.

The exact original and reviewed shared routine definitions are preserved in validation/restaurant-separation143101-routines.json. This is a reviewed restoration record, not an instruction to run an unguarded restore. Supabase's migration history records applied database changes. Failed archive requests returned an expired request-state error; no source tables were removed by those requests.

Validation:
- Eight browser checks for independent configuration, stale saved links, account switching, current/stale eligibility responses, and browser errors.
- Eleven PostgreSQL checks for balances, directory access, manager permissions, payroll deletion protection/auditing, impersonation, inactive users, and preserved journal amounts with Restaurant tables absent.
- Existing-cache upgrade and offline reopening, including interrupted download/retry and retained drafts/pending entries.
- Canonical generated assets and phase-zero structure checks; release diagnostics refreshed.

The public web catalog remains a separate repository and is not yet managed from Back Office. Combining app folders and adding shared public content management remains a later implementation step; this release does not claim that work is complete.

## Portable installation follow-up — v143.102

The clean Accounting installer now excludes the former Restaurant objects and backup registrations, and uses the seven reviewed Accounting-only routine definitions. The refresh generator enforces this separation and the packaged verifier rejects restaurant tables/registrations. Historical installers are not part of the clean installation sequence. No live database writes were needed for this follow-up.

The actual deliverable installer passed 35 isolated PostgreSQL checks, including installation, access isolation, posting/retries, foreign-currency rates, editing/voiding, staff submissions, payroll guards, backups and maintenance.
