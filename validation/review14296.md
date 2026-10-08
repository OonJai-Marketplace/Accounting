# Action feedback and parent badges — v142.96

User-requested presentation changes only. No database migration, calculation change or live-data test.

- Icon selection now marks the selected built-in icon/color, shows progress while preparing/downloading/saving, awaits company-save confirmation, prevents overlapping selections and distinguishes local-only save from company success. Save errors remain visible.
- Temporary-password issuance shows in-progress state, prevents repeated issuance/edits during the request and confirms success beside its control. Failed issuance shows an error; cancellation sends nothing. Password service/security requirements are unchanged.
- Shared user-access, business/session settings, account/sub-account, payroll/HR/report saving and legal-file upload operations show progress. Repeat calls share the pending operation. Existing validation, save receipts and outcome/error handlers remain responsible for deciding whether an action succeeded.
- Routine save/sync completion messages use small control-level feedback rather than popups. Staged corrections and genuine warnings/errors retain their notification. Background phone offline/save/sync notices use the existing connection indicator instead of another popup.
- Connection-required notifications remain visible and now use a heading and bullet points. Blocking offline rules and draft preservation remain unchanged.
- Chart of Accounts currency badges use Parent for non-posting groups and share the same 22px height. Name/picker badges use one compact grouping symbol (▦), labeled Parent account for accessibility. Underlying IDs, currencies, posting permissions and account data are unchanged.
- Phone runtime/service-worker versions are updated together, including the shared feedback assets and login logo in offline asset downloads.

Seven targeted browser checks passed: routine notifications/bullet connection warning/real errors; temporary-password pending+duplicate guard; temporary-password failure+cancel; icon selection/save/failure; shared pending operation+repeat guard; quiet phone offline indication; parent label+height+compact symbol+unchanged option value. Prior archive/reset/audit/viewport regression checks also pass.

Tests use local HTTP fixtures with Supabase stubbed and nonlocal requests aborted. `validation/test-action-feedback14296.cjs` uses the same Playwright/Chromium environment as the preceding review. This verifies the affected feedback paths, not every live action or installed server function.
