# v143.253: Editable salary advances

The administrator confirmed additional advances were released after the earlier 900,000 LAK record. That old written note must not cap or reject a newer editable payroll advance. Removed the note-derived veto. New draft vouchers use current payroll results and refresh the generated recovery sentence for presentation only. Stored notes and finalized snapshots remain intact. Amount/result checks still prevent mismatched calculations, with guidance that preserves the current draft instead of reloading older server data.

Validation: test-advance-edits253.cjs exercises several increased/decreased/zero advance values through the real calculation engine, final-payment recalculation, old-note compatibility, rendered recovery text, unrelated prose, draft preservation and finalized snapshots. test-workspace-integrity252.cjs retains run/employee ownership and calculated-result checks.

Read-only investigation found the server still held the earlier draft. Payroll saves are local-first with queued synchronization; do not treat the older server copy as proof the administrator's newer device draft is wrong. No payroll records or monetary amounts were changed by this release.
