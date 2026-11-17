const assert = require('node:assert/strict');
const fixture = require('./phase0-browser-fixture.cjs');

(async () => {
 process.env.FIXTURE_TIME = '2026-11-17T05:00:00Z';
 const f = await fixture();
 try {
  const {page,login} = await f.open('desktop','admin',false);
  const calls = [];
  const quotes = [{code:'JPY',name:'Japanese Yen',note:'139.2',bill:'139.2',eft:'139.26',sell:'141.98'},
   {code:'VND',name:'Vietnamese Dong',note:null,bill:null,eft:'0.8558',sell:'0.8728'}];
  const published = '2026-11-10', missing = '2026-11-15';
  let fail = false;
  await page.route('**/functions/v1/bcel-rates?**', route => {
   const p = new URL(route.request().url()).searchParams, date = p.get('date'); calls.push(date);
   if (fail) return route.fulfill({status:502,json:{error:'Unavailable'}});
   return route.fulfill({json:date === missing ? {status:'unavailable',date} : {status:'published',date,round:p.get('round') || '2',rounds:['2','1'],checkedAt:new Date().toISOString(),quotes}});
  });
  await login(); await page.waitForFunction(() => startup14257.interactive);
  const dock = page.locator('#desktopStatusDock'), fx = dock.locator('[data-watch=rates]');
  const account = dock.getByRole('tab',{name:'Foreign account rates'}), bank = dock.getByRole('tab',{name:'BCEL bank rates'});
  await fx.click(); assert.equal(await account.getAttribute('aria-selected'),'true'); assert.equal(calls.length,0);
  await bank.click(); const panel = dock.locator('#fx-bank-panel'), date = panel.getByLabel('Rate date'), round = panel.getByLabel('Round');
  await panel.getByText('0.8558').waitFor(); assert.equal(await panel.getByText('—',{exact:true}).count(),2);
  await date.fill(published); await date.dispatchEvent('change'); await panel.locator('[data-bank-status]').getByText(/Round 2/).waitFor();
  await round.selectOption('1'); await panel.locator('[data-bank-status]').getByText(/Round 1/).waitFor();
  assert.match(await panel.getByRole('link').getAttribute('href'),/round=1/);
  await date.fill(missing); await date.dispatchEvent('change'); await panel.getByText(/No confirmed BCEL rate/).waitFor(); assert.equal(await panel.locator('tbody tr').count(),0);
  await dock.getByRole('button',{name:'Source settings'}).click(); const input = panel.getByLabel('BCEL source link');
  await input.fill('https://example.com/rates'); await panel.getByRole('button',{name:'Save source'}).click(); await panel.getByText(/official HTTPS/).waitFor();
  await input.fill('https://www.bcel.com.la/bcel/exchange-rate.html?lang=la&exDate='+published+'&round=1');
  const before = calls.length; await panel.getByRole('button',{name:'Save source'}).click(); await panel.getByText(/Saved copy/).waitFor(); assert.equal(calls.length,before);
  assert.match(await panel.getByRole('link').getAttribute('href'),/lang=la/);
  fail = true; await dock.getByRole('button',{name:'Refresh',exact:true}).click(); await panel.getByText(/Could not reach or verify BCEL/).waitFor(); await panel.getByText('0.8558').waitFor();
  await bank.focus(); await page.keyboard.press('ArrowLeft'); assert.equal(await account.getAttribute('aria-selected'),'true');
  await page.keyboard.press('Escape'); await fx.click(); assert.equal(await account.getAttribute('aria-selected'),'true');
  await bank.click(); await panel.getByText(/Saved copy/).waitFor(); assert.equal(await date.inputValue(),published);
  console.log('PASS default tab, on-demand lookup, denominations and precise rates, date/round, saved source, cache, errors, keyboard and reopening');
 } finally { await f.close(); }
})().catch(err => {console.error(err);process.exitCode=1;});
