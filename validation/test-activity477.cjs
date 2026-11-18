const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
process.env.TZ='Asia/Vientiane';
function fixture(){
 let now=Date.parse('2026-11-18T07:59:00+07:00'),serial=0;const timers=new Map(),listeners=new Map(),alerts=[];
 const target=()=>({addEventListener(name,fn){const rows=listeners.get(name)||[];rows.push(fn);listeners.set(name,rows);},dispatchEvent(e){for(const fn of listeners.get(e.type)||[])fn(e);}});
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const gate={className:'is-authenticated',classList:{contains:()=>true}};
 const document={...target(),hidden:false,readyState:'loading',getElementById:id=>id==='loginGate'?gate:null,querySelector:()=>null};
 const context={console,Date:Clock,document,window:target(),Event:class{constructor(type){this.type=type;}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},MutationObserver:class{observe(){}},
  setTimeout(fn,delay){const id=++serial;timers.set(id,{at:now+delay,fn});return id;},clearTimeout:id=>timers.delete(id),
  liveProfile:{id:'admin'},workflow136:{state:{todos:[],todoLoadedOwner14335:'admin'}},escapeHtml:String,formatAppDate:String,
  localStorage:{values:new Map(),getItem(key){return this.values.get(key)||null;},setItem(key,v){this.values.set(key,v);}},showAppNotification(...args){alerts.push(args);}};
 context.window.refreshNotices1443=()=>{};vm.createContext(context);
 const load=file=>vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
 load('src/core/scheduling/activity477.js');
 function advance(ms){const until=now+ms;let count=0;while(true){const next=[...timers].filter(([,t])=>t.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;assert(++count<100,'no busy loop');timers.delete(next[0]);now=next[1].at;next[1].fn();}now=until;}
 return {context,load,advance,timers,alerts,emit:name=>context.window.dispatchEvent(new context.Event(name)),jump:time=>now=Date.parse(time),now:()=>now};
}
{
 const f=fixture(),a=f.context.window.activity477,ran=[];assert.equal(f.timers.size,0);
 a.at('one',f.now()+500,()=>ran.push(1));a.at('one',f.now()+1000,()=>ran.push(2));a.at('two',f.now()+1000,()=>ran.push(3));
 assert.equal(f.timers.size,1);f.advance(999);assert.deepEqual(ran,[]);f.advance(1);assert.deepEqual(ran,[2,3]);assert.equal(f.timers.size,0);
 a.at('hidden',f.now()+1000,()=>ran.push(4));f.context.document.hidden=true;f.emit('visibilitychange');assert.equal(f.timers.size,0);f.advance(60000);assert.equal(ran.length,2);
 f.context.document.hidden=false;f.emit('visibilitychange');assert.deepEqual(ran,[2,3,4]);f.emit('focus');assert.equal(ran.length,3);
 a.at('far',f.now()+50*86400000,()=>ran.push(5));f.advance(30*86400000);assert.equal(ran.length,3);a.cancel('far');assert.equal(f.timers.size,0);
 a.at('cancel',f.now()+1,()=>{a.cancel('peer');});a.at('peer',f.now()+1,()=>ran.push('wrong'));f.advance(1);assert(!ran.includes('wrong'));
}
{
 const f=fixture();f.load('src/bookkeeping/recurring/todos1438.js');const api=f.context.window.todos1438;
 const task=(id,config={})=>({id,title:id,steps:[{text:'Review',done:false}],todo_config1438:{reminderAt:'2026-11-18T08:00:00+07:00',reminderEvery:480,windowStart:'08:00',windowEnd:'18:00',...config}});
 const at=s=>new Date(s);
 assert.equal(api.nextReminder(task('x'),at('2026-11-18T07:59:00+07:00')),Date.parse('2026-11-18T08:00:00+07:00'));
 assert.equal(api.nextReminder(task('x'),at('2026-11-18T08:00:00+07:00')),Date.parse('2026-11-18T16:00:00+07:00'));
 assert.equal(api.nextReminder(task('x'),at('2026-11-18T16:00:00+07:00')),Date.parse('2026-11-19T08:00:00+07:00'));
 assert.equal(api.nextReminder(task('x',{reminderEvery:0}),at('2026-11-18T09:00:00+07:00')),null);
 assert.equal(api.nextReminder({...task('x'),steps:[{text:'Review',done:true}]}),null);
 assert.equal(api.nextReminder(task('x',{reminderAt:'invalid'})),null);
 assert.equal(api.nextReminder(task('x',{reminderAt:'2026-11-18T23:00:00+07:00'}),at('2026-11-18T07:00:00+07:00')),Date.parse('2026-11-19T08:00:00+07:00'));
 const state=f.context.workflow136.state;state.todos=[task('First'),task('Second')];api.render();assert.equal(f.timers.size,1);f.advance(60000);assert.equal(f.alerts.length,1);assert.match(f.alerts[0][0],/2 to-do reminders/);
 api.render();f.emit('focus');assert.equal(f.alerts.length,1,'same slot is deduplicated');f.advance(8*3600000);assert.equal(f.alerts.length,2);
 f.context.document.hidden=true;f.emit('visibilitychange');f.advance(3*86400000);assert.equal(f.alerts.length,2);
 f.context.document.hidden=false;f.emit('visibilitychange');api.render();assert.equal(f.alerts.length,3,'missed slots consolidated on return');
 state.todos.forEach(t=>t.steps[0].done=true);api.render();assert.equal(f.timers.size,0,'completion cancels reminders');
 state.todos=[task('Other',{reminderAt:new Date(f.now()+60000).toISOString(),reminderEvery:0})];api.render();assert.equal(f.timers.size,1);f.context.liveProfile.id='someone-else';api.render();assert.equal(f.timers.size,0,'old account reminders cancelled');
}
{
 const f=fixture();f.context.liveProfile={id:'admin',role:'admin',status:'active'};f.context.window.loadWork82=async()=>{};f.context.window.switchTab=()=>{};
 f.load('src/hr/calendar/hr-calendar-model14306.js');f.context.HRCalendarModel14306=f.context.window.HRCalendarModel14306;
 let changes=0;f.context.window.localEvents14310={render(){changes++;}};
 f.load('src/hr/calendar/hr-calendar14306.js');f.emit('DOMContentLoaded');assert.equal(f.timers.size,1);
 f.advance(16*3600000);assert.equal(changes,0);f.advance(60000);assert.equal(changes,1,'calendar advances exactly at Laos midnight');
 f.emit('focus');assert.equal(changes,1);f.advance(86400000);assert.equal(changes,2,'one date change per day');
 f.context.liveProfile=null;f.emit('account-access477');assert.equal(f.timers.size,0,'calendar deadline cancelled on sign-out');
}
for(const file of ['src/dashboard/dashboard-warm-v112.js','src/documents/scanner/journal-receipts224.js','src/documents/scanner/viewer208.js','src/maintenance/backup/data-tools14232.js','src/settings/application/settings-stack143176.js','src/hr/calendar/hr-calendar14306.js','src/integrations/hope/word-of-hope183.js','src/bookkeeping/recurring/todos1438.js'])assert(!/setInterval\s*\(/.test(fs.readFileSync(file,'utf8')),file+' has no recurring polling');
console.log('PASS: one deadline timer, no idle wakes, visibility resume, cancellation, far-future deadlines, exact reminder slots, daily windows, grouped/missed reminders and account isolation');
