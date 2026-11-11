const assert=require('node:assert/strict');
const create=require('./phase0-browser-fixture.cjs');
(async()=>{
 const f=await create();
 try{
  const {page,login}=await f.open();await login();await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>{switchTab('journal');showJournalEntry98();document.getElementById('jeGeneralMemo').value='Keep company draft';});
  const opener=page.locator('#generateJournal258'),modal=page.locator('#journalGenerator258'),memo=modal.locator('[data-memo]');
  const tap=async locator=>process.env.PHASE0_DEVICE==='tablet'?locator.tap():locator.click();
  await tap(opener);await memo.fill('Keep generator draft');await tap(modal.locator('[data-close]'));
  await modal.waitFor({state:'detached'});await tap(opener);assert.equal(await memo.inputValue(),'Keep generator draft');
  await tap(memo);assert.equal(await modal.isVisible(),true);
  const rect=await modal.boundingBox();assert(rect.x>1&&rect.y>1);
  if(process.env.PHASE0_DEVICE==='tablet')await page.touchscreen.tap(2,2);else await page.mouse.click(2,2);
  await modal.waitFor({state:'detached'});await tap(opener);assert.equal(await memo.inputValue(),'Keep generator draft');
  const field=modal.locator('[data-template-query]');await field.focus();await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  await modal.waitFor({state:'detached'});assert.equal(await page.locator('#jeGeneralMemo').inputValue(),'Keep company draft');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'generateJournal258');
  console.log('PASS Generate Journal Close, backdrop, Escape, restored focus and retained generator/company drafts');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
