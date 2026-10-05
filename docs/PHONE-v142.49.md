# Phone adjustment v142.49

Scope: the existing phone form and interaction behavior only. No desktop/tablet layout, visual theme, ledger, permission, or database changes.

- General Description appears once below the first Date/Amount row. Add Line repeats the line fields only. Each line in the existing atomic save receives the shared description and retains its own date and memo/reference.
- Single/Double conversion retains the shared description separately from line memos. Legacy draft descriptions that differ from the shared description are preserved in the corresponding line memo.
- Removed the custom pull-to-refresh script and its overscroll-blocking stylesheet. The Refresh account control captures the draft and reloads the browser page. Background synchronization remains available.
- Background rendering pauses while an account picker is open. Navigation and page lifecycle handling release picker interaction locks.
- Updated offline caching for the two changed phone scripts.

Validation: seven focused Playwright checks in `validation/test-phone-adjustments14249.cjs`, including payload contents, mode conversion, native gesture non-interception, fifteen picker/navigation cycles, and browser-page reload. These tests use fixtures and do not write production financial records.

The reported intermittent freeze was not independently reproduced. The interaction-lock safeguards and removal of the custom refresh handler address observed risks; physical-device browser pull-to-refresh behavior remains browser-dependent.
