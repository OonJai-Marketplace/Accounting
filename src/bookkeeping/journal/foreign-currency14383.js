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
