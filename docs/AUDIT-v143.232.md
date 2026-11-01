# Accounting fresh audit — v143.232

Reviewed from the v143.231 main branch (`4973a8596f547e5badab1b97f0add1694823bf1d`) on 2026-11-01. This review used a fresh checkout, source/build inventory, synthetic browser and isolated SQL tests, and read-only inspection of the Accounting database and selected deployed Edge Functions.

## Confirmed defects and corrections

| Finding | Evidence | Correction |
| --- | --- | --- |
| Navigation could stop when a screen removes the old header | The all-workspaces browser test threw while opening Reports; both navigation functions dereferenced a missing `mainHeaderTitle`. | Guard the optional title in base navigation. Preserve tab selection, account scrolling and existing layouts. Add a regression test with and without the title. |
| Phone offline readiness used a stale release identity | Phone runtime declared 143.223 while both service workers declared 143.231. The ready-message version check therefore rejected the installed shell. | Coordinate the runtime, worker, shell and update versions at 143.232. Add a release-manifest gate for the runtime identity and its three cache references. |
| Repeated static cache downloads | Four exact duplicate FILES entries in the desktop worker and one in the phone worker. | Remove only the exact duplicates. Retain distinct versions and compatibility assets. |

Canonical sources and generated outputs are changed together. No journal data, numbering rules, accounting calculations, permissions, schema, Google authorization, or approved screen layouts were changed. No APK was rebuilt.

## Workflow review map

| Area | Reviewed behavior and verification |
| --- | --- |
| Startup and access | Login, session restoration/expiry, account and database switching, restricted workspaces, prepared views, inactivity, phone own-account scope. |
| Manual accounting | Balanced posting, foreign and book rates, durable requests, interrupted responses, edit/void, conflict retention, recovery, account ledger, chart/subaccounts, closing and year windows. |
| Reports and history | Isolated report windows, historical pagination, payroll/HR history, profit tax, ledger navigation, export/printing and retired journal overlays. |
| Review and automation | AI draft review and rate notices, inbox deltas, database-authoritative account delivery, scheduled occurrence approval and retry guards. |
| Receipts and scanner | Journal ID checks, sequence changes, private receipt status/viewing, memo preservation, receipt icon placement, backend receipt validation and phone navigation. |
| Company storage | Active/pending destination separation, settings recovery, separate receipt/archive destinations, annual workbook creation and date-based year routing. |
| Build and offline shell | Source ownership, generated parity, local references, release hashes, cache version coordination and shell tests. |

The inventory found 628 wired canonical modules and 380 generated assets, with no unmapped canonical code or duplicate HTML script/style inclusion. All 239 shipped scripts checked with `node --check` parsed successfully. A high-confidence tracked-file secret scan found no matching private keys, privileged service-role JWTs or recognized secret-token patterns; this is not an exhaustive historical secret audit.

The checked deployed source bundles for `accounting-documents`, `scanner-integration`, and `accounting-sheet-archive` matched their repository sources (18 bundled file instances). Other Edge Functions were inventoried but are not all covered by this parity comparison.

## Validation and test maintenance

All **105 suites passed** after fixture corrections and targeted reruns. See `validation/accounting-audit143232-results.json` for the final per-suite results and rerun history. The expanded gate covers current v194–v231 features in addition to the existing accounting suites.

Older fixtures were brought in line with current behavior: active-view preparation, authoritative report RPC snapshots, the company receipt-settings module, named TypeScript exports, and the approved remembered-phone session policy. Existing business assertions remain intact. The interrupted-journal fixture now seeds both test accounts in its authoritative chart so a background refresh cannot remove the offset account; it also waits for prior synchronization to finish and verifies offline queue persistence before injecting a conflicting remote edit. Session-clock and interrupted-journal scenarios run without concurrent Chromium jobs.

Build parity, phase-0 structure, release-manifest consistency and whitespace checks also passed. All writes made by tests were to local synthetic fixtures. Browser runtime dependencies were provisioned outside the repository.

## Read-only production findings

The inspected posted journals had no empty entries, duplicate issued numbers or currency imbalance. All public tables inspected had row-level security enabled. Scheduled journals had automatic posting disabled, and recent cron execution was succeeding.

Database advisor findings are review candidates, not automatically proven defects. Some no-policy tables intentionally deny client access. The anonymous executable functions inspected were request/password guards, so removing them blindly would break authorization. No advisor changes were applied.

## Changes held for separate approval

1. **Repository visibility and hosting:** the repository is public. If private source is intended, first confirm a hosting arrangement that preserves the published app, then change visibility. A visibility change alone is not a complete hosting migration.
2. **Database hardening:** separately review leaked-password protection, the three mutable-search-path functions, and executable SECURITY DEFINER permissions. Prepare exact SQL/config changes and verify legitimate admin/sub-user workflows before applying them.
3. **Database performance:** evaluate frequently used foreign keys, RLS initialization patterns and overlapping policies with actual query plans before adding indexes or rewriting policies. Do not remove an index simply because an advisor labels it unused.
4. **Large code consolidation:** multiple generations of wrappers, event listeners and observers remain wired into the app. Consolidate one workflow at a time with behavior/layout comparisons. Age, a versioned filename, or a high observer count is insufficient evidence that code is dead.

## Limits

This is a broad review and regression pass, not a proof that every path is defect-free. It did not exercise a physical phone camera, Android installation, iPhone native scanning, a real Google authorization/activation or real financial posting. Existing data checks are a point-in-time integrity check, not a financial audit. Larger schema, security, hosting and architecture changes remain pending separate approval.
