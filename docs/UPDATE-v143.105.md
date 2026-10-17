# Accounting v143.105

- Align sub-user account names and Review, Submit, and Print Report actions at the top across workspace tabs. Add spacing above names and around the administrator context notice.
- Display all reports in the selected History month, with matching headings and entry counts. Remove the lower-left report print button; Print Report remains in the shared account header.
- Display all account-total and assigned-ledger rows without Previous/Next controls. Ledger transport still retrieves every API page and retains account access checks.
- Show submitted fund reconciliation beside each saved History report, using its recorded balances and explanations. Earlier reports without reconciliation show an explicit awaiting-confirmation message.
- Keep the History search field editable while results redraw.
- Simplify download progress to percentage and files remaining. Show release changes during updates and in Settings → Installation & Handover → Website Update; retain the last checked notes for offline reading.

Release notes are maintained in `data/release-notes.json`; the release-manifest build checks its version and publishes it through `release-version.json`.

Validation: desktop and tablet browser regression covers shared header alignment, 102 reports in a month, 105 report lines, month/search filtering, saved and legacy reconciliation, 501 ledger rows across two API pages, and release notes. The existing updater regression covers old-cache activation, interrupted download/retry, retained drafts and pending entries, and offline reopening. No database schema, accounting records, or calculation rules changed.
