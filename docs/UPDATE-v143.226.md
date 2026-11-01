# 143.226

An entry with supporting documents shows a small green link icon immediately to the right of its ID. An entry without documents has no icon. Clicking the icon opens the existing private, vertically scrolling receipt-group viewer. Journal row menus retain Edit/Void; the ledger ID itself still opens the accounting details.

Only visible entry metadata is checked, in batches of up to 100 IDs. The authenticated scanner endpoint uses the caller's row policies and includes approved sub-user source receipts and sibling lines. Presence checks read no images or PDF locations. Superseded documents and documents attached to an older, reused ID do not create a link on the current entry.

Delayed checks and connection errors use a small table status notice, rather than a link or warning icon beside the ID. Status is scoped to the signed-in account/workspace, refreshed after focus/reconnection, and cleared on account changes. Phone scanning and scheduled-journal approval remain unchanged.

Validated: desktop/tablet icon placement, no icon for missing documents, metadata batching, no preview downloads before clicks, private viewer behavior, ledger navigation, personal-entry identity, failed checks/retry and account-change races; backend direct/inherited/sibling document matching, pagination, superseded/reused/denied IDs and request limits. Deployed endpoint files match the reviewed sources and retain JWT verification. Generated-module, release-manifest and offline-cache checks pass.
