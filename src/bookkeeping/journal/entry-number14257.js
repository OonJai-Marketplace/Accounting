/* An offline estimate uses the saved numbering series. Posting assigns the final ID. */
(()=>{
'use strict';
let next=null,series='',flight=null,again=false;
const date=()=>document.getElementById('jeTransDate')?.value||appLocalDate();
const owner=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const permitted=()=>window.access113?.can('journal','view')===true;
const offline=()=>window.offlineAudit143174?.offline()||navigator.onLine===false;
function policy(){
 const prefix=String(ApplicationSettings.accounting?.journalPrefix||'JRN').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)||'JRN';
 const digits=Math.max(3,Math.min(9,Number(ApplicationSettings.accounting?.journalDigits)||4));
 const day=date();
 return {prefix,digits,day,key:[owner(),day,prefix,digits].join('|')};
}
function paint(){
 document.getElementById('availableJournalIds143121')?.remove();
 const n=document.getElementById('jeNextIdDisplay');
 if(!n||typeof JournalModule==='undefined'||window.personalJournal1437?.active)return;
 if(JournalModule.editingEntryId){n.textContent='Editing: '+JournalModule.editingEntryId;return;}
 const p=policy(),known=p.key===series?next:null;
 const local=permitted()&&owner()?window.offlineAudit143174?.provisional(p.day,p.prefix,p.digits):null;
 const estimate=local&&(offline()||!known||local!==known);
 const number=estimate?local:known;
 const text=number?(estimate?'Estimated ID: ':'')+formatEntryId143114(p.prefix,number,p.day,p.digits):
    offline()?'ID assigned when synced':'Entry ID: checking database';
 if(n.textContent!==text)n.textContent=text;
 n.title='The estimate uses IDs saved on this device and its queued journals. The final number is assigned when the database records the entry.';
}
async function refresh(){
 if(!permitted()||!owner()||!ojmDb){next=null;series='';again=false;paint();return;}
 if(flight){again=true;return flight;}
 flight=(async()=>{
  do{
   again=false;
   const p=policy(),db=ojmDb;
   await window.offlineAudit143174?.initialize();
   if(!permitted()||p.key!==policy().key||db!==ojmDb){again=permitted()&&!!owner();continue;}
   next=null;series=p.key;paint();
   if(offline())continue;
   try{
    const r=await db.rpc('offline_journal_state143174',{p_date:p.day,p_prefix:p.prefix,p_digits:p.digits});
    if(!permitted()||p.key!==policy().key||db!==ojmDb){again=permitted()&&!!owner();continue;}
    if(r.error)throw r.error;
    await window.offlineAudit143174?.rememberIds(p.day,p.prefix,p.digits,r.data);
    if(!permitted()||p.key!==policy().key||db!==ojmDb)continue;
    next=Number.isSafeInteger(Number(r.data?.next))&&Number(r.data.next)>0?Number(r.data.next):null;
    paint();
   }catch(error){
    if(p.key!==policy().key||db!==ojmDb)continue;
    next=null;paint();
    const n=document.getElementById('jeNextIdDisplay');
    if(n&&!JournalModule.editingEntryId&&!window.offlineAudit143174?.provisional(p.day,p.prefix,p.digits)){
     n.textContent='Entry ID: database unavailable';n.title=error.message||'Reconnect to load this numbering series.';
    }
   }
  }while(again&&owner());
 })().finally(()=>{flight=null;});
 return flight;
}
function ready(){
 document.addEventListener('change',e=>{if(e.target.id==='jeTransDate')void refresh();});
 window.updateNextEntryIdDisplay=paint;
 const load=window.loadJournalFromSupabase;
 window.loadJournalFromSupabase=async function(...args){const r=await load.apply(this,args);void refresh();return r;};
 window.addEventListener('page113',()=>{if(document.getElementById('journal')?.classList.contains('active'))void refresh();});
 window.addEventListener('online',()=>void refresh());window.addEventListener('offline',()=>{next=null;paint();});
 window.addEventListener('focus',()=>{if(document.getElementById('journal')?.classList.contains('active'))paint();});
 paint();
}
window.addEventListener('local-work14333',paint);window.entryNumber14257={refresh,paint};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
