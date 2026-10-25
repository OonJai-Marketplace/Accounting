const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const name=path.join(root,req.url.split('?')[0]);if(req.url==='/fixture'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body>Test</body>');return;}try{res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(name))}catch{res.statusCode=404;res.end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});const context=await browser.newContext();const page=await context.newPage();
const fixture=async()=>{await page.goto('http://127.0.0.1:'+server.address().port+'/fixture');await page.evaluate(()=>{window.OJM_SUPABASE_URL='https://test.supabase.co';window.liveProfile={id:'actor-a',role:'admin',status:'active'};window.Work82={owner:'actor-a',runs:[],leaves:[],employees:[],reports:[],documents:[]};window.JournalModule={entries:[]};window.AccountingStore={accounts:[{id:'cash',name:'Cash',code:'100'},{id:'expense',name:'Expense',code:'200'}]};window.pendingPosts99=new Map();window.refreshAllTables=()=>{};window.loadWork82=async()=>{};window.renderWork82=()=>{};window.openDocumentEditor105=x=>x;window.loadLiveProfile=async()=>{};window.offline14239={changed(){},state:()=>({pending:1}),offline:()=>!navigator.onLine};window.remote=new Map();window.writeCount=0;window.loseReply=false;window.ojmDb={from(table){let operation='read',body,filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},maybeSingle(){return q},insert(p){operation='insert';body=p;return q},update(p){operation='update';body=p;return q},then(resolve,reject){return Promise.resolve().then(()=>{let row=remote.get(table+':'+(body?.id||filters.id));if(operation==='read')return {data:row||null,error:null};if(operation==='insert'&&row)return {data:null,error:{code:'23505',message:'duplicate'}};if(operation==='update'&&row?.version!==filters.version)return {data:[],error:null};row={...row,...body,id:body.id||filters.id};remote.set(table+':'+row.id,structuredClone(row));writeCount++;if(loseReply){loseReply=false;return {data:null,error:{code:'NETWORK_TIMEOUT',message:'Connection lost after commit'}}}return {data:[row],error:null}}).then(resolve,reject)}};return q}}});await page.addScriptTag({url:'/src/core/sync/local-first14333.js'});await page.evaluate(()=>localFirst14333.initialize());};
await fixture();
// Queue order must not depend on wall-clock precision or an adjusted device clock.
for(const mode of ['same-millisecond','clock-moved-backward']){
 const result=await page.evaluate(async mode=>{
  liveProfile.id=mode;Work82.owner=mode;Work82.employees=[];await localFirst14333.initialize();
  const first=await localFirst14333.saveWork('employees',{name:'First'},null,{data:{name:'First'},version:1});
  await localFirst14333.saveWork('employees',{name:'Updated'},first,{data:{name:'Updated'},version:2});
  await localFirst14333.edit(liveProfile.id,'outbox',rows=>rows.map((j,i)=>({...j,created:mode==='clock-moved-backward'&&i===1?'2026-10-24T00:00:00.000Z':'2026-10-25T00:00:00.000Z'})));
  const before=writeCount;await localFirst14333.sync();
  return {statuses:localFirst14333.state().jobs.map(j=>j.status),writes:writeCount-before,version:remote.get('payroll_employees:'+first.id)?.version};
 },mode);
 assert.deepEqual(result,{statuses:['synced','synced'],writes:2,version:2},mode+' must sync consecutive versions in saved order');
}
// A later payroll run cannot prevent an earlier run with the same timestamp from syncing.
const payroll=await page.evaluate(async()=>{
 liveProfile.id='payroll-order';Work82.owner=liveProfile.id;Work82.runs=[];await localFirst14333.initialize();
 for(let i=0;i<2;i++){const data={reference:'RUN-'+i};await localFirst14333.saveWork('runs',data,null,{data,version:1,period_start:'2026-10-01',period_end:'2026-10-31',status:'draft'});}
 await localFirst14333.edit(liveProfile.id,'outbox',rows=>rows.map(j=>({...j,created:'2026-10-25T00:00:00.000Z'})));
 const before=writeCount;await localFirst14333.sync();return {statuses:localFirst14333.state().jobs.map(j=>j.status),writes:writeCount-before};
});
assert.deepEqual(payroll,{statuses:['synced','synced'],writes:2});
// Failed earlier work still blocks its dependent version and payroll, never an independent employee.
const blocked=await page.evaluate(async()=>{
 liveProfile.id='blocked-parent';Work82.owner=liveProfile.id;Work82.runs=[];Work82.employees=[];await localFirst14333.initialize();
 const first=await localFirst14333.saveWork('employees',{name:'First'},null,{data:{name:'First'},version:1});
 await localFirst14333.saveWork('employees',{name:'Updated'},first,{data:{name:'Updated'},version:2});
 const data={reference:'DEPENDENT'};await localFirst14333.saveWork('runs',data,null,{data,version:1,period_start:'2026-10-01',period_end:'2026-10-31',status:'draft'});
 await localFirst14333.saveWork('employees',{name:'Independent'},null,{data:{name:'Independent'},version:1});
 await localFirst14333.edit(liveProfile.id,'outbox',rows=>rows.map((j,i)=>({...j,created:'2026-10-25T00:00:00.000Z',...(i===0?{status:'conflict'}:{})})));
 const before=writeCount;await localFirst14333.sync();return {statuses:localFirst14333.state().jobs.map(j=>j.status),writes:writeCount-before};
});
assert.deepEqual(blocked,{statuses:['conflict','pending','pending','synced'],writes:1});
console.log('PASS durable queue uses saved order: equal timestamps, backwards clock, consecutive payroll, failed-parent protection and independent saves');
await browser.close();server.close();})().catch(e=>{console.error(e);server.close();process.exit(1)});
