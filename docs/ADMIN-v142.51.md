# Automatic Administrator access v142.51

Administrator module access already bypasses individual checkbox assignments through the existing role policy. This update makes account/workspace access consistent with that policy.

- Administrator workspaces derive all active posting account IDs for funds and categories, both activity directions, and multiple-fund access. Sub-user and manager rules are unchanged. Non-posting and inactive accounts remain excluded from entry fields.
- Selecting Administrator in the existing user editor displays checked, locked automatic grants. Switching back restores the previous restricted selections. Saving uses the existing server-authorized admin_save_access1441 function.
- Existing signed-in administrators synchronize their own missing account grants through that function. Background synchronization does not elevate other users, skips offline/unverified sessions and open user editors, and is deduplicated. Server confirmation is required before updating the cached grants. Financial records are not changed by this synchronization.
- Administrator Money In category validation accepts the accessible categories; currency, positive-amount and balanced-entry validation remain in place. The saved collection format is unchanged.
- Phone account lists show the accessible category accounts even when they are also available as source accounts. The approved phone navigation layout is unchanged.

Eight browser fixture checks cover synchronization, automatic module grants, delayed Home-cache navigation, role-editor transitions, sub-user boundaries, Money In currency validation, and saved Administrator grants. Phone admin/staff offline reopening also passes. These checks use test data; no production users or transactions were changed during testing.
