# Automatic foreign-currency valuation — v143.107

17 October 2026

Foreign-currency account valuation is now automatic. The account and sub-account forms no longer contain a tracking checkbox. General Ledger and the reports' Recorded valuation detail show the original balance, recorded LAK value and average carrying rate for foreign-currency posting accounts, including System/mapping, equity, liability, revenue and expense accounts.

Tracking follows the currency rather than the old saved opt-in flag, so existing accounts and cached account data do not need to be edited individually. LAK accounts and grouping-only parents do not receive a foreign-currency tracking option. Single-currency parent totals retain their combined recorded rate where valid; mixed-currency parents retain separate child rates.

Normal credit balances, such as foreign equity or liabilities, now display a positive recorded ratio when both the original and LAK balances have the same sign. Zero balances show no average; a zero original balance with a remaining LAK value is identified as a residual. Missing or incompatible valuations remain explicit. Negative ordinary asset balances remain flagged for review.

A mapping account's ratio describes its recorded net balance; it is not a new transaction rate or a market valuation. No journal amounts or rates were rewritten, no revaluation was posted, and no records were deleted. The existing asset-only database flag remains compatible with older database constraints; current reporting no longer depends on it. No database migration is required. Excel and Google Sheets remain untouched.

Validation: browser regressions for all five account classifications, mapping equity and normal credit balances, missing/zero/residual/inconsistent valuations, account and sub-account forms, System-account saving, automatic tracking after loading an account whose old flag is false, existing transfers and saved carrying rates, parent totals, prior-year openings, print reports and pending/voided exclusions. Source/build, release hash and interrupted-update gates also run before publication.
