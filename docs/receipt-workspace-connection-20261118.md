# Receipt connection in the bundled Oon Jai app

The Android workspace opens bundled Accounting assets at the exact origin
`https://accounting.oonjai.invalid`. Both receipt services previously allowed only
GitHub Pages and the original Capacitor origins. Their OPTIONS handlers rejected
the newer workspace with HTTP 403, so the WebView reported `Failed to fetch`
before it could read a destination or validate an entry ID.

Production logs on November 18 showed repeated OPTIONS 403 responses for
`accounting-documents` and `scanner-integration`. Direct requests using the
workspace origin reproduced the rejection on both deployed services. The saved
company destination and renewal credential were still present; this error did
not establish that Google had revoked access.

The fix adds only the exact Accounting workspace origin to both allowlists.
It preserves POST authentication, active-account and permission checks, staff
ownership filtering, private previews, folder enforcement, and receipt-set
validation. Other workspaces, lookalike hosts, HTTP and opaque/null origins remain
denied. No APK, browser assets, financial records, or polling behavior changes.

Validation covers destination status from all supported origins, unauthenticated
requests, rejected origins, an October-first receipt with an empty earlier receipt
history, closed-book attachment registration, main-journal permission denial,
own-staff scoping, changed entry identities, duplicate PDFs, and partial-save retry.
The handler and PDF tests use synthetic records; they are not physical-phone
camera tests or a real receipt upload into company Drive.

Deployment preserves the existing deployed dependencies and JWT configuration of
each function, replacing only the two affected handler files. This avoids folding
unrelated shared Google integration changes into the receipt repair.
