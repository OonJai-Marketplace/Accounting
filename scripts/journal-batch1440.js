/* Multi-date client recovery only. Existing RPCs and accounting-period rules remain authoritative. */
(()=>{'use strict';
const cache=new Map();let busy=false;
const owner=()=>typeof liveProfile!=='undefined'?liveProfile?.id||'':'';
const key=id=>'ojm_journal_batch1440:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+id;
const esc=v=>escapeHtml(String(v??''));
const canonical=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
function load(id=owner()){
 if(!id)return null;if(cache.has(id))return cache.get(id);
 let job=null;try{job=JSON.parse(localStorage.getItem(key(id))||'null');if(job?.owner!==id||!Array.isArray(job?.dates))job=null;job?.dates.forEach(d=>{if(d.status==='sending')d.status='uncertain'});}catch{}
 cache.set(id,job);return job;
}
function persist(job){localStorage.setItem(key(job.owner),JSON.stringify(job));cache.set(job.owner,job);}
function payloads(groups){
 const memo=document.getElementById('jeGeneralMemo').value.trim(),prefix=String(ApplicationSettings.accounting?.journalPrefix||businessInitials()||'OJM').trim(),digits=Math.max(3,Math.min(9,Number(ApplicationSettings.accounting?.journalDigits)||6));
 return groups.map(([date,g])=>({p_transaction_date:date,p_memo:memo,p_lines:g.lines.map(l=>({account_id:l.account?.id||null,description:l.memo,currency_code:l.currency,debit:Number(l.debit||0),credit:Number(l.credit||0)})),p_prefix:prefix,p_digits:digits})).sort((a,b)=>a.p_transaction_date.localeCompare(b.p_transaction_date));
}
function download(job){const url=URL.createObjectURL(new Blob([JSON.stringify(job,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='journal-batch-'+job.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function restore(job){
 if(busy||owner()!==job.owner)return;const memo=document.getElementById('jeGeneralMemo');
 const populated=memo.value.trim()||[...document.querySelectorAll('#jeLinesBody .je-line-acc,#jeLinesBody .je-line-dr,#jeLinesBody .je-line-cr')].some(n=>n.value.trim()&&!/^0(?:\.00)?$/.test(n.value));
 if(populated&&!await ui117.confirm('Replace the current editor with this saved batch draft? Confirmed dates will still be skipped on retry.'))return;
 window.entry1430?.setMode?.('double');memo.value=job.payloads[0].p_memo;document.getElementById('jeTransDate').value=job.payloads[0].p_transaction_date;setJournalDateMode(true);document.getElementById('jeLinesBody').replaceChildren();
 for(const payload of job.payloads)for(const line of payload.p_lines){const a=AccountingStore.accounts.find(a=>a.id===line.account_id);addJournalLineRow(a?a.code+' — '+a.name:'',line.description,line.debit?String(line.debit):'',{[line.currency_code]:line.credit?String(line.credit):''});document.querySelector('#jeLinesBody tr:last-child .je-line-date').value=payload.p_transaction_date;}
 calculateJournalBalance();showJournalEntry98();showCenterStatus('Batch draft restored. Post Entry retries failed dates and skips confirmed dates.');
}
function draw(){
 window.dispatchEvent(new Event('save-state14234'));let host=document.getElementById('journalBatch1440');const job=load();if(!job||job.completed){host?.remove();return;}
 if(!host){host=document.createElement('section');host.id='journalBatch1440';host.className='journal-batch1440';document.getElementById('journalEntry98')?.after(host);}
 host.hidden=true;const names={pending:'Not sent',sending:'Sending',saved:'Saved — will not resend',failed:'Not saved — may retry',uncertain:'Unconfirmed — check History first'};
 host.innerHTML='<h3>Multi-date posting status</h3><p>Confirmed dates are skipped on retry. A retry uses the same server reference and cannot post the batch twice.</p><ul>'+job.dates.map(d=>'<li><strong>'+esc(d.date)+'</strong> — '+esc(names[d.status])+(d.message?' · '+esc(d.message):'')+'</li>').join('')+'</ul><div><button type="button" data-restore1440>Restore batch draft</button><button type="button" data-copy1440>Download entry copy</button><button type="button" data-history1440>Refresh History</button></div>';
 host.querySelector('[data-restore1440]').onclick=()=>restore(job);host.querySelector('[data-copy1440]').onclick=()=>download(job);
 host.querySelector('[data-history1440]').onclick=async()=>{try{await loadJournalFromSupabase();showCenterStatus('History refreshed. Verify each unconfirmed date, memo and amount before recording its outcome below.')}catch(e){showCenterStatus(e.message,true)}};
 for(const d of job.dates.filter(d=>d.status==='uncertain')){
  const box=document.createElement('div');box.className='batch-resolve1440';box.append(document.createTextNode(d.date+' — after checking History: '));
  for(const [label,status] of [['Verified saved','saved'],['Verified not saved','failed']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=busy;b.onclick=async()=>{if(busy||owner()!==job.owner)return;
     if(!job.protocol14228){showCenterStatus('This older attempt has no server receipt. Verify its History before migrating the draft.',true);return;}
     try{const r=await ojmDb.rpc('journal_receipt14228',{p_request_key:job.id});if(r.error)throw r.error;if(owner()!==job.owner)return;
      const saved=!!r.data;if(saved&&canonical(r.data.payload)!==canonical(job.payloads))throw Error('Receipt data does not match this draft');
      job.dates.forEach(x=>{x.status=saved?'saved':'failed';x.message=saved?'Confirmed by the database receipt.':'No committed receipt. Retry keeps the same reference.'});persist(job);draw();
     }catch(e){showCenterStatus('Cannot verify posting: '+e.message,true)}
    };box.append(b);}
  host.append(box);
 }
}
async function post(groups){
 if(busy)return;
 if(window.offline14239?.offline()){showCenterStatus('Final posting requires connection. Your complete batch stays in the editor.',true);return;}
 const id=owner();if(!id||!window.access113?.can('journal','post'))return;let job=load(id);const data=payloads(groups);
 if(data.some(p=>p.p_lines.some(l=>!l.account_id))){showCenterStatus('Select a valid database account for every line.',true);return;}
 if(job?.completed&&JSON.stringify(job.payloads)!==JSON.stringify(data))job=null;
 if(job&&JSON.stringify(job.payloads)!==JSON.stringify(data)){draw();showCenterStatus('Restore the unfinished batch before changing its posting data.',true);return;}
 if(job&&!job.protocol14228&&job.dates.some(d=>!['pending','failed'].includes(d.status))){draw();showCenterStatus('This batch was sent by the previous version. Verify its old History and keep its entry copy before starting a new batch.',true);return;}
 if(window.workflow136?.state.sessions.some(s=>data.some(p=>p.p_transaction_date.slice(0,7)===String(s.month).slice(0,7)))){showCenterStatus('Post one date at a time in a book correction session.',true);return;}
 busy=true;
 try{
  if(!job)job={id:crypto.randomUUID(),owner:id,payloads:data,dates:data.map(p=>({date:p.p_transaction_date,status:'pending'}))};
  job.protocol14228=true;
  if(job.completed){showCenterStatus('This batch is already confirmed saved. Start a new draft for another posting.');return;}
  // Every retry sends the identical batch and reference. The server returns the original receipt.
  if(!job.dates.every(d=>d.status==='saved')){
   job.dates.forEach(d=>{d.status='sending';d.message=''});persist(job);draw();
   const result=await ojmDb.rpc('post_journal_batch14228',{p_request_key:job.id,p_entries:job.payloads});
   if(result.error)throw result.error;
   if(!Array.isArray(result.data)||result.data.length!==job.dates.length||result.data.some(r=>!r.entry_id))throw Error('Posting receipt was not confirmed. Retry this same batch.');
   job.result=result.data;job.dates.forEach(d=>d.status='saved');persist(job);
  }
  if(owner()!==id)return;
  await loadJournalFromSupabase();if(owner()!==id)return;
  // Keep a completion receipt until a new user-edited draft starts. Repeated clicks cannot create a new batch.
  job.completed=true;persist(job);finalizePostSuccess();draw();
 }catch(error){
  if(job?.dates.every(d=>d.status==='saved')){job.refreshError='Entry saved; the journal view could not reload. '+(error.message||'');try{persist(job)}catch{}}
  if(job&&!job.dates.every(d=>d.status==='saved')){job.dates.forEach(d=>{d.status=error.code&&!/fetch|network|timeout|connection/i.test(error.message||'')?'failed':'uncertain';d.message=error.message||'Result unconfirmed. Retry uses the same reference.'});try{persist(job)}catch{}}
  showCenterStatus('Posting not confirmed: '+(error.message||'Connection interrupted')+'. Keep this draft; retrying the same reference cannot duplicate it.',true);
 }finally{busy=false;if(owner()===id)draw();}
}
window.journalBatch1440={getJob:()=>load(),retry:async()=>{const j=load();if(!j||busy||!access113.can('journal','post'))return;const who=owner();busy=true;try{const r=await ojmDb.rpc('post_journal_batch14228',{p_request_key:j.id,p_entries:j.payloads});if(r.error)throw r.error;if(!Array.isArray(r.data)||r.data.length!==j.dates.length||r.data.some(x=>!x.entry_id))throw Error('Complete database receipt not confirmed. Retry the same reference.');j.dates.forEach(d=>d.status='saved');persist(j);await loadJournalFromSupabase();j.completed=true;persist(j);if(owner()===who){const current=Object.entries(collectLiveJournalGroups().grouped).filter(([,g])=>g.lines.length);if(canonical(payloads(current))===canonical(j.payloads))finalizePostSuccess();}}catch(e){j.dates.forEach(d=>{d.status=d.status==='saved'?'saved':'uncertain';d.message=e.message});persist(j);throw e}finally{busy=false;if(owner()===who)draw()}},post,hasPending:()=>!!load()&&!load().completed,draw};
document.addEventListener('input',e=>{if(e.isTrusted&&e.target.closest('#journalEntry98')){const job=load();if(job?.completed){localStorage.removeItem(key(job.owner));cache.set(job.owner,null);draw()}}},true);
window.addEventListener('page113',draw);document.addEventListener('DOMContentLoaded',draw,{once:true});
})();
