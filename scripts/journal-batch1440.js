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
 return groups.map(([date,g])=>({p_transaction_date:date,p_memo:memo,p_lines:g.lines.map(l=>({account_id:l.account?.id||null,description:l.memo,currency_code:l.currency,debit:Number(l.debit||0),credit:Number(l.credit||0),fx_rate_lak:l.fx_rate_lak,book_rate_lak:l.book_rate_lak,...(l.calculation14387?{calculation14387:l.calculation14387}:{})})),p_prefix:prefix,p_digits:digits})).sort((a,b)=>a.p_transaction_date.localeCompare(b.p_transaction_date));
}
function download(job){const url=URL.createObjectURL(new Blob([JSON.stringify(job,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='journal-batch-'+job.id+'.json';Promise.resolve(window.exportCenter14337?exportCenter14337.fromLink(a):a.click()).finally(()=>setTimeout(()=>URL.revokeObjectURL(url),60000)).catch(()=>{});}
async function restore(job){
 if(busy||owner()!==job.owner)return;const memo=document.getElementById('jeGeneralMemo');
 const populated=memo.value.trim()||[...document.querySelectorAll('#jeLinesBody .je-line-acc,#jeLinesBody .je-line-dr,#jeLinesBody .je-line-cr')].some(n=>n.value.trim()&&!/^0(?:\.00)?$/.test(n.value));
 if(populated&&!await ui117.confirm('Replace the current editor with this saved batch draft? Confirmed dates will still be skipped on retry.'))return;
 if(owner()!==job.owner||busy)return;window.entry1430?.setMode?.('double');memo.value=job.payloads[0].p_memo;document.getElementById('jeTransDate').value=job.payloads[0].p_transaction_date;setJournalDateMode(true);document.getElementById('jeLinesBody').replaceChildren();
 for(const payload of job.payloads)for(const line of payload.p_lines){const a=AccountingStore.accounts.find(a=>a.id===line.account_id);addJournalLineRow(a?a.code+' — '+a.name:'',line.description,line.debit?String(line.debit):'',{[line.currency_code]:line.credit?String(line.credit):''});const row=document.querySelector('#jeLinesBody tr:last-child');row.querySelector('.je-line-date').value=payload.p_transaction_date;row.dataset.fxRate14383=line.fx_rate_lak||'';row.dataset.bookRate14383=line.book_rate_lak||'';window.JournalCalculator14387?.setMeta(row,line.calculation14387);}
 window.JournalCalculator14387?.restore(job.payloads.flatMap(p=>p.p_lines).find(l=>l.calculation14387)?.calculation14387.type||'Normal');window.JournalFX14383?.restore(Object.fromEntries(job.payloads.flatMap(p=>p.p_lines).map(l=>[l.currency_code,l.fx_rate_lak])));calculateJournalBalance();showJournalEntry98();showCenterStatus('Batch draft restored. Post Entry retries failed dates and skips confirmed dates.');
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
function draw(){queued=false;const grid=document.querySelector('#journalEntry98 .je-meta-grid');if(!grid)return;let host=$('journalRates14383');if(!host){host=document.createElement('div');host.id='journalRates14383';host.className='journal-rates14383';const voucher=grid.querySelector('.voucher-pick14299');if(voucher)voucher.before(host);else grid.append(host)}const cs=currencies();host.hidden=!cs.length;grid.classList.toggle('has-fx14383',!!cs.length);for(const n of [...host.children])if(!cs.includes(n.dataset.currency))n.remove();for(const c of cs){if(host.querySelector(`[data-currency="${c}"]`))continue;const label=document.createElement('label');label.dataset.currency=c;label.textContent=`LAK / 1 ${c}`;const input=document.createElement('input');input.type='text';input.inputMode='decimal';input.className='je-input';input.dataset.fxRate14383=c;input.setAttribute('aria-label',`LAK per 1 ${c}`);input.placeholder='Rate';input.value=rates[c]??'';input.autocomplete='off';input.addEventListener('input',()=>{rates[c]=input.value;input.setCustomValidity('');document.querySelectorAll('#jeLinesBody tr').forEach(tr=>{if(getSelectedAccountInfo(tr.querySelector('.je-line-acc')?.value)?.currency===c&&window.JournalCalculator14387?.meta(tr)?.rateMode!=='manual')delete tr.dataset.fxRate14383})});input.addEventListener('blur',()=>{const n=parse(input.value);if(positive(n)){input.value=new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(n);rates[c]=input.value}else input.setCustomValidity('Enter a positive exchange rate.')});label.append(input);host.append(label)}}
function schedule(){if(!queued){queued=true;requestAnimationFrame(draw)}}
function attach(state){capture();const rows=[...document.querySelectorAll('#jeLinesBody tr')].filter(r=>getSelectedAccountInfo(r.querySelector('.je-line-acc')?.value)&&(parse(r.querySelector('.je-line-dr')?.value)>0||parse(r.querySelector('.je-line-cr')?.value)>0));let i=0;for(const [date,g] of Object.entries(state.grouped))for(const l of g.lines){const row=rows.find(r=>!r._fxUsed14383&&getSelectedAccountInfo(r.querySelector('.je-line-acc')?.value)?.id===l.account?.id&&(!r.querySelector('.je-line-date')?.value||r.querySelector('.je-line-date').value===date||!$('jeMultipleDates')?.checked))||rows[i];if(row)row._fxUsed14383=true;i++;l.fx_rate_lak=lineRate(row,l.currency);l.book_rate_lak=positive(row?.dataset.bookRate14383)?Number(row.dataset.bookRate14383):null;if(l.currency!=='LAK'&&!positive(l.fx_rate_lak))state.errors.push(`Enter LAK per 1 ${l.currency} before posting.`)}rows.forEach(r=>delete r._fxUsed14383);return state}
function base(line,side){const c=line.currency||line.currency_code;if(c==='LAK')return round(Number(line[side]||0));const stored=line['base_'+side];if(stored!==null&&stored!==undefined&&Number.isFinite(Number(stored)))return Number(stored);if(!Number(line[side]||0))return 0;const r=line.book_rate_lak||line.fx_rate_lak;return positive(r)?round(Number(line[side]||0)*Number(r)):null}
function carrying(accountId,date){const ws=window.yearWindow14333?.state();let qty=0,value=0,missing=false;for(const b of ws?.opening||[])if(String(b.accountId)===String(accountId)){qty+=Number(b.balance);if(b.base_balance==null&&b.currency!=='LAK')missing=true;else value+=Number(b.currency==='LAK'?b.balance:b.base_balance)}for(const l of JournalModule.entries){if(String(l.accountId)!==String(accountId)||l.date>date||l.id===JournalModule.editingEntryId||l.pendingSync||l.local14333||l.voided_at||(l.status&&l.status!=='posted'))continue;qty+=Number(l.debit)-Number(l.credit);const d=base(l,'debit'),c=base(l,'credit');if(d===null||c===null)missing=true;else value+=d-c}return !missing&&qty>0&&value>0?{quantity:qty,value:round(value),rate:value/qty}:null}
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

/* Phase 2: recorded fund valuation, without rewriting historical journal amounts. */
(()=>{'use strict';
const esc=v=>escapeHtml(String(v??'')), num=v=>Number(v)||0;
const rateText=v=>Number.isFinite(v)&&v>0?new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(v):'—';
const posting=a=>a.isPosting!==false&&a.is_posting!==false;
function form(prefix,checked){
 const currency=document.getElementById(prefix==='acc'?'accCurrency':'subCurrency'),host=document.getElementById(prefix==='acc'?'formAccount':'formSubAccount');if(!host||!currency)return;
 const id=prefix+'TrackForeignFunds14386';let input=document.getElementById(id);
 if(!input){const box=document.createElement('div');box.className='settings-field';box.innerHTML=`<label><input type="checkbox" id="${id}"> Track foreign-currency funds</label><details><summary aria-label="About foreign-currency fund tracking">(?) Help</summary><p>For a foreign-currency asset account such as cash or bank. Shows the original balance, recorded LAK carrying value, and average carrying rate (LAK value ÷ foreign balance). Each account is tracked separately. Transfers retain their saved carrying rates. Missing valuations are flagged; enabling this option does not change past entries. Parent accounts sum their children and need no checkbox.</p></details>`;currency.closest('.settings-form-grid,.sub-parent-currency1436').after(box);input=document.getElementById(id);}
 if(checked!==undefined)input.checked=!!checked;
 const parent=AccountingStore.accounts.find(a=>a.code===document.getElementById('subParentCode')?.value);
 const type=prefix==='acc'?document.getElementById('accType')?.value:parent?.baseType||parent?.type;
 const allowed=!!currency.value&&!['LAK','NA','__PARENT__'].includes(currency.value)&&type==='ASSET'&&(prefix!=='acc'||document.getElementById('accPurpose71')?.value==='regular')&&!(prefix==='sub'&&parent?.isTechnical);
 input.disabled=!allowed;if(!allowed)input.checked=false;
}
document.addEventListener('change',e=>{if(['accCurrency','accType','accPurpose71'].includes(e.target.id))form('acc');if(['subCurrency','subParentCode'].includes(e.target.id))form('sub');});
function lineRateText(l){const c=l.originalCurrency||l.currency||l.currency_code;if(c==='LAK')return '1';const amount=num(l.debit)-num(l.credit),d=JournalFX14383.base(l,'debit'),cr=JournalFX14383.base(l,'credit');const saved=Number(l.book_rate_lak||l.fx_rate_lak);const r=saved>0?saved:amount&&d!==null&&cr!==null?(d-cr)/amount:null;return rateText(r)+' LAK / '+c+(l.book_rate_lak?' · carrying':'');}
function original(r){return r.original||r}
function descendants(rows,parent){const byCode=new Map(AccountingStore.accounts.map(a=>[a.code,a]));return rows.filter(r=>{if(!posting(r.account))return false;let a=r.account;const seen=new Set([a.code]);while(a?.parentCode&&!seen.has(a.parentCode)){if(a.parentCode===parent.code)return true;seen.add(a.parentCode);a=byCode.get(a.parentCode)}return false})}
function select(rows,key){if(!key)return rows;const target=rows.find(r=>r.key===key);return target&&!posting(target.account)?descendants(rows,target.account):rows.filter(r=>r.key===key);}
function hierarchy(rows){
 // Subtotals are display rows only. Financial metrics always use the leaf rows.
 const leaves=rows.filter(r=>posting(r.account)),parents=AccountingStore.accounts.filter(a=>!posting(a)),result=[],emitted=new Set();
 function emit(parent,depth,path){if(path.has(parent.code))return;const children=descendants(leaves,parent);if(!children.length)return;const next=new Set(path).add(parent.code),total={...children[0],account:{...parent,name:'\u00a0'.repeat(depth*3)+parent.name+' — subtotal'},lines:[],isSubtotal14386:true};for(const k of ['opening','debit','credit','closing','baseOpening','baseDebit','baseCredit','baseClosing','missingRates'])total[k]=children.reduce((n,r)=>n+num(r[k]),0);result.push(total);for(const p of parents.filter(a=>a.parentCode===parent.code))emit(p,depth+1,next);for(const r of children.filter(r=>r.account.parentCode===parent.code)){if(emitted.has(r.key))continue;emitted.add(r.key);result.push({...r,account:{...r.account,name:'\u00a0'.repeat((depth+1)*3)+r.account.name}})}}
 for(const p of parents.filter(p=>!parents.some(a=>a.code===p.parentCode)))emit(p,0,new Set());
 for(const r of leaves)if(!emitted.has(r.key))result.push(r);
 return result;
}
function average(r){const o=original(r);if(r.missingRates)return 'Valuation incomplete';if(!r.account.trackForeignFunds)return '—';if(o.closing<0||r.baseClosing<0)return 'Negative balance — review';if(!o.closing)return r.baseClosing?'Residual LAK value — review':'—';return rateText(r.baseClosing/o.closing)+' LAK / '+(r.sourceCurrency||r.currency);}
function detailRows(rows){
 const leaves=rows.filter(r=>posting(r.account)),values=[];
 for(const p of AccountingStore.accounts.filter(a=>!posting(a))){const children=descendants(leaves,p).filter(r=>{const o=original(r);return o.opening||o.debit||o.credit});if(!children.length)continue;const currencies=new Map();for(const r of children){const c=r.sourceCurrency||r.currency;currencies.set(c,(currencies.get(c)||0)+original(r).closing)}const missing=children.reduce((n,r)=>n+r.missingRates,0);values.push([p.code+' — '+p.name+' (subtotal)',[...currencies].map(([c,v])=>c+' '+balanceText69(v)).join('; '),missing?'Valuation incomplete':balanceText69(children.reduce((n,r)=>n+r.baseClosing,0)),currencies.size===1&&children.every(r=>r.account.trackForeignFunds)&&!missing&&[...currencies.values()][0]>0?rateText(children.reduce((n,r)=>n+r.baseClosing,0)/[...currencies.values()][0])+' LAK / '+[...currencies.keys()][0]:'Separate child rates']);
 for(const r of children)values.push([r.account.code+' — '+r.account.name,(r.sourceCurrency||r.currency)+' '+balanceText69(original(r).closing),r.missingRates?'Valuation incomplete':balanceText69(r.baseClosing),average(r)]);
 }
 for(const r of leaves.filter(r=>r.account.trackForeignFunds&&!r.account.parentCode))values.push([r.account.code+' — '+r.account.name,(r.sourceCurrency||r.currency)+' '+balanceText69(original(r).closing),r.missingRates?'Valuation incomplete':balanceText69(r.baseClosing),average(r)]);
 return values;
}
const headers=['Account / parent','Original closing balance','Recorded closing LAK','Average carrying rate'];
const note='Parent subtotals sum each descendant posting account once. Original currencies remain separate; there is no mixed-currency average. Recorded LAK = opening LAK + recorded debits − recorded credits. A tracked fund’s average carrying rate = recorded closing LAK ÷ original closing balance. Use the General Ledger for each saved transaction/carrying rate. These are recorded values, not current market valuations. Parent and child rows are explanatory and must not be added together.';
function reportDetails(rows,kind){let selected=rows;if(['pl','expense'].includes(kind))selected=rows.filter(r=>['REVENUE','EXPENSE'].includes(r.account.baseType||r.account.type));if(kind==='bs')selected=rows.filter(r=>['ASSET','LIABILITY','EQUITY'].includes(r.account.baseType||r.account.type));if(['cf','payroll'].includes(kind))selected=rows.filter(r=>Reports79[kind==='cf'?'cash':'payroll'].includes(r.key));if(['gl','activity'].includes(kind)&&Reports79.account)selected=select(rows,Reports79.account);const values=detailRows(selected);return values.length?{currency:'Recorded valuation detail',headers,values,metrics:[],note}:null;}
function html(rows){const values=detailRows(rows);return values.length?'<h4>Recorded valuation detail</h4><div class="table-container"><table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+values.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="report-note69">'+esc(note)+'</p>':'';}
window.ForeignFunds14386={form,select,hierarchy,descendants,average,lineRateText,reportDetails,detailRows,html};
})();

;

/* Explicit transaction calculations; saved amounts/rates are never silently revalued. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>escapeHtml(String(v??'')),round=n=>Math.round((n+Number.EPSILON)*100)/100;
const kinds=['Normal','Income','Expense','Transfer','Currency Exchange'];
const roles={input:'Input / unchanged',received:'Fund received',paid:'Fund paid',offset:'Foreign system offset',mapping:'LAK system mapping',income:'Income recognized',expense:'Expense recognized',fx:'Exchange gain / loss'};
let kind='Normal',busy=false,queued=false,problems=[],details=[],hold=false,frozen=false;
const num=v=>parseAppNumber(String(v??''))||0;
const tracked=a=>a?.trackForeignFunds===true;
const derived=(role,type)=>['offset','mapping','income','expense','fx'].includes(role)&&type!=='Transfer'||role==='received'&&['Transfer','Currency Exchange'].includes(type);
function meta(row){try{return JSON.parse(row.dataset.calculation14387||'null')}catch{return null}}
function setMeta(row,value){if(value)row.dataset.calculation14387=JSON.stringify(value);else delete row.dataset.calculation14387}
function infer(a,dr,cr,type){if(!a||type==='Normal')return 'input';if(a.currency==='LAK'&&String(a.code)==='5419')return 'fx';if(a.isTechnical||a.type==='SYSTEM')return a.currency==='LAK'?'mapping':'offset';if((a.baseType||a.type)==='ASSET'){if(cr)return 'paid';if(dr)return 'received';return type==='Expense'?'paid':type==='Income'?'received':'input'}if(a.currency==='LAK'&&(a.baseType||a.type)==='REVENUE')return 'income';if(a.currency==='LAK'&&(a.baseType||a.type)==='EXPENSE')return 'expense';return 'input'}
function read(){return [...$('jeLinesBody')?.rows||[]].map((row,index)=>{const a=getSelectedAccountInfo(row.querySelector('.je-line-acc')?.value),dr=num(row.querySelector('.je-line-dr')?.value),cr=num(row.querySelector('.je-line-cr')?.value),m=meta(row)||{};return {row,index,a,dr,cr,date:($('jeMultipleDates')?.checked?row.querySelector('.je-line-date')?.value:'')||$('jeTransDate')?.value,role:m.role||infer(a,dr,cr,kind),mode:m.mode||'auto',rateMode:m.rateMode||'auto',fx:JournalFX14383.lineRate(row,a?.currency),book:Number(row.dataset.bookRate14383)||null,invalidRate:row.dataset.invalidRate14387==='1'}})}
function holding(a,date){
 const windowState=window.yearWindow14333?.state();if(windowState?.from&&date<windowState.from)throw Error('Load the journal year for '+date+' before calculating carrying values.');
 const editing=JournalModule.entries.find(l=>l.id===JournalModule.editingEntryId),earlier=l=>!editing||l.date<editing.date||l.date===editing.date&&(String(l.created_at||'')<String(editing.created_at||'')||l.created_at===editing.created_at&&String(l.id).localeCompare(String(editing.id),undefined,{numeric:true})<0);
 const rows=JournalModule.entries.filter(l=>String(l.accountId)===String(a.id)&&l.date<=date&&l.id!==JournalModule.editingEntryId&&earlier(l)&&!l.voided_at&&(!l.status||l.status==='posted'));
 if(rows.some(l=>l.pendingSync||l.local14333))throw Error(a.name+': synchronize earlier pending fund entries before calculating.');
 let quantity=0,value=0;const refs=[];for(const b of windowState?.opening||[])if(String(b.accountId)===String(a.id)){quantity+=Number(b.balance);if(b.base_balance==null&&b.currency!=='LAK')throw Error(a.name+': opening LAK valuation is missing.');value+=Number(b.currency==='LAK'?b.balance:b.base_balance);refs.push('Opening balance');}
 for(const l of rows){const d=JournalFX14383.base(l,'debit'),c=JournalFX14383.base(l,'credit');if(d==null||c==null)throw Error(a.name+': rate missing in '+l.id);quantity+=Number(l.debit)-Number(l.credit);value+=d-c;refs.push(l.id)}
 return {quantity:round(quantity),value:round(value),refs:[...new Set(refs)]};
}
// Pure arithmetic planner used by the UI and regression tests. Amounts are original units.
function plan(type,source,getHolding){
 const rows=source.map(r=>({...r})),errors=[],notes=[],deltas=new Map();if(type==='Normal')return {rows,errors,notes};
 const groups=new Map();for(const r of rows.filter(r=>r.a)){if(!groups.has(r.date))groups.set(r.date,[]);groups.get(r.date).push(r)}
 const error=m=>{if(!errors.includes(m))errors.push(m)};
 const set=(r,dr,cr)=>{r.suggested={dr:round(dr),cr:round(cr)};r.calculated=true;if(r.mode!=='manual'){r.dr=r.suggested.dr;r.cr=r.suggested.cr}};
 const one=(g,role,c,required=true)=>{const found=g.filter(r=>r.role===role&&(!c||r.a.currency===c));if(found.length!==1){if(required)error('Choose exactly one '+roles[role]+(c?' in '+c:'')+' for '+g[0].date+'. Use Calculation details to assign roles.');return null}return found[0]};
 const tx=r=>r.a.currency==='LAK'?1:r.fx>0?r.fx:(error(r.a.name+': enter a positive transaction rate.'),null);
 const book=r=>{if(r.a.currency==='LAK')return 1;if(!tracked(r.a)){error(r.a.name+': enable Track foreign-currency funds in Accounts.');return null}try{const h=getHolding(r.a,r.date),delta=deltas.get(r.a.id)||{quantity:0,value:0};const qty=round(h.quantity+delta.quantity),value=round(h.value+delta.value),amount=r.cr;if(qty<=0||value<=0||amount>qty+.000001){error(r.a.name+': insufficient or unvalued funds for '+r.date+'.');return null}const rate=r.rateMode==='manual'&&r.book>0?r.book:value/qty;notes.push({date:r.date,account:r.a.name,quantity:qty,value,rate,amount,lak:round(amount*rate),refs:h.refs||[]});return rate}catch(e){error(e.message);return null}};
 const applyRate=(r,f,b=null)=>{if(f!=null)r.fx=f;if(r.rateMode!=='manual')r.book=b;else if(b==null)r.book=null};
 const foreignOffsets=(g,funds,side)=>{const currencies=[...new Set(funds.map(r=>r.a.currency).filter(c=>c!=='LAK'))];for(const c of currencies){const fs=funds.filter(r=>r.a.currency===c),r=one(g,'offset',c);if(!r)continue;const amount=round(fs.reduce((n,r)=>n+(side==='received'?r.dr:r.cr),0)),value=round(fs.reduce((n,r)=>n+(side==='received'?r.dr:r.cr)*(r.book||r.fx||0),0));set(r,side==='paid'?amount:0,side==='received'?amount:0);applyRate(r,amount?value/amount:tx(fs[0]),side==='paid'&&amount?value/amount:null)}};
 for(const [date,g] of [...groups].sort(([a],[b])=>String(a).localeCompare(String(b)))){
  const startErrors=errors.length;for(const r of g){if(['offset','mapping','income','expense','fx'].includes(r.role)&&type!=='Transfer')set(r,0,0);if(['Transfer','Currency Exchange'].includes(type)&&r.role==='received'&&r.mode!=='manual')set(r,0,0);}
  if(type==='Income'){
   const received=g.filter(r=>r.role==='received'&&r.dr>0);let total=0,foreign=0;for(const r of received){const rate=tx(r);if(rate==null)continue;applyRate(r,rate);const value=round(r.dr*rate);total+=value;if(r.a.currency!=='LAK')foreign+=value;}
   if(received.length){const income=one(g,'income','LAK');if(income)set(income,0,total);if(foreign){const map=one(g,'mapping','LAK');if(map)set(map,foreign,0)}foreignOffsets(g,received,'received');}
  }else if(type==='Expense'){
   const paid=g.filter(r=>r.role==='paid'&&r.cr>0);let cost=0,foreignBook=0,totalBook=0;for(const r of paid){const rate=tx(r),carrying=book(r);if(rate==null||carrying==null)continue;applyRate(r,rate,carrying);cost+=round(r.cr*rate);totalBook+=round(r.cr*(r.book||carrying));if(r.a.currency!=='LAK')foreignBook+=round(r.cr*(r.book||carrying));}
   if(paid.length){const expense=one(g,'expense','LAK');if(expense)set(expense,cost,0);if(paid.some(r=>r.a.currency!=='LAK')){const map=one(g,'mapping','LAK');if(map)set(map,0,foreignBook)}const difference=round(cost-totalBook),fx=one(g,'fx','LAK',difference!==0);if(fx)set(fx,Math.max(-difference,0),Math.max(difference,0));foreignOffsets(g,paid,'paid');}
  }else if(type==='Transfer'){
   const from=one(g,'paid'),to=one(g,'received');if(from&&to){if(from.a.id===to.a.id||from.a.currency!==to.a.currency)error('Transfer needs two different fund accounts in the same currency.');else if(from.cr>0){const rate=book(from);if(rate!=null){set(to,from.cr,0);applyRate(from,rate,rate);applyRate(to,rate,rate);if(Math.abs(to.dr-from.cr)>.001||(to.book||to.fx)!==(from.book||from.fx))error('Transfer amounts and carrying rates must match.');}}}
   if(g.some(r=>!['paid','received'].includes(r.role)&&(r.dr||r.cr)))error('Transfer uses fund accounts only. Remove mapping and gain/loss amounts.');
  }else if(type==='Currency Exchange'){
   const from=one(g,'paid'),to=one(g,'received');if(from&&to&&from.cr>0){if(from.a.id===to.a.id||from.a.currency===to.a.currency)error('Currency Exchange needs two different currencies.');else{const rateOut=tx(from),rateIn=tx(to),carry=book(from);if(rateOut&&rateIn&&carry){set(to,from.cr*rateOut/rateIn,0);applyRate(from,rateOut,carry);applyRate(to,rateIn);const given=round(from.cr*(from.book||carry)),received=round(to.dr*rateIn);foreignOffsets(g,[from],'paid');foreignOffsets(g,[to],'received');const map=one(g,'mapping','LAK'),mapping=round((to.a.currency==='LAK'?0:received)-(from.a.currency==='LAK'?0:given));if(map)set(map,Math.max(mapping,0),Math.max(-mapping,0));const difference=round(received-given),fx=one(g,'fx','LAK',difference!==0);if(fx)set(fx,Math.max(-difference,0),Math.max(difference,0));notes.push({date,account:'Currency exchange',amount:from.cr,rate:rateOut/rateIn,lak:received,refs:['Expected receipt '+round(from.cr*rateOut/rateIn)+' '+to.a.currency,'Recorded source LAK '+given,'Exchange difference '+difference]});}}}
  }
  if(errors.length===startErrors)for(const r of g.filter(r=>['paid','received'].includes(r.role))){const d=deltas.get(r.a.id)||{quantity:0,value:0};d.quantity=round(d.quantity+r.dr-r.cr);d.value=round(d.value+round((r.dr-r.cr)*(r.book||r.fx||1)));deltas.set(r.a.id,d)}
 }
 return {rows,errors,notes};
}
function compact(rate,c){return c!=='LAK'&&rate>0?new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(rate)+' '+currencySymbolV6('LAK')+'/'+currencySymbolV6(c):'—'}
function ensure(){const grid=$('journalEntry98')?.querySelector('.je-meta-grid');if(!grid)return;grid.classList.add('has-calculator14387');let field=$('journalType14387');if(!field){const label=document.createElement('label');label.className='journal-type14387';label.innerHTML='Transaction Type<select id="journalType14387" data-plain14285 class="je-select">'+kinds.map(k=>'<option>'+esc(k)+'</option>').join('')+'</select>';grid.append(label);field=$('journalType14387');field.onchange=()=>setKind(field.value,true)}field.value=kind;field.disabled=!!window.personalJournal1437?.active;field.title=field.disabled?'Automatic calculations are available in the main journal.':'';const entryToggle=$('jeEntryMode1430');if(entryToggle){entryToggle.disabled=kind!=='Normal';entryToggle.title=kind!=='Normal'?'Select Normal to use Single Entry. Automatic calculations use Double Entry.':'Switch between Single Entry and Double Entry'}
 let host=$('journalCalculation14387');if(!host){host=document.createElement('section');host.id='journalCalculation14387';host.innerHTML='<div class="calc-status14387" role="status"></div><details><summary>Calculation details</summary><div class="calc-details14387"></div></details>';const table=$('jeLinesBody')?.closest('.table-container');if(table)table.after(host);else $('journalEntry98').append(host)}host.hidden=false;host.classList.toggle('calc-normal14389',kind==='Normal');const badge=$('jeBalanceIndicator');if(badge&&badge.parentElement!==host)host.prepend(badge);

}
function render(result){const host=$('journalCalculation14387');if(!host)return;host.querySelector('.calc-status14387').textContent=result.errors[0]||'Auto calculations are shown below. Edit any calculated amount or rate to keep a manual override.';host.classList.toggle('calc-error14387',!!result.errors.length);const detail=host.querySelector('.calc-details14387');const signature=JSON.stringify([kind,result.rows.map(r=>[r.a?.id,r.role,r.mode,r.rateMode,r.suggested]),result.notes]);if(detail.dataset.signature===signature)return;detail.dataset.signature=signature;
 detail.innerHTML='<p>Roles apply only to the current entry. Enter actual amounts on fund rows. Each date balances separately.</p><div class="table-container"><table><thead><tr><th>Account</th><th>Calculation role</th><th>Mode / suggested amounts</th><th>Action</th></tr></thead><tbody>'+result.rows.filter(r=>r.a).map(r=>'<tr><td>'+esc(r.a.name)+'</td><td><select data-plain14285 data-calc-role="'+r.index+'">'+Object.entries(roles).map(([v,t])=>'<option value="'+v+'" '+(r.role===v?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></td><td>'+esc(r.mode==='manual'||r.rateMode==='manual'?'Manual':'Auto / input')+(r.suggested?' · '+formatAppNumber(r.suggested.dr)+' / '+formatAppNumber(r.suggested.cr):'')+'</td><td><button type="button" class="je-btn je-btn-secondary" data-calc-restore="'+r.index+'">Restore Auto</button></td></tr>').join('')+'</tbody></table></div>'+result.notes.map(n=>'<p><strong>'+esc(n.account)+'</strong> · '+esc(formatAppDate(n.date))+(n.quantity!=null?' · '+formatAppNumber(n.value)+' LAK ÷ '+formatAppNumber(n.quantity)+' = '+esc(n.rate):'')+' · '+formatAppNumber(n.amount)+' × '+esc(n.rate)+' = '+formatAppNumber(n.lak)+' LAK<br><small>Supporting records: '+esc(n.refs.join(', ')||'None')+'</small></p>').join('');
}
function recalculate(){if(busy||hold)return;busy=true;try{ensure();if(window.personalJournal1437?.active&&kind!=='Normal'){kind='Normal';ensure()}const result=plan(kind,read(),holding);for(const r of result.rows)if(r.invalidRate)result.errors.push((r.a?.name||'Line '+(r.index+1))+': enter a positive rate or choose Restore Auto.');problems=frozen?[]:result.errors;details=result.notes;for(const r of result.rows){if(kind!=='Normal')setMeta(r.row,{type:kind,role:r.role,mode:r.mode,rateMode:r.rateMode});if(result.errors.length||frozen)continue;if(r.calculated){r.row.dataset.autoAmount14387='1';if(r.mode!=='manual'){r.row.querySelector('.je-line-dr').value=r.dr?formatAppNumber(r.dr):'';r.row.querySelector('.je-line-cr').value=r.cr?formatAppNumber(r.cr):''}}if(kind!=='Normal'){r.row.dataset.fxRate14383=r.fx||'';r.row.dataset.bookRate14383=r.book||''}}render(result);if(frozen)$('journalCalculation14387').querySelector('.calc-status14387').textContent='Saved amounts and rates retained. Change an amount/rate or choose Restore Auto to recalculate.';ensure();}finally{busy=false}}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;recalculate();window.calculateJournalBalance?.()})}
function setKind(value,changed=false){frozen=false;kind=kinds.includes(value)?value:'Normal';if(kind!=='Normal')window.entry1430?.setMode('double');if(changed)for(const row of $('jeLinesBody')?.rows||[]){setMeta(row,null);delete row.dataset.autoAmount14387;delete row.dataset.invalidRate14387;delete row.dataset.bookRate14383;delete row.dataset.fxRate14383}ensure();schedule()}
function restore(value){frozen=true;kind=kinds.includes(value)?value:'Normal';if(kind!=='Normal')window.entry1430?.setMode('double');ensure();}
function attach(state){state.errors.push(...problems);for(const [date,g] of Object.entries(state.grouped)){const matches=read().filter(r=>r.date===date&&(r.dr>0||r.cr>0));g.lines.forEach((line,i)=>{const m=meta(matches[i]?.row||{dataset:{}});if(m)line.calculation14387=m})}return state}
function ready(){ensure();const collect=window.collectLiveJournalGroups;window.collectLiveJournalGroups=function(...args){recalculate();return attach(collect.apply(this,args))};const clear=window.clearJournalEntry;window.clearJournalEntry=function(...args){hold=true;try{kind='Normal';frozen=false;return clear.apply(this,args)}finally{hold=false;ensure();schedule()}};
 const card=$('journalEntry98');card?.addEventListener('input',e=>{if(busy)return;if(e.target.matches('.je-line-acc,.je-line-dr,.je-line-cr,[data-fx-rate14383]'))frozen=false;const row=e.target.closest('#jeLinesBody tr');if(row){const m=meta(row)||{type:kind,role:infer(getSelectedAccountInfo(row.querySelector('.je-line-acc')?.value),num(row.querySelector('.je-line-dr')?.value),num(row.querySelector('.je-line-cr')?.value),kind),mode:'auto',rateMode:'auto'};if(e.target.matches('.je-line-acc')){setMeta(row,null);delete row.dataset.bookRate14383;delete row.dataset.fxRate14383;delete row.dataset.autoAmount14387}else if(e.target.matches('.je-line-dr,.je-line-cr')&&(row.dataset.autoAmount14387||derived(m.role,kind))){m.mode='manual';setMeta(row,m)}}if(e.target.matches('[data-fx-rate14383]'))for(const r of read())if(r.a?.currency===e.target.dataset.fxRate14383&&r.rateMode==='manual')r.row.dataset.fxRate14383=r.fx||'';if(e.target.matches('.je-line-acc,.je-line-dr,.je-line-cr,[data-fx-rate14383]'))schedule()});
 card?.addEventListener('change',e=>{if(e.target.matches('[data-calc-role]')){frozen=false;const r=read()[Number(e.target.dataset.calcRole)];setMeta(r.row,{type:kind,role:e.target.value,mode:'auto',rateMode:r.rateMode});schedule()}else if(e.target.matches('#jeTransDate,.je-line-date,#jeMultipleDates')){frozen=false;schedule()}});
 card?.addEventListener('click',e=>{const button=e.target.closest('[data-calc-restore]');if(!button)return;frozen=false;const r=read()[Number(button.dataset.calcRestore)];setMeta(r.row,{type:kind,role:r.role,mode:'auto',rateMode:'auto'});delete r.row.dataset.bookRate14383;delete r.row.dataset.fxRate14383;delete r.row.dataset.invalidRate14387;schedule()});
 new MutationObserver(schedule).observe($('jeLinesBody'),{childList:true});window.addEventListener('page113',schedule);
}
window.JournalCalculator14387={plan,read,holding,recalculate,setKind,restore,meta,setMeta,compact,get type(){return kind},get errors(){return [...problems]},get details(){return details}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();

;

/* One entry menu shared by active journal, review and history. */
(()=>{'use strict';
let menu=null,anchor=null;const actions=new WeakMap();
function close(focus=false){menu?.remove();menu=null;if(focus&&anchor?.isConnected)anchor.focus();anchor=null}
function open(row,event){const body=row.closest('tbody'),id=row.dataset.entryId,entry=actions.get(body)?.get(id);if(!entry)return;close();anchor=[...body.querySelectorAll('[data-entry-menu14387]')].find(b=>b.dataset.entryMenu14387===id)||row;menu=document.createElement('div');menu.className='journal-entry-menu14387';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Journal '+id+' actions');const label=document.createElement('strong');label.textContent=id;menu.append(label);for(const button of entry){button.setAttribute('role','menuitem');menu.append(button)}document.body.append(menu);const box=anchor.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(event?event.clientX+6:box.left,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(event?event.clientY+6:box.bottom+4,innerHeight-menu.offsetHeight-8))+'px';menu.querySelector('button:not(:disabled)')?.focus()}
function decorate(body,records=[],personal=false){if(!body)return;const map=new Map();body.closest('table')?.classList.add('journal-no-actions14388');for(const row of body.querySelectorAll('tr[data-entry-id]')){const id=row.dataset.entryId;row.tabIndex=0;row.setAttribute('aria-label','Journal '+id+'; Enter for actions');if(map.has(id))continue;const host=row.querySelector('.transaction-review-actions');if(!host)continue;const buttons=[...host.querySelectorAll('button')];if(personal){const root=body.closest('#personalWorkspace1437');for(const button of buttons)button.onclick=()=>{const event=new MouseEvent('click',{bubbles:true});const proxy=button.cloneNode(true);proxy.hidden=true;root.append(proxy);proxy.dispatchEvent(event);proxy.remove();};}else{const view=document.createElement('button');view.type='button';view.className='je-btn je-btn-secondary';view.textContent='View entry';view.onclick=()=>showJournalSource69(encodeURIComponent(id));buttons.unshift(view);}const label=host.parentElement.querySelector(':scope>span');const trigger=document.createElement('button');trigger.type='button';trigger.className='entry-menu-trigger14387';trigger.dataset.entryMenu14387=id;trigger.setAttribute('aria-label','Actions for '+(label?.textContent||id));trigger.setAttribute('aria-haspopup','menu');trigger.title='View entry actions';if(label)trigger.append(...label.childNodes);else trigger.textContent=id;label?.replaceWith(trigger);host.remove();map.set(id,buttons)}actions.set(body,map)}
function ready(){const render=window.renderTransactionReviewTable;window.renderTransactionReviewTable=function(body,records,...args){close();const result=render.call(this,body,records,...args);decorate(body,records);return result};document.addEventListener('click',e=>{const trigger=e.target.closest('[data-entry-menu14387]');if(trigger){e.stopPropagation();open(trigger.closest('tr'));return}if(menu?.contains(e.target)){if(e.target.closest('button'))close();return}if(menu)close()});document.addEventListener('dblclick',e=>{if(e.target.closest('button,input,select,a'))return;const row=e.target.closest('tr[data-entry-id]');if(row&&actions.has(row.closest('tbody')))open(row,e)});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu){e.preventDefault();close(true);return}if(menu&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){const buttons=[...menu.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();return}if(e.key==='Enter'&&e.target.matches('tr[data-entry-id]')){e.preventDefault();open(e.target)}});window.addEventListener('page113',()=>close());window.addEventListener('resize',()=>close());}
window.JournalEntryMenu14387={close,decorate};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
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
