# Journal description links — v143.187

Journal general descriptions and line memos now support labelled web references.
The same editor is available in AI Journal preparation. Select words and press
Ctrl+K / Command+K, or use the 32px Insert link button. With no selection the dialog
asks for both display text and URL. Select an existing link to edit or remove it.
Read-only links open in a new tab; while editing, Ctrl/Command-click opens a link.

## Storage and rendering

The existing text schema carries `[display text](https://source)` without changing
journal amounts, rate fields, posting RPCs, immutable retry payloads, or offline
queue formats. The editor displays linked labels rather than storage notation.
It synchronizes through the original input's value and input/change events so
manual snapshots, AI preparation, templates and local draft recovery retain links.
Newlines are preserved by the enhanced editor, including programmatic restores.

The renderer interprets only labelled HTTP(S) URLs, escapes all other content,
rejects credentials and executable schemes, and uses `noopener noreferrer`.
Journal, AI review, ledger, reconciliation, voucher and print paths share the
renderer; legacy read-only descriptions are decorated without changing their
stored values. CSV retains the complete textual label/URL. Ledger descriptions
include links from the general description when a separate line memo is present.
Journal source details also show the general description. Existing report and
phone layouts remain in place.

## ChatGPT / Google Sheets

Write complete link strings into the existing `description` or `line_memo` cells
with RAW text input. Do not use HTML, HYPERLINK formulas, or a rich-text label
without its destination: the journal importer reads values. The description must
remain identical across all lines of one draft. No header/column changes are
needed. The existing submission workbook's Start Here A20:B22 documents this
contract and the pending website-release status.

Keep the actual rate, effective date, source round, and calculation beside the
link. A current carrying-average snapshot or changing bank web page is not a
historical rate snapshot. Links can be saved offline; external pages require a
connection. The v143.186 account-rate comparison and Google connection caveats
remain applicable.

## Authorized opening-balance annotation

OJM260001 received the BCEL source link in its existing general description on
2026-10-28 at 12:02:10 UTC. The link points to the original BCEL exchange-rate
page and explicitly directs the reviewer to 30 September 2026, Round 1. It does
not pretend to be an independently verified date-specific permalink. Existing
midpoint calculations and the source date remain in the memo.

The edit locked the entry, checked its expected update timestamp and line hash,
changed only memo and updated_at, and inserted an audit record. All 109 line
records were byte-equivalent in their JSON representation before/after; the
hash matched. No amounts, rates, dates, identifiers or posting status changed.

## Validation and release

- `test-memo-links143187.cjs`: real Chromium selection and insertion, edit/remove,
  line memo undo, safe URL/HTML handling, multiline restore, Journal/ledger/source
  and print rendering, general-description fallback links, AI field events,
  offline editing and tablet width.
- `test-rate-ai-review143186.cjs`: actual AI cards, preparation and posting
  normalization retain description and line links as well as FX/book values.
- `test-rate-ai-regression143186.cjs` and `test-ai-stack143160.cjs`: full and
  isolated AI preparation, retained edits, queue/retry/archival behavior.
- `test-account-rates143186.cjs`: previous per-account comparison behavior.
- Canonical build, phase-0 structure and release manifest checks.
- The legacy phone-freeze fixture fails before phone startup on both the unchanged
  baseline and this branch (outdated auth mocks); it is not a passing check. The
  current phone-cache fixture checks the actual runtime instead. Its static check
  found the lazy tools cache key still fixed at v143.167; OPTIONAL now uses VERSION
  to match the runtime loader.

Publication is pending: automatic approval review previously rejected the main
branch push because it required approval for the exact live-publication action.
The new source changes extend draft PR #11; they must not be described as live
until that review is approved and deployment is verified.
