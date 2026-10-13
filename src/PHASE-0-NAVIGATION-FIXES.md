# Phase 0: evidence-driven desktop navigation fixes

Branch: `phase-0-modularization`; parent `c2ff32ab549dfc4c27958418c3c39af5fe45c9da`.
No production deployment, database change, or merge to main.

## Primary evidence

The supplied laptop diagnostic has 20,802 DOM nodes and visible medians of 2,250.6 ms online (13 observations) and 2,411.3 ms offline (5 completed visible observations; 3 interrupted). Its offline responsive measurements never completed. Only three online responsive measurements completed. These are not silently treated as fast or zero-valued samples.

The laptop ran production/older markers, without the development prepared-stage and payroll-memory guards. Its anonymous long-animation-frame entries identify an enclosing script, not the innermost expensive function or a source line. The local CPU profile and `tools/source-map.py` corroborate the operations below; no claim is made that a whole bundle is defective or that a local sampled duration is an exact laptop CPU allocation.

## Confirmed operations and corrections

| Generated location / canonical source | Cost and targeted correction |
| --- | --- |
| `desktop14245-4.js:556`, `src/core/navigation/shell-v113.js` | The shared switch wrapper resets `scrollTop` amid DOM mutations, synchronously flushing layout. Reset once in the browser's animation-frame update, after synchronous navigation presentation; no waiting timer, hidden incomplete content, or skipped module initialization. |
| `desktop14245-3.js:5882`, `src/bridges/hr-payroll/registration-v82.js` | Every desktop tab invokes the workforce renderer wrapper chain, including Settings, Bookkeeping and Dashboard. Invoke it only for its HR/payroll/report/budget/settings destinations. Keep the pre-leave payroll draft update and the existing loaders. |
| `desktop14245-3.js:7695`, `src/shared/presentation/shortnames-v104.js` | Employee label updates traverse all hidden table cells on every click/mutation. Limit the ordinary pass to the active panel and its changes; refresh when a panel activates, including Accounts. Retain an all-table print pass. |
| `desktop14245-6.js:524`, `src/subusers/entries/drafts1427.js` | Draft snapshots repeatedly read scroll geometry after rendering and rescan journal fields while unrelated pages are open. Capture scroll/location at the leave boundary, snapshot journal DOM only while its panel is active, keep model persistence, and restore active controls/dialogs on replacement or activation. Reuse each form's field list within a pass. Identity-change clearing remains global. |
| `src/core/navigation/interface-v69.js` | After-switch location persistence forces another scroll read; currency width scans process every hidden table. Persist the destination's reset position without a layout read and process active currency tables, retaining the print pass. |
| `src/core/navigation/navigation-workflow14316.js` | Two sync passes repeatedly move the same navigation buttons, triggering shared observers. Use one sync pass and only reorder when the final order differs, preserving the original treatment of unlisted buttons. |
| `src/subusers/workspace/workspace-consistency14343.js` | Sticky-row measurement alternates style writes with geometry reads. Gather positions before writing; reuse ResizeObserver border-box heights, updated when row geometry changes. |
| `desktop14245-6.js`, `src/shared/presentation/corrections14231.js` | Repeated border detection reads computed style for unchanged candidates. Cache checks within a view; invalidate for node style/class/parent changes, navigation, presentation changes, resizing and printing. |
| `src/accounts/opening-balances/opening-balances14234.js` | Every page event probes the hidden Accounts panel's client rectangles. Use active/hidden state before the legitimate opening-balance status check. The check itself and initial-setup safeguards remain intact. |

Generated line numbers refer to this correction's source map; earlier generated positions can differ. Source files and their compatibility/bundled outputs are committed together. Desktop HTML and service-worker revision mapping use `143.50-nav1` for the five loaded changed scripts, avoiding stale asset reuse on a future authorized release.

## Matched performance comparison

137 accounts, 1,000 balanced journal lines, 10 employees; real bundled SDK against a local synthetic server; Chromium; 4× CPU slowdown. Two rounds through Settings, Bookkeeping, Sub-users, Accounts, HR, Payroll and Dashboard in each network mode: 28 switches before and 28 after. The same fixture and real Playwright pointer clicks are used on both versions. The diagnostic separately observes visible and responsive proxies, requests, IDB activity, frame blocking and sampled CPU. These are controlled stress measurements, not the user's laptop timings.

| Mode | Click-to-visible median, before → after | Click-to-responsive median, before → after |
| --- | ---: | ---: |
| Online | 1303.7 → 837.7 ms | 2343.1 → 1346.1 ms |
| Offline | 1169.9 → 857.4 ms | 2183.1 → 1461.7 ms |

Percentiles use the existing nearest-rank method, 14 samples per mode. Full per-switch timings and profiles are retained in `validation/phase0-navigation-fixes-results.json`.

The remaining tail is material: the final offline Dashboard sample became visible in 796.1 ms but reached the responsive proxy at 4,188.2 ms while a scheduled permission/directory refresh and observer work overlapped it. The baseline offline maximum was 3,260.5 ms. Across all switches, medians improve; this does not establish that every transition improves or that all background CPU costs are eliminated. Legitimate permission refresh/synchronization is retained.

## Regression evidence

- PASS `test-phase0-structure.py` and deterministic build/check: all 574 canonical modules and 351 generated assets remain mapped. The original extraction hashes are unchanged; the reviewed correction allowlist records this task's assets.
- PASS all existing Phase 0 preload, inactivity, browser navigation, session browser, and navigation diagnostic tests. This includes failure isolation, six-stage readiness, prepared payroll memory, trusted activity, exact 24-hour expiry, online/offline desktop and phone logout and offline password reauthentication with encrypted drafts.
- PASS `test-phase0-navigation-preservation.cjs`: real navigation retains journal and settings drafts; replacement controls and reload retain journal/payroll/sub-user drafts; record arrays remain unchanged; unrelated modules make zero workforce render calls; refreshed employees appear on return; hidden-name formatting runs upon activation; header styling and staff access restrictions remain intact.
- PASS `test-report-workflow14349.cjs`: nine returned-report/layout/posting regressions, including detailed dates/source IDs and one posting RPC.
- PASS `test-app-offline14333.cjs`: one queued job, two dates, four balanced lines, 225 debit total, no browser errors. The posting/sync implementation was not changed.
- PASS existing HR calendar calculation and service-worker asset tests (224 downloads; expected versions; no missing assets).
- Journal and HR fixture screenshots were visually checked: existing tabs, information hierarchy, table styling and no-banner design remain intact. No CSS or report templates were edited.
- The additional legacy `test-navigation-documents14311.cjs` fails on BOTH the unchanged parent and candidate: the old auth stub omits `updateUser`, and its badge assertion expects 4 but gets 3. This pre-existing test is reported, not bypassed or rewritten to pass.

## Reproduce

```sh
python3 tools/build-modules.py --check
python3 validation/test-phase0-structure.py
node validation/test-phase0-preload.cjs
node validation/test-phase0-inactivity.cjs
node validation/test-navigation-diagnostic.cjs
node validation/test-phase0-navigation-preservation.cjs
node validation/test-phase0-browser.cjs
node validation/test-phase0-session-browser.cjs
PHASE0_SIZED=1 PHASE0_CPU=4 PHASE0_REPEATS=2 node validation/test-phase0-real-navigation.cjs
# Same command with PHASE0_ROOT pointing to a clean c2ff32a checkout for the baseline.
```

No production credentials or records are used. Production Supabase remains untouched. A post-fix laptop capture remains necessary after a separately authorized deployment to establish the actual device improvement; it is not a prerequisite for committing these tested branch-only corrections.
