# v143.252 verification

Implemented the shared processing lifecycle, direct user switching and owner checks, removal of the Payroll voucher shortcut, generated editor title preservation, salary voucher spacing/date/alignment, payroll form ownership, advance consistency validation, and company image persistence.

## Verified

- Managed browser preview with isolated synthetic accounts and a fake database; no production writes. Shared processing is a top-layer popover, pauses for an opened dialog and shows above it during Save. An actual editor close click opened the confirmation without a tab spinner or Processing indicator.
- Generated salary voucher, payment voucher, receipt and ledger titles survived new tabs and navigation.
- Direct browser clicks from Home to Ryan, then Gee Ann, changed the heading and assigned fund currency (LAK versus THB). Repeated programmatic switching also passed, including after removal of the obsolete tab container. Found and fixed repeated reparenting of the user-tab strip and the renderer's obsolete requirement for that container.
- Rendered salary voucher has a blank payment date, a 4 mm spacer after metadata, right-aligned attendance numeric headings, and no clipped page content. Removed the editor's forced left heading alignment.
- `validation/test-workspace-integrity252.cjs`: stale run inputs, employee reordering, finalized snapshots, advance/note conflicts, legacy results without source advance, company image readback, cross-device hydration, persistent removal, failed writes, sequential edits and account changes.
- Existing payroll refresh, contract calculation, attendance calendar, attendance reload and cache-key regression tests passed.

The browser test page used `validation/workspace-ui252.browser.js` with the existing cold fixture on an isolated static preview. Its limited RPC mock reports unrelated journal-window/Word of Hope fixture errors; those are not evidence of production failures. Browser checks are targeted regressions, not a claim that every application path was exercised. The local Playwright browser binary was unavailable, so actual pointer interaction was checked in the managed browser.

## Production evidence and limits

Read-only database checks found the affected October payroll's saved advance and explicit recovery note both at 900,000 LAK. No payroll amounts or historical documents were changed. Stale form writes were a reproducible path to mixing payroll inputs; the specific 3.5 million on the user's device was not directly inspected. Existing generated or manually edited voucher drafts are preserved; regenerate from the reviewed saved payroll to obtain the corrected presentation.

The company logo already exists in presentation settings. Existing header/footer images were stored only on the user's device and could not be read remotely. The updated app migrates those images after an administrator opens it on that device; existing database records win migration races. Successful writes are read back before confirmation. Other devices then load that company copy. No schema or permission expansion was needed.
