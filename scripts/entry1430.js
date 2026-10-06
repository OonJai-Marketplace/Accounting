/* Simple entry is an editor for the existing balanced journal, never a second ledger. */
(()=>{'use strict';
const $=id=>document.getElementById(id);let mode='double',building=false,owner='',lastSingle=null;
const esc=v=>escapeHtml(String(v??''));
const accounts=()=>AccountingStore.accounts.filter(a=>a.id&&a.isPosting!==false&&a.currency&&a.currency!=='NA'&&a.displayCurrency!=='—'&&(!window.personalJournal1437?.active||personalJournal1437.allowed(a)));
const account=id=>accounts().find(a=>a.id===id);
const label=a=>a.code+' — '+a.name;
const amount=s=>{const raw=String(s??'').trim().replaceAll(',','');return raw?Number(raw):0;};
function choices1438(role,direction,source){
 const rules=window.personalJournal1437?.rules;if(!rules)return accounts();
 const ids=role==='source'?rules.fundIds:(direction==='in'?[rules.counterpart]:rules.entryIds);
 const currency=accounts().find(a=>a.id===source)?.currency;
 return accounts().filter(a=>ids.includes(a.id)&&(role==='source'||!currency||a.currency===currency));
}
function options(selected='',role,direction='out',source=''){
 const list=choices1438(role,direction,source);
 if(window.personalJournal1437?.active&&role==='source'&&!selected&&list.length===1)selected=list[0].id;
 return '<option value="">Choose account</option>'+list.map(a=>'<option value="'+esc(a.id)+'" '+(a.id===selected?'selected':'')+'>'+esc(label(a)+' · '+a.currency)+'</option>').join('');
}
function restrictRow1438(n){
 const rules=window.personalJournal1437?.rules;if(!rules)return;
 const dir=n.querySelector('[data-simple=direction]'),old=dir.value;
 const html=rules.directions.map(d=>'<option value="'+d+'">Money '+(d==='in'?'In':'Out')+'</option>').join('');
 if(dir.innerHTML!==html){dir.innerHTML=html;dir.value=rules.directions.includes(old)?old:rules.directions[0]||'';}
 for(const role of ['source','affected']){const field=n.querySelector('[data-simple='+role+']'),source=n.querySelector('[data-simple=source]').value;
 const list=choices1438(role,dir.value,source),selected=list.some(a=>a.id===field.value)?field.value:'';
 const html=options(selected,role,dir.value,source);if(field.innerHTML!==html)field.innerHTML=html;
 }
}
function directionToggle(n){
 const select=n.querySelector('[data-simple=direction]');let button=n.querySelector('.direction-toggle1439');
 if(!button){button=document.createElement('button');button.type='button';button.className='je-btn direction-toggle1439';button.setAttribute('role','switch');select.hidden=true;select.after(button);button.onclick=()=>{const options=[...select.options].filter(o=>!o.disabled);if(select.disabled||options.length<2)return;select.value=options[(options.findIndex(o=>o.value===select.value)+1)%options.length].value;select.dispatchEvent(new Event('change',{bubbles:true}));directionToggle(n);};}
 button.textContent=select.value==='in'?'Money In':'Money Out';button.dataset.direction=select.value;button.setAttribute('aria-label','Money In');button.setAttribute('aria-checked',String(select.value==='in'));button.title='Switch between Money In and Money Out';button.disabled=select.disabled||select.options.length<2;
}
function read(){return [...$('simpleRows1430').children].map(r=>({direction:r.querySelector('[data-simple=direction]').value,source:r.querySelector('[data-simple=source]').value,affected:r.querySelector('[data-simple=affected]').value,amount:r.querySelector('[data-simple=amount]').value,memo:r.querySelector('[data-simple=memo]').value,date:r.querySelector('[data-simple=date]').value}));}
function add(row={}){
 const n=document.createElement('div');n.className='simple-row1430';
 n.innerHTML='<label class="simple-date1430">Date<input class="je-input" type="date" data-simple="date" value="'+esc(row.date||$('jeTransDate').value)+'"></label>'+
 '<label>Direction<select class="je-select" data-simple="direction"><option value="out">Money Out</option><option value="in">Money In</option></select></label>'+
 '<label>Source / payment account<select class="je-select" name="sourceAccount1430" data-simple="source" aria-label="Source / payment account">'+options(row.source,'source',row.direction||'out')+'</select></label>'+
 '<label>Affected / category account<select class="je-select" name="affectedAccount1430" data-simple="affected" aria-label="Affected / category account">'+options(row.affected,'affected',row.direction||'out',row.source)+'</select></label>'+
 '<label>Amount<span class="simple-amount1444"><small data-currency1430></small><input class="je-input num" inputmode="decimal" data-simple="amount" value="'+esc(row.amount||'')+'" placeholder="0.00"></span></label>'+
 '<label>Line memo / reference<input class="je-input" data-simple="memo" value="'+esc(row.memo||'')+'" placeholder="Uses the general memo"></label>';
 n.querySelector('[data-simple=direction]').value=row.direction||'out';
 $('simpleRows1430').append(n);restrictRow1438(n);directionToggle(n);return n;
}
function saveDraft(){$('jeGeneralMemo').dispatchEvent(new Event('input',{bubbles:true}));}
function sync(){
 if(mode!=='single'||building)return;if(lastSingle?.unmapped){$('simpleEntry1430').dataset.error='These complete lines are retained in Double Entry. Switch back to review or post.';return;}building=true;
 for(const n of $('simpleRows1430').children){restrictRow1438(n);directionToggle(n);}
 const errors=[],rows=read(),body=$('jeLinesBody');body.replaceChildren();
 rows.forEach((row,i)=>{
  const source=account(row.source),affected=account(row.affected),value=amount(row.amount),used=(window.personalJournal1437?.active?'':row.source)||row.affected||row.amount||row.memo;
  $('simpleRows1430').children[i].querySelector('[data-currency1430]').textContent=currencySymbolV6(source?.currency||affected?.currency||'');
  if(!used)return;
  if(!source||!affected)errors.push('Row '+(i+1)+': choose both accounts.');
  if(source&&affected&&source.id===affected.id)errors.push('Row '+(i+1)+': choose two different accounts.');
  if(source&&affected&&source.currency!==affected.currency)errors.push('Row '+(i+1)+': both accounts must use the same currency. Use Double Entry for currency bridging.');
  if(!Number.isFinite(value)||value<=0)errors.push('Row '+(i+1)+': enter an amount greater than zero.');
  const date=$('jeMultipleDates').checked?row.date:$('jeTransDate').value;
  if(!date)errors.push('Row '+(i+1)+': choose a date.');
  const debit=row.direction==='in'?source:affected,credit=row.direction==='in'?affected:source;
  for(const [a,side] of [[debit,'dr'],[credit,'cr']]){
   // Keep incomplete inputs in the canonical draft too, so switching modes or
   // reloading cannot silently discard an unfinished row.
   addJournalLineRow(a?label(a):'',row.memo,'',{});
   const line=body.lastElementChild,input=line.querySelector('.je-line-'+side);
   if(input)input.value=Number.isFinite(value)?(row.amount?String(value):''):row.amount;
   if(side==='cr'&&a&&input)input.dataset.currency=a.currency;
   const dateInput=line.querySelector('.je-line-date');if(dateInput)dateInput.value=date;
  }
 });
 if(!body.children.length){addJournalLineRow();addJournalLineRow();}
 building=false;
 $('simpleEntry1430').dataset.error=errors[0]||'';
 window.calculateJournalBalance();
 const preview=$('simplePreview1430'),lines=[...body.rows].filter(r=>r.querySelector('.je-line-acc')?.value);
 preview.textContent=errors[0]||(lines.length?lines.map(r=>{const a=getSelectedAccountInfo(r.querySelector('.je-line-acc').value),dr=amount(r.querySelector('.je-line-dr').value),cr=amount(r.querySelector('.je-line-cr').value);return (dr?'DR ':'CR ')+(a?.name||'')+' · '+(a?.currency||'')+' '+formatAppNumber(dr||cr)}).join('  |  '):'Money Out credits the source account and debits the affected account. Money In reverses the two.');
 preview.classList.toggle('invalid1430',!!errors.length);
}
function pairs(){
 const rows=[...$('jeLinesBody').rows].filter(r=>[...r.querySelectorAll('.je-line-acc,.je-line-dr,.je-line-cr,.je-line-memo')].some(n=>n.value.trim()&&!['0','0.00'].includes(n.value)));
 if(!rows.length)return [];
 // Include the empty counterpart of an unfinished draft rather than treating
 // a selected account as a complex journal.
 if(rows.length%2){const blank=document.createElement('tr');blank.innerHTML='<td><input class="je-line-acc"><input class="je-line-dr"><input class="je-line-cr"><input class="je-line-memo"><input class="je-line-date"></td>';rows.push(blank)}
 const result=[];
 for(let i=0;i<rows.length;i+=2){
  const parts=rows.slice(i,i+2).map(r=>({a:getSelectedAccountInfo(r.querySelector('.je-line-acc')?.value),dr:amount(r.querySelector('.je-line-dr')?.value),cr:amount(r.querySelector('.je-line-cr')?.value),memo:r.querySelector('.je-line-memo')?.value||'',date:r.querySelector('.je-line-date')?.value||$('jeTransDate').value}));
  const hasValues=parts.some(r=>r.dr||r.cr);
  const d=parts.find(r=>r.dr>0&&!r.cr)||(!hasValues?parts[0]:null),c=parts.find(r=>r.cr>0&&!r.dr)||(!hasValues?parts[1]:null);
  const debit=d||parts.find(r=>r!==c),credit=c||parts.find(r=>r!==d);
  if(!debit||!credit||debit===credit||parts.some(r=>r.dr&&r.cr)||(debit.a&&credit.a&&(debit.a.id===credit.a.id||debit.a.currency!==credit.a.currency))||(debit.dr&&credit.cr&&Math.abs(debit.dr-credit.cr)>.0000001)||debit.memo&&credit.memo&&debit.memo!==credit.memo||($('jeMultipleDates').checked&&debit.date&&credit.date&&debit.date!==credit.date))return null;
  const da=debit.a,ca=credit.a,value=debit.dr||credit.cr,memo=debit.memo||credit.memo,date=debit.date||credit.date;
  const rules=window.personalJournal1437?.rules,previous=lastSingle?.single?.[i/2];
  let incoming=previous?.direction==='in'&&(!da||previous.source===da.id)||da?.type==='ASSET'&&ca?.type!=='ASSET';
  if(rules){const outgoing=rules.directions.includes('out')&&(!ca||rules.fundIds.includes(ca.id))&&(!da||rules.entryIds.includes(da.id)),inc=rules.directions.includes('in')&&(!da||rules.fundIds.includes(da.id))&&(!ca||rules.counterpart===ca.id);if(!outgoing&&!inc)return null;incoming=inc&&!outgoing;}
  result.push({direction:incoming?'in':'out',source:(incoming?da:ca)?.id||'',affected:(incoming?ca:da)?.id||'',amount:value?String(value):'',memo,date});
 }
 return result;
}
function display(){
 const single=mode==='single',toggle=$('jeEntryMode1430');toggle.value=mode;toggle.setAttribute('aria-checked',String(!single));toggle.dataset.mode=mode;
 toggle.querySelector('[data-entry-mode-label1430]').textContent=single?'Single Entry':'Double Entry';toggle.setAttribute('aria-label',single?'Single Entry':'Double Entry');
 $('simpleEntry1430').hidden=!single;$('jeLinesBody').closest('.table-container').hidden=single;
 $('journalEntry98').classList.toggle('single-entry1430',single);$('simpleEntry1430').querySelectorAll('input,select,button').forEach(n=>{n.disabled=!!lastSingle?.unmapped;});
 $('journalEntry98').querySelector('.je-title').textContent=single?'Post Single-Entry Transaction':'Post Double-Entry Transaction';
}
function signature(){return JSON.stringify(canonicalRows14232().map(r=>({account:r.account,memo:r.memo,date:r.date,dr:amount(r.dr),credits:r.credits.map(c=>({currency:c.currency,value:amount(c.value)}))})));}
function canonicalRows14232(){return [...$('jeLinesBody').rows].map(r=>({account:r.querySelector('.je-line-acc')?.value||'',memo:r.querySelector('.je-line-memo')?.value||'',date:r.querySelector('.je-line-date')?.value||$('jeTransDate').value,dr:r.querySelector('.je-line-dr')?.value||'',credits:[...r.querySelectorAll('.je-line-cr')].map(n=>({currency:n.dataset.currency||'',value:n.value}))}));}
function restoreCanonical14232(rows){building=true;$('jeLinesBody').replaceChildren();for(const saved of rows){addJournalLineRow(saved.account,saved.memo,saved.dr,{});const r=$('jeLinesBody').lastElementChild;for(const credit of saved.credits){const n=[...r.querySelectorAll('.je-line-cr')].find(n=>n.dataset.currency===credit.currency)||r.querySelector('.je-line-cr');if(n)n.value=credit.value}const date=r.querySelector('.je-line-date');if(date)date.value=saved.date}building=false;calculateJournalBalance();}
function loosePairs14232(){const rows=canonicalRows14232();return rows.filter(r=>r.account||r.dr||r.credits.some(x=>x.value)||r.memo).map(r=>{const a=getSelectedAccountInfo(r.account),debit=amount(r.dr),credit=r.credits.find(x=>amount(x.value)>0);return {direction:debit?'in':'out',source:debit?a?.id||'':'',affected:credit?a?.id||'':'',amount:r.dr||credit?.value||'',memo:r.memo,date:r.date}});}
function setMode(next){
 if(next===mode||!['single','double'].includes(next))return;
 if(next==='double'){
  if(lastSingle?.unmapped){if(JSON.stringify(read())!==lastSingle.simple){$('simplePreview1430').textContent='The full double-entry details were retained. Review these lines before posting.';}restoreCanonical14232(lastSingle.rows);}else sync();
  lastSingle={single:read(),signature:signature()};mode='double';display();saveDraft();return;
 }
 const original=canonicalRows14232(),paired=pairs(),same=lastSingle?.signature===signature();
 const list=same?lastSingle.single:paired;
 $('simpleRows1430').replaceChildren();(list?.length?list:paired===null?loosePairs14232():[{}]).forEach(add);
 mode='single';display();
 if(paired===null&&!same){lastSingle={unmapped:true,rows:original,simple:JSON.stringify(read())};display();$('simpleEntry1430').dataset.error='These journal lines need Double Entry. Their complete details are retained; switch back to edit or post.';$('simplePreview1430').textContent=$('simpleEntry1430').dataset.error;calculateJournalBalance();}
 else{lastSingle=null;sync();}
 saveDraft();
}
function refreshAccounts(){for(const n of $('simpleRows1430').querySelectorAll('select[data-simple=source],select[data-simple=affected]')){const selected=n.value,r=n.closest('.simple-row1430');n.innerHTML=options(selected,n.dataset.simple,r.querySelector('[data-simple=direction]').value,r.querySelector('[data-simple=source]').value);}if(mode==='single')sync();}
function insertAfter(index){
 if(mode!=='single'||lastSingle?.unmapped)return null;
 const rows=$('simpleRows1430'),anchor=rows.children[index]||rows.lastElementChild,node=add();
 if(anchor&&anchor!==node)anchor.after(node);
 sync();saveDraft();return node;
}
function deleteAt(index){
 if(mode!=='single'||lastSingle?.unmapped)return null;
 const rows=$('simpleRows1430'),selected=rows.children[index];if(!selected)return null;
 const next=selected.nextElementSibling||selected.previousElementSibling;
 selected.remove();if(!rows.children.length)add();sync();saveDraft();return next?.isConnected?next:rows.firstElementChild;
}
function ready(){
 const card=$('journalEntry98');if(!card)return;
 const group=document.createElement('div');group.className='entry-mode1430 je-field-group';group.innerHTML='<span>Entry type</span><button type="button" id="jeEntryMode1430" class="entry-toggle1432 entry-mode-button14271" role="switch" aria-label="Double Entry" aria-checked="true" title="Switch between Single Entry and Double Entry"><span data-entry-mode-label1430>Double Entry</span></button>';
 card.querySelector('.je-meta-grid').append(group);
 const panel=document.createElement('section');panel.id='simpleEntry1430';panel.hidden=true;panel.innerHTML='<div id="simpleRows1430"></div><p id="simplePreview1430" role="status"></p>';
 card.querySelector('.table-container').before(panel);add();
 $('jeEntryMode1430').onclick=()=>setMode(mode==='single'?'double':'single');
 for(const type of ['input','change'])panel.addEventListener(type,()=>{sync();saveDraft();});
 for(const id of ['jeTransDate','jeMultipleDates'])$(id).addEventListener('change',sync);
 const calc=window.calculateJournalBalance;window.calculateJournalBalance=function(...args){const result=calc.apply(this,args),error=mode==='single'&&panel.dataset.error;if(error){$('btnPostJournal').disabled=true;const b=$('jeBalanceIndicator');b.textContent=error;b.title=error;b.className='je-status-badge unbalanced';}return result;};
 const post=window.submitJournalEntry;window.submitJournalEntry=async function(...args){const invalid=card.querySelector('.account-search1428:invalid');if(invalid){invalid.focus();invalid.reportValidity();return;}if(mode==='single'){sync();if(panel.dataset.error){showAppNotification('Check Entry',panel.dataset.error,true);return;}}return post.apply(this,args);};
 card.addEventListener('click',e=>{if(mode==='single'&&e.target.closest('[onclick="addJournalLineRow()"]')){e.preventDefault();e.stopImmediatePropagation();if(lastSingle?.unmapped){showCenterStatus('Switch to Double Entry to edit the retained journal lines.',true);return;}add();sync();saveDraft();}},true);
 const reset=window.clearJournalEntry;window.clearJournalEntry=function(...args){lastSingle=null;const result=reset.apply(this,args);$('simpleRows1430').replaceChildren();add();panel.dataset.error='';if(mode==='single')sync();display();return result;};
 const addLine=window.addJournalLineRow;window.addJournalLineRow=function(...args){if(mode==='single'&&!building&&args[0]){mode='double';display();}return addLine.apply(this,args);};
 const refs=window.loadReferenceDataFromSupabase;window.loadReferenceDataFromSupabase=async function(...args){const r=await refs.apply(this,args);refreshAccounts();return r;};
 const hydrate=window.hydrateSupabaseSession;window.hydrateSupabaseSession=async function(...args){const r=await hydrate.apply(this,args);if(liveProfile&&owner!==liveProfile.id){owner=liveProfile.id;lastSingle=null;mode='double';panel.dataset.error='';$('simpleRows1430').replaceChildren();add();display();window.drafts1427?.restore();}return r;};
 const dateMode=window.setJournalDateMode;window.setJournalDateMode=function(...args){const r=dateMode.apply(this,args);sync();return r;};
 card.hidden=false;display();
 window.entry1430={setMode,sync,read,insertAfter,deleteAt,get mode(){return mode;},get retained(){return lastSingle?.unmapped?JSON.parse(JSON.stringify(lastSingle)):null},restore(savedMode,rows,retained){lastSingle=retained||null;mode=savedMode==='single'?'single':'double';$('simpleRows1430').replaceChildren();(rows?.length?rows:[{}]).forEach(add);panel.dataset.error='';display();if(retained){restoreCanonical14232(retained.rows);sync()}else if(mode==='single')sync();}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
