# v143.19 — Editable company accounts and sample email templates

Company email settings now store an editable sender separately from regular recipients and the test recipient. Google must verify the selected sender before the website can send mail; changing that default disconnects the previous page session. OAuth tokens remain in memory.

Account & Handover saves the default ChatGPT administrator email in the same shared company configuration with optimistic concurrency checks. This records the intended account; it does not sign in to ChatGPT, configure OAuth, transfer tasks or claim a completed administrator handover. Background refreshes preserve an open account form.

Budget templates can be edited directly: name, purpose, recipient label, notes, categories, descriptions, amounts and currencies. Editing a saved template does not change the current budget draft. Send Test Email uses a selected template and a separate test recipient, retaining the full existing item/subtotal email format, adding SAMPLE notices and asking for receipt confirmation. It does not save or post a financial request.

The authorized private company defaults and six-item sample template were saved in Supabase separately from this public source release. Sample amounts are editable placeholders, not salary records or statutory tax/social-security rates.

Validation: 14 account/template/trial checks plus all 16 existing Gmail regression checks passed. Coverage includes administrator changes, stale shared-settings saves, sender verification, separate recipient routing, duplicate-send prevention, expired/uncertain responses, permission denial and tablet layout. Gmail calls in validation are mocked; they do not prove a real email was delivered.

Desktop/offline cache release is v143.19. The approved phone runtime remains v143.17.

Live email activation requires a configured Google OAuth web client and authorization of the saved sender. Native ChatGPT account connection remains manual. During live activation, Google Cloud Console displayed Site Unavailable in this browser, so the authorized trial email was not sent.
