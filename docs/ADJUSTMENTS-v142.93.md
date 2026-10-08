# v142.93 — submission and sign-in adjustments

- Desktop and tablet sub-user submission uses the shared report-type selector. Selected report names and the reporting month become the General Description when preparing the journal summary.
- Sign-in uses the existing loading animation. The former inline status element is removed; authentication failures appear in a dismissible notification box. Expired access returns directly to Sign In.
- Document Editor → Reports opens the existing report library, with Monthly (month), Quarterly (quarter and year), and Yearly (year) controls. Reports open as editable document copies; the original report and ledger stay unchanged.
- Switch workspace includes Accounting, Public Restaurant Website, and Restaurant Back Office. Public restaurant defaults to https://oonjai-marketplace.github.io/web/. Back Office needs its actual published URL in Workspace links; no unverified destination is supplied.
- Updated changed-asset cache tags and shell workers to v142.93. Updated obsolete validation targets and sign-in message/version expectations.

## Deployment

Publish the repository files through the existing GitHub Pages workflow. No new SQL or Edge Function changes are required by this release. Keep existing required database installers from earlier releases.

## Focused validation

The changed submission, journal-description, notification, expiry, workspace-menu, and period-picker paths were checked with isolated fixtures. Login security, categorized Money In, summary posting, account-assignment search, document import, report generation, and pagination checks passed. These are targeted checks, not the user's deferred final assessment or a test against live financial records.
