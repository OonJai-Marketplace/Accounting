# v143.27 — Compact tables and coordinated fullscreen

Approved desktop/tablet spacing changes:

- Apply fullscreen rail, workspace and dock state together before the native fullscreen request settles. Suppress independent component transitions during the switch. Native browser fullscreen behavior remains browser-controlled; denied requests retain workspace mode.
- Single-line text, date, account and select controls share the 32px action-control height. Date wrappers have no extra vertical padding. Multiline editors retain their usable editing area.
- Data tables use 2px vertical cell padding and natural row height. Long descriptions can expand; no fixed-height clipping is introduced. Attendance calendars keep their approved compact squares.
- Active Journal currency badges are 20px. Edit and Void sit side by side with their existing 32px action height, including the shared sub-user journal. In the 100-entry fixture (two lines and a shared memo per entry), height falls from 9,600px to 7,325px, about 24%.

Screen styles are scoped above 640px. Phone layouts, print output, posting calculations, permissions and financial data are unchanged. No database migration is needed.

Validation: `validation/test-compact14327.cjs` covers 100 entries, wrapping, shared control heights, both editor modes, sub-user editor, fullscreen/native exit/fallback, dock size, picker interaction, numeric caret, print/phone exclusion and browser errors. `validation/test-release-assets14327.cjs` checks deployed/offline asset versions.
