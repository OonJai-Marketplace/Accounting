# Report approval recovery and original item memos — v143.263

The user reported that an already edited, balanced report journal remained
blocked and still showed source PDF filenames. The earlier assurance that no
reset/reapproval would be needed was too broad: report posting still requires
one of the exact approved financial groupings, including compatible dates.
The current device draft was not available to inspect, so its exact rejection
is not claimed as reproduced. Server logs showed no recent post-report failure.

The identified live unposted petty-cash report was explicitly returned to Submitted
before approval. Its approval snapshot was preserved in a dedicated audit entry;
the review route retains prior approval and the revocation action. All source
lines were compared before/after and remained identical. There were no posted
source links or posting receipts, and no ledger data or journal IDs were changed.
This one-record maintenance action is not a reusable schema migration.

The missed memo case was reproduced: source references contain ` | item N`, and
some source descriptions also contain ` | `. Splitting old generated memos on
that separator prevented recognition. Cleanup now consumes complete known source
strings, preserving manually changed wording. New memos take the explicit item
number from source references, falling back to source line numbering. An item
split between two categories keeps the same original item number in both rows.
Source references stay in the source records, separate from generated line memos.

Validation:

- Regression tests cover embedded separators in both fields, different source
  order, optional date prefixes, original split-item numbers, and custom text.
- Existing preview/transfer, draft recovery, manual regrouping and cashbook
  tests pass, with posting protections retained.
- A private check of the actual report generates individual debit rows plus one
  fund credit; all generated memos omit PDF filenames and preserve original item
  numbers, including an item split across two accounts.
- A read-only database comparison confirms the generated rows exactly match
  the source accounts, amounts, currencies, sides and source IDs. No production
  Post Entry was executed for testing.

To replace the old device draft, reopen the report from Submitted, approve it,
choose Detailed — fund total once, inspect the preview and use it in Journal.
That explicit transfer replaces the prior prepared draft. Posting remains the
user's action. Updating application files alone does not rewrite a draft already
open on the user's device.
