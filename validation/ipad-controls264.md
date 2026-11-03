# iPad control correction v143.264

The user reports that v143.262 still summons the iPad keyboard and moves the
Memo boundary when dragging Account. That report remains the physical-device
evidence. The development environment provides Chrome, not an actual iPad or
Safari, so the original claim of a verified iPad fix was not justified.

This revision uses native button inputs for tablet account selection, retaining
the original element, value and data handlers. Other autocomplete text fields
remain editable. Manual tablet column widths are attached to the visible native
header cells rather than a compressed COLGROUP. Pointer capture and a larger
handle support dragging; the header owning the handle determines the column,
even if an old index survives. Legacy journal defaults respect manual widths.

Verification:

- `test-ipad-controls264.cjs`: main and personal double entry, Single Entry fund
  and category controls, both iPad user-agent forms, desktop and ordinary names.
- `test-ipad-resize264.cjs`: captured touch-event handler sequence, stale index,
  hidden Date, independent Account/Memo widths, and unchanged Debit.
- Existing fitting and visible-column tests pass, including orientation, pinch,
  keyboard-height stability and date-mode changes.
- Isolated Chrome browser with synthetic tablet dimensions and fictional data:
  candidate tablet bundles loaded; personal Double Entry and Single Entry dropdowns
  open, have no text input and update the authoritative account value. Final
  Account drag changed 471.078125 to 406.75 CSS pixels while Memo stayed 467.28125;
  Debit and Credit stayed 180. Final handle width is 44 CSS pixels.
- Module, release, cache-key and runtime structure checks pass.

These checks do not verify iPad OS software-keyboard behavior, Safari touch hit
handling, or the user's installed state. No production financial records or
Supabase policies were modified.
