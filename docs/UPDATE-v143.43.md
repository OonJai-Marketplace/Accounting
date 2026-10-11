# v143.43 — Consistent workspaces and visible processing

- Bookkeeping History follows Period Closing: aligned month actions, four summary cards, and a separate history table/search panel. Currency totals stay separate; Journal, Submitted Entries and Budget Requests remain available.
- Workspace subtabs precede their section banners. Reopened-book Finish and Cancel Reopening share a right-aligned action group.
- Connection & Sync has a compact footer with Close, live status and Sync now. The sidebar has no sync button or idle description; its indicator appears only during active work.
- Empty device queues do not run automatic upload passes. Completed startup revalidation is not repeated on every idle tick. Pending cache verification/reconnection and explicit Sync now retain their refresh paths. Automatic work continues to pause between batches when the user becomes active.
- Shared processing feedback covers waiting action handlers, reopening/finishing books and report/history period filters, and clears when operations settle.
- Outside-click dismissal uses existing cancel/close handlers, including native connection dialogs and the phone dialog. No outside click confirms a posting or destructive action.
- Recurring reminders are optional. No-reminder items retain their due-date status in the list but do not generate reminder warnings. Days/Weeks/Months controls, count field and removable reminder chips use compact matching controls. The add form no longer has Print Report.
- Recurring obligations do not automatically post journals. Scheduled Journal Entries retain their separate automatic-posting option.

Validation: focused browser checks for layout, currency totals, native dismissal, no-op idle ticks, delayed and failed actions, book reopening, adjacent finish/cancel buttons, optional reminders and warning suppression. Existing 1,000-entry / 10,000-line history check passed. Queue recovery and offline asset checks included. Browser database operations use fixtures; no production accounting records were changed by tests.

The older phone-tools v143.17 fixture has an administrator-ID assertion failure on both v143.42 and this release. The focused native phone dismissal check tests the changed behavior separately.
