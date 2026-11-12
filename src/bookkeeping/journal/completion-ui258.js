/* A separate template draft. Only Use in Post Entry copies rows to the journal. */
(()=>{'use strict';
const $=id=>document.getElementById(id),G=window.JournalCompletion258,esc=v=>escapeHtml(String(v??''));
let dialog=null,owner='',state=null,busy=false,revision=0,verified='',storageWarning='',job=null;
const Catalog=window.JournalTemplateCatalog268;
const who=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const chart=()=>AccountingStore.accounts.filter(G.available);
const key=()=> 'ojm_generator258:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+owner;
const number=v=>typeof v==='number'?v:String(v??'').trim()?parseAppNumber(String(v)):0;
const display=v=>typeof v==='number'?v.toLocaleString(typeof appNumberLocale==='function'?appNumberLocale():'en-US',{useGrouping:true,maximumFractionDigits:12}):v??'';
const offline=()=>!navigator.onLine||window.offline14239?.offline()||window.sessionCache14333?.localMode;
const blank=()=>({account_id:'',line_memo:'',debit:'',credit:''});
function eligible(){if(!who())throw Error('Sign in before preparing an entry.');if(window.personalJournal1437?.active||window.workspaceRequest138?.target)throw Error('Open the main company journal to use this generator.');if(!window.access113?.can('journal','edit')&&!window.access113?.can('journal','post'))throw Error('Journal editing permission is required.');if(window.DriveDrafts143128?.preparedCount||window.DriveDrafts143128?.editing||pendingWorkspacePostOwnerId||pendingWorkspacePostJournalId)throw Error('Finish the prepared entries before using this generator.');}
function persist(){if(owner!==who()||!state)return;try{localStorage.setItem(key(),JSON.stringify(state));storageWarning='';}catch{storageWarning='This draft could not be saved on this device. Keep the window open until it is copied to Post Entry.';}}
function invalidate(){revision++;verified='';if(dialog){dialog.querySelector('[data-use]').disabled=true;dialog.querySelector('[data-status]').textContent='';}persist();}
function definitions(){
 const saved=typeof availableTransactionTemplates==='function'?availableTransactionTemplates():[];
 return [{id:'blank',name:'Enter manually — detect template',lines:[{},{}]},...saved];
}
function templateRows(t){return (t.lines||[]).map(l=>{const a=l.code?chart().find(a=>String(a.code)===String(l.code)&&G.currency(a)===l.currency):l.accountId?chart().find(a=>a.id===l.accountId):typeof resolveTemplateAccount14397==='function'?resolveTemplateAccount14397(l):null;return {...blank(),account_id:a?.id||'',line_memo:l.memo||'',role:l.role,stage:l.stage,receiptLeg:l.receiptLeg,...(l.calculated?{generated:'output',autoMemo:true}:{}),expectedCurrency:l.currency,expectedSide:l.side,missing:!a&&(l.accountId||l.account||l.code)?String(l.account||l.code||l.accountId):''};});}
function entrySource(){
 const snap=typeof snapshotJournal69==='function'?snapshotJournal69():null;
 const memo=$('jeGeneralMemo')?.value||'',date=$('jeTransDate')?.value||'';
 const rows=[],editorRows=$('jeLinesBody')?.children||[];let template='blank';
 for(const [index,r] of (snap?.rows||[]).entries()){
  const credits=Object.entries(r.credits||{}).filter(([,v])=>number(v)!==0);
  if(!r.account&&!r.memo&&!number(r.dr)&&!credits.length)continue;
  const a=getSelectedAccountInfo(r.account);
  if(credits.length>1||a&&credits.some(([c])=>c!==G.currency(a)))throw Error('Check the credit currencies in Post Entry before generating.');
  const data=editorRows[index]?.dataset||{};
  if(data.generatorTemplate)template=data.generatorTemplate;
  rows.push({...blank(),expectedSide:data.templateSide274,role:data.generatorRole,expectedCurrency:data.generatorCurrency,stage:data.generatorStage,receiptLeg:data.generatorReceipt,
   ...(r.averageBookRate?{autoBook:true}:{}),
   ...(data.generatorCalculated&&!number(r.dr)&&!credits.length||r.generatorOutput===JSON.stringify([a?.id,number(r.dr),number(credits[0]?.[1]),r.memo||'',number(r.fxRate),number(r.bookRate)])?{generated:'output',autoMemo:true}:{}),sourceIndex:index,account_id:a?.id||'',missing:!a?r.account:'',line_memo:r.memo||'',debit:r.dr||'',credit:credits[0]?.[1]||'',
   fx_rate_lak:r.fxRate?Number(r.fxRate):'',book_rate_lak:r.bookRate?Number(r.bookRate):''});
 }
 if((!snap&&!memo.trim())||!memo.trim()&&!rows.length)return null;
 return {template,signature:JSON.stringify([typeof JournalModule==='undefined'?null:JournalModule.editingEntryId,date,memo,snap]),date,memo,rows:rows.length?rows:[blank(),blank()],rates:snap?.fxRates||{}};
}
function suggestions(){
 const memo=state.memo.toLowerCase();
 const families=[
  [/financial support|owner support|owner funding|capital contribution/,/financial support/],
  [/exchang|convert/,/exchange currency|exchange part or all/],
  [/settle|salary payment|paid.{0,20}salary/,/settle a salary/],
  [/salary accrual|payroll|salaries/,/accrue salaries/],
  [/bank fee|transfer fee|service charge/,/bank fee|lak fee/],
  [/prepaid|amortiz/,/prepay|recognize prepaid/],
  [/kitchen suppl/,/buy kitchen supplies/],
  [/dine.in|cash sales|sales receipt/,/record .*sales/],
  [/transfer between|cash deposit/,/transfer between/]
 ];
 const terms=memo.match(/[a-z]{3,}/g)||[],tokens=terms.filter(x=>!['the','from','and','for','that','with','was','into','received','paid'].includes(x));
 const ranked=definitions().filter(t=>t.id!=='blank').map(t=>{
  const name=t.name.toLowerCase();
  let score=families.reduce((n,[pattern,title])=>n+(pattern.test(memo)&&title.test(name)?5:0),0);
  score+=tokens.reduce((n,w)=>n+(name.includes(w)?1:0),0);
  if(/via|through|deposit/.test(memo)&&name.includes('via staff'))score+=2;
  return {t,score};
 }).filter(x=>x.score>=2).sort((a,b)=>b.score-a.score);
 return ranked.slice(0,8).map(x=>x.t);
}
function relatedTemplates(matches){
 const host=dialog.querySelector('[data-matches]');host.replaceChildren();
 if(!matches.length)return;
 host.append('Choose the transaction you recorded ');
 for(const t of matches){
  const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';b.textContent=t.name;
  b.onclick=()=>selectTemplate(t.id,true);host.append(b);
 }
}
function showHistory(){
 const host=dialog.querySelector('[data-history-list]'),detail=dialog.querySelector('[data-history-entry]');
 const q=dialog.querySelector('[data-history-query]').value.toLowerCase().trim(),groups=new Map();
 for(const l of (typeof JournalModule==='undefined'?[]:JournalModule.entries||[])){
  if(!l.id||l.voided_at||l.pendingSync||l.local14333||l.status&&l.status!=='posted')continue;
  if(!groups.has(l.id))groups.set(l.id,[]);
  groups.get(l.id).push(l);
 }
 host.replaceChildren();detail.replaceChildren();
 let count=0;
 for(const [id,lines] of [...groups].sort((a,b)=>(b[1][0].postingDate||b[1][0].date||'').localeCompare(a[1][0].postingDate||a[1][0].date||''))){
  if(!q&&!lines.some(l=>l.currency&&l.currency!=='LAK'))continue;
  const title=id+' · '+(lines[0].generalMemo||lines[0].memo||''),haystack=(title+' '+lines.map(l=>l.accountCode+' '+l.account).join(' ')).toLowerCase();
  if(!q.split(/\s+/).every(word=>haystack.includes(word)))continue;
  const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';b.textContent=id+' · '+(lines[0].postingDate||lines[0].date||'')+' · '+lines.length+' lines';b.title=title;
  b.onclick=()=>{detail.innerHTML='<p>'+esc(title)+'</p><div class="generator-table258"><table><thead><tr><th>Account</th><th>Currency</th><th>Debit</th><th>Credit</th><th>ER / VR</th><th>BR</th></tr></thead><tbody>'+lines.map(l=>'<tr>'+[l.accountCode+' — '+l.account,l.currency,display(Number(l.debit)||''),display(Number(l.credit)||''),l.fx_rate_lak?formatAppRate(l.fx_rate_lak):'',l.book_rate_lak?formatAppRate(l.book_rate_lak):''].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';};
  host.append(b);if(++count>=12)break;
 }
 if(!count)host.textContent='No matching posted journals in the loaded period.';
}
function restoreProtocolRows(draft,t){
 if(!draft||!t?.builtin)return;
 if(/^fx14383-(income|expense)$/.test(t.id)){
  const accounts=chart();
  for(const line of draft.rows)if(!line.expectedSide&&line.generated!=='output'){
   const side=currencyTemplateSide(t,accounts.find(a=>a.id===line.account_id));
   if(side)line.expectedSide=side;
  }
 }
 if(t.id==='gen268-mixed-payroll'&&draft.rows.some(l=>l.expectedCurrency==='THB')&&!draft.rows.some(l=>l.expectedCurrency==='LAK'&&l.generated!=='output')){
  draft.rows.unshift(...templateRows(t).filter(l=>l.expectedCurrency==='LAK'&&l.generated!=='output'));
 }
 if(t.id.startsWith('gen268-settlement-')&&draft.protocolVersion!==2){
  const layout=templateRows(t),bridge=layout.find(l=>l.generated&&l.expectedSide==='debit'&&l.expectedCurrency!=='LAK');
  const index=bridge?draft.rows.findIndex(l=>l.account_id===bridge.account_id&&l.generated==='output'&&!l.expectedSide&&!l.debit&&!l.credit):-1;
  if(index>=0){
   draft.rows.splice(index,1,...layout.filter(l=>l.account_id===bridge.account_id));
   const kip=layout[layout.length-1],old=draft.rows.find(l=>l.account_id===kip.account_id&&l.generated==='output');
   if(old){draft.rows.splice(draft.rows.indexOf(old),1);draft.rows.push(old);}
  }
 }
 if(draft.protocolVersion){draft.protocolVersion=2;return;}
 if(!draft.rows.some(l=>l.generated==='output')){
  for(const line of templateRows(t).filter(l=>l.generated==='output')){
   const present=draft.rows.some(l=>l.account_id===line.account_id&&(!line.expectedSide||
    !t.id.startsWith('gen268-settlement-')||l.expectedSide===line.expectedSide||number(l[line.expectedSide])>0));
   if(!present)draft.rows.push(line);
  }
 }
 draft.protocolVersion=2;
}
function selectTemplate(id,merge=false){
 state.drafts[state.template]={rows:state.rows,memo:state.memo,rates:state.rates,protocolVersion:state.protocolVersion};
 const previous=state.drafts[id],t=definitions().find(t=>t.id===id);if(!t)return;
 const fromEntry=state.entrySignature&&id!=='blank';
 const next=merge||fromEntry?{rows:Catalog.merge(fromEntry&&!merge?(entrySource()?.rows||state.rows):state.rows,t,chart(),templateRows),memo:state.memo||t.generalMemo||'',rates:state.rates}:previous||{rows:templateRows(t),memo:state.memo||t.generalMemo||'',rates:state.rates};
 restoreProtocolRows(next,t);Object.assign(state,next,{template:id,protocolVersion:2});dialog.querySelector('[data-matches]').replaceChildren();invalidate();render();suggestSourceBooks();
}
function message(text,error=false){const host=dialog?.querySelector('[data-status]');if(host){host.textContent=text+(storageWarning?' '+storageWarning:'');host.classList.toggle('has-error258',error);}}
function close(){
 const previous=dialog;if(!previous)return;
 const pending=job;dialog=null;job=null;revision++;busy=false;verified='';
 try{if(previous.open)previous.close();}finally{
  previous.remove();persist();
  try{window.dropdown1434?.close?.();}finally{pending?.end?.();$('generateJournal258')?.focus({preventScroll:true});}
 }
}
function dismissible(node){
 const outside=e=>{
  if(e.target!==node)return false;
  const b=node.getBoundingClientRect();
  return e.clientX<b.left||e.clientX>=b.right||e.clientY<b.top||e.clientY>=b.bottom;
 };
 let backdrop=false;
 node.addEventListener('pointerdown',e=>{backdrop=outside(e);});
 node.addEventListener('pointercancel',()=>{backdrop=false;});
 node.addEventListener('click',e=>{if(backdrop&&outside(e))close();backdrop=false;});
 node.querySelector('[data-close]').addEventListener('click',e=>{e.preventDefault();close();});
 node.addEventListener('cancel',e=>{e.preventDefault();close();});
 node.addEventListener('close',()=>{if(dialog===node)close();});
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
 if(matches.length===1){selectTemplate(matches[0].id,true);return 'Matched '+matches[0].name+'. ';}
 const candidates=matches.length?matches:suggestions();
 if(candidates.length){relatedTemplates(candidates);if(matches.length||!state.rows.some(l=>l.account_id))return null;}
 return '';
}
function renderRates(){
 const host=dialog.querySelector('[data-rates]'),cs=[...new Set(state.rows.map(l=>chart().find(a=>a.id===l.account_id)).filter(Boolean).map(G.currency).filter(c=>c!=='LAK'))].sort();
 for(const n of [...host.children])if(!cs.includes(n.dataset.currency))n.remove();
 for(const c of cs)if(![...host.children].some(n=>n.dataset.currency===c)){const label=document.createElement('label');label.dataset.currency=c;label.textContent='ER / VR · LAK per 1 '+c;const n=document.createElement('input');n.className='je-input';n.inputMode='decimal';n.setAttribute('aria-label','LAK per 1 '+c);bindAppRateInput(n,state.rates[c]??'');n.oninput=()=>{state.rates[c]=n.value;for(const l of state.rows)if(G.currency(chart().find(a=>a.id===l.account_id))===c&&!l.overrideRate)delete l.fx_rate_lak;invalidate();};label.append(n);host.append(label);}
}
const bookRequests292=new WeakMap();
function suggestSourceBooks(){
 for(const line of state.rows)if(line.account_id&&line.generated!=='output'&&(!line.book_rate_lak||line.autoBook))void suggestBook292(line);
}
async function suggestBook292(line){
 const account=chart().find(a=>a.id===line.account_id),date=state.date,actor=who();
 if(!account||G.currency(account)==='LAK'||!window.AccountRates143186)return;
 const request={};bookRequests292.set(line,request);
 if(typeof AccountRates143186.bookRateFor!=='function')return;
 const settling=line.role==='balance'||(!line.role&&G.staff(account)&&number(line.debit)>0);
 const book=await AccountRates143186.bookRateFor(account,date,JournalModule.editingEntryId||null,settling).catch(()=>null);
 if(busy||bookRequests292.get(line)!==request||actor!==who()||date!==state.date||account.id!==line.account_id||!dialog?.open||!state.rows.includes(line)||line.book_rate_lak&&!line.autoBook)return;
 if(!book&&!line.book_rate_lak||line.autoBook&&line.book_rate_lak===book)return;
 line.book_rate_lak=book||'';line.autoBook=true;
 const input=dialog.querySelector('[data-row="'+state.rows.indexOf(line)+'"] [data-field=book_rate_lak]');
 if(input&&document.activeElement!==input)bindAppRateInput(input,line.book_rate_lak);
 invalidate();persist();
}
function renderRows(){
 const body=dialog.querySelector('[data-entry-lines]'),accounts=chart(),options=accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.code+' — '+a.name+' · '+G.currency(a))+'</option>').join('');body.replaceChildren();
 state.rows.forEach((l,i)=>{
  const a=chart().find(a=>a.id===l.account_id),tr=document.createElement('tr');tr.dataset.row=i;
  tr.innerHTML='<td>'+(i+1)+(l.stage?'<small>'+esc(l.stage)+'</small>':'')+'</td><td><select class="je-select" aria-label="Account row '+(i+1)+'"><option value="">'+esc(l.role?'Choose '+l.role+(l.expectedCurrency?' · '+l.expectedCurrency:''):'Choose account')+'</option>'+options+'</select></td><td><input aria-label="Memo row '+(i+1)+'" data-field="line_memo" value="'+esc(l.line_memo)+'"></td><td data-currency>'+esc(a?G.currency(a):'')+'</td>'+['debit','credit','fx_rate_lak','book_rate_lak'].map(k=>'<td><input inputmode="decimal" '+(['debit','credit'].includes(k)?'data-numeric88="true" data-precision88="2" ':'')+'aria-label="'+({debit:'Debit',credit:'Credit',fx_rate_lak:'Transaction or valuation rate',book_rate_lak:'Book rate'}[k])+' row '+(i+1)+'" data-field="'+k+'" value="'+esc(display(l[k]&&['debit','credit'].includes(k)&&Number.isFinite(number(l[k]))?number(l[k]):l[k]||''))+'"'+((k==='book_rate_lak'||k==='fx_rate_lak')&&(!a||G.currency(a)==='LAK')?' disabled':'')+'></td>').join('')+'<td><button type="button" class="je-btn je-btn-secondary" aria-label="Delete row '+(i+1)+'">×</button></td>';
  setTemplateAmountHints(tr,l.expectedSide,l.generated==='output');
  const rowRate=tr.querySelector('[data-field=fx_rate_lak]');bindAppRateInput(rowRate,l.fx_rate_lak||'');if(a)rowRate.placeholder=display(state.rates[G.currency(a)]||'');
  const bookField=tr.querySelector('[data-field=book_rate_lak]');bindAppRateInput(bookField,l.book_rate_lak??'');
  const select=tr.querySelector('select');select.value=l.account_id;select.onchange=()=>{l.account_id=select.value;l.missing='';delete l.generated;delete l.book_rate_lak;delete l.fx_rate_lak;delete l.autoBook;delete l.overrideRate;
   if(l.receiptLeg==='receive'){const clear=state.rows.find(r=>r.receiptLeg==='clear');if(clear)clear.account_id=l.account_id;}
   invalidate();renderRows();renderRates();void suggestBook292(l);};
  for(const n of tr.querySelectorAll('[data-field]'))n.oninput=()=>{l[n.dataset.field]=n.value;if(n.dataset.field==='fx_rate_lak'){l.overrideRate=!!n.value;if(l.generated==='output')delete l.generated;}if(n.dataset.field==='line_memo')delete l.autoMemo;if(['debit','credit'].includes(n.dataset.field))delete l.generated;if(n.dataset.field==='book_rate_lak'){bookRequests292.delete(l);delete l.autoBook;delete l.generated;}invalidate();};
  tr.querySelector('button').onclick=()=>{state.rows.splice(i,1);if(!state.rows.length)state.rows.push(blank());invalidate();renderRows();renderRates();};body.append(tr);
 });
}
function render(){
 const repair=dialog.querySelector('[data-repair-layout]');
 repair.hidden=!legacyCashLayout();
 if(!repair.hidden){
  const t=definitions().find(t=>t.id===state.template);
  repair.textContent=t?'Load corrected template':'Choose a different template';
  repair.onclick=()=>{
   if(!t){dialog.querySelector('[data-template-query]').focus();templateChoices('');return;}
   state.rows=templateRows(t);invalidate();render();
   message('Enter the documented amounts in the corrected layout.');
  };
 }
 dialog.querySelector('[data-template]').value=state.template;dialog.querySelector('[data-date]').value=state.date;dialog.querySelector('[data-memo]').value=state.memo;
 dialog.querySelector('[data-template-query]').value=definitions().find(t=>t.id===state.template)?.name||'';
 dialog.querySelector('[data-rates]').replaceChildren();renderRates();renderRows();dialog.querySelector('[data-use]').disabled=true;
 const missing=state.rows.filter(l=>l.missing);if(missing.length)message('Choose current accounts for these saved template lines: '+missing.map(l=>l.missing).join(', '),true);
}
function readInput(){return {date:state.date,chart:chart(),rates:Object.fromEntries(Object.entries(state.rates).map(([c,v])=>[c,number(v)])),rows:state.rows.map(l=>({...l,debit:number(l.debit),credit:number(l.credit),book_rate_lak:number(l.book_rate_lak),fx_rate_lak:number(l.fx_rate_lak)}))};}
function legacyCashLayout(){
 if(!String(state.template||'').startsWith('gen268-local-'))return false;
 const t=definitions().find(t=>t.id===state.template);
 if(t&&!t.builtin)return false;
 const cash=state.rows.find(l=>l.role==='fund');
 if(!cash)return false;
 return !t||!t.lines.some(l=>l.role==='fund'&&l.side===cash.expectedSide)||
  t.id==='gen268-local-5420'&&!state.rows.some(l=>l.account_id===Catalog.resolve(t.lines[0],chart())?.id);
}
function validateLayout(input){
 if(legacyCashLayout())throw Error('This draft uses a superseded cash posting. Load the current template and review its accounts before generating.');
 const mixedPayroll=state.template==='gen268-mixed-payroll'&&definitions().find(t=>t.id===state.template)?.builtin;
 for(const [i,l] of input.rows.entries()){
  const a=input.chart.find(a=>a.id===l.account_id);
  if(!a)continue;
  if(mixedPayroll&&!['LAK','USD'].includes(G.currency(a)))throw Error('Mixed payroll uses LAK and USD. Review and remove the '+G.currency(a)+' row '+(i+1)+' before generating.');
  if(l.overrideRate&&!(l.fx_rate_lak>0))throw Error('Row '+(i+1)+' needs a positive exchange or valuation rate.');
  if(l.role&&!Catalog.accepts({role:l.role,currency:l.expectedCurrency},a))throw Error('Row '+(i+1)+' needs a '+(l.expectedCurrency||'')+' '+l.role+' account.');
  if(l.expectedSide&&l.generated!=='output'&&l[l.expectedSide==='debit'?'credit':'debit']>0)throw Error('Row '+(i+1)+' belongs on the '+l.expectedSide+' side for this template.');
 }
}
function fingerprint(){return JSON.stringify([who(),window.OJM_SUPABASE_URL,JournalModule.editingEntryId,state,snapshotJournal69(),$('jeGeneralMemo')?.value,$('jeTransDate')?.value]);}
async function balances(input){
 const explicitPrepaid=({l,a})=>a&&/^13\d\d$/.test(String(a.code))&&G.type(a)==='ASSET'&&!G.technical(a)&&l.credit>0&&l.book_rate_lak>0&&!l.autoBook;
 const source=input.rows.filter(l=>l.generated!=='output').map(l=>({l,a:input.chart.find(a=>a.id===l.account_id)}));
 const needs=source.filter(x=>!x.l.receiptLeg&&!explicitPrepaid(x)).filter(({l,a})=>a&&G.currency(a)!=='LAK'&&(G.fund(a)&&!l.debit||(l.debit>0||!l.debit&&!l.credit)&&(G.staff(a)||G.type(a)==='LIABILITY')||l.credit>0&&!G.technical(a)&&!G.fund(a)&&!G.staff(a)&&G.type(a)==='ASSET'));
 if(!needs.length)return {values:{},note:source.some(explicitPrepaid)?'Uses the entered historical prepaid rate. Check the source balance before posting.':''};
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
  if(G.fund(a)&&values[a.id]&&!state.entrySignature)for(const r of document.querySelectorAll('#jeLinesBody tr'))if(getSelectedAccountInfo(r.querySelector('.je-line-acc')?.value)?.id===a.id){if(parseCleanNumber(r.querySelector('.je-line-dr')?.value)>0)throw Error('Post Entry already receives money into '+a.name+'. Finish that transaction before using its new book value.');values[a.id].quantity-=parseCleanNumber(r.querySelector('.je-line-cr')?.value);}
 }
 return {values,note:estimated?'Device book-value estimate. Recheck after synchronization.':'Recorded account balances checked.'};
}
function showErrors(errors){message(errors.map(e=>(e.row!=null?'Row '+(e.row+1)+': ':'')+e.message.replace(/^Row \d+: /,'')).join('\n'),true);const book=errors.find(e=>e.needsBook&&e.row!=null);if(book)dialog.querySelector('[data-row="'+book.row+'"] [data-field="book_rate_lak"]')?.focus({preventScroll:true});}
async function calculate(){
 if(busy)return;const detected=detect();if(detected===null){message('Choose a matching template to see its journal lines.');return;}busy=true;verified='';dialog.querySelector('[data-use]').disabled=true;const actor=who(),rev=revision,before=fingerprint(),end=window.actionFeedback14296?.begin(dialog.querySelector('[data-generate]'),'Generating journal…'),task=job={end};
 try{eligible();if(!state.memo.trim())throw Error('Enter the general description.');if(!/^\d{4}-\d{2}-\d{2}$/.test(state.date))throw Error('Choose the transaction date.');const input=readInput();validateLayout(input);const missing=state.rows.findIndex(l=>!l.account_id&&(l.role||l.missing));if(missing>=0)throw Error('Row '+(missing+1)+': choose the '+(state.rows[missing].role||'missing')+' account before generating.');const b=await balances(input);if(!dialog?.open||actor!==who()||rev!==revision||before!==fingerprint())return;
  const result=G.complete({...input,balances:b.values});if(!result.errors.length){const unfinished=result.rows.find(l=>l.sourceIndex!=null&&!l.debit&&!l.credit&&(l.account_id||l.line_memo));if(unfinished)throw Error('Complete or remove the unfinished Post Entry line before using this journal.');}if(result.errors.length){verified='';dialog.querySelector('[data-use]').disabled=true;showErrors(result.errors);return;}
  state.rows=result.rows;persist();renderRows();renderRates();verified=JSON.stringify(readInput().rows);dialog.querySelector('[data-use]').disabled=false;message(detected+'Journal amounts filled. Review the debit and credit cells. '+b.note+(result.notes.length?' '+result.notes.join(' '):''));
 }catch(e){if(job===task&&actor===who()&&dialog?.open)message(e.message,true);}finally{if(job===task){busy=false;job=null;}end?.();}
}
async function useEntry(){
 if(busy||!verified)return;busy=true;const actor=who(),rev=revision,before=fingerprint(),end=window.actionFeedback14296?.begin(dialog.querySelector('[data-use]'),'Checking journal…'),task=job={end};
 try{eligible();const input=readInput();validateLayout(input);const missing=state.rows.findIndex(l=>!l.account_id&&(l.role||l.missing));if(missing>=0)throw Error('Row '+(missing+1)+': choose the '+(state.rows[missing].role||'missing')+' account before generating.');const b=await balances(input);if(!dialog?.open||actor!==who()||rev!==revision||before!==fingerprint())return;
  const result=G.complete({...input,balances:b.values});if(!result.errors.length){const unfinished=result.rows.find(l=>l.sourceIndex!=null&&!l.debit&&!l.credit&&(l.account_id||l.line_memo));if(unfinished)throw Error('Complete or remove the unfinished Post Entry line before using this journal.');}if(result.errors.length){showErrors(result.errors);verified='';dialog.querySelector('[data-use]').disabled=true;return;}
  if(JSON.stringify(result.rows)!==JSON.stringify(state.rows)){state.rows=result.rows;persist();renderRows();verified=JSON.stringify(readInput().rows);message('Recorded values changed. Review the updated debit and credit amounts, then use the journal again.',true);return;}
  const body=$('jeLinesBody'),memo=$('jeGeneralMemo'),oldMemo=memo.value,oldRates=JournalFX14383.capture(),oldDate=$('jeTransDate').value;
  const meaningful=r=>[...r.querySelectorAll('.je-line-acc,.je-line-memo,.je-line-dr,.je-line-cr')].some(n=>n.value.trim()),existing=[...body.children].some(meaningful);
  if(state.entrySignature&&entrySource()?.signature!==state.entrySignature)throw Error('Post Entry changed. Reopen Generate to use its current lines.');
  if(existing&&!state.entrySignature&&oldDate!==state.date)throw Error('Post Entry has an unfinished journal on another date. Finish it before copying this journal.');
  window.JournalUndo143103?.checkpoint();window.entry1430?.setMode('double');
  const oldRows=[...body.children],template=state.template!=='blank'&&definitions().find(t=>t.id===state.template);
  try{for(const r of oldRows)if(state.entrySignature||!meaningful(r))r.remove();if(!existing||state.entrySignature)$('jeTransDate').value=state.date;
   for(const l of result.rows.filter(l=>l.debit||l.credit)){const a=chart().find(a=>a.id===l.account_id);addJournalLineRow(a.code+' — '+a.name,l.line_memo,l.debit?display(l.debit):'',{[G.currency(a)]:l.credit?display(l.credit):''});const r=body.lastElementChild,original=state.entrySignature?oldRows[l.sourceIndex]:null;
    if(original){Object.assign(r.dataset,original.dataset);}
    if(template){
     r.dataset.generatorTemplate=template.id;r.dataset.templateSide274=l.expectedSide||'';
     if(template.builtin)Object.assign(r.dataset,{generatorRole:l.role||'',generatorCurrency:l.expectedCurrency||'',
      generatorStage:l.stage||'',generatorReceipt:l.receiptLeg||''});
    }
    delete r.dataset.averageBookRate;delete r.dataset.generatorOutput;
    r.dataset.fxRate14383=l.fx_rate_lak||number(state.rates[G.currency(a)])||1;r.dataset.bookRate14383=l.book_rate_lak||'';const date=r.querySelector('.je-line-date');if(date){const prior=original?.querySelector('.je-line-date');date.value=prior?.value||state.date;if(prior?.dataset.manualDate)date.dataset.manualDate=prior.dataset.manualDate;}
    if(l.generated==='output')r.dataset.generatorOutput=JSON.stringify([a.id,l.debit,l.credit,l.line_memo||'',number(r.dataset.fxRate14383),number(r.dataset.bookRate14383)]);
    if(template||r.dataset.generatorTemplate)setTemplateAmountHints(r,r.dataset.templateSide274,l.generated==='output'||r.dataset.generatorCalculated);
    if(l.fx_rate_lak&&G.currency(a)!=='LAK')r.dataset.explicitFx291='true';}
   memo.value=!state.entrySignature&&existing&&oldMemo.trim()?oldMemo+'\n'+state.memo:state.memo;JournalFX14383.restore(!state.entrySignature&&existing?{...state.rates,...oldRates}:state.rates);calculateJournalBalance();memo.dispatchEvent(new Event('input',{bubbles:true}));window.dispatchEvent(new Event('save-state14234'));window.drafts1427?.flush();window.JournalUndo143103?.record();
  }catch(e){body.replaceChildren(...oldRows);memo.value=oldMemo;$('jeTransDate').value=oldDate;JournalFX14383.restore(oldRates);calculateJournalBalance();throw e;}
  delete state.drafts[state.template];state=state.standalone||{template:'blank',date:state.date,memo:'',rates:{},rows:[blank(),blank()],drafts:state.drafts};persist();dialog.close();dialog.remove();dialog=null;verified='';showJournalEntry98();showCenterStatus('Completed journal copied. Review it, then use Post Entry when ready.');
 }catch(e){if(job===task&&actor===who()&&dialog?.open)message(e.message,true);}finally{if(job===task){busy=false;job=null;}end?.();}
}
function open(){
 let entry;try{eligible();entry=entrySource();if(typeof TemplateStore!=='undefined')TemplateStore.load();}catch(e){showCenterStatus(e.message,true);return;}
 if(dialog&&owner===who()){if(!dialog.open)dialog.showModal();return;}const retained=owner===who()&&state;owner=who();
 if(!retained)try{state=JSON.parse(localStorage.getItem(key())||'null');}catch{state=null;}
 if(!state||!Array.isArray(state.rows))state={template:'blank',date:$('jeTransDate').value,memo:'',rates:{},rows:[blank(),blank()],drafts:{}};
 if(entry&&entry.signature!==state.entrySignature){
  state={template:entry.template,entrySignature:entry.signature,date:entry.date,memo:entry.memo,rates:entry.rates,rows:entry.rows,drafts:{},standalone:state.entrySignature?state.standalone:state};
 }else if(!entry&&state.entrySignature)state=state.standalone||{template:'blank',date:$('jeTransDate').value,memo:'',rates:{},rows:[blank(),blank()],drafts:{}};
 state.drafts||={};state.rates||={};if(!definitions().some(t=>t.id===state.template)&&!legacyCashLayout())state.template='blank';
 restoreProtocolRows(state,definitions().find(t=>t.id===state.template));
 dialog=document.createElement('dialog');dialog.id='journalGenerator258';dialog.setAttribute('aria-labelledby','generatorTitle258');
 dialog.innerHTML='<header><h3 id="generatorTitle258">Generate journal</h3><button type="button" class="je-btn je-btn-secondary" data-close>Close</button></header><div class="generator-meta258"><label class="generator-template268">Transaction template<input class="je-input" data-template-query data-plain14285 role="combobox" aria-label="Transaction template" aria-autocomplete="list" aria-expanded="false" aria-controls="generatorTemplates268" autocomplete="off"><select hidden data-plain14285 data-template>'+definitions().map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('')+'</select><div id="generatorTemplates268" data-template-options role="listbox" hidden></div></label><label>Transaction date<input class="je-input" type="date" data-date></label><label class="generator-wide258">General description<textarea class="je-input" rows="2" data-memo></textarea></label></div><div data-rates class="generator-rates258"></div><p>Enter the business amounts and dated rates. Generate fills the LAK valuation, mappings and applicable FX. Use the row rate when a fee or exchange has its own rate.</p><details data-history><summary>Compare posted journals</summary><input data-plain14285 data-history-query type="search" aria-label="Find a posted journal" placeholder="Journal ID, description or account"><div data-history-list></div><div data-history-entry></div></details><a href="docs/protocols/index.html#F02" target="_blank" rel="noopener">Journaling protocol</a><div data-matches></div><button type="button" class="je-btn je-btn-secondary" data-repair-layout hidden></button><div class="generator-table258"><table><thead><tr><th>#</th><th>Account</th><th>Line memo</th><th>Currency</th><th>Debit</th><th>Credit</th><th>ER / VR</th><th title="Book rate in LAK per foreign unit">BR · LAK/unit</th><th></th></tr></thead><tbody data-entry-lines></tbody></table></div><footer><button type="button" class="je-btn je-btn-secondary" data-add>Add line</button><button type="button" class="je-btn je-btn-secondary" data-generate>Generate</button><button type="button" class="je-btn je-btn-emerald" data-use disabled>Use in Post Entry</button></footer><p role="status" aria-live="polite" data-status></p>';
 dismissible(dialog);document.body.append(dialog);
 const history=dialog.querySelector('[data-history]');history.ontoggle=()=>{if(history.open)showHistory();};history.querySelector('input').oninput=showHistory;
 try{render();}catch(e){close();showCenterStatus(e.message,true);return;}
 dialog.querySelector('[data-template]').onchange=e=>selectTemplate(e.target.value);
 const query=dialog.querySelector('[data-template-query]'),list=dialog.querySelector('[data-template-options]');
 query.onfocus=()=>{query.select();templateChoices();};query.onclick=()=>{if(query.value===definitions().find(t=>t.id===state.template)?.name)query.select();templateChoices(query.value===definitions().find(t=>t.id===state.template)?.name?'':query.value);};query.oninput=()=>templateChoices(query.value);
 query.onkeydown=e=>{if(e.key==='Escape'&&!list.hidden){e.preventDefault();e.stopPropagation();list.hidden=true;query.setAttribute('aria-expanded','false');}else if(e.key==='ArrowDown'){e.preventDefault();if(list.hidden)templateChoices();list.querySelector('button')?.focus();}else if(e.key==='Enter'){e.preventDefault();if(list.querySelectorAll('button').length===1)list.querySelector('button').click();}};
 list.onkeydown=e=>{const buttons=[...list.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();list.hidden=true;query.focus();list.hidden=true;query.setAttribute('aria-expanded','false');}};
 dialog.addEventListener('pointerdown',e=>{if(!e.target.closest('.generator-template268')){list.hidden=true;query.setAttribute('aria-expanded','false');}});
 dialog.querySelector('[data-date]').onchange=e=>{state.date=e.target.value;invalidate();for(const line of state.rows)if(line.autoBook||!line.book_rate_lak)void suggestBook292(line);};dialog.querySelector('[data-memo]').oninput=e=>{state.memo=e.target.value;invalidate();if(state.template==='blank')relatedTemplates(suggestions());};
 dialog.querySelector('[data-add]').onclick=()=>{state.rows.push(blank());invalidate();renderRows();};dialog.querySelector('[data-generate]').onclick=()=>void calculate();dialog.querySelector('[data-use]').onclick=()=>void useEntry();dialog.showModal();suggestSourceBooks();if(state.template==='blank'&&state.memo)relatedTemplates(suggestions());
}
function ready(){
 const button=document.createElement('button');button.type='button';button.id='generateJournal258';button.className='je-btn je-btn-secondary';button.textContent='Generate';button.onclick=open;$('addEntryRow14271')?.after(button);
 const style=document.createElement('style');style.textContent='#journalGenerator258{position:fixed;inset:0;margin:auto;transform:none;max-width:calc(100vw - 24px);width:min(1280px,calc(100vw - 24px));max-height:calc(100dvh - 24px);box-sizing:border-box;overflow:auto;border:1px solid #b9cfc2;border-radius:8px;padding:18px;background:#fff;color:#18392e}#journalGenerator258:not([open]){display:none!important}#journalGenerator258 .generator-template268{position:relative}#journalGenerator258 [data-template-options]{position:absolute;top:100%;left:0;right:0;max-height:260px;overflow:auto;z-index:3;background:#fffdf7;border:1px solid #98b3a2;box-shadow:0 6px 18px #0002}#journalGenerator258 [data-template-options][hidden]{display:none}#journalGenerator258 [data-template-options] button{display:block;width:100%;text-align:left;padding:9px;border:0;background:transparent;color:inherit;cursor:pointer;font-size:13px}#journalGenerator258 [data-template-options] button:hover,#journalGenerator258 [data-template-options] button:focus{background:#e4f1e7}#journalGenerator258 [data-matches]{display:flex;flex-wrap:wrap;gap:6px;font-size:13px}#journalGenerator258::backdrop{background:#0006}#journalGenerator258 header,#journalGenerator258 footer{display:flex;align-items:center;gap:8px;justify-content:space-between}#journalGenerator258 h3{margin:0 0 12px}#journalGenerator258 footer{justify-content:flex-end;flex-wrap:wrap;margin-top:14px}#journalGenerator258 .je-btn{height:32px;min-height:32px}#journalGenerator258 .generator-meta258{display:grid;grid-template-columns:2fr 1fr;gap:12px}#journalGenerator258 label{display:flex;flex-direction:column;gap:5px;font-size:13px;min-width:0}#journalGenerator258 .generator-wide258{grid-column:1/-1}#journalGenerator258 input,#journalGenerator258 select,#journalGenerator258 textarea{box-sizing:border-box;width:100%;color:inherit;background:#fff}#journalGenerator258 .generator-rates258{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}#journalGenerator258 .generator-rates258 label{width:180px}#journalGenerator258 p{font-size:13px;line-height:1.4}#journalGenerator258 .generator-table258{overflow:auto}#journalGenerator258 table{border-collapse:collapse;min-width:1070px;width:100%;font-size:12px}#journalGenerator258 th,#journalGenerator258 td{padding:6px;border-bottom:1px solid #d6e1da;text-align:left}#journalGenerator258 th{background:#eff5f1}#journalGenerator258 th:nth-child(2){width:29%}#journalGenerator258 th:nth-child(3){width:20%}#journalGenerator258 td input{border:0;background:transparent;padding:6px;min-width:92px}#journalGenerator258 td:nth-child(n+5) input{text-align:right}#journalGenerator258 td .account-search1428{border:0!important;background:transparent!important;box-shadow:none!important}#journalGenerator258 td select{border:0;background:transparent;min-width:250px}#journalGenerator258 [data-status]{white-space:pre-wrap;color:#235d44}#journalGenerator258 [data-status].has-error258{color:#9f2e24}@media(max-width:650px){#journalGenerator258{padding:12px}#journalGenerator258 .generator-meta258{grid-template-columns:1fr}}';document.head.append(style);
 const context=()=>{button.hidden=!!window.personalJournal1437?.active;const locked=$('loginGate')&&!$('loginGate').classList.contains('is-authenticated');if(dialog&&(owner!==who()||locked||window.personalJournal1437?.active)){close();state=null;verified='';}};
 window.addEventListener('page113',context);window.addEventListener('local-work14333',context);document.addEventListener('visibilitychange',context);new MutationObserver(context).observe($('loginGate')||document.body,{attributes:true,attributeFilter:['class','hidden']});
 // The shared editor moves into personal workspaces after page navigation.
 const card=$('journalEntry98');if(card)new MutationObserver(context).observe(card,{attributes:true,attributeFilter:['data-personal-owner1437']});
 style.textContent+='#jeLinesBody input[data-template-amount-hint]::placeholder,#journalGenerator258 input[data-template-amount-hint]::placeholder{color:#51685c;opacity:1;font-weight:600}';
 style.textContent+='#generateJournal258[hidden]{display:none!important}#journalGenerator258>header{position:sticky;top:-1px;background:#fff;z-index:4}#journalGenerator258 [data-close]{min-height:44px;touch-action:manipulation}#journalGenerator258{inset:auto;left:var(--feedback-left14295,0px);top:var(--feedback-top14295,0px);right:calc(100% - var(--feedback-left14295,0px) - var(--feedback-width14295,100%));bottom:calc(100% - var(--feedback-top14295,0px) - var(--feedback-height14295,100%));transform:none;margin:auto;width:min(1280px,calc(var(--feedback-width14295,100vw) - 24px));max-height:calc(var(--feedback-height14295,100dvh) - 24px)}#journalGenerator258 [data-history-list]{display:flex;gap:4px;flex-wrap:wrap}#journalGenerator258 details{margin:8px 0}#journalGenerator258 small{display:block}';context();
}
window.GuidedJournal258={open};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
