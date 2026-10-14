# Version 143.64

Prepare permitted workspace screens after authenticated data and draft restoration, before marking startup ready. Keep their DOM during unchanged navigation, including payroll editors previously removed when switching between Entries and Deductions. Data, scope and filter changes invalidate dependent views. Cache-first refresh remains in place; reloading a browser document necessarily rebuilds its DOM once. Preparations remain scoped to the signed-in account and its permissions.

Preserve the journal array when local pending-post projection has no changes. Keep complete-entry journal paging and pending/confirmed posting distinctions from 143.63.

Sub-Account parent selection includes non-posting System parents. Add Mapping to account purposes and the database constraint. Rename the second classification field to Financial report classification, with help distinguishing the app group, accounting classification and account purpose. Explicitly selected financial classifications are saved rather than silently replaced by an existing technical account's old classification. No historic account values or journal data are migrated.

Database: setup/INSTALL-ACCOUNT-MAPPING-v143.64.sql applied to the existing project; fresh installer updated. The validated constraint accepts Mapping alongside all existing purposes.

Validation: generated-source/structure checks; first-visit DOM reuse, payroll retention, changed journal and Mapping-parent payload browser checks; desktop/tablet and phone cache/history regression; trusted online/offline navigation, explicit sync and offline audit restoration. Security advisor findings predate this constraint change; no access policies or function grants changed.
