const badName = 'Use an entry number such as OJM260001, a range such as 260001-260024, or an entry followed by a part number.';
const missingYear = 'For short numbers, include the four-digit year in the folder name (for example, November 2026) or include the year in the entry ID.';

function folderYear(folder) {
  const years = new Set(Array.from(String(folder || '').matchAll(/(?:^|\D)(20\d{2})(?=\D|$)/g), match => match[1].slice(-2)));
  return years.size === 1 ? [...years][0] : null;
}
function numberParts(text) {
  const full = /^(?:OJM[ -]*)?(\d{2})[ -]*(\d{4})$/i.exec(text);
  if (full && Number(full[2])) return {year:full[1], digits:full[2]};
  if (/^\d{1,4}$/.test(text) && Number(text)) return {year:null, digits:text.padStart(4, '0')};
  return null;
}
function matches(first, last, year, part, total) {
  const firstYear = first.year || last?.year || year;
  if (!firstYear) return {issue:missingYear};
  const start = 'OJM' + firstYear + first.digits;
  if (!last) return {first:start, part, total};
  if ((last.year && firstYear !== last.year) || Number(first.digits) > Number(last.digits)) {
    return {issue:'Use a range in the same year, starting with the lowest entry number.'};
  }
  if (part !== 1 || total !== null) return {issue:'Use a part number for a single entry only.'};
  return {first:start, last:'OJM' + firstYear + last.digits, expected:Number(last.digits) - Number(first.digits) + 1};
}
export function readReceiptName(filename, folder = '') {
  if (!/\.pdf$/i.test(filename)) return {issue:badName};
  let stem = filename.slice(0, -4).normalize('NFKC').trim().replace(/[‐‑‒–—−]/g, '-').replace(/_/g, ' ')
    .replace(/^(?:(?:receipts?|scan|batch|journal)[\s-]+)+/i, '').trim();
  const suffix = /[ -]+(?:part\s*(\d+)|(\d+)\s*(?:of|\/)\s*(\d+))$/i.exec(stem);
  const part = suffix ? Number(suffix[1] || suffix[2]) : 1, total = suffix?.[3] ? Number(suffix[3]) : null;
  if (!Number.isSafeInteger(part) || part < 1 || (total !== null && (!Number.isSafeInteger(total) || total < part))) {
    return {issue:'Check the part number. For example, use part02 or 2of3.'};
  }
  if (suffix) stem = stem.slice(0, suffix.index).trim();
  const year = folderYear(folder), single = numberParts(stem);
  const interpretations = [], errors = [];
  function add(target) { if (target.issue) errors.push(target); else interpretations.push(target); }
  if (single) add(matches(single, null, year, part, total));
  for (const sep of stem.matchAll(/-|\s+to\s+/gi)) {
    const a = numberParts(stem.slice(0,sep.index).trim()), b = numberParts(stem.slice(sep.index+sep[0].length).trim());
    if (a && b) {
      if (suffix) errors.push({issue:'Use a part number for a single entry only.'});
      else add(matches(a,b,year,part,total));
    }
  }
  if (interpretations.length > 1) return {issue:'This name could mean one entry or a range. Use the full ID for each entry, for example OJM260040 or OJM260026-OJM260040.'};
  return interpretations[0] || errors[0] || {issue:badName};
}
export function previewTarget(name, pages, folder = '') {
  const target = readReceiptName(name,folder);
  if (target.expected && pages != null && pages !== target.expected) {
    return {issue:'The name lists ' + target.expected + ' entries, but this PDF has ' + pages + (pages === 1 ? ' page.' : ' pages.')};
  }
  return target;
}
