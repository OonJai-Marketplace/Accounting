# Phone design update — 142.48

Approved phone presentation: Home, Accounts, Post, Entries, History. Desktop and tablet HTML, JavaScript bundles, styles, permissions and posting workflows are unchanged.

- Restores the original tree logo; red/offline, orange/weak, green/online indicator sits at its bottom-right. Logo opens a floating status popover; outside tap, Escape and X close it without layout movement.
- Removes hamburger and document-editor navigation from the phone UI; retains profile/sign-out and authorized administrator sub-user selection/settings.
- Home defaults to the current month and shows assigned funds, Submit/Print, and the selected sub-user's monthly submitted-history summary. Currencies are separate.
- Accounts retains Assigned funds and Allowed categories. Either opens an account-specific ledger with Back to Accounts, Month/Quarter/Year, running balances and transaction details.
- Ledger reads use existing row-level access policies and posted journal lines. Category views include only journals linked to the selected sub-user. If permitted fund movements do not reconcile with its official balance, visible balances are explicitly identified and a restricted-data notice is shown. This does not grant wider database access.
- Entries has Active/Pending; submitted History has a month picker, grouped transactions and no Print button.
- Post keeps validated single/double entry, direction switching, repeated lines, draft persistence and existing atomic posting logic.
- Phone autosync retries only queued new entries for the selected authorized owner, with their original payload/reference and full receipt verification. Saved-record edits and unrelated save-recovery jobs are not replayed automatically; authorization/validation rejections remain visible for attention. No automatic submission, approval or final journal posting.
- Service-worker changes only refresh/cache the changed phone resources; existing desktop cache behavior is preserved.

Validation: fixture-only browser tests cover 360/390/430px phone layouts, all five tabs, account/ledger/back navigation, Month/Quarter/Year arithmetic, unauthorized account rejection, popover placement/dismissal, signal states, draft retention and automatic sync. Real SDK fixture tests cover downloaded/offline reopening for administrator/staff on phone, desktop and tablet. No production financial records were created by these tests.
