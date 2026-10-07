# v142.81 — Settings polish and assigned company ledgers

Based on main commit fc73a0c (v142.80). Preserves the approved tablet sizing, keyboard behavior, existing journal calculations and printing layouts.

## Install before website deployment

Run [INSTALL-ASSIGNED-LEDGER-v142.81.sql](../setup/INSTALL-ASSIGNED-LEDGER-v142.81.sql) in the existing accounting database, then deploy this website version. It adds a separate ledger-account assignment and two authorized functions. It does not rewrite, delete or renumber financial records, change posting assignments, or widen journal-table read/write policies. The assignment trigger prevents non-administrators from changing ledger grants even on older installations with broader permission-table policies. The installer can be rerun.

Do not rerun historical full installers. No new Edge Function is needed. The timeout correction itself requires no SQL.

## Changes

- Silent inactivity sign-out, including the saved phone workspace. Saving 120 minutes uses the initialized database client and confirms the persisted setting. The obsolete warning field is hidden while preserving compatibility with the existing policy table.
- Main and personal active journals have a shared description row spanning Account through Credit. Individual line memos remain. The personal entry ID no longer carries the redundant description/draft label.
- Phone workspace tabs and search appear above the banner/header. The new Ledger view uses readable stacked transaction cards on phones.
- Sidebar position comes from the user's configured position; the stray Roman numeral on Deactivate is removed.
- Administrators assign multiple posting accounts for read-only Ledger access beside Module Access. These grants are independent of posting/fund/category assignments.
- Ledger reads posted **company main-journal lines**, independent of authors and staff submissions. Monthly/quarterly period, date and search controls, opening/closing and running balances. Search never recalculates the running balance from only the matches. No ledger editing, print/export/refresh or reconciliation controls. Data is checked again on focus and while the visible view remains open; it is cleared on logout or rejected access.
- Currency Manager keeps its drag handles and one action menu. The duplicate visual ellipsis and Code movement arrows are removed.
- Archive period and scope share a row; audit copy and file opening use two columns. Reset uses four compact steps in a two-column grid, with verification/confirmation still gated by the existing backup preview.
- System and Payroll settings use compact grids. Leave-day counts are small non-currency fields. Print settings and banners are preserved.

## Validation

- Isolated PostgreSQL: assigned/unassigned accounts, other-user and inactive/anonymous denial, grant revocation, unauthorized grant updates, posted-only selection, opening and running balances; rerunnable installer.
- Browser fixtures: 120-minute persistence, silent logout, main and sub-user description rows, access editor, read-only ledger, phone tab placement and absence of page overflow.
- Existing tablet regression: font hierarchy, portrait keyboard spacing and restored Journal location after refresh.
- Visual inspection: Currency Manager, Archive/Recovery, System, Payroll, access editor, journal and desktop/phone ledger.

Live database installation and deployment are separate from these local fixture checks.
