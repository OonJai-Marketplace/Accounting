const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function source(name,c){c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(name,'utf8'),c);return c}
(async()=>{
 assert(!fs.readFileSync('src/core/auth/access-v113.js','utf8').includes('recipe_view113'),'retired recipe endpoint must not ship');
 let finish;const host={innerHTML:'current account'},q={};for(const name of ['select','eq','neq','order'])q[name]=()=>q;q.then=(a,b)=>new Promise(r=>finish=r).then(a,b);
 const h=source('src/subusers/history/submitted-journals.js',{liveProfile:{id:'first'},ojmDb:{from:()=>q},document:{getElementById:()=>host},openStaffJournalPeriod:async()=>{},escapeHtml:String,formatAppDate:String});
 const request=h.loadMySubmittedStaffJournals();await Promise.resolve();h.liveProfile={id:'second'};finish({data:[{period_start:'2026-10-01',status:'submitted'}]});await request;assert.equal(host.innerHTML,'current account');
 const u=source('src/shared/ui/table-search-and-modals.js',{});assert.equal(u.escapeHtml(0),'0');assert.equal(u.escapeHtml(false),'false');assert.equal(u.escapeHtml(null),'');assert.equal(u.escapeHtml('<"&>'),'&lt;&quot;&amp;&gt;');
 console.log('PASS retired recipe endpoint absent; stale history discarded; zero and false remain visible');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 const c=source('src/core/rendering/prepared-workspace14364.js',{liveProfile:{id:'a'},document:{readyState:'loading',querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null},addEventListener(){},setTimeout});
 await c.workspaceViews14364.build(false);c.liveProfile={id:'b'};await c.workspaceViews14364.build(false);assert.equal(c.workspaceViews14364.state().owner,'b','empty build must release pending state');
 let finish;const node={id:'entry-submissions',classList:{add(){},remove(){}}};c.document.getElementById=()=>node;c.document.querySelectorAll=selector=>selector==='.tab-content[id]'?[node]:[];c.renderEntrySubmissions=()=>new Promise(r=>finish=r);const building=c.workspaceViews14364.build(false);await Promise.resolve();c.liveProfile={id:'c'};finish();await assert.rejects(building,/Account changed/);assert.equal(c.workspaceViews14364.preparing,false);assert.deepEqual(Array.from(c.workspaceViews14364.state().prepared),[]);
 console.log('PASS empty screen build releases its promise; account change during asynchronous rendering rejects stale preparation');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{let calls=0;const c=source('src/subusers/workspace/workspace-request-v138.js',{URL,Request,Response,Headers,DOMException,location:{href:'https://app.example/'},OJM_SUPABASE_URL:'https://db.example',fetch:async()=>{calls++;return new Response('{}')}});c.workspaceRequest138.target='workspace';const denied=await c.fetch(new Request('https://db.example/auth/v1/user',{method:'PUT',body:'{}'}));assert.equal(denied.status,403);assert.equal(calls,0);await c.fetch(new Request('https://db.example/auth/v1/user'));assert.equal(calls,1);console.log('PASS restricted workspace honors Request methods and preserves permitted session reads');})().catch(e=>{console.error(e);process.exitCode=1});
{
 const c=source('src/shared/formatting/numbers.js',{ApplicationSettings:{accounting:{decimalPlaces:'invalid'},system:{numberFormat:'1,234.56'}}});assert.equal(c.appDecimalPlaces(),2);assert.equal(c.formatAppNumber(1234.5),'1,234.50');c.ApplicationSettings.accounting.decimalPlaces=Infinity;assert.equal(c.appDecimalPlaces(),2);c.ApplicationSettings.accounting.decimalPlaces=4;assert.equal(c.formatAppNumber(1),'1.0000');
 const j=source('src/bookkeeping/journal/journal-store.js',{});assert.equal(vm.runInContext('JournalModule.entries.length',j),0);console.log('PASS invalid precision cannot break formatting; initial journal contains no sample financial data');
}
{
 let saved,fail=false;const form={dataset:{settingsGroup:'printing'},elements:[{name:'paperSize',value:'A4',type:'select-one'},{name:'orientation',value:'portrait',type:'radio',checked:true},{name:'orientation',value:'landscape',type:'radio',checked:false}]};
 const c=source('src/settings/application/settings-forms.js',{ApplicationSettings:{printing:{customHeader:'retained',paperSize:'Letter'}},APP_SETTINGS_KEY:'settings',document:{querySelector:()=>null},localStorage:{setItem:(k,v)=>{if(fail)throw Error('Quota exceeded');saved=JSON.parse(v)}},showAppNotification(){}});
 c.saveSettingsGroup({preventDefault(){},currentTarget:form});assert.equal(saved.printing.customHeader,'retained');assert.equal(saved.printing.orientation,'portrait');assert.equal(c.ApplicationSettings.printing.paperSize,'A4');fail=true;form.elements[0].value='Legal';c.saveSettingsGroup({preventDefault(){},currentTarget:form});assert.equal(c.ApplicationSettings.printing.paperSize,'A4');console.log('PASS settings preserve absent fields, respect radio selections and retain state on storage failure');
}
{
 const c=source('src/subusers/workspace/responsive/home.js',{workspaceRules:()=>({fundIds:['a','b']}),draftLines:()=>[],journalRows:()=>[],adjustmentRequests:[],AccountingStore:{accounts:[{id:'a',currency:'LAK'},{id:'b',currency:'USD'}]},remaining:(u,id)=>id==='a'?100:2,number:String,escapeHtml:String,icon:()=>'',totalsTable:()=>''});
 const html=c.dashboard({id:'user'});assert.ok(html.includes('100 LAK · 2 USD'));assert.ok(!html.includes('102 LAK'));console.log('PASS legacy workspace keeps unlike currencies separate');
}
(async()=>{
 const c=source('src/shared/ui/action-feedback14296.js',{document:{readyState:'loading',addEventListener(){}}});let calls=[];const service={saveWork82:async(kind,value)=>{calls.push(value);await Promise.resolve();return value},runAction82:async fn=>fn()};
 c.actionFeedback14296.wrap(service,'saveWork82','Saving');c.actionFeedback14296.wrap(service,'runAction82','Saving');const results=await Promise.all([service.saveWork82('employees','first'),service.saveWork82('employees','second')]);assert.deepEqual(results,['first','second']);assert.deepEqual(calls,['first','second']);assert.deepEqual(await Promise.all([service.runAction82(async()=>1),service.runAction82(async()=>2)]),[1,2]);console.log('PASS feedback never coalesces independent shared record saves');
})().catch(e=>{console.error(e);process.exitCode=1});

{
 const c=source('src/shared/formatting/numbers.js',{ApplicationSettings:{system:{numberFormat:'1.234,56'},accounting:{decimalPlaces:2}},Reports79:{mode:'yearly',year:2026},switchTab(){},formatAppDate:String,re79:String,reportModel79:()=>[{currency:'EUR',values:[['ASSET','Cash','1.234,50'],['ASSET','Bank','2.345,25']],metrics:[]}],reportContent79(){},reportTable79(){}});
 let captured=[];c.money69=n=>c.formatAppNumber(n/100);source('src/reports/financial/reports-v118.js',c);c.reportTable79=(headers,rows)=>{captured.push(rows);return ''};c.reportContent79('bs');assert.equal(captured[0].at(-1)[1],'3.579,75');
 c.ApplicationSettings.system.numberFormat='1 234,56';c.reportModel79=()=>[{currency:'EUR',headers:['Classification','Account','Period'],values:[['ASSET','Cash','1 234,50'],['ASSET','Bank','2 345,25']],metrics:[]}];captured=[];c.reportContent79('bs');assert.equal(captured[0].at(-1)[1],'3\u202f579,75');console.log('PASS balance-sheet subtotals honor German and French amount formats');
}
{
 const c=source('src/maintenance/audit/audit-engine14232.js',{crypto:require('node:crypto').webcrypto,backupValidation1441:{validate(){} }}),E=c.auditEngine14232;
 const state=E.create({tables:{accounts:[{id:'a',currency_code:'LAK'},{id:'b',currency_code:'LAK'}],journal_entries:[{id:'old',entry_no:'AUDIT-9'}],journal_lines:[]}});
 const data=()=>({date:'2026-10-14',memo:'Adjustment',lines:[{account_id:'a',debit:1},{account_id:'b',credit:1}]});const patch=E.adjustment(state,data());assert.equal(patch[0].after.entry_no,'AUDIT-10');E.apply(state,patch,false);const restored=E.create(JSON.parse(JSON.stringify(state)));assert.equal(E.adjustment(restored,data())[0].after.entry_no,'AUDIT-11');console.log('PASS audit adjustment sequence survives undo and reload without reusing an ID');
}

{const c=source('src/shared/state/accounting-store.js',{});assert.equal(vm.runInContext('AccountingStore.accounts.length+AccountingStore.subAccounts.length',c),0);console.log('PASS initial account store contains no sample business accounts');}
(async()=>{
 const state={owner:'first',epoch:1};const c=source('src/subusers/phone/runtime/storage-and-transport.js',{S:state,fail:(message,code)=>Object.assign(Error(message),{code}),current:(owner,epoch)=>state.owner===owner&&state.epoch===epoch});
 c.http=async()=>{state.owner='second';state.epoch++;return {data:[{id:'first-record'}],count:1}};
 await assert.rejects(c.paged('records',{}),e=>e.code==='ACCOUNT_CHANGED');console.log('PASS phone pagination rejects an account change before returning downloaded rows');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 const values=new Map(),storage={get length(){return values.size},key:i=>[...values.keys()][i],getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};let calls=0;
 const c=source('src/shared/ui/save-notices14234.js',{liveProfile:{id:'actor'},access113:{can:()=>true},location:{origin:'https://test.example'},escapeHtml:String,localStorage:storage,sessionStorage:{length:0,getItem:()=>null,removeItem(){}},document:{getElementById:()=>null},addEventListener(){},dispatchEvent(){},Event,ojmDb:{rpc(){calls++;if(calls===1)throw Error('Client unavailable');return Promise.resolve({data:{line_ids:['line']},error:null})}}});
 const payload={p_owner:'owner',p_key:'same-request',p_items:[{}]};assert.ok((await c.saveNotices14234.saveStaff(payload)).error);assert.equal((await c.saveNotices14234.saveStaff(payload)).error,null);assert.equal(calls,2);console.log('PASS synchronous save failure releases its in-flight slot for an identical retry');
})().catch(e=>{console.error(e);process.exitCode=1});
{
 const c=source('src/maintenance/archive/archive-scopes14232.js',{}),pack={tables:{entry_submissions:[{id:'before',created_at:'2026-01-01'},{id:'inside',created_at:'2026-05-01'},{id:'after',created_at:'2026-10-01'}]}};
 const ids=range=>Array.from(c.archiveScopes14232.select(pack,['submissions'],range).tables.entry_submissions,r=>r.id);
 assert.deepEqual(ids({p_from:'2026-04-01'}),['inside','after']);assert.deepEqual(ids({p_to:'2026-06-01'}),['before','inside']);assert.deepEqual(ids({p_from:'2026-04-01',p_to:'2026-06-01'}),['inside']);console.log('PASS archive selection respects either date bound independently');
}
(async()=>{
 const pending=[];const db={from(){const q={};for(const key of ['select','eq','order'])q[key]=()=>q;q.maybeSingle=()=>new Promise(resolve=>pending.push(resolve));return q}};
 const c=source('src/subusers/entries/staff-journal.js',{liveProfile:{id:'actor'},ojmDb:db});let renders=0;c.renderStaffJournal=()=>renders++;
 const first=c.openStaffJournalPeriod('2026-09'),second=c.openStaffJournalPeriod('2026-10');pending[1]({data:null});await second;pending[0]({data:{id:'older'}});await first;assert.equal(renders,1);assert.equal(vm.runInContext('activeStaffJournal',c),null);assert.equal(vm.runInContext('activeStaffJournalLines.length',c),0);
 const stale=c.openStaffJournalPeriod('2026-08');c.liveProfile={id:'other'};pending[2]({data:{id:'private'}});await stale;assert.equal(renders,1);console.log('PASS staff period loading rejects stale months/accounts and retains a real empty state');
})().catch(e=>{console.error(e);process.exitCode=1});
{
 const c=source('src/bookkeeping/recurring/obligations.js',{switchTab(){}});
 for(const [start,frequency,end] of [['2026-01-31','Monthly','2026-02-28'],['2024-02-29','Yearly','2025-02-28'],['2026-12-28','Weekly','2027-01-04']]){const item={nextDate:start,frequency};c.advanceRecurringDate(item);assert.equal(item.nextDate,end)}console.log('PASS recurring due dates retain their calendar day and clamp month-end without timezone drift');
}
{
 const c=source('src/maintenance/workspace/maintenance-engine14324.js',{}),pack={tables:{journal_entries:[{id:'j',status:'posted',transaction_date:'2026-01-01'}],journal_lines:[{id:'good',journal_entry_id:'j',currency_code:'LAK',debit:'90071992547400',credit:0},{id:'overflow',journal_entry_id:'j',currency_code:'LAK',debit:1000,credit:0}]}};
 const r=c.maintenanceEngine14324.trial(pack,'2026-01');assert.equal(r.issues.length,1);assert.equal(r.totals[0].debit,90071992547400);console.log('PASS maintenance trial rejects overflow without corrupting accumulated totals');
}
(async()=>{
 let release,writes=0,payload,stored;
 const db={from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:structuredClone(stored)}),update:p=>{payload=p;return q},then:resolve=>new Promise(r=>release=r).then(resolve)};return q}};
 const c=source('src/settings/application/settings-store.js',{structuredClone,liveProfile:{id:'first',role:'admin'},ojmDb:db,OJM_SUPABASE_URL:'fixture',localStorage:{getItem:()=>null,setItem(){writes++}},payrollConfig82(){},setSettingsFormValues(){}});
 stored={id:true,version:1,data:vm.runInContext('structuredClone({payroll:ApplicationSettings.payroll,tax:ApplicationSettings.tax})',c)};stored.data.payroll.attendanceLegend95=['original'];
 await vm.runInContext('payrollTaxSettings.load()',c);const before=writes;
 const save=()=>vm.runInContext("payrollTaxSettings.save('payroll',{attendanceLegend95:['saved legend']})",c);
 const rejected=save();await Promise.resolve();release({error:{message:'Offline'}});await assert.rejects(rejected,/not saved/);assert.equal(writes,before);assert.equal(vm.runInContext("ApplicationSettings.payroll.attendanceLegend95[0]",c),'original');
 const stale=save();c.liveProfile={id:'second',role:'admin'};await Promise.resolve();release({data:[structuredClone(payload)]});await assert.rejects(stale,/Account changed/);assert.equal(writes,before);
 await vm.runInContext('payrollTaxSettings.load()',c);const confirmedBefore=writes,accepted=save();await Promise.resolve();release({data:[structuredClone(payload)]});assert.equal(await accepted,true);assert.equal(writes,confirmedBefore+2);assert.equal(vm.runInContext("ApplicationSettings.payroll.attendanceLegend95[0]",c),'saved legend');
 console.log('PASS central payroll settings retain failed drafts, reject stale accounts, and cache only confirmed saves');
})().catch(e=>{console.error(e);process.exitCode=1});

{
 const c=source('src/bridges/payroll-bookkeeping/payroll-template1431.js',{AccountingStore:{accounts:[{id:'inactive',currency:'LAK',isPosting:true,active:false},{id:'active',currency:'LAK',isPosting:true}]}});
 const run={status:'finalized',rows:[{employeeId:'e',employee:{name:'Employee'}}],results:[{employeeId:'e',currency:'LAK',gross:10}],reference:'Run'};const template=id=>({lines:[{account:id,side:'DR',basis:'gross',scope:'total'}]});assert.equal(c.payrollTemplate1431.eligible().length,1);assert(c.payrollTemplate1431.evaluate(run,template('inactive')).issues.some(x=>x.includes('Choose')));run.results[0].gross=Number.MAX_VALUE;assert(c.payrollTemplate1431.evaluate(run,template('active')).issues.some(x=>x.includes('supported range')));console.log('PASS payroll templates reject inactive accounts and overflowing calculated amounts');
}
(async()=>{
 const pending=[];const c=source('src/subusers/workspace/organization14229.js',{liveProfile:{id:'first'},access113:{can:()=>true},escapeHtml:String,document:{readyState:'loading',addEventListener(){}},ojmDb:{rpc:()=>new Promise(resolve=>pending.push(resolve))}});
 const first=c.Organization14229.loadHome();c.liveProfile={id:'second'};const second=c.Organization14229.loadHome();assert.equal(pending.length,2);pending[1]({data:{users:[{id:'second'}],balances:{}}});await second;pending[0]({data:{users:[{id:'first'}],balances:{}}});await first;assert.equal(c.Organization14229.homeUsers()[0].id,'second');await c.Organization14229.loadHome();assert.equal(pending.length,2);
 const code=fs.readFileSync('src/subusers/workspace/organization14229.js','utf8'),start=code.indexOf('function reviewArgument('),end=code.indexOf('\nfunction reviewDecoration',start);vm.runInContext(code.slice(start,end),c);
 for(const id of ['journal-id','quote" and slash\\'])assert.equal(c.reviewArgument('prepareReviewJournal('+JSON.stringify(id)+')','prepareReviewJournal'),id);assert.equal(c.reviewArgument("postCompared69('legacy-id')",'postCompared69'),'legacy-id');assert.equal(c.reviewArgument('other("id")','postCompared69'),'');console.log('PASS branch cache isolates overlapping accounts and review controls parse both legacy and escaped IDs');
})().catch(e=>{console.error(e);process.exitCode=1});
{
 const c=source('src/maintenance/archive/archive-xlsx-v129.js',{backupValidation1441:{validate(){}}}),row={id:'unicode',notes:''};const prefix=JSON.stringify(row).indexOf('"notes":"')+9;row.notes='x'.repeat(29999-prefix)+'😀 retained';
 const pack={from:'2026-01-01',to:'2026-12-31',tables:{accounts:[{id:'a',name:'Cash'}],journal_entries:[{id:'j',status:'posted',transaction_date:'2026-01-01'}],journal_lines:[{id:'line',journal_entry_id:'j',account_id:'a',line_date:'2026-02-03',currency_code:'USD',debit:12,credit:0}],staff_journal_lines:[{id:'void',status:'voided',amount:99}],documents:[row]}};
 const sheets=c.archiveXlsx129.buildData(pack),parts=sheets.find(s=>s.name==='Source Records').rows.filter(r=>r[0]==='documents').map(r=>r[3]);assert.equal(parts.join(''),JSON.stringify(row));assert(parts.every(p=>!/[\uD800-\uDBFF]$/.test(p)&&! /^[\uDC00-\uDFFF]/.test(p)));assert.equal(sheets.find(s=>s.name==='Sub-user Activity').rows.length,0);assert.equal(sheets.find(s=>s.name==='Journal').rows[0][0],(Date.parse('2026-02-03')-Date.UTC(1899,11,30))/86400000);assert.equal(sheets.find(s=>s.name==='Trial Balance').rows[0][5].cache,12);console.log('PASS archive keeps line dates, excludes voided activity, preserves Unicode source parts and cached totals');
}
(async()=>{
 let finish;const original={month:'2026-10',status:'draft',rows:[{input:{attendance:[]}}]},c=source('src/bridges/hr-payroll/save-attendance14306.js',{structuredClone,admin:()=>true,hrCalendar14306:{guard(){}},Work82:{run:original},ApplicationSettings:{payroll:{}},liveProfile:{id:'first'},ojmDb:{},saveWork82:()=>new Promise(r=>finish=r),showCenterStatus(){},renderWork82(){throw Error('Stale save must not redraw')},payroll95:{draftState1427(){throw Error('Stale save must not replace drafts')}}});
 const first=c.saveAttendance();c.Work82.run={...original,month:'2026-11'};finish({id:'saved',data:original});await first;assert.equal(c.Work82.run.month,'2026-11');
 c.Work82.run=original;const second=c.saveAttendance();original.rows[0].input.note='Newer edit';finish({id:'saved',data:{...original,rows:[]}});await second;assert.equal(c.Work82.run.rows[0].input.note,'Newer edit');assert.equal(c.Work82.runRecord.id,'saved');console.log('PASS attendance save preserves a newly selected month and edits entered while saving');
})().catch(e=>{console.error(e);process.exitCode=1});
{
 const code=fs.readFileSync('src/documents/editor/document-editor-v105.js','utf8'),start=code.indexOf('function sameHistoryState14370('),end=code.indexOf('\nfunction checkpoint',start),c={};vm.createContext(c);vm.runInContext(code.slice(start,end),c);
 const state={title:'Voucher',voucher14299:{items:[{amount:10}]},settings:{size:10}},copy=structuredClone(state);copy._caret1428={start:8};assert(c.sameHistoryState14370(state,copy));copy.voucher14299.items[0].amount=12;assert(!c.sameHistoryState14370(state,copy));delete copy.voucher14299;assert(!c.sameHistoryState14370(state,copy));console.log('PASS document undo compares nested content and ignores cursor-only changes');
}

(async()=>{
 for(const failed of [false,true]){
  let finish,writes=0,removals=0;const values=new Map();const storage={get length(){return values.size},key:i=>[...values.keys()][i],getItem:k=>values.get(k)||null,setItem:(k,v)=>{writes++;values.set(k,String(v))},removeItem:k=>{removals++;values.delete(k)}};
  const c=source('src/shared/ui/save-notices14234.js',{liveProfile:{id:'first'},access113:{can:()=>true},location:{origin:'https://test.example'},escapeHtml:String,localStorage:storage,sessionStorage:{length:0,getItem:()=>null,removeItem(){}},document:{getElementById:()=>null},addEventListener(){},dispatchEvent(){},Event,ojmDb:{rpc:()=>new Promise(r=>finish=r)}});
  const saving=c.saveNotices14234.saveStaff({p_owner:'owner',p_key:'request',p_items:[{}]});await Promise.resolve();const before=writes;c.liveProfile={id:'second'};finish(failed?{error:{message:'Interrupted'}}:{error:null,data:{line_ids:['line']}});await saving;
  assert.equal(writes,before,'stale failure must not write into the new account vault');assert.equal(removals,0,'stale success must not remove from the new account vault');assert.equal(values.size,1,'original request remains recoverable');
 }
 console.log('PASS account switches preserve pending requests without writing into another account vault');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{let finish,writes=0;const c=source('src/core/auth/account-security14257.js',{document:{readyState:'loading',addEventListener(){}},deviceVault14334:{unlocked:true,actor:'first'},offline14239:{offline:()=>false},ojmDb:{rpc:()=>new Promise(r=>finish=r)},localStorage:{setItem(){writes++}}});const pending=c.accountSecurity14257.status();c.deviceVault14334.actor='second';finish({data:{required:false}});await assert.rejects(pending,/Account changed/);assert.equal(writes,0);console.log('PASS password-status completion cannot write into another account device cache');})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 const code=fs.readFileSync('src/core/auth/device-vault14334.js','utf8'),start=code.indexOf('  function logicalKeys('),end=code.indexOf('\n  Object.defineProperty(window, "localStorage"',start);let scans=0;
 const values=new Map(Array.from({length:100},(_,i)=>['a:0:k'+i,JSON.stringify(i)]));const raw={get length(){return values.size},key(i){scans++;return [...values.keys()][i]??null},getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const c={actor:'a',secret:{},ephemeral:[new Map(),new Map()],raw,queueMicrotask,requireKey(){},openWith:(k,v)=>v,sealWith:(k,v)=>v};c.physical=(kind,key)=>c.actor+':'+kind+':'+key;vm.createContext(c);vm.runInContext(code.slice(start,end)+';storage=adapter(raw,0)',c);
 for(let i=0;i<c.storage.length;i++)assert.equal(c.storage.key(i),'k'+i);assert.equal(scans,100,'enumeration scans raw storage once, not once per key');
 assert.equal(Object.keys(c.storage).length,100);assert.equal(scans,100,'property descriptors reuse the same snapshot');c.storage.setItem('new','1');assert.equal(c.storage.length,101);c.storage.removeItem('new');assert.equal(c.storage.length,100);
 c.actor='b';assert.equal(c.storage.length,0);c.actor='a';assert.equal(c.storage.length,100);await Promise.resolve();const before=scans;assert.equal(c.storage.length,100);assert.equal(scans,before+100,'snapshot expires at the microtask boundary');
 console.log('PASS vault key enumeration scans once per synchronous pass and invalidates on writes/account changes');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 for(const [file,name,args]of [['src/core/sync/year-window14333.js','yearWindow14333',[]],['src/core/sync/payroll-window14334.js','payrollWindow14334',['2026-01-01','2026-12-31']]]){
  let finish;const c=source(file,{liveProfile:{id:'same-user'},ojmDb:{rpc:()=>new Promise(r=>finish=r)},Work82:{},AccountingStore:{accounts:[]},structuredClone,document:{readyState:'loading',addEventListener(){}}});const first=c[name].read(...args);c.ojmDb={rpc:async()=>({data:{rows:[],opening:[],carry:[],index:[],revision:'new-project'}})};finish({error:{code:'PGRST202'}});await assert.rejects(first,/changed/);assert.deepEqual(Array.from(await c[name].read(...args)),[],'stale missing-function response cannot disable the new project loader');
  c.ojmDb={rpc:()=>new Promise(r=>finish=r)};const second=c[name].read(...args);c[name].reset();finish({data:{rows:[],opening:[],carry:[],index:[],revision:'old'}});await assert.rejects(second,/changed/);
 }
 console.log('PASS journal/payroll windows reject replaced clients and reset generations before applying data or missing-function flags');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 let confirm,reads=0;const data={kind:'finance',mode:'request',lines:[],movements:[],conversions:[]},c=source('src/bridges/subusers-bookkeeping/budget-workflow14316.js',{structuredClone,liveProfile:{id:'a',role:'admin'},access113:{can:()=>true},Finance82:structuredClone(data),Work82:{reports:[]},document:{getElementById:()=>null,querySelector:()=>null},addEventListener(){},switchTab(){},today82:()=> '2026-10-14',showCenterStatus(){},ui117:{confirm:()=>new Promise(r=>confirm=r)},ojmDb:{from(){reads++;return {select(){return this},eq(){return this},single:async()=>({data:{id:'request-a',version:1,data:structuredClone(data)}})}}}});
 await c.budgetWorkflow14316.startAllocation('request-a');assert.equal(reads,1);const pending=c.budgetWorkflow14316.startAllocation('request-b');c.liveProfile={id:'b',role:'admin'};confirm(true);await pending;assert.equal(reads,1,'confirmed action from the previous account must not issue a new read');
 c.Finance82.conversions=[{amount:10}];const item=c.Finance82.conversions[0],deleting=c.budgetWorkflow14316.removeConversion(0);c.Finance82.conversions=[{amount:20}];confirm(true);await deleting;assert.equal(c.Finance82.conversions[0].amount,20);assert.equal(item.amount,10);console.log('PASS budget confirmations retain their account and selected conversion list');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 const code=fs.readFileSync('src/maintenance/backup/data-tools14232.js','utf8').split('\n').find(l=>l.startsWith('async function resetPrepare('));let next=0,downloads=[];const nodes=new Map();const c={resetGeneration:0,resetPack:null,resetHash:'',resetOwner:'',liveProfile:{id:'admin'},ojmDb:{},admin:()=>true,scopeIDs:()=>['journals'],status(){},label:String,$:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id)},resetInvalidate(){c.resetGeneration++;c.resetPack=null;c.resetHash=''},rpc:async name=>name==='scoped_reset_backup14232'?{id:++next}:{counts:{},total:0,preserved:[]},download:(name,p)=>new Promise(resolve=>downloads.push({p,resolve})),digest:async blob=>blob.hash};vm.createContext(c);vm.runInContext(code,c);
 const first=c.resetPrepare();for(let i=0;i<20&&downloads.length<1;i++)await Promise.resolve();assert.equal(downloads.length,1);const second=c.resetPrepare();for(let i=0;i<20&&downloads.length<2;i++)await Promise.resolve();assert.equal(downloads.length,2);downloads[1].resolve({hash:'second'});await second;downloads[0].resolve({hash:'first'});await first;assert.equal(c.resetHash,'second');assert.equal(c.resetPack.id,2);console.log('PASS older reset-backup hashing cannot replace the latest prepared backup or hash');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 let finish,opened=0;const c=source('src/documents/import-export/export-center14337.js',{liveProfile:{id:'a'},ojmDb:{},document:{querySelector:()=>null},addEventListener(){},fetch:()=>new Promise(r=>finish=r),showCenterStatus(){},openDocumentEditor105:()=>opened++,access113:{can:()=>true}});const pending=c.exportCenter14337.fromLink({href:'blob:fixture',download:'data.json'});c.ojmDb={};finish({ok:true,blob:async()=>({})});assert.equal(await pending,false);assert.equal(opened,0);const failed=c.exportCenter14337.fromLink({href:'blob:fixture',download:'data.json'});finish({ok:false});assert.equal(await failed,false);console.log('PASS export delivery reports failure and rejects stale database-client responses');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 let resolve,loads=0,calls=0;const first={rpc(){calls++;return new Promise(r=>resolve=r)}},state={todoLoadedOwner14335:'a',todos:[]};
 const c=source('src/bookkeeping/recurring/todos1438.js',{liveProfile:{id:'a'},ojmDb:first,workflow136:{state,loadTodos:async()=>{loads++}},access113:{can:()=>true},document:{readyState:'loading',getElementById:()=>null},addEventListener(){}});
 const pending=c.todos1438.prepareStarters();resolve({error:{message:'temporary'}});await pending;await c.todos1438.prepareStarters();assert.equal(calls,1,'failure render cannot create a retry loop');
 const retry=c.todos1438.prepareStarters(true);assert.equal(calls,2);resolve({data:true});await retry;assert.equal(loads,1);await c.todos1438.prepareStarters();assert.equal(calls,2);
 c.ojmDb={rpc(){calls++;return new Promise(r=>resolve=r)}};const stale=c.todos1438.prepareStarters();const staleResolve=resolve;c.ojmDb={rpc:async()=>{calls++;return {data:true}}};await c.todos1438.prepareStarters();staleResolve({data:true});await stale;assert.equal(loads,2,'old client cannot reload current tasks');assert.equal(calls,4);
 console.log('PASS starter task retry is bounded, reconnect can retry, and replaced clients discard stale completion');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 const events=[],dialog={open:false,returnValue:'',onclose:null,close(){if(!this.open)return;this.open=false;events.push(()=>this.onclose?.())},showModal(){this.open=true}},body={},buttons={},nodes={dialog,dialogBody:body,dialogButtons:buttons,dialogReason:{value:' kept reason '}};
 const c=source('src/subusers/phone/runtime/navigation-and-dialogs.js',{$:id=>nodes[id],esc:String});
 const first=c.confirmDialog('First','First'),second=c.confirmDialog('Second','Second','Continue',true);assert.equal(await first,false);events.shift()();assert.equal(dialog.open,true,'queued close event must not settle the replacement');let settled=false;second.then(()=>settled=true);await Promise.resolve();assert.equal(settled,false);dialog.returnValue='yes';dialog.close();events.shift()();assert.equal(await second,'kept reason');assert.equal(dialog.onclose,null);console.log('PASS replacing phone dialogs cancels the old promise and ignores its queued close event');
})().catch(e=>{console.error(e);process.exitCode=1});
{
 const c=source('src/maintenance/archive/archive-xlsx-v129.js',{backupValidation1441:{validate(){}}});const sheets=c.archiveXlsx129.buildData({tables:{tax_sso_records:[{paid_at:'2026-10-14T12:30:00+00:00'},{paid_at:'2026-02-30'},{paid_at:'bad'}],fund_adjustment_requests:[{id:'a'},{id:'b'}],fund_adjustment_lines:[{request_id:'a'},{request_id:'a'}]}});
 const taxes=sheets.find(s=>s.name==='Tax and SSO');assert.equal(taxes.rows[0][7],(Date.UTC(2026,9,14)-Date.UTC(1899,11,30))/86400000);assert.equal(taxes.rows[1][7],null);assert.equal(taxes.rows[2][7],null);assert.deepEqual(Array.from(sheets.find(s=>s.name==='Fund Adjustments').rows,r=>r[7]),[2,0]);console.log('PASS archive paid timestamps retain dates, invalid dates stay blank, and grouped adjustment counts are exact');
}
(async()=>{
 let writes=0,notices=0;const c=source('src/subusers/entries/staff-journal.js',{ojmDb:{from(){writes++;throw Error('Legacy table mutation forbidden')},rpc(){writes++;throw Error('Legacy submit forbidden')}},showAppNotification:()=>notices++});await vm.runInContext("activeStaffJournal={id:'saved'};activeStaffJournalLines=[{id:'keep',amount:12}]",c);assert.equal(await c.saveStaffJournalDraft(),false);await c.submitStaffJournal();assert.equal(writes,0);assert.equal(vm.runInContext('activeStaffJournalLines[0].id',c),'keep');assert.equal(notices,2);console.log('PASS retired staff form preserves saved rows and drafts without non-atomic replacement or submission');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 const stored='{"accounting":{"__proto__":{"polluted":true},"journalDigits":"6"},"system":[]}',storage={getItem:()=>stored,setItem(){throw Error('Storage full')}};
 const c=source('src/settings/application/settings-store.js',{localStorage:storage});assert.equal(vm.runInContext('ApplicationSettings.accounting.polluted',c),undefined);assert.equal(vm.runInContext('ApplicationSettings.accounting.journalDigits',c),'6');assert.equal(vm.runInContext('ApplicationSettings.system.dateFormat',c),'DD/MM/YYYY');
 const status={},event={target:{value:'file',files:[{size:100,text:async()=>'{"settings":{"accounting":{"journalDigits":"9"}}}'}]}};Object.assign(c,{liveProfile:{id:'a'},ojmDb:{},document:{getElementById:()=>status},showCenterStatus(){}});source('src/maintenance/backup/browser-backup.js',c);await c.importApplicationBackup(event);assert.equal(vm.runInContext('ApplicationSettings.accounting.journalDigits',c),'6');assert.equal(status.textContent,'Storage full');assert.equal(event.target.value,'');console.log('PASS settings reject prototype pollution and preserve live settings when persistence fails');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 let finish;const first={rpc:()=>new Promise(r=>finish=r)},c=source('src/settings/installation/installation14320.js',{liveProfile:{id:'a',role:'admin',status:'active'},ojmDb:first,addEventListener(){}});
 const old=c.installation14320.load();await Promise.resolve();c.ojmDb={rpc:async()=>({data:{installation:{instance:'second'}}})};const next=await c.installation14320.load();assert.equal(next.installation.instance,'second');finish({data:{installation:{instance:'first'}}});await assert.rejects(old,/Connection changed/);console.log('PASS installation requests isolate replacement clients and reject stale results');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 const code=fs.readFileSync('src/bridges/subusers-bookkeeping/budget-workflow14316.js','utf8').split('\n').find(l=>l.startsWith('async function saveAllocation('));let confirm;const controls=[{disabled:false},{disabled:true}],c={context:()=>()=>{},allocationRecord:null,allocationRequest14370:1,busy:false,form82:()=>true,capture(){},clone:structuredClone,Finance82:{lines:[],movements:[]},validateAllocation(){},document:{getElementById:()=>({querySelectorAll:()=>controls})},ui117:{confirm:()=>new Promise(r=>confirm=r)},showCenterStatus(){}};vm.createContext(c);vm.runInContext(code,c);const pending=c.saveAllocation(true);assert(controls.every(n=>n.disabled));confirm(false);await pending;assert.deepEqual(controls.map(n=>n.disabled),[false,true]);assert.equal(c.busy,false);console.log('PASS allocation save locks its snapshot controls and restores original disabled states on cancellation');
})().catch(e=>{console.error(e);process.exitCode=1});
{
 const c=source('src/maintenance/audit/audit-engine14232.js',{crypto:require('node:crypto').webcrypto,backupValidation1441:{validate(){}}}),E=c.auditEngine14232,a={owner_id:'a',id:'same',password:'old-a'},b={owner_id:'b',id:'same',password:'old-b'},state=E.create({tables:{document_download_passwords14312:[a,b],voucher_sequences14299:[{year_no:2026,kind:'H',next_no:4}]}});
 E.edit(state,'document_download_passwords14312',E.key(b,'document_download_passwords14312'),{...b,password:'new-b'});assert.equal(state.working.tables.document_download_passwords14312[0].password,'old-a');assert.equal(E.changedRows(state.original,state.working).length,1);
 const row=state.working.tables.voucher_sequences14299[0];E.edit(state,'voucher_sequences14299',E.key(row,'voucher_sequences14299'),{...row,next_no:5});assert.equal(state.working.tables.voucher_sequences14299.length,1);assert.equal(E.changedRows(state.original,state.working).length,2);console.log('PASS local audit edits use composite identities and preserve neighboring records');
}

(async()=>{
 let installed,release,posted=false,clears=0,storedDraft;
 const nodes={jeGeneralMemo:{value:'Payroll [Payroll:run]'},jeTransDate:{value:'2026-10-01'},jeMultipleDates:{checked:false},btnPostJournal:{dataset:{},textContent:''}};
 const record={id:'run',data:{month:'2026-10',status:'finalized',reference:'PAY',rows:[],journalLink1429:null}};
 const values=new Map([['ojm_prepared_payroll1429_a',JSON.stringify({id:'run',owner:'a',reference:'PAY'})]]);
 const c={liveProfile:{id:'a'},Work82:{run:structuredClone(record.data),runRecord:record,runs:[record]},JournalModule:{entries:[],editingEntryId:null},pendingWorkspacePostJournalId:null,pendingWorkspacePostOwnerId:null,PeriodReview:{pendingAdjustment:null,periods:{},status:()=> 'open'},ApplicationSettings:{accounting:{}},structuredClone,crypto:require('node:crypto').webcrypto,document:{readyState:'loading',body:{},getElementById:id=>nodes[id]||null},addEventListener:(name,fn)=>{if(name==='DOMContentLoaded')installed=fn},MutationObserver:class{observe(){}},requestAnimationFrame(){},sessionStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},snapshotJournal69:()=>({rows:[{memo:nodes.jeGeneralMemo.value}]}),admin82:()=>true,collectLiveJournalGroups:()=>({errors:[],differences:[],grouped:{'2026-10-01':{lines:[{account:{id:'cash'},currency:'USD',debit:1},{account:{id:'salary'},currency:'USD',credit:1}]}}}),getMultiDateJournalState:()=>({errors:[]}),saveWork82:async(_,data)=>({id:'run',data}),payroll95:{draftState1427:()=>({drafts:{'2026-10':{run:c.Work82.run,record}}}),restoreDraftState1427:s=>storedDraft=s},clearJournalEntry:()=>clears++,submitJournalEntry(){},loadJournalFromSupabase:async()=>{},showCenterStatus(){},businessInitials:()=> 'OJM'};
 c.ojmDb={from:table=>{const q={};for(const name of ['select','eq','ilike'])q[name]=()=>q;q.then=(yes,no)=>Promise.resolve({data:table==='payroll_runs'?[record]:posted?[{id:'posted',entry_no:'J1'}]:[]}).then(yes,no);return q},rpc:()=>new Promise(r=>release=()=>{posted=true;r({data:'posted'})})};
 source('src/bridges/payroll-bookkeeping/payroll-journal1429.js',c);installed();const pending=c.submitJournalEntry();for(let i=0;i<20&&!release;i++)await Promise.resolve();assert.ok(release,'posting reached RPC');nodes.jeGeneralMemo.value='New unfinished entry';c.Work82.run.notes='Typed during posting';release();await pending;assert.equal(clears,0,'new journal draft retained');assert.equal(c.Work82.run.notes,'Typed during posting');assert.equal(storedDraft.drafts['2026-10'].run.notes,'Typed during posting');assert.equal(c.Work82.run.journalLink1429.journalId,'posted');assert.equal(c.Work82.runRecord.data.journalLink1429.journalId,'posted');
 console.log('PASS payroll posting retains journal and payroll edits made during its request while confirming the saved link');
})().catch(e=>{console.error(e);process.exitCode=1});
(async()=>{
 let finish;const node={id:'entry-submissions',classList:{add(){},remove(){}}};
 const c=source('src/core/rendering/prepared-workspace14364.js',{liveProfile:{id:'a'},ojmDb:{},document:{readyState:'loading',querySelector:()=>null,querySelectorAll:s=>s==='.tab-content[id]'?[node]:[],getElementById:()=>node},renderEntrySubmissions:()=>new Promise(r=>finish=r),addEventListener(){},setTimeout});
 const pending=c.workspaceViews14364.build(false);await Promise.resolve();c.ojmDb={};finish();await assert.rejects(pending,/Account changed/);assert.deepEqual(Array.from(c.workspaceViews14364.state().prepared),[]);assert.equal(c.workspaceViews14364.preparing,false);
 console.log('PASS prepared screens reject completion from a replaced database client');
})().catch(e=>{console.error(e);process.exitCode=1});
