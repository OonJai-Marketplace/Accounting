# v143.115 — Journal calendar navigation

Journal transaction and line-date calendars allow the heading to open a month grid, then a year grid. Selecting a year/month only navigates; choosing a day commits the date through the existing input/change events. Existing month-only and unrelated date pickers retain their behavior. Date formatting, bounds, Today, Clear, Escape and draft contents are preserved.

The user separately authorized a one-time clearing of existing audit history. Maintenance SQL removed 171 audit_log rows (deleted-record history was already empty). Hashes of all 80 other public application tables matched before and after the operation, as did all public sequence values. Three journal entries, nine lines and 164 accounts remained. No triggers were disabled; normal future audit recording remains enabled. This cleanup is not part of app startup or the release scripts.

Validation: DOM interaction checks cover month/year navigation, leap day, partial month limits, cancellation, unchanged draft/date while browsing, input/change events, Today and existing controls. Run `NODE_PATH=/path/to/linkedom/node_modules node validation/test-journal-calendar143115.cjs` with linkedom 0.18.12. Canonical build, source ownership, JavaScript syntax and release hashes checked. No browser executable was available for visual QA.
