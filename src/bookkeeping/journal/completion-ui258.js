/* A separate template draft. Only Use in Post Entry copies rows to the journal. */
(()=>{'use strict';
const $=id=>document.getElementById(id),G=window.JournalCompletion258,esc=v=>escapeHtml(String(v??''));
let dialog=null,owner='',state=null,busy=false,revision=0,verified='',storageWarning='',job=null;
const Catalog=window.JournalTemplateCatalog268;
const who=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const chart=()=>AccountingStore.accounts.filter(G.available);
const key=()=> 'ojm_generator258:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+owner;
const number=v=>typeof v==='number'?v:String(v??'').trim()?parseAppNumber(String(v)):0;
const display=v=>typeof v==='number'?v.toLocaleString(typeof appNumberLocale==='function'?appNumberLocale():'en-US',{useGrouping:false,maximumFractionDigits:12}):v??'';
const offline=()=>!navigator.onLine||window.offline14239?.offline()||window.sessionCache14333?.localMode;
const blank=()=>({account_id:'',line_memo:'',debit:'',credit:''});
function eligible(){if(!who())throw Error('Sign in before preparing an entry.');if(window.personalJournal1437?.active||window.workspaceRequest138?.target)throw Error('Open the main company journal to use this generator.');if(!window.access113?.can('journal','edit')&&!window.access113?.can('journal','post'))throw Error('Journal editing permission is required.');if(window.DriveDrafts143128?.preparedCount||window.DriveDrafts143128?.editing||pendingWorkspacePostOwnerId||pendingWorkspacePostJournalId)throw Error('Finish the prepared entries before using this generator.');}
function persist(){if(owner!==who()||!state)return;try{localStorage.setItem(key(),JSON.stringify(state));storageWarning='';}catch{storageWarning='This draft could not be saved on this device. Keep the window open until it is copied to Post Entry.';}}
function invalidate(){revision++;verified='';if(dialog){dialog.querySelector('[data-use]').disabled=true;dialog.querySelector('[data-status]').textContent='';}persist();}
function definitions(){
 const saved=typeof availableTransactionTemplates==='function'?availableTransactionTemplates():[];
 return [{id:'blank',name:'Enter manually — detect template',lines:[{},{}]},...saved];
}
function templateRows(t){return (t.lines||[]).map(l=>{const a=l.code?chart().find(a=>String(a.code)===String(l.code)&&G.currency(a)===l.currency):l.accountId?chart().find(a=>a.id===l.accountId):typeof resolveTemplateAccount14397==='function'?resolveTemplateAccount14397(l):null;return {...blank(),account_id:a?.id||'',line_memo:l.memo||'',role:l.role,expectedCurrency:l.currency,expectedSide:l.side,missing:!a&&(l.accountId||l.account||l.code)?String(l.account||l.code||l.accountId):''};});}
function selectTemplate(id){
 state.drafts[state.template]={rows:state.rows,memo:state.memo,rates:state.rates};
 const previous=state.drafts[id],t=definitions().find(t=>t.id===id);if(!t)return;
 Object.assign(state,previous||{rows:templateRows(t),memo:t.generalMemo||'',rates:{}},{template:id});invalidate();render();
}
function message(text,error=false){const host=dialog?.querySelector('[data-status]');if(host){host.textContent=text+(storageWarning?' '+storageWarning:'');host.classList.toggle('has-error258',error);}}
function close(){
 const previous=dialog;if(!previous)return;revision++;job?.end?.();job=null;busy=false;verified='';
 window.dropdown1434?.close();dialog=null;previous.close();previous.remove();persist();
 $('generateJournal258')?.focus({preventScroll:true});
}
function templateChoices(query=''){
 const host=dialog.querySelector('[data-template-options]'),field=dialog.querySelector('[data-template-query]');host.replaceChildren();
 const tokens=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean),matches=definitions().filter(t=>tokens.every(token=>(t.name+' '+(t.lines||[]).map(l=>l.memo||l.account||l.code||'').join(' ')).toLocaleLowerCase().includes(token)));
 for(const t of matches){const b=document.createElement('button');b.type='button';b.setAttribute('role','option');b.setAttribute('aria-selected',String(state.template===t.id));b.textContent=t.name;b.onpointerdown=e=>e.preventDefault();b.onclick=()=>{selectTemplate(t.id);host.hidden=true;field.setAttribute('aria-expanded','false');};host.append(b);}
 if(!matches.length)host.textContent='No matching templates. Choose manual entry and enter the accounts you know.';
 host.hidden=false;field.setAttribute('aria-expanded','true');
}
function detect(){
 if(state.template!=='blank'||!Catalog)return '';
 const matches=Catalog.match(state.rows,definitions(),chart()),host=dialog.querySelector('[data-matches]');host.replaceChildren();
 const apply=t=>{state.rows=Catalog.merge(state.rows,t,chart(),templateRows);invalidate();renderRows();renderRates();};
 if(matches.length===1){apply(matches[0]);return 'Matched '+matches[0].name+'. ';}
 if(matches.length>1){host.append('Several templates fit. Choose one to add its missing lines: ');for(const t of matches){const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';b.textContent=t.name;b.onclick=()=>{apply(t);host.replaceChildren();message('Matched '+t.name+'. Review the accounts and press Generate.');};host.append(b);}}
 return '';
}
function renderRates(){
 const host=dialog.querySelector('[data-rates]'),cs=[...new Set(state.rows.map(l=>chart().find(a=>a.id===l.account_id)).filter(Boolean).map(G.currency).filter(c=>c!=='LAK'))].sort();
 for(const n of [...host.children])if(!cs.includes(n.dataset.currency))n.remove();
 for(const c of cs)if(![...host.children].some(n=>n.dataset.currency===c)){const label=document.createElement('label');label.dataset.currency=c;label.textContent='LAK per 1 '+c;const n=document.createElement('input');n.className='je-input';n.inputMode='decimal';n.setAttribute('aria-label','LAK per 1 '+c);n.value=state.rates[c]||'';n.oninput=()=>{state.rates[c]=n.value;for(const l of state.rows)if(G.currency(chart().find(a=>a.id===l.account_id))===c)delete l.fx_rate_lak;invalidate();};label.append(n);host.append(label);}
}
function renderRows(){
 const body=dialog.querySelector('tbody'),accounts=chart(),options=accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.code+' — '+a.name+' · '+G.currency(a))+'</option>').join('');body.replaceChildren();
 state.rows.forEach((l,i)=>{
  const a=chart().find(a=>a.id===l.account_id),tr=document.createElement('tr');tr.dataset.row=i;
  tr.innerHTML='<td>'+(i+1)+'</td><td><select class="je-select" aria-label="Account row '+(i+1)+'"><option value="">Choose account</option>'+options+'</select></td><td><input aria-label="Memo row '+(i+1)+'" data-field="line_memo" value="'+esc(l.line_memo)+'"></td><td data-currency>'+esc(a?G.currency(a):'')+'</td>'+['debit','credit','book_rate_lak'].map(k=>'<td><input inputmode="decimal" aria-label="'+({debit:'Debit',credit:'Credit',book_rate_lak:'Book rate'}[k])+' row '+(i+1)+'" data-field="'+k+'" value="'+esc(display(l[k]||''))+'"'+(k==='book_rate_lak'&&(!a||G.currency(a)==='LAK')?' disabled':'')+'></td>').join('')+'<td><button type="button" class="je-btn je-btn-secondary" aria-label="Delete row '+(i+1)+'">×</button></td>';
  const select=tr.querySelector('select');select.value=l.account_id;select.onchange=()=>{l.account_id=select.value;l.missing='';delete l.generated;delete l.book_rate_lak;delete l.fx_rate_lak;delete l.autoBook;invalidate();renderRows();renderRates();};
  for(const n of tr.querySelectorAll('[data-field]'))n.oninput=()=>{l[n.dataset.field]=n.value;if(n.dataset.field==='line_memo')delete l.autoMemo;if(['debit','credit'].includes(n.dataset.field))delete l.generated;if(n.dataset.field==='book_rate_lak'){delete l.autoBook;delete l.generated;}invalidate();};
  tr.querySelector('button').onclick=()=>{state.rows.splice(i,1);if(!state.rows.length)state.rows.push(blank());invalidate();renderRows();renderRates();};body.append(tr);
 });
}
function render(){
 dialog.querySelector('[data-template]').value=state.template;dialog.querySelector('[data-date]').value=state.date;dialog.querySelector('[data-memo]').value=state.memo;
 dialog.querySelector('[data-template-query]').value=definitions().find(t=>t.id===state.template)?.name||'';
 dialog.querySelector('[data-rates]').replaceChildren();renderRates();renderRows();dialog.querySelector('[data-use]').disabled=true;
 const missing=state.rows.filter(l=>l.missing);if(missing.length)message('Choose current accounts for these saved template lines: '+missing.map(l=>l.missing).join(', '),true);
}
function readInput(){return {date:state.date,chart:chart(),rates:Object.fromEntries(Object.entries(state.rates).map(([c,v])=>[c,number(v)])),rows:state.rows.map(l=>({...l,debit:number(l.debit),credit:number(l.credit),book_rate_lak:number(l.book_rate_lak),fx_rate_lak:number(l.fx_rate_lak)}))};}
function fingerprint(){return JSON.stringify([who(),window.OJM_SUPABASE_URL,JournalModule.editingEntryId,state,snapshotJournal69(),$('jeGeneralMemo')?.value,$('jeTransDate')?.value]);}
async function balances(input){
 const needs=input.rows.filter(l=>l.generated!=='output').map(l=>({l,a:input.chart.find(a=>a.id===l.account_id)})).filter(({l,a})=>a&&G.currency(a)!=='LAK'&&(G.fund(a)&&!l.debit||(l.debit>0||!l.debit&&!l.credit)&&(G.staff(a)||G.type(a)==='LIABILITY')||l.credit>0&&!G.technical(a)&&!G.fund(a)&&!G.staff(a)&&G.type(a)==='ASSET'));
 if(!needs.length)return {values:{},note:''};
 const exclude=JournalModule.editingEntryId||null,localMode=offline(),snapshot=localMode?null:await AccountRates143186.snapshot(input.date,exclude,true);
 if(!localMode&&!snapshot)throw Error('Recorded balances could not be checked. Your draft is retained; reconnect and Generate again.');
 const values={};let estimated=false;
 for(const a of new Map(needs.map(({a})=>[a.id,a])).values()){
  const device=window.AccountRates143186?.local(a,input.date,exclude),remote=snapshot?.accounts?.find(r=>String(r.account_id)===String(a.id));let b;
  if(localMode||device?.pending){b=device;estimated=true;}
  else if(remote){const q=Number(remote.foreign_balance),v=remote.lak_carrying_value==null?null:Number(remote.lak_carrying_value);b={quantity:q,rate:Number(remote.average_rate)||(G.staff(a)&&q&&v!=null&&q*v>0?v/q:null)};}
  if(!b||!Number.isFinite(b.quantity))throw Error('The recorded balance for '+a.name+' is unavailable. Load its accounting period and Generate again.');
  values[a.id]={quantity:b.quantity,rate:b.rate||(G.staff(a)&&b.quantity&&b.value!=null&&b.quantity*b.value>0?b.value/b.quantity:null)};
  // Do not ignore cash already committed in the normal unfinished journal.
  if(G.fund(a)&&values[a.id])for(const r of document.querySelectorAll('#jeLinesBody tr'))if(getSelectedAccountInfo(r.querySelector('.je-line-acc')?.value)?.id===a.id){if(parseCleanNumber(r.querySelector('.je-line-dr')?.value)>0)throw Error('Post Entry already receives money into '+a.name+'. Finish that transaction before using its new book value.');values[a.id].quantity-=parseCleanNumber(r.querySelector('.je-line-cr')?.value);}
 }
 return {values,note:estimated?'Device book-value estimate. Recheck after synchronization.':'Recorded account balances checked.'};
}
function showErrors(errors){message(errors.map(e=>(e.row!=null?'Row '+(e.row+1)+': ':'')+e.message.replace(/^Row \d+: /,'')).join('\n'),true);const book=errors.find(e=>e.needsBook&&e.row!=null);if(book)dialog.querySelector('[data-row="'+book.row+'"] [data-field="book_rate_lak"]')?.focus({preventScroll:true});}
async function calculate(){
 if(busy)return;const detected=detect();busy=true;verified='';dialog.querySelector('[data-use]').disabled=true;const actor=who(),rev=revision,before=fingerprint(),end=window.actionFeedback14296?.begin(dialog.querySelector('[data-generate]'),'Generating journal…'),task=job={end};
 try{eligible();if(!state.memo.trim())throw Error('Enter the general description.');if(!/^\d{4}-\d{2}-\d{2}$/.test(state.date))throw Error('Choose the transaction date.');const input=readInput();const missing=state.rows.findIndex(l=>!l.account_id&&(l.role||l.missing));if(missing>=0)throw Error('Row '+(missing+1)+': choose the '+(state.rows[missing].role||'missing')+' account before generating.');const b=await balances(input);if(!dialog?.open||actor!==who()||rev!==revision||before!==fingerprint())return;
  const result=G.complete({...input,balances:b.values});if(result.errors.length){verified='';dialog.querySelector('[data-use]').disabled=true;showErrors(result.errors);return;}
  state.rows=result.rows;persist();renderRows();renderRates();verified=JSON.stringify(readInput().rows);dialog.querySelector('[data-use]').disabled=false;message(detected+'Journal amounts filled. Review the debit and credit cells. '+b.note+(result.notes.length?' '+result.notes.join(' '):''));
 }catch(e){if(job===task&&actor===who()&&dialog?.open)message(e.message,true);}finally{if(job===task){busy=false;job=null;}end?.();}
}
async function useEntry(){
 if(busy||!verified)return;busy=true;const actor=who(),rev=revision,before=fingerprint(),end=window.actionFeedback14296?.begin(dialog.querySelector('[data-use]'),'Checking journal…'),task=job={end};
 try{eligible();const input=readInput();const missing=state.rows.findIndex(l=>!l.account_id&&(l.role||l.missing));if(missing>=0)throw Error('Row '+(missing+1)+': choose the '+(state.rows[missing].role||'missing')+' account before generating.');const b=await balances(input);if(!dialog?.open||actor!==who()||rev!==revision||before!==fingerprint())return;
  const result=G.complete({...input,balances:b.values});if(result.errors.length){showErrors(result.errors);verified='';dialog.querySelector('[data-use]').disabled=true;return;}
  if(JSON.stringify(result.rows)!==JSON.stringify(state.rows)){state.rows=result.rows;persist();renderRows();verified=JSON.stringify(readInput().rows);message('Recorded values changed. Review the updated debit and credit amounts, then use the journal again.',true);return;}
  const body=$('jeLinesBody'),memo=$('jeGeneralMemo'),oldMemo=memo.value,oldRates=JournalFX14383.capture(),oldDate=$('jeTransDate').value;
  const meaningful=r=>[...r.querySelectorAll('.je-line-acc,.je-line-memo,.je-line-dr,.je-line-cr')].some(n=>n.value.trim()),existing=[...body.children].some(meaningful);
  if(existing&&oldDate!==state.date)throw Error('Post Entry has an unfinished journal on another date. Finish it before copying this journal.');
  window.JournalUndo143103?.checkpoint();window.entry1430?.setMode('double');
  const oldRows=[...body.children];
  try{for(const r of oldRows)if(!meaningful(r))r.remove();if(!existing)$('jeTransDate').value=state.date;
   for(const l of result.rows.filter(l=>l.debit||l.credit)){const a=chart().find(a=>a.id===l.account_id);addJournalLineRow(a.code+' — '+a.name,l.line_memo,l.debit?display(l.debit):'',{[G.currency(a)]:l.credit?display(l.credit):''});const r=body.lastElementChild;r.dataset.fxRate14383=l.fx_rate_lak||number(state.rates[G.currency(a)])||1;r.dataset.bookRate14383=l.book_rate_lak||'';const date=r.querySelector('.je-line-date');if(date)date.value=state.date;}
   memo.value=existing&&oldMemo.trim()?oldMemo+'\n'+state.memo:state.memo;JournalFX14383.restore(existing?{...state.rates,...oldRates}:state.rates);calculateJournalBalance();memo.dispatchEvent(new Event('input',{bubbles:true}));window.dispatchEvent(new Event('save-state14234'));window.drafts1427?.flush();window.JournalUndo143103?.record();
  }catch(e){body.replaceChildren(...oldRows);memo.value=oldMemo;$('jeTransDate').value=oldDate;JournalFX14383.restore(oldRates);calculateJournalBalance();throw e;}
  delete state.drafts[state.template];state={template:'blank',date:state.date,memo:'',rates:{},rows:[blank(),blank()],drafts:state.drafts};persist();dialog.close();dialog.remove();dialog=null;verified='';showJournalEntry98();showCenterStatus('Completed journal copied. Review it, then use Post Entry when ready.');
 }catch(e){if(job===task&&actor===who()&&dialog?.open)message(e.message,true);}finally{if(job===task){busy=false;job=null;}end?.();}
}
function open(){
 try{eligible();if(typeof TemplateStore!=='undefined')TemplateStore.load();}catch(e){showCenterStatus(e.message,true);return;}
 if(dialog&&owner===who()){if(!dialog.open)dialog.showModal();return;}const retained=owner===who()&&state;owner=who();
 if(!retained)try{state=JSON.parse(localStorage.getItem(key())||'null');}catch{state=null;}
 if(!state||!Array.isArray(state.rows))state={template:'blank',date:$('jeTransDate').value,memo:'',rates:{},rows:[blank(),blank()],drafts:{}};
 state.drafts||={};state.rates||={};if(!definitions().some(t=>t.id===state.template))state.template='blank';
 dialog=document.createElement('dialog');dialog.id='journalGenerator258';dialog.setAttribute('aria-labelledby','generatorTitle258');
 dialog.innerHTML='<header><h3 id="generatorTitle258">Generate journal</h3><button type="button" class="je-btn je-btn-secondary" data-close>Close</button></header><div class="generator-meta258"><label class="generator-template268">Transaction template<input class="je-input" data-template-query data-plain14285 role="combobox" aria-label="Transaction template" aria-autocomplete="list" aria-expanded="false" aria-controls="generatorTemplates268" autocomplete="off"><select hidden data-plain14285 data-template>'+definitions().map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('')+'</select><div id="generatorTemplates268" data-template-options role="listbox" hidden></div></label><label>Transaction date<input class="je-input" type="date" data-date></label><label class="generator-wide258">General description<textarea class="je-input" rows="2" data-memo></textarea></label></div><div data-rates class="generator-rates258"></div><p>Choose a template, or enter the accounts and amounts you know. Generate detects a matching template and fills the remaining amounts. Enter the original book rate for a partial balance payment.</p><div data-matches></div><div class="generator-table258"><table><thead><tr><th>#</th><th>Account</th><th>Line memo</th><th>Currency</th><th>Debit</th><th>Credit</th><th>Book rate · LAK/unit</th><th></th></tr></thead><tbody></tbody></table></div><footer><button type="button" class="je-btn je-btn-secondary" data-add>Add line</button><button type="button" class="je-btn je-btn-secondary" data-generate>Generate</button><button type="button" class="je-btn je-btn-emerald" data-use disabled>Use in Post Entry</button></footer><p role="status" aria-live="polite" data-status></p>';
 document.body.append(dialog);render();
 dialog.querySelector('[data-template]').onchange=e=>selectTemplate(e.target.value);
 const query=dialog.querySelector('[data-template-query]'),list=dialog.querySelector('[data-template-options]');
 query.onfocus=()=>{query.select();templateChoices();};query.onclick=()=>{if(query.value===definitions().find(t=>t.id===state.template)?.name)query.select();templateChoices(query.value===definitions().find(t=>t.id===state.template)?.name?'':query.value);};query.oninput=()=>templateChoices(query.value);
 query.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();list.hidden=true;query.setAttribute('aria-expanded','false');}else if(e.key==='ArrowDown'){e.preventDefault();if(list.hidden)templateChoices();list.querySelector('button')?.focus();}else if(e.key==='Enter'){e.preventDefault();if(list.querySelectorAll('button').length===1)list.querySelector('button').click();}};
 list.onkeydown=e=>{const buttons=[...list.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();list.hidden=true;query.focus();list.hidden=true;query.setAttribute('aria-expanded','false');}};
 dialog.addEventListener('pointerdown',e=>{if(!e.target.closest('.generator-template268')){list.hidden=true;query.setAttribute('aria-expanded','false');}});
 dialog.querySelector('[data-date]').onchange=e=>{state.date=e.target.value;invalidate();};dialog.querySelector('[data-memo]').oninput=e=>{state.memo=e.target.value;invalidate();};
 dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.querySelector('[data-add]').onclick=()=>{state.rows.push(blank());invalidate();renderRows();};dialog.querySelector('[data-generate]').onclick=()=>void calculate();dialog.querySelector('[data-use]').onclick=()=>void useEntry();dialog.showModal();
}
function ready(){
 const button=document.createElement('button');button.type='button';button.id='generateJournal258';button.className='je-btn je-btn-secondary';button.textContent='Generate';button.onclick=open;$('addEntryRow14271')?.after(button);
 const style=document.createElement('style');style.textContent='#journalGenerator258{position:fixed;inset:0;margin:auto;transform:none;max-width:calc(100vw - 24px);width:min(1280px,calc(100vw - 24px));max-height:calc(100dvh - 24px);box-sizing:border-box;overflow:auto;border:1px solid #b9cfc2;border-radius:8px;padding:18px;background:#fff;color:#18392e}#journalGenerator258:not([open]){display:none!important}#journalGenerator258 .generator-template268{position:relative}#journalGenerator258 [data-template-options]{position:absolute;top:100%;left:0;right:0;max-height:260px;overflow:auto;z-index:3;background:#fffdf7;border:1px solid #98b3a2;box-shadow:0 6px 18px #0002}#journalGenerator258 [data-template-options][hidden]{display:none}#journalGenerator258 [data-template-options] button{display:block;width:100%;text-align:left;padding:9px;border:0;background:transparent;color:inherit;cursor:pointer;font-size:13px}#journalGenerator258 [data-template-options] button:hover,#journalGenerator258 [data-template-options] button:focus{background:#e4f1e7}#journalGenerator258 [data-matches]{display:flex;flex-wrap:wrap;gap:6px;font-size:13px}#journalGenerator258::backdrop{background:#0006}#journalGenerator258 header,#journalGenerator258 footer{display:flex;align-items:center;gap:8px;justify-content:space-between}#journalGenerator258 h3{margin:0 0 12px}#journalGenerator258 footer{justify-content:flex-end;flex-wrap:wrap;margin-top:14px}#journalGenerator258 .je-btn{height:32px;min-height:32px}#journalGenerator258 .generator-meta258{display:grid;grid-template-columns:2fr 1fr;gap:12px}#journalGenerator258 label{display:flex;flex-direction:column;gap:5px;font-size:13px;min-width:0}#journalGenerator258 .generator-wide258{grid-column:1/-1}#journalGenerator258 input,#journalGenerator258 select,#journalGenerator258 textarea{box-sizing:border-box;width:100%;color:inherit;background:#fff}#journalGenerator258 .generator-rates258{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}#journalGenerator258 .generator-rates258 label{width:180px}#journalGenerator258 p{font-size:13px;line-height:1.4}#journalGenerator258 .generator-table258{overflow:auto}#journalGenerator258 table{border-collapse:collapse;min-width:1070px;width:100%;font-size:12px}#journalGenerator258 th,#journalGenerator258 td{padding:6px;border-bottom:1px solid #d6e1da;text-align:left}#journalGenerator258 th{background:#eff5f1}#journalGenerator258 th:nth-child(2){width:29%}#journalGenerator258 th:nth-child(3){width:20%}#journalGenerator258 td input{border:0;background:transparent;padding:6px;min-width:92px}#journalGenerator258 td:nth-child(n+5) input{text-align:right}#journalGenerator258 td .account-search1428{border:0!important;background:transparent!important;box-shadow:none!important}#journalGenerator258 td select{border:0;background:transparent;min-width:250px}#journalGenerator258 [data-status]{white-space:pre-wrap;color:#235d44}#journalGenerator258 [data-status].has-error258{color:#9f2e24}@media(max-width:650px){#journalGenerator258{padding:12px}#journalGenerator258 .generator-meta258{grid-template-columns:1fr}}';document.head.append(style);
 const context=()=>{button.hidden=!!window.personalJournal1437?.active;const locked=$('loginGate')&&!$('loginGate').classList.contains('is-authenticated');if(dialog&&(owner!==who()||locked||window.personalJournal1437?.active)){close();state=null;verified='';}};
 window.addEventListener('page113',context);window.addEventListener('local-work14333',context);document.addEventListener('visibilitychange',context);new MutationObserver(context).observe($('loginGate')||document.body,{attributes:true,attributeFilter:['class','hidden']});
 // The shared editor moves into personal workspaces after page navigation.
 const card=$('journalEntry98');if(card)new MutationObserver(context).observe(card,{attributes:true,attributeFilter:['data-personal-owner1437']});
 style.textContent+='#generateJournal258[hidden]{display:none!important}';context();
}
window.GuidedJournal258={open};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
