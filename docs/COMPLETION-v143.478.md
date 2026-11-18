# Scanner batches and upload transport — 143.478

Photos collected before one explicit save remain together in a single bookmarked
PDF. Page groups retain separate entry-ID links. A successful linked save closes
the capture batch; taking or importing later photos starts another batch. The
phone footer exposes Next ID and Jump ID, and legacy PDF rows are compact.
Entirely unsaved, unstarted legacy split drafts may be reassembled atomically;
partially saved/uploaded PDFs retain their original retry identities.

Failed uploads retain encrypted scans and reuse the reserved Drive file ID.
The server forwards the validated client Origin when starting a Drive resumable
session. Updated clients refresh pre-fix sessions and can use a restricted native
Android upload bridge when supplied by the Hub. Native scanner integration is
prepared separately in OonJai-Marketplace/web; it is not yet a signed release.
The installed Hub bundles Accounting assets, so these client changes require a
correctly signed Hub update to reach that installed app. Web users receive this
release through the existing web update flow. No folders or accounting entries
were changed.

Passed: batch PDF and separate page links, interruption retention, link-only
retry, new-batch boundary, legacy safe recovery, native routing, legacy partial
PDF retries, ID/RLS/receipt-choice checks, native image/recovery tests, backend
origin/permission/ownership checks, generated-source integrity and cache keys.
Live Hub-origin preflights passed for both document services after deploying
accounting-documents version 21. Existing deployed dependencies were preserved.

Limits: no real company upload or physical phone capture was performed. Browser
layout preview was unavailable because its route was blocked. The older
`test-company-drive228.mjs` fails on its folder-list mock before upload; the same
failure was reproduced against unchanged HEAD. Targeted backend tests passed.
