# Login preparation and idle-sync follow-up — 2026-10-13

Baseline: `06e63b337dac6bc14e9d18f18283db87006330b6`. Development branch only.

## Findings and corrections

Downloading records does not eliminate the JavaScript and layout work performed
on navigation. The desktop and tablet configurations share the desktop bundles.
This follow-up found two independent kinds of unnecessary work:

* Incomplete preparation and duplicate reads: legal documents, schedules, audit
  records (including assisted-account/deletion records), legacy submissions,
  review inbox, and branch summary were outside the original six-stage preload.
  Several older navigation wrappers reloaded them independently. Preparation now
  awaits these permitted datasets and existing workflow initialization before
  reporting ready. Complete audit snapshots use the existing actor-partitioned
  durable cache; ranged audit requests are deliberately excluded from the generic
  HTTP cache. Successful stages are reused; errors stay retryable. Review,
  audit and upcoming navigation no longer initiate redundant dataset loads.
* Navigation decoration: `navigation-workflow14316.js` repeatedly cloned button
  subtrees to read labels, read each label twice, and rescanned category buttons
  for each shortcut. It now reads equivalent text directly and indexes category
  buttons once per synchronous pass. Nothing is cached across permission or data
  changes. Badge nodes, labels, ordering and keyboard shortcuts are retained.

Automatic workflow refresh on window focus bypassed the idle policy. It now uses
startup's idle/manual coordinator. Assigned-ledger focus/poll refreshes require
idle permission, stop before subsequent reads when activity resumes, and retain
complete prior rows while paused. Explicit period changes and manual refresh
still work immediately. A response revoking all ledger grants clears prior rows.

Startup refresh rechecks idle permission between stages. Every later idle cycle
can refresh prepared server data, avoiding permanently stale records after the
navigation reloads are removed. Manual Sync still drains queues and refreshes
prepared datasets, and now refreshes visible assigned ledgers. Unchanged sync
status text no longer replaces DOM text and wakes unrelated observers.

No accounting calculations, approved CSS/layout, authentication, permissions,
24-hour inactivity policy, draft formats, cache partitioning or database schemas
were changed. Tests use local synthetic data; no real Supabase data was modified.

## Boundaries

This prepares the existing permitted datasets and date windows. It does not
materialize every possible historical period, selected user's ledger, document,
modal or filtered report into the DOM. Those explicit operations retain their
necessary reads. The existing one-time upcoming-checklist initialization is
preserved on first use (one setup RPC and its readback); it is not removed to
improve request counts. Security/session maintenance and local draft persistence
remain active. A request already in flight is allowed to finish; subsequent
automatic batches wait for inactivity.

The first preload-only benchmark did not improve overall navigation. Rendering
and observers remain material costs. The final comparison below includes the
verified label-processing correction; it is not evidence of instant navigation
or a measurement of a physical Chromebook or iPad.

## Original physical Chromebook recordings

These are the user's original files, before the development changes in this
follow-up. Different routes, observation lengths, and many superseded clicks
prevent treating them as a controlled benchmark.

| Metric | Before corrections | After earlier corrections |
| --- | ---: | ---: |
| Navigation samples / superseded | 21 / 17 | 24 / 18 |
| Online visible median | 2250.6 ms | 1516.3 ms |
| Offline visible median | 2411.3 ms | 1492.6 ms |
| Online responsive median | 8216.3 ms (3 complete) | 2113.8 ms |
| Offline responsive median | No completed samples | 2645 ms (3 complete) |
| Online input-delay median | 70.6 ms | 174.8 ms |
| Offline input-delay median | 81.9 ms | 308.8 ms |
| Fetch spans | 92 | 43 |
| IndexedDB spans | 23 | 9 |
| Long animation frames | 189 over 210.7 s | 122 over 83 s |
| Total blocking / forced layout | 80153 / 11248 ms | 55335 / 4574 ms |
| Bundle 4 forced layout | 6030 ms | 3562 ms |

Raw totals above have different observation durations. Superseded responsive
measurements are incomplete, not fast or zero-latency results. Offline fetch
spans describe attempts/cache paths, not confirmed server traffic. Input delay
worsened in those recordings even as visibility improved.

Local profiling maps a prominent bundle 4 frame to the delayed scroll reset in
`src/core/navigation/shell-v113.js` (see source manifest for generated mapping).
It triggers a layout flush after other DOM changes; the recordings alone cannot
prove it created all that work. Required scroll restoration was retained. The
label/shortcut scan and account-picker callback are separately verified costs.
They affect the shared desktop runtime and are not exclusive ChromeOS defects.
Tablet layout uses the same bundles with responsive controls, not a separate
lightweight accounting implementation. Chromium touch emulation cannot establish
Safari/WebKit behavior, physical hardware differences or the real iPad speed gap.

## Final local performance results

Same desktop sequence as baseline: Settings, Bookkeeping, Sub-users, Accounts,
HR, Payroll, Dashboard; two repetitions online/offline, 137 accounts, 1,000 journal
lines and ten employees; 1440×900 Chromium, artificial 4× CPU slowdown. Each
revision has 28 trusted clicks. The responsive measurement is the existing
frame/event-loop probe, separate from first visible paint, not human perception.

| Median (lower-middle convention) | Before | Final |
| --- | ---: | ---: |
| Online visible | 792.2 ms | 758 ms |
| Online responsive | 1076.7 ms | 1062.7 ms |
| Offline visible | 729.5 ms | 812.3 ms |
| Offline responsive | 1179.8 ms | 1360.1 ms |

**This does not establish an overall speed improvement. Offline responsiveness
was worse in the final run.** Online timing improved slightly. Earlier runs also
varied substantially, including worse online responsiveness. The narrower reuse,
idle gating, no-op mutation and shortcut correctness tests pass, but these
corrections must not be represented as solving all navigation delays.

Intermediate runs are retained in `validation/preload-idle-results.json` rather
than selecting the best timing: preload-only online visible/responsive medians
839.8/1175.9 ms; initial label-draft medians 948/1575 ms. The final decorator also
suppresses unchanged writes, including the Editor title being overwritten twice.
A focused test confirms zero DOM mutations for an unchanged sync, zero navigation
subtree clones, equivalent nested label text and functioning two-step shortcuts.

Tablet configuration: 1024×768 touch/mobile viewport, effective app canvas 1280px,
no CPU slowdown, three repeats online/offline (42 trusted clicks). The retained
baseline is the prior run of the same baseline commit and fixture; it was not
interleaved with this run, so host variance applies.

| Tablet median | Retained baseline | Final |
| --- | ---: | ---: |
| Online visible | 171.1 ms | 165.6 ms |
| Online responsive | 234.6 ms | 247.7 ms |
| Offline visible | 170.5 ms | 152.1 ms |
| Offline responsive | 233.2 ms | 231.7 ms |

Remaining costs include broad presentation observers, layout flushes and the
Accounts opening-status check. No necessary functions were removed to hide those
costs. There is no evidence of a ChromeOS-only defect here and no real iPad trace.
Physical-device verification remains necessary before declaring Phase 0 complete.

## Exact canonical source changes

Generated bundles/compatibility scripts and matching desktop/service-worker asset
versions are committed alongside these modules:

* `src/bookkeeping/finalization/transaction-review-and-audit.js`
* `src/bookkeeping/history/monthly-audit-v97.js`
* `src/bookkeeping/recurring/scheduled-journals-v91.js`
* `src/bridges/subusers-bookkeeping/workflows-v136.js`
* `src/core/navigation/navigation-workflow14316.js`
* `src/core/permissions/account-access.js`
* `src/core/startup/lazy-modules-v97.js`
* `src/core/startup/startup14257.js`
* `src/core/sync/idle-sync14341.js`
* `src/settings/legal/documents-data.js`
* `src/shared/presentation/shared-v108.js`
* `src/subusers/accounts/assigned-ledger14281.js`
* `src/subusers/review/submission-review-v139.js`
* `src/subusers/workspace/combined-v138.js`
* `src/subusers/workspace/team-home14227.js`

## Regression checks

Verified suites cover startup failures/retry and identity isolation; exact
two-minute inactivity and pause/resume/manual sync; durable outbox, conflicts,
receipts and drafts; desktop/phone logout and offline reauthentication; 24-hour
expiry; report workflow; picker/calendar behavior; trusted navigation with
drafts and staff permissions; source/build integrity and offline asset versions.
New browser checks cover retained nested labels/badges/shortcuts, zero unchanged
DOM writes, prepared-workspace request counts and freshness, persisted populated
audit data, and assigned-ledger pause/resume/revoked grants.

The first final regression run exposed missing audit caching during offline
re-login. Complete audit snapshots corrected that failure, and desktop/phone
offline reauthentication now passes. The phone session-clock test also had an
intermittent destroyed-context failure during navigation; it passed on rerun,
as in the preceding investigation. No authentication policy was weakened.

Final verification: all 16 selected regression suites passed, along with both full
trusted-click navigation runs (28 desktop and 42 tablet clicks), build check,
source-structure check and offline asset validation. Raw selected-test outputs
and per-navigation measurements are retained in the results JSON.
