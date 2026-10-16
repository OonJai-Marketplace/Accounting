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
function holding(a,date){
 const state=window.yearWindow14333?.state();
 if(!date||state?.from&&date<state.from)throw Error('Load this journal year to see its average.');
 const editing=JournalModule.entries.find(l=>l.id===JournalModule.editingEntryId);
 const earlier=l=>!editing||l.date<editing.date||l.date===editing.date&&(String(l.created_at||'')<String(editing.created_at||'')||l.created_at===editing.created_at&&String(l.id).localeCompare(String(editing.id),undefined,{numeric:true})<0);
 const rows=JournalModule.entries.filter(l=>String(l.accountId)===String(a.id)&&l.date<=date&&l.id!==JournalModule.editingEntryId&&earlier(l)&&!l.voided_at&&(!l.status||l.status==='posted'));
 if(rows.some(l=>l.pendingSync||l.local14333))throw Error('Average unavailable while earlier fund entries await sync.');
 let quantity=0,value=0;
 for(const b of state?.opening||[])if(String(b.accountId)===String(a.id)){if(b.base_balance==null)throw Error('Opening LAK valuation is missing.');quantity+=Number(b.balance);value+=Number(b.base_balance)}
 for(const l of rows){const d=JournalFX14383.base(l,'debit'),c=JournalFX14383.base(l,'credit');if(d==null||c==null)throw Error('Average unavailable: an earlier rate is missing.');quantity+=Number(l.debit)-Number(l.credit);value+=d-c}
 if(!(quantity>0&&value>0))throw Error('Average unavailable: no positive valued balance.');
 return {quantity,value,rate:value/quantity};
}
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
   for(const c of group.filter(c=>c.currency!=='LAK'))lines.push('<span class="calc-line14391 calc-muted14391">'+esc(c.account)+' · '+esc(c.side)+' '+esc(money(c.amount))+' '+esc(c.currency)+' × '+esc(rateText(s.rate))+' = '+resultValue(round(c.amount*s.rate),'LAK',c.account+' equivalent')+'</span>');
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
function automaticHtml(){
 const groups=new Map(),cache=new Map();
 for(const input of document.querySelectorAll(amountSelector)){
  const c=read(input);if(!c.a?.trackForeignFunds||['LAK','NA'].includes(c.currency)||!c.amount||!Number.isFinite(c.amount))continue;
  if(!groups.has(c.currency))groups.set(c.currency,[]);const lines=groups.get(c.currency);
  const prefix=esc(c.account)+' · '+esc(c.side)+' '+esc(money(c.amount))+' '+esc(c.currency),rate=JournalFX14383.lineRate(c.row,c.currency);
  if(rate>0)lines.push('<span class="calc-line14391">'+prefix+' × '+esc(rateText(rate))+' = '+resultValue(round(c.amount*rate),'LAK',c.account+' transaction equivalent')+' <small>transaction rate</small></span>');
  else lines.push('<span class="calc-line14391">'+prefix+' · Enter LAK per '+esc(c.currency)+' above.</span>');
  const key=c.a.id+'|'+c.date;
  if(!cache.has(key)){try{cache.set(key,holding(c.a,c.date))}catch(e){cache.set(key,{error:e.message})}}
  const h=cache.get(key);
  if(h.error)lines.push('<span class="calc-line14391 calc-muted14391">'+esc(c.account)+': '+esc(h.error)+'</span>');
  else lines.push('<span class="calc-line14391 calc-muted14391">'+esc(c.account)+' · '+esc(money(c.amount))+' '+esc(c.currency)+' × average '+esc(rateText(h.rate))+' = '+resultValue(round(c.amount*h.rate),'LAK',c.account+' value at average')+' <small>before entry'+(navigator.onLine?'':' · saved offline data')+'</small></span>');
 }
 return [...groups].map(([currency,lines])=>currencyGroup(currency,lines.join(''))).join('');
}
function decorate(){
 for(const input of document.querySelectorAll(amountSelector)){
  const cell=input.closest('td');if(!cell)continue;
  cell.classList.add('calc-amount-cell14391');
  let pick=cell.querySelector('.calc-pick14391');
  if(!pick){pick=document.createElement('button');pick.type='button';pick.className='calc-pick14391';pick.textContent='✓';cell.append(pick)}
  pick._amount14391=input;
  const checked=selected.has(input),r=read(input);
  pick.setAttribute('aria-pressed',String(checked));pick.setAttribute('aria-label','Select '+r.account+' '+r.side+' amount for calculation');pick.title=pick.getAttribute('aria-label');cell.classList.toggle('calc-selected14391',checked);
 }
}
function visible(){const card=$('journalEntry98');return !!card?.getClientRects().length&&document.documentElement.dataset.device132!=='phone'&&!window.personalJournal1437?.active&&!$('loginGate')?.matches(':not(.is-authenticated)')}
function layout(){
 if(!host)return;const show=visible()&&!!signature;host.hidden=!show;document.body.classList.toggle('has-calculation14391',show);
 const main=document.querySelector('.main-content-area');if(!main)return;
 if(!main.dataset.calcPadding14391){main.dataset.calcPadding14391='1';main.style.setProperty('--calc-original-padding14391',getComputedStyle(main).paddingBottom)}
 if(show){const left=Math.max(0,main.getBoundingClientRect().left);host.style.left=left+'px';document.documentElement.style.setProperty('--calculation-height14391',Math.ceil(host.getBoundingClientRect().height)+'px')}
 else document.documentElement.style.setProperty('--calculation-height14391','0px');
}
function render(){
 queued=false;if(!host)return;
 for(const n of selected)if(!n.isConnected||!n.matches(amountSelector))selected.delete(n);
 if(window.entry1430?.mode==='single'){selected.clear();selectedRate=''}
 decorate();
 const foreignSelected=[...selected].some(n=>read(n).currency!=='LAK');
 for(const input of document.querySelectorAll('[data-fx-rate14383]'))input.classList.toggle('calc-rate-selected14391',!foreignSelected&&selectedRate===input.dataset.fxRate14383);
 const html=selected.size?selectionHtml([...selected].map(read)):automaticHtml();
 if(html!==signature){results.innerHTML=html;signature=html}
 results.hidden=!html;layout();
}
function refresh(){if(!queued){queued=true;requestAnimationFrame(render)}}
function clear(){selected.clear();selectedRate='';drag=null;refresh()}
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
 card.addEventListener('input',refresh);card.addEventListener('change',refresh);
 // Rate controls can be moved into the journal header by the responsive layout.
 const chooseRate=e=>{if(e.target.matches('[data-fx-rate14383]')){selectedRate=e.target.dataset.fxRate14383;refresh()}};
 document.addEventListener('focusin',chooseRate,true);document.addEventListener('click',chooseRate,true);
 document.addEventListener('input',e=>{if(e.target.matches('[data-fx-rate14383]'))refresh()},true);
 body.addEventListener('click',e=>{const pick=e.target.closest('.calc-pick14391');if(pick){e.preventDefault();e.stopPropagation();toggle(pick._amount14391)}},true);
 document.addEventListener('pointerdown',e=>{
  if(e.button!==0||!visible())return;
  if(host.contains(e.target)||e.target.closest('[data-fx-rate14383],#journalRates14383,.calc-pick14391'))return;
  const input=e.target.closest('#jeLinesBody td')?.querySelector('.je-line-dr,.je-line-cr');
  if(!input){clear();return}
  const multi=e.ctrlKey||e.metaKey,inputs=[...body.querySelectorAll('.je-line-dr,.je-line-cr')],start=inputs.indexOf(input),base=multi?new Set(selected):new Set(),add=multi?!selected.has(input):true;
  if(multi){e.preventDefault();if(add)selected.add(input);else selected.delete(input)}
  else if(!selected.has(input)){selected.clear();selected.add(input);selectedRate=''}
  if(e.pointerType!=='touch')drag={inputs,start,base,add};
  refresh();
 },true);
 document.addEventListener('pointermove',e=>{if(!drag)return;const input=document.elementFromPoint(e.clientX,e.clientY)?.closest('#jeLinesBody td')?.querySelector('.je-line-dr,.je-line-cr'),end=drag.inputs.indexOf(input);if(end<0||end===drag.start&&!drag.moved)return;drag.moved=true;e.preventDefault();window.getSelection()?.removeAllRanges();selected.clear();for(const n of drag.base)selected.add(n);const r1=Math.floor(drag.start/2),r2=Math.floor(end/2),c1=drag.start%2,c2=end%2;for(let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++)for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++){const n=drag.inputs[r*2+c];if(drag.add)selected.add(n);else selected.delete(n)}refresh()});
 document.addEventListener('pointerup',()=>{drag=null});document.addEventListener('pointercancel',()=>{drag=null});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clear()});
 new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeName==='TR'||n.nodeName==='INPUT')))refresh()}).observe(body,{childList:true,subtree:true});
 const reset=window.clearJournalEntry;window.clearJournalEntry=function(...args){clear();return reset.apply(this,args)};
 const editor=window.loadEntryForEdit;window.loadEntryForEdit=function(...args){clear();return editor.apply(this,args)};
 window.addEventListener('page113',refresh);window.addEventListener('local-work14333',refresh);window.addEventListener('resize',layout);window.addEventListener('online',refresh);window.addEventListener('offline',refresh);
 window.visualViewport?.addEventListener('resize',layout);
 new ResizeObserver(layout).observe(host);new ResizeObserver(layout).observe(document.querySelector('.main-content-area'));
 new MutationObserver(refresh).observe(card,{attributes:true,attributeFilter:['hidden','class']});
 new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class']});
 refresh();
}
window.JournalCalculation14391={summarize,holding,refresh,clear,get selected(){return [...selected].map(read)}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
