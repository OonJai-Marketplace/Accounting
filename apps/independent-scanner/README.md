# Pocket Scan — independent mobile scanner

An Android/iPhone app with bundled image correction and PDF code. Opening the app, capturing photos, cropping, reviewing, reopening drafts and saving a PDF do not require GitHub, Accounting, a login or a database. GitHub is used only for development/build distribution. The installed package has no remote `server.url`, hosted assets, analytics or automatic upload.

Local draft records use native app files. A single native preference index commits each group of changes after its files are written. Originals remain recoverable until the corrected page commits. Exported PDFs are retained in app storage; the share sheet can send a copy to Files, available SD-card destinations or an installed Drive app. A recipient needs no company account for local use.

## Optional connections

The Connections screen accepts the user's own Supabase URL, publishable key, private bucket and existing account. Credentials are held only in memory. Upload is explicit. Each revision uploads its PDF, separate compressed page previews and a `document-scan/1` index containing entry labels and PDF page numbers. Stable object paths are stored, rather than expiring signed URLs. Retried uploads verify identical bytes before accepting a duplicate object.

Automatic Accounting journal registration and direct Google OAuth are **not enabled by this package yet**. Sharing to Drive does not return a Drive file ID to the app. Exporting a document index alone does not attach it to a journal. The existing Accounting scanner remains separate and unchanged.

## Build

Run from this directory, within the Accounting repository:

```
npm ci
npm test
npm run build
npm run native:android
cd android
./gradlew assembleDebug
```

For iOS, use a Mac with the Capacitor 8 supported Xcode toolchain, run `npm run native:ios`, open the generated Xcode project, select your Apple development team and archive. Distribution requires the publisher's Apple signing identity/provisioning and App Store Connect/TestFlight setup. An unsigned archive is not an installable iPhone app.

Android debug builds are for device testing. Public distribution should use the publisher's persistent signing key, which must not be committed to source. The current package is a development candidate pending real-device camera, interruption/restart, storage-full, share-sheet and signed-install checks. It must not be described as ready for external users until those checks pass.

## Storage setup

Use a private bucket and authenticated policies limiting object paths to the signed-in user's UUID. The app writes `<user UUID>/<document UUID>/<revision>/...`. Allow SELECT and INSERT for that prefix; it does not need overwrite/update or delete permission. No service-role/secret key belongs in the app. The project owner must create storage accounts and configure their own RLS. Turning off a connection never removes local scans.

App data is removed when the app is uninstalled. PDFs shared outside the app follow the chosen destination's retention rules.
