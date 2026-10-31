# Connected Accounting scanner — v143.208

The company scanner is **Menu → Receipts & Documents** inside Accounting.
The cancelled native app package and its build configuration have been removed.

Saving a verified Drive PDF uploads small private JPEG previews and registers
links to matching entry IDs. **Documents** beside Journal, History, personal
entries and General Ledger opens the requested section, with adjacent-page
prefetch and a short in-memory cache. Opening the original PDF is optional.
Local/SD-card PDF saving remains available; **Upload a copy and link to Accounting**
explicitly uploads a private copy when a journal link is wanted.

Unmatched IDs and interrupted link requests remain visible in the saved draft.
Use **Refresh document links** after posting the entry or reconnecting. Linking
does not allocate IDs, post transactions or change amounts. Stable journal UUIDs
prevent older scans from following a reused entry number. Older batches acquire
links when saved/verified again; existing Drive files are not mass-imported.

The database has private storage, existing-account RLS, service-only registration,
immutable page versions and five-minute signed previews. Drive originals retain
Google Drive's sharing permissions. A viewer can access only documents permitted
by Accounting's existing journal/workspace rules. No service key reaches a browser.

Validated with synthetic receipts: crop/import, groups, PDF bookmarks and unchanged
approved JPEGs, deterministic PDF bytes, interrupted checksum/link handling,
persistent draft recovery, upload retry without duplicate Drive files, local picker
and share/download fallbacks, phone preview layout, stale-response suppression,
sign-out clearing, and no PDF download when viewing images. Database rollback tests
verified idempotent registration, content-conflict rejection, stable journal UUIDs,
owner isolation and denied direct client writes. Offline shell/source/hash checks
and phone own-account/printing restrictions passed.

Live camera hardware, real Google authorization and user-specific Drive sharing
still need a signed-in device check. Browser tests use a simulated backend; database
checks ran separately against the deployed schema. No speed in milliseconds is
guaranteed; actual image loading depends on connection and device. Local PDFs above
the private bucket's 64 MB limit remain local; use Drive for their original PDF.
