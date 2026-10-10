# Accounting v143.18

This update finishes the remaining action-color, Settings-header and News-list changes identified in the request reconciliation.

- Backup/archive download controls and banner actions use the existing semantic action colors. Navigation, document tabs, calendar cells and the approved phone appearance keep their own designs.
- Settings card headers now share the same 56px minimum as the other module headers, with the existing 3px top edge. Headings can wrap when necessary.
- News has one All News list, without category filters or collapsed review groups. Upcoming/current announcements appear first, followed by undated announcements and then past news. Reviewed and dismissed items remain visible with their status. Changed revisions require another review. Both the main workspace and Calendar's news dialog use the same ordering.
- Explicit approval is still required before an announcement enters the company calendar. The default 180-day preparation reminder and unchanged attendance effect remain.
- Changed desktop assets use v143.18. The independent phone runtime and its worker remain at v143.17 so their optional-file cache stays aligned.

## Closing activation

The closing acknowledgment/deferred-posting behavior was implemented in v143.17. [INSTALL-DEFERRED-SUBMISSIONS-v143.17.sql](../setup/INSTALL-DEFERRED-SUBMISSIONS-v143.17.sql) was installed in the existing Accounting production project on 10 October 2026. Live verification confirmed all six functions, the enabled period guard, the later-month posting gate and protected function access. The SQL is non-destructive and rerunnable. A website push alone does not install it. No real period was closed and no financial records were posted, reset or deleted during activation.

The earlier HR/calendar, download-password recovery and budget tables were already installed. Their row-level security is enabled. Budget parent integrity, its guard trigger and inclusion of budget configuration in audit backups were confirmed. The missing HR document-format update was installed; the attachment bucket remains private and now supports all required document formats under the existing access policies.

## ChatGPT account handover

The existing Account & Handover page remains a manual task-handover flow. Native website sign-in/account switching has not been added or represented as connected. Official OpenAI website-sign-in documentation requires an issued OAuth client, registered callback and backend session handling; this project has no supplied registration for that integration. Identity sign-in alone does not establish access to the existing scheduled news task. Open-source plan authorization describes AI-request access, not access to ChatGPT conversations/account context.

Official references checked on 10 October 2026:

- https://developers.openai.com/siwc/website
- https://developers.openai.com/siwc/token-sharing-open-source
- https://learn.chatgpt.com/docs/automations

Gmail direct-send code is available, but the live company settings have no Google OAuth client ID or recipient list. Google Cloud Console returned "Site Unavailable" in this browser, so its client registration could not be completed here. Gmail needs a company-owned Web OAuth client and recipients configured, followed by Google authorization and a delivery check. No real email was sent.

## Validation

The focused completion checks exercise backup colors, Settings header geometry, navigation/phone exclusions, flat news ordering, visible review decisions, dismissal without calendar changes, explicit approval, changed revisions, desktop/tablet widths and cache-version alignment. The existing release checks verify save/retry correctness, shortcuts, closing acknowledgments and original source dates. Browser transports use isolated fixtures; these are not production database or physical-device certification.

Validation on this release: 11 focused browser checks, 12 release regression checks and 10 isolated PostgreSQL closing checks passed. A sweep of 50 active desktop modules at 1440px, 1024px and 820px found no page overflow or short shared card headers. Three legacy Settings aliases were excluded from the active-module count because they route to their actual Settings sections.

The subsequent production setup check passed seven metadata/security checks. It verified installation and protection of the database features, without executing a real closing, posting, deletion or email send. See [live activation results](../validation/live-activation14318.json) for the checked scope and remaining external configuration.
