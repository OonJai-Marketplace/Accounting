/* Account-specific comparison only. Never replace entered FX/book rates. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>escapeHtml(String(v??''));
const snapshots=new Map(),flights=new Map(),failures=new Map(),cards=new Set();
let owner='',client=null,queued=false,checkingPost=false;
const num=v=>typeof v==='number'?v:parseAppNumber(String(v??'')),valid=n=>Number.isFinite(n)&&n>0;
const fmt=n=>n==null?'—':formatAppRate(n);
const offline=()=>!navigator.onLine||window.offline14239?.offline()||window.sessionCache14333?.localMode;
function session(){const id=typeof liveProfile==='undefined'?'':liveProfile?.id||'';if(owner!==id||client!==ojmDb){owner=id;client=ojmDb;snapshots.clear();flights.clear();failures.clear();}return id;}
const key=(date,exclude)=>date+'|'+(exclude||'');
function local(account,date,exclude){
 const windowState=window.yearWindow14333?.state();
 if(!windowState||date<windowState.from||date>windowState.to||window.yearWindow14333?.loading)return {rate:null,status:'Period not loaded on this device',pending:false};
 let quantity=0,value=0,missing=false,pending=false;
 for(const b of windowState.opening||[])if(String(b.accountId)===String(account.id)&&b.currency===(account.currency||account.currency_code)){quantity+=Number(b.balance);if(b.base_balance==null)missing=true;else value+=Number(b.base_balance);}
 for(const l of JournalModule.entries||[]){
  if(String(l.accountId)!==String(account.id)||l.date<date.slice(0,4)+'-01-01'||l.date>date||exclude&&(l.id===exclude||l.dbEntryId===exclude)||l.voided_at||l.status&&l.status!=='posted')continue;
  pending ||= !!(l.pendingSync||l.local14333);
  quantity+=Number(l.debit||0)-Number(l.credit||0);
  const debit=JournalFX14383.base(l,'debit'),credit=JournalFX14383.base(l,'credit');
  if(debit==null||credit==null||l.currency!==(account.currency||account.currency_code))missing=true;else value+=debit-credit;
 }
 // Pending voids can remove the entire projected entry, leaving no local line to flag.
 pending ||= (window.journalDurable14385?.pending()||[]).some(j=>(j.status!=='saved'||j.changes?.some(o=>o.status!=='saved'))&&[...(j.entries||[]),...(j.changes||[]).flatMap(o=>[o.expected,o.value].filter(Boolean))].some(e=>e.date?.slice(0,4)===date.slice(0,4)&&e.date<=date&&(e.lines||[]).some(l=>String(l.account_id)===String(account.id))));
 const negativeAsset=quantity<0&&(account.baseType||account.type||account.account_type)==='ASSET'&&!account.isTechnical&&!account.is_technical&&(!account.purpose||account.purpose==='regular');
 return {quantity,value:missing?null:value,rate:!missing&&!negativeAsset&&quantity*value>0?value/quantity:null,pending,status:negativeAsset?'Negative asset balance — review':missing?'Missing recorded valuation':quantity===0?'No balance':quantity*value>0?'Available':'Balance needs review'};
}
function linesMain(){return [...document.querySelectorAll('#jeLinesBody tr')].map(row=>{const a=getSelectedAccountInfo(row.querySelector('.je-line-acc')?.value);return {account_id:a?.id,currency:a?.currency,posting_date:$('jeTransDate')?.value,line_date:$('jeMultipleDates')?.checked?row.querySelector('.je-line-date')?.value:'',fx_rate_lak:a?JournalFX14383.lineRate(row,a.currency):null,book_rate_lak:row.dataset.bookRate14383||null};});}
function descriptors(rows,chart){const seen=new Set();return rows.flatMap(r=>{const a=chart.find(a=>String(a.id)===String(r.account_id)),currency=a?.currency||a?.currency_code;if(!a||!currency||['LAK','NA'].includes(currency))return [];let date=r.line_date||r.posting_date;if(date?.slice(0,7)!==r.posting_date?.slice(0,7))date=r.posting_date;const fx=num(r.fx_rate_lak),book=num(r.book_rate_lak),s=[a.id,date,fx,book].join('|');if(seen.has(s))return [];seen.add(s);return [{a,currency,date,fx:valid(fx)?fx:null,book:valid(book)?book:null}];});}
async function fetchSnapshot(date,exclude,force=false){
 if(!session()||offline()||!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
 const k=key(date,exclude),old=snapshots.get(k);if(!force&&old&&Date.now()-old.received<30000)return old.data;
 if(!force&&failures.has(k)&&Date.now()-failures.get(k)<30000)return null;
 if(flights.has(k))return flights.get(k);
 const id=owner,db=client;
 const job=(async()=>{try{let query=db.rpc('account_exchange_rates143186',{p_as_of:date,p_exclude_entry:exclude||null});if(query.abortSignal)query=query.abortSignal(AbortSignal.timeout(15000));const r=await query;if(r.error)throw r.error;if(!r.data||!Array.isArray(r.data.accounts)||r.data.as_of!==date)throw Error('Incomplete rate snapshot');if(session()!==id||client!==db)return null;snapshots.set(k,{data:r.data,received:Date.now()});failures.delete(k);return r.data;}catch{if(session()===id&&client===db)failures.set(k,Date.now());return null;}finally{if(owner===id&&client===db){flights.delete(k);schedule();}}})();
 flights.set(k,job);return job;
}
function mount(card,rows,chart,exclude=null){if(!card)return;card._rateReview143186={rows,chart,exclude};cards.add(card);renderCard(card);}
function renderCard(card){
 const source=card._rateReview143186;if(!source)return;
 let host=card.querySelector(':scope > .account-rate-review143186');if(!host){host=document.createElement('section');host.className='account-rate-review143186 no-print';host.setAttribute('aria-label','Account exchange rate comparison');card.append(host);}
 const rows=descriptors(source.rows,source.chart);host.hidden=!rows.length;if(!rows.length)return;
 const body=rows.map(({a,currency,date,fx,book})=>{
  const k=key(date,source.exclude),snapshot=snapshots.get(k),remote=snapshot?.data.accounts.find(r=>r.account_id===a.id),device=local(a,date,source.exclude);
  const average=remote?.average_rate==null?null:Number(remote.average_rate),useDevice=device.pending||!remote,rate=useDevice?device.rate:average;
  const used=book||fx,diff=used!=null&&rate!=null?used-rate:null;
  let detail=remote?'Database checked '+formatAppDate(snapshot.data.calculated_at,true):'Device records · database freshness unconfirmed';
  if(offline())detail='Offline · '+detail;
  if(device.pending)detail+=' · Device estimate · local changes may not be in Google Sheets';
  if(failures.has(k))detail+=' · Could not refresh database';
  if(!valid(rate))detail+=' · '+(useDevice?device.status:({no_balance:'No balance',missing_valuation:'Missing recorded valuation',invalid_balance:'Balance needs review',negative_asset_balance:'Negative asset balance — review'}[remote?.rate_status]||'No rate available'));
  if(device.pending&&average!=null)detail+=' · Last checked database average '+fmt(average);
  if(!offline())void fetchSnapshot(date,source.exclude);
  return '<tr><td>'+esc(a.code+' — '+a.name)+'<small>'+esc(currency+' · '+(date?formatAppDate(date):'Choose date'))+'</small></td><td>'+esc(fmt(fx))+'</td><td>'+esc(book==null?'Uses FX rate':fmt(book))+'</td><td><strong>'+esc(fmt(rate))+'</strong></td><td class="'+(diff!=null&&Math.abs(diff)>0.00000001?'rate-different143186':'')+'">'+esc(diff==null?'—':Math.abs(diff)<0.00000001?'Matches':(diff>0?'+':'')+fmt(diff))+'</td></tr><tr class="rate-source143186"><td colspan="5">'+esc(detail)+'</td></tr>';
 }).join('');
 const html='<div class="rate-review-title143186"><strong>Account average exchange rates · LAK per 1 unit</strong><button type="button" class="je-btn je-btn-secondary" data-refresh-rates>Refresh averages</button></div><div class="rate-review-scroll143186"><table><thead><tr><th>Account / date</th><th>Entered FX</th><th>Entered book rate</th><th>Account average</th><th>Used rate − average</th></tr></thead><tbody>'+body+'</tbody></table></div>';
 if(host._html!==html){host.innerHTML=html;host._html=html;host.querySelector('[data-refresh-rates]').onclick=async()=>{const button=host.querySelector('button');button.disabled=true;await Promise.all(rows.map(r=>fetchSnapshot(r.date,source.exclude,true)));renderCard(card);button.disabled=false;};}
}
function render(){queued=false;session();const card=$('journalEntry98');if(card){card._rateReview143186={rows:linesMain(),chart:AccountingStore.accounts||[],exclude:JournalModule.editingEntryId||null};cards.add(card);}for(const c of cards){if(!c.isConnected){cards.delete(c);continue;}if(!owner){c.querySelector(':scope > .account-rate-review143186')?.remove();continue;}renderCard(c);}}
function schedule(){if(!queued){queued=true;requestAnimationFrame(render);}}
async function checkReview(rows,chart,exclude=null){
 const actor=session(),db=client;if(offline())return;
 const list=descriptors(rows,chart),dates=[...new Set(list.map(r=>r.date))];
 const before=new Map(list.map(r=>{const a=snapshots.get(key(r.date,exclude))?.data.accounts.find(a=>a.account_id===r.a.id);return [r.a.id+'|'+r.date,a?JSON.stringify([a.average_rate,a.rate_status]):null];}));
 await Promise.all(dates.map(date=>fetchSnapshot(date,exclude,true)));if(session()!==actor||client!==db)throw Error('Account changed. Review the entry again.');render();
 for(const r of list){const next=snapshots.get(key(r.date,exclude))?.data.accounts.find(a=>a.account_id===r.a.id),old=before.get(r.a.id+'|'+r.date);if(failures.has(key(r.date,exclude)))throw Error('Account averages could not be refreshed. Review the displayed device values and reconnect before online posting.');if(next&&old!==JSON.stringify([next.average_rate,next.rate_status]))throw Error('Account averages have been refreshed. Compare the rates below the transaction, then press Post again.');}
}
function ready(){
 const style=document.createElement('style');style.textContent='.account-rate-review143186{margin:10px 12px 14px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;color:#334155}.account-rate-review143186[hidden]{display:none!important}.rate-review-title143186{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}.rate-review-scroll143186{overflow-x:auto}#journal .account-rate-review143186 table{width:100%;min-width:650px;table-layout:fixed;margin:0;font-size:12px}#journal .account-rate-review143186 th,#journal .account-rate-review143186 td{padding:6px 8px;border:0;width:auto;text-align:right;white-space:nowrap}#journal .account-rate-review143186 th:first-child,#journal .account-rate-review143186 td:first-child{text-align:left;white-space:normal;min-width:180px}#journal .account-rate-review143186 th{white-space:normal}#journal .account-rate-review143186 th:first-child{width:30%}.account-rate-review143186 small{display:block;color:#64748b}.account-rate-review143186 .rate-source143186 td{font-size:11px;color:#64748b;padding-top:0!important;white-space:normal!important;border-bottom:1px solid #e2e8f0!important}.rate-different143186{color:#92400e;font-weight:600}';document.head.append(style);
 document.addEventListener('input',e=>{if(e.target.closest('#journalEntry98'))schedule();});document.addEventListener('change',e=>{if(e.target.closest('#journalEntry98'))schedule();});
 const body=$('jeLinesBody');if(body)new MutationObserver(schedule).observe(body,{childList:true,subtree:true});
 for(const name of ['page113','online','offline','local-work14333','sync-assessment14332','focus'])window.addEventListener(name,schedule);
 setInterval(()=>{if(document.visibilityState==='visible'&&$('journal')?.classList.contains('active'))schedule();},30000);
 setTimeout(()=>{const submit=window.submitJournalEntry;window.submitJournalEntry=async function(...args){if(checkingPost)return;checkingPost=true;try{if(!window.DriveDrafts143128?.editing&&!window.personalJournal1437?.active){const rows=linesMain();await checkReview(rows,AccountingStore.accounts||[],JournalModule.editingEntryId||null);if(JSON.stringify(rows)!==JSON.stringify(linesMain()))throw Error('The entry changed during the rate check. Review it before posting.');}return await submit.apply(this,args);}catch(e){showCenterStatus(e.message,true);}finally{checkingPost=false;}};},0);schedule();
}
window.AccountRates143186={mount,refresh:schedule,local,descriptors,checkReview};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
