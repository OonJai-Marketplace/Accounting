const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{const{page,login}=await f.open();await login();await page.evaluate(()=>switchTab('report-gl'));await page.waitForFunction(()=>startup14257.isPrepared('reference')&&startup14257.isPrepared('journal'));
 const entry=await page.evaluate(()=>({id:'HISTORY-TEST',date:Accounts69.from,accountId:'system-history',account:'System with history',currency:'LAK',debit:25,credit:0,status:'posted',memo:'System ledger test'}));f.fixture.journal=[entry];
 const result=await page.evaluate(async entry=>{
 AccountingStore.accounts.push({id:'system-history',code:'SYS-H',name:'System with history',type:'SYSTEM',isTechnical:true,isPosting:true,currency:'LAK'},{id:'system-empty',code:'SYS-E',name:'New System account',type:'SYSTEM',isTechnical:true,isPosting:true,currency:'LAK'});
 JournalModule.entries.push(entry);
 // Reports now load an isolated, authoritative period snapshot from the RPC.
 Reports79.from=entry.date;Reports79.to=entry.date;Reports79.mode='custom';Reports79.selectedMonths14331=null;Reports79.allMonths14331=false;await reportWindow143195.refresh();
 Reports79.currency='';Reports79.account='';Reports79.kind='gl';renderReports79();
 const filter=()=>document.querySelector('#report-gl button[onclick*="toggleReportFilters"]').click();
 filter();
 const dialog=document.querySelector('dialog.report-dialog299[open]');
 const options=[...dialog.querySelectorAll('select[name=account] option')].map(o=>o.value);
 dialog.querySelector('[data-cancel]').click();
 const data=reportData79(),model=reportModel79('gl');
 Reports79.kind='pl';const financial=reportData79();
 Reports79.kind='activity';const activity=reportData79();
 Reports79.kind='gl';renderReports79();filter();
 const form=document.querySelector('dialog.report-dialog299[open] form');
 form.elements.account.value='system-history|LAK';
 form.requestSubmit();
 return {options,ledger:data.some(r=>r.account.id==='system-history'),entry:model.some(g=>g.values.some(row=>row.includes('HISTORY-TEST'))),financialExcludes:!financial.some(r=>r.account.id==='system-history'),activity:activity.some(r=>r.account.id==='system-history'),selected:Reports79.account,content:document.querySelector('#report-gl .r79-content').textContent};
 },entry);assert(result.options.includes('system-empty|LAK'));assert(result.options.includes('system-history|LAK'));assert(result.ledger&&result.entry&&result.financialExcludes&&result.activity);assert.equal(result.selected,'system-history|LAK');assert(result.content.includes('HISTORY-TEST'));assert(!result.content.includes('no recognized classification'));console.log('PASS System accounts with and without activity appear in ledger filters; posted details and account activity include System; financial statement exclusions preserved.');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
