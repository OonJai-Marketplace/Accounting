# v143.76 — navigation and journal feedback

Removed the temporary Journal and Blank sidebar comparison links, their two
canonical files, two generated assets, HTML/offline references and obsolete tests.
No financial journal records were deleted. Existing modules were edited in place;
no replacement runtime patch file was added.

Background preparation of the Users screen was calling its navigation action and
changing shared page classes. This left Users selected while the journal remained
visible, and could hide Accounts tabs. Preparation now distinguishes rendering a
hidden screen from navigating to it. Shared layout routines ignore that temporary
rendering state. Tab placement and scroll reset run during navigation rather than
one frame later, removing the reproduced vertical movement.

New journal rows retain the usual Edit/Void controls instead of displaying a
waiting message in their action cell. The controls enable as soon as a valid
posting receipt arrives, without waiting for the complete journal download. They
remain disabled while the server has not confirmed the entry; unconfirmed requests
keep their existing durable recovery reference and retry/error behavior.

A confirmed void removes the entry locally at once and refreshes Audit Logs and
the journal independently. Previously the audit refresh was conditional on the
Audit Logs tab already being active. Recovery projections exclude confirmed voids,
including one voided entry within a multi-entry posting; other batch entries remain.
Denied voids preserve the entry and show the existing modal error. Audit history
continues to come from the server; no fabricated audit records are inserted.

Validation: real-browser fixture tests passed on desktop and tablet for repeated
Users/Accounts/Bookkeeping navigation, background preparation, visible Accounts
tabs, stable tab geometry, delayed posting receipts/downloads and independent audit
refresh. Additional tests cover denied voids, partial-batch void recovery, hidden
view work and prepared handover forms. No production data writes were used in tests.
The source build, release diagnostics, audit byte records and structural checks
are refreshed together for this single release.
