# Add Account draft performance — v143.272

The shared device draft listener previously cloned all open payroll and sub-user workspace models, serialized the complete recovery state and wrote it through the encrypted storage wrapper twice per account input event. Cached dropdown data did not prevent these synchronous writes.

Account and sub-account input now updates fields in memory and writes a separate, owner-scoped encrypted recovery copy after 300 ms of inactivity. Leaving the form, submitting, page hide and navigation flush pending recovery. Reset writes an empty account copy so older full drafts cannot revive cleared fields. Other module snapshots and explicit database saves retain their existing behavior.

Validation:

- `test-account-draft-typing272.cjs`: 40 name edits formerly caused 80 full writes (63,782,551 bytes), 320 model clones and 80 payroll UI reads with a synthetic 1,500-row payroll draft. The new path causes no synchronous writes/model clones and one recovery write under 2 KB after the burst. Covers currency changes, old draft migration, reload, focus within/outside the form, submit, reset, navigation, page hide, user changes, storage retry and continued payroll model capture.
- Cloud Chromium fixture using the actual Add Account markup, draft modules and existing GCM implementation: the old path made 54 encrypted writes totaling 43,056,738 bytes after 27 characters, spending about 2,989 ms in encryption/storage. The new path accepted the complete 40-character name and USD selection with no model clones; after a later code edit and leaving the form, two small saves totaled 566 bytes and about 2.2 ms. Reload restored the name, code and USD selection.
- Existing account-save, confirmation, Sheet-event and payroll-report/Overview regression checks passed.

Timing is from an isolated browser fixture with synthetic data, not the user's physical device. No financial records were submitted or modified during verification.
