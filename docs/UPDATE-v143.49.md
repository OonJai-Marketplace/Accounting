# v143.49 — Report correction and journal posting

- Review badges count returned reports awaiting correction, not submitted reports.
- Desktop correction uses a red action area: Cancel returns to Review; Finish opens the usual submission/reconciliation dialog. Saved ordinary drafts remain separate.
- Active personal journals show all unsubmitted drafts without a month picker. Redundant desktop Sub-users Home action removed.
- Reconciliation and explanation fields are identified as transaction fields to discourage credential autofill; browsers/password managers retain final control.
- Final approval offers Consolidated fund entry or Full transaction detail. Both produce one main journal Entry ID and retain each line date and original sub-user references.
- Consolidation combines only fund sides by original date, account, currency and debit/credit direction. Counterpart details remain separate.
- Server validates the complete approved source mapping, dates and amounts; posting remains atomic and idempotent. Original dates in finalized periods are blocked rather than silently changed.
- New RPC installed through INSTALL-REPORT-POSTING-v143.49.sql. Older summary RPC remains available for previously cached clients. No historic transactions changed.

Validation: browser correction/navigation and both posting selections; rolled-back database tests for both modes, two dates under one ID, exact line counts, altered-date/amount rejection, idempotence and deferred ledger constraints. Database test uses a temporary sequence and leaves no records or consumed journal numbers.
