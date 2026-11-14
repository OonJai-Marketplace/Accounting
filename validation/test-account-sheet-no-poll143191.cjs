const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');

const source = fs.readFileSync('supabase/functions/_shared/google143150.ts', 'utf8');
const start = source.indexOf('export async function handler(');
assert(start >= 0, 'Google bridge handler is available');
const calls = { reads: 0, copies: 0, rates: 0 };
const context = {
  URL,
  Request,
  auth: async () => ({ id: 'administrator', user: {} }),
  settings: async () => ({ sheet: 'chart' }),
  connection: async () => ({ sheet: 'chart' }),
  clientID: () => 'client',
  clientSecret: () => 'secret',
  readAccounts: async () => { calls.reads++; return []; },
  syncAccounts: async () => { calls.copies++; },
  syncAccountRates: async () => { calls.rates++; return {}; },
  hash: async () => 'chart-hash',
  reply: (body, status = 200) => ({ body, status })
};
vm.createContext(context);
vm.runInContext(stripTypeScriptTypes(source.slice(start).replace('export ', '')), context);

async function request(action) {
  return context.handler(new Request('https://accounting.test/google-journal-bridge', {
    method: 'POST',
    body: JSON.stringify({ action })
  }));
}

(async () => {
  for (let i = 0; i < 3; i++) {
    assert.equal((await request('status')).status, 200);
    assert.equal((await request('poll')).status, 400);
  }
  assert.deepEqual(calls, { reads: 0, copies: 0, rates: 0 });
  assert.equal((await request('rates-refresh')).status, 200);
  assert.deepEqual(calls, { reads: 0, copies: 0, rates: 1 });
  assert.equal((await request('accounts-sync')).status, 200);
  assert.deepEqual(calls, { reads: 1, copies: 1, rates: 1 });
  console.log('PASS only explicit account synchronization reads and copies the chart');
})().catch(error => { console.error(error); process.exit(1); });
