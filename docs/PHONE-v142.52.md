# Phone fixes v142.52

- Fixed administrator automatic access sync running against the startup chart. These code-only rows lack database UUIDs; v142.51 converted missing IDs to the literal string `undefined`. The new regression test fails against v142.51 and passes after the fix.
- Only valid UUID account IDs enter administrator grants. Sync waits while any active posting row has an invalid ID, then retries through the existing pulse. Administrator editor save also waits instead of sending incomplete grants. Actual server authorization remains authoritative.
- Phone Settings / Users cards show Administrator, Manager, or Sub-user, plus the existing job title and status. Removed the long assigned-account list from cards; account assignments remain available in Edit user.
- Added phone-only visible-viewport handling for the embedded workspace. Keyboard opening reduces its height and keeps focused fields above navigation; closing restores the original height. User-editor fields scroll within their existing viewport-aware dialogs. No reload, draft replacement, or navigation change.
- Updated offline asset versions for the changed phone scripts.

Validation: 12 browser regression checks passed, including unloaded/mixed chart state, subsequent administrator sync, sub-user restrictions, administrator role save, delayed Home invalidation, compact cards, and keyboard viewport open/close with retained text in both the phone frame and user editor. Keyboard geometry is simulated in Chromium; a physical Android keyboard was not available. Four phone offline and eight desktop/tablet isolation checks passed. Syntax and diff whitespace checks passed. No live financial records were created or modified during testing.

Viewport reference: https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport (only the top-level visual viewport reflects the software keyboard independently of layout).
