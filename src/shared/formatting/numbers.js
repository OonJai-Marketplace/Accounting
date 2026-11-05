/* Universal accounting-number policy. Every module reads the same saved locale
   style and decimal precision instead of carrying its own hard-coded format. */
function appNumberLocale() {
  const style = ApplicationSettings.system?.numberFormat;
  return style === '1.234,56' ? 'de-DE' : style === '1 234,56' ? 'fr-FR' : 'en-US';
}
function appDecimalPlaces() {
  const places=Number(ApplicationSettings.accounting?.decimalPlaces ?? 2);
  return Number.isFinite(places)?Math.max(0,Math.min(6,Math.trunc(places))):2;
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
  const whole = (parts.shift() || '0');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  input.value = grouped + (clean.includes(decimal) && places ? decimal + parts.join('').slice(0, places) : '');
}
function finishAppNumberEditing(input) {
  if (!input) return;
  const value = parseAppNumber(input.value);
  input.value = Number.isFinite(value) ? formatAppNumber(value) : '';
}


// Rates display at most two decimals. Stored valuation precision is independent.
function formatAppRate(value) {
  if (value === null || value === undefined || value === '') return '—';
  const rate = Number(value);
  return Number.isFinite(rate) ? rate.toLocaleString(appNumberLocale(), { useGrouping: true, maximumFractionDigits: 2 }) : '—';
}

// A focus/blur/save must not round a historical carrying rate. Only an actual
// input event changes it; retain the exact value behind the compact display.
const appRateInputs287 = new WeakMap();
function readAppRateInput(input) {
  const state=appRateInputs287.get(input);
  if(state && input.value===state.display)return state.value;
  return input.type==='number'?Number(input.value):parseAppNumber(input.value);
}
function bindAppRateInput(input, value) {
  if(!appRateInputs287.has(input)){
    input.addEventListener('input',()=>appRateInputs287.set(input,{value:input.type==='number'?Number(input.value):parseAppNumber(input.value),display:input.value}));
    input.addEventListener('blur',()=>{const rate=readAppRateInput(input);if(input.value.trim()&&Number.isFinite(rate))bindAppRateInput(input,rate);});
  }
  const rate=typeof value==='number'?value:input.type==='number'?Number(value):parseAppNumber(value);
  input.value=value!==''&&value!=null&&Number.isFinite(rate)?(input.type==='number'?String(Number(rate.toFixed(2))):formatAppRate(rate)):'';
  appRateInputs287.set(input,{value:rate,display:input.value});
}
