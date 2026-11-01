# 143.225

Scheduled journals now stay in Upcoming until an administrator selects Approve & Post and confirms the occurrence. Due schedules show Awaiting approval; notifications and the Upcoming navigation badge lead to review. The desktop notification opens its particular schedule. Reminder dates remain available.

The database migration disables the automatic cron job, makes its legacy processor harmless, and forces old clients' auto-post preferences off. Only the authenticated approval RPC may invoke the posting worker. It keeps the occurrence lock and expected-date retry check, so a repeated request returns the same entry. Existing account, rate, balance and period validation runs before numbering. Each approval posts one occurrence; previously posted journals and IDs remain unchanged.

Desktop/tablet Receipts is in the double-click row menu with Edit and Void, including the personal-journal layout. Ledger links retain their source-details navigation. Entry headers no longer display the General description prefix. Shared text appears once, distinct line details remain, and stored memos are not rewritten.

Validation: isolated PostgreSQL checks cover legacy clients, anonymous/service calls, no background numbering or posting, explicit approval, stale-date rejection, duplicate retries, closed periods, book rates and inactive accounts. Browser checks cover desktop/tablet approval, notifications, cancellation, receipt menus, personal entry identity, History/ledger navigation, private image loading and the unchanged phone viewer. This web release does not require a new Android APK.
