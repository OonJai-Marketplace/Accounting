# Long journals and approved-report draft recovery — v143.261

The real journal action bar stays at the bottom while desktop/tablet users scroll
through long entries. Generate remains beside Add. Phone layout is unchanged.

The 121-row browser fixture reproduced repeated full-entry work: report loading
performed 256 balance-state scans, and memo typing refreshed account badges and
other unchanged controls on each character. Bulk filling and Add/Delete now batch
calculation and undo capture. Memo-only typing skips amount arithmetic; required
general-description changes and amounts still validate. Badge, selection, link and
FX controls avoid redundant DOM mutations. FX account changes still refresh rates.

A matched browser run reduced report preparation from 256 to 2 balance-state scans
and its measured calculation work from about 1,224 ms to 32 ms. Memo typing no
longer called the balance calculator. Observed typing-to-frame samples changed
from 108–186 ms to 40–77 ms in this synthetic 121-row fixture. These are local
measurements, not claims about every device or connection. Initial large-table
rendering still has a cost; no data rows are discarded or virtualized.

Saved/restored journal drafts now retain report source IDs. Older drafts with
missing IDs recover the approved snapshot at posting. Manual regrouping is
matched against the supported individual, category-total or fund-total shapes,
then links are rebuilt without changing entered amounts or custom descriptions.
The existing server RPC still enforces exact approved sources and financial data,
review permission, period locks and retry protection. A fund-total layout uses one
journal date within the report month. This does not permit arbitrary changes to
approved category amounts/accounts. There is no approval reset or new database
migration in this release.

New report memos use `1. Rice`, `2. Fruit`, etc. A combined fund line uses a compact
range such as `Items 1–120`. Original dates, owner names, receipt IDs and supporting
document references remain in source records. Exact legacy generated memo text is
recognized and cleaned during draft recovery; custom wording remains intact.

Validation:

- `test-journal-performance261.cjs`: skipped memo arithmetic, required-description
  and amount checks, batched calculations, exception recovery and zero redundant
  badge mutations.
- `test-report-edits261.cjs`: manual grouping, source-link reconstruction, clean
  item memos, custom memo preservation, rates/dates/amount/account rejection and
  lossless draft snapshot restoration.
- `test-report-draft-recovery261.cjs`: actual posting wrapper recovers an older
  draft without resetting it, rebuilds a combined fund line's links, preserves
  entered descriptions and stops on account-switch races.
- Existing report-preview and cashbook tests pass. All 36 isolated PostgreSQL
  checks pass with actual server approval/posting functions, now also feeding
  reconstructed source links from drafts into those posting checks.
- Full app browser fixture: 121 rows, memo typing, Add, exact preview transfer,
  and bottom action visibility at the top and in the middle of the journal.
- The older `test-journal-editing143116.cjs` numeric/date sections pass. Its account
  double-click assertion expects clearing the selected account, while the current
  unchanged picker retains it. The failing section imports only unchanged files;
  this outdated expectation is outside this release.

All browser/database test data are isolated. No production report was returned,
reset, approved or posted during verification.
