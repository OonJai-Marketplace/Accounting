const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 let calls=0,active=false,cached=null,reachable=true;
 const listeners={},label={textContent:''};
 const context={JournalModule:{},ApplicationSettings:{accounting:{journalPrefix:'OJM'}},liveProfile:{id:'test-user'},
  navigator:{onLine:true},access113:{can:()=>true},
  document:{readyState:'complete',addEventListener(){},getElementById:id=>({jeNextIdDisplay:label,jeTransDate:{value:'2026-10-31'},journal:{classList:{contains:()=>active}}})[id]},
  ojmDb:{rpc:async()=>{calls++;return reachable?{data:{next:8,issued:[]}}:{error:{message:'unreachable'}};}},
  offlineAudit143174:{initialize:async()=>{},offline:()=>!context.navigator.onLine,provisional:()=>cached,rememberIds:async(d,p,n,state)=>{cached=state.next;}},
  formatEntryId143114:(prefix,n)=>prefix+'26'+String(n).padStart(4,'0'),addEventListener:(name,f)=>listeners[name]=f};
 context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('src/bookkeeping/journal/entry-number14257.js','utf8'),context);
 listeners.page113();assert.equal(calls,0);active=true;listeners.page113();await new Promise(r=>setImmediate(r));assert.equal(label.textContent,'OJM260008');
 listeners.focus();listeners.focus();assert.equal(calls,1);
 context.navigator.onLine=false;cached=9;await context.entryNumber14257.refresh();assert.equal(calls,1);assert.equal(label.textContent,'Estimated ID: OJM260009');
 context.navigator.onLine=true;reachable=false;await context.entryNumber14257.refresh();assert.equal(label.textContent,'Estimated ID: OJM260009');
 cached=null;await context.entryNumber14257.refresh();assert.equal(label.textContent,'Entry ID: database unavailable');
 context.JournalModule.editingEntryId='OJM260002';context.entryNumber14257.paint();assert.equal(label.textContent,'Editing: OJM260002');
 console.log('PASS local ID preview offline and during connection failure, focus causes no database reads, editing ID preserved');
})().catch(e=>{console.error(e);process.exitCode=1;});
