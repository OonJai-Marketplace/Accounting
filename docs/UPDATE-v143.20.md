# v143.20 — desktop scaling and administrator handover

Desktop windows retain the same canvas and scale it proportionally: down below 1280px, up to 150% on larger displays, then use extra available width. Narrow desktop windows stay desktop windows. The account table remains visible. Pickers, row actions, account menus, feedback and calendar scrolling use the correct scaled coordinates. Printing uses the original page dimensions. Approved phone and tablet behavior is retained.

`deployment-config.js` is now the single public configuration file for desktop, phone, recovery and workspace/repository links. An unconfigured deployment opens the connection screen. Never place server credentials there. `deployment-config.example.js` is the blank starting point for another owner.

Settings → System now offers **Company & Deployment** and **Handover**. Shared settings include company name, sender, recipients, test address, Gmail client ID, ChatGPT account, published site, workspace links, repository and branch. Saves check both installation and budget versions, retry lost replies with the same reference, preserve unrelated preferences, and never automatically change user roles. New-install prompting uses persisted database state; older databases and offline failures never masquerade as a clean company.

Backend source now includes `admin-create-user` and `recovery-vault113`, along with the password service. SQL adds protected installation metadata, account-provisioning receipts, encrypted recovery storage and expiring tickets. The new recovery implementation is not a converter for an unknown older vault format; back up the established service before any replacement.

## Activation and portability boundary

The repository update alone does not install SQL, deploy functions, authorize Gmail, or transfer service ownership. Run `setup/INSTALL-PORTABILITY-v143.20.sql` to activate Settings handover in the current database. Stage and review the Edge service migration/source before replacing deployed services.

The original full server schema is absent from repository history. A complete independent backend still requires its verified export and a disposable-project restore. The included `tools/portability/backend-package.py` exports schema without source records, preserves policies/grants, validates function coverage, checks package integrity, refuses existing targets, and installs in one transaction. It is a preparation tool, not evidence that a fresh production deployment has already succeeded.

See [PORTABILITY-v143.20.md](PORTABILITY-v143.20.md) for the installation and handover instructions.

## Validation

365 passing checks across 39 suites, including browser workflows, isolated PostgreSQL migrations, encrypted recovery handlers, schema-package guards, and phone relocation/offline tests. Eight desktop widths from 600 to 2560px were checked. All 207 JavaScript files parse; 118 bundle source markers are unique and match their sources, and referenced HTML assets exist. Scaling-aware regression assertions measure layout dimensions separately from physical screen pixels.

No production records were written and no real emails were sent. Fresh database restoration, actual OAuth/recovery email delivery, physical-device print/keyboard behavior and sustained multi-client load still require deployment acceptance checks.
