# v142.90 — administrator Home icon contrast

On administrator Home, metric and Quick access symbols previously blended into their pale circular badges in dark mode. The theme layer now gives the SVG strokes dark forest, brown, ochre, and brick colors against the corresponding pale fills. The recent-activity date uses the theme's readable secondary text color. Existing initials avatars remain visible.

The light/dark controls are text only. The desktop floating control says “Light” or “Dark” to fit its existing slot; the sidebar and phone account menu say “Light mode” or “Dark mode.” The controls retain their accessible action labels, toggle behavior, and saved preference.

This is a screen-only appearance correction. It changes no account data, financial calculations, report layout, or fonts. Asset and offline-shell versions are synchronized at v142.90.

## Verification

The administrator Home was visually reviewed at phone width, iPad portrait and landscape sizes, and desktop width in light and dark modes. Automated checks measure the displayed metric/shortcut icon stroke contrast against its circular fill, inspect text-only theme controls, and cover the existing application-wide typography, contrast, and print invariants. Tests use local API fixtures and do not alter production records.

The appearance suite passed 144 views with zero detected text contrast failures or runtime errors. All tested Home glyphs exceeded a 3:1 icon contrast ratio. Phone navigation and session-isolation checks passed, as did all nine report header/footer page-setup combinations. JavaScript syntax, whitespace, and source/deployed bundle checks passed.
