const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
  const fixture = await createFixture();
  try {
    for (const profile of ['laptop','tablet']) {
      process.env.PHASE0_DEVICE = profile;
      const {page, context, login, me} = await fixture.open('desktop','submitter');
      me.user_permissions.workspace_entry_mode240 = 'both';
      Object.assign(fixture.fixture.tables.user_permissions.find(p=>p.user_id===me.id),me.user_permissions);
      // Open already narrow, then cross the old layout breakpoints with a live draft.
      await page.setViewportSize({width:540,height:800});
      await login();
      await page.evaluate(() => {openWorkspaceUser(liveProfile.id);personalJournal1437.show(liveProfile.id,'journal');showJournalEntry98();});
      const group = page.getByRole('group',{name:'Transaction entry method'});
      await group.getByRole('button',{name:'Single Entry (Cashbook)'}).click();
      const amount = page.locator('[data-simple=amount]').first();
      await amount.fill('321');
      await page.evaluate(()=>{window.testJournalCard=document.getElementById('journalEntry98')});
      for (const width of [390,640,641,767,768,1024,1280,540]) {
        await page.setViewportSize({width,height:800});
        await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
        assert.equal(await page.locator('.v49-phone-workspace,.v49-desktop-post,#v49Fund,#v49Direction').count(),0);
        assert(await group.isVisible(),profile+' at '+width);
        assert(await amount.isVisible());
        assert.equal(Number((await amount.inputValue()).replaceAll(',','')),321);
        assert(await page.evaluate(()=>personalJournal1437.active && document.querySelector('#personalEditor1437 #journalEntry98')===window.testJournalCard));
      }
      await group.getByRole('button',{name:'Double Entry Journal'}).click();
      assert(await page.locator('#jeLinesBody').isVisible());
      await page.getByRole('tab',{name:'Home',exact:true}).click();
      await page.getByRole('tab',{name:'Journal',exact:true}).click();
      assert.equal(await page.locator('.v49-phone-workspace,.v49-desktop-post').count(),0);
      await context.close();
      console.log('PASS '+profile+' narrow startup, resize, draft retention and tab navigation');
    }
  } finally {await fixture.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
