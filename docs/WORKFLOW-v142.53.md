# v142.53 — nine requested changes

## Website changes

1. Review keeps every submitted line. After final approval, journal preparation groups eligible unposted transactions by account, currency and debit/credit side into one journal entry for the reporting month. The posting date defaults to month-end and is editable within that month. General Description uses the selected report type names and reporting month/year. Line Memo / Reference contains an account summary, submitter name and report ID.
2. The specific weak-connection warning is routed to the existing signal/connection details instead of opening a blocking status popup. Offline write restrictions, queued draft protection and other error messages remain enforced.
3. Administrator phone Home omits the long assigned-fund list; staff Home retains its funds.
4. Phone Accounts has Drawings, Expenses, Assets, Liabilities, Equity, Revenue and System categories. Category selection opens only permitted accounts, which still open their existing month/quarter/year ledger.
5. Phone account selection has category tabs below search. Account-assignment editors also have category/search controls, without changing selected permissions.
6. Add/Edit Account includes System. It retains a real underlying accounting classification and a non-regular system purpose. Drawings remain equity in the ledger; existing drawing/withdrawal names are grouped for display.
7. Input focus glow/extra outline is removed, retaining normal field borders. Buttons and controls retain their independent focus behavior.
8. Users & Permissions has Edit, Deactivate/Reactivate and Delete controls on all layouts, with active/inactive views. Existing password reset remains available. Deactivation blocks Auth sign-in and removes sessions. Login deletion preserves a historical profile identity, report snapshots, transaction rows and source links. Users with retained activity must have been inactive for five years; unused accounts can be removed sooner. Self-removal, the last active administrator and unresolved reports are protected. Unknown non-Auth foreign-key dependencies block deletion instead of cascading into records. The original name/email are retained in a historical identity snapshot; the profile email is replaced with a retired placeholder so it cannot collide with a future login.
9. Shared Report Types are managed inside Users & Permissions. Administrators can add, rename, deactivate and reactivate types. Submitters select one or more; names are copied into the submission so later renaming does not rewrite historical reports. Submitted type selections are locked.

## Required database installation

The website code alone cannot install PostgreSQL functions or change Supabase Auth records. This session had repository access but no database administration connection. The migration was tested locally; **it has not been run against the live database**.

1. In the existing Accounting Supabase project, open SQL Editor using the project administrator account.
2. Run `setup/INSTALL-WORKFLOW-v142.53.sql` in full. It requires the existing v142.28 security and v142.29 organization installation. It is additive, transaction-wrapped and repeatable; it does not delete any financial records.
3. Refresh the website. Open Users & Permissions → Report Types and verify the shared names.

Until installation, Report Types management, typed report submission, summary posting and user lifecycle actions display a setup-required message and do not perform incomplete writes. Existing approved source reports and financial records remain unchanged.

The migration deliberately detaches only the profile-to-Auth foreign key, allowing a login to be deleted while all historical foreign keys to the profile continue to exist. Existing inactive users start their recorded deactivation period at installation because their previous deactivation dates are unknown. New source-link foreign keys restrict destructive removal of linked records. Do not drop those links to force an archive/reset; include the new `journal_sources14253` and `report_types14253` tables in any future full-database export/restore plan. Existing application archive tools have not been extended to restore these new tables in this release.

## Summary integrity

The server independently derives every expected summary amount and exact source-ID set from the approved report; client totals alone are not trusted. It checks final review authorization, the immutable original lines, reporting month, open period and currency balance. One transaction creates the journal and all line/source links. Exact retries return the same journal; changed retries or duplicate attempts are rejected. Already-linked entries and report-only collections are excluded. Original dates, amounts, memos, references, entry numbers and submitter identity remain stored.

## Validation

- Isolated PostgreSQL through PGlite: tampered amounts/references, exact source links, retries, incorrect month, changed approved details, permission denial, lifecycle eligibility and unknown Auth references.
- Phone browser: administrator/sub-user access regression, categories, detailed keyboard behavior, typed submission labels, System editor and lifecycle controls.
- Desktop browser: summary journal preparation and outgoing posting payload, account assignment search/category interaction.
- Phone, desktop and tablet online/offline reopening checks.
- JavaScript syntax and diff-whitespace checks.

Tests use local fixtures and do not create, approve, post, deactivate or delete real user data. PostgreSQL tests use `PGLITE_MODULE` (the local test installation was `/tmp/oonjai-db-test/node_modules/@electric-sql/pglite`). Browser tests use the existing `PLAYWRIGHT_MODULE` / Chromium fixture setup.
