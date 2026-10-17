# Version 143.104

- Dismissed news is excluded from both the News and Events page and the All News dialog. A newer feed revision does not restore a dismissed topic. Dismissals remain account-scoped in this browser's local storage; dismissing or refreshing news does not write to Supabase. The editorial feed is a published JSON file loaded into browser memory. Approved calendar events and their approval records remain in the company calendar settings. Existing legacy cloud dismissals migrate to the browser without deleting approved events.
- Unrecorded news has an **Add to Calendar** button. Undated proposals open with empty required date fields, so dates must be supplied and verified before approval. Dismissing an already recorded story hides the news without deleting its calendar event.
- Calendar redraws replace only the calendar content, preserving the banner and navigation nodes and their order.
- Home, Journal, Summary, History and Ledger stay visible inside the selected sub-user account instead of being moved into a hidden secondary menu.
- Removed the duplicate System heading below the banner. **Installation & Handover → Website Update** opens a dialog showing the installed version, update check status, latest detected version and download action when available. Update notifications open the same dialog.

Verification uses isolated fixtures, with no production accounting or calendar writes:

- `test-news-navigation143104.cjs`: desktop and emulated iPad; dismissed-item removal in both views; zero dismissal writes; refresh/revision/reopen persistence; explicit calendar approval; undated review; approved-event preservation; stable calendar shell; all five sub-user tabs; update dialog current/offline/available states.
- `test-news-local14396.cjs`: legacy cloud dismissal cleanup, approved-record preservation, device/account isolation and sidebar regression checks.
- `test-update143103.cjs`: 143.102-to-143.104 upgrade, interrupted download and retry, preserved local drafts and pending entries, offline reopening and cached undo asset.
- Canonical module checks, release manifest check, structural correction gate and whitespace check.

Tablet checks use Chromium emulation, not a physical iPad/Safari test. This release changes the accounting website; it does not change ChatGPT's task-status interface.
