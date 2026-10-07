# Appearance v142.87

Applies the approved Design B treatment to the working panels: layered forest-green surfaces, lighter green section headers, cream text and gold primary actions. Existing fonts, left navigation colors, financial behavior and report templates are preserved.

## Controls

- Dark mode is the initial choice. The selection is saved on this browser/device.
- Desktop/laptop: switch in the floating action dock and above the user profile in the left menu.
- Tablet: the same switch is available in the navigation drawer above the user profile.
- Phone: switch in the account menu directly above Sign out. The embedded phone and parent shell stay synchronized.
- Phone Post Entry: Add Template and Templates share the title row. Below 361px, Add Template becomes a labeled plus button to keep the title on one line.
- Focus highlights only the actual input/select/textarea, not its label or enclosing field. Numeric caret behavior is preserved.

## Contrast and print isolation

IDs use an explicit text/background pair. Primary actions, secondary controls, destructive actions, disabled buttons and warnings have separate colors. The existing top-banner photo receives a green overlay in dark mode. Document editing surrounds follow the theme; the paper remains white. Theme rules are screen-only, so printing and exported report content keep the approved appearance.

Dark palette: canvas `#0E281F`, panel `#173B2E`, raised surface `#244B3A`, section header `#315842`, primary text `#F4EFDF`, secondary text `#C4D5C7`, borders `#688975`, input `#102F24`, gold action `#EDC573` with dark text `#292312`.

Light palette: canvas `#EDF2F0`, white panels, green-gray headers `#E0ECE5`, text `#173B2C`, borders `#8CA99A`, primary action `#176448` with white text.

## Validation

`node validation/test-appearance14287.cjs` checks main modules and sub-tabs in light/dark mode, tablet portrait/landscape, 320/390px phones, date/template dialogs, persisted preference, unchanged journal fonts, screen-only input focus, sidebar preservation and white document paper. It records screenshots and a computed text-contrast scan in `/tmp/ojm-appearance14287` (override with `OJM_APPEARANCE_SHOTS`). This fixture-based scan supplements visual review; it does not model every possible user record or image background.

Also run `test-phone-navigation14286.cjs` for navigation/draft restoration and `test-page-setup-detail14286.cjs` for the nine header/footer placement combinations. Existing v142.86 report fixes are retained.

No SQL or Edge Function deployment is needed. Static files and offline asset versions are updated together.
