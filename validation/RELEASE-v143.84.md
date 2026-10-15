# v143.84 — Editable foreign-currency templates and consistent journal navigation

- Voucher options now fit the 156px voucher field rather than the general account picker's 280px minimum.
- Both built-in templates use the existing Templates → Use → Post Transaction flow. There is no separate amount/rate form. Seven editable, blank-amount rows include THB and USD; users can remove the unused pair, edit accounts/memos and use Multiple dates.
- Income defaults: 1016 Cashier LAK, 4010 Dine-in Sales, 9035 LAK income mapping, 1017 Cashier THB / 9031 THB income system, 1018 Cashier USD / 9033 USD income system.
- Expense defaults: 9032 THB expense system / 1017 Cashier THB, 5010 Cost of Goods Sold, 9036 LAK expense mapping, 5419 Exchange Gain/Loss, 9034 USD expense system / 1018 Cashier USD. Each row and each template has a description. Amounts, including gain/loss, are entered in the ordinary journal editor.
- Bookkeeping opens Journal and expands its submenu; Settings opens its first permitted section. Inactive grouped menus close when another module is selected.
- Main and personal journal pagination share bottom-right padding and alignment; personal history uses the same pager styling.
- Main module and user workspace tabs share a 54px desktop/tablet strip, active colors and top-sticky behavior. Phone layout is unchanged.

Verification: `test-foreign-currency14383.cjs` passes editable template accounts/memos/zero values, the user's balanced income example after removing USD, saved FX rates, LAK reports, missing-rate handling, shared journal layout and 100-line pagination. `test-journal-polish14384.cjs` passes exclusive sidebar selection, collapse behavior, matching header styles and top position after scrolling, fitted voucher option width and matching main/personal pager alignment at 1440px and 1024px. Browser screenshots reviewed. Existing chart account codes and currencies were checked read-only against the database; no database records were modified in this release.
