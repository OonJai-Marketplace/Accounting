# Version 88

- General Ledger renders its compact header immediately on period changes.
- Accounts rejects future months, quarters, years and custom dates, including manual entry.
- Returned-book dialog has a complete header and wider fields. Long selections expand the table; horizontal scrolling preserves complete labels.
- Correction saving retains existing line IDs, blocks repeated save clicks and explains partial-save errors. Saving remains sequential using the existing database function.
- Correction audit finding: the sub-user's tracked balance includes saved draft and returned entries, so it changes after saved corrections. Typing changes the dialog preview only. The official ledger uses the separate approval/posting workflow.
- The supplied older approval SQL locks the submitted journal and rejects subsequent approvals. The installed save_staff_workspace_entry_v3 function and live database audit triggers were not accessible in this session; their current audit-history and transactional guarantees are not claimed as verified.
- Session restoration now uses Settings > System > Session Timeout (minutes), instead of an unrelated seven-hour window. Default is 30 minutes if unset; supported range remains 5–480. Saved preferences were not changed.
- Valid returning sessions select their saved section before bulk data loading. Fresh sign-in starts at Dashboard. User navigation during loading wins. Recurring reminders run after hydration and wait for other open dialogs.
- Number editing shares Settings separators and precision. Native numeric fields preserve canonical programmatic and FormData values. Rates allow up to six decimal places; counts retain integer precision and date/year/code fields are excluded.

Validation: browser checks for delayed login, warm restore, fresh login, expired session, numeric display and FormData under all three formats, future month rejection, returned-book controls and duplicate-click prevention. Payroll calculation regression passed. Live database writes were not performed.

No new SQL is required for this interface update.
