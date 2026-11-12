const assert = require('node:assert/strict');
const fixture = require('./phase0-browser-fixture.cjs');

async function assertLevel(lane, fraction) {
  const track=await lane.locator('.line').boundingBox(),thumb=await lane.locator('.level-thumb').boundingBox();
  assert.ok(thumb.width>track.width && thumb.width>2*thumb.height);
  assert.ok(Math.abs((track.y+track.height*(1-fraction))-(thumb.y+thumb.height/2))<1,'thumb follows the completed fraction');
}

(async () => {
  const f = await fixture();
  try {
    const {page,login} = await f.open('desktop','admin',false);
    const stamp = new Date().toISOString(), calls=[];
    const tasks = ['Payroll processing','Journal / period closing','Bank & Cash Reconciliation','Payable processing','PIT & SSO','Trial'].map((title,i)=>{
      const done=i===0?3:0;
      return {id:String(i+1),title,done,total:3,revision:stamp,steps:['Review records','Confirm balances','Finish'].map((text,index)=>({text,done:index<done}))};
    });
    tasks[2].steps=Array.from({length:72},(_,i)=>({text:'Reconciliation step '+(i+1),done:false}));
    tasks[2].total=tasks[2].steps.length;
    // Older protected device snapshots can carry three pins.
    const snapshot={tasks,tasks_at:stamp,pins:['1','2','3'],storage:{checked_at:stamp,db_bytes:82218131,db_limit:500000000,file_bytes:0,file_limit:1000000000}};
    await page.route('**/rpc/desktop_dock_status',route=>{
      const {p_action,p_pins}=route.request().postDataJSON();calls.push(p_action);
      if (p_action==='refresh') snapshot.storage.db_bytes=350000000;
      if (p_action==='pins') snapshot.pins=p_pins;
      return route.fulfill({json:snapshot});
    });
    let conflict=false;
    await page.route('**/rpc/set_desktop_dock_step',route=>{
      const p=route.request().postDataJSON();calls.push('step');
      const task=tasks.find(t=>t.id===p.p_task);
      assert.equal(p.p_revision,task.revision);
      if (!conflict) {
        task.steps[p.p_index].done=p.p_done;
        if (!p.p_done) task.steps.slice(p.p_index+1).forEach(step=>{step.done=false;});
        task.done=task.steps.filter(step=>step.done).length;
        task.revision=new Date(Date.parse(task.revision)+1000).toISOString();
      }
      return route.fulfill({json:{...snapshot,outcome:conflict?'changed':'saved'}});
    });
    await login();
    await page.evaluate(()=>switchTab('journal'));
    const rail=page.locator('#desktopStatusDock'),db=rail.locator('.db'),popup=rail.locator('dialog'),bars=rail.locator('.lane');
    await db.filter({hasText:'16%'}).waitFor();
    assert.equal(await db.textContent(),'16%');assert.deepEqual(await bars.allTextContents(),['','']);
    assert.equal(await rail.locator('.marker').count(),0);
    for (const [width,height] of [[1440,940],[1152,768]]) {
      await page.setViewportSize({width,height});
      const line=await rail.locator('.tasks').boundingBox(),tile=await db.boundingBox(),wifi=await page.locator('#connectionFloat14301').boundingBox();
      assert.ok(Math.abs(line.height-height*.34)<1);
      assert.equal((await rail.locator('.line').first().boundingBox()).width,6);
      await assertLevel(bars.first(),1);await assertLevel(bars.nth(1),0);
      assert.equal(tile.width,tile.height);assert.equal(tile.width,wifi.width);assert.equal(tile.x,wifi.x);
      assert.ok(line.y>0 && line.y+line.height<tile.y && tile.y+tile.height<wifi.y);
      assert.equal(await page.locator('#editorIcon108').count(),0);
    }
    await bars.nth(1).click();
    assert.equal(await popup.locator('.card').count(),6);
    const boxes=popup.locator('.steps input');
    assert.equal(await boxes.count(),3);assert.equal(await boxes.nth(1).isDisabled(),true);
    await boxes.first().click();await popup.getByText('Step saved.',{exact:true}).waitFor();
    assert.equal(await boxes.nth(1).isEnabled(),true);
    assert.match(await bars.nth(1).getAttribute('aria-label'),/1 of 3/);
    await assertLevel(bars.nth(1),1/3);
    await boxes.nth(1).click();await boxes.nth(2).click();
    await popup.getByText('Step saved.',{exact:true}).waitFor();await assertLevel(bars.nth(1),1);
    await boxes.nth(0).click();await popup.getByText('Step saved.',{exact:true}).waitFor();
    assert.equal(await boxes.nth(2).isChecked(),false);
    conflict=true;
    await boxes.first().click();await popup.getByText(/This checklist changed/).waitFor();
    assert.equal(await boxes.first().isChecked(),false);
    await popup.getByRole('button',{name:'Bank & Cash Reconciliation',exact:true}).click();
    await popup.getByRole('heading',{name:'Bank & Cash Reconciliation'}).waitFor();
    // A long list scrolls independently of storage, dates and Refresh all, even on a short laptop screen.
    await page.setViewportSize({width:1152,height:560});
    const summary=popup.locator('.summary'),panel=popup.locator('.checklists'),refresh=popup.locator('.refresh');
    assert.equal(await summary.getByRole('heading',{name:'Supabase storage'}).count(),1);
    const summaryBox=await summary.boundingBox(),listBox=await panel.boundingBox(),heading=await popup.locator('#dockTitle').boundingBox();
    assert.ok(summaryBox.y>=0 && summaryBox.y+summaryBox.height<=listBox.y+1);
    const topReadings=async()=>Promise.all([refresh,summary.locator('.taskTime'),summary.locator('.storageTime'),summary.locator('.dbAmount'),summary.locator('.fileAmount')].map(l=>l.boundingBox()));
    const before=await topReadings();
    assert.ok(before[0].y>=heading.y+heading.height && before[3].y>=before[0].y+before[0].height);
    await panel.evaluate(el=>{el.scrollTop=el.scrollHeight;});
    assert.ok(await panel.evaluate(el=>el.scrollTop>100 && el.scrollHeight>el.clientHeight));
    assert.deepEqual(await topReadings(),before);
    assert.ok(await refresh.evaluate(el=>{const r=el.getBoundingClientRect();return el.getRootNode().elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;}));
    await page.setViewportSize({width:1152,height:768});
    await popup.getByRole('button',{name:'Unpin Payroll processing',exact:true}).click();
    await popup.getByRole('button',{name:'Pin Payable processing',exact:true}).click();
    await popup.getByRole('button',{name:'Move Payable processing earlier',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('desktopStatusDock').shadowRoot.querySelector('.lane').dataset.id==='4');
    await popup.getByRole('button',{name:'Refresh all'}).click();
    await db.filter({hasText:'70%'}).waitFor({state:'attached'});
    assert.match(await db.getAttribute('aria-label'),/Red flag/);
    await page.keyboard.press('Escape');await popup.waitFor({state:'hidden'});
    await db.click();await popup.getByRole('button',{name:'Close status window'}).click();
    assert.deepEqual(calls,['read','step','step','step','step','step','pins','pins','pins','refresh']);
    await page.locator('#nav-module-documents .nav-header').click();
    await page.locator('#document-editor105.active').waitFor();
    assert.equal(await page.locator('#editorIcon108').count(),0);
    console.log('PASS equalizer levels, fixed storage header and checklist scrolling, legacy pins, ordered step edits, conflict recovery, cached opens, manual refresh and editor navigation');
  } finally {await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
