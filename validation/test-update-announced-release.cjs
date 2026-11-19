const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { MessageChannel } = require('node:worker_threads');

const source = fs.readFileSync('scripts/update14390.js', 'utf8');
const html = fs.readFileSync('update.html', 'utf8');
const embedded = JSON.parse(html.match(/id="updateRelease">([^<]+)<\/script>/)[1]);
const release = JSON.parse(fs.readFileSync('release-version.json', 'utf8'));
assert.equal(embedded.version, release.version);
assert.deepEqual(embedded.changes, release.changes.slice(0, 30));

async function openUpdate(query, userAgent, metadata, expectedChecks) {
  const base = 'https://example.test/Accounting/';
  const phone = userAgent.includes('Mobile');
  const workerName = phone ? 'phone-sw.js' : 'desktop-sw14242.js';
  let onOpen;
  const opened = new Promise(resolve => { onOpen = resolve; });
  let checks = 0;
  const notes = { replaceChildren() {}, append() {} };
  const elements = {
    updateRelease: { textContent: JSON.stringify(metadata) },
    updateStatus: {}, updateProgress: { removeAttribute() {} },
    updateRetry: { addEventListener() {} }, updateNotes: notes
  };
  const context = {
    URL, AbortController, MessageChannel, setTimeout, clearTimeout, setInterval, clearInterval,
    document: {
      getElementById: id => elements[id],
      createElement: () => ({ append() {} })
    },
    location: { href: base + 'update.html' + query, replace: onOpen },
    navigator: {
      onLine: true, userAgent,
      serviceWorker: {
        addEventListener() {},
        async register(url) {
          assert.equal(url, workerName + '?v=' + release.version);
          const active = {
            state: 'activated', scriptURL: base + url,
            postMessage(_, [port]) {
              port.postMessage({ ready: true, version: release.version });
              port.close();
            }
          };
          return { active, addEventListener() {}, removeEventListener() {} };
        }
      }
    },
    async fetch() {
      checks++;
      return { ok: true, json: async () => release };
    }
  };
  vm.runInNewContext(source, context);
  assert.equal(await opened, base + (phone ? 'phone' : 'desktop') + '.html?v=' + release.version);
  assert.equal(checks, expectedChecks);
  assert.equal(notes.hidden, false);
}

(async () => {
  await openUpdate('?version=' + release.version, 'Desktop', embedded, 0);
  await openUpdate('?v=' + release.version, 'Android Mobile', embedded, 0);
  await openUpdate('', 'Android Mobile', embedded, 1);
  await openUpdate('?version=old', 'Desktop', embedded, 1);
  await openUpdate('?version=' + release.version, 'Desktop', { version: '0.0' }, 1);
  console.log('PASS announced phone and desktop updates skip the manifest, direct and mismatched links check once');
})().catch(error => { console.error(error); process.exitCode = 1; });
