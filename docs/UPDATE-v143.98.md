# Chart of Accounts restructuring — v143.98

Original-currency assets and liabilities retain their accounts, codes and descriptions. Main revenue, expense and equity accounts use LAK. System mapping accounts retain original USD/THB amounts and are excluded from operating results.

| Original type | Original account | Mapping account | LAK main counterpart | Action |
|---|---|---|---|---|
| Revenue | 4111 Donations & External Support – USD | 9111 Donations & External Support — USD Mapping | 4110 Donations & External Support – LAK | Reused LAK account |
| Revenue | 4112 Donations & External Support – THB | 9112 Donations & External Support — THB Mapping | 4110 Donations & External Support – LAK | Reused LAK account |
| Revenue | 4131 Other Income – USD | 9131 Other Income — USD Mapping | 4130 Other Income – LAK | Reused LAK account |
| Revenue | 4132 Other Income – THB | 9132 Other Income — THB Mapping | 4130 Other Income – LAK | Reused LAK account |
| Expense | 5112 Kitchen Supplies – USD | 9211 Kitchen Supplies — USD Mapping | 5111 Kitchen Supplies – LAK | Reused LAK account |
| Expense | 5310 Salaries – USD | 9231 Salaries — USD Mapping | 5311 Salaries – LAK | Reused LAK account |
| Expense | 5314 Employee Benefits | 9233 Employee Benefits — USD Mapping | 5315 Employee Benefits — LAK | Created LAK account |
| Expense | 5415 Bank Fees – USD | 9241 Bank Fees — USD Mapping | 5414 Bank Fees – LAK | Reused LAK account |
| Equity | 3021 Owner Financial Support – Remaining | 9311 Owner Financial Support — Remaining — USD Mapping | 3023 Owner Financial Support — Remaining — LAK | Created LAK account |
| Equity | 3022 Owner Financial Support – Used | 9321 Owner Financial Support — Used — USD Mapping | 3024 Owner Financial Support — Used — LAK | Created LAK account |
| Equity | 3030 Owner Support Contribution – Airfare | 9331 Owner Support Contribution — Airfare — USD Mapping | 3031 Owner Support Contribution — Airfare — LAK | Created LAK account |
| Equity | 3111 Retained Earnings – USD | 9341 Retained Earnings — USD Mapping | 3110 Retained Earnings – LAK | Reused LAK account |
| Equity | 3112 Retained Earnings – THB | 9342 Retained Earnings — THB Mapping | 3110 Retained Earnings – LAK | Reused LAK account |

## Existing generic mapping accounts

| Previous account | Category-specific replacement | LAK counterpart |
|---|---|---|
| 9031 Income – THB (System) | 9101 Sales – Dine-in — THB Mapping | 4010 Sales – Dine-in |
| 9033 Income – USD (System) | 9102 Sales – Dine-in — USD Mapping | 4010 Sales – Dine-in |
| 9032 Expense – THB (System) | 9201 Food Cost / Cost of Goods Sold — THB Mapping | 5010 Food Cost / Cost of Goods Sold |
| 9034 Expense – USD (System) | 9202 Food Cost / Cost of Goods Sold — USD Mapping | 5010 Food Cost / Cost of Goods Sold |

These retain their existing IDs. Their new specific categories match the built-in templates: dine-in sales for income, cost of goods for expense. Other expenses/income use their own mapping accounts.

## Additional THB counterparts

| New mapping account | LAK main counterpart |
|---|---|
| 9212 Kitchen Supplies — THB Mapping | 5111 — Kitchen Supplies – LAK |
| 9232 Salaries — THB Mapping | 5311 — Salaries – LAK |
| 9234 Employee Benefits — THB Mapping | 5315 — Employee Benefits — LAK |
| 9242 Bank Fees — THB Mapping | 5414 — Bank Fees – LAK |
| 9312 Owner Financial Support — Remaining — THB Mapping | 3023 — Owner Financial Support — Remaining — LAK |
| 9322 Owner Financial Support — Used — THB Mapping | 3024 — Owner Financial Support — Used — LAK |
| 9332 Owner Support Contribution — Airfare — THB Mapping | 3031 — Owner Support Contribution — Airfare — LAK |

## Parents and LAK offsets

| Previous code | New code | Account |
|---|---|---|
| 9030 | 9100 | Foreign Currency Revenue Mapping — System |
| 9037 | 9200 | Foreign Currency Expense Mapping — System |
| 9035 | 9190 | Revenue Mapping — LAK (System) |
| 9036 | 9290 | Expense Mapping — LAK (System) |
| New | 9300 | Foreign Currency Equity Mapping — System |
| New | 9390 | Equity Mapping — LAK (System) |

## Main-account descriptions

All main revenue, expense and equity descriptions now state that the account records the LAK accounting value, not a cash/bank holding. Existing categories and purposes are preserved. Every foreign mapping description identifies its main LAK code and name and explicitly says not to count it a second time.

Owner support Remaining/Used remains an allocation within equity. Reclassifying historical LAK value between the two does not reduce total contributed equity. Airfare remains distinct from operating support. Retained earnings USD/THB move to system tracking and point to existing main 3110 LAK.

## Applied trial journal conversion

Temporary sample rates: 22,000 LAK/USD and 650 LAK/THB. These are not market rates. Existing non-null rates are preserved. Original foreign amounts and line IDs stay intact; LAK main/offset pairs are added for postings on the 13 moved main accounts. Added line memos identify the sample restructuring and rate. A single database audit record stores before-values, affected account links and added line IDs. Existing period statuses and journal numbers remain unchanged.

The year-closing routine classifies technical/mapping balances as System, carries those separately, and closes only ordinary revenue/expense to retained earnings. The sample fill does not implement a new year-end market-rate revaluation.

## Interface corrections

- Chart of Accounts retains its current page when data refreshes. Search/currency-filter changes reset to page 1; removing rows clamps to the last available page.
- Previous/Next scrolls to the table header, respecting the sticky navigation. Background refresh does not scroll to the top.
- Calculator selection shows only the checked selector: no selection background, cell outline, or selected-rate underline. Ctrl/Cmd-click, Ctrl/Cmd-drag, persistent selection and ordinary paste continue to work.

## Verification

Applied to Supabase: 148 → 161 accounts; 925 → 1,009 journal lines; 107 journal entries retained. Temporary rates filled on 202 USD lines and 42 THB lines. All 925 original line identities, foreign amounts and account links remain; 84 balanced LAK lines were added. Assets and liabilities were compared field by field and are unchanged. All period statuses and journal numbers were preserved. The maintenance record stores before-values and added line IDs.

Desktop and tablet browser checks passed for page retention, pagination scrolling, row-count changes, search reset, checkbox-only Ctrl selection, persistent selection, regular paste, separate currency rates, independent journal balance and safe template resolution.

An isolated PostgreSQL-compatible test exercised both year-end functions: only main LAK profit closes, mappings carry separately, foreign quantity and LAK carrying value survive (and therefore the average rate), authorization and stale-fingerprint checks remain, and a repeated close is idempotent. No real year was closed.

Supabase advisors were checked. Existing notices include [mutable function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [function execution privileges](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS evaluation performance](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [overlapping policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies), and [foreign-key indexes](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys). This release does not change permissions, RLS policies or grants.

The v143.97 published-version checker and notification-bell update action are retained in this v143.98 release. The database maintenance audit marker remains 143.97.
