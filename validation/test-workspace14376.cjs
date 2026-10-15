const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open();await login();
 assert.equal(await page.locator('[data-experiment14366],#navigation-blank14366').count(),0);
 const navigation=await page.evaluate(async()=>{
  const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const sample=()=>{const panel=document.querySelector('.tab-content.active'),tabs=document.getElementById('categoryTabShell');return {active:panel?.id,nav:document.querySelector('.nav-category.active-category')?.id,tabs:tabs?.parentElement.id,hidden:tabs?.hidden,height:tabs?.getBoundingClientRect().height,top:tabs?.getBoundingClientRect().top,team:document.body.classList.contains('team-shell14227')}};
  const rows=[];
  for(let i=0;i<3;i++)for(const target of ['sub-users-home14229','sec-chart-accounts','sec-sub-accounts','journal']){
   target.startsWith('sec-')?scrollToAccountModule(target):switchTab(target);await frames();const before=sample();workspaceViews14364.invalidate('journal',false);await workspaceViews14364.build(false);await frames();rows.push({target,before,after:sample()});
  }
  switchTab('dashboard');await frames();switchTab('journal');const positions=[sample()];for(let i=0;i<8;i++){await new Promise(requestAnimationFrame);positions.push(sample())}
  return {rows,positions};
 });
 for(const {target,before,after}of navigation.rows){assert.deepEqual(after,before,'background preparation must preserve '+target);if(target.startsWith('sec-')){assert.equal(after.tabs,'accounts-modular-container');assert.equal(after.nav,'nav-module-accounts');assert(!after.hidden&&after.height>0)}}
 assert(navigation.positions.every(p=>p.tabs==='journal'&&!p.hidden&&Math.abs(p.top-navigation.positions.at(-1).top)<1),'tab bar cannot jump after navigation: '+JSON.stringify(navigation.positions));
 console.log('PASS removed test links; Accounts tabs remain visible; background refresh preserves selection; tab position stable across frames');
 // Exercise the actual posting handler with a delayed receipt and a separately blocked download.
 await page.evaluate(()=>{
  const date=getCurrentMonthPrefix()+'-15',a=AccountingStore.accounts.filter(a=>a.currency==='LAK'&&a.id&&!a.is_parent).slice(0,2);if(a.length<2)throw Error('Need two fixture accounts');
  clearJournalEntry();document.getElementById('jeTransDate').value=date;document.getElementById('jeGeneralMemo').value='Posting regression 14376';document.getElementById('jeLinesBody').replaceChildren();
  addJournalLineRow(`${a[0].code} — ${a[0].name}`,'Regression debit','100',{});addJournalLineRow(`${a[1].code} — ${a[1].name}`,'Regression credit','',{LAK:'100'});calculateJournalBalance();
  const rpc=ojmDb.rpc.bind(ojmDb);window.originalRpc14376=rpc;ojmDb.rpc=(name,p)=>name==='post_manual_journal14228'?new Promise(resolve=>window.postResolve14376=resolve):name==='void_journal_entry'?Promise.resolve({data:null,error:null}):rpc(name,p);
  window.originalJournalLoad14376=loadJournalFromSupabase;window.downloadResolvers14376=[];window.loadJournalFromSupabase=()=>new Promise(r=>downloadResolvers14376.push(r));
  window.postTask14376=submitJournalEntry();
 });
 await page.waitForFunction(()=>!!window.postResolve14376);
 await page.evaluate(()=>window.savedJob14376=structuredClone([...pendingPosts99.values()][0]));
 const pending=await page.locator('#tblJournalHistoryBody').innerText();assert(!pending.includes('Waiting for confirmed journal'));
 assert.equal(await page.locator('#tblJournalHistoryBody button:disabled').count(),2);
 await page.evaluate(()=>postResolve14376({data:[{entry_id:'confirmed-14376',entry_no:'OJM-14376'}],error:null}));
 await page.waitForFunction(()=>downloadResolvers14376.length===1);
 assert.equal(await page.locator('#tblJournalHistoryBody button:not(:disabled)').count(),2,'confirmed receipt enables actions before download');
 assert((await page.locator('#tblJournalHistoryBody').innerText()).includes('OJM-14376'));
 const afterPost=await page.evaluate(async()=>{workspaceViews14364.invalidate('journal',false);await workspaceViews14364.build(false);return {active:document.querySelector('.tab-content.active')?.id,nav:document.querySelector('.nav-category.active-category')?.id}});
 assert.deepEqual(afterPost,{active:'journal',nav:'nav-module-transactions'});
 f.fixture.tables.audit_log=[{id:'audit-14376',table_name:'journal_entries',record_id:'confirmed-14376',action:'VOID',reason:'Regression void 14376',old_data:{entry_no:'OJM-14376',status:'posted'},new_data:{entry_no:'OJM-14376',status:'voided'},actor_id:f.fixture.profiles[0].id,created_at:new Date().toISOString()}];
 await page.evaluate(()=>{pendingVoidTransaction={dbId:'confirmed-14376',entryNo:'OJM-14376',actor:liveProfile.id,client:ojmDb};document.getElementById('voidTransactionReason').value='Regression void 14376';window.voidTask14376=confirmVoidTransaction()});
 await page.waitForFunction(()=>downloadResolvers14376.length===2);
 assert.equal(await page.evaluate(()=>JournalModule.entries.some(r=>r.dbEntryId==='confirmed-14376')),false,'confirmed void updates local journal before download');
 await page.waitForFunction(()=>LiveTransactionAudit.some(r=>r.id==='audit-14376'));
 await page.evaluate(()=>{localFirst14333.projectJournal();switchTab('transactions-voided')});
 assert.equal(await page.evaluate(()=>JournalModule.entries.some(r=>r.dbEntryId==='confirmed-14376')),false,'pending projection cannot resurrect a voided receipt');
 assert((await page.locator('#auditMonths98').innerText()).includes('Regression void 14376'));
 await page.evaluate(async()=>{downloadResolvers14376.forEach(r=>r());await Promise.all([postTask14376,voidTask14376]);ojmDb.rpc=originalRpc14376;loadJournalFromSupabase=originalJournalLoad14376});
 console.log('PASS pending controls retain layout; server receipt enables Edit/Void before download; void refreshes Audit Logs independently and does not resurrect');
 const failures=await page.evaluate(async()=>{
  const rpc=ojmDb.rpc,load=loadJournalFromSupabase,audit=loadTransactionAudit;
  const job=structuredClone(savedJob14376),single={...job.payload};delete single.p_request_key;
  job.id='batch-14376';job.payload={p_request_key:job.id,p_entries:[single,single]};job.status='saved';job.receipt=[{entry_id:'batch-one',entry_no:'BATCH-1'},{entry_id:'batch-two',entry_no:'BATCH-2'}];
  pendingPosts99.set(job.id,job);localFirst14333.mainSave(job);localFirst14333.projectJournal();
  const begin=id=>{pendingVoidTransaction={dbId:id,entryNo:id,actor:liveProfile.id,client:ojmDb};document.getElementById('voidTransactionReason').value='Batch regression'};
  ojmDb.rpc=()=>Promise.resolve({error:{message:'Permission denied'}});begin('batch-one');await confirmVoidTransaction();
  const rejected={preserved:JournalModule.entries.some(r=>r.dbEntryId==='batch-one'),error:document.getElementById('voidTransactionError').textContent};
  ojmDb.rpc=()=>Promise.resolve({error:null});loadJournalFromSupabase=()=>Promise.resolve();loadTransactionAudit=()=>Promise.resolve();begin('batch-one');await confirmVoidTransaction();localFirst14333.projectJournal();
  const partial={removed:!JournalModule.entries.some(r=>r.dbEntryId==='batch-one'),other:JournalModule.entries.some(r=>r.dbEntryId==='batch-two'),durable:localFirst14333.mainLoad().find(j=>j.id==='batch-14376')?.voidedEntryIds};
  ojmDb.rpc=rpc;loadJournalFromSupabase=load;loadTransactionAudit=audit;return {rejected,partial};
 });
 assert.equal(failures.rejected.preserved,true);assert.equal(failures.rejected.error,'Permission denied');assert.deepEqual(failures.partial,{removed:true,other:true,durable:['batch-one']});
 console.log('PASS rejected void preserves the entry; voiding one confirmed batch entry preserves the other and saves the exclusion');

}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
