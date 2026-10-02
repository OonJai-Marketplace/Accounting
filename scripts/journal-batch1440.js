/* Multi-date client recovery only. Existing RPCs and accounting-period rules remain authoritative. */
(()=>{'use strict';
const cache=new Map();let busy=false;
const owner=()=>typeof liveProfile!=='undefined'?liveProfile?.id||'':'';
const key=id=>'ojm_journal_batch1440:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+id;
const esc=v=>escapeHtml(String(v??''));
function load(id=owner()){
 if(!id)return null;if(cache.has(id))return cache.get(id);
 let job=null;try{job=JSON.parse(sessionStorage.getItem(key(id))||'null');if(job?.owner!==id||!Array.isArray(job?.dates))job=null;job?.dates.forEach(d=>{if(d.status==='sending')d.status='uncertain'});}catch{}
 cache.set(id,job);return job;
}
function persist(job){sessionStorage.setItem(key(job.owner),JSON.stringify(job));cache.set(job.owner,job);}
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
 let host=document.getElementById('journalBatch1440');const job=load();if(!job){host?.remove();return;}
 if(!host){host=document.createElement('section');host.id='journalBatch1440';host.className='journal-batch1440';document.getElementById('journalEntry98')?.after(host);}
 const names={pending:'Not sent',sending:'Sending',saved:'Saved — will not resend',failed:'Not saved — may retry',uncertain:'Unconfirmed — check History first'};
 host.innerHTML='<h3>Multi-date posting status</h3><p>Confirmed dates are skipped on retry. Unconfirmed dates are never retried automatically.</p><ul>'+job.dates.map(d=>'<li><strong>'+esc(d.date)+'</strong> — '+esc(names[d.status])+(d.message?' · '+esc(d.message):'')+'</li>').join('')+'</ul><div><button type="button" data-restore1440>Restore batch draft</button><button type="button" data-copy1440>Download entry copy</button><button type="button" data-history1440>Refresh History</button></div>';
 host.querySelector('[data-restore1440]').onclick=()=>restore(job);host.querySelector('[data-copy1440]').onclick=()=>download(job);
 host.querySelector('[data-history1440]').onclick=async()=>{try{await loadJournalFromSupabase();showCenterStatus('History refreshed. Verify each unconfirmed date, memo and amount before recording its outcome below.')}catch(e){showCenterStatus(e.message,true)}};
 for(const d of job.dates.filter(d=>d.status==='uncertain')){
  const box=document.createElement('div');box.className='batch-resolve1440';box.append(document.createTextNode(d.date+' — after checking History: '));
  for(const [label,status] of [['Verified saved','saved'],['Verified not saved','failed']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=busy;b.onclick=async()=>{if(busy||owner()!==job.owner)return;const question=status==='saved'?'I checked History and confirmed this date was saved. Skip it on retry?':'I checked History and confirmed this date was NOT saved. Allow one new posting attempt? An incorrect confirmation can duplicate an entry.';if(!await ui117.confirm(d.date+': '+question)||owner()!==job.owner)return;d.status=status;d.message='Outcome verified by the signed-in user.';try{persist(job);draw()}catch{showCenterStatus('Recovery status could not be saved on this device. Keep the entry copy and do not retry.',true)}};box.append(b);}
  host.append(box);
 }
}
async function post(groups){
 if(busy)return;if(navigator.onLine===false){showCenterStatus('Offline. This attempt sent no entries. Keep your batch draft and reconnect before posting.',true);return}const id=owner();if(!id)return;let job=load(id);const data=payloads(groups);
 if(data.some(p=>p.p_lines.some(l=>!l.account_id))){showCenterStatus('Select a valid database account for every line.',true);return;}
 if(job&&JSON.stringify(job.payloads)!==JSON.stringify(data)){draw();showCenterStatus('A previous multi-date batch is unfinished. Restore that batch draft and resolve its posting status before posting another batch. Its entry copy remains available.',true);return;}
 if(job?.dates.some(d=>d.status==='uncertain')){draw();showCenterStatus('Posting outcome is unconfirmed. Check History and record the verified outcome in Multi-date posting status before retrying.',true);return;}
 busy=true;
 try{
  if(!job){job={id:crypto.randomUUID(),owner:id,payloads:data,dates:data.map(p=>({date:p.p_transaction_date,status:'pending'}))};}
  persist(job);draw(); // Persist the recovery record before any request is sent.
  for(let i=0;i<job.dates.length;i++){
   const date=job.dates[i];if(date.status==='saved')continue;if(owner()!==id)return;
   // Preserve the same open-period requirement used by the ordinary journal.
   if(PeriodReview.status(date.date.slice(0,7))!=='open'){date.status='failed';date.message='The period is not open.';persist(job);break;}
   date.status='sending';date.message='';persist(job);draw();
   let result;try{result=await ojmDb.rpc('post_manual_journal',job.payloads[i]);if(result.error)throw result.error;date.status='saved';}
   catch(error){date.status=error.code&&!/fetch|network|timeout|connection/i.test(error.message||'')?'failed':'uncertain';date.message=error.message||'No confirmed server result.';}
   persist(job);if(owner()!==id)return;draw();if(date.status!=='saved')break;
  }
  if(job.dates.every(d=>d.status==='saved')){
   // A failed read must not cause already saved dates to be posted again.
   await loadJournalFromSupabase();if(owner()!==id)return;finalizePostSuccess();sessionStorage.removeItem(key(id));cache.set(id,null);draw();showCenterStatus('All dates saved. Confirmed dates were posted once by this batch.');
  }else showCenterStatus('Batch stopped. '+job.dates.filter(d=>d.status==='saved').length+' date(s) confirmed saved. Review Multi-date posting status; retry skips confirmed dates.',true);
 }catch(error){showCenterStatus('Batch recovery: '+(error.message||'Device recovery storage is unavailable.')+' Confirmed dates will not be resent. Keep an entry copy and check History.',true);}
 finally{busy=false;if(owner()===id)draw();}
}
window.journalBatch1440={post,hasPending:()=>!!load(),draw};
window.addEventListener('page113',draw);document.addEventListener('DOMContentLoaded',draw,{once:true});
})();
