// DOM-level fallback; does not certify browser rendering or physical devices.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),dom=new JSDOM('<div class="tab-content active"><div id="report-gl"><div class="r79-actions"></div></div><div id="reconciliationList71"></div></div>',{url:'http://localhost',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext(),run=code=>vm.runInContext(code,ctx),load=file=>run(fs.readFileSync(path.join(root,file),'utf8'));
(async()=>{try{
 if(w.document.readyState==='loading')await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));
 const errors=[];w.addEventListener('error',e=>errors.push(e.message));
 const prefs=new Map();
 Object.assign(w,{handleAccountFormSubmit:()=>{},logoutDemoUser:()=>{},renderAccounts69:()=>{},structuredClone,AccountingStore:{accounts:[],subAccounts:[]},liveProfile:{id:'admin',role:'admin'},ojmDb:{},Accounts69:{},Reports79:{},JournalModule:{entries:[]},Finance82:{},Work82:{},access113:{can:()=>true},canAccessAppTarget:()=>true,table82:()=>'',escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),formatAppNumber:String,formatAppDate:String,today82:()=> '2026-11-06',accountKey69:a=>a.id+'|'+a.currency,workspaceRules:()=>({fundIds:['a1010'],entryIds:[],permission:{}}),copyReportToEditor105:()=>{},JournalCells143116:{editing:()=>true,chosen:()=>false},switchTab:id=>id,scrollToAccountModule:id=>id,showCenterStatus:()=>{},showAppNotification:()=>{throw Error('Unexpected notification')},localFirst14333:{edit:async(owner,key,update)=>{const k=owner+key,old=prefs.get(k)||{};if(update)prefs.set(k,update(old));return structuredClone(prefs.get(k)||{})}}});
 w.HTMLElement.prototype.getBoundingClientRect=()=>({x:10,y:10,left:10,top:10,right:310,bottom:42,width:300,height:32});
 const seedAccount=(code,name,extra={})=>({id:'a'+code,code,name,currency:'LAK',type:'ASSET',isPosting:true,subAccountId14285:'sub'+code,...extra});
 w.AccountingStore.accounts=[seedAccount('1010','Cash on Hand – MAIN'),seedAccount('1040','BCEL – LAK'),seedAccount('1013','Cash on Hand – Wellness'),seedAccount('1510','Equipment'),seedAccount('1099','Cash differences',{subAccountId14285:null}),seedAccount('1000','Cash group',{isPosting:false}),seedAccount('9010','Mapping',{isTechnical:true,type:'SYSTEM'})];
 load('src/reports/financial/reports-system-v71.js');
 run('reportStore71=async()=>[];reconciliationCloud305=()=>false');
 const modalSource=fs.readFileSync(path.join(root,'src/shared/presentation/shared-v108.js'),'utf8');run('(()=>{'+modalSource.slice(modalSource.indexOf('const esc='),modalSource.indexOf('window.leaveAccrual108'))+'})();');
 load('src/shared/ui/account-picker1428.js');
 load('src/reports/financial/reports-v117.js');
 load('src/reports/financial/report-routes14262.js');
 await w.renderReconciliationList71();
 const $=s=>w.document.querySelector(s),options=()=>[...w.document.querySelectorAll('.account-list1428 [role=option]')];
 const type=(id,text)=>{const n=$(id);n.focus();n.value=text;n.dispatchEvent(new w.Event('input',{bubbles:true}))};
 const records=new Map();w.__reportStore={getAll:()=>[...records.values()].map(r=>structuredClone(r)),get:key=>structuredClone(records.get(key)),put:r=>{records.set(r.key,structuredClone(r));return r.key}};
 run('reportStore71=async(mode,action)=>action(__reportStore)');
 Object.assign(w,{cents69:v=>Math.round(Number(v)*100),money69:v=>(v/100).toFixed(2),journalMemoHtml143187:w.escapeHtml,journalMemoValue143187:l=>l.memo||'',print82:(title,html,period)=>{w.__printed={title,html,period}}});
 const account=w.AccountingStore.accounts[0],key=w.accountKey69(account);
 w.__snapshot={account,key,currency:'LAK',opening:0,debit:10000,credit:0,closing:10000,lines:[{id:'TEST-1',date:'2026-10-15',memo:'Cash source',dr:10000,cr:0}]};
 run('readReconciliationAccount71=async()=>structuredClone(__snapshot)');
 const create=()=>w.createReconciliation71('posting',{account:key,from:'2026-10-01',to:'2026-10-31'},'cash');
 await create();assert.equal(run('currentReport71.id'),'REC-2610-1010');
 assert($('#recOverlay71 .rec-comparison117 .rec-account71').textContent.includes('2026-10-31'));
 assert.equal($('#recOverlay71 .rec-actions305 [data-rec-save305]').textContent,'Save');
 assert(!/Save Draft|Finish Reconciliation|Refresh Ledger Figures|Export \/ Print/.test($('#recOverlay71').textContent));
 await w.saveReport71();assert.equal(records.size,0);assert($('#recOverlay71'));assert.match($('#recError71').textContent,/actual cash counted/);
 w.recField71('statement','100');await w.saveReport71();assert.equal(records.size,1);assert.equal($('#recOverlay71'),null);assert.equal(run('currentReport71'),null);
 const first=[...records.values()][0];assert.equal(first.id,'REC-2610-1010');assert(first.recordId);assert.equal(first.status,'reconciled');assert.equal(first.attachments.length,0);
 await w.openSavedReport71(encodeURIComponent(first.recordId));
 assert.equal($('#recStatement71'),null);assert.equal($('#recOverlay71 .rec-amounts71'),null);assert.equal($('#recOverlay71 [data-rec-save305]'),null);
 assert.match($('#recOverlay71 .rec-actions305').textContent,/Export \/ Print/);assert.match($('#recCompare117').textContent,/100.00/);assert.match($('[data-rec-ledger]').textContent,/Cash source/);
 w.printReport71();assert.match(w.__printed.title,/REC-2610-1010/);assert.match(w.__printed.html,/Cash source/);assert.match(w.__printed.html,/100.00/);
 w.closeReport71();assert.equal($('#recOverlay71'),null);
 await create();w.recField71('statement','99');await w.saveReport71();assert.equal(records.size,1);assert.match($('#recError71').textContent,/Explain/);
 w.recField71('notes','One kip counted short.');await w.saveReport71();assert.equal(records.size,1);assert.match($('#recError71').textContent,/Confirm/);
 w.confirmReconciliation71(true);w.recField71('statement','98');assert.equal(run('currentReport71.differenceConfirmed'),false);w.confirmReconciliation71(true);await w.saveReport71();
 assert.equal(records.size,2,'same visible number must not overwrite a saved record');assert.equal($('#recOverlay71'),null);
 const second=[...records.values()][1];assert.equal(second.id,first.id);assert.notEqual(second.key,first.key);assert.equal(second.status,'saved');assert.equal(second.statement,'98');assert.equal(records.get(first.key).statement,'100');
 await w.openSavedReport71(second.recordId);assert.match($('#recOverlay71').textContent,/Saved with difference/);assert.equal($('#recStatement71'),null);w.closeReport71();
 // Existing records keep their identity and ledger, but display the requested number.
 const legacy={...first,id:'REC-old-uuid',key:'admin:REC-old-uuid',recordId:undefined,to:'2026-09-30',from:'2026-09-01',status:'draft'};records.set(legacy.key,legacy);
 await w.renderReconciliationList71();assert.match($('#reconciliationList71').textContent,/REC-2609-1010/);assert(!$('#reconciliationList71').textContent.includes('REC-old-uuid'));
 await w.openSavedReport71('REC-old-uuid');assert.match($('#recOverlay71 header small').textContent,/REC-2609-1010/);assert.equal($('#recStatement71'),null);w.printReport71();assert.match(w.__printed.title,/REC-2609-1010/);w.closeReport71();
 // A newer ledger snapshot requires review, keeps the count, and never saves stale figures.
 await create();w.recField71('statement','100');w.__snapshot.closing=10100;w.__snapshot.debit=10100;await w.saveReport71();assert.equal(records.size,3);assert.match($('#recError71').textContent,/ledger has changed/);assert.equal(run('currentReport71.statement'),'100');assert.equal(run('currentReport71.closing'),10100);
 w.recField71('statement','101');await w.saveReport71();assert.equal(records.size,4);assert.equal($('#recOverlay71'),null);
 // Storage failures leave the popup, input and internal identity available for a safe retry.
 await create();w.recField71('statement','101');const retryId=run('currentReport71.recordId');run('reportStore71=async(mode,action)=>{if(mode==="readwrite")throw Error("Storage unavailable");return action(__reportStore)}');await w.saveReport71();assert($('#recOverlay71'));assert.equal(run('currentReport71.recordId'),retryId);assert.equal(records.size,4);
 run('reportStore71=async(mode,action)=>action(__reportStore)');await w.saveReport71();assert.equal(records.size,5);assert.equal($('#recOverlay71'),null);
 // Optional documents do not bypass inconsistent bank statement totals.
 const bank={...first,status:'draft',key:undefined,method:'bank',statement:'100',statementOpening117:'0',statementDebit117:'0',statementCredit117:'101'};
 assert.throws(()=>w.validateReport71(bank,'save'),/do not agree/);
 assert.equal(records.get(legacy.key).id,'REC-old-uuid','presentation changes preserve legacy lookup keys');

 // Admin completion requires a server receipt; failed RPC stays open for retry.
 records.clear();const remote=new Map();let failCloud=true,cloudPrefs=null,revision=0;
 w.__snapshot.fingerprint='account-only-fingerprint';
 run('reconciliationCloud305=()=>true');
 w.ojmDb.rpc=async(name,args={})=>{
  if(name==='reconciliation_records305')return {data:[...remote.values()].map(r=>structuredClone(r))};
  if(name==='reconciliation_snapshot305')return {data:structuredClone(w.__snapshot)};
  if(name==='reconciliation_preferences305'){
   if(args.p_preferences){assert.equal(args.p_revision,revision);cloudPrefs=structuredClone(args.p_preferences);revision++}
   return {data:{preferences:cloudPrefs,revision}};
  }
  if(name==='reconciliation_save305'){
   if(failCloud)return {error:{message:'Database unavailable'}};
   assert.equal(args.p_fingerprint,w.__snapshot.fingerprint);
   const receipt={...structuredClone(args.p_report),cloudConfirmed305:true};remote.set(receipt.recordId,receipt);return {data:receipt};
  }
  throw Error('Unexpected RPC '+name);
 };
 await w.reconPreferences71('admin',old=>({...old,'a1510|LAK':'balance'}));
 assert.equal((await w.reconPreferences71('admin'))['a1510|LAK'],'balance');
 await create();w.recField71('statement','101');await w.saveReport71();
 assert($('#recOverlay71'));assert.match($('#recError71').textContent,/Database unavailable/);assert.equal(remote.size,0);assert.equal(records.size,0);
 failCloud=false;await w.saveReport71();assert.equal(remote.size,1);assert.equal($('#recOverlay71'),null);
 const cloudRecord=[...remote.values()][0];assert(cloudRecord.cloudConfirmed305);
 records.clear();await w.openSavedReport71(cloudRecord.recordId);assert.match($('#recOverlay71').textContent,/REC-2610-1010/);assert.equal($('#recStatement71'),null);w.closeReport71();
 await create();w.recField71('statement','101');run('reportStore71=async()=>{throw Error("Device storage unavailable")}');
 await w.saveReport71();assert.equal(remote.size,2,'Server saves remain available when device cache fails');assert.equal($('#recOverlay71'),null);
 assert.deepEqual(errors,[]);
 console.log('PASS reconciliation: one-step save and auto-close; confirmed differences; optional documents; unique storage; legacy display IDs; read-only history and export content; stale-ledger review; failed-save retry; bank validation.');
}finally{w.close()}})().catch(e=>{console.error(e);process.exitCode=1});
