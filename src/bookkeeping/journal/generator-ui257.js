/* Guided drafts stay in the existing journal editor and posting workflow. */
(()=>{'use strict';
const $=id=>document.getElementById(id),G=window.JournalGenerator257,esc=v=>escapeHtml(String(v??''));
let dialog=null,dialogOwner='',preview=null,busy=false,revision=0;
const who=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const chart=()=>AccountingStore.accounts.filter(G.available);
const offline=()=>!navigator.onLine||window.offline14239?.offline()||window.sessionCache14333?.localMode;
const field=name=>dialog?.querySelector('[name="'+name+'"]');
const value=name=>field(name)?.disabled?'':field(name)?.value||'';
const number=name=>value(name).trim()?parseAppNumber(value(name)):0;
const label=a=>a.code+' — '+a.name+' · '+G.currency(a);
function eligible(){
 if(!who())throw Error('Sign in before preparing an entry.');
 if(window.personalJournal1437?.active||window.workspaceRequest138?.target)throw Error('Open the main accounting journal to generate these company entries.');
 if(window.DriveDrafts143128?.preparedCount||window.DriveDrafts143128?.editing||pendingWorkspacePostOwnerId||pendingWorkspacePostJournalId)throw Error('Finish the prepared entries before generating another transaction.');
 if(!window.access113?.can('journal','edit')&&!window.access113?.can('journal','post'))throw Error('Journal editing permission is required.');
}
function stamp(){return JSON.stringify({owner:who(),client:window.OJM_SUPABASE_URL,date:$('jeTransDate')?.value,editing:JournalModule.editingEntryId,personal:!!window.personalJournal1437?.active,prepared:window.DriveDrafts143128?.preparedCount||0,draft:snapshotJournal69(),memo:$('jeGeneralMemo')?.value});}
function input(){return {kind:value('kind'),source:value('source'),target:value('target'),date:$('jeTransDate').value,amount:number('amount'),fee:number('fee'),rate:number('rate'),received:number('received'),receiveRate:number('receiveRate'),payableRate:number('payableRate'),discharge:number('discharge'),reference:value('reference'),detail:value('detail'),rateSource:value('rateSource'),rateUrl:value('rateUrl')};}
function clearPreview(){revision++;preview=null;dialog.querySelector('[data-preview]').hidden=true;dialog.querySelector('[data-apply]').disabled=true;dialog.querySelector('[role=alert]').textContent='';}
function options(name,rows){const n=field(name),old=n.value;n.replaceChildren(new Option('Choose account',''),...rows.map(a=>new Option(label(a),a.id)));n.value=rows.some(a=>String(a.id)===old)?old:'';}
function fields(rebuild=false){
 const kind=value('kind'),a=chart();
 if(rebuild){options('source',a.filter(G.fund));options('target',a.filter(x=>kind==='transfer'?G.fund(x):kind==='payable'?G.obligation(x):G.currency(x)==='LAK'&&!G.technical(x)&&(kind==='expense'?G.type(x)==='EXPENSE'&&!['5419','5420'].includes(String(x.code)):['REVENUE','INCOME'].includes(G.type(x)))));}
 const s=a.find(x=>String(x.id)===value('source')),t=a.find(x=>String(x.id)===value('target')),c=G.currency(s),tc=G.currency(t),same=kind==='transfer'&&c===tc;
 const note=field('rateSource').options[1];note.disabled=kind!=='transfer';if(note.selected&&note.disabled)field('rateSource').selectedIndex=0;
 const show=(name,on)=>{const n=field(name);n.closest('label').hidden=!on;n.disabled=!on;};
 show('rate',!!c&&c!=='LAK'&&(!same||number('fee')>0));
 show('received',kind==='transfer'&&!!c&&!!tc&&c!==tc);show('receiveRate',kind==='transfer'&&!!tc&&tc!=='LAK'&&c!==tc);
 show('payableRate',kind==='payable'&&!!tc&&tc!=='LAK');show('discharge',kind==='payable'&&!!tc&&!!c&&tc!==c);show('reference',kind==='payable');show('fee',kind!=='income');
 const foreign=c&&c!=='LAK'||tc&&tc!=='LAK';show('rateSource',!!foreign);show('rateUrl',!!foreign);
 dialog.querySelector('[data-source-label]').textContent=kind==='income'?'Receiving cash / bank':'Paying cash / bank';
 dialog.querySelector('[data-target-label]').textContent=kind==='transfer'?'Receiving cash / bank':kind==='payable'?'Existing payable / staff balance':kind==='income'?'Income category':'Expense category';
 dialog.querySelector('[data-amount-label]').textContent=(kind==='income'?'Amount received':'Amount paid, excluding fee')+(c?' ('+c+')':'');
 dialog.querySelector('[data-rate-label]').textContent='Transaction rate · LAK per 1 '+(c||'foreign unit');
 dialog.querySelector('[data-received-label]').textContent='Amount received before any fees ('+(tc||'receiving currency')+')';
 dialog.querySelector('[data-receive-rate-label]').textContent='Receipt rate · LAK per 1 '+(tc||'foreign unit');
 dialog.querySelector('[data-discharge-label]').textContent='Existing balance cleared ('+(tc||'account currency')+')';
 dialog.querySelector('[data-payable-rate-label]').textContent='Book rate of the balance cleared · LAK per '+(tc||'unit');
 dialog.querySelector('[data-fee-label]').textContent='Separate bank fee paid from the same account'+(c?' ('+c+')':'');
 dialog.querySelector('[data-help]').textContent=kind==='payable'?'Use the specific invoice or payroll balance and its latest recorded rate. This payment will clear that balance without recording the expense again.':kind==='income'?'Enter income before any separate charges. VAT, customer advances and collections of previously recorded receivables need their own allocation.':kind==='transfer'?'A same-currency transfer keeps the source account’s book value. For an exchange, enter the actual amounts paid and received; record fees separately.':'For a new expense paid now. A previously recorded invoice or salary belongs under Pay existing balance.';
}
async function balances(data,original){
 const a=chart().find(a=>String(a.id)===data.source),c=G.currency(a);if(!a||c==='LAK'||data.kind==='income')return {values:{},notice:''};
 const exclude=JournalModule.editingEntryId||null,device=window.AccountRates143186?.local(a,data.date,exclude);let balance,notice;
 if(offline()){
  if(!device||!Number.isFinite(device.rate)||device.rate<=0)throw Error('A complete recorded book value is not available on this device. Connect and try Generate lines again.');
  balance={rate:device.rate,quantity:device.quantity};notice='Device estimate · reconnect and check the account average before posting.';
 }else{
  const snapshot=await AccountRates143186.snapshot(data.date,exclude,true);
  if(original!==stamp())throw Error('The account or journal draft changed. Open the generator again.');
  const row=snapshot?.accounts?.find(r=>String(r.account_id)===String(a.id));
  if(!row)throw Error('The recorded account balance could not be checked. Your inputs are retained; reconnect and try again.');
  if(device?.pending){if(!(device.rate>0))throw Error('Pending device changes do not have a complete book value. Review them before generating.');balance={rate:device.rate,quantity:device.quantity};notice='Device estimate including pending changes · review after synchronization.';}
  else{if(row.rate_status!=='available'||!(Number(row.average_rate)>0))throw Error('The selected account has no usable book rate ('+String(row.rate_status||'unavailable').replaceAll('_',' ')+'). Check its earlier entries.');balance={rate:Number(row.average_rate),quantity:Number(row.foreign_balance)};notice='Database book value checked for '+formatAppDate(data.date)+'.';}
 }
 // The bank average excludes this editor. Earlier outflows leave its average
 // unchanged; an unposted inflow needs its own explicit carrying calculation.
 for(const r of document.querySelectorAll('#jeLinesBody tr')){
  if(getSelectedAccountInfo(r.querySelector('.je-line-acc')?.value)?.id!==a.id)continue;
  const dr=parseCleanNumber(r.querySelector('.je-line-dr')?.value),cr=parseCleanNumber(r.querySelector('.je-line-cr')?.value);
  if(dr>0)throw Error('This draft already receives money into the paying foreign account. Finish that transaction first so its new book rate can be calculated.');
  balance.quantity-=cr;
 }
 return {values:{[a.id]:balance},notice:notice+' '+a.name+': '+formatAppRate(balance.rate)+' LAK/'+c+'.'};
}
function draw(result,notice){
 const host=dialog.querySelector('[data-preview]');host.hidden=false;
 host.innerHTML='<h4>Generated journal · review before adding</h4><p class="generator-note257">'+esc(notice)+'</p><p class="generator-description257">'+esc(result.description)+'</p><div class="generator-table257"><table><thead><tr><th>Account</th><th>Line memo</th><th>Currency</th><th>Debit</th><th>Credit</th><th>FX rate</th><th>Book rate</th></tr></thead><tbody>'+result.lines.map(l=>'<tr><td>'+esc(l.code+' — '+l.name)+'</td><td>'+esc(l.line_memo)+'</td><td>'+esc(l.currency)+'</td><td>'+esc(l.debit?formatAppNumber(l.debit):'—')+'</td><td>'+esc(l.credit?formatAppNumber(l.credit):'—')+'</td><td>'+esc(l.currency==='LAK'?'1':formatAppRate(l.fx_rate_lak))+'</td><td>'+esc(l.book_rate_lak?formatAppRate(l.book_rate_lak):'—')+'</td></tr>').join('')+'</tbody></table></div><p class="generator-total257">'+(result.fxLoss?'Net FX '+(result.fxLoss>0?'loss':'gain')+': '+esc(formatAppNumber(Math.abs(result.fxLoss)))+' LAK.':'No net exchange gain or loss.')+' Balanced in each currency.</p><p>All lines and wording remain editable in Post Entry. Posting still requires your approval.</p>';
 dialog.querySelector('[data-apply]').disabled=false;
}
async function generate(){
 if(busy)return;busy=true;const end=window.actionFeedback14296?.begin(dialog.querySelector('[data-generate]'),'Calculating journal…'),rev=revision,owner=who(),original=stamp();
 try{eligible();const data=input(),b=await balances(data,original);if(!dialog?.open||owner!==who()||rev!==revision||original!==stamp())return;
  const result=G.build(data,chart(),b.values);preview={data,result,original,owner,revision:rev,notice:b.notice};draw(result,b.notice);dialog.querySelector('[role=alert]').textContent='';
 }catch(e){if(dialog?.open&&owner===who()){preview=null;dialog.querySelector('[data-apply]').disabled=true;dialog.querySelector('[data-preview]').hidden=true;dialog.querySelector('[role=alert]').textContent=e.message;}}
 finally{busy=false;end?.();}
}
async function apply(){
 if(busy||!preview)return;busy=true;const saved=preview,end=window.actionFeedback14296?.begin(dialog.querySelector('[data-apply]'),'Checking journal…');
 try{eligible();if(saved.owner!==who()||saved.original!==stamp())throw Error('The journal changed. Generate and review the lines again.');
  const b=await balances(saved.data,saved.original);if(!dialog?.open||saved!==preview||saved.owner!==who()||saved.revision!==revision)return;
  const fresh=G.build(saved.data,chart(),b.values);
  if(JSON.stringify(fresh)!==JSON.stringify(saved.result)){preview={...saved,result:fresh,notice:b.notice};draw(fresh,b.notice);throw Error('The account values changed. Review the refreshed lines, then add them.');}
  if(saved.original!==stamp())throw Error('The journal changed. Generate and review the lines again.');
  window.entry1430?.setMode('double');
  const body=$('jeLinesBody'),oldRows=[...body.children],oldMemo=$('jeGeneralMemo').value,oldRates=JournalFX14383.capture();
  const meaningful=r=>[...r.querySelectorAll('.je-line-acc,.je-line-memo,.je-line-dr,.je-line-cr')].some(n=>n.value.trim());
  try{
   for(const r of oldRows)if(!meaningful(r))r.remove();
   const rates={...oldRates};for(const l of fresh.lines){addJournalLineRow(l.code+' — '+l.name,l.line_memo,l.debit?String(l.debit):'',{[l.currency]:l.credit?String(l.credit):''});const r=body.lastElementChild;r.dataset.fxRate14383=l.fx_rate_lak;r.dataset.bookRate14383=l.book_rate_lak||'';if(l.currency!=='LAK')rates[l.currency]??=l.fx_rate_lak;}
   $('jeGeneralMemo').value=oldMemo.trim()?oldMemo+'\n'+fresh.description:fresh.description;
   JournalFX14383.restore(rates);calculateJournalBalance();$('jeGeneralMemo').dispatchEvent(new Event('input',{bubbles:true}));window.dispatchEvent(new Event('save-state14234'));
  }catch(e){body.replaceChildren(...oldRows);$('jeGeneralMemo').value=oldMemo;JournalFX14383.restore(oldRates);calculateJournalBalance();throw e;}
  preview=null;dialog.close();dialog.remove();dialog=null;showJournalEntry98();showCenterStatus('Generated lines added. Review or edit them, then use Post Entry when ready.');
 }catch(e){if(dialog?.open&&saved.owner===who())dialog.querySelector('[role=alert]').textContent=e.message;}
 finally{busy=false;end?.();}
}
function open(){
 try{eligible();}catch(e){showCenterStatus(e.message,true);return;}
 if(dialog&&dialogOwner!==who()){dialog.remove();dialog=null;}dialogOwner=who();
 if(dialog){clearPreview();fields(true);dialog.querySelector('[data-date]').textContent=formatAppDate($('jeTransDate').value);dialog.showModal();return;}
 dialog=document.createElement('dialog');dialog.id='journalGenerator257';dialog.setAttribute('aria-labelledby','generatorTitle257');
 const numeric=(name,text,attr)=>'<label><span '+(attr||'')+'>'+text+'</span><input class="je-input" name="'+name+'" inputmode="decimal" autocomplete="off"></label>';
 dialog.innerHTML='<form><header><div><h3 id="generatorTitle257">Generate journal lines</h3><p>Transaction date: <strong data-date></strong></p></div><button type="button" class="je-btn je-btn-secondary" data-close aria-label="Close generator">Close</button></header><div class="generator-fields257">'+
 '<label>Transaction type<select class="je-select" name="kind"><option value="expense">Expense paid now</option><option value="income">Income received</option><option value="payable">Pay existing balance</option><option value="transfer">Transfer / currency exchange</option></select></label><label><span data-source-label></span><select class="je-select" name="source"></select></label><label class="generator-wide257"><span data-target-label></span><select class="je-select" name="target"></select></label>'+
 numeric('amount','Amount','data-amount-label')+numeric('rate','Transaction rate','data-rate-label')+numeric('received','Amount received','data-received-label')+numeric('receiveRate','Receiving rate','data-receive-rate-label')+numeric('discharge','Existing balance cleared','data-discharge-label')+numeric('payableRate','Book rate of balance','data-payable-rate-label')+
 '<label>Original entry / payroll period<input class="je-input" name="reference" placeholder="e.g. OJM260304 · October salary"></label>'+numeric('fee','Separate bank fee','data-fee-label')+
 '<label class="generator-wide257">Short detail / source group (optional)<input class="je-input" name="detail" placeholder="e.g. 2026-10 2nd · kitchen supplies"></label><label>Rate basis<select class="je-select" name="rateSource"><option>BCEL EFT</option><option>BCEL Note · cash counter exchange</option><option>Actual agreed exchange / settlement</option></select></label><label>Rate Source link (optional)<input class="je-input" name="rateUrl" type="url" placeholder="https://"></label></div><p class="generator-note257" data-help></p><p role="alert" aria-live="polite"></p><section data-preview hidden></section><footer><button type="submit" class="je-btn je-btn-secondary" data-generate>Generate lines</button><button type="button" class="je-btn je-btn-emerald" data-apply disabled>Add lines to entry</button></footer></form>';
 document.body.append(dialog);dialog.querySelector('[data-date]').textContent=formatAppDate($('jeTransDate').value);fields(true);
 dialog.querySelector('form').addEventListener('submit',e=>{e.preventDefault();void generate();});
 dialog.querySelector('[data-apply]').addEventListener('click',()=>void apply());dialog.querySelector('[data-close]').onclick=()=>{revision++;dialog.close();};dialog.addEventListener('cancel',()=>{revision++;});
 dialog.addEventListener('input',()=>{clearPreview();fields();});dialog.addEventListener('change',e=>{clearPreview();fields(e.target===field('kind'));});dialog.showModal();
}
function ready(){
 const button=document.createElement('button');button.type='button';button.id='generateJournal257';button.className='je-btn je-btn-secondary';button.textContent='Generate lines';button.onclick=open;$('journalEntry98')?.querySelector('.je-header-actions')?.append(button);
 const style=document.createElement('style');style.textContent='#journalGenerator257{width:min(1000px,calc(100vw - 32px));max-height:calc(100dvh - 32px);box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:20px;color:#18392e;background:#fff;overflow:auto}#journalGenerator257::backdrop{background:#0006}#journalGenerator257 header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}#journalGenerator257 h3{margin:0 0 6px}#journalGenerator257 header p{margin:0 0 16px}#journalGenerator257 .generator-fields257{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px}#journalGenerator257 label{display:flex;flex-direction:column;gap:5px;font-size:13px;min-width:0}#journalGenerator257 label[hidden],#journalGenerator257 [data-preview][hidden]{display:none!important}#journalGenerator257 .generator-wide257{grid-column:1/-1}#journalGenerator257 input,#journalGenerator257 select{width:100%;min-height:36px;box-sizing:border-box;background:#fff;color:#18392e}#journalGenerator257 .generator-note257{font-size:13px;color:#52645e;line-height:1.45}#journalGenerator257 [role=alert]{color:#9f2e24;white-space:pre-wrap}#journalGenerator257 .generator-description257{white-space:pre-wrap;background:#f1f7f3;padding:10px;border-radius:5px}#journalGenerator257 .generator-table257{overflow:auto}#journalGenerator257 table{border-collapse:collapse;min-width:820px;width:100%;font-size:12px}#journalGenerator257 th,#journalGenerator257 td{padding:8px;border-bottom:1px solid #dbe5df;text-align:left;vertical-align:top}#journalGenerator257 th:nth-child(n+4),#journalGenerator257 td:nth-child(n+4){text-align:right;white-space:nowrap}#journalGenerator257 th{background:#eef4f0}#journalGenerator257 .generator-total257{font-weight:600}#journalGenerator257 footer{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;flex-wrap:wrap}#journalGenerator257 .je-btn{height:32px;min-height:32px}#journalGenerator257 [data-preview]{font-size:13px;border-top:1px solid #dbe5df;margin-top:16px}@media(max-width:650px){#journalGenerator257 .generator-fields257{grid-template-columns:1fr}#journalGenerator257{padding:14px}}';document.head.append(style);
 const contextChange=()=>{button.hidden=!!window.personalJournal1437?.active;const gate=$('loginGate'),locked=gate&&!gate.classList.contains('is-authenticated');if(dialog&&(who()!==dialogOwner||locked||window.personalJournal1437?.active)){revision++;preview=null;dialog.close();dialog.remove();dialog=null;}};
 window.addEventListener('page113',contextChange);window.addEventListener('local-work14333',contextChange);document.addEventListener('visibilitychange',contextChange);
 new MutationObserver(contextChange).observe($('loginGate')||document.body,{attributes:true,attributeFilter:['class','hidden']});
}
window.GuidedJournal257={open};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
