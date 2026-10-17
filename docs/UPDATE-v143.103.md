# Version 143.103

The update notification now opens **Settings → System Settings → Website Updates**, where the installed version, available version, status, check action, and download action appear together.

- Schedule, user-entry review/history, budget history, Audit Logs, and administrator-assisted activity no longer have Previous/Next table controls. Monthly histories show the complete selected month. Assisted activity loads beyond the previous 100-record limit and follows the audit month selection.
- The audit month control sits beside Print / Preview. The empty row above Journal History is removed.
- Recurring amounts have room for `₭10,000,000.00`. To-do lists and their steps are numbered; due dates appear in the collapsed list header. Schedule and To-do headers share compact styling.
- A submission has one prominent user/report-type header, a smaller report ID, and matching section headings for the source entries, totals, and fund reconciliation.
- System accounts use red text without the added SYSTEM badge or background. Stored names and the System account type remain intact.
- Opening an account dropdown places the current selection first. Manual typing and double-click clearing remain available.
- Ctrl/Cmd+Z and Ctrl/Cmd+Y (or Shift+Z) restore journal draft edits, selections, cleared cells, added/removed rows, and a cleared draft. History is scoped to the account and entry, preserves source/rate metadata, and resets when an entry opens or a posting is accepted. Undo does not reverse a posted transaction.

Validation used isolated data fixtures, without production accounting writes:

- `test-adjustments143103.cjs`: 11 focused checks on desktop and an emulated iPad layout, including 525 assisted audit rows, 125-row monthly histories, dropdown selection, and journal undo/redo.
- `test-update143103.cjs`: upgrade from 143.102, interrupted download and retry, verified activation, preserved local drafts/pending entries, and offline reopening with the new undo module cached.
- `test-journal-durable14385.cjs`: offline posting, lost responses and retries, edit/void durability, exchange rates, conflict retention, account isolation, and history reset after an accepted posting.
- Canonical module build/check, release manifest check, extraction/correction structural gate, and whitespace check.

Browser checks use Chromium, including iPad emulation; they are not a physical Safari-device test. The existing phone inactivity fixture timed out at its idle-expiry assertion during an exploratory run; phone authentication and inactivity behavior were not changed by this release.
