# v143.42 — closing status, saved reconciliation and history layout

Closed and locked journals use period status for History membership, including cached journal restores. Loading period status replaces it only after a successful response; a failed read preserves known status. Closing refreshes the status cache, and the Lock control is recomputed after the update completes.

Lock offers to reuse the latest saved reconciliation when its exact preflight fingerprint matches current records. Changed records require a fresh review. The existing atomic database closing function still verifies the fingerprint and acknowledgments at commit. No closing checks or administrator permissions are bypassed.

Closing trial totals, ledger balances, differences and actual-balance fields follow the Settings number format. Inputs accept configured grouping and negative amounts; the database receives canonical decimal amounts.

History date pickers and journal Review Month / Export Month actions sit in module headers on the right. Year-end carry-forward is at the bottom, compact and collapsed, showing only the latest completed year; saved records and totals remain unchanged.

Validation: full browser fixture for January–September closed/October open, cached restore, Finish then Lock, changed-review rejection, comma/decimal grouping and negative balances, history controls and latest carry-forward. Live read-only check confirmed the user's October reconciliation still matches. No live financial records were changed by this release.
