# v142.89 — first-line Entry ID and visual cleanup

The phone Post Entry editor displays its existing Entry ID on the right of the Line 1 heading. The separate bar above the entry-type controls is removed. Additional single-entry or double-entry lines do not repeat the ID. Unsaved entries still say “Assigned when saved”; posting sequence generation and saved IDs are unchanged.

The screenshot-confirmed appearance defects are corrected in both themes:

- Search fields have one input surface. Their wrappers are transparent, with no residual white strip, extra padding, or baseline gap.
- Home and History month pickers use one enclosing border and the native calendar control. The extra decorative icon and inner rectangular fill are removed. Native month selection remains available.
- Active/Pending and ledger period selections use the shared outline, a contrasting selected fill, and `aria-pressed`. Their extra lower border is removed.
- Account row separators are more visible against the green rows.
- Light mode has a lighter warm canvas, deeper sage secondary surfaces, forest counters for drafts/approved entries, and gold counters for pending entries. Dark mode retains Design B.

| Updated color role | Value |
| --- | --- |
| Light canvas | `#f2eee4` |
| Light raised surface | `#dce6d7` |
| Account row separator | `#a4b9a7` |
| Light drafts/approved counters | `#315e46` with `#fff5df` text |
| Light pending counters | `#efd19a` with `#342713` text |

Existing fonts, navigation, calculations, permission checks, and financial records are preserved. The theme layer remains screen-only; report IDs, A4 page setup, signatures, and document paper retain their existing behavior. The editor surround follows the new light canvas, while its paper stays white.

Source modules, the deployed phone bridge bundle segment, entry-point asset versions, and offline shells are synchronized at v142.89.

## Verification

- Phone navigation checks include one ID on Line 1, alignment, adding/removing lines in both entry types, restoring an existing ID after reload, and amount/draft preservation.
- Appearance checks include search-wrapper geometry, a single month-control surface, segmented-control edge alignment, and first-line ID placement at 320/390px in both themes, in addition to the existing desktop/tablet/phone contrast, typography, and print checks.
- Report page-setup checks exercise all nine header/footer placement combinations.

The browser checks use local API fixtures and do not modify production financial records.

Results: the phone navigation suite passed, the appearance suite audited 136 views with zero detected text contrast failures or runtime errors, and a separate sub-user review covered 20 phone views plus double-entry screenshots at 320/390px. All nine report header/footer placement checks passed. The rendered phone screens were visually inspected, including first-line ID alignment and the double-entry account row. Syntax, whitespace, and deployed bundle/source consistency checks passed.
