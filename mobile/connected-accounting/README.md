# Connected Accounting native client

This packages the existing own-account phone client. Sign in to the same
Accounting account; drafts in an existing browser installation stay in that
browser. The APK has separate private device storage.

Android scanning uses Google's ML Kit Document Scanner 16.0.0, including its
camera, automatic capture, crop, review and full cleanup mode. Normal sessions
omit `setPageLimit`: Google's documented default depends on available device
resources. Retakes request one page. Google Play services and at least 1.7 GB
total RAM are required. Capacitor sets Android 7+ as this application's minimum.
The scanner module downloads through Play services on first use; `prepare`
starts that download when the app opens. A first-use delay remains possible.

The iPhone integration uses Apple's public VisionKit document camera. It is a
different engine from Google's Android scanner. There is no custom page cap or
private API override. VisionKit's own device limits still apply.

## Capture and Accounting

1. Open Scan, confirm the document type, starting ID, PDF name and destination. Journal IDs must match a permitted database entry and cannot already belong to another scan batch. HR/support names are checked for document conflicts.
2. Capture all pages for the current entry in the native scanner, then finish
   its review. Android returns Google's JPEGs without another crop, filter or
   JPEG recompression. iOS returns VisionKit pages encoded at JPEG quality 1.
3. Accounting imports approved pages directly into the protected draft. Use
   **Add receipts** to add to the current group or **Next ID** to advance the
   saved naming sequence. Entry IDs, support groups and group splits remain
   available through Accounting settings and page options.
4. Save the PDF to connected Drive or a remembered phone/SD-card folder, retaining
   the existing journal-link workflow.

Google owns the native camera/review screens. Its public API does not expose
custom buttons or per-shutter callbacks for our grouping controls. To change
entry during a session, finish it and use Next ID, or split groups afterwards.

Native results are held in private app storage until every page has been
durably imported into the account's encrypted draft. Request context is encrypted
with the existing device vault; only file paths and import progress go into the
temporary result queue. Replaying imports does not duplicate pages. Retakes
replace an old page only in the same successful storage transaction. Recovery
cannot guarantee unsaved photos if the operating system kills Google's or
Apple's camera before it returns results. Android retries an interrupted copy
from retained source paths where the system still makes them available.

## Builds

Node 22, Java 21, Android SDK for Android; Xcode and macOS for iOS.

```sh
python tools/build-modules.py --check
cd mobile/connected-accounting
npm ci --ignore-scripts
npm run build
npx cap add android       # once, or cap add ios on macOS
npm run prepare:native
cd android
./gradlew assembleDebug
```

After later source edits use `npm run sync`. Generated platform projects,
bundled web assets and signing material are ignored by git. The GitHub workflow
builds a debug-signed APK artifact and compiles the iOS Simulator target. Cached
debug signing is for evaluation only. A production Android signing key and an
Apple signing/distribution setup are separate release steps. iOS Simulator
compilation does not produce an installable iPhone application.

## Validation and release limits

Automated checks cover 60 returned pages, exact Android image-byte preservation,
entry naming/grouping, encrypted queue ownership, retry progress, cancelled and
failed retakes, the actual phone interface, and native OAuth/CORS authorization.
Synthetic fixtures establish integration behavior, not camera speed or quality.

Before using it for a whole work batch, compare real receipts on the same phone
against Drive: first and subsequent launches, repeated rapid captures, shadows,
small text, 30–60 pages, app background/restore, final PDF and journal links.
No claim of 100% identical timing, unlimited pages, or physical-device acceptance
is made from compilation or browser tests.

Official references:
- https://android-developers.googleblog.com/2024/02/ml-kit-document-scanner-api.html
- https://developers.google.com/ml-kit/vision/doc-scanner/android
- https://developers.google.com/android/reference/com/google/mlkit/vision/documentscanner/GmsDocumentScannerOptions.Builder
- https://developer.apple.com/documentation/visionkit/vndocumentcameraviewcontroller

## v143.215 setup and destinations

Google Drive, phone and SD-card folders have separate remembered settings. Android uses persistable Storage Access Framework permissions; iPhone uses security-scoped folder bookmarks. Create subfolders using New folder. Removed cards, moved folders or revoked permissions require choosing the folder again. Browser folder saving requires the File System Access API.

Save PDF rechecks all group IDs, saves and verifies the single PDF, then creates private page previews and journal links. Saving to phone/SD first also uploads a private PDF copy to Accounting, as stated in the destination panel, so web journal links work. A failed link keeps the draft and retries the existing PDF. HR/support groups remain named document sections and do not fabricate journal records.
