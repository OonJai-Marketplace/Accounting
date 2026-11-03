# Sync, report preparation and History corrections — v143.267

Sync shows an explicit successful result and time. The completed action is disabled;
Details retains Check for new data. Pending work, incomplete downloads and failures
remain distinct from success. Routine token renewal requests idle synchronization
instead of forcing a refresh while a user reads another report.

Startup prepares all permitted daily modules and a complete posted-report copy.
The copy uses the existing account/workspace-scoped offline snapshot store and
revision-checked pagination. Rechecking an unchanged full copy downloads only the
first page to verify the revision. Report types and month filters reuse this data;
identical journal objects do not invalidate it. Obsolete period fetches are aborted,
only the selected report may render on completion, and the shared Processing
indicator covers the request. Rendered reports are reused while inputs are unchanged.
AI inbox discovery remains manual.

History print decoration recognizes both summary and expanded header cards;
personal records expose their saved report identity. Existing export/owner checks
and approved-report snapshots are retained. Memo wrapping overrides the global
single-line table rule and gives personal descriptions room to grow vertically.
The scrolling header is unchanged. No database schema or financial records changed.

Validation:

- test-report-window143195.cjs: all six report calculations remain equivalent to
  full-journal calculations across months, multiple years and selected periods.
- test-report-preparation267.cjs: complete paginated download, persistent reuse,
  revision checks, cancellation, active-view priority and progress cleanup.
- test-startup-preparation267.cjs: readiness waits for reports and daily data;
  manual AI inboxes are excluded.
- test-sync-feedback267.cjs: success/time, busy, failed refresh, retry, account
  isolation, and no immediate refresh after token renewal.
- test-history-print267.cjs: both History presentations, immutable report routing,
  owner/export restrictions, phone restriction and duplicate-control prevention.
- test-subuser-cashbook260.cjs: existing cashbook format, receipts, currencies,
  fund transfers, summaries, signatures and main-journal printing stay unchanged.
- Supported browser preview with synthetic History data: both Print actions
  present; main History opens the cashbook preview. Long memo cells expanded to
  148px and 134px with scrollHeight equal to clientHeight and full end text visible.

Physical iPad Safari, the user's live session, and live-database download latency
were not verified by these synthetic checks. The first complete preparation may
still take time; subsequent report navigation does not request the same data again.
