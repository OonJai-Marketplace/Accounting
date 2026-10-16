# Accounting app-wide audit — v143.100

2026-10-16. Baseline: `9e2ae25afbd91a2c7018f765c8e49f7c05f72333` (v143.99).
Requested scope: the entire Accounting web app, including debugging and removal
of unrelated or obsolete code. This extends the earlier bookkeeping review.

## Scope and method

The repository inventory covered all 1,622 baseline files, source/build ownership,
entrypoints, database scripts, dependencies and validation tooling. Targeted code
review concentrated on authentication, permissions, offline state, dates,
accounting calculations, installer contracts and cleanup candidates. This is not
a claim that every line received an independent semantic review.

All 57 permitted workspace targets were exercised online and offline. Focused
fixtures cover accounts/sub-accounts/mapping, opening balances and closing,
journals and foreign funds, staff workspaces/review, HR/calendar/leave, payroll,
budgets, tax defaults, financial reports, document editing/export, settings,
backup/recovery, permissions and updates. The final source map has 587 canonical
modules and 356 generated outputs, with no unowned sources or duplicate mapped
source inclusions.

Hosted database access was read-only. No company records, chart of accounts,
saved settings, database policies or restaurant data were modified. Browser
write tests use synthetic records; SQL acceptance uses isolated PGlite databases.

## Confirmed repairs

| Finding | Result and regression evidence |
| --- | --- |
| Delayed profile/access responses could apply to a replacement session or client. A superseded hydration could also clear the replacement profile. | Capture client, session generation and request generation. Discard stale success/error completions; coalesce only matching access checks. `test-app-integrity143100.cjs` covers replacement clients, sessions and newer requests, including stale denial. |
| Several date and period defaults used UTC, selecting yesterday or last month after local midnight. | Shared `appLocalDate` uses the device calendar day. Updated affected payroll, tax, report, opening-balance and staff-entry defaults. Saved timestamps remain UTC and existing records remain unchanged. `test-civil-date143100.cjs` reproduces the Lao month-boundary case. |
| The standalone phone showed an unsolicited reconnect dialog before an offline user could re-enter their saved password. | Empty locked sessions now show the login form. Vault password verification still controls access. Real-SDK browser checks verify offline desktop/phone reauthentication and retained encrypted drafts. |
| A persistent background warning could intercept clicks on Sign Out and other confirmations. | Explicit confirmations stack above notifications, preserving the underlying warning. `test-confirmation143100.cjs` reproduces the original blocked click and verifies desktop/tablet operation. |
| Dormant demo authentication retained sample credentials and local privilege-granting code. | Removed demo credentials, storage writers and local authentication implementation. Kept only the compatibility state/bindings consumed by current live modules. Legacy submission names now resolve against live profiles. |
| The Accounting permission module retained an unused restaurant recipe viewer and POS-only permission branch. | Removed the unused RPC caller, rendering/state/exports, CSS and obsolete scanner exclusion. Reference scans found no Accounting consumers. Shared restaurant database routines remain untouched. |
| Fresh installations lacked current foreign-currency, durable journal change/receipt, fund-tracking and carry-forward contracts. | Reassembled reviewed forward SQL inside the guarded empty-database installer. Added dynamic RPC contracts to verification and derive the package release from the application. The expanded suite checks 34 isolated installation/authorization/transaction cases, including rate-preserving edits, idempotent edit/void receipts and stale revisions. |
| A live-targeting SQL test depended on a specific company user and trial records. | Removed `test-bookkeeping-live14399.sql`; retained and extended isolated acceptance tests. |

Versioned compatibility modules are still active in the ordered classic-script
application. Their age/name alone does not make them safe to delete. Required
wrappers, migrations, vendor licenses and previously approved UI foundations
remain in place. No layout redesign or payroll-rule change was made.

## Reproducible verification

Run from the repository root with Node/Playwright, Chromium and PGlite 0.5.10
available. Set `CHROMIUM_PATH` and `PGLITE_MODULE` if they are not at the defaults
described in the runner:

```sh
python validation/run-accounting-audit143100.py
python tools/build-modules.py --check
python validation/test-phase0-structure.py
python tools/refresh-release-manifest.py --check
python tools/audit-repository.py --output /tmp/accounting-inventory.json
git diff --check
```

`validation/accounting-audit143100-results.json` records each current suite's exit
status. The final release run passed **42 of 42 suites**, including 34 isolated
fresh-backend checks and 57 workspace targets in each connectivity mode.
The runner uses no hosted credentials, runs the browser clock/session
fixture separately to avoid navigation races under concurrent Chromium load,
and returns a failure if any suite fails. Its gate includes all-target navigation,
SDK/vault lifecycle, sync and retry recovery, owner/client isolation, payroll and
leave calculations, seven A4 financial report formats, document exports,
permissions, budgets, foreign currency, closing and fresh installation.

The update fixture starts with the actual v143.99 service worker, tests normal
upgrade and interrupted-download retry, and checks local drafts, pending IndexedDB
entries, retained old caches and offline reopening. Both desktop and phone release
identifiers and changed-asset URLs advance to v143.100.

Four historical UI scripts do not represent the current release gate:

| Historical script | Why it is unsuitable unchanged; current coverage |
| --- | --- |
| `test-settings-storage14335.cjs` | Expects a retired menu label and a single-button connection dialog. Current all-workspace and sync/cache/recovery fixtures cover these areas. |
| `test-hr-completion14307.cjs` | Its fake auth SDK lacks `refreshSession` and its UI assertions predate Reload Records. Current workforce/report fixture and calendar model checks cover calculation, approval and output behavior. |
| `test-report-workflow14349.cjs` | Expects removed inline row actions. `test-return-current14399.cjs` exercises the current entry menu. |
| `test-phone-freeze14250.cjs` | Uses an outdated SDK double and an older connected-phone surface. Current phone cache, idle-sync, real-SDK lifecycle and recovery checks cover the standalone phone. Physical-device visual checks remain separate. |

These scripts were not counted as passing. Their remaining assertions may still
be useful when migrating historical test coverage; the current gate is explicit
rather than blindly running every version-specific test.

## Read-only production observations and remaining work

Aggregate consistency queries returned **zero** non-finite journal amounts,
non-finite staff-journal amounts, unbalanced posted currency groups,
payroll-status mismatches, and public tables without RLS. These are bounded
invariants, not a reconciliation of every historic transaction against receipts.

Supabase advisors still report the following shared-project items. Counts are
findings, not proven exploitable vulnerabilities or measured bottlenecks:

| Advisor group | Count | Disposition |
| --- | ---: | --- |
| Mutable function search paths | 5 | Needs a targeted function-body/dependency review, including restaurant routines. |
| Anonymous executable security-definer functions | 2 | Pre-request/password hooks; do not revoke blindly and break authentication. |
| Authenticated executable security-definer functions | 142 | Many are the intended guarded RPC API; grants alone do not establish a defect. Individual authorization review remains necessary. |
| RLS enabled without policies | 6 | Includes private/recovery/provisioning tables. No-policy RLS is deny-by-default; do not add public policies merely to silence the advisor. |
| Unsupported registry type | 1 | Internal workspace-hook configuration uses `regprocedure`; portability review remains. |
| Leaked-password protection disabled | 1 | Hosted authentication hardening remains open. |
| Unindexed foreign keys | 118 | Requires workload/query-plan evidence before adding indexes. |
| Per-row auth policy evaluation | 33 | Potential performance work; preserve authorization semantics when changing policies. |
| Multiple permissive policies | 45 | Review intended OR semantics and query cost before consolidation. |
| Unused indexes | 5 | Statistics alone are insufficient grounds for dropping indexes. |

No blanket grant, policy, function or index changes were applied to the shared
hosted database. Hosted email/OAuth delivery, real Safari/iPad/phone gestures,
printer output, and production performance under sustained load are not certified
by Chromium fixtures or isolated PostgreSQL tests. The audit fixes the reproduced
defects above and leaves this follow-up work visible.
