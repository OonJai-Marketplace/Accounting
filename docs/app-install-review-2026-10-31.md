# Installation and offline review — 143.206

Scope: Accounting installation, launcher routing, phone shell assets, scanner
return navigation and release consistency. This is not a financial-data audit.

## Corrections

- The shared launcher previously always redirected to desktop.html, which the
  independent staff worker does not cache. It now follows the active phone worker
  to phone.html?staff=1. The main workspace keeps its desktop entry. Recovery
  links preserve their query and fragment and take priority over workspace routing.
- Scanner return and sign-in links use this shared entry, so they also work with
  a downloaded staff workspace. No draft or record stores are cleared.
- Five connected-phone styles/scripts and five recovery dependencies were missing
  from the relevant worker lists. All are now downloaded. The phone worker matches
  explicit cached versions before falling back to a path match.
- Installation completion in a browser tab no longer claims the tab is already
  running standalone. A delayed accepted prompt cannot replace a completed-install
  message with an earlier installation-requested message.
- The static desktop title no longer displays an outdated release number.

The manifest ID, scope, start URL, approved phone layout, logos inside the app,
financial rules, authentication rules and remote records are unchanged.

## Verification

- test-installed-offline206.cjs executes both workers with a local cache fixture,
  then disables the network and requests ten pages across the two workspaces and
  every referenced local script/style. It also checks launcher/recovery routing,
  scanner return links and exclusion of external database traffic.
- test-install-state206.cjs covers platform instructions, immediate prompt calls,
  cancellation, prompt reuse prevention, standalone state and completion ordering.
- Update timeout/quota and version-mismatch regressions, receipt-core tests,
  generated-source checks, extraction structure and release hashes pass.
- The deployed 143.205 sign-in install control and its dialog were inspected in
  the available cloud browser. The three launcher icons were visually inspected;
  no company marks remain in the journal, heart/hands or serving-bowl artwork.
- Wellness update, navigation and offline-station tests and Restaurant manifest
  refresh/icon checks passed without changes to those repositories.

Limit: the existing Playwright installation UI suite could not launch because
its Chromium executable is absent in this environment. The local worker/DOM
fixtures are not an Android/iOS installation test. Physical-device installation,
OS icon refresh and a real offline restart still need device verification.
