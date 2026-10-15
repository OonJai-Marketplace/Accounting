# Phase 2 — Version 1 v143.86

Builds on Phase 1 commit 3f593d4. Phase 3 calculator, transaction types,
automatic posting-rate selection and gain/loss generation remain deferred.

- Add/Edit Account and Sub-Account have a saved Track foreign-currency funds
  checkbox and expandable help. Eligible accounts are regular foreign-currency
  posting assets. Non-posting parents aggregate children automatically.
- The setting defaults off; existing accounts and journal amounts are unchanged.
  Sub-account settings synchronize to their linked posting account atomically.
- Fund valuation uses recorded LAK opening values plus recorded debit less credit.
  Average carrying rate is closing recorded LAK divided by closing foreign units.
  Saved book rates take precedence over transaction rates. Existing entries are
  never repriced merely because tracking is enabled. Transfers display their
  saved valuation; this phase does not invent missing transfer book rates.
- Accounts balances and financial reports include explanatory parent and child
  valuation detail. Nested parents sum leaf posting accounts once. Mixed original
  currencies remain separate; no mixed-currency average is calculated. Same-
  currency tracked descendants can show a combined weighted carrying rate.
- General Ledger shows saved LAK rates and tracked-account average rates. Printed
  reports and CSV exports retain valuation detail. Parent account ledger filters
  select descendant posting accounts.
- Pending local and voided records are excluded from confirmed account balances,
  matching the existing financial report policy. Missing historical valuations
  withhold LAK financial totals; original-currency reporting remains available.

Validation: browser calculation/form/save/reload/print checks in
validation/test-foreign-funds14386.cjs; rollback-only live setting and constraint
checks in validation/test-foreign-funds14386.sql; Phase 1 durable journal offline,
retry, edit, void, recovery and isolation regression suite. Canonical source
builder and Phase 0 structural asset gate are retained. The structural correction
hashes record intentional Phase 2 changes, not behavioral test certification.

Database: setup/INSTALL-FOREIGN-FUND-TRACKING-v143.86.sql adds two boolean columns
and extends the existing admin-guarded sub-account synchronization. Existing RLS,
function privileges and search path are preserved. The security advisor reports
existing project-wide warnings outside this change; none names the changed
sub-account synchronization function or the new setting columns. Those unrelated
warnings are not claimed to have been resolved.
