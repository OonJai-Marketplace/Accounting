# Phase 0: real desktop navigation investigation

Scope: `phase-0-modularization`, based on `3902524c8c76b9ff914624c8b5127adad2edc12f`. No merge, deployment, database changes, or application runtime changes in this investigation.

## Production and development are different

Checked on 2026-10-13:

- Remote `main`: `88cd7e011c27b534c595e3c8fc73148f7b2e573f`.
- Development before this investigation: `3902524c8c76b9ff914624c8b5127adad2edc12f`.
- GitHub Pages deployment run [38330850587](https://github.com/OonJai-Marketplace/Accounting/actions/runs/38330850587) successfully deployed **main**, not this branch.
- The public `https://oonjai-marketplace.github.io/Accounting/desktop.html` was downloaded and byte-compared with both checkouts. Its SHA-256 is `34a4cb51418d193d834f2b36950e4271cdba3a6fef4c907c30e57555c50c7f23`, exactly matching `main`. Development HTML has SHA-256 `c13f566477db06dbc99725175363b4b59536192b2f9527b922ae080d8154292a`.

Therefore the usual public website does not include the development performance corrections. The user's actual laptop tab/URL and service-worker cache were not accessible. It may have current main or an older cached version; this investigation does **not** claim to have inspected that tab. The diagnostic below captures the page URL without queries, relevant script revision markers, worker path and two loaded-code feature checks. The `deployment-config.js` branch field alone is not proof: it still says `main` in the development checkout too.

## What the previous benchmark missed

`validation/test-phase0-browser.cjs` called `switchTab(id)` in `page.evaluate()`, then waited for two animation frames. It used four accounts and empty journal/payroll data. That checks a useful portion of navigation, but omits trusted pointer/click processing and sidebar/category dispatch. Two frames estimate a paint opportunity; they do not establish completion of asynchronous loaders or continued responsiveness. Its approximately 100 ms result is not a measurement on the user's laptop or production dataset.

The new test uses Playwright's real pointer input on the five sidebar headers, three rounds online and three offline for the small fixture. It separately records click-to-visible and click-to-responsive proxies, pointer-to-visible, input delay, instrumented loader/render durations, IDB reads, fetches, event timing, long tasks, and supported long-animation-frame details. Chrome DevTools Protocol separately collects script, layout, style and task duration plus a sampled CPU profile. These durations overlap and must not be added together.

## Actual opening path

1. Trusted pointer/click listeners run, including activity tracking and saved-location handling. The sidebar capture handler in `src/shared/presentation/refinements-v109.js` checks permission and dispatches a marked synthetic click. Measuring only synthetic clicks would double-count or miss the initial work.
2. `activateCategory` in `src/core/navigation/navigation-v48.js` chooses the category's source button, whose handler calls `switchTab`. Sub-users uses its existing home-opening handler.
3. The existing `switchTab` wrapper chain applies access checks, saves/restores drafts and location, sets the active panel, renders the selected content and tabs, performs presentation updates, and invokes lazy loaders. These wrappers share scope and registration order; they are not independent ES modules.
4. `src/core/navigation/shell-v113.js` updates the shell, reuses its identity-scoped presentation-settings cache and dispatches `page113`. HR, payroll, sub-user, settings, badges and other listeners then run. Mutation observers and animation-frame callbacks continue after the synchronous call returns.
5. `src/core/startup/startup14257.js` checks the destination's stage requirements. A successfully prepared route does not show the startup waiting screen again. Optional, unprepared areas still use their existing loaders.

| Sidebar | Opening destination | Relevant additional work |
| --- | --- | --- |
| Settings | `settings-business` | Business stage; shell/settings groups; common draft/location/presentation work |
| Bookkeeping | `journal` | Reference + journal + business; journal history/form rendering; common observers |
| Sub-users | `sub-users-home14229` | Reference + profiles; branch summary/cache and existing home workflow |
| Human Resources | `payroll-employees` | Reference + business + payroll; employee rendering and `loadWork82` |
| Payroll | `payroll-overview` | Reference + business + payroll; payroll rendering and `loadWork82` |

## What login really prepares

The six-stage admin sequence is retained. The new browser test verifies the prepared flag and, on the development branch, every stage's identity-scoped `isPrepared` result. The larger fixture also asserts actual in-memory counts of 137 accounts, 1,000 journal lines and 10 employees after login.

| Stage | Work | Prepared storage |
| --- | --- | --- |
| Reference | Currencies, accounts, sub-accounts, pickers | `CurrencyStore`, `AccountingStore`; offline response cache |
| Business | Company settings/identity | `BusinessSettings`, accounting state; offline response cache |
| Profiles | Admin user directory | `liveProfiles`; offline response cache |
| Journal | Selected date window, opening balances, local queued postings | `JournalModule` and year-window memory; encrypted IndexedDB snapshots |
| Payroll | Employees, leave, payroll window/carry/index, operational records, calendar | `Work82` and calendar memory; encrypted local-first snapshots/outbox |
| Documents | Editor workspace/drafts and company document list | Editor state and encrypted document snapshot |

The coordinator waits for workflow readiness and remembers successful stages for the authenticated identity. It does **not** pre-render every module, historical period, optional report, legal document or DOM table. A route can therefore be database-ready and still spend time rendering. Existing preload failure/identity tests pass unchanged.

## Evidence and limits

On the small local fixture, the full click path remains much faster than the reported 1.7–2+ seconds. Medians from the final diagnostic test:

| Checkout | Mode | Click to visible | Click to responsive proxy |
| --- | --- | ---: | ---: |
| main | Online | 140 ms | 240 ms |
| main | Offline | 143 ms | 244 ms |
| Development | Online | 107 ms | 163 ms |
| Development | Offline | 95 ms | 134 ms |

The larger synthetic fixture with 4× CPU throttling can produce second-scale delays, including offline. This is a stress reproduction of a mechanism, **not** a reproduction of the user's hardware, data, or exact complaint. See `validation/phase0-real-navigation-results.json` for the final larger-fixture results and per-module measurements.

| Larger fixture, 4× CPU slowdown | Mode | Visible median / p95 | Responsive median / p95 |
| --- | --- | ---: | ---: |
| main | Online | 1,200 / 2,467 ms | 2,729 / 3,928 ms |
| main | Offline | 1,131 / 1,932 ms | 2,230 / 2,846 ms |
| Development | Online | 1,043 / 2,592 ms | 1,596 / 3,221 ms |
| Development | Offline | 1,089 / 2,041 ms | 1,566 / 2,513 ms |

There are 100 final measured switches across both fixtures/checkouts. The stress p95 has only ten switches per mode and is the maximum observation; it is not a stable device-performance guarantee. On one development Settings switch the panel became visible at 1,128 ms and the responsive probe completed at 1,724 ms, with zero server requests and zero IDB reads attributed to that switch. Across the small-fixture test main performed 24 HR/Payroll IDB reads versus zero for development, and each of those main switches called `renderWork82` twice versus once on development. Both versions still call a common `renderWork82` wrapper on Settings navigation; its draft-snapshot wrapper runs even when the underlying renderer has no Settings content to mount.

The CPU samples identify shared browser work rather than a single universally slow database call. Concrete contributors include:

- `snapshotModels`/draft flush and restore (`src/subusers/entries/drafts1427.js`), including synchronous cloning and draft persistence around tab changes.
- Employee-label `update` (`src/shared/presentation/shortnames-v104.js`), which scans **all** module table cells on clicks/mutations when employee names exist, including hidden tables.
- Shared navigation/presentation observers, DOM queries, computed visibility, and style/layout work. `navigation-workflow14316.js` runs a synchronous update and a further animation-frame update.
- In main, the broader presentation scan and repeated payroll snapshot/decryption/render path already corrected in development. The development guard reuses loaded payroll memory for the same identity/window.

These observations explain how Settings can incur work unrelated to fetching Settings data. They do not prove that any one contributor accounts for the laptop's 1.7 seconds. No speculative runtime correction was applied. In particular, draft recovery, print formatting, synchronization and permissions were not changed just to improve a synthetic score.

## Temporary diagnostic on the actual laptop

This works on the existing production page; no deployment is necessary.

1. Sign in on the laptop and wait for the normal numbered preparation to finish. Keep the same tab, zoom and browser extensions that showed the delay. Do not clear site data or caches.
2. Open browser Developer Tools → **Sources → Snippets → New snippet**. Copy the entire contents of [`tools/desktop-navigation-diagnostic.js`](../tools/desktop-navigation-diagnostic.js) into it and run with Ctrl+Enter. It is deliberately not included in any app page or service-worker asset list.
3. Click **Settings → Bookkeeping → Sub-users → Human Resources → Payroll → Settings**, three times. Let each screen settle. Then use DevTools Network → **Offline**, repeat the same clicks three times, and restore **No throttling**. Do not enter or submit transactions during the diagnostic.
4. In Console run `ojmNavDiag.table()` for a compact table, then `ojmNavDiag.download()` to download `oonjai-navigation-diagnostic.json`. Send that file for analysis.
5. Run `ojmNavDiag.stop()` or reload the page to remove the instrumentation. It also stops automatically after ten minutes. If you reload, rerun the snippet before measuring again.

For exact CPU attribution, also make a short **Performance** recording of one slow Settings → Bookkeeping → Settings sequence, stop recording and inspect Main-thread tasks, Recalculate Style/Layout and Bottom-Up. A full DevTools trace may contain sensitive page/request details; inspect it before sharing. The compact diagnostic does not capture request bodies, query strings, authorization headers, passwords, account records, field values or storage keys, and it sends nothing anywhere.

Definitions and limitations:

- `clickToVisibleMs`: elapsed from the trusted click timestamp through two animation-frame opportunities with the requested panel active and visible and the startup overlay absent. Physical screen presentation cannot be proven by an injected snippet.
- `clickToResponsiveMs`: additionally waits for the tracked asynchronous work to settle, two frame intervals at most 50 ms apart and a MessageChannel task response within 50 ms. This is a responsive-event-loop **proxy**, not a guarantee that every possible module action has finished. Deferred/uninstrumented work can still occur later.
- `pointerToVisibleMs` includes pointer-down work before the click; event timing shows queued input and event-handler time where supported.
- Wrapped functions report synchronous call duration and promise settlement separately. IDB request time includes queueing; cursor timing stops at its first result. Fetch time ends when its promise resolves; resource and loader spans provide additional context.
- The diagnostic adds small overhead. It does not force a refresh, alter app timers, change data-loading order, or add an application navigation delay. Browser APIs unavailable on the laptop are listed rather than fabricated.
- A superseded click or 15-second probe timeout is marked incomplete. All measurements are local, bounded, and removable. If the page remains completely blocked, capture a DevTools Performance trace.

## Reproduction and verification

```sh
node validation/test-navigation-diagnostic.cjs
node validation/test-phase0-real-navigation.cjs
PHASE0_ROOT=/path/to/main node validation/test-phase0-real-navigation.cjs
PHASE0_SIZED=1 PHASE0_CPU=4 PHASE0_REPEATS=2 node validation/test-phase0-real-navigation.cjs
python tools/build-modules.py --check
python validation/test-phase0-structure.py
node validation/test-phase0-preload.cjs
node validation/test-phase0-inactivity.cjs
```

Browser tests accept `CHROMIUM_PATH`, `NODE_PATH` and `PHASE0_RESULTS`. All data is generated locally; no production credentials are used. The diagnostic's separate regression test holds an asynchronous loader open after the screen appears, verifies that responsive completion waits for that loader, then verifies that stopping restores original functions and removes listeners. The full navigation test also checks stage readiness, route destinations, offline navigation, privacy of diagnostic output and navigation after instrumentation removal.

All canonical sources/generated runtime assets remain unchanged. The structural gate verifies 574 source modules and 351 generated assets, with only the 16 runtime differences already authorized in the earlier correction commit. Existing exact-24-hour expiry, trusted activity, offline lock, logout and preload failure regressions pass.
