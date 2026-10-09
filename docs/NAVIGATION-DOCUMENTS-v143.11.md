# Navigation and Document Editor v143.11

The browser-local password history described below is superseded by v143.12. See `DOWNLOAD-PASSWORDS-v143.12.md` and install its SQL migration for database-backed recovery.

News and Events and its shared calendar were already delivered in v143.10. This update adds actionable red counts to the desktop sidebar and horizontal tabs, including Transactions, Sub-Users, HR leave, and News and Events. Zero counts disappear, values above 99 display 99+, and permissions filter the counts. Uploaded navigation images retain their colors; selected SVG icons inherit the readable navigation text color.

Document Editor menus now consistently show icons. PDF import offers editable extracted text or original page appearance. Scanned pages remain images and require OCR elsewhere for editable words. Text conversion can change complex layouts and omit illustrations; original appearance preserves those as images. Existing Word, RTF, ODT, plain-text, HTML, Markdown, and other document importers remain available. Spreadsheet editing was not added.

Download now offers PDF, DOCX, HTML, plain text, or editor restore JSON. Direct PDF output preserves rendered page appearance as images; use Word for editable text or the existing Print action for browser printing. Optional password protection produces an AES-256 encrypted ZIP containing the selected file; it does not apply native PDF/Word password protection.

The editor's Settings button records only encrypted downloads: file name, format, preparation time, and a visible recovery password. These records are browser-local and separated by signed-in account. They are not synced to another device and are lost if browser data is cleared. Anyone with access to the signed-in account in that browser can see the passwords. A preparation record confirms the download was generated, not that the operating system saved it successfully. If the history cannot be saved, the encrypted download is cancelled rather than losing its password record.

Add Contract Record accepts an optional uploaded file. Employee Documents provides Open Editor and Download; the original uploaded file is preserved. File size remains limited to 10 MB. Broad upload acceptance does not guarantee every proprietary file can be converted by the editor.

## Database setup

Run `setup/INSTALL-HR-DOCUMENT-FORMATS-v143.11.sql` in the existing Supabase SQL Editor after v143.06's HR setup. It removes the existing HR bucket's MIME allowlist to permit additional originals. It keeps the bucket private, preserves existing access policies, and does not change employee or financial data. This script was prepared but not run against the live database.

## Validation

`validation/test-navigation-documents14311.cjs` exercises the deployed desktop bundles in Chromium using mocked account, database, and storage fixtures. All 12 checks pass: count aggregation and permission/zero behavior, news navigation, icon contrast, complete editor menu icons, both PDF import modes, Word/RTF/text import, encrypted download decryption and rejection of incorrect passwords, visible password history and omission of unencrypted files, PDF/DOCX downloads, contract upload and editor opening, desktop/tablet alignment, and no uncaught errors. Results are in `validation/navigation-documents14311.json`.

Changed source modules are synchronized with their deployed bundle segments. The approved phone layout and financial calculation rules are unchanged.
