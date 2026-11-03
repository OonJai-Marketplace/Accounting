# Generate journal lines

Superseded by [editable template journal generation v143.258](JOURNAL-COMPLETION-v143.258.md).
The description below records the previous release and is not the current UI.

The main desktop/tablet Post Entry header now has **Generate lines**. It prepares
editable journal rows from main transaction details using the existing chart and
the Complex Journal Protocol v3 (29 October 2026). It never allocates an ID or
posts a journal. Existing posting, approval, period locking and device recovery
remain authoritative.

## Use

1. Select the recording date in Post Entry, then choose Generate lines.
2. Choose Expense paid now, Income received, Pay existing balance, or
   Transfer / currency exchange. Select the actual cash/bank and category or
   balance being settled.
3. Enter the original-currency amount and supported transaction rate. For
   exchanges, supply the received amount and its LAK valuation when foreign.
   A same-currency transfer carries the source's book value without FX.
4. Optionally enter a separate bank fee paid from the same source account,
   a short source-group/detail, and a Rate Source link. BCEL EFT is the normal
   default. Note rates are offered only for an actual cash-counter exchange.
5. Generate, review the accounts, original amounts, transaction/book rates and
   FX, then Add lines to entry. Review/edit the normal journal before Post Entry.

The source account's book rate is read from the existing account-rate snapshot.
The generator checks again before adding. If the result changes, it updates the
preview and requires another review. A failed online lookup cannot use a stale
snapshot. Complete offline device balances can produce an explicitly labelled
estimate; the existing online pre-post rate check remains in place.

Existing rows and wording are retained when adding. Repeated Generate clicks
replace only the preview. Concurrent actions cannot append the same preview
twice. Changing inputs invalidates the preview. Closing preserves generator
inputs within the current session; after adding, normal journal draft recovery
retains the rows and their separate rates. Account changes/lock discard the
transient generator view. This feature is scoped to the main company journal,
not the restricted sub-user/phone workspace.

## Accounting coverage and boundaries

- Immediate LAK expenses and supported USD/THB expense mappings; optional bank
  fees have their own expense and cash FX rows. Expense recognition uses the
  transaction rate while the foreign payment/mapping uses the source book rate.
- LAK income and the protocol's foreign income mappings. This is income already
  identified as revenue; VAT, advances and receivable collections require their
  proper allocation rather than treating every receipt as revenue.
- Existing LAK balances paid in LAK/USD/THB; USD/THB balances paid in LAK or the
  same currency. The user supplies the specific invoice/payroll reference and
  the cleared balance's current carrying rate. An account-wide average is not
  silently substituted for a particular payable lot. Same-foreign-currency
  settlements show payable FX and cash FX separately, without repeating expense.
- Same-currency cash transfers and LAK/USD/THB exchanges. A separate fee field
  means an additional charge from the paying account, not a fee deducted from
  the receiving proceeds. Enter gross proceeds and record other fee arrangements
  separately with their actual accounts.

Rates are not scraped or guessed. Unknown/inactive/non-posting mappings are
blocked. No account creation, tax calculation, period-end revaluation, prepaid
amortization, or foreign-to-different-foreign payable settlement is inferred.
Those remain in their existing workflows/manual review. Foreign source balances
must cover the payment plus fee. A draft containing an incoming amount to the
same paying foreign account must be completed first so its new carrying rate is
known. Every generated transaction balances separately by currency and in LAK.

## Verification

- `node validation/test-journal-generator257.cjs`: protocol examples for USD and
  THB gain/loss, equal rates, LAK expense, fee, income, same-currency transfer,
  exchanges and payable settlements; separate rates and fee totals; invalid
  input, missing accounts/mappings and insufficient foreign balance; 179
  fractional amount/rate cases checked at integer-cent precision.
- Isolated browser fixture: Generate preview, Add, retained existing rows,
  changed bank rate requiring review before append, and failed rate lookup
  keeping input and disabling Add. At 768px frame width, the payable form and
  eight-line settlement preview rendered without dialog overflow; the wider
  review table scrolls independently. Adding retained separate payable and cash
  FX rows. No live financial writes.
- Full-app signed-in browser QA was unavailable in this preview environment:
  its HTTP origin lacks Web Crypto required by the existing login/vault. The
  production login/security implementation was not modified to work around it.
  Isolated rendering is not certification of physical iPad/phone behavior.
