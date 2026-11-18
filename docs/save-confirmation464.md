# Save confirmation — v143.464

An explicit Save still writes durable local intent first and attempts the original
request against Supabase immediately when connected. Editable records send in the
background; finalized records retain their existing server-confirmation requirement.
Login and reconnect retain the bounded delivery pass. Full sync stays manual.

The old “Verify device copy” finding was generated even after Supabase returned a
matching saved row. A later full workspace refresh used to retire that finding.
Now the save path rereads the persisted outbox and verifies the database response
against the requested record ID, version, data, and payroll period/status where
applicable. It marks this durable receipt verified in the same account's outbox.
This needs no additional server request or full workspace reload. Prior matching
confirmed receipts are verified during initialization, including offline.

Verification does not delete or retire the confirmed recovery copy. It continues
to overlay an older cached snapshot, including after offline reopening. Existing
snapshot retirement rules still require a fresh snapshot containing the saved
version. Missing/mismatched receipts, storage failures, conflicts and unconfirmed
saves remain visible. An interrupted save keeps its original identity for retry.

Negative utilization finalization warns once before confirmation. The completion
message reports success without repeating the acknowledged warning. A draft save
still shows its one negative-balance warning because it has no pre-save dialog.

Validation: isolated production IndexedDB/save-path tests cover background uploads,
receipt verification, no transient cleanup finding, offline delivery, lost replies,
conflicts, account changes, restart recovery, mismatched receipts, local write
failure/retry, snapshot retirement and finalized payroll fields. Budget tests cover
one finalization warning and unchanged separate-currency balances. No live financial
records are written by these tests.
