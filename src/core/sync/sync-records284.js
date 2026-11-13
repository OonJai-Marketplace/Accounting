/* Readable, account-scoped descriptions of retained save requests. No new queue or polling. */
(()=>{'use strict';
const actor=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const bytes=value=>value===undefined?null:new TextEncoder().encode(JSON.stringify(value)).length;
const compact=value=>String(value||'').replace(/\s+/g,' ').trim();
const short=value=>{const text=compact(value);return text.length>90?text.slice(0,87)+'…':text};
const names={employees:'Employees',leaves:'Leave',runs:'Payroll',reports:'Reports',documents:'Documents'};
const ref=id=>'request '+String(id).slice(0,12);
function month(value){const match=/^(\d{4})-(\d{2})(?:-|$)/.exec(value||'');return match&&Number(match[2])>=1&&Number(match[2])<=12?['January','February','March','April','May','June','July','August','September','October','November','December'][Number(match[2])-1]+' '+match[1]:compact(value);}
function workLabel(kind,row){const d=row?.data||{},name=compact(d.name||d.employeeName),reference=compact(d.reference||d.payrollId||d.payrollID);
 if(kind==='runs')return [month(d.month||row.period_start),reference,d.status==='finalized'||row.status==='finalized'?'closing payroll':'draft'].filter(Boolean).join(' · ');
 if(kind==='leaves'){const employee=typeof Work82!=='undefined'?Work82.employees?.find(e=>e.id===d.employeeId):null;return [name||employee?.data?.name||'Employee '+String(d.employeeId||'').slice(0,8),d.from===d.to?d.from:[d.from,d.to].filter(Boolean).join(' to '),d.type||d.leaveType].filter(Boolean).join(' · ');}
 if(kind==='documents')return (d.documentKind14297==='template'?'Template: ':'')+(compact(d.title)||'Untitled document');
 return [name||compact(d.title||d.purpose)||reference||'Record '+String(row?.id||'').slice(0,8),name?d.code:reference!==d.title&&reference!==d.purpose?reference:''].filter(Boolean).join(' · ');
}
function advice(status){if(['conflict','blocked','failed','attention'].includes(status))return {state:status==='conflict'?'Version conflict — needs review':'Save needs review',action:'Open Data Check to review the saved request and the error. Keep this copy; do not enter it again.',retry:false};if(['saving','syncing','sending'].includes(status))return {state:'Sending — awaiting confirmation',action:'Wait for database confirmation. Do not enter this record again.',retry:false};return {state:status==='uncertain'?'Confirmation not received':status==='server-confirmed'?'Database confirmed':'Waiting for synchronization',action:status==='server-confirmed'?'The record is saved; only refreshing or checking the device copy remains.':'Reconnect and retry this saved request. The original reference is reused; do not enter it again.',retry:status!=='server-confirmed'};}
function pending(){if(!actor())return [];const rows=new Map();
 const add=(job,source,items,payload,kind,status=job.status)=>{if(!job.id||rows.has(job.id)||job.actor&&job.actor!==actor()||job.owner&&job.owner!==actor())return;const guidance=advice(status);rows.set(job.id,{id:job.id,status:status||'pending',source,records:Math.max(1,items.length),payloadBytes:bytes(payload),items,message:compact(job.message),created:job.created||'',kind,...guidance,recheck:['record','journal','audit'].includes(kind)&&['blocked','conflict','failed','attention'].includes(status)});};
 for(const j of window.offlineAudit143174?.pending()||[]){const no=j.item?.new_data?.entry_no||j.item?.old_data?.entry_no;add(j,'Audit deletion',[{label:(no?'Journal '+no:'Audit record '+(j.item?.id||j.id))+' · deletion',officialId:no||''}],j.args,'audit');}
 for(const j of window.journalDurable14385?.pending()||[]){const ops=(j.changes||[]).filter(op=>op.status!=='saved'),confirmed=!!j.receipt&&j.status==='saved'&&!ops.length&&(!j.voucher||j.voucherLinked),items=[];
  for(const [i,e] of (j.entries||[]).entries()){const receipt=j.receipt?.[i],changes=ops.filter(op=>op.index===i),link=i===0&&j.voucher&&!j.voucherLinked;if(receipt&&!changes.length&&!link&&!confirmed)continue;const operation=changes.length?changes.some(op=>op.kind==='void')?'void pending':'edit pending':link?'voucher link pending':receipt?'saved':'new entry';const number=receipt?.entry_no||j.localNumbers335?.[i];const label=number?'Journal '+number+' · '+operation:[e.date,short(e.memo)||'No description',ref(j.id),operation].filter(Boolean).join(' · ');items.push({label,officialId:receipt?.entry_no||'',operation,detail:compact(e.memo)});}
  add(j,'Journal',items,{payload:j.payload,changes:ops},'journal',confirmed?'server-confirmed':j.status==='saved'?'pending':j.status);
 }
 for(const j of window.localFirst14333?.state().jobs||[])if(!['synced','resolved'].includes(j.status))add(j,names[j.kind]||'Saved records',[{label:workLabel(j.kind,j.row),detail:'Record '+j.row.id+' · version '+j.row.version}],j.row,'record');
 const staff=j=>{const p=j.payload||{},edit=!!p.p_edit_ids?.length;add({...j,id:p.p_key},'Sub-user entries',(p.p_items||[]).map((e,i)=>({label:[e.entry_no||e.entryNo||'',e.date||e.transaction_date,short(e.memo||e.description)||'Line '+(i+1)].filter(Boolean).join(' · ')})),p,'staff',edit?'attention':j.status==='attention'?'uncertain':j.status||'uncertain')};
 for(const j of window.offline14239?.queue()||[])if(j.status!=='synced')staff(j);
 for(const j of window.pendingPosts99?.values()||[]){const es=j.payload?.p_entries||[j.payload||{}];add(j,'Journal',es.map((e,i)=>({label:j.receipt?.[i]?.entry_no?'Journal '+j.receipt[i].entry_no:[e.p_transaction_date||e.date,short(e.p_memo||e.memo),ref(j.id)].filter(Boolean).join(' · '),officialId:j.receipt?.[i]?.entry_no||''})),j.payload,'legacy',j.receipt?'server-confirmed':j.status);}
 for(const j of window.saveNotices14234?.staffPending()||[])staff(j);
 const b=window.journalBatch1440?.getJob();if(b&&!b.completed){const waiting=(b.dates||[]).filter(d=>d.status!=='saved'),es=waiting.length?waiting:b.dates||[];add({...b,message:b.message||waiting.map(d=>d.message).filter(Boolean).join('; ')},'Journal batch',es.map(d=>({label:[d.date,ref(b.id)].filter(Boolean).join(' · ')})),b.payloads,'batch',!waiting.length?'server-confirmed':!b.protocol14228?'attention':waiting.some(d=>d.status==='uncertain')?'uncertain':'pending');}
 for(const j of window.saveNotices14234?.entries()||[])add(j,'Saved request',[{label:j.title||ref(j.id)}],undefined,'legacy','attention');
 return [...rows.values()];
}
// Compress only consecutive, same-format official numbers, preserving gaps and years.
function summarize(items,limit=3){const parts=[];for(let i=0;i<items.length;){const item=items[i],m=/^(.*?)(\d{4})$/.exec(item.officialId||'');let end=i;if(m)while(end+1<items.length){const next=items[end+1],n=/^(.*?)(\d{4})$/.exec(next.officialId||'');if(!n||n[1]!==m[1]||Number(n[2])!==Number(m[2])+end+1-i||next.operation!==item.operation)break;end++;}parts.push(end>i?'Journal '+item.officialId+' to '+items[end].officialId+(item.operation?' · '+item.operation:''):short(item.label));i=end+1;}return parts.slice(0,limit).join('; ')+(parts.length>limit?'; and '+(parts.length-limit)+' more (see details)':'');}
function groups(rows=pending()){const result=new Map();for(const row of rows.filter(r=>r.status!=='server-confirmed')){const key=row.source+':'+row.status;if(!result.has(key))result.set(key,{id:key,source:row.source,state:row.state,action:row.action,rows:[],items:[],records:0});const g=result.get(key);g.rows.push(row);g.items.push(...row.items);g.records+=row.records;}return [...result.values()].map(g=>({...g,summary:summarize(g.items)}));}
const flights=new Map();
function retry(id,{reviewed=false}={}){const who=actor(),client=typeof ojmDb==='undefined'?null:ojmDb,key=who+':'+id;if(flights.has(key))return flights.get(key);const task=Promise.resolve().then(async()=>{if(!who||actor()!==who||ojmDb!==client)throw Error('Account or connection changed. Reopen Synchronization.');const row=pending().find(r=>r.id===id);if(!row)return;if(!row.retry&&!(reviewed&&row.recheck))throw Error(row.action);if(navigator.onLine===false)throw Error('Reconnect before retrying. Your saved request is retained.');if(row.kind==='record')await window.localFirst14333.retry(id);else {
 await window.offline14239.confirmConnection();
 if(actor()!==who||ojmDb!==client)throw Error('Account changed. Reopen Synchronization.');
 if(row.kind==='journal')await window.journalDurable14385.sync({explicit:true,targetId:id});
 else if(row.kind==='audit')await window.offlineAudit143174.sync(id);
 else await window.offline14239.retryEntry(id);
 }
 if(actor()!==who||ojmDb!==client)return;
 const remaining=pending().find(r=>r.id===id&&r.status!=='server-confirmed');
 if(remaining)throw Error(remaining.message||remaining.action||'This request is still waiting for confirmation.');if(actor()!==who||ojmDb!==client)return;window.idleSync14341?.afterRepair?.();window.offline14239?.refreshDialog();}).finally(()=>flights.delete(key));flights.set(key,task);return task;}
async function retryGroup(ids,source){
 const who=actor(),client=ojmDb;
 async function send(){
  for(const id of ids){
   if(!who||actor()!==who||ojmDb!==client)throw Error('Account changed. Reopen Data Check.');
   const row=pending().find(item=>item.id===id);
   if(!row||row.status==='server-confirmed')continue;
   if(row.source!==source||!row.retry)throw Error('Review the remaining requests in Data Check.');
   await retry(id);
  }
 }
 if(!navigator.locks)return send();
 const key='ojm-sync14351:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+who;
 return navigator.locks.request(key,{ifAvailable:true},lock=>{
  if(!lock)throw Error('Another synchronization is running. Wait for it to finish.');
  return send();
 });
}
function render(host,{busy=false,online=true,opened=new Set(),onReview=()=>{},rows=pending()}={}){const who=actor(),doc=host.ownerDocument,add=(tag,text,parent)=>{const n=doc.createElement(tag);n.textContent=text;parent.append(n);return n},list=groups(rows),section=add('section','',host);section.className='sync-records284';add('h3','Pending saves',section);
 if(!list.length&&!rows.length)add('p','No pending saves.',section);
 for(const g of list){
  const group=add('div','',section);group.className='sync-request-group';
  add('strong',g.source+' · '+g.state,group);add('p',g.summary,group);
  const toggle=add('button',g.rows.length+' saved request'+(g.rows.length===1?'':'s'),group);
  const key='records:'+g.id,details=add('div','',group);
  details.id='sync-requests-'+encodeURIComponent(g.id);
  toggle.type='button';toggle.dataset.section=key;toggle.dataset.action=key;
  toggle.setAttribute('aria-controls',details.id);
  const expand=show=>{details.hidden=!show;toggle.setAttribute('aria-expanded',String(show))};
  expand(opened.has(key));toggle.onclick=()=>expand(details.hidden);
  for(const r of g.rows){const article=add('article','',details);article.dataset.request284=r.id;const entries=add('ul','',article);for(const item of r.items){const line=add('li',item.label,entries);if(item.detail&&item.detail!==item.label)add('small',item.detail,line);}add('small','Reference · '+r.id,article);if(r.created)add('small','Saved on this device · '+r.created,article);if(r.message)add('p','Last result: '+r.message,article);const button=add('button',r.retry?'Retry this save':'Open Data Check',article);button.type='button';button.dataset.action='request-'+r.id;button.disabled=busy||r.retry&&!online;button.onclick=async()=>{if(actor()!==who)return;if(!r.retry){onReview(r.id);return}button.disabled=true;try{await retry(r.id)}catch(e){if(actor()===who&&article.isConnected){const alert=add('p',e.message,article);alert.setAttribute('role','alert')}}finally{if(article.isConnected)button.disabled=busy||!online}};}
 }
 const confirmed=rows.filter(r=>r.status==='server-confirmed');if(confirmed.length)add('p',confirmed.length+' request'+(confirmed.length===1?' is':'s are')+' already database-confirmed; checking or refreshing the saved copies remains.',section);
 return section;
}
window.syncRecords284={pending,groups,summarize,workLabel,month,retry,retryGroup,render};
})();
