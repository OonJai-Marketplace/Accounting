const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{const {page,login}=await f.open();await login();await page.evaluate(()=>switchTab('journal'));
await page.evaluate(()=>{window.__idCalls=[];const rpc=ojmDb.rpc.bind(ojmDb);ojmDb.rpc=async(name,p)=>{if(name==='available_journal_ids143121')return {data:[{entry_no:'OJM260004',selected:false},{entry_no:'OJM260005',selected:false}]};if(name==='select_available_journal_id143121'){__idCalls.push(p);return {data:p.p_entry_no||null}};return rpc(name,p)};ui117.prompt=async()=> 'OJM260005';entryNumber14257.paint()});
await page.locator('#availableJournalIds143121').click();await page.waitForFunction(()=>__idCalls.length===1);assert.equal(await page.evaluate(()=>__idCalls[0].p_entry_no),'OJM260005');
await page.evaluate(()=>{ui117.prompt=async()=>''});await page.locator('#availableJournalIds143121').click();await page.waitForFunction(()=>__idCalls.length===2);assert.equal(await page.evaluate(()=>__idCalls[1].p_entry_no),'');
await page.evaluate(()=>{JournalModule.editingEntryId='OJM260004';entryNumber14257.paint()});assert(await page.locator('#availableJournalIds143121').isHidden());
console.log('PASS available IDs control, manual selection, automatic reset and edit protection');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
