# Accounting recovery · v143.23

Comparison baseline: **v143.16, `14d724e15c057bbd4e63324754f89959ea48a784`**, immediately before the v143.17 action-color changes. Selected from the user's October 10 instruction to compare against the version before colored buttons. The repair starts from current repository `e08de9c`; later approved features remain.

## Confirmed corrections

| Reported problem | Correction |
| --- | --- |
| Desktop enlarged and fullscreen slow | Restore native 100% layout and existing responsive breakpoints. Remove automatic document zoom and whole-stylesheet rewriting. Keep the coordinate API for existing menus. |
| Buttons flash during rendering | Apply action tones to changed controls before the next paint. Limit observation to added controls and changed labels. Preserve navigation and phone styles. |
| Mandatory controls blink/reappear | Keep toolbar nodes, handlers and focus through loading/refresh; update report content separately. Retain refresh, month, exports and print. |
| Active Journal actions disappear or become cramped | Preserve the action column and readable Edit / permitted Void controls after table rebuilding. Existing authorization and posting rules remain. |
| Extra Payroll print button | Exclude Payroll from generic report-button insertion; keep Payroll's own report workflow. Other generic report buttons follow their banner. |
| Gray action buttons | Use the approved forest-green neutral tone while retaining readable white text and distinct warm action colors. |
| Tabs move off-screen in Settings | Scroll an embedded section within the workspace rather than scrolling the whole document/sidebar. |
| Fullscreen loses navigation | Retain a 56px rail using the existing logo, permission-filtered module controls and account control. Compact the right-hand dock. Restore normal sidebar on exit. Apply layout after the browser fullscreen transition. |
| Ctrl+Alt+T opens ChromeOS Crosh | Transactions: Ctrl+Alt+Space, release, T, then the tab initial. The same entry sequence supports every module; other existing direct module shortcuts remain. The application no longer claims Ctrl+Alt+T. |
| Mandatory export/print month can follow an inactive tab | Read the selected month from the active report. Ignore hidden loading/error indicators while continuing to block exports during loading/errors. |

Approved workflow additions remain: Finalization and Fund Allocation; reusable budget amounts and editable saved documents; centralized history and linked archive/reset/deletion; reserved voucher notification rules; editor menu shortcuts; closing acknowledgment and later-period deferred posting; HR/calendar/news and editable company account settings; fresh-backend and separate maintenance SQL.

## Verification on this revision

- 89 passing checks across nine browser/model/database suites. Exact suite names and counts: `validation/recovery-suites14323.json`.
- 114 page visits across 1440, 1024 and 820px; no page-wide horizontal overflow or displaced top tabs. Native sizing also checked at 1280, 1600 and 1920px.
- Slow Mandatory refresh preserves actual button identity/focus. Printing uses the active month. Journal action visibility survives repeated table rendering. Fullscreen module clicks, keyboard activation, exit and sidebar restoration tested.
- Isolated database tests cover acknowledgment, closed-period protection, retained source IDs/dates, deferred posting, linked budget deletion and selected reset. No production data changed.
- Phone checks cover online login, offline save/reload, lost-response retry without duplication, balanced double-entry save, cached reports and admin Settings.
- 193 JavaScript files parse; all 118 packed source segments match their source files, excluding bundle separators.
- Simulated offline installation retrieves 131 local assets without missing files. All ten changed deployed asset versions match HTML and worker downloads. Phone runtime version is unchanged.
- New tests: `validation/test-recovery14323.cjs`, `validation/test-release-assets14323.cjs`. A fixture screenshot is saved at `validation/screenshots/fullscreen14323.png`.

Browser checks use isolated local fixtures and Chromium, not production bookkeeping. Physical ChromeOS/iPad/Android rendering, real email delivery, hosted Auth/Storage and a fresh hosted installation are not certified by these results. This is evidence for the tested behaviors, not a claim that the entire application has zero bugs.

The portable ZIP remains unchanged, following the instruction to repair the repository first. It is not an export of v143.23. No SQL migration is required for these repairs.
