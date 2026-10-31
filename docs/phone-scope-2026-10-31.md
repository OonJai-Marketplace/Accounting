# Phone workspace scope — 143.207

Phones use the signed-in account’s sub-user workspace for all roles. Administrator Settings can manage permissions and assignments but cannot open another person’s workspace. Directory metadata loads only when Settings opens. The desktop bootstrap redirects physical phones before app initialization. Tablets (including iPad desktop user agents) recover the full app even from a previous phone install.

The phone does not expose report printing, document editing or report export. Cached print actions show a tablet/desktop message. The optional phone tools bundle now contains only authorization settings. Tablets, iPads and desktops retain existing print and export paths. Scanning, document storage settings and scanned-PDF saving remain in the phone account menu.

Validation: test-phone-own207.cjs covers role separation, own-account selection, lazy settings, blocked print/doc tools, preserved scanner and tablet routing. Offline-install, install-state, receipt-core and updater regression suites pass. Source ownership and release hash checks pass. Physical phone installation and real-device tablet printing still require device testing.

The independent Android/iPhone scanner and automatic journal-linked page previews are separate work; this release does not claim those are delivered.
