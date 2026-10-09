# Last-push audit — v143.02

Audited Accounting main at 62fd6899eb0d3d4a65914b79ce288faa2bbfcdee on 2026-10-09.

## Corrections

- Prevent the voucher label from retriggering its own DOM observer continuously while idle.
- Restrict handwritten-voucher print interception to the active Document Editor so another workspace cannot print a stale voucher.
- Wrap Quick Access labels within their cards on iPad portrait. Preserve the approved phone layout.
- Advance desktop shell and changed-asset cache references to 143.02.

## Verification

- Document editor suite: 22 checks passed, including Insert Table default panel, voucher numbering and retries, saved template isolation, totals, transaction controls and tablet register layouts.
- Staff workflow suite: 18 checks passed, covering user restrictions, account choices, keyboard visibility, submission and journal preparation. No uncaught browser errors.
- Layout suite: passed on desktop, iPad portrait/landscape and phone, including print media. Inspected screenshots; confirmed corrected iPad card wrapping.
- Detailed reconciliation pagination: all nine header/footer placement combinations passed with long reports.
- Focused regression suite: three checks passed for idle mutations, active-editor printing and ten unique voucher pages.
- Independently inspected generated PDF metadata: exactly 10 A5 pages, each with a distinct voucher ID. Inspected the rendered first page.
- Offline suite: cache completion, offline reopening and pending/confirmed queue persistence passed without uncaught errors.
- Voucher archive integrity and JavaScript syntax checks passed.

Browser tests use isolated fixture data in Chromium. They do not certify physical iPad Safari, physical printer output or the live database installation. No production financial records or SQL were changed. Reserved voucher sheets are tracked; browser printing cannot confirm physical sheets successfully printed.
