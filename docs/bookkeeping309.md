# Bookkeeping review — 6 November 2026

Reviewed releases 143.304 through 143.308 and their five successful Pages deployments.
The existing deployment jobs each finished in under one minute. Database health
advisories were empty. These observations do not measure the user's device latency.

Removed redundant Reconcile rendering on navigation and its unrelated payroll load;
coalesced concurrent reconciliation record reads; bounded repeated legacy mismatch
checks to one minute or a new journal revision. Legacy counts remain unconfirmed
unless the existing fresh snapshot and save validations succeed. Normal saving,
posting and month closing still use fresh authoritative database validation.

Plan notification navigation previously entered Upcoming twice and each cached
plan load rebuilt both plan sections and refreshed the notification list. It now
enters once, retains cached DOM, and marks the notice read only after opening the
requested plan. The database returns a read-only previous-month warning with the
list so the reason is visible before posting.

All future amortization now requires explicit posting. Removed the daily worker
job and period-change trigger, disabled the legacy worker, constrained automatic
posting off, and normalized old-client saves to manual plans. Existing first-day,
permissions, amount, prior-month, closed-year and idempotency checks remain intact.
Removed only the obsolete SCH260001 Wi-Fi schedule through its audited deletion
function; existing journal history is retained. No journal was posted in testing.

Validation: synthetic PostgreSQL plan migration/manual posting/idempotency tests;
Reconciliation 305/306 database and current 306 DOM suites; Bookkeeping 309 DOM and
request-count tests; amortization allocation/order; payroll equal PIT/preparation/
report overview; grouped notifications; stalled-update retry tests. Historical 305
DOM suite has an obsolete ISO date-label assertion superseded by 306's date labels.
Full Chromium tests were unavailable because this executor disallows its local
socket creation. No physical iPad/Chromebook timing claim is made.

Publication integration: the concurrent payroll 143.309 release was preserved.
Final Bookkeeping release is 143.310; payroll summary/conversion regressions rerun.
