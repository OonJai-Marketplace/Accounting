# Data Check before closing — v143.281

The closing review now includes every posted journal through the selected month,
foreign-currency arithmetic, and Upcoming schedules. The check does not post,
edit, void, redate or approve financial records.

## Coverage

- Existing checks remain: complete and balanced journals by currency, valid
  accounts/lines/dates/IDs, trial balance, unresolved reviews, pending work,
  descriptions, control balances and cash/bank reconciliation.
- Foreign lines require valid saved rates. Stored LAK values must match the
  recorded amount and carrying rate. Known foreign-to-LAK mappings are compared
  with their actual local accounts and historical offsets.
- Supported settlements compare recorded account 5419 against business carrying
  values independently of the technical balancing lines. A second comparison
  uses transaction versus book rates. Positive FX is a debit/loss; negative FX
  is a credit/gain. Missing evidence and specialised legacy mappings require
  source review rather than an automatic pass.
- Amortization allocations are rebuilt from their approved definition, including
  equal/daily shares, partial months, historical values, rounding, dates and
  year carryover. Due active releases, missing/extra allocations, invalid lines,
  changed posted snapshots and broken/duplicate journal links are checked.
- Recurring occurrences and legacy reminders/schedules are checked for due work,
  posting state and available posting links. Pending recurring items can be
  explicitly deferred with an explanation. An active due amortization must be
  resolved; pausing/stopping it remains an explicit Upcoming action.
- Remaining planned releases are compared with recorded prepaid balances;
  overlapping plans or future funding require review.

Detailed journals may retain individual item dates with a single month-end
contra line. Each receipt date is not independently required to balance. The
existing accounting-period validation remains in force.

## Closing safety

The UI shows the affected entry/schedule and expected versus recorded amounts.
Blocking errors stop closing. Warnings need individual acknowledgment and a
reason. The server reruns the complete check, locks schedules before journals,
and rejects a review if the underlying records or schedules changed. A client
cannot omit a category to bypass closing checks. A missing server upgrade also
prevents closing through the updated client.

## Validation and limits

Fifteen isolated PostgreSQL cases cover calculation, allocation, authorization,
read-only behavior, stale-review rejection, valid closing and the summary-date
exception. Browser checks cover rendering, category selection, blocking errors,
warning acknowledgments, cancellation and account isolation at desktop/tablet
widths. Existing journal-completion and Upcoming tests also pass.

The saved October records were checked read-only: 402 posted entries, including
92 with foreign lines. Financial-row hashes were unchanged. Legacy Wi-Fi and
THB rent releases remain due, and several historical FX/mapping entries need
source review. This release does not certify external exchange-rate sources,
historical lot selection, or financial corrections. No live financial records
were created for testing and no physical-device testing is claimed.
