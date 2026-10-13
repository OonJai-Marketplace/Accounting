/* Universal accounting-number policy. Every module reads the same saved locale
   style and decimal precision instead of carrying its own hard-coded format. */
function appNumberLocale() {
  const style = ApplicationSettings.system?.numberFormat;
  return style === '1.234,56' ? 'de-DE' : style === '1 234,56' ? 'fr-FR' : 'en-US';
}
function appDecimalPlaces() {
  return Math.max(0, Math.min(6, Number(ApplicationSettings.accounting?.decimalPlaces ?? 2)));
}
function formatAppNumber(value) {
  const places = appDecimalPlaces();
  return Number(value || 0).toLocaleString(appNumberLocale(), { minimumFractionDigits: places, maximumFractionDigits: places });
}
function parseAppNumber(value) {
  let text = String(value ?? '').replace(/[\s\u00a0\u202f]/g, '');
  const style = ApplicationSettings.system?.numberFormat;
  if (style === '1.234,56') text = text.replace(/\./g, '').replace(',', '.');
  else if (style === '1 234,56') text = text.replace(',', '.');
  else text = text.replace(/,/g, '');
  const number = Number(text);
  return text !== '' && Number.isFinite(number) ? number : NaN;
}
function formatAppNumberEditing(input) {
  if (!input) return;
  const style = ApplicationSettings.system?.numberFormat || '1,234.56';
  const group = style === '1.234,56' ? '.' : style === '1 234,56' ? ' ' : ',';
  const decimal = style === '1,234.56' ? '.' : ',';
  const places = appDecimalPlaces();
  const escapedDecimal = decimal === '.' ? '\\.' : decimal;
  const clean = String(input.value ?? '').replace(new RegExp(`[^0-9${escapedDecimal}]`, 'g'), '');
  const parts = clean.split(decimal);
  const whole = (parts.shift() || '0').replace(/^0+(?=\d)/, '');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  input.value = grouped + (clean.includes(decimal) && places ? decimal + parts.join('').slice(0, places) : '');
}
function finishAppNumberEditing(input) {
  if (!input) return;
  const value = parseAppNumber(input.value);
  input.value = Number.isFinite(value) ? formatAppNumber(value) : '';
}

