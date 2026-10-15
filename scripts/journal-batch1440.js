/* Multi-date client recovery only. Existing RPCs and accounting-period rules remain authoritative. */
(()=>{'use strict';
const cache=new Map();let busy=false;
const owner=()=>typeof liveProfile!=='undefined'?liveProfile?.id||'':'';
const key=id=>'ojm_journal_batch1440:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+id;
const esc=v=>escapeHtml(String(v??''));
const canonical=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
function load(id=owner()){
 if(!id)return null;if(cache.has(id))return cache.get(id);
 let job=null;try{job=JSON.parse(localStorage.getItem(key(id))||'null');if(job?.owner!==id||!Array.isArray(job?.dates)||!job.dates.length||!Array.isArray(job.payloads)||job.payloads.length!==job.dates.length||job.payloads.some(p=>!p||!Array.isArray(p.p_lines)))job=null;job?.dates.forEach(d=>{if(d.status==='sending')d.status='uncertain'});}catch{}
 cache.set(id,job);return job;
}
function persist(job){localStorage.setItem(key(job.owner),JSON.stringify(job));cache.set(job.owner,job);}
function payloads(groups){
 const memo=document.getElementById('jeGeneralMemo').value.trim(),prefix=String(ApplicationSettings.accounting?.journalPrefix||businessInitials()||'OJM').trim(),digits=Math.max(3,Math.min(9,Number(ApplicationSettings.accounting?.journalDigits)||6));
 return groups.map(([date,g])=>({p_transaction_date:date,p_memo:memo,p_lines:g.lines.map(l=>({account_id:l.account?.id||null,description:l.memo,currency_code:l.currency,debit:Number(l.debit||0),credit:Number(l.credit||0),fx_rate_lak:l.fx_rate_lak,book_rate_lak:l.book_rate_lak})),p_prefix:prefix,p_digits:digits})).sort((a,b)=>a.p_transaction_date.localeCompare(b.p_transaction_date));
}
function download(job){const url=URL.createObjectURL(new Blob([JSON.stringify(job,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='journal-batch-'+job.id+'.json';Promise.resolve(window.exportCenter14337?exportCenter14337.fromLink(a):a.click()).finally(()=>setTimeout(()=>URL.revokeObjectURL(url),60000)).catch(()=>{});}
async function restore(job){
 if(busy||owner()!==job.owner)return;const memo=document.getElementById('jeGeneralMemo');
 const populated=memo.value.trim()||[...document.querySelectorAll('#jeLinesBody .je-line-acc,#jeLinesBody .je-line-dr,#jeLinesBody .je-line-cr')].some(n=>n.value.trim()&&!/^0(?:\.00)?$/.test(n.value));
 if(populated&&!await ui117.confirm('Replace the current editor with this saved batch draft? Confirmed dates will still be skipped on retry.'))return;
 if(owner()!==job.owner||busy)return;window.entry1430?.setMode?.('double');memo.value=job.payloads[0].p_memo;document.getElementById('jeTransDate').value=job.payloads[0].p_transaction_date;setJournalDateMode(true);document.getElementById('jeLinesBody').replaceChildren();
 for(const payload of job.payloads)for(const line of payload.p_lines){const a=AccountingStore.accounts.find(a=>a.id===line.account_id);addJournalLineRow(a?a.code+' — '+a.name:'',line.description,line.debit?String(line.debit):'',{[line.currency_code]:line.credit?String(line.credit):''});const row=document.querySelector('#jeLinesBody tr:last-child');row.querySelector('.je-line-date').value=payload.p_transaction_date;row.dataset.fxRate14383=line.fx_rate_lak||'';row.dataset.bookRate14383=line.book_rate_lak||'';}
 window.JournalFX14383?.restore(Object.fromEntries(job.payloads.flatMap(p=>p.p_lines).map(l=>[l.currency_code,l.fx_rate_lak])));calculateJournalBalance();showJournalEntry98();showCenterStatus('Batch draft restored. Post Entry retries failed dates and skips confirmed dates.');
}
function draw(){
 window.dispatchEvent(new Event('save-state14234'));let host=document.getElementById('journalBatch1440');const job=load();if(!job||job.completed){host?.remove();return;}
 if(!host){host=document.createElement('section');host.id='journalBatch1440';host.className='journal-batch1440';document.getElementById('journalEntry98')?.after(host);}
 host.hidden=true;const names={pending:'Not sent',sending:'Sending',saved:'Saved — will not resend',failed:'Not saved — may retry',uncertain:'Unconfirmed — check History first'};
 host.innerHTML='<h3>Multi-date posting status</h3><p>Confirmed dates are skipped on retry. A retry uses the same server reference and cannot post the batch twice.</p><ul>'+job.dates.map(d=>'<li><strong>'+esc(formatAppDate(d.date))+'</strong> — '+esc(names[d.status])+(d.message?' · '+esc(d.message):'')+'</li>').join('')+'</ul><div><button type="button" data-restore1440>Restore batch draft</button><button type="button" data-copy1440>Download entry copy</button><button type="button" data-history1440>Refresh History</button></div>';
 host.querySelector('[data-restore1440]').onclick=()=>restore(job);host.querySelector('[data-copy1440]').onclick=()=>download(job);
 host.querySelector('[data-history1440]').onclick=async()=>{try{await loadJournalFromSupabase();showCenterStatus('History refreshed. Verify each unconfirmed date, memo and amount before recording its outcome below.')}catch(e){showCenterStatus(e.message,true)}};
 for(const d of job.dates.filter(d=>d.status==='uncertain')){
  const box=document.createElement('div');box.className='batch-resolve1440';box.append(document.createTextNode(formatAppDate(d.date)+' — after checking History: '));
  for(const [label,status] of [['Verified saved','saved'],['Verified not saved','failed']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=busy;b.onclick=async()=>{if(busy||owner()!==job.owner)return;
     if(!job.protocol14228){showCenterStatus('This older attempt has no server receipt. Verify its History before migrating the draft.',true);return;}
     try{const r=await ojmDb.rpc('journal_receipt14228',{p_request_key:job.id});if(r.error)throw r.error;if(owner()!==job.owner)return;
      const saved=!!r.data;if(saved&&canonical(r.data.payload)!==canonical(job.payloads))throw Error('Receipt data does not match this draft');
      job.dates.forEach(x=>{x.status=saved?'saved':'failed';x.message=saved?'Confirmed by the database receipt.':'No committed receipt. Retry keeps the same reference.'});persist(job);draw();
     }catch(e){if(owner()!==job.owner)return;showCenterStatus('Cannot verify posting: '+e.message,true)}
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
  if(!job)job={id:crypto.randomUUID(),owner:id,created:new Date().toISOString(),payloads:data,dates:data.map(p=>({date:p.p_transaction_date,status:'pending'}))};
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
  job.completed=true;persist(job);const current=Object.entries(collectLiveJournalGroups().grouped).filter(([,g])=>g.lines.length);if(canonical(payloads(current))===canonical(job.payloads))finalizePostSuccess();draw();
 }catch(error){
  if(job?.dates.every(d=>d.status==='saved')){job.refreshError='Entry saved; the journal view could not reload. '+(error.message||'');try{persist(job)}catch{}}
  if(job&&!job.dates.every(d=>d.status==='saved')){job.dates.forEach(d=>{d.status=error.code&&!/fetch|network|timeout|connection/i.test(error.message||'')?'failed':'uncertain';d.message=error.message||'Result unconfirmed. Retry uses the same reference.'});try{persist(job)}catch{}}
  if(owner()===id)showCenterStatus(job?.dates.every(d=>d.status==='saved')?'Entry saved; the journal view could not reload. Use Sync before continuing.':'Posting not confirmed: '+(error.message||'Connection interrupted')+'. Keep this draft; retrying the same reference cannot duplicate it.',true);
 }finally{busy=false;if(owner()===id)draw();}
}
window.journalBatch1440={retire14385(id){const j=load();if(j?.id===id){j.completed=true;persist(j);draw()}},getJob:()=>load(),retry:async()=>{const j=load();if(!j||busy||!access113.can('journal','post'))return;const who=owner();busy=true;try{const r=await ojmDb.rpc('post_journal_batch14228',{p_request_key:j.id,p_entries:j.payloads});if(r.error)throw r.error;if(!Array.isArray(r.data)||r.data.length!==j.dates.length||r.data.some(x=>!x.entry_id))throw Error('Complete database receipt not confirmed. Retry the same reference.');j.dates.forEach(d=>d.status='saved');persist(j);if(owner()!==who)return;await loadJournalFromSupabase();if(owner()!==who)return;j.completed=true;persist(j);if(owner()===who){const current=Object.entries(collectLiveJournalGroups().grouped).filter(([,g])=>g.lines.length);if(canonical(payloads(current))===canonical(j.payloads))finalizePostSuccess();}}catch(e){j.dates.forEach(d=>{d.status=d.status==='saved'?'saved':'uncertain';d.message=e.message});persist(j);throw e}finally{busy=false;if(owner()===who)draw()}},post,hasPending:()=>!!load()&&!load().completed,draw};
document.addEventListener('input',e=>{if(e.isTrusted&&e.target.closest('#journalEntry98')){const job=load();if(job?.completed){localStorage.removeItem(key(job.owner));cache.set(job.owner,null);draw()}}},true);
window.addEventListener('page113',draw);document.addEventListener('DOMContentLoaded',draw,{once:true});
})();

/* Original-currency journals with explicit LAK valuation. No live/guessed rates. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>escapeHtml(String(v??''));
let rates={},queued=false;
const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const positive=n=>Number.isFinite(Number(n))&&Number(n)>0;
const parse=v=>typeof v==='number'?v:parseAppNumber(String(v||''));
const accounts=()=>AccountingStore.accounts||[];
function currencies(){return [...new Set([...document.querySelectorAll('#jeLinesBody .je-line-acc')].map(n=>getSelectedAccountInfo(n.value)?.currency).filter(c=>c&&c!=='LAK'&&c!=='NA'))].sort()}
function capture(){for(const n of document.querySelectorAll('input[data-fx-rate14383]'))rates[n.dataset.fxRate14383]=n.value;return {...rates}}
function rate(c){if(c==='LAK')return 1;const n=parse(capture()[c]);return positive(n)?n:null}
function lineRate(row,c){return c==='LAK'?1:positive(row?.dataset.fxRate14383)?Number(row.dataset.fxRate14383):rate(c)}
function restore(value={}){rates={...value};const host=$('journalRates14383');if(host)host.replaceChildren();draw()}
function draw(){queued=false;const grid=document.querySelector('#journalEntry98 .je-meta-grid');if(!grid)return;let host=$('journalRates14383');if(!host){host=document.createElement('div');host.id='journalRates14383';host.className='journal-rates14383';const voucher=grid.querySelector('.voucher-pick14299');if(voucher)voucher.before(host);else grid.append(host)}const cs=currencies();host.hidden=!cs.length;grid.classList.toggle('has-fx14383',!!cs.length);for(const n of [...host.children])if(!cs.includes(n.dataset.currency))n.remove();for(const c of cs){if(host.querySelector(`[data-currency="${c}"]`))continue;const label=document.createElement('label');label.dataset.currency=c;label.textContent=`LAK / 1 ${c}`;const input=document.createElement('input');input.type='text';input.inputMode='decimal';input.className='je-input';input.dataset.fxRate14383=c;input.setAttribute('aria-label',`LAK per 1 ${c}`);input.placeholder='Rate';input.value=rates[c]??'';input.autocomplete='off';input.addEventListener('input',()=>{rates[c]=input.value;input.setCustomValidity('');document.querySelectorAll('#jeLinesBody tr').forEach(tr=>{if(getSelectedAccountInfo(tr.querySelector('.je-line-acc')?.value)?.currency===c)delete tr.dataset.fxRate14383})});input.addEventListener('blur',()=>{const n=parse(input.value);if(positive(n)){input.value=new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(n);rates[c]=input.value}else input.setCustomValidity('Enter a positive exchange rate.')});label.append(input);host.append(label)}}
function schedule(){if(!queued){queued=true;requestAnimationFrame(draw)}}
function attach(state){capture();const rows=[...document.querySelectorAll('#jeLinesBody tr')].filter(r=>getSelectedAccountInfo(r.querySelector('.je-line-acc')?.value));let i=0;for(const g of Object.values(state.grouped))for(const l of g.lines){const row=rows.find(r=>!r._fxUsed14383&&getSelectedAccountInfo(r.querySelector('.je-line-acc')?.value)?.id===l.account?.id&&(!r.querySelector('.je-line-date')?.value||r.querySelector('.je-line-date').value===l.date||!$('jeMultipleDates')?.checked))||rows[i];if(row)row._fxUsed14383=true;i++;l.fx_rate_lak=lineRate(row,l.currency);l.book_rate_lak=positive(row?.dataset.bookRate14383)?Number(row.dataset.bookRate14383):null;if(l.currency!=='LAK'&&!positive(l.fx_rate_lak))state.errors.push(`Enter LAK per 1 ${l.currency} before posting.`)}rows.forEach(r=>delete r._fxUsed14383);return state}
function base(line,side){const c=line.currency||line.currency_code;if(c==='LAK')return round(Number(line[side]||0));const stored=line['base_'+side];if(stored!==null&&stored!==undefined&&Number.isFinite(Number(stored)))return Number(stored);const r=line.book_rate_lak||line.fx_rate_lak;return positive(r)?round(Number(line[side]||0)*Number(r)):null}
function carrying(accountId,date){const ws=window.yearWindow14333?.state();let qty=0,value=0,missing=false;for(const b of ws?.opening||[])if(String(b.accountId)===String(accountId)){qty+=Number(b.balance);if(b.base_balance==null&&b.currency!=='LAK')missing=true;else value+=Number(b.currency==='LAK'?b.balance:b.base_balance)}for(const l of JournalModule.entries){if(String(l.accountId)!==String(accountId)||l.date>date||l.id===JournalModule.editingEntryId||l.pendingSync)continue;qty+=Number(l.debit)-Number(l.credit);const d=base(l,'debit'),c=base(l,'credit');if(d===null||c===null)missing=true;else value+=d-c}return !missing&&qty>0&&value>0?{quantity:qty,value:round(value),rate:value/qty}:null}
// Built-ins use the same editable, zero-amount journal structure as saved templates.
function templates(){
 const row=(code,currency,memo)=>({code,currency,memo});
 return [
 {id:'fx14383-income',builtin:true,name:'1. Foreign Currency Income Mapping',generalMemo:'Record sales received in LAK and foreign currencies, with income mapped to LAK.',lines:[
 row('1016','LAK','Total cash received in LAK'),
 row('4010','LAK','Total dine-in sales in LAK, including foreign-currency receipts'),
 row('9035','LAK','LAK equivalent of THB and USD sales received'),
 row('1017','THB','Actual Thai baht cash received'),
 row('9031','THB','System offset for Thai baht income'),
 row('1018','USD','Actual US dollar cash received'),
 row('9033','USD','System offset for US dollar income')]},
 {id:'fx14383-expense',builtin:true,name:'2. Foreign Currency Expense Mapping',generalMemo:'Record expenses paid in foreign currencies, with LAK mapping and exchange gain or loss.',lines:[
 row('9032','THB','System offset for Thai baht expense'),
 row('1017','THB','Actual Thai baht cash paid'),
 row('5010','LAK','Cost of goods purchased at the transaction-date LAK value'),
 row('9036','LAK','Recorded LAK value of foreign currency spent'),
 row('5419','LAK','Realized exchange difference: debit loss or credit gain'),
 row('9034','USD','System offset for US dollar expense'),
 row('1018','USD','Actual US dollar cash paid')]}
 ];
}
function openTemplate(kind){return applyTransactionTemplate('fx14383-'+kind)}
function ready(){const collect=window.collectLiveJournalGroups;window.collectLiveJournalGroups=function(...args){return attach(collect.apply(this,args))};const clear=window.clearJournalEntry;window.clearJournalEntry=function(...args){const out=clear.apply(this,args);restore({});return out};const card=$('journalEntry98');if(card){card.addEventListener('change',schedule);card.addEventListener('input',e=>{if(!e.target.matches('[data-fx-rate14383]'))schedule()});new MutationObserver(schedule).observe($('jeLinesBody'),{childList:true,subtree:true})}draw();window.addEventListener('page113',schedule)}
window.JournalFX14383={capture,restore,rate,lineRate,base,carrying,templates,openTemplate,round,positive};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();

;

/* Display-only pagination. Source rows stay available for exports. */
(()=>{'use strict';const states=new WeakMap(),tables=new Set();let queued=false;
function restoreSpans(table){for(const cell of table.querySelectorAll('[data-page-cell14383]'))cell.remove();for(const cell of table.querySelectorAll('[data-page-span14383]')){cell.rowSpan=Number(cell.dataset.pageSpan14383);delete cell.dataset.pageSpan14383}}
function prepareSpans(table,rows){restoreSpans(table);const positions=new Map(),spans=[],occupied=[];
 rows.forEach((row,i)=>{let column=0;for(const cell of row.cells){while((occupied[column]||0)>i)column++;positions.set(cell,column);const span=cell.rowSpan||1;for(let n=0;n<cell.colSpan;n++)occupied[column+n]=i+span;if(span>1)spans.push({cell,row:i,column,end:Math.min(rows.length,i+span)});column+=cell.colSpan}});
 for(const p of spans){const boundary=(Math.floor(p.row/100)+1)*100;if(p.end<=boundary)continue;p.cell.dataset.pageSpan14383=String(p.cell.rowSpan);p.cell.rowSpan=boundary-p.row;for(let start=boundary;start<p.end;start+=100){const copy=p.cell.cloneNode(true);copy.removeAttribute('data-page-span14383');copy.dataset.pageCell14383='1';copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));copy.rowSpan=Math.min(100,p.end-start);const row=rows[start],next=[...row.cells].find(c=>positions.get(c)>p.column);positions.set(copy,p.column);row.insertBefore(copy,next||null)}}
}
function install(table){if(table.dataset.ownPager14383||table.closest('#document-editor105,[contenteditable=true],#journalEntry98,.phone-app132,form,.r79-original'))return;const bodies=[...table.tBodies];if(!bodies.length)return;let s=states.get(table);const rows=bodies.flatMap(b=>[...b.rows]);
 if(!s){const bar=document.createElement('div');bar.className='table-pages14383 no-print';const prev=document.createElement('button'),label=document.createElement('span'),next=document.createElement('button');prev.type=next.type='button';prev.className=next.className='je-btn je-btn-secondary';prev.textContent='Previous';next.textContent='Next';bar.append(prev,label,next);s={page:0,bar,prev,label,next,rows:[]};states.set(table,s);tables.add(table);prev.onclick=()=>{s.page--;paint(s)};next.onclick=()=>{s.page++;paint(s)}}
 if(rows.length!==s.rows.length||rows.some((r,i)=>r!==s.rows[i])){s.page=0;prepareSpans(table,rows)}s.rows=rows;const container=table.closest('.table-container,.r79-table,.data-table82')||table;if(container.nextElementSibling!==s.bar)container.after(s.bar);paint(s)}
function paint(s){const count=Math.max(1,Math.ceil(s.rows.length/100));s.page=Math.max(0,Math.min(s.page,count-1));for(const [i,row] of s.rows.entries()){const hide=Math.floor(i/100)!==s.page;if(row.hasAttribute('data-page-hidden14383')!==hide)row.toggleAttribute('data-page-hidden14383',hide)}const value=`${s.page+1} of ${count}`;if(s.label.textContent!==value)s.label.textContent=value;s.prev.disabled=s.page===0;s.next.disabled=s.page===count-1}
function scan(){queued=false;for(const table of tables)if(!table.isConnected){states.get(table)?.bar.remove();tables.delete(table)}document.querySelectorAll('.tab-content.active table,.modal-overlay.active table,.ui-dialog108 table').forEach(install)}
function schedule(){if(!queued){queued=true;requestAnimationFrame(scan)}}
function ready(){new MutationObserver(rs=>{if(rs.some(r=>!r.target.closest?.('.table-pages14383,.transaction-pages14340')&&(r.target.closest?.('table')||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('table')||n.querySelector('table'))))))schedule()}).observe(document.body,{childList:true,subtree:true});window.addEventListener('page113',schedule);window.addEventListener('beforeprint',()=>tables.forEach(restoreSpans));window.addEventListener('afterprint',()=>tables.forEach(t=>prepareSpans(t,states.get(t).rows)));scan()}
window.tablePagination14383={scan,restoreSpans};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();

;
