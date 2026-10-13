# Phase 0 final corrections

Scope: `phase-0-modularization`, starting at `7685d59`. No merge, production deployment, live database writes, schema changes, or accounting/report redesign.

Follow-up: [real desktop navigation investigation](PHASE-0-REAL-NAVIGATION.md) verifies production-versus-development versions, measures trusted sidebar clicks and separate responsiveness, and supplies a temporary laptop diagnostic. The measurements below are the earlier small-fixture `switchTab()` benchmark, not production-device timings.

## Login preparation verified

The active coordinator is `src/core/startup/startup14257.js`. It preserves the sequential numbered preparation and session/identity checks. A normal administrator has these six stages:

| Stage | What it prepares | Where the prepared data lives |
| --- | --- | --- |
| 1. reference | Active currencies, accounts and sub-accounts; account pickers | `CurrencyStore`, `AccountingStore`; account-scoped HTTP copies in offline memory/IndexedDB |
| 2. business | Company settings, identity and numbering display | `BusinessSettings` / `AccountingStore`; offline response cache |
| 3. profiles | Administrator user directory | `liveProfiles`; offline response cache; skipped for non-admins |
| 4. journal | Selected reporting window, opening balances and queued local postings | `JournalModule`, year-window state; encrypted journal snapshots in IndexedDB |
| 5. payroll | Employees, leave, payroll window/carry/index, operational reports and calendar preparation | `Work82`, calendar state; encrypted `ojm-local14333` snapshots/outbox and offline response cache |
| 6. documents | Document workspace drafts and saved company-document library | Editor state/drafts plus encrypted document snapshot in IndexedDB |

Journal, payroll and documents stages depend on role/access; the displayed total is calculated from that list. This is not a promise that every historical year, optional tool, legal document or report DOM is pre-rendered. The workflow-ready promise is also awaited. The independent `phone.html` client separately restores its account record, checks access and refreshes assigned accounts, funds, submissions and period lines; the connected phone shell uses the parent coordinator.

Each successful task is remembered for the authenticated identity. Profile and business loaders previously swallowed errors, allowing failed stages to appear complete. They now propagate those errors to the existing pause/retry interface. Successful stages and the original ordering remain intact.

## Navigation corrections and measurements

Two verified sources of avoidable work were corrected:

- Payroll's local-first wrapper bypassed the existing in-memory ready guard: opening payroll repeatedly re-read/decrypted its IndexedDB snapshot/outbox and rendered again. The guard now includes identity, reporting window, loaded/error state and explicit invalidation. Forced reloads and synchronization retain their existing path.
- The legacy presentation scan inspected computed styles across hidden modules, and navigation plus mutation observers scheduled duplicate scans. It now scans the active module/dialogs once per frame, with a full scan retained for printing. The user directory also reuses its successful preload on ordinary navigation; explicit data refresh still reloads it.

The same real-SDK local fixture was run against the untouched baseline and corrected checkout, with eight desktop routes repeated three times in each connectivity mode. Paint time is measured through two animation frames; it includes browser scheduling/rendering, not just the synchronous switch function.

| Measurement (24 switches per mode) | Before | After |
| --- | ---: | ---: |
| Online median paint | 134.5 ms | 105.9 ms |
| Offline median paint | 124.9 ms | 101.4 ms |
| Online p95 paint | 171.6 ms | 152.4 ms |
| Offline p95 paint | 158.3 ms | 156.6 ms |
| Online IndexedDB reads | 20 | 2 |
| Offline IndexedDB reads | 18 | 0 |
| Online HTTP data requests | 7 | 4 |
| Offline HTTP data requests | 0 | 0 |

All measured prepared routes opened without the startup waiting screen. This small local fixture did not reproduce the reported one-second delay; actual production dataset/device responsiveness remains unmeasured. Residual rendering and optional data loading were not broadly rewritten.

## Logout

Removed the explicit desktop success toast, account-switch success message and the shared vault's temporary plain-text logout page. Both phone paths share the corrected vault. An opaque surface uses the existing loading animation; protected DOM is then removed while that surface remains until the login document loads. Open native dialogs are closed so they cannot display protected content above it.

The final vault wrapper previously captured but never called the Supabase SDK sign-out function. Online manual logout now calls that function with the caller's scope (local by default), then locks the device. The expected SDK logout request was observed with the bundled SDK against a local HTTP fixture. Known offline/device-session mode is respected even if the browser reports online. Offline logout retains password-wrapped work, removes the unlocked device session and requires password entry again. Ordinary logout does not display a success notification. Actual server-signout failures, session expiry and revocation retain an error/security notice.

No blanket notification suppression was introduced. Native Supabase server behavior was not tested against a production account. As with the documented Supabase API, existing access JWTs have their normal expiry; the application does not invent a way to revoke JWTs immediately.

## Fixed 24-hour inactivity

`device-vault14334.js` remains the authority: `DAY = 86400000` (1,440 minutes). The retired adjustable policy still reports 1,440 minutes.

Corrections:

- Startup, `pageshow` and visibility restoration check the saved deadline instead of extending it.
- Trusted pointer, keyboard, touch and wheel activity resets the deadline. Removing the old 15-second write throttle prevents early expiry after recent activity.
- Background writes, token refresh, synthetic input, and simply restoring a tab do not count as activity.
- Expired access is rejected before reading/decrypting cached records; wake/restore and the existing periodic check also lock the session. Genuine activity at/after expiry cannot revive it.
- Reconnection checks expiry before attempting session refresh.

Tests cover the exact deadline with a simulated wall clock online/offline, fresh activity just before the deadline, periodic expiry, page startup, visibility/BFCache-style restoration, genuine keyboard input, SDK token refresh, and offline password reauthentication. Browser clock emulation is installed before loading the application to avoid an artificial clock jump during instrumentation.

## Asset and regression gates

Canonical sources and generated outputs were rebuilt together. Cache references use revision `143.50` for the changed files only. The independent phone had a pre-existing version mismatch (`143.48` runtime versus `143.49` worker), which prevented its offline-ready acknowledgement; runtime and worker now agree. Existing cached-user work is not deleted.

`validation/phase0-baseline.json` remains unchanged. `validation/phase0-corrections.json` explicitly records the authorized runtime hash differences. The structural gate still checks every other baseline byte, all 574 source modules, all 351 generated assets, JavaScript parsing and local HTML asset references.

See `validation/phase0-corrections-results.json` for the completed tests and measurements. Tests use local fixtures and the bundled SDK. Live production/device latency is not certified by these tests.

Reproduce the focused tests from the repository root with Node, Python and Playwright/Chromium available:

```sh
python tools/build-modules.py --check
python validation/test-phase0-structure.py
node validation/test-phase0-preload.cjs
node validation/test-phase0-inactivity.cjs
node validation/test-phase0-browser.cjs
node validation/test-phase0-session-browser.cjs
```

Browser tests honor `CHROMIUM_PATH`; Playwright can be supplied through `NODE_PATH`. Use `PHASE0_ROOT`, `PHASE0_BASELINE=1`, `PHASE0_BENCHMARK_ONLY=1`, and `PHASE0_RESULTS` to measure an unchanged checkout without running correction assertions. No database credentials are required.
