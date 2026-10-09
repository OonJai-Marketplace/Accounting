# Action-button scope correction — v143.08

Restores the original component styling for top tabs, sidebar navigation and profile cards, sub-user cards, dashboard summaries, document tabs and phone navigation. The broad v143.05 button height, border, background and phone-navigation overrides are removed.

Only identified small action controls (Save, Open, Templates, Print, Add, Edit, Delete and equivalent actions) use the 32px height. Existing component colors, borders and shapes are preserved. Adjacent inputs in explicit action bars remain aligned; general form inputs retain their own layout.

Attendance squares return to 22 × 22 pixels in 26px columns. Both legacy heading-alignment helpers now center attendance date headings. Browser checks measure the actual rendered day-number text against the square center for every date in 28-, 29-, 30- and 31-day months.

Validation:
- 36 HR workflow/layout checks passed.
- 11 desktop regression checks passed, including action heights and comparison of protected component styles with the correction stylesheet disabled at 1440, 1024 and 768px.
- 11 independent phone checks passed at 390 and 360px, including original navigation/card styling and reopening offline.
- Connected phone action controls and original navigation/card styling passed at 390 and 360px.
- 14 offline checks passed; updated app shell reopens offline.
- Reviewed screenshots of Sub-users Home, Users & Permissions, Attendance and phone Post Entry.

These checks use isolated test data in Chromium. No accounting calculations or production records were changed. No SQL is required. The established company calendar and HR workflows remain in place.
