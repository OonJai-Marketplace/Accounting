# Editor toolbar correction - v143.279

The whole-day review found that the direct-child Save Voucher button still had an automatic left margin. This left a large empty gap before Save Voucher, Details, Download and Share, even though Print was already 32 x 32 pixels.

Replace that auto margin with a 3px margin in the owning stylesheet. The existing grouped-action layout stays compact too. Keep action labels, order, permissions and behavior unchanged.

Validation: actual document-editor browser fixture with production styles and a synthetic receipt; measured the old 274px gap, then the corrected 3px margin. Print stays 32 x 32 pixels. Canonical build, structural ownership, release integrity and cache-key checks pass. No financial records changed.

The accompanying private whole-day audit covers 23 passing targeted suites plus 38 generation-catalog templates and 132 journal-completion scenarios. It explicitly leaves original custom-template recovery, financial corrections and physical iPad verification open. Those are not certified by this CSS release.
