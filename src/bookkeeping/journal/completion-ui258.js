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
function formatMemoAmounts(text){
 if(!/\d{4}/.test(text))return text;
 const locale=typeof appNumberLocale==='function'?appNumberLocale():'en-US';
 const group=locale==='de-DE'?'.':locale==='fr-FR'?'\u202f':',',decimal=locale==='en-US'?'.':',';
 const codes=new Set(AccountingStore.accounts.map(a=>String(a.code)));
 // Keep links, identifiers, dates and existing punctuation intact. Group the original digits without rounding.
 return text.replace(/https?:\/\/[^\s]+|[\w.,:/#+-]+/gi,(token,index)=>{
  const match=/^((?:USD|LAK|THB)?)([+-]?)(\d{4,})([.,]\d+)?((?:USD|LAK|THB)?)([.,:]?)$/i.exec(token);
  if(!match)return token;
  const [,prefix,sign,whole,fraction='',suffix,punctuation]=match;
  if(whole[0]==='0'||fraction&&fraction[0]!==decimal)return token;
  const before=text.slice(0,index),after=text.slice(index+token.length);
  if(/\b(?:account|acct|code|ref(?:erence)?|id|invoice|receipt|voucher|phone|tel|no\.?|number)\s*[:#-]?\s*$/i.test(before))return token;
  const money=prefix||suffix||/(?:\b(?:LAK|USD|THB|kip|baht)|[₭$฿])\s*$/i.test(before)||/^\s*(?:\b(?:LAK|USD|THB|kip|baht)\b|[₭$฿])/i.test(after);
  if(!money&&!fraction&&(/^(19|20)\d{2}$/.test(whole)||codes.has(whole)))return token;
  return prefix+sign+whole.replace(/\B(?=(\d{3})+(?!\d))/g,group)+fraction+suffix+punctuation;
 });
}
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
function setupHistory(template){
 const history=dialog.querySelector('[data-history]'),latest=history.querySelector('[data-history-latest]');
 const toggle=history.querySelector('[data-history-toggle]'),panel=history.querySelector('[data-history-panel]');
 const query=history.querySelector('[data-history-query]'),list=history.querySelector('[data-history-list]'),detail=history.querySelector('[data-history-entry]');
 latest.replaceChildren();list.replaceChildren();detail.replaceChildren();detail.hidden=true;query.value='';
 panel.hidden=true;toggle.setAttribute('aria-expanded','false');
 history.hidden=!template||template.id==='blank';
 if(history.hidden)return;
 const matches=Catalog.postedExampleMatcher(template,AccountingStore.accounts);
 const groups=new Map();
 for(const line of (typeof JournalModule==='undefined'?[]:JournalModule.entries||[])){
  if(!line.id||line.voided_at||line.pendingSync||line.local14333||line.status&&line.status!=='posted')continue;
  if(!groups.has(line.id))groups.set(line.id,[]);
  groups.get(line.id).push(line);
 }
 const date=lines=>lines[0].postingDate||lines[0].date||'';
 const count=lines=>lines.length+(lines.length===1?' line':' lines');
 const entries=[...groups].filter(([,lines])=>matches(lines)).sort(([id,a],[other,b])=>date(b).localeCompare(date(a))||String(b[0].created_at||'').localeCompare(String(a[0].created_at||''))||other.localeCompare(id,undefined,{numeric:true}));
 let selected='';
 function expand(open){
  panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
  toggle.textContent=open?'Hide list':'Show all ('+entries.length+')';
 }
 function compare(id,lines,fromList){
  expand(false);
  if(!fromList&&selected===id&&!detail.hidden){detail.hidden=true;selected='';return;}
  selected=id;detail.hidden=false;
  const memo=lines[0].generalMemo||lines[0].memo||'';
  detail.innerHTML='<p><strong>'+esc(id)+'</strong> · '+esc(formatAppDate(date(lines)))+' · '+count(lines)+(memo?' · '+esc(memo):'')+'</p><div class="generator-table258"><table><thead><tr><th>Account</th><th>Currency</th><th>Debit</th><th>Credit</th><th>ER / VR</th><th>BR</th></tr></thead><tbody>'+lines.map(l=>'<tr>'+[l.accountCode+' — '+l.account,l.currency,display(Number(l.debit)||''),display(Number(l.credit)||''),l.fx_rate_lak?formatAppRate(l.fx_rate_lak):'',l.book_rate_lak?formatAppRate(l.book_rate_lak):''].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 }
 function button(id,lines,expanded){
  const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';
  b.textContent=id;b.title='Compare '+id;b.onclick=()=>{compare(id,lines,expanded);if(expanded)toggle.focus({preventScroll:true});};
  return b;
 }
 function filter(){
  const words=query.value.toLowerCase().trim().split(/\s+/).filter(Boolean),items=document.createDocumentFragment();
  for(const [id,lines] of entries){
   if(words.length){
    const text=[id,date(lines),...lines.flatMap(l=>[l.generalMemo,l.memo,l.accountCode,l.account])].join(' ').toLowerCase();
    if(!words.every(w=>text.includes(w)))continue;
   }
   const row=document.createElement('div');row.append(button(id,lines,true),formatAppDate(date(lines))+' · '+count(lines));items.append(row);
  }
  if(!items.childElementCount)items.append('No matching posted journals in the loaded period.');
  list.replaceChildren(items);
 }
 if(entries.length){
  for(const [id,lines] of entries.slice(0,3)){
   const sample=document.createElement('span');
   sample.append(button(id,lines,false),count(lines));latest.append(sample);
  }
 }else latest.textContent='No posted examples for this template in the loaded period.';
 expand(false);toggle.hidden=!entries.length;
 toggle.onclick=()=>{const opening=panel.hidden;expand(opening);if(opening){filter();query.focus();}};
 query.oninput=filter;
}
const emptyDraftRow=line=>!line.account_id&&!line.role&&!line.missing&&!line.line_memo&&!number(line.debit)&&!number(line.credit)&&!line.fx_rate_lak&&!line.book_rate_lak;
function returnRemovedRows(draft){
 if(!draft.removedRows?.length)return;
 if(draft.rows.length===1&&emptyDraftRow(draft.rows[0]))draft.rows.pop();
 for(const {index,line} of draft.removedRows.reverse())draft.rows.splice(index,0,line);
 delete draft.removedRows;
}
function recoverTemplateDraft(draft,t){
 if(!draft||!t||t.id==='blank')return;
 returnRemovedRows(draft);
 const layout=templateRows(t);
 if(draft.rows.every(emptyDraftRow)){draft.rows=layout;return;}
 // Older drafts saved the shortened row array with no removal history.
 if(!t.builtin||!t.id.startsWith('gen268-settlement-')||draft.rows.length>=layout.length)return;
 const remaining=draft.rows.filter(l=>!emptyDraftRow(l));
 draft.rows=layout.map(slot=>{
  const index=remaining.findIndex(l=>{
   if(slot.expectedSide&&l.expectedSide&&slot.expectedSide!==l.expectedSide)return false;
   if(slot.expectedSide&&number(l[slot.expectedSide==='debit'?'credit':'debit'])>0)return false;
   if(slot.role)return l.role===slot.role||Catalog.accepts({role:slot.role,currency:slot.expectedCurrency},chart().find(a=>a.id===l.account_id));
   return slot.account_id&&slot.account_id===l.account_id;
  });
  if(index<0)return slot;
  const [line]=remaining.splice(index,1);
  return {...slot,...line,expectedSide:slot.expectedSide,role:slot.role,expectedCurrency:slot.expectedCurrency};
 });
 draft.rows.push(...remaining);
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
 state.drafts[state.template]={rows:state.rows,removedRows:state.removedRows,memo:state.memo,rates:state.rates,protocolVersion:state.protocolVersion};
 const previous=state.drafts[id],t=definitions().find(t=>t.id===id);if(!t)return;
 const fromEntry=state.entrySignature&&id!=='blank';
 const next=merge||fromEntry?{rows:Catalog.merge(fromEntry&&!merge?(entrySource()?.rows||state.rows):state.rows,t,chart(),templateRows),memo:state.memo||t.generalMemo||'',rates:state.rates}:previous||{rows:templateRows(t),memo:state.memo||t.generalMemo||'',rates:state.rates};
 if(next===previous)recoverTemplateDraft(next,t);
 delete state.removedRows;
 restoreProtocolRows(next,t);Object.assign(state,next,{template:id,protocolVersion:2});dialog.querySelector('[data-matches]').replaceChildren();invalidate();render();setupHistory(t);suggestSourceBooks();
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
 const settling=line.role==='balance'||(!line.role&&G.staff(account)&&(line.expectedSide==='debit'||number(line.debit)>0));
 if(typeof AccountRates143186.bookRateFor!=='function')return;
 const previous=bookRequests292.get(line);
 if(previous?.pending&&previous.settling===settling&&previous.date===date&&previous.account===account.id)return;
 const request={pending:true,settling,date,account:account.id};bookRequests292.set(line,request);
 const book=await AccountRates143186.bookRateFor(account,date,JournalModule.editingEntryId||null,settling).catch(()=>null);
 const apply=()=>{
  if(bookRequests292.get(line)!==request||actor!==who()||date!==state.date||account.id!==line.account_id||!dialog?.open||!state.rows.includes(line)||line.book_rate_lak&&!line.autoBook)return;
  request.pending=false;
  const input=dialog.querySelector('[data-row="'+state.rows.indexOf(line)+'"] [data-field=book_rate_lak]');
  if(input){
   bindAppRateInput(input,book||'');
   if(!book&&(settling||G.fund(account)&&line.expectedSide==='credit')){
    input.placeholder='Enter BR';input.title='No recorded book rate for '+account.name+' on '+formatAppDate(date)+'. Enter the documented rate.';
   }
  }
  if((line.book_rate_lak||'')===(book||''))return;
  line.book_rate_lak=book||'';line.autoBook=true;persist();
 };
 // Generate checks its own fresh balance snapshot. Finish that check before updating a still-open input.
 if(job)(job.bookUpdates||=[]).push(apply);else apply();
}
function renderRows(){
 const body=dialog.querySelector('[data-entry-lines]'),accounts=chart(),options=accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.code+' — '+a.name+' · '+G.currency(a))+'</option>').join('');body.replaceChildren();
 state.rows.forEach((l,i)=>{
  const a=chart().find(a=>a.id===l.account_id),tr=document.createElement('tr');tr.dataset.row=i;
  tr.innerHTML='<td>'+(i+1)+(l.stage?'<small>'+esc(l.stage)+'</small>':'')+'</td><td><select class="je-select" aria-label="Account row '+(i+1)+'"><option value="">'+esc(l.role?'Choose '+l.role+(l.expectedCurrency?' · '+l.expectedCurrency:''):'Choose account')+'</option>'+options+'</select></td><td><input aria-label="Memo row '+(i+1)+'" data-field="line_memo" value="'+esc(l.line_memo)+'"></td><td data-currency>'+esc(a?G.currency(a):'')+'</td>'+['debit','credit','fx_rate_lak','book_rate_lak'].map(k=>'<td><input inputmode="decimal" '+(['debit','credit'].includes(k)?'data-numeric88="true" data-precision88="2" ':'')+'aria-label="'+({debit:'Debit',credit:'Credit',fx_rate_lak:'Transaction or valuation rate',book_rate_lak:'Book rate'}[k])+' row '+(i+1)+'" data-field="'+k+'" value="'+esc(display(l[k]&&['debit','credit'].includes(k)&&Number.isFinite(number(l[k]))?number(l[k]):l[k]||''))+'"'+((k==='book_rate_lak'||k==='fx_rate_lak')&&(!a||G.currency(a)==='LAK')?' disabled':'')+'></td>').join('')+'<td><button type="button" class="je-btn je-btn-secondary" title="Remove from this draft" aria-label="Remove row '+(i+1)+' from this draft">×</button></td>';
  setTemplateAmountHints(tr,l.expectedSide,l.generated==='output');
  if(l.generated==='output'||String(a?.code)==='5419'&&!l.expectedSide){
   const side=number(l.debit)>0?'debit':number(l.credit)>0?'credit':l.expectedSide;
   if(side){
    const input=tr.querySelector('[data-field="'+side+'"]');
    input.placeholder=(l.generated==='output'?'Auto ':'Enter ')+side;input.dataset.templateAmountHint='';
   }else{
    const hint=document.createElement('small');
    hint.textContent=String(a?.code)==='5419'?'Loss → debit · Gain → credit':
     'Generate sets the debit or credit';
    tr.querySelector('td:nth-child(3)').append(hint);
   }
  }
  const rowRate=tr.querySelector('[data-field=fx_rate_lak]');bindAppRateInput(rowRate,l.fx_rate_lak||'');if(a)rowRate.placeholder=display(state.rates[G.currency(a)]||'');
  const bookField=tr.querySelector('[data-field=book_rate_lak]');bindAppRateInput(bookField,l.book_rate_lak??'');
  if(!bookField.disabled&&l.generated!=='output'&&!l.book_rate_lak&&(l.role==='balance'||G.fund(a)&&l.expectedSide==='credit')){
   bookField.placeholder='Enter BR';bookField.title='Book rate for '+a.name+' on '+formatAppDate(state.date);
  }
  const select=tr.querySelector('select');select.value=l.account_id;select.onchange=()=>{l.account_id=select.value;l.missing='';delete l.generated;delete l.book_rate_lak;delete l.fx_rate_lak;delete l.autoBook;delete l.overrideRate;
   if(l.receiptLeg==='receive'){const clear=state.rows.find(r=>r.receiptLeg==='clear');if(clear)clear.account_id=l.account_id;}
   invalidate();renderRows();renderRates();void suggestBook292(l);};
  for(const n of tr.querySelectorAll('[data-field]'))n.oninput=()=>{l[n.dataset.field]=n.value;if(n.dataset.field==='fx_rate_lak'){l.overrideRate=!!n.value;if(l.generated==='output')delete l.generated;}if(n.dataset.field==='line_memo')delete l.autoMemo;if(['debit','credit'].includes(n.dataset.field)){
   delete l.generated;
   if(n.dataset.field==='debit'&&a&&G.staff(a)&&!l.role&&(!l.book_rate_lak||l.autoBook)){
    const settling=l.expectedSide==='debit'||number(l.debit)>0;
    if(bookRequests292.get(l)?.settling!==settling)void suggestBook292(l);
   }
  }if(n.dataset.field==='book_rate_lak'){bookRequests292.delete(l);delete l.autoBook;delete l.generated;}invalidate();};
  tr.querySelector('button').onclick=()=>{
   (state.removedRows||=[]).push({index:i,line:l});state.rows.splice(i,1);
   if(!state.rows.length)state.rows.push(blank());
   invalidate();renderRows();renderRates();
  };body.append(tr);
 });
 dialog.querySelector('[data-undo]').hidden=!state.removedRows?.length;
}
function render(){
 clearFieldErrors();
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
 const picker=dialog.querySelector('[data-template-query]');
 picker.value=definitions().find(t=>t.id===state.template)?.name||'';
 picker.title=picker.value;
 picker.parentElement.style.setProperty('--template-width',Math.max(26,picker.value.length+4)+'ch');
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
 const issue=(message,row,field)=>Object.assign(new Error(message),{row,field});
 if(legacyCashLayout())throw Error('This draft uses a superseded cash posting. Load the current template and review its accounts before generating.');
 const mixedPayroll=state.template==='gen268-mixed-payroll'&&definitions().find(t=>t.id===state.template)?.builtin;
 for(const [i,l] of input.rows.entries()){
  const a=input.chart.find(a=>a.id===l.account_id);
  if(!a)continue;
  if(mixedPayroll&&!['LAK','USD'].includes(G.currency(a)))throw issue('Mixed payroll uses LAK and USD. Review and remove the '+G.currency(a)+' row '+(i+1)+' before generating.',i,'account');
  if(l.overrideRate&&!(l.fx_rate_lak>0))throw issue('Enter a positive exchange or valuation rate.',i,'fx_rate_lak');
  if(l.role&&!Catalog.accepts({role:l.role,currency:l.expectedCurrency},a))throw issue('Choose a '+(l.expectedCurrency||'')+' '+l.role+' account.',i,'account');
  if(l.expectedSide&&l.generated!=='output'&&l[l.expectedSide==='debit'?'credit':'debit']>0)throw issue('Enter the amount on the '+l.expectedSide+' side for this template.',i,l.expectedSide==='debit'?'credit':'debit');
 }
}
function fingerprint(){return JSON.stringify([who(),window.OJM_SUPABASE_URL,JournalModule.editingEntryId,state,snapshotJournal69(),$('jeGeneralMemo')?.value,$('jeTransDate')?.value]);}
function ledgerContext(){
 return {entries:JournalModule.entries,length:JournalModule.entries?.length,date:state.date,editing:JournalModule.editingEntryId,offline:offline()};
}
async function balances(input,refresh=true){
 const explicitPrepaid=({l,a})=>a&&/^13\d\d$/.test(String(a.code))&&G.type(a)==='ASSET'&&!G.technical(a)&&l.credit>0&&l.book_rate_lak>0&&!l.autoBook;
 const source=input.rows.filter(l=>l.generated!=='output').map(l=>({l,a:input.chart.find(a=>a.id===l.account_id)}));
 const needs=source.filter(x=>!x.l.receiptLeg&&!explicitPrepaid(x)).filter(({l,a})=>a&&G.currency(a)!=='LAK'&&(G.fund(a)&&!l.debit||(l.debit>0||!l.debit&&!l.credit)&&(G.staff(a)||G.type(a)==='LIABILITY')||l.credit>0&&!G.technical(a)&&!G.fund(a)&&!G.staff(a)&&G.type(a)==='ASSET'));
 if(!needs.length)return {values:{},note:source.some(explicitPrepaid)?'Uses the entered historical prepaid rate. Check the source balance before posting.':''};
 const exclude=JournalModule.editingEntryId||null,localMode=offline(),snapshot=localMode?null:await AccountRates143186.snapshot(input.date,exclude,refresh);
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
function showCheckedBooks(values){
 for(const [index,line] of state.rows.entries()){
  const balance=values[line.account_id];
  if(!balance||line.book_rate_lak&&!line.autoBook||line.generated==='output')continue;
  const input=dialog.querySelector('[data-row="'+index+'"] [data-field=book_rate_lak]');
  if(!input||input.disabled)continue;
  bookRequests292.delete(line);
  line.book_rate_lak=balance.rate||'';line.autoBook=true;
  bindAppRateInput(input,line.book_rate_lak);
 }
 persist();
}
function clearFieldError(field){
 const id=field?.dataset.generatorError;
 if(!id)return;
 document.getElementById(id)?.remove();
 field.removeAttribute('aria-invalid');
 const remaining=(field.getAttribute('aria-describedby')||'').split(/\s+/).filter(value=>value&&value!==id);
 if(remaining.length)field.setAttribute('aria-describedby',remaining.join(' '));else field.removeAttribute('aria-describedby');
 delete field.dataset.generatorError;
}
function clearFieldErrors(){
 dialog.querySelectorAll('[data-generator-error]').forEach(clearFieldError);
}
function issueControl(error){
 if(error.field==='memo'||error.field==='date')return dialog.querySelector('[data-'+error.field+']');
 const row=dialog.querySelector('[data-row="'+error.row+'"]');
 if(!row)return null;
 if(error.needsBook)return row.querySelector('[data-field=book_rate_lak]');
 if(error.field==='account')return row.querySelector('.account-search1428')||row.querySelector('select');
 if(error.field==='rate'){
  const currency=row.querySelector('[data-currency]').textContent;
  return [...dialog.querySelectorAll('[data-rates] label')].find(label=>label.dataset.currency===currency)?.querySelector('input');
 }
 if(error.field)return row.querySelector('[data-field="'+error.field+'"]');
 row.tabIndex=-1;return row;
}
function showErrors(errors){
 clearFieldErrors();
 let first;
 const summary=errors.map((error,i)=>{
  const text=error.message.replace(/^Row \d+: /,''),control=issueControl(error);
  if(control&&!control.dataset.generatorError){
   const note=document.createElement('small');note.className='generator-error258';note.id='generatorFieldError258-'+i;
   note.textContent=text;
   const host=control.matches('tr')?control.cells[2]:control.closest('td,label')||control.parentElement;
   host.append(note);control.dataset.generatorError=note.id;control.setAttribute('aria-invalid','true');
   control.setAttribute('aria-describedby',[control.getAttribute('aria-describedby'),note.id].filter(Boolean).join(' '));first||=control;
  }
  let line=(error.row!=null?'Row '+(error.row+1)+': ':'')+text;
  if(error.needsBook){
   const a=chart().find(a=>a.id===state.rows[error.row]?.account_id);
   if(a)line+=' '+a.code+' — '+a.name+' · '+formatAppDate(state.date)+'.';
  }
  return line;
 });
 message(summary.join('\n'),true);
 if(first)first.focus({preventScroll:true});
 (first||dialog.querySelector('[data-status]')).scrollIntoView?.({block:'nearest',inline:'nearest'});
}
function missingFields(checkManual=false){
 const issues=[];
 if(!state.memo.trim())issues.push({field:'memo',message:'Enter the general description.'});
 if(!/^\d{4}-\d{2}-\d{2}$/.test(state.date))issues.push({field:'date',message:'Choose the transaction date.'});
 state.rows.forEach((l,row)=>{
  if(!l.account_id&&(l.role||l.missing||l.line_memo?.trim()||number(l.debit)||number(l.credit)))issues.push({field:'account',row,message:'Choose the '+(l.role||'posting')+' account.'});
 });
 if(checkManual&&state.template==='blank'&&!state.rows.some(l=>l.account_id)&&!issues.some(e=>e.field==='account')){
  issues.push({row:0,field:'account',message:'Choose a posting account.'});
 }
 if((state.template!=='blank'||checkManual)&&!state.rows.some(l=>!l.generated&&(number(l.debit)>0||number(l.credit)>0))){
  const row=state.rows.findIndex(l=>l.generated!=='output');
  if(row>=0)issues.push({row,field:state.rows[row].expectedSide||'debit',message:'Enter a known transaction amount.'});
 }
 return issues;
}
async function calculate(){
 if(busy)return;
 clearFieldErrors();
 const issues=missingFields();
 if(issues.length){verified='';dialog.querySelector('[data-use]').disabled=true;showErrors(issues);return;}
 const detected=detect();if(detected===null){message('Choose a matching template to see its journal lines.');return;}busy=true;verified='';dialog.querySelector('[data-use]').disabled=true;const actor=who(),rev=revision,before=fingerprint(),end=window.actionFeedback14296?.begin(dialog.querySelector('[data-generate]'),'Generating journal…'),task=job={end};
 try{eligible();const input=readInput();validateLayout(input);const required=missingFields(true);if(required.length){showErrors(required);return;}const b=await balances(input);if(!dialog?.open||actor!==who()||rev!==revision||before!==fingerprint())return;
  const result=G.complete({...input,balances:b.values});if(!result.errors.length){const unfinished=result.rows.find(l=>l.sourceIndex!=null&&!l.debit&&!l.credit&&(l.account_id||l.line_memo));if(unfinished)throw Error('Complete or remove the unfinished Post Entry line before using this journal.');}if(result.errors.length){verified='';dialog.querySelector('[data-use]').disabled=true;showCheckedBooks(b.values);showErrors(result.errors);return;}
  if(state.removedRows?.length){
   const generated=result.rows.filter(l=>l.generated==='output');
   const sameOutput=(a,b)=>a.account_id===b.account_id&&(a.expectedSide||(number(a.debit)?'debit':number(a.credit)?'credit':''))===(b.expectedSide||(number(b.debit)?'debit':number(b.credit)?'credit':''));
   // Reserve surviving outputs before matching any that Generate reinstated.
   for(const row of state.rows.filter(l=>l.generated==='output')){
    const i=generated.findIndex(l=>sameOutput(row,l));if(i>=0)generated.splice(i,1);
   }
   state.removedRows=state.removedRows.filter(({line})=>{
    const i=line.generated==='output'?generated.findIndex(l=>sameOutput(line,l)):-1;
    if(i<0)return true;generated.splice(i,1);return false;
   });
  }
  state.rows=result.rows;persist();renderRows();renderRates();verified=ledgerContext();dialog.querySelector('[data-use]').disabled=false;message(detected+'Journal amounts filled. Review the debit and credit cells. '+b.note+(result.notes.length?' '+result.notes.join(' '):''));
 }catch(e){if(job===task&&actor===who()&&dialog?.open)showErrors([e]);}finally{if(job===task){busy=false;job=null;for(const update of task.bookUpdates||[])update();}end?.();}
}
async function useEntry(){
 if(busy||!verified)return;busy=true;const actor=who(),rev=revision,before=fingerprint(),end=window.actionFeedback14296?.begin(dialog.querySelector('[data-use]'),'Copying journal…'),task=job={end};
 try{eligible();const input=readInput();validateLayout(input);const required=missingFields(true);if(required.length){showErrors(required);return;}const ledger=ledgerContext();
  // Copy uses the rates already checked by Generate. A changed ledger or connection needs a new snapshot.
  const changed=Object.keys(ledger).some(key=>ledger[key]!==verified[key]);
  const b=await balances(input,changed);if(!dialog?.open||actor!==who()||rev!==revision||before!==fingerprint())return;
  const result=G.complete({...input,balances:b.values});if(!result.errors.length){const unfinished=result.rows.find(l=>l.sourceIndex!=null&&!l.debit&&!l.credit&&(l.account_id||l.line_memo));if(unfinished)throw Error('Complete or remove the unfinished Post Entry line before using this journal.');}if(result.errors.length){showCheckedBooks(b.values);showErrors(result.errors);verified='';dialog.querySelector('[data-use]').disabled=true;return;}
  if(JSON.stringify(result.rows)!==JSON.stringify(state.rows)){state.rows=result.rows;persist();renderRows();verified=ledgerContext();message('Recorded values changed. Review the updated debit and credit amounts, then use the journal again.',true);return;}
  const body=$('jeLinesBody'),memo=$('jeGeneralMemo'),oldMemo=memo.value,oldRates=JournalFX14383.capture(),oldDate=$('jeTransDate').value;
  const meaningful=r=>[...r.querySelectorAll('.je-line-acc,.je-line-memo,.je-line-dr,.je-line-cr')].some(n=>n.value.trim()),existing=[...body.children].some(meaningful);
  if(state.entrySignature&&entrySource()?.signature!==state.entrySignature)throw Error('Post Entry changed. Reopen Generate to use its current lines.');
  if(existing&&!state.entrySignature&&oldDate!==state.date)throw Error('Post Entry has an unfinished journal on another date. Finish it before copying this journal.');
  window.JournalUndo143103?.checkpoint();window.entry1430?.setMode('double');
  const oldRows=[...body.children],template=state.template!=='blank'&&definitions().find(t=>t.id===state.template);
  const fill=()=>{for(const r of oldRows)if(state.entrySignature||!meaningful(r))r.remove();if(!existing||state.entrySignature)$('jeTransDate').value=state.date;
   for(const l of result.rows.filter(l=>l.debit||l.credit)){const a=input.chart.find(a=>a.id===l.account_id);addJournalLineRow(a.code+' — '+a.name,l.line_memo,l.debit?display(l.debit):'',{[G.currency(a)]:l.credit?display(l.credit):''});const r=body.lastElementChild,original=state.entrySignature?oldRows[l.sourceIndex]:null;
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
   memo.value=!state.entrySignature&&existing&&oldMemo.trim()?oldMemo+'\n'+state.memo:state.memo;JournalFX14383.restore(!state.entrySignature&&existing?{...state.rates,...oldRates}:state.rates);calculateJournalBalance();memo.dispatchEvent(new Event('input',{bubbles:true}));
  };
  try{
   if(window.JournalRendering261)JournalRendering261.batch(fill);else fill();
   window.dispatchEvent(new Event('save-state14234'));window.drafts1427?.flush();window.JournalUndo143103?.record();
  }catch(e){body.replaceChildren(...oldRows);memo.value=oldMemo;$('jeTransDate').value=oldDate;JournalFX14383.restore(oldRates);calculateJournalBalance();throw e;}
  delete state.drafts[state.template];state=state.standalone||{template:'blank',date:state.date,memo:'',rates:{},rows:[blank(),blank()],drafts:state.drafts};persist();dialog.close();dialog.remove();dialog=null;verified='';showJournalEntry98();showCenterStatus('Completed journal copied. Review it, then use Post Entry when ready.');
 }catch(e){if(job===task&&actor===who()&&dialog?.open)showErrors([e]);}finally{if(job===task){busy=false;job=null;for(const update of task.bookUpdates||[])update();}end?.();}
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
 const template=definitions().find(t=>t.id===state.template);
 recoverTemplateDraft(state,template);restoreProtocolRows(state,template);persist();
 dialog=document.createElement('dialog');dialog.id='journalGenerator258';dialog.setAttribute('aria-labelledby','generatorTitle258');
 dialog.innerHTML='<header><h3 id="generatorTitle258">Generate journal</h3><button type="button" class="je-btn je-btn-secondary" data-close>Close</button></header><div class="generator-content258"><div class="generator-meta258"><label class="generator-date258">Transaction date<input class="je-input" type="date" data-date required></label><div data-rates class="generator-rates258"></div><label class="generator-template268">Transaction template<input class="je-input" data-template-query data-plain14285 role="combobox" aria-label="Transaction template" aria-autocomplete="list" aria-expanded="false" aria-controls="generatorTemplates268" autocomplete="off"><select hidden data-plain14285 data-template>'+definitions().map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('')+'</select><div id="generatorTemplates268" data-template-options role="listbox" hidden></div></label><label class="generator-wide258">General description<textarea class="je-input" rows="2" data-memo required></textarea></label></div><section data-history aria-label="Compare posted journals"><div class="history-bar258"><strong>Compare posted journals</strong><span data-history-latest></span><button type="button" class="je-btn je-btn-secondary" data-history-toggle aria-controls="journalHistoryPanel258"></button></div><div data-history-panel id="journalHistoryPanel258" hidden><input data-plain14285 data-history-query type="search" aria-label="Find a posted journal" placeholder="Journal ID, description or account"><div data-history-list></div></div><div data-history-entry hidden></div></section><p>Enter the business amounts and dated rates. Generate fills the LAK valuation, mappings and applicable FX. Use the row rate when a fee or exchange has its own rate.</p><div data-matches></div><button type="button" class="je-btn je-btn-secondary" data-repair-layout hidden></button><div class="generator-table258"><table><thead><tr><th>#</th><th>Account</th><th>Line memo</th><th>Currency</th><th>Debit</th><th>Credit</th><th>ER / VR</th><th title="Book rate in LAK per foreign unit">BR · LAK/unit</th><th></th></tr></thead><tbody data-entry-lines></tbody></table></div><footer><button type="button" class="je-btn je-btn-secondary" data-add>Add line</button><button type="button" class="je-btn je-btn-secondary" data-undo hidden>Undo removal</button><button type="button" class="je-btn je-btn-secondary" data-generate>Generate</button><button type="button" class="je-btn je-btn-emerald" data-use disabled>Use in Post Entry</button></footer><p role="status" aria-live="polite" data-status></p></div>';
 dismissible(dialog);document.body.append(dialog);
 const clearEdited=e=>{const field=e.target;if(field.value?.trim())clearFieldError(field);};
 dialog.addEventListener('input',clearEdited);dialog.addEventListener('change',clearEdited);
 try{render();setupHistory(template);}catch(e){close();showCenterStatus(e.message,true);return;}
 dialog.querySelector('[data-template]').onchange=e=>selectTemplate(e.target.value);
 const query=dialog.querySelector('[data-template-query]'),list=dialog.querySelector('[data-template-options]');
 query.onfocus=()=>{query.select();templateChoices();};query.onclick=()=>{if(query.value===definitions().find(t=>t.id===state.template)?.name)query.select();templateChoices(query.value===definitions().find(t=>t.id===state.template)?.name?'':query.value);};query.oninput=()=>templateChoices(query.value);
 query.onkeydown=e=>{if(e.key==='Escape'&&!list.hidden){e.preventDefault();e.stopPropagation();list.hidden=true;query.setAttribute('aria-expanded','false');}else if(e.key==='ArrowDown'){e.preventDefault();if(list.hidden)templateChoices();list.querySelector('button')?.focus();}else if(e.key==='Enter'){e.preventDefault();if(list.querySelectorAll('button').length===1)list.querySelector('button').click();}};
 list.onkeydown=e=>{const buttons=[...list.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();list.hidden=true;query.focus();list.hidden=true;query.setAttribute('aria-expanded','false');}};
 dialog.addEventListener('pointerdown',e=>{if(!e.target.closest('.generator-template268')){list.hidden=true;query.setAttribute('aria-expanded','false');}});
 dialog.querySelector('[data-date]').onchange=e=>{state.date=e.target.value;
  for(const line of state.rows)if(line.autoBook)delete line.book_rate_lak;
  invalidate();renderRows();suggestSourceBooks();};dialog.querySelector('[data-memo]').oninput=e=>{state.memo=e.target.value;invalidate();if(state.template==='blank')relatedTemplates(suggestions());};
 dialog.querySelector('[data-undo]').onclick=()=>{
  const item=state.removedRows?.pop();if(!item)return;
  if(state.rows.length===1&&emptyDraftRow(state.rows[0]))state.rows.pop();
  state.rows.splice(item.index,0,item.line);invalidate();renderRows();renderRates();suggestSourceBooks();
 };
 dialog.querySelector('[data-add]').onclick=()=>{state.rows.push(blank());invalidate();renderRows();};dialog.querySelector('[data-generate]').onclick=()=>void calculate();dialog.querySelector('[data-use]').onclick=()=>void useEntry();dialog.showModal();suggestSourceBooks();if(state.template==='blank'&&state.memo)relatedTemplates(suggestions());
}
function ready(){
 const memoFields='#jeGeneralMemo,#jeLinesBody .je-line-memo,#simpleRows1430 [data-simple="memo"],#journalGenerator258 [data-memo],#journalGenerator258 [data-field="line_memo"]';
 const edited=new WeakSet();
 document.addEventListener('input',e=>{if(e.target.matches?.(memoFields))edited.add(e.target);},true);
 document.addEventListener('change',e=>{
  const field=e.target;
  if(!edited.delete(field))return;
  const formatted=formatMemoAmounts(field.value);
  if(formatted!==field.value){field.value=formatted;field.dispatchEvent(new Event('input',{bubbles:true}));edited.delete(field);}
 },true);
 const button=document.createElement('button');button.type='button';button.id='generateJournal258';button.className='je-btn je-btn-secondary';button.textContent='Generate';button.onclick=open;$('addEntryRow14271')?.after(button);
 const style=document.createElement('style');style.textContent='#journalGenerator258{position:fixed;inset:0;margin:auto;transform:none;max-width:calc(100vw - 24px);width:min(1280px,calc(100vw - 24px));max-height:calc(100dvh - 24px);box-sizing:border-box;overflow:hidden;border:1px solid #b9cfc2;border-radius:8px;padding:0;background:#fff;color:#18392e}#journalGenerator258:not([open]){display:none!important}#journalGenerator258 .generator-template268{position:relative;flex:1 1 17rem;max-width:min(100%,var(--template-width,40ch))}#journalGenerator258 [data-template-options]{position:absolute;top:100%;left:0;right:0;max-height:260px;overflow:auto;z-index:3;background:#fffdf7;border:1px solid #98b3a2;box-shadow:0 6px 18px #0002}#journalGenerator258 [data-template-options][hidden]{display:none}#journalGenerator258 [data-template-options] button{display:block;width:100%;text-align:left;padding:9px;border:0;background:transparent;color:inherit;cursor:pointer;font-size:13px}#journalGenerator258 [data-template-options] button:hover,#journalGenerator258 [data-template-options] button:focus{background:#e4f1e7}#journalGenerator258 [data-matches]{display:flex;flex-wrap:wrap;gap:6px;font-size:13px}#journalGenerator258::backdrop{background:#0006}#journalGenerator258 header,#journalGenerator258 footer{display:flex;align-items:center;gap:8px;justify-content:space-between}#journalGenerator258 h3{margin:0 0 12px}#journalGenerator258 footer{justify-content:flex-end;flex-wrap:wrap;margin-top:14px}#journalGenerator258 .je-btn{height:32px;min-height:32px}#journalGenerator258 .generator-meta258{display:flex;align-items:flex-start;flex-wrap:wrap;gap:8px 12px}#journalGenerator258 label{display:flex;flex-direction:column;gap:5px;font-size:13px;min-width:0}#journalGenerator258 .generator-wide258{flex:0 0 100%}#journalGenerator258 input,#journalGenerator258 select,#journalGenerator258 textarea{box-sizing:border-box;width:100%;color:inherit;background:#fff}#journalGenerator258 .generator-rates258{display:contents}#journalGenerator258 .generator-date258{width:8.8rem}#journalGenerator258 .generator-rates258 input{width:calc(11ch + 18px)}#journalGenerator258 p{font-size:13px;line-height:1.4}#journalGenerator258 .generator-table258{overflow:auto}#journalGenerator258 table{border-collapse:collapse;min-width:1070px;width:100%;font-size:12px}#journalGenerator258 th,#journalGenerator258 td{padding:6px;border-bottom:1px solid #d6e1da;text-align:left}#journalGenerator258 th{background:#eff5f1}#journalGenerator258 th:nth-child(2){width:29%}#journalGenerator258 th:nth-child(3){width:20%}#journalGenerator258 td input{border:0;background:transparent;padding:6px;min-width:92px}#journalGenerator258 td:nth-child(n+5) input{text-align:right}#journalGenerator258 td .account-search1428{border:0!important;background:transparent!important;box-shadow:none!important}#journalGenerator258 td select{border:0;background:transparent;min-width:250px}#journalGenerator258 [data-status]{white-space:pre-wrap;color:#235d44}#journalGenerator258 [data-status].has-error258{color:#9f2e24}@media(max-width:650px){#journalGenerator258 .generator-content258{padding:12px}#journalGenerator258 .generator-template268{flex-basis:100%}}';document.head.append(style);
 const context=()=>{button.hidden=!!window.personalJournal1437?.active;const locked=$('loginGate')&&!$('loginGate').classList.contains('is-authenticated');if(dialog&&(owner!==who()||locked||window.personalJournal1437?.active)){close();state=null;verified='';}};
 window.addEventListener('page113',context);window.addEventListener('local-work14333',context);document.addEventListener('visibilitychange',context);new MutationObserver(context).observe($('loginGate')||document.body,{attributes:true,attributeFilter:['class','hidden']});
 // The shared editor moves into personal workspaces after page navigation.
 const card=$('journalEntry98');if(card)new MutationObserver(context).observe(card,{attributes:true,attributeFilter:['data-personal-owner1437']});
 style.textContent+='#jeLinesBody input[data-template-amount-hint]::placeholder,#journalGenerator258 input[data-template-amount-hint]::placeholder{color:#51685c;opacity:1;font-weight:600}';
 style.textContent+='#generateJournal258[hidden]{display:none!important}#journalGenerator258[open]{display:flex;flex-direction:column}#journalGenerator258>header{position:relative;flex:none;background:#fff;padding:8px 18px;border-bottom:1px solid #d6e1da;z-index:4}#journalGenerator258>header h3{margin:0}#journalGenerator258 .generator-content258{overflow:auto;min-height:0;overscroll-behavior:contain;padding:12px 18px}#journalGenerator258 [data-close]{min-height:44px;touch-action:manipulation}#journalGenerator258{inset:auto;left:var(--feedback-left14295,0px);top:var(--feedback-top14295,0px);right:calc(100% - var(--feedback-left14295,0px) - var(--feedback-width14295,100%));bottom:calc(100% - var(--feedback-top14295,0px) - var(--feedback-height14295,100%));transform:none;margin:auto;width:min(1280px,calc(var(--feedback-width14295,100vw) - 24px));max-height:calc(var(--feedback-height14295,100dvh) - 24px)}#journalGenerator258 small{display:block}';
 style.textContent+=`
 #journalGenerator258 [data-generator-error]{outline:2px solid #a33625;outline-offset:1px}
 #journalGenerator258 .generator-error258{color:#872a1d;font-weight:600;white-space:normal}
 #journalGenerator258 [data-history]{margin:10px 0;font-size:13px}
 #journalGenerator258 .history-bar258,#journalGenerator258 [data-history-latest],#journalGenerator258 [data-history-list]>div{display:flex;align-items:center;gap:8px}
 #journalGenerator258 .history-bar258{min-height:36px}
 #journalGenerator258 [data-history-latest]>span{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
 @media(max-width:1000px){#journalGenerator258 [data-history-latest]>span{flex-direction:column;gap:2px}}
 #journalGenerator258 [data-history-toggle]{margin-left:auto;white-space:nowrap}
 #journalGenerator258 [data-history-list]{max-height:13rem;overflow:auto}
 #journalGenerator258 [data-history-list]>div{padding:4px;border-bottom:1px solid #d6e1da}
 #journalGenerator258 [data-history-panel] input{margin:4px 0}
 #journalGenerator258 [data-history][hidden],#journalGenerator258 [data-history] [hidden],#journalGenerator258 [data-undo][hidden]{display:none!important}
 @media(max-width:650px){#journalGenerator258 .history-bar258{flex-wrap:wrap}#journalGenerator258 [data-history-latest]{order:1;width:100%;overflow-x:auto;gap:5px}#journalGenerator258 [data-history-latest] button{padding-inline:5px!important}}
 `;context();
}
window.GuidedJournal258={open};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
