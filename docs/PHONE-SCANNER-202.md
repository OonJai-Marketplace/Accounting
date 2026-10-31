# Phone receipts and Google Drive

Open the Accounting phone menu → **Receipts & Documents → Storage settings**, or use **Document storage settings** directly in the phone menu. Sign in to Accounting first.

## Choose phone storage or Google Drive

**Save destination** is available before starting a batch, in Storage settings, and in Review / Save PDF. The choice is remembered for your Accounting login on this browser. Choose **Phone / local storage** to scan and export without Google authorization or an internet connection after the scanner has been cached.

In the local save screen, confirm the PDF filename. If your browser provides **Choose location and save**, use the system picker to select an available phone folder or SD card. The app verifies the resulting file's size and checksum. It does not retain folder permissions for silent future writes.

On browsers without that picker, use **Download PDF**. It uses the browser's download location; check Downloads in your phone's Files app and move the PDF to the desired phone folder or SD card. If supported, **Share / Save with Files** opens the system share sheet, where your installed apps determine the available destinations. A share handoff does not prove another app saved the PDF, so check the resulting file. Cancelling a picker or share sheet retains the draft.

A web app cannot guarantee a direct SD-card picker on every phone. It cannot create or rename arbitrary local folders itself on unsupported browsers; use the phone's Files app for that. Browser drafts remain in encrypted browser storage on the device even when the exported PDF goes to an SD card. No documents are uploaded to Google when using the local save actions.

## Connect or change the Google destination

1. Open **Settings → Connect Google Drive** (or **Change Google account**).
2. Select the personal or company Google account that should receive the PDFs and approve Google's permission screen.
3. Choose **Choose folder / paste link**. Browse folders, create a folder, rename a writable folder, or paste its Google Drive folder URL/ID.
4. Choose **Use this folder**. Review the account email, folder and PDF filename before saving.

A folder link is a location, not authorization. For another account, sign in with Google; do not enter a password into Accounting. The connection belongs to the signed-in Accounting user. Other users do not automatically inherit it.

Changing accounts preserves the device draft and resets the destination to the new account's My Drive. Select the intended folder again. Future saves use that account. Previously uploaded PDFs stay where they are; this does not migrate older archives or change the separate accounting Google Sheet connection. To transfer an existing current batch between accounts, connect the new account and save a copy, verify it, then manage the original in Drive if desired. No source file is deleted automatically.

Within the same account, **Settings → Move saved PDF** moves this batch's last saved PDF into a chosen writable folder. **Choose folder** instead changes the destination for a new copy. Existing PDFs from earlier batches can be organized directly in Drive.

## Scan and group

Confirm the document month, first group type and starting ID. Journal and HR sequences are independent. A named supporting section, such as October 2026 Cash Slips, does not advance either sequence. Use Next entry, Skip / Jump or Add group as needed. This scanner never allocates or changes journal IDs in the database.

Scan with the phone camera or import several photos. Check the four detected corners, adjust them if necessary, preview at readable size, then Keep page. Colors are preserved by default; grayscale is optional. Edges are detected locally, with a whole-image fallback when uncertain. This is a browser scanner, not Google's proprietary scanner SDK. It does not infer entry boundaries: select a group while scanning, or use a page's **Split group here** and **Move page** controls after importing. Automatic separation without confirmed boundaries would risk attaching evidence to the wrong entry.

Group several pages under one ID. Page labels use A–Z, then AA, AB, etc. Reorder within a group or move groups without changing their IDs. Footers sit below the scan, never over the receipt image. The monthly PDF has a clickable contents page and embedded bookmarks. Bookmark panels depend on the PDF viewer; the contents page is included as an additional navigation method. There are no account-classification lookups or OCR changes to financial text.

Readability takes priority over a target MB size. The scan preview is the exact JPEG embedded in the PDF without another JPEG recompression. Large source photos are limited to 12 million working pixels for phone memory; original images are retained in the encrypted local draft for recropping. Verify small writing and signatures before accepting. The finished monthly file can be large; available phone memory and Google Drive quota still apply.

## Save and recover

Use **Review / Save PDF**, inspect the filename/account/folder, then Save. Encrypted drafts remain on this device until explicitly cleared. Offline capture works after the scanner assets have been downloaded; Google sign-in, folder browsing and upload need internet. Uploads use resumable chunks and a reserved file ID, and the app verifies the stored size and SHA-256 checksum before showing saved. After an interruption press Save again. A failed verification keeps the draft.

Continue adding pages to the current monthly batch and update its saved PDF. Updates require the original file's latest verified version; an unexpected Drive change blocks overwriting. Use Save as new PDF with another filename for a copy. Identical names already in a destination are not silently overwritten. Before starting another batch, upload or download the current one. Clearing browser storage removes device drafts; uploaded files remain in Google Drive.

## Deployment setup

The `accounting-documents` Edge Function uses the existing Google OAuth client and callback. It requests the Drive scope needed to browse, create and rename existing folders (`https://www.googleapis.com/auth/drive`) and verified email. Enable Drive API for the OAuth project and allow the intended accounts in its consent configuration. A testing-mode OAuth app may need test users and periodic reconnection; a company administrator can restrict access. Existing Sheets-only consent is insufficient: each Accounting user must connect Drive once from scanner Settings.

Refresh/access tokens are encrypted in the existing server-only connection table, keyed separately by Accounting user. Document bytes are sent from the phone to Google's resumable upload endpoint and are never inserted into Accounting database tables. The browser receives only the upload session for its own file, not the Google refresh/access token. Keep the upload session private. No service-role credentials belong in client configuration.

Validation: `node validation/test-receipt-core202.cjs`, `node validation/test-receipt-backend202.mjs`, and `node validation/test-receipt-browser202.cjs` (Playwright/Chromium; synthetic documents and mocked Drive). Real camera behavior and the company's Google OAuth policy require a phone/account acceptance check after connecting.

The OAuth callback pins its previously deployed v3 Sheets handler in `google-oauth-callback/legacy143150.ts`. Only the separate document-state branch was added, so deploying scanner OAuth does not also change the live Sheets callback behavior. The document service imports shared token encryption and refresh helpers.
