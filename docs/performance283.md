# Save and responsiveness release 143.283

Baseline: release 143.282, commit `4fa4107d960a55d8d9d3bc5aa6b4b5b0265936e2`.
The user authorized direct app improvements after a read-only performance assessment, with particular care for existing work and less frequently used workflows.

## Changes

| Path | Previous behavior | Release behavior |
| --- | --- | --- |
| Employee, leave, payroll, report, document saves | Generic saves entered the durable outbox and waited for the background idle scheduler. | Persist the recovery request first, then attempt its upload immediately when online. Return a database receipt only after verification; otherwise preserve the pending-device record contract. |
| Payroll completion | Confirmation drained the workforce queue, and any prior unresolved job could block a payroll run. | Upload the requested run, its prior versions, and prior employee/leave changes. Unrelated document/report jobs remain queued. Employee/leave conflicts still block completion. |
| Save retries | An interrupted new payroll finalization could leave the editor without the new record ID. | An identical retry reuses its original request and record ID. Changed figures cannot create a second new payroll while an earlier save for that month remains unconfirmed. |
| Typing recovery | General fields copied large models and wrote the full draft twice per input event. | Capture fields in memory immediately; snapshot models once after a 300 ms pause. Flush on submit, navigation, leaving the form, visibility loss, pagehide, beforeunload and explicit recovery save. Account editors retain their separate small recovery copy. |
| Access verification | Every unchanged 30-second access check also downloaded the user directory and review inbox. | Keep access verification and revocation. Refresh shared people/submission data on entry to their screens, actual permission changes, startup, relevant mutations, or explicit refresh. |
| Journal ID preview | Users lacking journal-view permission could still request the preview RPC. | Check journal-view permission before sending and accepting preview results. Final allocation remains server-side. |

No schema migration, live financial data update, accounting formula change, report-layout change, or permission-policy change is included. Main journal posting and numbering rules remain unchanged. The account recovery format, encrypted storage hooks, owner checks, version conditions, and exact payroll receipts are retained.

## Reproducible validation

Install the pinned test-only dependencies with `npm ci --prefix validation/performance --ignore-scripts`, then run `node validation/performance/run283.cjs` from the repository root.

The 15 suites exercise:

- 17 real save-module scenarios using fake IndexedDB and a deterministic remote service: immediate receipt; offline retention; independent new records; ordered versions; narrow upload scope; employee/leave prerequisites; same-payroll conflicts; offline finalization; interrupted retries; lost receipts after server commit; changed figures during uncertainty; remote version conflicts; permission rejection; concurrent saves; two tabs sharing locks/outbox; waiting for another tab's lock; actor/connection changes; storage failure.
- Draft batching and recovery through submit, pagehide, beforeunload, navigation, focusout and explicit flush; reload, discard, owner changes and storage failures; existing independent account-form recovery.
- Access-check request counts, screen-entry freshness, permission changes, transient failure, revocation/logout, and unauthorized journal previews.
- Actual payroll button handlers with synthetic storage: Save & Close, retained Entries/History, voucher/print routes, cancel, prepare/direct post, same-ID open-month correction, closed-month adjustments and lost posting-receipt recovery.
- Cross-year/All months reports, opening balances, original/LAK figures, report preparation cancellation and cache reuse, payroll foreign-currency mappings, tax-setting conflicts, report notices, signer defaults, journal draft recovery, memo editing and bulk validation.

| Controlled typing workload | 143.282 | 143.283 |
| --- | ---: | ---: |
| Input events | 40 | 40 |
| Synthetic recovery rows | 1,500 | 1,500 |
| Large draft writes | 80 | 1 |
| Model clone operations | 320 | 4 |
| Bytes serialized across writes | 63,790,631 | 797,383 |

The exact fixture output is in `validation/performance/draft-metrics283.json`. This measures operations and serialized bytes in jsdom, **not** production latency, network throughput or physical iPad responsiveness. Four unchanged access checks retained four access-verification calls and made zero organization revalidation calls; navigation and changed permissions still triggered refresh.

Release validation also requires canonical-source regeneration, JavaScript parsing, complete source ownership, updated cache keys in both workers/entrypoints, and matching release/diagnostic hashes. Test fixtures never connect to Supabase or create real payroll/journal records.

## Limits and remaining assessment work

This release addresses the proven shared save, typing and repeated-download paths. It does not claim every button in the app was manually exercised. Physical iPad keyboard, touch, printing and real network latency remain unmeasured. A sudden process/device failure within the 300 ms typing interval can lose the newest unsaved keystrokes if no leave event fires; explicit saves retain their durable-first behavior. Network latency, server rejection and conflicting edits can still delay or prevent confirmation.

Longer-term assessment items remain separate: splitting monolithic report/editor work, incremental report invalidation, reducing complete editor-tab snapshots, optimizing startup refresh overlap, and examining query plans before any database/index changes. They are not silently included in this release.

## Recovery and publication

Keep the baseline commit above as the rollback reference. Rollback should be a reviewed forward release with a new version/cache key, rather than a force reset of main or deletion of device data. No outbox, draft, ledger or payroll data is cleared by this update. The existing app update flow remains responsible for installing the release; no forced reload of the user's active session is performed during publication.
