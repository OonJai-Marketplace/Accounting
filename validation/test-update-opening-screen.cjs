const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium, devices } = require('playwright');

const root = path.resolve(__dirname, '..');
const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png' };
const server = http.createServer((req, res) => {
  const file = path.join(root, new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep) || !fs.statSync(file, {throwIfNoEntry:false})?.isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

async function pauseDownload(page, pattern) {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route(pattern, async route => { await held; await route.continue(); });
  return release;
}

async function check(browser, base, phone) {
  const context = await browser.newContext({
    ...(phone ? devices['Pixel 7'] : {}), serviceWorkers:'block', reducedMotion:'reduce'
  });
  try {
    const page = await context.newPage();
    await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    const releaseUpdater = await pauseDownload(page, '**/scripts/update14390.js*');
    await page.goto(base + '/update.html', {waitUntil:'commit'});
    await page.locator('#updateProgress').waitFor({state:'visible'});
    await page.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length > 0);
    releaseUpdater();
    await page.waitForLoadState('domcontentloaded');

    const releaseWorkspace = await pauseDownload(page, phone ? '**/deployment-config.js*' : '**/desktop14245-1.js*');
    const workspace = phone ? 'phone' : 'desktop';
    await page.goto(base + '/' + workspace + '.html', {waitUntil:'commit'});
    const panel = page.locator('#accountingLaunch');
    await panel.getByText('Opening your workspace…').waitFor({state:'visible'});
    await panel.getByRole('progressbar').waitFor({state:'visible'});
    await page.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length > 0);
    assert.equal(await panel.evaluate(el => el.contains(document.elementFromPoint(innerWidth / 2,innerHeight / 2))), true);
    releaseWorkspace();
    await panel.waitFor({state:'detached'});
    await page.locator('#loginForm').waitFor({state:'visible'});
    console.log('PASS ' + workspace + ' paints progress with the updater and first workspace script held, then shows sign-in');
  } finally {
    await context.close();
  }
}

(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/tmp/chromium',args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage']});
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    for (const phone of [false,true]) await check(browser,base,phone);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
