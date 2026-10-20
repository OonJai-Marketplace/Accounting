# Drive draft submissions

Drafts remain in a private Google Sheet until the signed-in reviewer presses **Post to Journal**. No background posting or pending-database rows are created. Existing journal validation, permissions, period locks and number allocation apply. One draft ID posts one entry with all its lines. Receipt references prevent repeat approval, including another authorized reviewer.

## Activate once

1. In a company-controlled Google Cloud project, enable Google Sheets API. Configure Google OAuth consent and, if in testing, add the intended Google users as test users.
2. Create a Web application OAuth client with authorized JavaScript origin `https://oonjai-marketplace.github.io`. Never enter a client secret into this website.
3. On the accounting website sign in using the personal email, open **Settings → Accounting → Google Sheets**. Paste the OAuth client ID and submission spreadsheet URL into Manage links and connection, then save.
4. Click **Connect Google** and choose the Google account matching the accounting email. Google Sheets permission covers accessible spreadsheets; this implementation accesses only the configured workbook. Tokens are memory-only and expire; reconnect when prompted.
5. Open **Journal → GPT** (after Voucher) and Refresh drafts. The website updates Accounts and reads Drafts. Click Edit beside an entry’s full-width description, adjust it in the shared journal editor, then **Post to Journal**. No spreadsheet status cell can authorize a posting.

## Sheet contract

Drafts headers must be exactly: draft_id, posting_date, description, line_no, account_id, account_code, currency, debit, credit, line_date, fx_rate_lak, book_rate_lak, line_memo.

One stable draft_id (8–64 letters/numbers/underscores/hyphens) identifies one transaction. Repeat it on its lines. Use numeric amounts, ISO date text and current account UUIDs. Account codes/currencies are verified against fresh database records. General description and posting date are identical across the entry. Unique positive line_no values determine ordering. Blank line_memo uses the general description. Other-month receipt dates are appended to memo, while posting date uses the entry's month. Same-month dates remain distinct lines within one entry.

The website checks current accounts again before posting. The database remains authoritative for balance, FX and access checks. Edit the loaded draft in the GPT editor, or fix the Sheet and refresh. Never change a previously posted or uncertain draft's identifier to force a retry. Refresh checks its server receipt; approved entries are displayed as already posted.

Accounts is refreshed while refreshing GPT drafts. It is not an unattended sync while the website is closed. Refresh before each new preparation batch. Parent accounts are listed for context but cannot receive postings. Administrators automatically have all active posting accounts. Other accounts still require journal posting permission for this approval screen; giving someone a Sheet does not grant website permissions.

No Google password, database password or service key belongs in this workbook. Sharing its content does not transfer Google authorization. A replacement signs into their own accounting and Google accounts and connects the same workbook. Keep the Company Guide with it. Share/transfer ownership according to your company's Google account policies, and remove departing-user access separately.

## Verification boundaries

Automated tests cover parsing, dates, account changes, currency mismatches, duplicate line numbers and empty/invalid data. Database checks cover access denial and migration structure. Actual Google OAuth approval requires the account holder and cannot be supplied by ChatGPT's Drive connector. No sample financial entries are posted during setup.

## v143.129 workspace

Google Sheets settings lists the existing accounting spreadsheets and folders , with editable link names/URLs. Links do not grant Google permissions. Administrators save settings in the existing shared company-settings record, preserving other fields with a version check. Google tokens remain browser-session-only. Automatic delivery is deferred.

GPT is a sibling immediately after Voucher in the Journal navigation. It shares the original Post Double-Entry Transaction editor, including current ID preview; final allocation still occurs on the server. One draft is edited at a time, then the next can be selected without leaving GPT. An occupied manual journal editor is never overwritten. Finish or cancel a GPT edit before returning to manual Journal. Unposted adjustments are held only in the open editor, protected by a leave-page warning; cancel preserves the original Google Sheet. GPT fields are excluded from the ordinary manual draft recovery store to prevent a recovered draft from losing its source/duplicate protection.

Verification: `validation/test-gpt-workspace143129.cjs` uses a DOM fixture and fake Google/database calls for navigation, links, edit/post, mixed dates, source-change rejection, duplicate receipts, and manual-draft protection. It performs no real postings.
