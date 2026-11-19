const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../src/documents/scanner/core202.js');
const source = fs.readFileSync('src/documents/scanner/scanner202.js', 'utf8');
const section = (first, last) => source.slice(source.indexOf(first), source.indexOf(last, source.indexOf(first)));

(async () => {
  const entries = new Map([['SRR260055', ['staff-line-a', 'staff-line-b']], ['SRR260058', ['staff-line-c']]]);
  const index = [...entries.keys()].map(label => ({label, months: ['2026-11']}));
  const captures = [];
  const ctx = {
    C, draft: null, idsRequest215: 0, settings: {}, structuredClone, crypto,
    setupValue215: () => ({mode: 'start', type: 'journal', label: '55', month: '2026-11'}),
    journalIndex: async () => ({rows: index}), $: () => null,
    idKey221: label => label.toUpperCase(), nextLabel215: (_, label) => C.nextID(label),
    ids215: async groups => groups.map(g => ({...g, available: entries.has(g.label),
      journal_ids: [], staff_line_ids: entries.get(g.label)?.slice() || [], receipts: []})),
    persist: async () => {}, store: async () => {}, closeDialog() {}, render() {},
    openCamera209: async checked => {assert.equal(checked, true); captures.push(ctx.draft.active);},
    idProblem223: async () => {}
  };
  vm.createContext(ctx);
  vm.runInContext(section('function journalSerial(', 'let idPicker219=') +
    section('async function validateIDs215(', 'async function receiptChoice218(') +
    section('async function confirmSetup215()', 'function renderBatch215()'), ctx);
  await ctx.confirmSetup215();
  ctx.draft.pages.push({id: 'photo-1', group: ctx.draft.active}, {id: 'photo-2', group: ctx.draft.active});
  const original = ctx.draft.id;
  ctx.setupValue215 = () => ({mode: 'skip', type: 'journal', label: '58', month: '2026-11'});
  await ctx.confirmSetup215();
  ctx.draft.pages.push({id: 'photo-3', group: ctx.draft.active});
  assert.equal(ctx.draft.id, original);
  assert.deepEqual(ctx.draft.groups.map(g => g.label), ['SRR260055', 'SRR260058']);
  assert.deepEqual(ctx.draft.pages.map(p => p.group), [captures[0], captures[0], captures[1]]);
  assert.deepEqual(ctx.draft.idChecks215.SRR260055.staff_line_ids, ['staff-line-a', 'staff-line-b']);
  ctx.setupValue215 = () => ({mode: 'skip', type: 'journal', label: 'SRR260056', month: '2026-11'});
  await assert.rejects(ctx.confirmSetup215(), /SRR260056/);
  assert.equal(captures.length, 2);
  entries.set('SRR260058', ['reassigned-staff-line']);
  await assert.rejects(ctx.validateIDs215(ctx.draft.groups, true), /different journal records/);
  index.push({label: 'HIS2606-PC55', months: ['2026-11']});
  await assert.rejects(ctx.selectNumericID({type: 'journal',label: '55'}), /Choose a matching transaction/);
  const shortID = {type: 'journal', label: '7'};
  index.push({label:'HIS2606-PC07',months:['2026-11']});
  await ctx.selectNumericID(shortID);
  assert.equal(shortID.label, 'HIS2606-PC07');
  console.log('PASS staff capture, skipped and ambiguous numbers, multi-line entry identity, no Drive dependency during capture, and changed-record rejection');
})().catch(error => {console.error(error); process.exitCode = 1;});
