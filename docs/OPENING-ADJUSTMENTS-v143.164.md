# Opening balances and later adjustments — v143.164

User clarification, 22 October 2026: the Journal Opening Balance option stays
visible after initial use and does not require the preceding year to be closed.
Each posting has a short confirmation. An amount recorded later is an opening
balance adjustment in its selected period; it must not restate January's opening.

## Behavior
- 1 January: initial opening, reference ANNUAL-OPENING-YYYY. Multiple explicitly
  confirmed opening journals are additive.
- Later date: reference OPENING-ADJUSTMENT-YYYY, general and line descriptions
  identify Opening balance adjustment. Both the GL and bank reconciliation count
  it on the selected date as period activity. Earlier reports remain unchanged.
- Dates and amounts come from the existing journal editor. No automatic carry,
  backdating, or balancing amount. Revenue/expense exclusions and saved FX value
  checks remain.
- The control stays visible and enabled when idle. Context/permission checks
  occur on use. Period/year locks, account permissions, balanced journal checks,
  reset-generation checks and immutable retry receipts remain enforced.
- Separate line/receipt dates are rejected for opening amounts so a late
  adjustment cannot silently enter January through the bank receipt-date path.
- The existing year-end close remains a report-only operation.

## Validation
- validation/test-opening-adjustments143164.cjs: browser fixture covers visible
  control, concise confirmation, cancel, late date and label, next-year opening,
  repeat availability, immutable failed-request retry, ordinary-post guard,
  additive initials, and matching GL/bank results without January restatement.
- validation/test-opening-adjustments143164.sql: candidate functions tested in a
  rollback transaction. Initial/additional/late/next-year openings, retry,
  changed retry rejection, receipt/date override rejection, balance/rate policy,
  permission, generation and closed-date checks. Closing fixture periods uses
  the existing maintenance review/close operation; no period guard is disabled.
  The sequence restart is transactional and all fixture entries are rolled back.
- Existing bank reconciliation regression is retained.
- Security advisor results unchanged: existing authenticated-only definer RPCs
  retain their administrator and workspace checks, fixed search path and grants.

The user separately authorized correcting the existing initial opening markers
and splitting a bank receipt by its confirmed dates. Those private record edits
used the authenticated role and existing journal change/audit safeguards. No
company record values or correction payloads are bundled with this release.
