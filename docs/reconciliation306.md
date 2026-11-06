# Reconciliation 143.307 (306 database functions)

Bookkeeping selects the actual open book, preserves the account picker, excludes
completed accounts for that month, and shows saved amounts with meaningful status.
The older form-restoration hook excludes reconciliation; labels target the visible
search field and the hidden native select cannot open a second dropdown. Concurrent
entry loads are coalesced and changing an account does not request server data.

Legacy cloud and device copies use the same immutable key. No real reconciliation
was deleted or inserted during verification. Editing uses an expected saved version,
updates the same row, archives the previous version, and rejects closed/locked books.
Existing month-closing requirements and account-specific fingerprints remain intact.

Reports select one/multiple accounts, dates, summary/ledger and 0–3 signatories.
Ledger rows enter the document editor with the summary. Compact columns/dates omit
duplicate currency and working controls. GL search shares the action toolbar.

Validation: test-reconciliation306-dom.cjs (jsdom, including main-account search,
add/remove, picker identity, monthly completion, editing, exports and signatories);
test-reconciliation306-db.cjs (local PostgreSQL/WASM); test-reconciliation305-db.cjs
(existing fingerprint/closing regression); module build/check, phase0 structure, JS
syntax and release manifest. These replace old DOM assertions for quarter selection,
Saved status and unrestricted history. Browser launch is unavailable in this runtime;
these checks do not establish physical iPad rendering.

Database migration applied successfully. Read-only checks retain saved records
and an empty new version audit (no live test edits). Security advisor notices for
the private deny-by-default audit table and authenticated SECURITY DEFINER RPCs
are intentional: no anonymous execution or direct client audit-table access, fixed
empty search paths and explicit active-administrator/owner checks. Reference:
https://supabase.com/docs/guides/database/database-linter

## Completion review, 6 November 2026

Integrated the unpublished reconciliation work onto published amortization 143.306.
Finished compact currency labels and hidden working IDs in the entry window; added
per-account ledger details beneath the Reports summary. DOM regression checks cover
these additions. The open-book query confirms October 2026 and seven of nine
required accounts complete. Cashier Float (1030) and BCEL LAK (1040) still require
the user’s actual reconciliation. No books were closed or test records posted.

All requested work groups are covered: compact stable searchable account selection;
legacy duplicate identity merging; status and actual amounts; monthly completed
account filtering; open-book versioned edits; history in Reports; account/date/
content/signatory export; short report headings; no Status/Report columns; ledger
details in the report and editor; General Ledger search in the action toolbar;
Funds shortcut removal; required-account closing checks; inline bank date selector
and explanatory asterisk; hidden working IDs; single native/search picker;
coalesced entry loading with no server reads on account choice.
