const assert = require('node:assert/strict');
const fixture = require('./phase0-browser-fixture.cjs');

(async () => {
  const f = await fixture();
  try {
    const {page,login} = await f.open('desktop','admin',false);
    const tasks = ['Payroll processing','Journal / period closing','Bank & Cash Reconciliation','Payable processing','PIT & SSO','Trial'].map((title,i)=>({id:String(i+1),title,done:i<2?10:0,total:i<2?10:7}));
    const stamp = new Date().toISOString(), calls=[];
    const snapshot={tasks,tasks_at:stamp,pins:null,storage:{checked_at:stamp,db_bytes:82218131,db_limit:500000000,file_bytes:0,file_limit:1000000000}};
    await page.route('**/rpc/desktop_dock_status',route=>{
      const {p_action,p_pins}=route.request().postDataJSON();calls.push(p_action);
      if (p_action==='refresh') {snapshot.storage.db_bytes=350000000;snapshot.tasks[0].done=4;}
      if (p_action==='pins') snapshot.pins=p_pins;
      return route.fulfill({json:snapshot});
    });
    await login();
    await page.evaluate(()=>switchTab('journal'));
    const rail=page.locator('#desktopStatusDock'),db=rail.locator('.db'),popup=rail.locator('dialog');
    await db.filter({hasText:'16%'}).waitFor();
    assert.deepEqual(await rail.locator('.code').allTextContents(),['PR','PC','BR']);
    for (const [width,height] of [[1440,940],[1152,768]]) {
      await page.setViewportSize({width,height});
      const line=await rail.locator('.tasks').boundingBox(),tile=await db.boundingBox();
      const wifi=await page.locator('#connectionFloat14301').boundingBox();
      assert.ok(Math.abs(line.height-height*.219)<1);
      assert.equal(tile.width,tile.height);assert.equal(tile.width,wifi.width);assert.equal(tile.x,wifi.x);
      assert.ok(line.y+line.height<tile.y && tile.y+tile.height<wifi.y);
      assert.equal(await page.locator('#editorIcon108').count(),0);
    }
    await db.click();await popup.waitFor();
    assert.equal(await popup.locator('.card').count(),6);
    await popup.getByRole('button',{name:'Unpin Payroll processing',exact:true}).click();
    await popup.getByRole('button',{name:'Pin Payable processing',exact:true}).click();
    await popup.getByRole('button',{name:'Move Payable processing earlier',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('desktopStatusDock').shadowRoot.querySelector('.tasks').textContent==='PCAPBR');
    await popup.getByRole('button',{name:'Refresh all'}).click();
    await db.filter({hasText:'70%'}).waitFor({state:'attached'});
    assert.match(await db.getAttribute('aria-label'),/Red flag/);
    assert.match(await popup.locator('.card').filter({hasText:'Payroll processing'}).textContent(),/4 of 10/);
    await page.keyboard.press('Escape');await popup.waitFor({state:'hidden'});
    await rail.locator('.tasks').click();await popup.getByRole('button',{name:'Close status window'}).click();
    assert.deepEqual(calls,['read','pins','pins','pins','refresh']);
    await page.locator('#nav-module-documents .nav-header').click();
    await page.locator('#document-editor105.active').waitFor();
    assert.equal(await page.locator('#editorIcon108').count(),0);
    console.log('PASS desktop status geometry, two entry points, pin order, cached opens, refresh both, editor navigation');
  } finally {await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
