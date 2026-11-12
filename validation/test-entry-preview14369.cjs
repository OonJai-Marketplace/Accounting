const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function main() {
  const events = new EventTarget();
  const documentListeners = new Map();
  const label = { textContent: '' };
  const date = { id: 'jeTransDate', value: '2026-10-31' };
  let active = false;
  const journal = { classList: { contains: () => active } };
  const doc = {
    readyState: 'complete',
    addEventListener: (type, callback) => documentListeners.set(type, callback),
    getElementById: id => ({ jeNextIdDisplay: label, jeTransDate: date, journal })[id]
  };

  const jobs = [];
  const calls = [];
  let deviceState;
  let reachable = true;
  const context = {
    document: doc, Event, structuredClone,
    addEventListener: events.addEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
    liveProfile: { id: 'test-user' },
    location: { origin: 'https://fixture.invalid' },
    navigator: { onLine: true },
    ApplicationSettings: { accounting: { journalPrefix: 'OJM', journalDigits: 4 } },
    access113: { can: () => true },
    JournalModule: { entries: [] },
    journalDurable14385: { pending: () => jobs },
    localFirst14333: {
      async edit(actor, key, change) {
        if (change) deviceState = change(structuredClone(deviceState));
        return structuredClone(deviceState);
      }
    },
    offline14239: {
      localJournalHistory: async () => [
        { id: 'OJM260007', dbEntryId: 'manual-7' },
        { id: 'AMO26-009999', dbEntryId: 'amortization' }
      ]
    },
    ojmDb: {
      async rpc(name, args) {
        calls.push([name, structuredClone(args)]);
        if (!reachable) return { error: { message: 'unreachable' } };
        return { data: { retained: ['OJM260011'], issued: [], available: [], reserved: [] } };
      }
    }
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['journal/entry-sequence.js', 'history/offline-audit143174.js', 'journal/entry-number14257.js']) {
    const filename = path.resolve(__dirname, '../src/bookkeeping', file);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  }

  const preview = context.entryNumber14257;
  await preview.prepareLocalHistory();
  events.dispatchEvent(new Event('page113'));
  active = true;
  events.dispatchEvent(new Event('page113'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(label.textContent, 'OJM260008');
  events.dispatchEvent(new Event('focus'));
  events.dispatchEvent(new Event('focus'));
  label.textContent = '';
  date.value = '2026-11-01';
  documentListeners.get('change')({ target: date });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(label.textContent, 'OJM260008', 'Changing the date repaints the preview');
  assert.equal(calls.length, 0, 'Opening the journal, refocusing, and choosing the date use local history');
  assert.equal(preview.choose, undefined, 'Manual number selection is unavailable');
  date.value = '2026-10-31';

  context.navigator.onLine = false;
  jobs.push({ payload: { p_transaction_date: date.value, p_prefix: 'OJM', p_digits: 4 }, localNumbers335: ['OJM260008'] });
  await preview.refresh(true);
  assert.equal(label.textContent, 'OJM260009');
  assert.equal(calls.length, 0, 'Offline preview must not attempt a download');

  context.navigator.onLine = true;
  await preview.refresh(true);
  assert.deepEqual(calls, [['journal_number_records335', { p_date: date.value, p_prefix: 'OJM', p_digits: 4 }]]);
  assert.equal(label.textContent, 'OJM260012', 'Retained records update the device calculation');
  reachable = false;
  await preview.refresh(true);
  assert.equal(calls.length, 2);
  preview.paint();
  assert.equal(label.textContent, 'OJM260012', 'Failed download preserves the known number');

  context.JournalModule.entries = [{ id: 'device-row', entryNumber: 'OJM260002' }];
  context.JournalModule.editingEntryId = 'device-row';
  preview.paint();
  assert.equal(label.textContent, 'Editing: OJM260002');
  console.log('PASS journal preview uses local history and pending posts, downloads retained records on request, and preserves assigned IDs');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
