const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{const{page,login}=await f.open();await login();await page.evaluate(()=>switchTab('report-gl'));await page.waitForFunction(()=>startup14257.isPrepared('reference')&&startup14257.isPrepared('journal'));
 const result=await page.evaluate(()=>{
 AccountingStore.accounts.push({id:'system-history',code:'SYS-H',name:'System with history',type:'SYSTEM',isTechnical:true,isPosting:true,currency:'LAK'},{id:'system-empty',code:'SYS-E',name:'New System account',type:'SYSTEM',isTechnical:true,isPosting:true,currency:'LAK'});
 JournalModule.entries.push({id:'HISTORY-TEST',date:Accounts69.from,accountId:'system-history',account:'System with history',currency:'LAK',debit:25,credit:0,status:'posted',memo:'System ledger test'});
 Reports79.currency='';Reports79.account='';Reports79.kind='gl';renderReports79();
 const options=[...document.querySelectorAll('#report-gl select[onchange*=account] option')].map(o=>o.value);
 const data=reportData79(),model=reportModel79('gl');
 Reports79.kind='pl';const financial=reportData79();
 Reports79.kind='activity';const activity=reportData79();
 Reports79.kind='gl';Reports79.account='system-history|LAK';renderReports79();
 return {options,ledger:data.some(r=>r.account.id==='system-history'),entry:model.some(g=>g.values.some(row=>row.includes('HISTORY-TEST'))),financialExcludes:!financial.some(r=>r.account.id==='system-history'),activity:activity.some(r=>r.account.id==='system-history'),selected:document.querySelector('#report-gl select[onchange*=account]').value,content:document.querySelector('#report-gl .r79-content').textContent};
 });assert(result.options.includes('system-empty|LAK'));assert(result.options.includes('system-history|LAK'));assert(result.ledger&&result.entry&&result.financialExcludes&&result.activity);assert.equal(result.selected,'system-history|LAK');assert(result.content.includes('HISTORY-TEST'));assert(!result.content.includes('no recognized classification'));console.log('PASS System accounts with and without activity appear in ledger filters; posted details and account activity include System; financial statement exclusions preserved.');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
