const assert=require('node:assert/strict'),vm=require('node:vm'),{JSDOM}=require('jsdom'),fixture=require('./payroll-actions-fixture276.cjs');
const dom=new JSDOM(fixture.html,{runScripts:'outside-only',url:'https://fixture.test',pretendToBeVisual:true}),w=dom.window,c=dom.getInternalVMContext();
vm.runInContext('('+fixture.setup.toString()+')()',c);fixture.scripts().forEach(s=>vm.runInContext(s,c));
const el=id=>w.document.getElementById(id),flush=()=>new Promise(r=>setTimeout(r,35)),click=async id=>{el(id).click();await flush();},status=()=>el('payTemplateError1429').textContent;
(async()=>{
 await flush();await click('qa-open');
 assert.deepEqual([...w.document.querySelectorAll('.template-tools1429 button')].map(b=>b.id),['payPrepare1429','payPostDirect277']);
 assert(el('payTemplateError1429').compareDocumentPosition(el('payJournalLines1432'))&w.Node.DOCUMENT_POSITION_FOLLOWING);
 await click('payPrepare1429');assert.match(status(),/draft.*Save & Close Payroll/i);assert.equal(w.qa276.saves,0);assert.equal(el('qa-tab').textContent,'payroll-entries');
 w.document.querySelector('.pay-dialog1432 [data-dismiss]').click();await click('qa-finalized');await click('qa-open');
 el('payJournalDate274').value='2026-10-30';el('payJournalDate274').dispatchEvent(new w.Event('change',{bubbles:true}));
 w.qa276.fail='Synthetic save failure';await click('payPrepare1429');assert.match(status(),/Synthetic save failure/);assert.equal(el('payPrepare1429').disabled,false);assert.equal(w.qa276.postCalls,0);w.qa276.fail=null;
 el('jeGeneralMemo').value='Unfinished other journal';await click('payPrepare1429');assert.match(status(),/unfinished journal/);assert.equal(el('jeGeneralMemo').value,'Unfinished other journal');assert.equal(el('qa-tab').textContent,'payroll-entries');el('jeGeneralMemo').value='';
 let finish;w.qa276.delay=new Promise(r=>finish=r);const before=w.qa276.saves;await click('payPrepare1429');await click('payPrepare1429');assert.equal(w.qa276.saves,before+1,'duplicate clicks save once');assert(el('payPostDirect277').disabled);finish();await flush();w.qa276.delay=null;
 assert.equal(w.qa276.record.data.payrollTemplate1429.journalDate,'2026-10-30');assert.equal(w.qa276.cache.drafts['2026-10'].run.payrollTemplate1429.journalDate,'2026-10-30');
 assert.equal(w.document.querySelector('.pay-dialog1432'),null);assert.equal(el('qa-tab').textContent,'journal');assert.equal(el('jeTransDate').value,'2026-10-30');assert.equal(el('btnPostJournal').textContent,'Post Payroll Journal');assert(el('jeLinesBody').rows.length>=4);assert.equal(w.qa276.postCalls,0);
 await click('qa-open');let closed;w.qa276.delay=new Promise(r=>closed=r);await click('payPrepare1429');w.document.querySelector('.pay-dialog1432 [data-dismiss]').click();el('qa-tab').textContent='payroll-entries';closed();await flush();assert.equal(el('qa-tab').textContent,'payroll-entries','closing during save must not navigate');assert.equal(w.qa276.postCalls,0);
 console.log('PASS two journal actions, draft block, automatic layout save/readback/cache, failure/retry, duplicate protection, draft preservation, finalized transfer and close-during-save. No live posting.');w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
