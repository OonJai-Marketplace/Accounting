const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');

const setup = fs.readFileSync('validation/performance/save-path283.cjs','utf8').split('const run={')[0];
const create = Function('require',setup+'\nreturn fixture;')(require);
async function groups() {
  const f = create();
  f.c.TextEncoder=TextEncoder;
  Object.assign(f.c.offline14239,{queue:()=>[],refreshDialog(){}});
  f.c.navigator.onLine = false;
  await f.save('documents',{title:'First document'});
  await f.save('documents',{title:'Second document'});
  await f.save('reports',{reference:'Keep local'});
  f.c.navigator.onLine = true;
  vm.runInNewContext(fs.readFileSync('src/core/sync/sync-records284.js','utf8'),f.c);
  const records = f.c.syncRecords284;
  const group = records.groups().find(g=>g.source==='Documents');
  assert.equal(group.rows.length,2);
  // Named Web Locks are independent; the remote fixture's single lock is for the outbox.
  const locks=f.c.navigator.locks;
  f.c.navigator.locks={request:(name,options,action)=>name.startsWith('ojm-sync14351:')?action({name}):locks.request(name,options,action)};
  await records.retryGroup(group.rows.map(r=>r.id),group.source);
  assert.equal(f.writes().length,2);
  assert.equal(records.groups().length,1);
  assert.equal(records.groups()[0].source,'Reports');
  await records.retryGroup(group.rows.map(r=>r.id),group.source);
  assert.equal(f.writes().length,2);
}
async function schedule() {
  const dom = new JSDOM('',{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  let now=Date.parse('2026-11-15T18:00Z'),reads=0,scheduled,fail=false;
  w.Date.now=()=>now;
  w.setTimeout=(fn,ms)=>{scheduled={fn,ms};return 1;};
  w.setInterval=()=>{throw Error('Minute polling is forbidden');};
  w.liveProfile={id:'a',role:'admin',status:'active'};
  w.ojmDb={auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})}};
  w.OJM_SUPABASE_URL='https://example.test';
  w.HRCalendarModel14306={valid:()=>true};
  w.hrCalendar14306={state:{owner:'a',ready:true},render(){}};
  w.fetch=async()=>{reads++;if(fail)throw Error('Weak connection');return {ok:true,json:async()=>({feed:{schema:1,language:'en',checkedAt:'2026-11-15',items:[]}})}};
  w.eval(fs.readFileSync('src/hr/calendar/hr-calendar-news14309.js','utf8'));
  await w.hrCalendarNews14309.refresh();
  await w.hrCalendarNews14309.refresh();assert.equal(reads,1);
  assert.equal(scheduled.ms,7*3600000);
  now+=scheduled.ms;fail=true;scheduled.fn();await new Promise(r=>setImmediate(r));
  for(let i=0;i<5;i++){w.dispatchEvent(new w.Event('online'));await w.hrCalendarNews14309.refresh();}
  assert.equal(reads,2);
  fail=false;await w.hrCalendarNews14309.refresh(true);assert.equal(reads,3);
  w.eval(fs.readFileSync('src/hr/calendar/hr-calendar-news14309.js','utf8'));
  await w.hrCalendarNews14309.refresh();assert.equal(reads,3);
  dom.window.close();
}
async function triggers() {
  const dom=new JSDOM('',{url:'https://example.test',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;w.liveProfile={id:'test'};let uploads=0;
  w.offline14239={sync(){uploads++}};w.localFirst14333={sync(){uploads++}};
  w.setInterval=w.setTimeout=()=>{throw Error('Full sync scheduled a background timer');};
  w.eval(fs.readFileSync('src/core/sync/idle-sync14341.js','utf8'));
  for(const name of ['online','focus','session-online14333','idle-sync14341'])w.dispatchEvent(new w.Event(name));
  const sync=w.idleSync14341;
  sync.request();await sync.run(true);await sync.run(false,{trigger:'reconnect'});await sync.run(false,{trigger:'login'});
  assert.equal(uploads,0);assert.equal(sync.running,false);dom.window.close();
}
(async()=>{await groups();await schedule();await triggers();console.log('PASS selected group only, idempotent retry, weekly Laos boundary, failed news request, cached restart and manual-only full sync');})().catch(e=>{console.error(e);process.exitCode=1});
