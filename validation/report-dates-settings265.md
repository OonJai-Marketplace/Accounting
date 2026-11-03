# Report dates and user settings — 143.265

The detailed fund-total format preserves each original source date. Its combined
fund rows use the selected report-month date, initially month-end. Multiple dates
is enabled in the main Journal. Source-date flags survive draft snapshots and
prevent a header-date change from replacing the detail dates. Older prepared
formats remain supported; Change format prepares the new dated layout.

The server continues to match exact approved source IDs, accounts, amounts,
currencies and FX rates. Fund dates may differ within the report month; source
detail dates may not. The report balances as one journal. Approval, permission,
period locking, immutable retry receipts and original source links are preserved.
The existing live same-month validators are included unchanged for compatibility
with fresh installations that previously retained older date validators.

Account pickers stage changes until Save User. Done accepts choices into the
parent form; Cancel/discard restores account controls and module matrix state.
User actions form a desktop/tablet 2×2 grid. Role and status remain with the user
identity. Modal spacing is scoped to these windows and desktop/tablet widths.

Verification completed:

- Isolated fresh PostgreSQL-compatible database: all 36 integration checks pass,
  including all four current/legacy report modes in LAK and THB. Original detail
  dates and independently selected fund dates persist exactly. Wrong detail
  dates, missing fund dates, out-of-month dates, altered amounts/rates, missing
  approval, missing permission and closed periods are rejected. Retries are
  idempotent. No production financial or user-permission records were edited.
- Real picker and editor-protection unit tests: Done has no discard prompt;
  Keep Editing stays open; Discard restores account/radio/module state; only the
  explicit parent Save action saves. Legacy report recovery/memo tests pass.
- Isolated Chrome visual and interaction review at 1363×936: 2×2 action grid;
  compact aligned user and assignment windows; Done and Discard paths; reopening
  after discarding the parent form restores the saved account selections.
- Report preview and main Journal show 1/2/3 October detail dates and 31 October
  combined fund credit. Multiple is checked and the journal displays Balanced.
  Changing the header to 30 October changes the fund row only.
- Existing synthetic iPad account-control/resize and long-journal performance
  regressions pass. No physical iPad Safari claim is made.
