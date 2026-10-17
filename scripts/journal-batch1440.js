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
function draw(){queued=false;const grid=document.querySelector('#journalEntry98 .je-meta-grid');if(!grid)return;let host=$('journalRates14383');if(!host){host=document.createElement('div');host.id='journalRates14383';host.className='journal-rates14383';const voucher=grid.querySelector('.voucher-pick14299');if(voucher)voucher.before(host);else grid.append(host)}const cs=currencies();host.hidden=!cs.length;grid.classList.toggle('has-fx14383',!!cs.length);for(const n of [...host.children])if(!cs.includes(n.dataset.currency))n.remove();for(const c of cs){if(host.querySelector(`[data-currency="${c}"]`))continue;const label=document.createElement('label');label.dataset.currency=c;label.textContent=`LAK / 1 ${c}`;const input=document.createElement('input');input.type='text';input.inputMode='decimal';input.className='je-input';input.dataset.fxRate14383=c;input.setAttribute('aria-label',`LAK per 1 ${c}`);input.placeholder='Rate';input.value=typeof rates[c]==='number'?new Intl.NumberFormat(appNumberLocale(),{useGrouping:false,maximumFractionDigits:8}).format(rates[c]):rates[c]??'';input.autocomplete='off';input.addEventListener('input',()=>{rates[c]=input.value;input.setCustomValidity('');document.querySelectorAll('#jeLinesBody tr').forEach(tr=>{if(getSelectedAccountInfo(tr.querySelector('.je-line-acc')?.value)?.currency===c)delete tr.dataset.fxRate14383})});input.addEventListener('blur',()=>{const n=parse(input.value);if(positive(n)){input.value=new Intl.NumberFormat(appNumberLocale(),{maximumFractionDigits:8}).format(n);rates[c]=input.value}else input.setCustomValidity('Enter a positive exchange rate.')});label.append(input);host.append(label)}}
function schedule(){if(!queued){queued=true;requestAnimationFrame(draw)}}
function attach(state){capture();const rows=[...document.querySelectorAll('#jeLinesBody tr')].filter(r=>getSelectedAccountInfo(r.querySelector('.je-line-acc')?.value)&&(parse(r.querySelector('.je-line-dr')?.value)>0||parse(r.querySelector('.je-line-cr')?.value)>0));let i=0;for(const [date,g] of Object.entries(state.grouped))for(const l of g.lines){const row=rows.find(r=>!r._fxUsed14383&&getSelectedAccountInfo(r.querySelector('.je-line-acc')?.value)?.id===l.account?.id&&(!r.querySelector('.je-line-date')?.value||r.querySelector('.je-line-date').value===date||!$('jeMultipleDates')?.checked))||rows[i];if(row)row._fxUsed14383=true;i++;l.fx_rate_lak=lineRate(row,l.currency);l.book_rate_lak=positive(row?.dataset.bookRate14383)?Number(row.dataset.bookRate14383):null;if(l.currency!=='LAK'&&!positive(l.fx_rate_lak))state.errors.push(`Enter LAK per 1 ${l.currency} before posting.`)}rows.forEach(r=>delete r._fxUsed14383);return state}
function base(line,side){const c=line.currency||line.currency_code;if(c==='LAK')return round(Number(line[side]||0));const stored=line['base_'+side];if(stored!==null&&stored!==undefined&&Number.isFinite(Number(stored)))return Number(stored);if(!Number(line[side]||0))return 0;const r=line.book_rate_lak||line.fx_rate_lak;return positive(r)?round(Number(line[side]||0)*Number(r)):null}
function carrying(accountId,date){const ws=window.yearWindow14333?.state();let qty=0,value=0,missing=false;for(const b of ws?.opening||[])if(String(b.accountId)===String(accountId)){qty+=Number(b.balance);if(b.base_balance==null&&b.currency!=='LAK')missing=true;else value+=Number(b.currency==='LAK'?b.balance:b.base_balance)}for(const l of JournalModule.entries){if(String(l.accountId)!==String(accountId)||l.date>date||l.id===JournalModule.editingEntryId||l.pendingSync||l.local14333||l.voided_at||(l.status&&l.status!=='posted'))continue;qty+=Number(l.debit)-Number(l.credit);const d=base(l,'debit'),c=base(l,'credit');if(d===null||c===null)missing=true;else value+=d-c}return !missing&&qty>0&&value>0?{quantity:qty,value:round(value),rate:value/qty}:null}
// Built-ins use the same editable, zero-amount journal structure as saved templates.
function templates(){
 const row=(code,currency,memo,legacy)=>({code:accounts().some(a=>a.code===code)?code:legacy||code,currency,memo});
 return [
 {id:'fx14383-income',builtin:true,name:'1. Foreign Currency Income Mapping',generalMemo:'Record sales received in LAK and foreign currencies, with income mapped to LAK.',lines:[
 row('1016','LAK','Total cash received in LAK'),
 row('4010','LAK','Total dine-in sales in LAK, including foreign-currency receipts'),
 row('9190','LAK','LAK equivalent of THB and USD sales received','9035'),
 row('1017','THB','Actual Thai baht cash received'),
 row('9101','THB','System offset for dine-in sales in THB','9031'),
 row('1018','USD','Actual US dollar cash received'),
 row('9102','USD','System offset for dine-in sales in USD','9033')]},
 {id:'fx14383-expense',builtin:true,name:'2. Foreign Currency Expense Mapping',generalMemo:'Record expenses paid in foreign currencies, with LAK mapping and exchange gain or loss.',lines:[
 row('9201','THB','System offset for cost of goods in THB','9032'),
 row('1017','THB','Actual Thai baht cash paid'),
 row('5010','LAK','Cost of goods purchased at the transaction-date LAK value'),
 row('9290','LAK','Recorded LAK value of foreign currency spent','9036'),
 row('5419','LAK','Realized exchange difference: debit loss or credit gain'),
 row('9202','USD','System offset for cost of goods in USD','9034'),
 row('1018','USD','Actual US dollar cash paid')]}
 ];
}
function openTemplate(kind){return applyTransactionTemplate('fx14383-'+kind)}
function ready(){const collect=window.collectLiveJournalGroups;window.collectLiveJournalGroups=function(...args){return attach(collect.apply(this,args))};const clear=window.clearJournalEntry;window.clearJournalEntry=function(...args){const out=clear.apply(this,args);restore({});return out};const card=$('journalEntry98');if(card){card.addEventListener('change',schedule);card.addEventListener('input',e=>{if(e.target.matches('.je-line-acc')){const row=e.target.closest('tr');if(row){delete row.dataset.fxRate14383;delete row.dataset.bookRate14383}}if(!e.target.matches('[data-fx-rate14383]'))schedule()});new MutationObserver(schedule).observe($('jeLinesBody'),{childList:true,subtree:true})}draw();window.addEventListener('page113',schedule)}
function compact(rate,c){return c!=='LAK'&&rate>0?new Intl.NumberFormat(appNumberLocale(),{maximumFractionDigits:8}).format(rate)+' '+currencySymbolV6('LAK')+'/'+currencySymbolV6(c):'—'}
window.JournalFX14383={compact,capture,restore,rate,lineRate,base,carrying,templates,openTemplate,round,positive};
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

/* Selection-based journal arithmetic. Display only: never assigns roles or writes amounts. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>escapeHtml(String(v??''));
const amountSelector='#jeLinesBody .je-line-dr,#jeLinesBody .je-line-cr';
const selected=new Set();
let selectedRate='',queued=false,drag=null,host,results,signature='',noticeTimer;
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const number=v=>{const text=String(v??'').trim();return text?parseAppNumber(text):0};
const money=n=>formatAppNumber(n),rateText=n=>new Intl.NumberFormat(appNumberLocale(),{maximumFractionDigits:8}).format(n);
const copyIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></svg>';
function copyButton(value,label){return '<button type="button" class="calc-copy14391" data-copy-number="'+esc(String(value))+'" aria-label="Copy '+esc(label)+'" title="Copy '+esc(label)+'">'+copyIcon+'</button>'}
function resultValue(value,currency,label){return '<strong>'+esc(money(value))+' '+esc(currency)+'</strong>'+copyButton(value,label)}
// Same-currency amounts are magnitudes; selected LAK cells are the comparison total.
function summarize(cells,rates,chosenCurrency=''){
 const totals={},errors=[];
 for(const c of cells){if(!c.currency||c.currency==='NA'){errors.push('Choose an account for every selected amount.');continue}if(!Number.isFinite(c.amount)||c.amount<0){errors.push('Selected amounts must be valid non-negative numbers.');continue}totals[c.currency]=(totals[c.currency]||0)+c.amount;}
 for(const c of Object.keys(totals))totals[c]=round(totals[c]);
 const foreign=Object.keys(totals).filter(c=>c!=='LAK');
 if(foreign.length>1)errors.push('Select one foreign currency at a time. USD and THB amounts cannot share one conversion.');
 const currency=foreign[0]||chosenCurrency;
 const rate=Number(rates[currency]),reverse=!foreign.length&&Object.hasOwn(totals,'LAK');
 if(!currency&&!errors.length)errors.push('Select a foreign amount or a matching exchange rate.');
 else if(!(Number.isFinite(rate)&&rate>0)&&!errors.length)errors.push('Enter a positive LAK per '+currency+' rate above.');
 const result={totals,currency,rate,reverse,errors:[...new Set(errors)],hasLak:Object.hasOwn(totals,'LAK')};
 if(!errors.length&&cells.length){result.source=reverse?totals.LAK:totals[currency];result.value=round(reverse?result.source/rate:result.source*rate);if(!Number.isFinite(result.value)){result.errors.push('The selected amounts are too large to calculate.');delete result.value}else if(!reverse&&result.hasLak)result.difference=round(result.value-totals.LAK);}
 return result;
}
function read(input){const row=input.closest('tr'),a=getSelectedAccountInfo(row?.querySelector('.je-line-acc')?.value);return {input,row,a,account:a?.name||'Choose account',currency:a?.currency,amount:input.dataset.numeric88?Number(input.value):number(input.value),side:input.matches('.je-line-dr')?'DR':'CR',date:($('jeMultipleDates')?.checked?row.querySelector('.je-line-date')?.value:'')||$('jeTransDate')?.value};}
function rates(){return Object.fromEntries(Object.keys(JournalFX14383.capture()).map(c=>[c,JournalFX14383.rate(c)]))}
function differenceHtml(value,lak){
 const difference=round(value-lak),sign=difference>0?'+':difference<0?'−':'',label=difference>0?'remaining':difference<0?'over':'matched';
 return '<span class="calc-line14391 calc-difference14391" data-difference="'+difference+'">Selected LAK: '+esc(money(lak))+' · Difference: <strong>'+sign+esc(money(Math.abs(difference)))+' LAK</strong> ('+label+')'+copyButton(difference,'signed difference')+'</span>';
}
function currencyGroup(currency,html){return '<section class="calc-currency14392" data-calculation-currency="'+esc(currency)+'">'+html+'</section>'}
function selectionHtml(cells){
 const foreign=[...new Set(cells.map(c=>c.currency).filter(c=>c&&c!=='LAK'))],groups=foreign.length?foreign:[selectedRate||'LAK'],columns=[],availableRates=rates();
 let total=0,complete=true;
 for(const currency of groups){
  const group=foreign.length?cells.filter(c=>c.currency===currency):cells;
  const s=summarize(group,availableRates,selectedRate),lines=[];
  if(s.errors.length){complete=false;lines.push('<span class="calc-warning14391">'+s.errors.map(esc).join(' ')+'</span>')}
  else if(s.value!==undefined){
   total+=s.value;
   lines.push('<span class="calc-line14391"><b>Selected '+esc(s.reverse?'LAK':s.currency)+' total</b> · '+esc(money(s.source))+' '+esc(s.reverse?'LAK':s.currency)+(s.reverse?' ÷ ':' × ')+esc(rateText(s.rate))+' LAK/'+esc(s.currency)+' = '+resultValue(s.value,s.reverse?s.currency:'LAK','converted total')+'</span>');
   const accounts=[];for(const c of group.filter(c=>c.currency!=='LAK'))accounts.push('<span class="calc-line14391 calc-muted14391">'+esc(c.account)+' · '+esc(c.side)+' '+esc(money(c.amount))+' '+esc(c.currency)+' × '+esc(rateText(s.rate))+' = '+resultValue(round(c.amount*s.rate),'LAK',c.account+' equivalent')+'</span>');
   lines.push('<div class="calc-accounts14394">'+accounts.join('<span class="calc-separator14394"> · </span>')+'</div>');
  }else complete=false;
  columns.push(currencyGroup(currency,lines.join('')));
 }
 const unknown=cells.some(c=>!c.currency);
 if(unknown){complete=false;columns.push('<span class="calc-warning14391">Choose an account for every selected amount.</span>')}
 const lak=cells.filter(c=>c.currency==='LAK'),validLak=lak.every(c=>Number.isFinite(c.amount)&&c.amount>=0);
 if(!validLak)columns.push('<span class="calc-warning14391">Selected LAK amounts must be valid non-negative numbers.</span>');
 if(complete&&validLak&&foreign.length&&lak.length)columns.push('<div class="calc-comparison14392">'+(foreign.length>1?'<span class="calc-line14391">Combined LAK equivalent: '+resultValue(round(total),'LAK','combined equivalent')+'</span>':'')+differenceHtml(round(total),lak.reduce((sum,c)=>sum+c.amount,0))+'</div>');
 return columns.join('');
}
function decorate(){
 for(const input of document.querySelectorAll(amountSelector)){
  const cell=input.closest('td');if(!cell)continue;
  cell.classList.add('calc-amount-cell14391');
  let pick=cell.querySelector('.calc-pick14391');
  if(!pick){pick=document.createElement('button');pick.type='button';pick.className='calc-pick14391';pick.textContent='✓';cell.append(pick)}
  pick._amount14391=input;
  const checked=selected.has(input),side=input.matches('.je-line-dr')?'Debit':'Credit';
  pick.setAttribute('aria-pressed',String(checked));pick.setAttribute('aria-label','Select '+side+' amount for calculation');pick.title=pick.getAttribute('aria-label');cell.classList.toggle('calc-selected14391',checked);
 }
}
function visible(){const card=$('journalEntry98');return !!card?.getClientRects().length&&document.documentElement.dataset.device132!=='phone'&&!window.personalJournal1437?.active&&!$('loginGate')?.matches(':not(.is-authenticated)')}
function layout(){
 if(!host)return;const show=!!selected.size&&!!signature&&visible();host.hidden=!show;document.body.classList.toggle('has-calculation14391',show);
 if(!show){document.documentElement.style.setProperty('--calculation-height14391','0px');return}
 const main=document.querySelector('.main-content-area');if(!main)return;
 if(!main.dataset.calcPadding14391){main.dataset.calcPadding14391='1';main.style.setProperty('--calc-original-padding14391',getComputedStyle(main).paddingBottom)}
 if(show){const left=Math.max(0,main.getBoundingClientRect().left);host.style.left=left+'px';document.documentElement.style.setProperty('--calculation-height14391',Math.ceil(host.getBoundingClientRect().height)+'px')}
 else document.documentElement.style.setProperty('--calculation-height14391','0px');
}
function render(){
 queued=false;if(!host)return;
 for(const n of selected)if(!n.isConnected||!n.matches(amountSelector))selected.delete(n);
 if(!visible()||window.entry1430?.mode==='single'){clear();return}
 decorate();
 const foreignSelected=[...selected].some(n=>read(n).currency!=='LAK');
 for(const input of document.querySelectorAll('[data-fx-rate14383]'))input.classList.toggle('calc-rate-selected14391',!foreignSelected&&selectedRate===input.dataset.fxRate14383);
 const html=selected.size?selectionHtml([...selected].map(read)):'';
 if(html!==signature){results.innerHTML=html;signature=html}
 results.hidden=!html;layout();
}
function refresh(){if(!queued){queued=true;requestAnimationFrame(render)}}
function clear(){for(const input of selected){input.closest('td')?.classList.remove('calc-selected14391');input.closest('td')?.querySelector('.calc-pick14391')?.setAttribute('aria-pressed','false')}selected.clear();selectedRate='';drag=null;signature='';if(results)results.replaceChildren();document.querySelectorAll('.calc-rate-selected14391').forEach(n=>n.classList.remove('calc-rate-selected14391'));clearTimeout(noticeTimer);if($('calcCopyStatus14391'))$('calcCopyStatus14391').textContent='';layout()}
function changed(){if(selected.size&&visible())refresh()}
function toggle(input){if(selected.has(input))selected.delete(input);else selected.add(input);refresh()}
async function copy(value,button){
 value=Number(value).toLocaleString(appNumberLocale(),{useGrouping:false,maximumFractionDigits:8});
 const active=document.activeElement,start=active?.selectionStart,end=active?.selectionEnd;
 try{
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);
  else{const field=document.createElement('textarea');field.value=value;field.style.cssText='position:fixed;left:-10000px;top:0';document.body.append(field);field.select();const ok=document.execCommand('copy');field.remove();active?.focus?.({preventScroll:true});if(start!=null)active.setSelectionRange?.(start,end);if(!ok)throw Error('copy unavailable')}
  $('calcCopyStatus14391').textContent='Copied';button.title='Copied';
 }catch{$('calcCopyStatus14391').textContent='Copy unavailable. Select the displayed result and copy manually.'}
 clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{$('calcCopyStatus14391').textContent=''},3500);
}
function ready(){
 if(!$('jeLinesBody'))return;
 host=document.createElement('section');host.id='journalCalculation14391';host.className='no-print';host.hidden=true;host.setAttribute('aria-label','Selected amount calculations');
 host.innerHTML='<div id="calcResults14391" aria-live="polite" aria-atomic="true"></div><span id="calcCopyStatus14391" role="status"></span>';
 document.body.append(host);results=$('calcResults14391');
 host.addEventListener('click',e=>{const b=e.target.closest('[data-copy-number]');if(b)void copy(b.dataset.copyNumber,b)});
 const card=$('journalEntry98'),body=$('jeLinesBody');
 card.addEventListener('input',changed);card.addEventListener('change',changed);
 // Rate controls can be moved into the journal header by the responsive layout.
 const chooseRate=e=>{if(selected.size&&visible()&&e.target.matches('[data-fx-rate14383]')){selectedRate=e.target.dataset.fxRate14383;refresh()}};
 document.addEventListener('focusin',chooseRate,true);document.addEventListener('click',chooseRate,true);
 document.addEventListener('input',e=>{if(e.target.matches('[data-fx-rate14383]'))changed()},true);
 body.addEventListener('click',e=>{const pick=e.target.closest('.calc-pick14391');if(pick){e.preventDefault();e.stopPropagation();toggle(pick._amount14391)}},true);
 document.addEventListener('pointerdown',e=>{
  if(e.button!==0||!(e.ctrlKey||e.metaKey)||!e.target.closest('#jeLinesBody')||!visible())return;
  if(host.contains(e.target)||e.target.closest('[data-fx-rate14383],#journalRates14383,.calc-pick14391'))return;
  const input=e.target.closest('#jeLinesBody td')?.querySelector('.je-line-dr,.je-line-cr');
  if(!input)return;
  const inputs=[...body.querySelectorAll('.je-line-dr,.je-line-cr')],start=inputs.indexOf(input),base=new Set(selected),add=!selected.has(input);
  e.preventDefault();if(add)selected.add(input);else selected.delete(input);
  if(e.pointerType!=='touch')drag={inputs,start,base,add};
  refresh();
 },true);
 document.addEventListener('pointermove',e=>{if(!drag)return;const input=document.elementFromPoint(e.clientX,e.clientY)?.closest('#jeLinesBody td')?.querySelector('.je-line-dr,.je-line-cr'),end=drag.inputs.indexOf(input);if(end<0||end===drag.start&&!drag.moved)return;drag.moved=true;e.preventDefault();window.getSelection()?.removeAllRanges();selected.clear();for(const n of drag.base)selected.add(n);const r1=Math.floor(drag.start/2),r2=Math.floor(end/2),c1=drag.start%2,c2=end%2;for(let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++)for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++){const n=drag.inputs[r*2+c];if(drag.add)selected.add(n);else selected.delete(n)}refresh()});
 document.addEventListener('pointerup',()=>{drag=null});document.addEventListener('pointercancel',()=>{drag=null});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selected.size)clear()});
 new MutationObserver(records=>{if(visible()&&records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeName==='TR'||n.nodeName==='INPUT')))refresh()}).observe(body,{childList:true,subtree:true});
 const reset=window.clearJournalEntry;window.clearJournalEntry=function(...args){clear();return reset.apply(this,args)};
 const editor=window.loadEntryForEdit;window.loadEntryForEdit=function(...args){clear();return editor.apply(this,args)};
 window.addEventListener('page113',()=>{if(visible())refresh();else if(selected.size)clear()});window.addEventListener('resize',layout);
 window.visualViewport?.addEventListener('resize',layout);
 new ResizeObserver(layout).observe(host);new ResizeObserver(layout).observe(document.querySelector('.main-content-area'));
 new MutationObserver(()=>{if(selected.size&&!visible())clear()}).observe(card,{attributes:true,attributeFilter:['hidden','class']});
 refresh();
}
window.JournalCalculation14391={summarize,refresh:changed,clear,get selected(){return [...selected].map(read)}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();

;

/* One entry menu shared by active journal, review and history. */
(()=>{'use strict';
let menu=null,anchor=null;const actions=new WeakMap();
function close(focus=false){menu?.remove();menu=null;if(focus&&anchor?.isConnected)anchor.focus();anchor=null}
function open(row,event){const body=row.closest('tbody'),id=row.dataset.entryId,entry=actions.get(body)?.get(id);if(!entry?.length)return;close();anchor=row;menu=document.createElement('div');menu.className='journal-entry-menu14387';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Journal '+id+' actions');const label=document.createElement('strong');label.textContent=id;menu.append(label);for(const button of entry){button.setAttribute('role','menuitem');menu.append(button)}document.body.append(menu);const box=anchor.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(event?event.clientX+6:box.left,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(event?event.clientY+6:box.bottom+4,innerHeight-menu.offsetHeight-8))+'px';menu.querySelector('button:not(:disabled)')?.focus()}
function decorate(body,records=[],personal=false){if(!body)return;const map=new Map();body.closest('table')?.classList.add('journal-no-actions14388');for(const row of body.querySelectorAll('tr[data-entry-id]')){const id=row.dataset.entryId;if(map.has(id))continue;const host=row.querySelector('.transaction-review-actions');if(!host)continue;const buttons=[...host.querySelectorAll('button')];if(personal){const root=body.closest('#personalWorkspace1437');for(const button of buttons)button.onclick=()=>{const event=new MouseEvent('click',{bubbles:true});const proxy=button.cloneNode(true);proxy.hidden=true;root.append(proxy);proxy.dispatchEvent(event);proxy.remove();};}else if(document.documentElement.dataset.device132==='tablet'){const view=document.createElement('button');view.type='button';view.className='je-btn je-btn-secondary';view.textContent='View entry';view.onclick=()=>showJournalSource69(encodeURIComponent(id));buttons.unshift(view);}const label=host.parentElement.querySelector(':scope>span');const trigger=document.createElement('span');trigger.className='entry-menu-trigger14387';trigger.dataset.entryMenu14387=id;if(buttons.length){trigger.setAttribute('aria-label','Actions for '+(label?.textContent||id));trigger.setAttribute('aria-haspopup','menu');trigger.title='Double-click this row for entry actions';}if(label)trigger.append(...label.childNodes);else trigger.textContent=id;label?.replaceWith(trigger);host.remove();map.set(id,buttons)}for(const row of body.querySelectorAll('tr[data-entry-id]')){if(map.get(row.dataset.entryId)?.length){row.tabIndex=0;row.setAttribute('aria-label','Journal '+row.dataset.entryId+'; Enter for actions')}else{row.removeAttribute('tabindex');row.removeAttribute('aria-label')}}actions.set(body,map)}
function ready(){const render=window.renderTransactionReviewTable;window.renderTransactionReviewTable=function(body,records,...args){close();const result=render.call(this,body,records,...args);decorate(body,records);return result};document.addEventListener('click',e=>{if(menu?.contains(e.target)){if(e.target.closest('button'))close();return}if(menu)close()});document.addEventListener('dblclick',e=>{if(e.target.closest('button,input,select,a'))return;const row=e.target.closest('tr[data-entry-id]');if(row&&actions.has(row.closest('tbody')))open(row,e)});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu){e.preventDefault();close(true);return}if(menu&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){const buttons=[...menu.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();return}if(e.key==='Enter'&&e.target.matches('tr[data-entry-id]')){e.preventDefault();open(e.target)}});window.addEventListener('page113',()=>close());window.addEventListener('resize',()=>close());}
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
const wholeView='#transactions-recurring,#userEntryHistoryPanel,#userEntryReviewCards,#finalRecordsOverlay,#budgetHistory14316,#transactions-voided,#auditDetails14361';
function install(table){if(table.closest(wholeView)){const prior=states.get(table);prior?.bar.remove();restoreSpans(table);table.querySelectorAll('[data-page-hidden14383]').forEach(row=>row.removeAttribute('data-page-hidden14383'));states.delete(table);tables.delete(table);return}if(table.dataset.ownPager14383||table.closest('#document-editor105,[contenteditable=true],#journalEntry98,.phone-app132,form,.r79-original'))return;const bodies=[...table.tBodies];if(!bodies.length)return;let s=states.get(table);const rows=bodies.flatMap(b=>[...b.rows]);
 if(!s){const bar=document.createElement('div');bar.className='table-pages14383 no-print';const prev=document.createElement('button'),label=document.createElement('span'),next=document.createElement('button');prev.type=next.type='button';prev.className=next.className='je-btn je-btn-secondary';prev.textContent='Previous';next.textContent='Next';bar.append(prev,label,next);s={page:0,table,bar,prev,label,next,rows:[]};states.set(table,s);tables.add(table);prev.onclick=()=>turn(s,-1);next.onclick=()=>turn(s,1)}
 if(rows.length!==s.rows.length||rows.some((r,i)=>r!==s.rows[i])){if(!table.dataset.preservePage14397)s.page=0;prepareSpans(table,rows)}s.rows=rows;const container=table.closest('.table-container,.r79-table,.data-table82')||table;if(container.nextElementSibling!==s.bar)container.after(s.bar);paint(s)}
function turn(s,delta){s.page+=delta;paint(s);s.table.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'})}
function reset(table){const s=states.get(table);if(s)s.page=0}
function refresh(table){install(table)}
function paint(s){const count=Math.max(1,Math.ceil(s.rows.length/100));s.page=Math.max(0,Math.min(s.page,count-1));for(const [i,row] of s.rows.entries()){const hide=Math.floor(i/100)!==s.page;if(row.hasAttribute('data-page-hidden14383')!==hide)row.toggleAttribute('data-page-hidden14383',hide)}const value=`${s.page+1} of ${count}`;if(s.label.textContent!==value)s.label.textContent=value;s.prev.disabled=s.page===0;s.next.disabled=s.page===count-1}
function scan(){queued=false;for(const table of tables)if(!table.isConnected){states.get(table)?.bar.remove();tables.delete(table)}document.querySelectorAll('.tab-content.active table,.modal-overlay.active table,.ui-dialog108 table').forEach(install)}
function schedule(){if(!queued){queued=true;requestAnimationFrame(scan)}}
function ready(){new MutationObserver(rs=>{if(rs.some(r=>!r.target.closest?.('.table-pages14383,.transaction-pages14340')&&(r.target.closest?.('table')||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('table')||n.querySelector('table'))))))schedule()}).observe(document.body,{childList:true,subtree:true});window.addEventListener('page113',schedule);window.addEventListener('beforeprint',()=>tables.forEach(restoreSpans));window.addEventListener('afterprint',()=>tables.forEach(t=>prepareSpans(t,states.get(t).rows)));scan()}
window.tablePagination14383={scan,restoreSpans,reset,refresh};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();

;
