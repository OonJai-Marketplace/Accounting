# Drive draft submissions

Drafts remain in a private Google Sheet until the signed-in reviewer presses **Approve & Post**. No background posting or pending-database rows are created. Existing journal validation, permissions, period locks and number allocation apply. One draft ID posts one entry with all its lines. Receipt references prevent repeat approval, including another authorized reviewer.

## Activate once

1. In a company-controlled Google Cloud project, enable Google Sheets API. Configure Google OAuth consent and, if in testing, add the intended Google users as test users.
2. Create a Web application OAuth client with authorized JavaScript origin `https://oonjai-marketplace.github.io`. Never enter a client secret into this website.
3. On the accounting website sign in using the personal email, open Journal, then **Drive drafts**. Paste the OAuth client ID and the submission spreadsheet URL into Connection setup and save.
4. Click **Connect Google** and choose the Google account matching the accounting email. Google Sheets permission covers accessible spreadsheets; this implementation accesses only the configured workbook. Tokens are memory-only and expire; reconnect when prompted.
5. The website updates Accounts and reads Drafts. Review the lines, then **Approve & Post**. No spreadsheet status cell can authorize a posting.

## Sheet contract

Drafts headers must be exactly: draft_id, posting_date, description, line_no, account_id, account_code, currency, debit, credit, line_date, fx_rate_lak, book_rate_lak, line_memo.

One stable draft_id (8–64 letters/numbers/underscores/hyphens) identifies one transaction. Repeat it on its lines. Use numeric amounts, ISO date text and current account UUIDs. Account codes/currencies are verified against fresh database records. General description and posting date are identical across the entry. Unique positive line_no values determine ordering. Blank line_memo uses the general description. Other-month receipt dates are appended to memo, while posting date uses the entry's month. Same-month dates remain distinct lines within one entry.

The website checks current accounts again before posting. The database remains authoritative for balance, FX and access checks. Fix errors in the Sheet and refresh. Never change a previously posted or uncertain draft's identifier to force a retry. Refresh checks its server receipt; approved entries are displayed as already posted.

Accounts is refreshed while opening/refreshing Drive drafts. It is not an unattended sync while the website is closed. Refresh before each new preparation batch. Parent accounts are listed for context but cannot receive postings. Administrators automatically have all active posting accounts. Other accounts still require journal posting permission for this approval screen; giving someone a Sheet does not grant website permissions.

No Google password, database password or service key belongs in this workbook. Sharing its content does not transfer Google authorization. A replacement signs into their own accounting and Google accounts and connects the same workbook. Keep the Company Guide with it. Share/transfer ownership according to your company's Google account policies, and remove departing-user access separately.

## Verification boundaries

Automated tests cover parsing, dates, account changes, currency mismatches, duplicate line numbers and empty/invalid data. Database checks cover access denial and migration structure. Actual Google OAuth approval requires the account holder and cannot be supplied by ChatGPT's Drive connector. No sample financial entries are posted during setup.
