# Bank reconciliation v143.163

The Reconciliation account picker has an explicit Bank statement checkbox.
Unchecked reports retain General Ledger posting dates. Checked reports select
movements using the saved receipt-date marker (or the line date when no separate
receipt date exists). No account-name guessing or journal mutation is involved.

Bank mode reads only the selected account/currency through existing authenticated
journal RLS, in ordered 500-line pages. It reads closed books and older years rather
than depending on the current journal window. A complete account-scoped snapshot
supports offline use; an unavailable snapshot fails instead of using partial data.
The latest annual opening anchors balances; prior-book receipts carried in that
opening are removed until their receipt date to avoid counting them twice.

Report creation, refresh and finish use the same selected date basis. Finish
rechecks saved source totals and lines. Saved reports retain their original basis;
legacy reports retain posting dates. Receipt snapshots show receipt and posting
dates. The period is passed explicitly through asynchronous action feedback.

Closing, opening, statement DR and CR are independent inputs above one comparison
table. Closing is never overwritten. A conflicting completed breakdown blocks
Finish, but drafts can be saved for review. Amount editing respects saved number
formatting. Findings, attachments, notes and ledger rows expand below. Routine
instructions and repeated notices are removed.

Validation: validation/test-bank-reconciliation143163.cjs uses synthetic records
for January/February timing, a closed January, an older-year carry, unchanged cash
and ledger totals, amount consistency, save/reopen, stale-source finish rejection,
offline snapshots, and desktop/narrow layout. Database column and relationship
queries were read-only; no posted financial records or database policies changed.
