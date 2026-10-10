# Accounting v143.18

This update finishes the remaining action-color, Settings-header and News-list changes identified in the request reconciliation.

- Backup/archive download controls and banner actions use the existing semantic action colors. Navigation, document tabs, calendar cells and the approved phone appearance keep their own designs.
- Settings card headers now share the same 56px minimum as the other module headers, with the existing 3px top edge. Headings can wrap when necessary.
- News has one All News list, without category filters or collapsed review groups. Upcoming/current announcements appear first, followed by undated announcements and then past news. Reviewed and dismissed items remain visible with their status. Changed revisions require another review. Both the main workspace and Calendar's news dialog use the same ordering.
- Explicit approval is still required before an announcement enters the company calendar. The default 180-day preparation reminder and unchanged attendance effect remain.
- Changed desktop assets use v143.18. The independent phone runtime and its worker remain at v143.17 so their optional-file cache stays aligned.

## Closing activation

The closing acknowledgment/deferred-posting behavior was implemented in v143.17. Run [INSTALL-DEFERRED-SUBMISSIONS-v143.17.sql](../setup/INSTALL-DEFERRED-SUBMISSIONS-v143.17.sql) in the existing Supabase project after its stated prerequisites. The SQL is non-destructive and rerunnable. A website push does not install it. This release does not close a real period or post, reset or delete any financial records.

Earlier HR/calendar, document formats, download-password recovery, budget templates and budget lifecycle installers remain subject to a live installation check. No missing production migration should be assumed solely from local test results.

## ChatGPT account handover

The existing Account & Handover page remains a manual task-handover flow. Native website sign-in/account switching has not been added or represented as connected. Official OpenAI website-sign-in documentation requires an issued OAuth client, registered callback and backend session handling; this project has no supplied registration for that integration. Identity sign-in alone does not establish access to the existing scheduled news task. Open-source plan authorization describes AI-request access, not access to ChatGPT conversations/account context.

Official references checked on 10 October 2026:

- https://developers.openai.com/siwc/website
- https://developers.openai.com/siwc/token-sharing-open-source
- https://learn.chatgpt.com/docs/automations

Gmail direct-send code remains available through the configured Google account. Real OAuth setup/authorization and actual delivery require live account access; no real email is sent by this release.

## Validation

The focused completion checks exercise backup colors, Settings header geometry, navigation/phone exclusions, flat news ordering, visible review decisions, dismissal without calendar changes, explicit approval, changed revisions, desktop/tablet widths and cache-version alignment. The existing release checks verify save/retry correctness, shortcuts, closing acknowledgments and original source dates. Browser transports use isolated fixtures; these are not production database or physical-device certification.

Validation on this release: 11 focused browser checks, 12 release regression checks and 10 isolated PostgreSQL closing checks passed. A sweep of 50 active desktop modules at 1440px, 1024px and 820px found no page overflow or short shared card headers. Three legacy Settings aliases were excluded from the active-module count because they route to their actual Settings sections.
