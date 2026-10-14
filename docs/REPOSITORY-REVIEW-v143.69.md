# Version 1 audit continuation — v143.69

Baseline: `69772050039daa0184e3cf37963e6be9af54ccef` (v143.68).

## Acceptance status

**Incomplete: this is a verified incremental cleanup, not completion of the user's requested exhaustive line-by-line audit. Navigation is still measurably delayed.** The baseline inventory contains 1,510 tracked files, including 578 canonical modules, 354 generated outputs and 77 SQL scripts. No file is classified as safe to remove merely because its suffix is old or HTML does not reference it directly.

`validation/audit-coverage14369.json` records every baseline file, its line count, hash, category, static findings and manual review status. Unfinished manual review is explicitly marked. The inventory tool now scans every UTF-8 file rather than only canonical JavaScript, including title/heading lines, database calls and storage calls. Generated files are checked against the canonical build. Binary assets have no text lines and are catalogued separately.

## Verified corrections

| Canonical file | Defect and correction |
| --- | --- |
| `src/core/navigation/interface-v69.js` | Body mutations reran reminder, adjustment, balance-label and table scans throughout the document. Batch changed subtrees and affected tables/controls; retain full explicit navigation, setting-change and print updates. |
| `src/shared/formatting/financial-numbers14231.js` | Unrelated insertions rescanned every input and financial display. Revisit affected forms/tables and new subtrees; preserve explicit full refresh, change handling, values and caret position. |
| `src/shared/ui/search-autofill14285.js` | Every mutation revisited all search controls. Enhance inserted controls and the newly opened page; preserve identity-autofill protection and user-entered searches. |
| `src/bookkeeping/journal/transaction-consistency14300.js` | Every mutation rescanned all histories and date cells. Initialize changed history roots; update affected date/activity roots, with full date reformatting when the configured format changes. Preserve explicit navigation selection and dynamic report-button decoration. |
| `src/shared/presentation/layout-voucher-polish14301.js` | Unrelated changes ran audit, period-review and editor presentation work. Schedule only when the owned surfaces or connection controls change. |
| `src/subusers/workspace/workspace-consistency14343.js` | Navigation ran immediate layout and scheduled layout again. Coalesce it before paint; avoid repeated no-op class writes. Keep the existing menus, navigation order and empty states. |
| `src/subusers/entries/subusers-final-v55.js` | An older synchronous observer rescanned all sub-user posting labels for every body mutation. Process the changed tools and inserted subtrees. |
| `src/bookkeeping/journal/entry-number14257.js` | Every page event checked the next journal number and rewrote a hidden label. Only Journal navigation requests its preview; unchanged labels do not mutate the DOM. Server-assigned final IDs and post-load refresh remain intact. |

No financial records, SQL policies, accounting calculations, permissions or pending-save queues were modified. No phone layout/CSS redesign was made.

## Database and cache inspection

Read-only catalog/function/statistics queries were made against the connected Accounting project. Accumulated `pg_stat_statements` records show 312 `journal_window14333` calls averaging 5,391.22 ms (minimum 47.40 ms, maximum 7,757.99 ms). These are historical aggregated database timings, not a measurement of the user's current click or proof that every request is still slow.

The journal RPC reads posted rows, calculates earlier opening balances for the first page, and computes a revision across posted lines through the requested end date on every page. Statistics estimate 915 live journal lines and 103 journal entries. Journal/account policies include repeated account-status, password-change and workspace checks. The inspected helper functions are STABLE, but policy optimization requires role-based plans and permission regression tests before deployment. No policies were weakened or removed based on timing alone.

The browser already caches complete journal snapshots under database/actor/workspace/period keys. `startup14257` requests cache-first initial journal loading; `offline14239` restores the snapshot and overlays pending work. Fresh revalidation is separately coordinated. `year-window14333` reuses cached rows when revision and account signatures match, but still contacts the server to obtain that revision. Cache loading also retains accounting-period checks. These are distinct from blank navigation: the synthetic browser reproduces substantial delay with immediate fixture responses.

## Verification and limits

- All 57 permitted accounting navigation targets reached the expected active page without page errors.
- Desktop 1440px and tablet-width 1024px section menus, selection, banner order and empty states passed.
- New regressions cover dynamic financial values, preserved caret, search setup, dynamic history/report controls and absence of the targeted global scans on unrelated status updates.
- Journal preview regression covers unrelated navigation, unchanged label writes and editing IDs.
- Nine date formats, live format changes, calendar opening, retained controls, dynamic panel borders and resize passed.
- Standalone phone worker readiness and offline reload passed.
- Canonical build, structural ownership, HTML references and release URL checks are required before publication.

`validation/navigation-review14369.json` contains the same 137-account/1,000-journal-line sequential synthetic comparison used for the previous release. Its double-animation-frame proxy is not field INP or an actual-device guarantee. Remaining hotspots include workspace visibility/layout, border decoration, legacy presentation observers, date controls and draft restoration. These remain explicit work, not certified-clean files.

Final comparison: median proxy 605.2 ms before and 531.2 ms after (12.2% lower). Repeat Blank: 529.7 ms before, 480.7 ms after. This remains far from the requested instant response.
