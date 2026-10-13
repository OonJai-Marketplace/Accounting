# Expanded navigation investigation — 2026-10-13

The expanded investigation traced callback scheduling across the loaded website,
not only the earlier Phase 0 corrections. Local observer/animation-frame probes
recorded 148 scheduling/callback locations during five module navigations.

## Verified additional bottleneck and correction

`src/shared/ui/account-picker1428.js` observes body-wide DOM changes and enhances
all selects, including ordinary non-account dropdowns in inactive modules. During
one enhancement it repeatedly resolves identical option values against accounts
and subaccounts. Non-account values also fall through to the journal account
resolver. With more accounts, those repeated linear searches become expensive.

The callback maps into `scripts/desktop14245-6.js` (before: line 602), rather than
the initially suspected bundle 4. In instrumented five-navigation runs at 4x CPU
slowdown, the same 26 callbacks took 1,140.3 ms before and 642.6 ms after. These
probe times include instrumentation overhead; they are separate from the full
navigation benchmark. A focused browser test independently reproduced 60 resolver
calls for the same two values across 20 selects, reduced to two calls.

The correction uses a temporary lookup Map for one synchronous enhancement pass.
It is discarded in `finally`. It does not retain account results across navigation,
data refresh, editing, or permission changes. The original resolver and lookup
precedence are unchanged. All existing enhancement and observer calls remain.
No layouts, accounting calculations, authentication, offline data or sync code
were changed. Generated standalone and desktop assets are rebuilt together, with
matching HTML/service-worker asset markers.

## Full navigation comparison

Baseline: `17f3573c3e07c72a94f2d444013ff606c2c82f1e`. Same local data and sequence
before and after: Settings, Bookkeeping, Sub-users, Accounts, HR, Payroll, Dashboard;
two repetitions online and offline (28 trusted clicks per revision). Fixture:
137 accounts, 1,000 journal lines, ten employees, desktop viewport 1440x900,
Chromium with artificial 4x CPU slowdown. No production credentials or records.

| Median proxy (lower-middle convention used by existing harness) | Before | After |
| --- | ---: | ---: |
| Online visible | 916.4 ms | 850.9 ms |
| Online responsive | 1,348.5 ms | 1,191.5 ms |
| Offline visible | 858.6 ms | 777.5 ms |
| Offline responsive | 1,313.9 ms | 1,207.8 ms |

These local results show a modest improvement, not elimination of the delay.
The synthetic DOM is smaller than the user's roughly 21,000-node DOM. Machine
variability and artificial throttling limit generalization to physical devices.
Detailed per-navigation results are in `validation/picker-navigation-results.json`.

Tablet-configured Chromium (1024x768 touch/mobile screen, app layout 1280px,
no CPU slowdown, 42 trusted clicks per revision) also passed all navigation
checks. Online visible/responsive medians: 170.9/248.4 ms before and
171.1/234.6 ms after. Offline: 163.9/262.8 ms before and 170.5/233.2 ms after.
Visibility did not improve in this configuration. The baseline is retained from
the preceding investigation, so host variance still applies. Reproduce with
`PHASE0_DEVICE=tablet PHASE0_SIZED=1 PHASE0_REPEATS=3` using the same harness.

## Remaining findings and limits

- The newer user diagnostic still attributes about 3.56 seconds of forced layout
  to bundle 4 within its navigation interval. Local profiling identifies the
  delayed scroll reset in `src/core/navigation/shell-v113.js` as a layout flush
  point. This does not prove that the reset created all the pending layout work.
  It remains unchanged to preserve scrolling behavior.
- Navigation labels/shortcuts, action decoration, and other observers also take
  time. A broad observer rewrite is not justified by this narrow correction.
- `device-mode132.js` selects tablet styling within the desktop runtime; landscape
  tablet mode uses a 1280-pixel canvas and an icon sidebar via `workspace14337`.
  Tablet-specific keyboard/picker handlers exist. The desktop bundles are shared.
- Prior matched local desktop/tablet configurations did not reproduce a faster
  tablet. Chromium touch/viewport emulation is not physical iPad or WebKit testing.
- Both user recordings differ in routes, length, and superseded measurements.
  Their visibility medians improved, but they are not a controlled benchmark.

## Validation

Passed: build/check, source-structure gate, picker lookup/freshness regression,
Phase 0 preload, inactivity, diagnostic, navigation preservation, browser login /
logout / offline reauthentication, session-browser tests, report workflow,
app-offline synchronization, existing picker/calendar tests, and service-worker
asset checks (224 downloads, no missing files, matching versions).

The session-browser test that failed during the earlier investigation passed on
this run, including desktop and phone expiry and failed-sign-out handling.

Reproduce the main comparison with:

```sh
NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" PHASE0_SIZED=1 PHASE0_CPU=4 \
  PHASE0_REPEATS=2 node validation/test-phase0-real-navigation.cjs
node validation/test-picker-navigation-cost.cjs
```

Development branch only. No production deployment or Supabase mutation.
