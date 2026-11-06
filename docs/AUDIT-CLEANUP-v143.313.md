# Audit cleanup — 6 November 2026

Bookkeeping logs now save important corrections, warnings, voids, deletions and reopened periods. Normal posting, creation, linking, approvals and routine period closing are not saved. Administrator-assisted activity is unchanged.

Administrators can delete one log, every log for the selected record, a month, quarter, year or all Bookkeeping logs. The dialog previews the current count and requires one Delete action. Changed server records require a refreshed preview. Cancel does not show an irrelevant unsaved-edit prompt. This destructive action requires an online connection and active administrator access in the own-account workspace. Period boundaries use Laos local time.

The new cleanup bypasses legacy journal purging only within the guarded transaction. Number reservations survive log removal. Legacy queued audit operations retain their separate behavior.

## Validation

- `test-audit-cleanup313-db.cjs`: repeat installation; routine/important classification; record, entry, month, quarter, year and all scopes; timezone boundary; changed-preview rejection; active administrator access; anonymous rejection; preservation of voided journal headers, lines, payroll, assisted activity and numbering.
- `test-audit-cleanup313-browser.cjs`: actual controls, count previews, cancellation, quarter/year choices, error recovery, row menus, individual deletion and refreshed empty state. Uses synthetic records.
- Existing audit pagination, offline audit and release checks.
- Hosted database installer applied successfully. Explicit cleanup removed 197 audit logs and zero deletion archive logs. All 129 administrator-assisted records remained. Exact content hashes of journal entries/lines, payroll runs/lines/employees/leave/settings, accounting periods and assisted activity matched before/after in the same transaction; a mismatch would have rolled back.

No live financial records were posted, edited, voided or deleted. Deployment verification is completed after publication.

Database advisory review: the new RPC intentionally uses SECURITY DEFINER so it can perform the guarded cleanup. Anonymous execution is revoked; active-admin, own-workspace and password-change checks run before any access. Permission tests cover rejected callers. The generic authenticated-function advisory is expected for this design ([Supabase explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)); no other new findings appeared.
