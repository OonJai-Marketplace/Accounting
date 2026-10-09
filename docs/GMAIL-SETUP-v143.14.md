# Gmail sending setup

Budget Requests now sends the full email directly through Gmail. WhatsApp and Messenger use **Copy WhatsApp Summary** for pasting into the existing group. The Gmail sender is the Google account authorized through **Connect Gmail**, independently of the accounting login.

## One-time setup

1. Open https://console.cloud.google.com/ and create or select a company-owned project.
2. Enable **Gmail API** in APIs & Services → Library.
3. Configure **Google Auth Platform** (OAuth consent): app name, support email, and developer contact. Use External for personal Gmail accounts. For private use in Testing, add each intended Gmail sender under Test users. Recipient addresses do not need to be test users. Wider use may require Google's verification for sensitive Gmail access.
4. Configure the scopes `https://www.googleapis.com/auth/gmail.send` and `https://www.googleapis.com/auth/userinfo.email`. Inbox reading is not requested.
5. Create an OAuth client of type **Web application**. Add `https://oonjai-marketplace.github.io` as an Authorized JavaScript origin for the current GitHub Pages site. If using another host, add the exact origin shown in Budget Request Settings (scheme plus hostname and port, without a path). There is no redirect URI needed for this popup flow.
6. Copy the **client ID** ending in `.apps.googleusercontent.com`. Do not copy a client secret or password.
7. In Transactions → Budget Requests → Settings → Gmail connection setup, paste the client ID and save. The existing `setup/INSTALL-BUDGET-TEMPLATES-v143.13.sql` must already be installed in Supabase for shared settings and templates. This release adds no SQL migration.
8. Reopen Settings, click **Connect Gmail**, choose your sending mailbox, and allow the requested permissions. The verified email address appears as Gmail sender.
9. Enter the recipient email addresses separated by commas. Save Settings.

## Sending

- **Send Email** saves a breakdown snapshot and opens the full email preview. Confirm the displayed From account and recipient list, then click Send Email in the preview. This calls Gmail directly without opening the inbox.
- Every budget item appears under its category, with a subtotal per currency and separate grand totals. The message contains both an HTML email and a plain-text alternative. Blank notes and empty categories are omitted.
- **Copy WhatsApp Summary** opens a summary with category totals, a list of the items in each category, separate grand totals, and a saved breakdown link. Click Copy message and paste into WhatsApp or Messenger. No WhatsApp account connection is used.
- Breakdown links require authorized access to the accounting app. The email itself includes all requested item amounts, so recipients can review it without opening the link.
- Change Gmail switches the sending mailbox; Disconnect clears this page's connection. Access tokens remain only in page memory, are not saved to Supabase/local storage/backups, and are cleared on sign-out, account change, or leaving the page. A reload or expired token requires reconnecting. Google may reuse previously granted consent. To revoke the application's Google permission entirely, use https://myaccount.google.com/permissions.
- Gmail API acceptance is reported as Sent; it is not a delivery receipt. Sending disables repeat clicks. An uncertain network result never auto-retries: check Gmail Sent before preparing another email.
- This feature sends on demand. Scheduled/background emails need a separate server authorization design.

## Official references

- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid
- https://developers.google.com/workspace/gmail/api/guides/sending

## Release validation

The automated browser tests use a simulated Google permission window and Gmail API; no real emails are sent. Real sending requires the client ID, authorized website origin, consent configuration, and the account owner's Google authorization above.
