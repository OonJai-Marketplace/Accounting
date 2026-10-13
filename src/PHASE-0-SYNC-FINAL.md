**Phase 0 synchronization, cache and recovery investigation — 13 October 2026**

Branch: `phase-0-modularization`. Baseline: `f8080f970a747cd423a0028a0aca22231338a12c`.

**Acceptance status: incomplete.** The corrections and isolated tests below are suitable for branch review. They do not establish that the reported Chromebook delay is resolved, identify the seven actual device findings, or provide row-level incremental downloads for every dataset. No production deployment, production accounting mutation, migration, or change to `main` was performed. Synthetic fixtures use a local HTTP server and browser storage. Supabase inspection was limited to schema/catalog/function definitions.

**1. What the investigation establishes**

Synchronization had unnecessary overhead: independently scheduled workers, repeated storage scans, a body-wide observer that repainted sync state during unrelated DOM changes, and refreshes triggered by focus/connectivity. These are real defects. Suspending them did not consistently eliminate navigation latency. The experiment therefore does not establish synchronization as the principal cause of the reported delay.

The trusted-click CPU profiles still point to rendering/decorating work: `scrollToAccountModule` in `desktop14245-3.js`, delayed scroll reset in `desktop14245-4.js`, `controls14317.decorate`, `tidy` in `desktop14245-5.js`, and `corrections14231`'s `orange`/`hasModuleBorder`. In the 1,000-line baseline, the profile attributed approximately 731, 587, 522, 501, 450 and 429 sampled milliseconds respectively across the sequence. These are sampled attribution totals, not independent click costs. Long animation frames include substantial style/layout work. No broad rendering refactor was added to this synchronization patch.

Desktop and tablet share desktop bundles; the standalone phone has a separate runtime and execution path. Chromium CPU throttling is not a measurement of either the user's Chromebook or iPad.

**2. The seven reported Data Checking items**

The actual seven records are **not available in this execution environment**. Their IDs, creation times, payloads and device-local status were not supplied, and the user's Chromebook IndexedDB/localStorage was not accessible. No individual classification or server confirmation can honestly be assigned to them. None of those seven records was deleted, completed, merged, or modified.

The existing screen counts findings, not necessarily transactions. Its actual sources are:

| Source | Existing storage / identity | What a finding means |
|---|---|---|
| Sub-user entry queue | localStorage `ojm-offline14239:<database>:<actor>:entry:<p_key>` | Complete staff-editor request; pending, uploading, failed/uncertain, or confirmed receipt |
| Older interrupted staff saves | localStorage `ojm_staff_save14228:<database>:<actor>:<owner>` | Same original request key and payload awaiting confirmation; older records may lack creation time |
| Main journal | `pendingPosts99`, backed by `ojm-main14333:<database>:<actor>:<id>` | Original posting request; a receipt can already exist while journal refresh is pending |
| Multi-date journal | `ojm_journal_batch1440:<database>:<actor>` | One atomic batch request with individually dated entries and original batch key |
| HR, payroll, reports, documents | IndexedDB `ojm-local14333`, `state`, actor/database `outbox` | Versioned record operation, conflict, failed save, or confirmed overlay awaiting a complete verified snapshot |
| Cache/storage diagnostics | `offline14239.storageFailures14335` / local-first error state | A failed read/write or incomplete cached dataset; not an accounting transaction |
| Preparation warnings | `localFirst14333` setup notice | Download/preparation problem; not an accounting transaction |
| New managed recovery copies | Same IndexedDB `state`, `recovery14351` key | Backup verification or external-file cleanup task covering listed original references |

Data Checking now displays the original reference, source, creation time where recorded, dates and available amounts. It explicitly labels missing historical creation times instead of inventing them. A duplicated view of the same staff request key is shown once without altering either stored request. Journal batches are visible throughout their pending lifecycle. Server-confirmed overlays and backups use **Synced — Cleanup Pending**. Recovery findings list every covered reference. Existing reconciliation/diagnostic checks and possible-duplicate journal warnings remain separate from upload requests.

The real seven-item audit still requires read-only details from the affected device and receipt comparisons under the correct user/workspace. The increased count alone proves neither seven unsent transactions nor data duplication.

**3. Automatic triggers and duplicate work**

| Existing mechanism | Correction |
|---|---|
| `auto-sync14256` independent retry timer | Compatibility entry point delegates to the coordinator |
| `local-first14333` 15-second poll and one-second schedule | Removed autonomous timers; saves request the shared idle lifecycle |
| `idle-sync14341` repeated 60-second idle broadcast | One session per continuous two-minute idle transition |
| `startup14257` initial/retry/online/visibility revalidation | Marks work for the coordinator; retained explicit login preparation |
| Assigned-ledger 30-second timer / focus refresh | Coordinator refreshes visible assigned ledgers serially; explicit filters remain immediate |
| Header bell 15-second status scan | Existing data events and idle transition update the shared bell |
| `offline14239` body-wide MutationObserver | Removed; queue state memoized and invalidated on actual storage changes |
| `saveNotices14234` repeated localStorage scan | Actor-scoped cache invalidated by save/storage events; shared bell owns its presentation |
| Phone three-second retry poll / online and focus refresh | Standalone runtime uses one two-minute idle timer, pauses between queued records |

Navigation still activates a genuinely unprepared authorized area; it does not start a full synchronization. Existing Review/workflow single-flight preparation, journal loading, explicit ledger period changes, service-worker shell caching and immediate server authorization remain in place. Narrow UI observers needed for review badges were retained. The 24-hour session inactivity timers were not repurposed.

**4. Exact canonical source changes**

All generated compatibility scripts/bundles are rebuilt from `src/manifest.json`; they are committed with their source. HTML and service-worker asset versions change only for affected assets.

| Canonical file | Functions / change |
|---|---|
| `src/core/sync/idle-sync14341.js` | `activity`, `arm`, `run`, `pending`, `show`, `persist`, `paint`: authoritative desktop/tablet session, Web Lock, explicit summaries and payload/record counts |
| `src/core/sync/auto-sync14256.js` | Former autonomous runner delegates scheduling |
| `src/core/sync/local-first14333.js` | `schedule`, `sync`, `snapshot`, `findings`, exported `sync/retry`: coordinated writes, independent-failure continuation, payroll dependencies retained, durable revision reuse, cleanup state |
| `src/core/sync/offline14239.js` | `queue`, `persist`, `sync`, `retryEntries`, fetch wrapper, journal snapshot wrapper: memoized queue, complete eligible retries, measured payloads, persistent checkpoint reuse, removed observer |
| `src/core/sync/payroll-window14334.js` | `read`, `checkpoint`, `restore`, `reset`: actor/range/revision checkpoint |
| `src/core/startup/startup14257.js` | `tasks`, `prepare`, `background`, event handlers: six displayed stages, coordinated revalidation, application-offline-aware cache reuse |
| `src/core/auth/device-vault14334.js` | Reconnect queues routine sync through coordinator |
| `src/maintenance/backup/sync-recovery14351.js` | New `collect`, `validate`, `create`, `restore`, `verify`, `cleanup`, `acknowledge`: complete portable recovery and managed cleanup |
| `src/maintenance/diagnostics/sync-assessment14332.js` and `.css` | `findings`, `render`, `focus`, `beforeClose`: central controls, original references, history, notification routing, scoped progress UI |
| `src/shared/presentation/header-profile-v104.js` | `updateBell`, notification click handler: one shared list and exact affected-period navigation |
| `src/shared/ui/save-notices14234.js` | `staffPending`, `changed`, `paint`: event-based cached legacy requests and shared bell ownership |
| `src/shared/data/workforce-storage-v82.js` | `saveWork82`: payroll finalization waits for an exact server receipt; offline finalization refuses success and retains draft |
| `src/subusers/accounts/assigned-ledger14281.js` | `mount` refresh scheduling and exported `refresh`: serial idle refresh, no independent polling |
| `src/bridges/bookkeeping-startup/workspace-v99.js` | New journal jobs preserve creation timestamp |
| `src/bookkeeping/journal/journal-batch1440.js` | New batch jobs preserve creation timestamp |
| `src/subusers/phone/runtime/durable-sync.js` | `sync`: idle activity checks between operations and before refresh |
| `src/subusers/phone/runtime/registration-and-scope-close.js` | One phone idle timer; deferred routine online/focus work |
| `src/subusers/phone/runtime/scope-and-state.js` | Runtime cache version |

**5. Controlled navigation measurements**

The companion `validation/phase0-sync-final-results.json` contains every scale run, per-click timing, request/IndexedDB counts, script/task/layout measurements, long tasks, forced-layout observations, CPU profiles and test outcomes. Initial coordinated results that were slower are retained. See the table below for the release-candidate run. Subsequent corrections were confined to recovery-import timestamps, the recovery passphrase UI and completion classification; they do not execute on the measured navigation path.

A = unmodified `f8080f9`, synchronization enabled. B = the same baseline with nonessential sync timers and the sync observer suspended only inside the test harness. C = corrected coordinator. Authentication, permissions and posting validation remain enabled in B. Each uses identical synthetic records and real clicks: Settings, Bookkeeping, Sub-users, Accounts, HR, Payroll, Dashboard, then the same sequence offline. The harness records click-to-visible and an event-loop responsiveness proxy separately; it does not equate rendering visibility with readiness for another interaction.

The fixtures contain 137 accounts, 10 employees and 1,000 / 4,000 / 20,000 journal lines. The latter two simulate one and five years at 4,000 lines/year; 1,000 is a representative smaller fixture, **not a measurement of production row count**. Chromium runs at 1440×900 and 4× CPU slowdown. Each run has seven online and seven offline navigation samples. This is a small synthetic sample with no production network latency and no pre-existing seven-item queue. Pending-operation integrity is tested separately. Observation windows include a short tail; nested spans and overlapping long-frame/long-task measurements must not be added together.

| Journal lines | Mode | Online visible / responsive (ms) | Offline visible / responsive (ms) |
|---:|---|---:|---:|
| 1,000 | A: existing | 850.4 / 1379.9 | 760.0 / 1216.8 |
| 1,000 | B: suspended | 764.8 / 1088.9 | 673.9 / 1012.8 |
| 1,000 | C: final coordinator | 976.4 / 1258.8 | 770.7 / 1230.1 |
| 4,000 | A: existing | 841.2 / 1225.3 | 740.6 / 1061.8 |
| 4,000 | B: suspended | 675.5 / 1030.9 | 679.2 / 1012.2 |
| 4,000 | C: final coordinator | 868.3 / 1197.6 | 824.5 / 1245.6 |
| 20,000 | A: existing | 962.7 / 1283.6 | 735.0 / 1046.3 |
| 20,000 | B: suspended | 921.9 / 1305.3 | 657.2 / 1062.3 |
| 20,000 | C: final coordinator | 901.8 / 1295.6 | 912.2 / 1311.5 |

Medians above; all individual clicks and maxima are retained in the JSON.

| 1,000-line online sequence | Median script / layout / style (ms) | Long tasks | IndexedDB operations / REST requests |
|---|---:|---:|---:|
| A | 935.1 / 42.9 / 244.0 | 27 | 1 / 1 |
| B | 736.6 / 70.0 / 190.1 | 25 | 1 / 1 |
| C | 912.6 / 58.5 / 235.0 | 24 | 1 / 1 |

These measurements are insufficient to certify Chromebook navigation or responsiveness during a large idle download. The remaining rendering functions above need a trace from the affected hardware. Horizontal/tab routing is exercised by regression tests, but the timed A/B/C sequence is primarily left-navigation input.

**6. First and returning login / persistent cache**

The existing preparation pipeline now presents six stages (reference/identity; workflow/setup; review/audit; journal; HR/payroll; documents), with no artificial wait. It authenticates, checks permitted data and completes required preparation before ready. First download duration depends on actual records/network; no two-to-five-minute delay is imposed.

Persistent snapshots survive page reload and normal logout/login; they remain encrypted by the existing device vault and partitioned by database, actor and applicable workspace/range. Authentication and current permissions are still checked. Returning journal/payroll windows seed their persisted revision before server verification. Unchanged journal fixture: three page requests on first login, one verification page on return. The verification endpoint includes its first page; this is not a zero-download check. Changed journal fixture: three pages, with new/edited/deleted records replacing a complete snapshot only after consistent revision validation. Offline reload reuses the persisted copy without treating it as a fresh server acknowledgment.

**Limitation:** `journal_window14333` / `payroll_window14334` expose whole-window fingerprints, not row deltas. Other datasets do not all provide complete deletion/void tombstones. They retain safe full refreshes where required. This patch does not claim all-dataset incremental synchronization. A durable server change feed with scoped sequence/checkpoint and deletion coverage requires a separately approved schema design/migration. No migration was created or run. Browser reload and new-context restoration were tested; a physical Chromebook reboot was not.

**7. Manual and idle synchronization**

One Data Checking **Sync All Pending** initiates the desktop/tablet session covering versioned local work, staff requests, main-journal requests, batches, workspace refresh and recovery verification. Individual requests retain their IDs, dates and payloads. Independent local records continue after a failure; subsequent versions of that row and payroll dependent on unresolved earlier work remain held. Conflicts/blocked records require existing review or explicit retry; they are not silently overwritten.

Meaningful activity resets a separate 120,000 ms timer. One continuous idle period starts one routine session. Returning activity pauses noncritical work between records/stages; a request already awaiting a receipt finishes safely. In-tab single flight and the account/database Web Lock prevent duplicate sessions. Same-account activity broadcasts between tabs. Without Web Locks, only in-tab exclusion is guaranteed. Manual sync remains explicit and immediate. Journal posting, review, period locking and server checks keep their authoritative path; payroll finalization additionally requires the confirmed receipt before returning success.

**8. Recovery protection and cleanup**

The pre-existing **Download entry details** is a diagnostic/payload copy, not a complete portable importer. It remains available. The new encrypted recovery export collects actual pending outbox/staff/journal/batch payloads, unique request IDs and available creation times. AES-GCM uses a separately entered passphrase (minimum 12 characters), PBKDF2-SHA256, 600,000 iterations and random salt/IV. The passphrase is not stored. A completed download is outside site storage; the UI says the download was requested and asks the user to verify the saved file, because browser code cannot verify the Downloads filesystem.

Import validates file format, account/database, identities, payload shape, duplicates, fresh permissions, relevant periods and server confirmation. It preserves references, rejects conflicting local payloads, and does not post automatically. The full imported copy is persisted before queues are changed, so an interrupted import remains retryable.

Managed cleanup obtains fresh server evidence: exact journal receipt payload/result, exact versioned record data (plus payroll period/status), or the matching complete staff-editor snapshot. Offline/stale fallback cannot authorize deletion. A pending or failed covered operation keeps the copy. Successful cleanup removes only the app-managed recovery payload and reads storage back to verify removal; reference metadata remains. Actual journals, payroll tables, archives and permanent reports are untouched.

Downloads/Drive files are never automatically deleted. The queue displays **Manual Backup Cleanup Required** after managed cleanup, and completion requires the user's acknowledgment of external-file removal. Acknowledgment is not evidence of posting. Superseded generic record versions can be impossible to prove from the current row alone; those backups are conservatively retained for review.

**9. Progress and persistent notifications**

One nonmodal session window shows measured UTF-8 attempted request payload bytes and measured response payload bytes, operation/record counts, unresolved references, stage and backup-cleanup result. Units are decimal: 1 KB = 1,000 bytes; 1 MB = 1,000 KB. Totals are explicitly unknown and the progress element is indeterminate. These are **payload sizes**, not compressed/TLS network transfer totals; unrelated REST activity occurring during a session can contribute to the session's measured payload counters.

The latest result plus 20 lightweight session summaries persist per actor/database. A completion/partial/failure result remains unacknowledged across navigation/reload until explicit acknowledgment. Outside clicks and Escape do not dismiss it. It is nonmodal, with a Data Checking action, so recovery controls remain accessible. A previous running session with no completion record is reported as unknown/interrupted, not falsely completed. The bell uses the central findings and opens the correct affected period/reference; it does not create a new notification record on every poll.

**10. Test evidence and limits**

| Test | Latest result |
|---|---|
| `test-app-offline14333.cjs` | PASS |
| `test-finalization-confirmation.cjs` | PASS |
| `test-idle-clock14343.cjs` | PASS |
| `test-idle-queue14341.cjs` | PASS |
| `test-ledger-idle-navigation.cjs` | PASS |
| `test-navigation-diagnostic.cjs` | PASS |
| `test-navigation-label-cost.cjs` | PASS |
| `test-phase0-browser.cjs` | PASS |
| `test-phase0-inactivity.cjs` | PASS |
| `test-phase0-navigation-preservation.cjs` | PASS |
| `test-phase0-preload.cjs` | PASS |
| `test-phase0-session-browser.cjs` | PASS |
| `test-phone-idle-sync.cjs` | PASS |
| `test-picker-navigation-cost.cjs` | PASS |
| `test-picker14338.cjs` | PASS |
| `test-prepared-workspaces.cjs` | PASS |
| `test-report-assets14349.cjs` | PASS |
| `test-report-workflow14349.cjs` | PASS |
| `test-sync-cache.cjs` | PASS |
| `test-sync-coordinator.cjs` | PASS |
| `test-sync-mixed-recovery.cjs` | PASS |
| `test-sync-recovery.cjs` | PASS |
| Source/build/structure and asset references | PASS |

Meaningful tests cover: local offline save durability, first/returning/changed journal cache, reload, actual encrypted-file download, fresh-storage recovery, multiple requests at different times, partial failure, independent continuation, lost-response/duplicate retry protection, cleanup refusal and readback, manual cleanup acknowledgment, permission/closed-period import refusal, actor isolation, payroll finalization confirmation, two-minute idle/activity pause, cross-tab exclusion, persistent result acknowledgment and bell routing. Existing suites cover prepared Review/reconciliation data, returned-report workflow, reports/printing, Settings/navigation preservation, account pickers, offline drafts, and desktop/phone 24-hour expiry/reauthentication.

During implementation, tests exposed and corrected request-body measurement after consumption, online-forced payroll refresh during a valid application-offline session, and the account-password validator intercepting the independent recovery passphrase field. The actual encrypted download test subsequently passed, and managed cleanup left that file intact. Completion classification now retains a needs-attention result for unresolved storage diagnostics even when no upload remains. A legacy ledger test expected the removed focus refresh and now exercises coordinator-driven refresh. One browser logout timing test failed once during the earlier run and passed on rerun; all attempts remain in the evidence file. These are fixture tests, not a production-accounting certification or a complete end-to-end simulation of every accounting approval path.

**11. Remaining acceptance work / separate approvals**

- Inspect the actual seven findings from the affected Chromebook, including creation time, source, status, server receipt and backup state, without changing them.
- Measure the same user navigation and horizontal tabs on the Chromebook and iPad, including active work resuming during an idle sync; investigate the remaining decoration/layout trace before claiming the performance gate passed.
- Approve a server change-feed design/migration only if complete row-level incremental synchronization is required for datasets lacking deletion-aware change tracking.
- The standalone phone receives the idle policy correction but retains its existing phone sync/recovery UI. The new unified recovery/progress interface is desktop/tablet; full standalone-phone parity is not claimed. Phone/desktop locks are separate runtime locks.
- Obtain explicit access before managing files in Downloads or Drive. The application currently requires manual cleanup acknowledgment.
- Decide how to verify superseded versioned-record backups when current server rows no longer prove the older operation. Until then they remain recoverable.

**12. Delivery**

The reviewed source, generated assets, new isolated tests, report and summarized evidence are committed together to `phase-0-modularization`. The final response records the actual pushed commit and verification. This report is intentionally an incomplete-acceptance report, not a Phase 0 completion declaration.
