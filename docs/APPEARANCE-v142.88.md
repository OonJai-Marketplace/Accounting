# v142.88 — phone refinements and light-mode contrast

This release implements the user's phone review of Design B, preserves existing application typography, and strengthens the light-mode surface hierarchy.

| Requested correction | Implemented behavior |
| --- | --- |
| Active/Pending distinction | Selected entries use the theme's primary fill, contrasting text, a bottom marker, and `aria-pressed`. Selection follows the clicked tab. |
| Sub-user sign-in transition | Restore the permitted destination before releasing sign-in. The phone stays hidden until identity, permissions, data, and its first render are ready. Previous identity contents and pickers are discarded on logout/account change; unavailable saved workspace owners are rejected. |
| Loading appearance | Sign-in, session restoration, startup, and phone workspace loading use one opaque full-viewport surface, without blur or a separate rectangular card. |
| Back-button shading | Phone Back controls and account-picker Back use transparent backgrounds with no border or shadow. |
| Amount currency symbol | Remove its background/border and reset the inherited transform that shifted the symbol upward in the phone grid. |
| Duplicate field outlines | Composite account/amount fields keep one enclosing border. Inner inputs have no extra border, outline, or shadow; the enclosing field's existing border changes color on focus. Plain text fields retain an individual focus outline. |
| Picker checkmark position | A single selection box at the left contains the selected checkmark. The trailing checkmark is removed. |
| Accounts default | All is first and selected by default. It shows every accessible assigned posting account. Category choices still filter, remain selected, and retain their saved horizontal position. |
| Theme menu emphasis | Theme controls use neutral styling consistent with their neighbors, without a highlighted menu background or extra outline. |
| Light-mode contrast | Warm stone canvas, warm-white panels, forest header bands and buttons, stronger green borders, and gold accents provide a clear hierarchy. |

The startup readiness timer and parent notifications initialize each phone identity once, preventing a late callback from replacing a form or closing its picker. Picker reopening waits for its previous browser-history transition. Entered amounts and drafts are preserved through picker use, tab changes, profile ledger navigation, and reload.

## Working colors

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#e7e0d1` | `#0e281f` |
| Panel | `#fffdf7` | `#173b2e` |
| Raised surface | `#e9efe6` | `#244b3a` |
| Header | `#315e46` | `#315842` |
| Header text | `#fff5df` | `#f4efdf` |
| Main text | `#153b2a` | `#f4efdf` |
| Muted text | `#3e5b4b` | `#c4d5c7` |
| Border | `#597661` | `#688975` |
| Input | `#ffffff` | `#102f24` |
| Primary action | `#145c40` / white | `#edc573` / `#292312` |
| Secondary action | `#315e46` / `#fff5df` | `#345b45` / `#f4efdf` |
| Gold accent | `#efd19a` / `#342713` | `#edc573` / `#292312` |
| Danger | `#8b3329` on `#f9e3df` | `#ffd1c8` on `#66382e` |
| Alternate table row | `#f0efe5` | `#1e4233` |

The theme remains screen-only. Sidebar colors, existing fonts, report paper, A4 print configuration, calculations, database permissions, and historic records are unchanged. Source modules and their deployed bundle segments are synchronized; entry points and offline assets use v142.88.

## Validation

- `validation/test-phone-navigation14286.cjs`: desktop organization order; 360/390px phone loading, All/categories, category scroll/reload restoration, field borders, symbol alignment, picker checkmarks, Active/Pending states, amount/draft preservation, assigned-ledger denial/revocation, delayed staff login, stale administrator location rejection, administrator-to-staff transition, and no uncaught runtime errors.
- `validation/test-appearance14287.cjs`: desktop tabs, tablet portrait/landscape, 320/390px phones, both modes, date/template/account pickers; 132 audited views with zero detected visible text contrast failures, including actual WebKit text-fill color; original journal typography; preserved sidebar/print colors and white document paper; neutral theme menu and preference synchronization.
- `validation/test-page-setup-detail14286.cjs`: all nine header/footer placement combinations.
- `validation/test-startup14240.cjs`: unrelated background loads do not block selected modules. The old fixture now supplies the document's device dataset used by the application.
- JavaScript syntax checks, source/bundle equality, diff whitespace checks, and visual screenshot review.

Authentication and data behavior is exercised against local API fixtures, including delayed replies and permission denials. No production financial records or SQL were changed.
