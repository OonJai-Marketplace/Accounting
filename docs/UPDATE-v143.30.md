# v143.30 — System date format and editor zoom controls

News dates and ranges, source-check dates, calendar agenda and reminders, shared full-date pickers, HR contract/leave/history labels, budget report dates, voucher history, document timestamps, scheduled review dates, maintenance snapshot times and connection/checklist timestamps now use the existing System date formatter. All nine saved formats are supported. ISO values remain unchanged for storage, ordering, date inputs, raw exports and identifiers. Month-only selectors and calendar tiles retain their month/day labels.

The document toolbar now has Zoom out, the current percentage and Zoom in. The quick Fit button is removed. View > Fit to width remains available. Zoom updates the view only, uses the same 20–300% range as the editor's zoom setter, and displays the correct percentage when switching documents. Ordinary DIV blocks display as Normal in the style selector instead of exposing an HTML tag.

The exit X at the top edge of native fullscreen belongs to the browser and cannot be hidden by the website. Escape and the app's Exit Full Screen button remain available.

Validation covers all nine date formats, unchanged news source data, ISO picker values, saved System settings, calendar badges, HR date ranges, editor zoom buttons/bounds/document tabs, and paragraph style labels. No financial calculation or database migration changes.
