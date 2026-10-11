# v143.41 — prepared workspace, idle synchronization and monthly history

After authorization the sidebar remains visible while the permitted daily records are prepared. Progress and Retry appear above the account card. Journal/payroll snapshots are reused on subsequent sign-ins; automatic revalidation waits for two minutes without pointer, keyboard, touch or scrolling activity. Website-file readiness remains distinct from record readiness.

Automatic record queues pause between atomic records on renewed activity, retaining their original references and receipts. Manual Sync now bypasses the idle gate. Server-required posting, approvals and closing keep their existing authorization checks. Activity is shared between tabs of the same account. Background checks recur while idle; browsers may throttle hidden tabs.

Bookkeeping, payroll, budget requests, completed sub-user submissions and approved report history show a selected month, defaulting to the current month when populated or the latest downloaded month. Payroll breakdowns remain open and the duplicate embedded date selector is removed. Financial reports retain quarter/year/custom options. Full underlying records and export paths remain intact.

Data-row hover coloring is removed while selected-row coloring remains. Budget history aligns with its navigation and banner. An old layout decorator is guarded for the new non-collapsible history.

Requested journal years no longer accumulate into an ever-expanding range. Returning to the working year releases temporary historical journal/payroll snapshots; the current-year copies, outboxes, receipts, recovery data and database records remain. Journal refresh checks the existing server revision and skips later pages when unchanged; a changed revision (including deletions) reloads the complete window. This is not row-level delta synchronization for every table.

Validation: simulated two-minute activity timing; durable queue pause/resume/manual override; lost-response idempotence, conflicts, actor isolation and storage errors; exact-year cache pruning; unchanged and deleted journal revisions; full app with 1,000 journals / 10,000 lines; selected-month payroll, duplicate-picker removal, startup progress, calendar and offline/reconnect regressions; release asset checks. These are local browser fixtures, not a measurement of the user's laptop or connection.
