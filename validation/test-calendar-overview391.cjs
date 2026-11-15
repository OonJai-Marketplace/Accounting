const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
 const fixture = await createFixture();
 try {
  const {page, login} = await fixture.open();
  fixture.fixture.tables.hr_calendar_events14306 = [{id:'fixture-event',version:1,data:{
   title:'Calendar test',start:'2026-11-17',end:'2026-11-17',type:'occasion',
   status:'scheduled',effect:'none',notes:'Notes on the saved record'
  }}];
  await login();
  await page.waitForFunction(() => startup14257.interactive);
  await page.locator('[data-tab112="Finance"]').click();
  await page.locator('#nav-module-accounts .nav-header').click();
  const home = page.getByRole('button',{name:'Home / Overview',exact:true});
  await home.click();
  assert.match(await page.locator('#dashboard .dash-hero112 h1').innerText(), /Welcome back/i);
  await page.locator('[data-tab112="Overview"]').click();
  await page.locator('[data-map112="assets"]').click();
  const details = page.locator('.ui-overlay108').last();
  assert.match(await details.innerText(), /Cash on Hand/);
  await details.getByRole('button',{name:'Close',exact:true}).last().click();

  for (const [trigger, title] of [['.logo-tile113','Company profile'],['#headerAccountTrigger','My profile']]) {
   await page.locator(trigger).click();
   assert.match(await page.locator('dialog.identity-dialog[open]').innerText(),new RegExp(title,'i'));
   await page.keyboard.press('Escape');
  }
  await page.evaluate(() => switchTab('hr-calendar'));
  for (const shortcut of [false,true]) {
   if (shortcut) await page.locator('#desktopStatusDock').getByRole('button',{name:'Company calendar'}).click();
   const calendar = page.locator(shortcut?'dialog.rail-calendar379':'#hr-calendar');
   await calendar.locator('[data-calendar-month]').fill('2026-11');
   await calendar.locator('[data-calendar-month]').dispatchEvent('change');
   const day = calendar.locator('[data-cal-day="2026-11-17"]').locator('..');
   const size = await day.boundingBox();
   await day.click({position:{x:Math.floor(size.width)-4,y:Math.floor(size.height)-4}});
   const dialog = page.locator('.hr-dialog14306[open]').last();
   assert.equal(await dialog.locator('[data-add-holiday-day]').count(),1);
   await dialog.locator('[data-add-day]').click();
   assert.equal(await dialog.locator('[name=start]').inputValue(),'2026-11-17');
   await page.keyboard.press('Escape');
   await day.getByRole('button',{name:'Calendar test'}).click();
   assert.match(await dialog.innerText(),/Notes on the saved record/);
   await dialog.getByRole('button',{name:'Edit',exact:true}).click();
   assert.equal(await dialog.locator('[name=title]').inputValue(),'Calendar test');
   await page.keyboard.press('Escape');
   const item = calendar.locator('.hr-agenda14306 article').filter({hasText:'Calendar test'});
   const itemBox = await item.boundingBox();
   await item.click({position:{x:8,y:Math.floor(itemBox.height)/2}});
   assert.match(await dialog.innerText(),/Notes on the saved record/);
   await page.keyboard.press('Escape');
  }
  console.log('PASS Home navigation, chart detail, both profiles and both date-cell calendar interactions');
 } finally {await fixture.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
