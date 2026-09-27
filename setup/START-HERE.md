# Oon Jai Accounting — version 110

Open **index.html** in the parent folder. Keep scripts, styles, assets and setup alongside it. For a hosted site, deploy the entire folder contents; do not upload only index.html. Configure the existing public app address in scripts/supabase-config.js if needed.

## Setup

Keep your existing database and app backup. This update itself does not require a new database migration. If upgrading from an older version, the retained SQL files support the earlier features: 106-install.sql for menu/inventory and 108-record-actions.sql for record actions. Review migration instructions for your installed version before running SQL. Sample-data scripts are optional; do not run them merely to update the interface.

## Password recovery

See PASSWORD-RECOVERY-v105.md in this folder. Hosted email links require a published HTTPS app address and matching Supabase redirects. Local HTML use can verify an emailed recovery code when the Supabase Reset Password template includes {{ .Token }}. No live provider settings were changed and no real email delivery was tested.

## This update

- Fixed document undo/redo, corner and side handles on header/footer and body images, compact units beside values, Custom-only paper dimensions and an outside-dismissable column dropdown.
- Main workspace header reduced by 15%; separate account icons, centered themed notifications, compact report-tab scroll indicator, corrected ledger summary alignment and sticky Settings actions.
- Shared nested module borders and table edges, first item expanded in collapsible lists, aligned main/sidebar dividers.
- Compact editor Home, a separate Insert tab, header/footer toggles and word count; inline Page Setup; document-specific header/footer image upload, positioning and resizing.
- Profile at the sidebar bottom, brushstroke quotation, separate notification, switch-account and sign-out icons in the vertical dock. Integration Audit removed.
- Ingredient/inventory icons through upload or optional online Material Design Icons search. Chosen images are stored with item records.
- Navigation avoids redundant table renders and skips hidden-table styling work. Speed still depends on device, record count and network.
- Recovery request/code/password failure states tested locally with simulated authentication.

The editor is the print layout. PDF/print preserves that layout; Word remains editable and may paginate differently depending on fonts and the version of Word. JSON is the restore format.

## Folder contents

- scripts: application logic and Supabase public configuration
- styles: application CSS
- assets/vendor: bundled Word export library and its license
- setup: installation SQL and recovery instructions

No live database records, account passwords or hosting settings were changed while preparing this package.
