const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

// Execute the real renderer and paginator with a small DOM adapter. No database writes.
const source = fs.readFileSync('src/bookkeeping/finalization/transaction-review-and-audit.js', 'utf8');
const renderer = source.slice(0, source.indexOf('function setTransactionTableHeaders'));
const element = () => ({dataset: {}, classList: {contains: () => true, add() {}}, children: [], setAttribute() {}, replaceChildren() { this.children = []; }, append(...nodes) { this.children.push(...nodes); }});
const bar = element(), container = {nextElementSibling: bar, closest: () => null};
const table = {...element(), closest: () => container};
const body = {...element(), innerHTML: '', closest: () => table};
const context = {window: {}, document: {createElement: element}, liveProfile: {role: 'admin'}, AccountingStore: {accounts: []}, isPrintMode: false,
  escapeHtml: String, formatAppDate: String, formatAppNumber: String, currencySymbolV6: String,
  getCleanAccountDisplay: (name, currency) => ({name, currency}), journalMemoHtml143187: String};
vm.createContext(context); vm.runInContext(renderer, context);
const entry = (id, created, date, count, postingDate = date) => Array.from({length: count}, (_, i) => ({
  id, dbEntryId: id, created_at: created, date: i === count - 1 ? postingDate : date, postingDate,
  account: 'Fixture account', currency: 'LAK', memo: 'Original line ' + i,
  debit: i === count - 1 ? 0 : 100, credit: i === count - 1 ? (count - 1) * 100 : 0
}));
// A newly posted monthly report begins with an older receipt. More than one page
// of previously posted records must not push it off page one.
const rows = [
  ...Array.from({length: 60}, (_, i) => entry('OLD-' + String(i).padStart(3, '0'), '2026-11-03T06:33:00Z', '2026-10-28', 2)).flat(),
  ...entry('OJM260364', '2026-11-03T14:23:07Z', '2026-10-01', 47, '2026-10-30')
];
const original = JSON.stringify(rows);
const visible = () => [...body.innerHTML.matchAll(/data-entry-id="([^"]+)"/g)].map(m => m[1]);
context.renderTransactionReviewTable(body, rows, 'edit');
assert.equal(visible()[0], 'OJM260364', 'newly posted report must start page one before DOM sorting');
assert.equal(visible().filter(id => id === 'OJM260364').length, 47, 'all report lines fit on the first page');
assert.equal(visible().length, 100, 'normal line limit remains');
assert.ok(body.innerHTML.includes('2026-10-01') && body.innerHTML.includes('2026-10-30'), 'original detail and fund dates remain visible');
const pages = [...visible()];
while (!bar.children[2].disabled) { bar.children[2].onclick(); pages.push(...visible()); }
assert.equal(pages.length, rows.length, 'next pages retain every line exactly once');
assert.equal(pages.filter(id => id === 'OJM260364').length, 47);
assert.equal(JSON.stringify(rows), original, 'rendering and pagination cannot mutate financial data');

const pending = entry('PENDING', '2026-10-01T01:00:00Z', '2026-10-01', 2).map(r => ({...r, pendingSync: true}));
context.renderTransactionReviewTable(body, [...rows, ...pending], 'edit');
assert.equal(visible()[0], 'PENDING', 'pending work stays ahead of confirmed entries');
context.renderTransactionReviewTable(body, rows.filter(r => r.id === 'OJM260364'), 'edit');
assert.equal(visible().length, 47, 'searching an entry retains the complete group');
context.renderTransactionReviewTable(body, [...entry('J-9', '2026-11-03T06:00:00Z', '2026-10-28', 2), ...entry('J-10', '2026-11-03T06:00:00Z', '2026-10-01', 2)], 'edit');
assert.equal(visible()[0], 'J-10', 'same-time postings use the same numeric ID tiebreak as the screen');
context.isPrintMode = true;
context.renderTransactionReviewTable(body, rows, 'none');
assert.equal(visible().length, rows.length, 'print still receives all lines for its chronological ordering');
assert.equal(visible()[0], 'OLD-059', 'existing print preparation order is preserved');
console.log('PASS new multi-date posting on page one, all lines across pages, unchanged dates/data, pending work, search and print');
