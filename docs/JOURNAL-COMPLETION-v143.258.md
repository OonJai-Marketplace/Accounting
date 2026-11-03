# Editable template journal generation

This replaces the v143.257 transaction questionnaire. Generate sits beside Add
in the main company Post Entry actions and opens a separate editable journal
window. Its calculation module and draft are independent of the normal editor.

## Workflow

1. Select an existing transaction template, or Blank journal. Saved templates,
   template IDs, names, account structures and line descriptions are retained.
2. Enter the description, date, exchange rates and any number of business rows.
   Choose accounts and enter the amounts you know. Add/delete rows as needed.
3. Generate fills actual debit/credit cells and missing mapping, valuation,
   withholding and FX rows in this same window. Review and edit those cells.
4. Use in Post Entry checks current recorded values again and appends the
   completed journal to the normal editor. Changed values require another
   review in the popup. Posting remains the normal explicit Post Entry action.

Closing, reloading and switching templates retain the independent draft per
owner and template through the existing encrypted device storage. Copying clears
only that completed template draft. Other unfinished template drafts remain.
Existing main-editor rows and descriptions are retained; another transaction
date must be finished before appending. Account changes and lock close the view.

## Calculation rules

The chart and Complex Journal Protocol v3 (29 October 2026) provide account
relationships. Known protocol mappings have explicit LAK counterparts. Additional
foreign currencies use their configured mapping accounts with an exact, unique
category-name match and configured system offset. This is currency-independent,
but does not create missing chart accounts or assume unknown mappings.

- Expense, income/support, salary accrual, employee deductions, bank fees,
  historical asset releases, equity allocation, same-currency transfers,
  exchanges and balance settlements use the entered business rows.
- One empty selected counterpart can be calculated from an unambiguous remaining
  amount. A missing foreign mapping can be supplied when one selected LAK
  category uniquely identifies it. Multiple missing business amounts are not
  guessed.
- Payroll uses entered gross, net and deduction information. A selected single
  tax liability can receive the calculated withholding; ambiguous PIT/SSO
  allocation requires the user to enter it. No tax rate is invented.
- Cash/bank carrying rates are read on demand. Partial historical settlements
  require the specific cleared balance's book rate; an account average is not
  silently substituted. Same-currency transfers retain source book value.
- FX is calculated from transaction and carrying values, not from an arbitrary
  journal imbalance. Source quantities, each currency and total LAK values must
  balance. Missing valuation, unsupported mapping and inconsistent business
  amounts produce errors while preserving input.
- Generate reuses existing correct outputs, fills blank output cells and repairs
  a single inconsistent system/FX amount. User-entered business amounts remain
  unchanged. Repeating Generate replaces derived outputs without duplicates;
  generated memos update with amounts/rates while edited memos remain intact.

Online source-balance lookups must succeed. Complete offline device values are
labelled estimates, with existing posting checks still authoritative. Main-editor
cash commitments are included once per account. No database writes, journal IDs,
period reopening or automatic posting occur during generation or copying.

## Verification

`node validation/test-journal-completion258.cjs` covers 132 scenarios: USD/THB
expenses and support, EUR configured mappings, fees, payroll gross/net/tax,
multiple employees/currencies, partial/full and cross-currency settlements,
transfers/exchanges, missing counterpart amounts, existing/incorrect system rows,
regeneration, source-rate changes, ambiguous inputs and 99 fractional valuations plus half-cent debit/credit symmetry. Every successful case is regenerated and compared for identical rows.

Browser checks use the compiled production generator in an isolated surrounding
editor with synthetic accounts and a mocked rate service. Verified actual cell
updates, payroll completion, EUR and inferred payment amounts, repeated Generate,
template retention, close/reload recovery, changed source-rate review, copying to
Post Entry, decimal-comma amounts and failed lookup preserving inputs. At 768px
frame width the dialog stays within its viewport, the table scrolls horizontally
and action buttons retain 32px height. No live financial writes.

The full signed-in application cannot be exercised in the HTTP preview because
its existing vault requires Web Crypto. Production security was not changed to
bypass this limitation. Isolated browser checks do not establish physical iPad
behavior or replace the normal posting validation.
