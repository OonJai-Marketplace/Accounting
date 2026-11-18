/* Requests and received-fund finalization share the operational-report lifecycle. */
(()=>{'use strict';
function validDate14317(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value}
const esc=v=>escapeHtml(String(v??'')),clone=x=>structuredClone(x),num=x=>Number(x)||0;
let finalTab='submitted',historyTab='journal',allocation=null,allocationRecord=null,fundPopup=null,actor='',busy=false,editMove=null,editFx=null,actorClient=null,allocationRequest14370=0;
const report=BudgetReport290,journal=BudgetUtilizationJournal;
let activityPopup=null;
const confirmedFinals=new Map();
let checkedOnVisit=new Set();
let budgetListMonth='',budgetListOwner='';
function budgetMonth(record){
 const month=String(record.data?.budgetMonth290||record.data?.date||'').slice(0,7);
 return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)?month:'';
}
function budgetRows(){
 return Work82.reports.filter(r=>r.data?.kind==='finance').map(r=>confirmedFinals.get(r.id)||r)
  .sort((a,b)=>budgetMonth(b).localeCompare(budgetMonth(a))||String(b.created_at||'').localeCompare(String(a.created_at||''))||String(a.id).localeCompare(String(b.id)));
}
function budgetMonthRows(rows,month){return month?rows.filter(r=>budgetMonth(r)===month):rows;}

const isFinal=r=>!r?._pending14333&&r?.data?.mode==='utilization'&&r.data.status==='finalized';
function rememberFinal(record){
 if(!isFinal(record))return;
 confirmedFinals.set(record.id,record);
 const i=Work82.reports.findIndex(r=>r.id===record.id);
 if(i<0)Work82.reports.push(record);
 else if(!Work82.reports[i]._pending14333)Work82.reports[i]=record;
}
function checkListedDrafts(rows,notice){
 if(window.offline14239?.offline()||!document.querySelector('#transactions-budget14313.active'))return;
 const visit=checkedOnVisit,check=context(),client=ojmDb;
 const ids=rows.filter(r=>r.data.mode==='utilization'&&!r._pending14333&&!isFinal(r)&&!visit.has(r.id)).map(r=>r.id);
 for(let i=0;i<ids.length;i+=60){
  const batch=ids.slice(i,i+60);batch.forEach(id=>visit.add(id));
  (async()=>{
   const {data,error}=await client.from('operational_reports').select(BudgetReportWording.select).in('id',batch)
    .eq('data->>kind','finance').eq('data->>mode','utilization').eq('data->>status','finalized').setHeader('x-ojm-database-only','1');
   check();if(visit!==checkedOnVisit||error||!Array.isArray(data))return;
   const finals=data.filter(r=>batch.includes(r.id)&&isFinal(r));
   finals.forEach(rememberFinal);
   if(finals.length&&document.querySelector('#transactions-budget14313.active'))renderRequest(notice);
  })().catch(()=>{/* Opening a record retries its status check directly. */});
 }
}
let selectedParent='',requestEditor=null;
const requests=()=>budgetRows().filter(r=>r.data.mode!=='utilization'&&!r.data.requestId14316);
function guard(){if(!liveProfile?.id||liveProfile.role!=='admin'||!access113.can('transactions-budget14313'))throw Error('Administrator access is required.');if(actor!==liveProfile.id||actorClient!==ojmDb){if(requestEditor){requestEditor.root.resolve108(false);requestEditor=null;}confirmedFinals.clear();checkedOnVisit=new Set();selectedParent='';actor=liveProfile.id;actorClient=ojmDb;allocation=null;allocationRecord=null;clearFundPopup();editMove=null;editFx=null;allocationRequest14370++}return actor}
function context(){const owner=guard(),client=ojmDb;return()=>{if(owner!==liveProfile?.id||client!==ojmDb)throw Error('Your sign-in changed. Reopen the budget record.');guard();}}
const button=(label,fn)=>`<button type="button" onclick="${esc('budgetWorkflow14316.'+fn)}">${label}</button>`;
function captureFund(){
 const form=fundPopup?.querySelector('#fundHeader290');
 if(form&&allocation&&form.dataset.parent===(allocation.requestId14316||'')&&form.dataset.record===(allocationRecord?.id||''))Object.assign(allocation,Object.fromEntries(new FormData(form)));return allocation;
}
function clearFundPopup(){
 closeActivity();const root=fundPopup;fundPopup=null;root?.resolve108(false);
 allocation=null;allocationRecord=null;
}
function canLeaveFund(){
 const host=fundPopup?.querySelector('#budgetFunds290');
 if(!host||!allocation)return true;
 captureFund();
 if(editorData(allocation)===host.savedValues&&!host.worksheetChanged())return true;
 if(!host.discardPrompt)host.discardPrompt=ui108.modal('Unsaved changes','<p>Discard the changes to this fund utilization report?</p>',
  [{label:'Keep editing',value:false,primary:true},{label:'Discard changes',value:true}]).finally(()=>{host.discardPrompt=null;});
 return host.discardPrompt;
}
async function closeFundEditor(){
 const root=fundPopup,documentBeingEdited=allocation;
 if(!root||busy||!await canLeaveFund()||root!==fundPopup||documentBeingEdited!==allocation||busy)return;
 allocationRequest14370++;clearFundPopup();
}
function newUtilization(){
 const today=today82();
 return {kind:'finance',mode:'utilization',status:'draft',budgetMonth290:today.slice(0,7),
  date:today,purpose:'',recipient:'',lines:[],movements:[],conversions:[],notes:''};
}
function showFunds(open=true){
 guard();if(busy)return;
 if(!open)return closeFundEditor();
 if(fundPopup?.isConnected)return;
 if(selectedParent)return startAllocation(selectedParent);
 if(!allocation){
  const saved=requests();
  if(saved.length===1)return startAllocation(saved[0].id);
  if(saved.length>1)return chooseRequest();
  allocation=newUtilization();
 }
 presentFundEditor();
}
function pinReportToolbar(root,toolbar){
 const header=root.querySelector('.ui-dialog108>header');
 root.classList.add('fund-report-layout');
 header.querySelector('.fund-report-toolbar')?.remove();
 header.insertBefore(toolbar,header.querySelector('[data-dismiss]'));
}
function reportToolbar(root,actions,activities=''){
 const toolbar=document.createElement('div');toolbar.className='fund-report-toolbar';
 toolbar.innerHTML='<div role="group" aria-label="Report actions">'+actions+'</div>'+
  (activities?'<div role="group" aria-label="Spending and funding actions">'+activities+'</div>':'');
 pinReportToolbar(root,toolbar);
 return toolbar;
}
function presentFundEditor(){
 if(fundPopup?.isConnected){closeActivity();renderAllocation();return;}
 const {root}=budgetDialog(report.title,'<div id="budgetFunds290"></div>');
 root.classList.add('fund-popup326');fundPopup=root;
 root.querySelector('[data-dismiss]').onclick=closeFundEditor;
 renderAllocation();
}
function requestData(){return requestEditor?.data||null}
function refreshCategories(){
 const list=requestEditor?.root.querySelector('#budgetCategories14321');
 if(list)list.innerHTML=budget14313.categoryOptions(requestEditor.data.lines).map(([v])=>'<option value="'+esc(v)+'"></option>').join('');
 const names=requestEditor?.root.querySelector('[data-categories]');
 if(names)names.textContent=(budget14313.config().categories||[]).join(' · ');
}
function totals327(d,asLines=false){
 const sums=new Map();
 for(const line of d.lines||[])sums.set(line.currency,(sums.get(line.currency)||0)+Math.round(Number(line.amount)*100));
 const codes=report.orderedUnits(sums.keys()),value=c=>sums.get(c)/100;
 return (asLines?report.amountLines(codes,value):codes.map(c=>report.currencyAmount(c,value(c))).join(' · '))||'—';
}
function utilizationHeaderTotals(reports){
 const totals=new Map(),keys=['requested','approved','receipt','convertedOut','convertedIn','allocated','fundRemaining'];
 for(const {balances} of reports)for(const [currency,values] of balances){
  if(!totals.has(currency))totals.set(currency,Object.fromEntries(keys.map(key=>[key,0])));
  for(const key of keys)totals.get(currency)[key]=totals.get(currency)[key]===null||values[key]===null?null:totals.get(currency)[key]+Math.round(num(values[key])*100);
 }
 return new Map([...totals].map(([currency,values])=>[currency,Object.fromEntries(keys.map(key=>[key,values[key]===null?null:values[key]/100]))]));
}
function utilizationRegister(reports,rows){
 const totals=utilizationHeaderTotals(reports),codes=report.orderedUnits(totals.keys());
 const columns=[['Month'],['Purpose'],['Status'],['Requested','requested'],['Approved','approved'],['Received','receipt'],['Exchanged out','convertedOut'],['Exchanged in','convertedIn'],['Used','allocated'],['Remaining','fundRemaining'],['Action']];
 let table=table82(columns.map(([label])=>label),rows).replace('<table>','<table id="savedFundReports" class="budget-saved-table">');
 for(const [label,key] of columns){
  const summary=key?(report.fundingAmountLines(codes,c=>totals.get(c)[key])||'—'):label==='Purpose'?'Total · '+reports.length+' '+(reports.length===1?'report':'reports'):'';
  table=table.replace('<th>'+label+'</th>','<th data-resize-label="'+label+'"><span class="fund-register-label">'+label+'</span><div class="fund-register-total"'+(key?' aria-label="Total '+label.toLowerCase()+'"':'')+'>'+summary+'</div></th>');
 }
 return table;
}
function renderRequest(notice=''){
 guard();
 const allRows=budgetRows();
 if(budgetListOwner!==liveProfile.id){budgetListOwner=liveProfile.id;budgetListMonth='';}
 const months=[...new Set(allRows.map(budgetMonth).filter(Boolean))];
 if(budgetListMonth&&!months.includes(budgetListMonth))budgetListMonth='';
 const rows=budgetMonthRows(allRows,budgetListMonth);
 checkListedDrafts(rows,notice);
 const monthFilter='<label><select id="budgetListMonth" aria-label="Month filter"><option value="">Month filter</option>'+months.map(month=>'<option value="'+month+'"'+(month===budgetListMonth?' selected':'')+'>'+esc(report.period({budgetMonth290:month}))+'</option>').join('')+'</select></label>';

 const requestRows=rows.filter(r=>r.data.mode!=='utilization').map(r=>[esc(report.period(r.data)),esc(r.data.recipient),esc(r.data.purpose),totals327(r.data,true),'<div class="budget-row-actions">'+button('Open',`editRequest(${JSON.stringify(r.id)})`)+button('Utilization',`startAllocation(${JSON.stringify(r.id)})`)+'</div>']);
 const reports=rows.filter(r=>r.data.mode==='utilization').map(record=>({record,balances:report.balances({...record.data,lines:record.data.lines||[]})}));
 const utilization=reports.map(({record:r,balances})=>{
  const codes=report.orderedUnits(balances.keys());
  const amounts=key=>report.fundingAmountLines(codes,c=>balances.get(c)[key]);
  const remaining=amounts('fundRemaining');
  const save=window.localFirst14333?.budgetSave(r.id);
  return [esc(report.period(r.data)),'<span class="fund-register-purpose" title="'+esc(r.data.purpose)+'">'+esc(r.data.purpose)+'</span>',esc(r._pending14333?(save?.status||'Waiting for confirmation'):r.data.status||'Draft'),amounts('requested'),amounts('approved'),amounts('receipt'),amounts('convertedOut'),amounts('convertedIn'),amounts('allocated'),remaining,
   button(r._pending14333?'Save status':isFinal(r)?'View':'Edit',`openAllocation(${JSON.stringify(r.id)})`)];
 });
 const content=section82('Saved budget requests',table82(['Month','Recipient','Purpose','Requested','Action'],requestRows).replace('<table>','<table id="savedBudgetRequests" class="budget-saved-table">'))+
  section82('Fund utilization reports',utilizationRegister(reports,utilization));
 mount82('transactions-budget14313','Budget Requests','',notice+content+historyImportButton(),monthFilter+button('Fund utilization','showFunds()')+button('New Report','newRequest()')+button('Print / PDF','printPicker()')+(access113.can('transactions-all')?'<button type="button" data-book-history="budget">History</button>':''));
 document.getElementById('budgetListMonth').onchange=e=>{budgetListMonth=e.target.value;renderRequest();};
}
function printPicker(){
 guard();const rows=budgetRows();
 const {root}=budgetDialog('Print / PDF',rows.length?table82(['Month','Report','Purpose',''],rows.map(r=>[esc(report.period(r.data)),r.data.mode==='utilization'?'Fund utilization':'Budget request',esc(r.data.purpose),'<button type="button" data-print-record="'+esc(r.id)+'">Print / PDF</button>'])):'<p>Save a budget request or utilization report to print it here.</p>');
 root.querySelectorAll('[data-print-record]').forEach(b=>b.onclick=()=>{root.resolve108(false);void printRecord(b.dataset.printRecord)});
}
function newRequest(){
 guard();selectedParent='';openRequestForm({mode:'request',budgetMonth290:today82().slice(0,7),date:today82(),recipient:'',purpose:'',notes:'',lines:[],movements:[],conversions:[]},null);
}
async function editRequest(id){
 try{const check=context(),record=await editableRecord(id);check();if(record.data.mode==='utilization')return openAllocation(id);selectedParent=id;openRequestForm(clone(BudgetReportWording.data(record)),record)}catch(e){showCenterStatus(e.message,true)}
}
function templateApplied(){
 const e=requestEditor;if(!e)return;
 for(const k of ['purpose','recipient','notes'])e.details.elements[k].value=e.data[k]||'';
 e.items.reset();delete e.items.dataset.editKey;updateItems(e);
}
function updateItems(e){
 e.root.querySelector('[data-item-list]').innerHTML=report.items(e.data.lines,true);
 e.items.querySelector('[type=submit]').textContent=e.items.dataset.editKey?'Update item':'Add item';
 e.items.querySelector('[data-cancel-item]').hidden=!e.items.dataset.editKey;
 refreshCategories();
}
function openRequestForm(data,record){
 if(requestEditor)return;
 const check=context();
 const {root,pending}=budgetDialog(record?'Budget request':'New Report',`
 <div class="request-tabs327" role="group" aria-label="Request sections">
 <button type="button" data-section="details">Request details</button><button type="button" data-section="items">Budget items</button><button type="button" data-section="messages">Messages</button></div>
 <form data-pane="details" class="fields82 request-fields327">${field82('Budget month','budgetMonth290',data.budgetMonth290||String(data.date).slice(0,7),'month','required')}${field82('Recipient','recipient',data.recipient,'text','required')}${field82('Purpose','purpose',data.purpose,'text','required')}<label>Notes<textarea name="notes" rows="3">${esc(data.notes)}</textarea></label></form>
 <section data-pane="items" hidden><div class="request-tools327">${budget14313.tools()}<button type="button" data-manage>Categories</button></div>
 <form data-category-form hidden><label>New category<input name="newCategory" required maxlength="100"></label><button type="submit">Save category</button><p data-categories></p></form>
 <form data-item-form class="request-fields327">${budget14313.categoryField()}${field82('Item','description','','text','required')}${field82('Amount','amount','','number','min="0.01" step="0.01" required')}${select82('Currency','currency',budget14313.config().currency,budget14313.currencyOptions(data.lines))}<div><button type="submit">Add item</button> <button type="button" data-cancel-item hidden>Cancel edit</button></div></form>
 <div data-item-list class="data-table82"></div></section><section data-pane="messages" hidden></section>
 <div class="request-footer327"><span role="status" aria-live="polite"></span><button type="button" data-save-request>Save request</button></div>`);
 root.classList.add('budget-request327');
 const e={root,data,record,draftId:record?.id||crypto.randomUUID(),base:JSON.stringify(data),details:root.querySelector('[data-pane=details]'),items:root.querySelector('[data-item-form]'),saving:false};requestEditor=e;
 const status=root.querySelector('[role=status]'),panes=root.querySelectorAll('[data-pane]'),saveButton=root.querySelector('[data-save-request]');
 if(record&&(record.budget_report_wording||budgetRows().some(r=>r.data.requestId14316===record.id))){
  const edit=document.createElement('button');edit.type='button';edit.textContent='Edit report wording';e.details.append(edit);
  edit.onclick=()=>BudgetReportWording.edit(e.record,budgetDialog,check,saved=>{
   cacheWording(saved);e.record=saved;data.notes=BudgetReportWording.data(saved).notes;e.details.elements.notes.value=data.notes;
   status.textContent='Wording saved.';
  });
  e.details.elements.notes.readOnly=true;
 }
 const linePending=()=>!!(e.items.dataset.editKey||e.items.elements.category.value.trim()||e.items.elements.description.value.trim()||e.items.elements.amount.value.trim());
 const captureDetails=()=>Object.assign(data,Object.fromEntries(new FormData(e.details)));
 function select(name){
  captureDetails();
  if(name==='messages'&&linePending()){select('items');status.textContent='Add or finish editing the item to include it in the messages.';return}
  for(const pane of panes)pane.hidden=pane.dataset.pane!==name;
  saveButton.hidden=name!=='items';
  root.querySelectorAll('[data-section]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.section===name)));
  if(name==='messages')budgetMessages14314.render(root.querySelector('[data-pane=messages]'),data);
 }
 e.details.oninput=captureDetails;e.details.onchange=captureDetails;e.details.onsubmit=event=>{event.preventDefault();select('items')};
 root.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>select(b.dataset.section));
 const categories=root.querySelector('[data-category-form]');root.querySelector('[data-manage]').onclick=()=>{categories.hidden=!categories.hidden;if(!categories.hidden)categories.elements.newCategory.focus()};
 categories.onsubmit=async event=>{event.preventDefault();const b=categories.querySelector('button');b.disabled=true;try{check();const name=categories.elements.newCategory.value.trim();await budget14313.addCategory(name);check();if(requestEditor!==e)return;categories.reset();status.textContent='Category saved.'}catch(err){status.textContent=err.message}finally{b.disabled=false}};
 function resetItem(){e.items.reset();delete e.items.dataset.editKey;updateItems(e)}
 e.items.querySelector('[data-cancel-item]').onclick=resetItem;
 function applyItem(){
  check();const f=e.items.elements,amount=movementAmount(f.amount),values={category:f.category.value.trim(),description:f.description.value.trim(),currency:f.currency.value,amount};
  if(!e.items.reportValidity()||!values.category||!values.description||!(amount>0)||!Number.isSafeInteger(Math.round(amount*100))){status.textContent='Enter a category, an item and a positive amount.';return false}
  const line=data.lines.find(l=>l.key117===e.items.dataset.editKey);if(line)Object.assign(line,values);else data.lines.push({...values,key117:crypto.randomUUID()});
  resetItem();status.textContent='';return true;
 }
 e.items.onsubmit=event=>{event.preventDefault();applyItem()};
 for(const l of data.lines)l.key117||=crypto.randomUUID();
 root.querySelector('[data-item-list]').onclick=async event=>{
  const b=event.target.closest('[data-budget-edit290],[data-budget-delete290]');if(!b)return;
  const l=data.lines.find(l=>l.key117===(b.dataset.budgetEdit290||b.dataset.budgetDelete290));if(!l)return;
  if(b.dataset.budgetDelete290){if(!await ui117.confirm('Remove this budget item?'))return;check();if(requestEditor!==e)return;data.lines=data.lines.filter(row=>row!==l);resetItem();return}
  e.items.dataset.editKey=l.key117;for(const k of ['category','description','currency','amount'])e.items.elements[k].value=k==='amount'&&e.items.elements.amount.type!=='number'?formatAppNumber(l.amount):l[k];
  e.items.elements.currency.dispatchEvent(new Event('change',{bubbles:true}));updateItems(e);e.items.elements.description.focus();
 };
 saveButton.onclick=async()=>{
  if(e.saving)return;captureDetails();
  if(linePending()&&!applyItem())return;
  if(!data.lines.length){status.textContent='Add a budget item before saving.';return}
  if(!e.details.checkValidity()||!data.recipient.trim()||!data.purpose.trim()){select('details');e.details.reportValidity();status.textContent='Complete the request details.';return}
  if(e.record&&e.base===JSON.stringify(data)){root.resolve108(true);return;}
  const content=root.querySelector('.ui-body108');e.saving=true;content.inert=true;status.textContent='Saving request…';
  try{check();const saved=await saveDocument({title:'Budget Request — '+data.purpose,html:requestHTML(data),settings:clone(e.record?.data.document14316?.settings||{}),budget14316:{id:e.record?.id||null,version:e.record?.version,draftId14317:e.draftId,data}});
   check();if(requestEditor!==e)return;
   selectedParent=saved.id;renderRequest();
   root.resolve108(true);
  }catch(err){status.textContent=err.message}finally{content.inert=false;e.saving=false}
 };
 root.addEventListener('click',async event=>{if(!event.target.closest('[data-dismiss]'))return;event.stopImmediatePropagation();event.preventDefault();if(e.saving)return;captureDetails();if((e.base!==JSON.stringify(data)||linePending())&&!await ui117.confirm('Close without saving your request changes?'))return;root.resolve108(false)},true);
 pending.then(()=>{if(requestEditor===e)requestEditor=null});
 updateItems(e);select('details');e.base=JSON.stringify(data);
 budget14313.load(true).then(()=>{if(requestEditor===e){refreshCategories();if(!linePending())e.items.elements.currency.value=budget14313.config().currency}}).catch(err=>{if(requestEditor===e)status.textContent=err.message});
}
function requestHTML(d){const cell=(name,value)=>`<span data-budget-field14316="${name}">${esc(value)}</span>`;return `<h1 style="text-align:center">Budget Request</h1><p>Budget month: ${cell('budgetMonth290',report.period(d))}</p><p>Recipient: ${cell('recipient',d.recipient)}</p><p>Purpose: ${cell('purpose',d.purpose)}</p>${report.items(d.lines)}<p>Notes: ${cell('notes',d.notes)}</p>${report.signature(d)}`;}
const recalculate=report.recalculate;
function parseDocument(model){const template=document.createElement('template');template.innerHTML=model.html;const root=template.content;const tables=[...root.querySelectorAll('table[data-budget-table14316="items"]')];if(!tables.length)throw Error('Keep the budget items table in the document.');const d=clone(model.budget14316.data),keys=new Set();d.lines=tables.flatMap(t=>[...t.querySelectorAll('tbody>tr:not([data-budget-summary290])')]).map(row=>{const cells=[...row.cells].map(c=>c.textContent.trim());if(cells.length!==4)throw Error('Each budget row needs Category, Item, Amount and Currency.');const amount=parseAppNumber(cells[2]);if(!cells[0]||!cells[1]||!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(Math.round(amount*100))||!CurrencyStore.currencies.some(c=>c.code===cells[3]))throw Error('Enter a category, item, positive amount and configured currency in every budget row.');const key=row.dataset.budgetKey14316||crypto.randomUUID();if(keys.has(key))throw Error('Duplicate budget item. Remove the copied row ID or add the item in Budget Requests.');keys.add(key);row.dataset.budgetKey14316=key;return {key117:key,category:cells[0],description:cells[1],amount,currency:cells[3]}});if(!d.lines.length)throw Error('Add at least one budget item.');
 // Older saved editor documents have a date field. New requests carry the date in their record.
 const legacyDate=root.querySelector('[data-budget-field14316="date"]');
 if(legacyDate)d.date=legacyDate.textContent.trim();
 for(const name of ['recipient','purpose','notes']){const field=root.querySelector(`[data-budget-field14316="${name}"]`);if(!field)throw Error('Keep the '+name+' field in the document.');d[name]=field.textContent.trim()}if(!validDate14317(d.date)||!d.recipient||!d.purpose)throw Error('Enter a valid calendar date, recipient and purpose.');const monthText=root.querySelector('[data-budget-field14316="budgetMonth290"]')?.textContent.trim();
 if(monthText!==undefined){
  const named=monthText.match(/^([a-z]+)\s+(\d{4})$/i),months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const ix=named?months.findIndex(m=>m.toLowerCase()===named[1].toLowerCase()):-1;
  const month=ix>=0?named[2]+'-'+String(ix+1).padStart(2,'0'):monthText;
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Enter the budget month as October 2026 or 2026-10.');
  d.budgetMonth290=month;
 }else if(!d.budgetMonth290)d.budgetMonth290=d.date.slice(0,7);
 d.preparedBy=liveProfile.full_name||liveProfile.email;d.kind='finance';d.mode='request';d.movements=[];d.conversions=[];delete d.reviewer;delete d.document14316;delete d.sharedSnapshot14313;delete d.requestId14316;return {data:d,html:documentWorkspace105.sanitize(template.innerHTML)}}
async function editableRecord(id){
 const check=context(),row=Work82.owner===liveProfile?.id&&Work82.reports.find(item=>item.id===id);
 if(window.offline14239?.offline()&&(confirmedFinals.has(id)||row?.data?.kind==='finance'))return confirmedFinals.get(id)||row;
 if(row?._pending14333){
  if(row.data?.mode==='utilization'){
   const {data,error}=await ojmDb.from('operational_reports').select(BudgetReportWording.select).eq('id',id).eq('data->>status','finalized').maybeSingle().setHeader('x-ojm-database-only','1');
   check();if(error)throw error;if(isFinal(data))return data;
  }
  return row;
 }
 return live(id);
}
async function live(id,version){
 const check=context(),q=ojmDb.from('operational_reports').select(BudgetReportWording.select).eq('id',id).single();
 if(!window.offline14239?.offline())q.setHeader('x-ojm-database-only','1');
 const r=await q;check();if(r.error)throw Error(r.error.message||'The saved budget record could not be checked.');
 if(!r.data||r.data.data.kind!=='finance')throw Error('This transaction was deleted, reset or is unavailable. Open a current record from History.');
 if(version!==undefined&&r.data.version!==version)throw Error('This transaction changed elsewhere. Reopen its current saved version.');
 // A newer database draft supersedes a finalized copy retained by this tab.
 const final=confirmedFinals.get(id);
 if(isFinal(r.data))rememberFinal(r.data);
 else if(final&&r.data.version>final.version)confirmedFinals.delete(id);
 const index=Work82.reports.findIndex(item=>item.id===id);
 if(index>=0&&!Work82.reports[index]._pending14333)Work82.reports[index]=r.data;
 return r.data;
}
async function saveDocument(model){
 if(busy)throw Error('A budget save is already in progress.');
 busy=true;try{return await persistDocument(model)}finally{busy=false}
}
function appendedItems(oldData,data){
 for(const key of ['date','budgetMonth290','recipient','purpose','notes']){
  if((oldData[key]||'')!==(data[key]||''))throw Error('Save new items separately from changes to the request details.');
 }
 const remaining=[...data.lines];
 const same=(a,b)=>a.description===b.description&&a.category===b.category&&a.currency===b.currency&&Number(a.amount)===Number(b.amount);
 for(const line of oldData.lines){
  const index=remaining.findIndex(candidate=>(!line.key117||line.key117===candidate.key117)&&same(line,candidate));
  if(index<0)throw Error('Existing requested items are linked to spending. Add a new item to this draft.');
  remaining.splice(index,1);
 }
 if(!remaining.length)throw Error('Add a new requested item before saving.');
 return remaining;
}
async function appendLinkedItems(record,data,document,check,child){
 if(isFinal(child))throw Error('The linked utilization is finalized. Its request and amounts are read-only.');
 const items=appendedItems(BudgetReportWording.data(record),data);
 const active=allocation?.requestId14316===record.id?allocation:null;
 if(active)applySpending();
 const {data:result,error}=await ojmDb.rpc('append_budget_request_items',{p_request:record.id,p_version:record.version,p_items:items,p_document:document});
 check();if(error)throw Error(error.message);
 const saved=result.request,drafts=result.drafts;
 const updates=[saved,...drafts],ids=new Set(updates.map(r=>r.id));
 Work82.reports=[...updates,...Work82.reports.filter(r=>!ids.has(r.id))];
 if(active&&active===allocation){
  const latest=drafts.find(r=>r.id===allocationRecord?.id);
  if(latest&&allocationRecord.version===latest.version-1){
   allocation.lines=clone(latest.data.lines);allocation.requestVersion14316=saved.version;allocationRecord=latest;
   renderAllocation();
   const host=fundPopup?.querySelector('#budgetFunds290');
   if(host)host.savedValues=editorData(latest.data);
  }
 }
 return saved;
}
async function persistDocument(model){
 const check=context(),parsed=parseDocument(model),meta=model.budget14316;
 guard();const id=meta.id||meta.draftId14317;
 if(!id)throw Error('Keep the budget device draft before saving.');
 const record=Work82.reports.find(row=>row.id===id)||(meta.id?await editableRecord(id):null);
 if(record&&(record.data.kind!=='finance'||record.data.mode!=='request'))throw Error('Open the original budget request.');
 const document={html:parsed.html,title:model.title,settings:clone(model.settings)};
 const payload={...parsed.data,document14316:document};
 let saved=record;
 if(!record||localFirst14333.canonical(record.data)!==localFirst14333.canonical(payload)){
  if(meta.id&&record&&meta.version!==record.version)throw Error('This request changed. Reopen its current saved version.');
  const linked=record&&(budgetRows().find(row=>row.data.requestId14316===id)||(!window.offline14239?.offline()&&await linkedUtilization(id)));
  check();
  if(linked)saved=await appendLinkedItems(record,parsed.data,document,check,linked);
  else {
   const base=meta.id?{id,version:meta.version}:null;
   saved=await localFirst14333.saveWork('reports',payload,base,{data:payload,version:base?base.version+1:1},{createId:id});
  }
 }
 check();Work82.reportRecord=saved;Work82.report=clone(saved.data);Object.assign(Finance82,clone(saved.data));
 showCenterStatus(saved._pending14333?'Budget request saved on this device. It will sync automatically.':'Budget request saved to company records.');
 return {id:saved.id,version:saved.version,data:{...clone(parsed.data),lines:clone(saved.data.lines)},_pending14333:!!saved._pending14333};
}
async function requireSaved(){const model=documentWorkspace105.model,meta=model?.budget14316;guard();if(!meta?.id)throw Error('Save the budget request before sending Email or using WhatsApp.');const r=await live(meta.id,meta.version),d=BudgetReportWording.data(r),doc=d.document14316;if(!doc||model.html!==doc.html||model.title!==doc.title||JSON.stringify(model.settings)!==JSON.stringify(doc.settings))throw Error('The document has changed. Save it before sharing.');return {...r,data:d}}
function decorateEditor(){
 const root=document.getElementById('document-editor105'),toolbar=root?.querySelector('.doc-quick1426');if(!toolbar)return;
 root.querySelector('.budget-editor-actions14316')?.remove();const model=documentWorkspace105?.model;if(!model?.budget14316)return;
 const group=document.createElement('div');group.className='budget-editor-actions14316';
 function add(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;group.append(b)}
 add('Save Budget Request',()=>documentWorkspace105.save());
 add('Copy messages',()=>{try{guard();const data=parseDocument(model).data;const {root:dialog}=budgetDialog('Budget messages','<div class="budget-copy327"></div>');budgetMessages14314.render(dialog.querySelector('.budget-copy327'),data)}catch(e){showCenterStatus(e.message,true)}});
 if(model.budget14316.id)add('Fund utilization',async()=>{try{const r=await requireSaved();await startAllocation(r.id)}catch(e){showCenterStatus(e.message,true)}});
 toolbar.append(group);
}
async function openRequest(id){try{guard();const r=await editableRecord(id);if(r.data.mode==='utilization')return view(id);const d=BudgetReportWording.data(r);await openDocumentEditor105({...(d.document14316||{title:'Budget Request',html:requestHTML(d)}),source:'transactions-budget14313',category:'Reports',budget14316:{id:r.id,version:r.version,data:clone(d)}})}catch(e){showCenterStatus(e.message,true)}}
async function linkedUtilization(id){
 if(window.offline14239?.offline()){
  return budgetRows().filter(r=>r.data.requestId14316===id)
   .sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')))[0];
 }
 const {data,error}=await ojmDb.from('operational_reports').select(BudgetReportWording.select).eq('data->>requestId14316',id)
  .eq('data->>mode','utilization').order('updated_at',{ascending:false}).order('id',{ascending:false}).limit(1).setHeader('x-ojm-database-only','1');
 if(error)throw error;return data?.[0]||budgetRows().find(r=>r._pending14333&&r.data.requestId14316===id);
}
async function startAllocation(id){
 try{
  const check=context();if(busy)throw Error('Wait for the budget save to finish.');
  const request=++allocationRequest14370,sameParent=allocation?.requestId14316===id;
  check();if(request!==allocationRequest14370)return;
  const r=await editableRecord(id);check();if(request!==allocationRequest14370)return;
  if(r.data.mode==='utilization')throw Error('Choose an original budget request.');
  const child=await linkedUtilization(id);check();if(request!==allocationRequest14370)return;
  if(child?._pending14333)return window.budgetSaveStatus472.open(child.id);
  if(isFinal(child)){showFinal(child);return;}
  if(sameParent&&(!child||child.id===allocationRecord?.id&&child.version===allocationRecord?.version)){
   selectedParent=id;if(!fundPopup?.isConnected)presentFundEditor();return;
  }
  if(!await canLeaveFund())return;
  check();if(request!==allocationRequest14370)return;
  if(child){
   if(child.data.requestId14316!==id||child.data.requestVersion14316!==r.version)throw Error('Reopen the current saved request before continuing.');
   selectedParent=id;allocation=clone(child.data);allocation.requestDate290||=r.data.date;allocation.budgetMonth290||=r.data.budgetMonth290||String(r.data.date).slice(0,7);allocation.conversions||=[];allocationRecord=child;
  }else{
   selectedParent=id;allocation={...clone(r.data),mode:'utilization',requestDate290:r.data.date,budgetMonth290:r.data.budgetMonth290||String(r.data.date).slice(0,7),requestId14316:r.id,requestVersion14316:r.version,status:'draft',date:today82(),movements:[],conversions:[]};delete allocation.document14316;allocationRecord=null;
  }
  presentFundEditor();
 }catch(e){showCenterStatus(e.message,true)}
}
async function openAllocation(id){
 try{
  const check=context();if(busy)throw Error('Wait for the budget save to finish.');
  if(window.localFirst14333?.budgetSave(id)&&!window.localFirst14333.budgetSave(id).confirmed)return window.budgetSaveStatus472.open(id);
  const request=++allocationRequest14370,r=await editableRecord(id);check();if(request!==allocationRequest14370)return;
  if(isFinal(r))return showFinal(r);
  if(r.data.mode!=='utilization')return view(id);
  if(allocationRecord?.id===id&&allocationRecord.version===r.version){if(!fundPopup?.isConnected)presentFundEditor();return;}
  check();if(request!==allocationRequest14370)return;
  const parent=r.data.requestId14316?await editableRecord(r.data.requestId14316):null;
  if(parent&&parent.version!==r.data.requestVersion14316)throw Error('The original budget changed. Reopen its current version.');
  check();if(request!==allocationRequest14370||!await canLeaveFund())return;
  check();if(request!==allocationRequest14370)return;
  selectedParent=r.data.requestId14316||'';allocation=clone(r.data);allocation.requestDate290||=parent?.data.date||r.data.date;
  allocation.budgetMonth290||=parent?.data.budgetMonth290||String(allocation.requestDate290).slice(0,7);
  allocation.conversions||=[];allocationRecord=r;presentFundEditor();
 }catch(e){showCenterStatus(e.message,true)}
}
function supplements(record){
 if(!record?.data.requestId14316||isFinal(record))return [];
 const rows=budgetRows(),parent=record.data.requestId14316;
 return rows.filter(r=>r.id!==parent&&r.data.mode==='request'&&r.data.budgetMonth290===record.data.budgetMonth290&&
  !r._pending14333&&!rows.some(child=>child.data.requestId14316===r.id));
}
async function combineRequests(){
 try{
  const check=context(),saved=allocationRecord;
  captureFund();applySpending();
  if(editorData(allocation)!==editorData(saved.data))throw Error('Save your draft changes before combining requests.');
  const base=await live(saved.data.requestId14316,saved.data.requestVersion14316);check();
  const candidates=supplements(saved);
  if(!candidates.length)throw Error('No additional request is available for this budget month.');
  const option=(id,name)=>'<option value="'+esc(id)+'">'+esc(name)+'</option>';
  const {root}=budgetDialog('Combine budget requests','<form><label>Additional request<select data-plain14285 name="extra">'+
   candidates.map(r=>option(r.id,r.data.purpose+' · '+totals327(r.data))).join('')+'</select></label><div data-items></div>'+
   '<p>This saves one combined request and keeps the existing utilization draft and receipts. The two source requests are kept in deletion history.</p>'+
   '<p role="status"></p><button type="submit">Save combined request</button></form>');
  const form=root.querySelector('form'),content=form.querySelector('[data-items]'),status=form.querySelector('[role=status]');
  const select=form.elements.extra,baseData=BudgetReportWording.data(base);
  const unassigned=saved.data.movements.filter(m=>report.kind(m)==='spend'&&m.id290&&!m.budgetKey117&&m.worksheetLine==null);
  const pick=()=>candidates.find(r=>r.id===select.value);
  function list(){
   content.innerHTML=pick().data.lines.map((l,i)=>{
    const current=baseData.lines.filter((b,j)=>b.currency===l.currency&&report.lineFunding(saved.data,b,j).status==='approved');
    return '<fieldset><legend>'+esc(l.description)+' · '+esc(l.currency)+' '+esc(formatAppNumber(l.amount))+'</legend>'+
     '<label>Budget item<select data-plain14285 name="line'+i+'">'+option('','Add as a new item')+current.map(b=>option(b.key117,b.description)).join('')+'</select></label>'+
     (unassigned.length?'<label>Link existing spending<select data-plain14285 name="move'+i+'">'+option('','None')+
       unassigned.map(m=>option(m.id290,(m.destination290||m.description290)+' · '+report.currencyAmount(m.currency,m.outflow))).join('')+'</select></label>':'')+'</fieldset>';
   }).join('');
  }
  select.onchange=list;list();
  form.onsubmit=async event=>{
   event.preventDefault();const submit=form.querySelector('[type=submit]');if(submit.disabled)return;submit.disabled=true;
   try{
    check();const extra=pick(),merged=clone(baseData),links={},assignments={};
    merged.notes=[baseData.notes,BudgetReportWording.data(extra).notes].filter(Boolean).join('\n\n');
    for(const [i,l] of extra.data.lines.entries()){
     const target=form.elements['line'+i].value,move=form.elements['move'+i]?.value;
     if(target){
      links[l.key117]=target;const line=merged.lines.find(b=>b.key117===target);
      line.amount=Math.round((Number(line.amount)+Number(l.amount))*100)/100;
     }else merged.lines.push(clone(l));
     if(move){if(assignments[move])throw Error('Choose an existing expense only once.');assignments[move]=target||l.key117;}
    }
    const layout=document.createElement('template');layout.innerHTML=documentWorkspace105.sanitize(baseData.document14316?.html||requestHTML(baseData));
    const table=layout.content.querySelector('[data-budget-table14316="items"]'),notes=layout.content.querySelector('[data-budget-field14316="notes"]');
    if(table&&notes){table.outerHTML=report.items(merged.lines);notes.textContent=merged.notes;}else layout.innerHTML=requestHTML(merged);
    const result=await ojmDb.rpc('combine_draft_budget_requests',{p_report:saved.id,p_version:saved.version,p_parent_version:base.version,
     p_extra:extra.id,p_extra_version:extra.version,p_links:links,p_assignments:assignments,p_lines:merged.lines,p_notes:merged.notes,p_html:layout.innerHTML});
    check();if(result.error)throw Error(result.error.message);
    const {request,draft}=result.data;
    Work82.reports=[request,draft,...Work82.reports.filter(r=>![base.id,extra.id,draft.id].includes(r.id))];
    selectedParent=request.id;allocation=clone(draft.data);allocationRecord=draft;
    root.resolve108(true);renderRequest();renderAllocation();
   }catch(err){status.textContent=err.message;submit.disabled=false;}
  };
 }catch(err){showCenterStatus(err.message,true);}
}

function renderAllocation(){
 const host=fundPopup?.querySelector('#budgetFunds290');if(!host||!allocation)return;
 const d=allocation;
 if(host.editingAllocation!==d){host.editingAllocation=d;host.savedValues=editorData(d);}
 const actions=button('Reports','chooseRequest()')+button('Print','previewAllocation()')+
  (allocationRecord?button('Payroll amounts',`reviewPayroll(${JSON.stringify(allocationRecord.id)})`):'')+
  button('Save','saveAllocation(false)')+button('Finalize','saveAllocation(true)');
 reportToolbar(fundPopup,actions).querySelector('[onclick*="saveAllocation(false)"]').classList.add('fund-save-draft');
 const cashActions='<button type="button" data-edit-funding>Edit funding</button><button type="button" data-add-funding>Add row</button>';
 const rowHeader=d.requestId14316?[report.period(d),d.recipient].filter(Boolean).map(esc).join(' · '):'';
 const header='<form id="fundHeader290" data-parent="'+esc(d.requestId14316||'')+'" data-record="'+esc(allocationRecord?.id||'')+'"><div class="fund-report-fields">'+
  field82('Report date','date',d.date,'date','required')+field82('Reference','receiptReference290',d.receiptReference290||'')+
  field82('Recipient','recipient',d.recipient,'text','required')+field82('Purpose','purpose',d.purpose,'text','required')+
  (d.requestId14316?'':field82('Budget month','budgetMonth290',d.budgetMonth290||String(d.date).slice(0,7),'month','required'))+
  '<label>Report notes<textarea name="notes" rows="3">'+esc(d.notes)+'</textarea></label></div></form>';
 host.innerHTML='<header class="worksheet-header"><h3>'+esc(d.purpose||'Unlinked utilization report')+'</h3><span>'+rowHeader+'</span></header>'+
  section82('Funding summary','<div data-fund-summary></div>',cashActions)+
  section82('Budget request summary',report.requestSummary(d,true))+
  section82('Disbursement breakdown',report.disbursements(d,true),'<button type="button" data-activity="spend">Add row</button>')+
  '<p class="fund-payroll-protocol">Salary: earned gross after absence and late deductions. PIT: employer 50%. SSO: employer 6%. Used and remaining stay in each transaction’s currency. Exchange out reduces its source currency; exact proceeds add to the received currency. Remaining is before cash handover.</p>'+
  '<details class="worksheet-details" '+(d.requestId14316?'':'open')+'><summary>Report details</summary>'+header+'<div data-journal-ref></div>'+postControl(allocationRecord)+
  (supplements(allocationRecord).length?button('Combine requests','combineRequests()'):'')+'</details>';
 showJournalReference(host,allocationRecord);
 host.querySelector('#fundHeader290').oninput=captureFund;
 const sheet=BudgetSpendingWorksheet.mount(host,d,(button,inputs)=>{
  try{
   const line=Number(button.dataset.line);
   applySpending();
   const index=Number(button.dataset.payment);
   if(index>=0)editMovement(index);
   else openActivity('spend',null,{line,currency:d.lines[line]?.currency||inputs[0]?.dataset.paidIn});
  }catch(error){showCenterStatus(error.message,true);}
 });
 host.applySpending=()=>sheet.read(true);host.worksheetChanged=sheet.dirty;
 host.querySelectorAll('[data-activity]').forEach(b=>b.onclick=()=>openActivity(b.dataset.activity));
 host.querySelector('[data-edit-funding]').onclick=()=>openFundingEditor();
 host.querySelector('[data-add-funding]').onclick=()=>openFundingEditor('new:receipt');
 const summary=host.querySelector('[data-fund-summary]');
 function refresh(){
  try{
   const current=sheet.read(),balances=report.balances(current);
   summary.innerHTML=report.cashSummary(current);
   const totals=host.querySelector('[data-disbursements] tfoot tr');
   for(const [i,th] of [...host.querySelector('[data-disbursements] thead tr').cells].entries()){
    const c=th.textContent;if(i&&CurrencyStore.currencies.some(unit=>unit.code===c))totals.cells[i].innerHTML=report.amountHtml(c,balances.get(c)?.spend||0);
   }
  }catch(error){summary.textContent=error.message;}
 }
 host.oninput=host.onchange=e=>{if(e.target.closest('[data-request-summary],[data-disbursements]'))refresh();};
 refresh();
}
function applySpending(){
 guard();captureFund();
 fundPopup?.querySelector('#budgetFunds290')?.applySpending?.();
}
function closeActivity(){
 if(fundPopup)fundPopup.querySelector('.ui-dialog108').inert=false;
 if(activityPopup){activityPopup.resolve108(false);activityPopup=null;}
}
function openFundingEditor(value){
 try{
  const check=context(),d=allocation;if(!d||busy||!fundPopup?.isConnected)return;
  applySpending();closeActivity();renderAllocation();
  let movements=clone(d.movements),conversions=clone(d.conversions||[]),dirty=false;
  const currencies=budget14313.currencyOptions(d.lines);
  const field=(key,label,type='text',options=null)=>({key,label,type,options});
  const receiptFields=[field('date290','Date','date'),field('account','Funding from'),field('destination290','Received into'),field('currency','Currency','select',currencies),field('amount','Amount','number'),field('reference','Reference'),field('description290','Description'),field('ownerSource','Funding source','select',[['','Match to journal'],['owner','Owner support'],['other','Other source']])];
  const fxFields=[field('date','Date','date'),field('source','From account'),field('currency','Currency','select',currencies),field('amount','Exchanged','number'),field('destination290','Received into'),field('target','Currency','select',currencies),field('targetAmount290','Received','number'),field('rate','Rate','rate'),field('evidence','Reference')];
  const otherFields=[field('type290','Activity','select',Object.entries(report.labels).filter(([k])=>!['receipt','spend'].includes(k))),...receiptFields.slice(0,7),field('loanId290','Advance','loan'),field('loanAmount290','Debt settled','number')];
  const required=new Set(['date290','date','account','source','currency','target','amount','reference','evidence','targetAmount290','rate']);
  const input=(f,m,group,i)=>{
   const val=f.key==='amount'&&group!=='conversion'?m.inflow||m.outflow||'':f.key==='targetAmount290'?report.conversionAmount(m)||'':f.key==='evidence'?m.evidence||m.reference||'':m[f.key]??'';
   const label=f.label+' · '+(group==='conversion'?'exchange':group==='receipt'?'receipt':'movement')+' '+(i+1);
   const attrs=' data-funding-field="'+f.key+'" name="'+f.key+'" aria-label="'+esc(label)+'"'+(required.has(f.key)?' required':'');
   let options=f.options;
   if(f.type==='loan')options=[['','Choose advance'],...movements.filter(m=>m&&report.kind(m)==='borrow').map(m=>[m.id290,m.account+' · '+m.reference])];
   const control=options?'<select data-plain14285'+attrs+'>'+options.map(([v,label])=>'<option value="'+esc(v)+'"'+(String(val)===String(v)?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select>':
    '<input'+attrs+' type="'+(f.type==='rate'?'number':f.type)+'" value="'+esc(val)+'"'+(['number','rate'].includes(f.type)?' min="'+(f.type==='rate'?'0.00000001':'0.01')+'" step="'+(f.type==='rate'?'any':'0.01')+'" data-currency="'+esc(f.key==='targetAmount290'?m.target:m.currency||'')+'"':'')+'>';
   return '<td data-funding-cell="'+f.key+'">'+control+'</td>';
  };
  const table=(group,fields,rows)=>'<div class="funding-grid-scroll"><table class="funding-edit-grid" data-funding-grid="'+group+'"><thead><tr>'+fields.map(f=>'<th scope="col" data-funding-cell="'+f.key+'">'+esc(f.label)+'</th>').join('')+'<th scope="col">Action</th></tr></thead><tbody>'+rows.map(([m,i])=>'<tr data-funding-group="'+group+'" data-funding-index="'+i+'">'+fields.map(f=>input(f,m,group,i)).join('')+'<td><button type="button" data-remove-funding aria-label="Remove '+(group==='conversion'?'exchange':'funding row')+' '+(i+1)+'">Remove</button></td></tr>').join('')+'</tbody></table></div>';
  const {root,pending}=budgetDialog('Edit funding','<form data-inline-funding><div data-funding-tables></div><p role="status" data-funding-status></p><div class="fund-form-actions"><button type="button" data-cancel-funding>Cancel</button><button type="submit">Apply changes</button></div></form>');
  activityPopup=root;root.classList.add('fund-activity','funding-inline');fundPopup.querySelector('.ui-dialog108').inert=true;
  const form=root.querySelector('form'),tables=root.querySelector('[data-funding-tables]'),status=root.querySelector('[data-funding-status]');
  function capture(){
   for(const row of tables.querySelectorAll('tbody tr')){
    const group=row.dataset.fundingGroup,i=Number(row.dataset.fundingIndex),m=(group==='conversion'?conversions:movements)[i];
    for(const input of row.querySelectorAll('[data-funding-field]')){
     const key=input.dataset.fundingField;
     const value=['amount','targetAmount290','rate','loanAmount290'].includes(key)?(input.value===''?'':movementAmount(input)):input.value.trim();
     if(key==='amount'&&group!=='conversion'){const incoming=['receipt','coverage','borrow'].includes(row.querySelector('[name=type290]')?.value||report.kind(m));m.inflow=incoming?value:0;m.outflow=incoming?0:value;}
     else m[key]=value;
    }
    if(group!=='conversion'&&report.kind(m)!=='repay'){delete m.loanId290;delete m.loanAmount290;}
    if(group==='receipt'&&!m.ownerSource)delete m.ownerSource;
   }
  }
  function repayments(){
   for(const row of tables.querySelectorAll('[data-funding-group=other]')){
    const repay=row.querySelector('[name=type290]').value==='repay';
    for(const key of ['loanId290','loanAmount290']){const input=row.querySelector('[name='+key+']');input.hidden=!repay;input.required=repay;}
   }
  }
  function render(){
   const rows=kind=>movements.flatMap((m,i)=>m&&(kind==='receipt'?report.kind(m)==='receipt':!['receipt','spend'].includes(report.kind(m)))?[[m,i]]:[]);
   tables.innerHTML=section82('Amounts received',table('receipt',receiptFields,rows('receipt')),'<button type="button" data-add-funding-row="receipt">Add row</button>')+
    section82('Exchanges',table('conversion',fxFields,conversions.flatMap((f,i)=>f?[[f,i]]:[])),'<button type="button" data-add-funding-row="conversion">Add row</button>')+
    section82('Other movements',table('other',otherFields,rows('other')),'<button type="button" data-add-funding-row="other">Add row</button>');
   repayments();window.financialNumbers14231?.scan(form);
  }
  function add(group){
   capture();dirty=true;
   const currency=d.lines[0]?.currency||currencies[0]?.[0]||'USD';
   if(group==='conversion')conversions.push({date:d.date,source:'',destination290:'',currency:'USD',target:'LAK',amount:'',targetAmount290:'',rate:'',evidence:''});
   else movements.push({id290:crypto.randomUUID(),type290:group==='receipt'?'receipt':'coverage',date290:d.date,account:'',destination290:'',currency,inflow:'',outflow:0,reference:'',description290:''});
   render();const row=tables.querySelector('[data-funding-grid="'+group+'"] tbody tr:last-child');
   row?.querySelector('[name=account],[name=source]')?.focus();
  }
  tables.onclick=e=>{
   const addButton=e.target.closest('[data-add-funding-row]');if(addButton){add(addButton.dataset.addFundingRow);return;}
   const remove=e.target.closest('[data-remove-funding]');if(!remove)return;
   capture();const row=remove.closest('tr'),i=Number(row.dataset.fundingIndex);
   (row.dataset.fundingGroup==='conversion'?conversions:movements)[i]=null;dirty=true;render();
  };
  form.oninput=form.onchange=e=>{
   dirty=true;status.textContent='';repayments();
   const row=e.target.closest('[data-funding-group=conversion]');if(!row)return;
   const field=name=>row.querySelector('[name='+name+']'),a=movementAmount(field('amount'));
   if(e.target===field('rate')&&a>0&&movementAmount(field('rate'))>0)field('targetAmount290').value=Math.round(a*movementAmount(field('rate'))*100)/100;
   else if(['amount','targetAmount290'].includes(e.target.name)){const b=movementAmount(field('targetAmount290'));field('rate').value=a>0&&b>0?b/a:'';}
  };
  const cancel=async()=>{if(dirty&&!await ui117.confirm('Discard the changes in this funding table?'))return;if(activityPopup===root)closeActivity();};
  root.querySelector('[data-dismiss]').onclick=cancel;root.querySelector('[data-cancel-funding]').onclick=cancel;
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();void cancel();}},true);
  root.addEventListener('pointerdown',e=>{if(e.target===root){e.preventDefault();e.stopImmediatePropagation();void cancel();}},true);
  form.onsubmit=e=>{
   e.preventDefault();try{
    check();if(allocation!==d||activityPopup!==root)throw Error('Reopen the current funding report.');
    if(!form.reportValidity())return;capture();
    const next={...d,movements:movements.filter(Boolean),conversions:conversions.filter(Boolean)};validateAllocation(next,false);
    d.movements=next.movements;d.conversions=next.conversions;dirty=false;closeActivity();renderAllocation();
   }catch(error){status.textContent=error.message;}
  };
  pending.then(()=>{if(activityPopup===root){activityPopup=null;if(fundPopup){fundPopup.querySelector('.ui-dialog108').inert=false;fundPopup.querySelector('[data-edit-funding]')?.focus();}}});
  render();if(value?.startsWith('new:'))add(value.slice(4));
 }catch(e){showCenterStatus(e.message,true)}
}
function openActivity(group,index=null,preset={}){
 try{
  if(busy||!fundPopup?.isConnected)return;
  applySpending();closeActivity();renderAllocation();
  const d=allocation;
  if(preset.line!=null){
   const line=d.lines[preset.line];
   const existing=d.movements.findIndex(m=>report.kind(m)==='spend'&&report.forLine(m,line,preset.line));
   if(existing>=0)index=existing;
  }
  const cs=budget14313.currencyOptions(d.lines),loans=d.movements.filter(m=>report.kind(m)==='borrow');
  const isFx=group==='conversion',types=Object.entries(report.labels).filter(([k])=>group==='other'?!['receipt','spend'].includes(k):k===group);
  const type=isFx?'':index!==null?report.kind(d.movements[index]):types[0][0];
  const options=rows=>rows.map(([v,name])=>`<option value="${esc(v)}">${esc(name)}</option>`).join('');
  const amountInput=(label,name)=>field82(label,name,'','number','min="0.01" step="0.01" required');
  const actions=(kind,i)=>button('Edit',`edit${kind}(${i})`)+button('Delete',`remove${kind}(${i})`);
  const title=preset.funding?(group==='receipt'?(index===null?'Add amount received':'Edit amount received'):group==='conversion'?'Edit exchange':'Edit funding movement'):{receipt:'Amount received',coverage:'Restaurant coverage',conversion:'Currency conversion',spend:index===null?'Add spending row':'Spending row',other:'Other fund movements'}[group];
 const movement=`<form id="financeMove82" class="finance-controls117">${types.length>1?select82('Activity','type290',type,types):'<input type="hidden" name="type290" value="'+esc(type)+'">'}${field82('Date','date290',d.date,'date','required')}
  <label data-loan-field hidden>Advance to repay<select name="loanId290"><option value="">Choose an advance</option>${options(loans.map(l=>[l.id290,l.account+' · '+l.reference+' · '+report.currencyAmount(l.currency,report.outstanding(d,l))+' outstanding']))}</select>${loans.length?'':'<small>Record the original advance with its borrowing date first.</small>'}</label>
  <label><span data-source-label>Funding from</span><input name="account" required></label><label><span data-dest-label>Received into</span><input name="destination290"></label>
  <label data-item-field hidden>Budget item<select name="budgetKey117"><option value="">Unassigned</option>${options(d.lines.map((l,i)=>[l.key117||'worksheet:'+i,l.category+' · '+l.description+' · '+l.currency]))}</select></label>
  ${group==='spend'?'<label data-extra-item>Item<input name="item290" placeholder="Item name"></label><label data-extra-item>Category<input name="category290" list="spendCategories290"></label><datalist id="spendCategories290">'+[...new Set(d.lines.map(l=>l.category).filter(Boolean))].map(c=>'<option value="'+esc(c)+'"></option>').join('')+'</datalist>':''}
  ${select82('Currency','currency',d.lines[0]?.currency||'LAK',cs)}${amountInput('Amount','amount')}
  <label data-cash-field hidden>Cash distributed<input placeholder="Same as expense amount" name="cashDistributed" type="number" min="0" step="0.01"></label>
  <label data-equivalent-field hidden><span></span><input name="equivalent" type="number" min="0.01" step="0.01"></label>
  ${group==='receipt'?select82('Funding source','ownerSource','',[['','Match to journal'],['owner','Owner support'],['other','Other source']]):''}
  ${group==='spend'?'<label>Owner amount<input name="ownerAmount" type="number" min="0" step="0.01" placeholder="Unconfirmed"></label>'+select82('Owner currency','ownerCurrency',d.lines[0]?.currency||'LAK',cs):''}
  ${field82('Description','description290','','text')}${field82('Reference','reference','','text','required')}<button type="submit">Add movement</button><button type="button" data-cancel hidden>Cancel edit</button></form>`;
 const fx=`<form id="financeFx117" class="finance-controls117">${field82('Date','date',d.date,'date','required')}${field82('From account','source','','text','required')}${select82('From currency','currency','USD',cs)}${amountInput('Amount exchanged','amount')}
  ${field82('Received into','destination290','','text','required')}${select82('To currency','target','LAK',cs)}${amountInput('Amount received','targetAmount290')}${field82('Reference','evidence','','text','required')}${field82('Rate','rate','','number','min="0.00000001" step="any" required')}<output aria-live="polite"></output><button type="submit">Add conversion</button><button type="button" data-cancel hidden>Cancel edit</button></form>`;
 const fxTable=table82(['Date','From account','Amount exchanged','Received into','Amount received','Rate','Reference','Action'],d.conversions.map((f,i)=>[esc(formatAppDate(f.date)),esc(f.source),report.amountHtml(f.currency,f.amount),esc(f.destination290||'—'),report.amountHtml(f.target,report.conversionAmount(f)),esc(formatAppRate(f.rate)),esc(f.evidence||f.reference),actions('Conversion',i)]));
 const movementRows=report.movementRows(d).flatMap((row,i)=>types.some(([k])=>k===report.kind(d.movements[i]))?[[...row,actions('Movement',i)]]:[]);
 const listing=group==='spend'?(index===null?'':button('Delete row',`removeMovement(${index})`)):table82([...report.movementHeaders,'Action'],movementRows);
 const selection=preset.funding?'<div class="funding-entry-toolbar"><button type="button" data-back-funding>Back to funding</button></div>':'';
 const remove=preset.funding&&index!==null?button('Delete entry',`remove${isFx?'Conversion':'Movement'}(${index})`):'';
 const {root,pending}=budgetDialog(title,selection+(isFx?fx:movement)+(preset.funding?'<div class="funding-delete">'+remove+'</div>':isFx?fxTable:listing));
 activityPopup=root;root.classList.add('fund-activity');fundPopup.querySelector('.ui-dialog108').inert=true;
 pending.then(()=>{if(activityPopup===root){activityPopup=null;if(fundPopup){fundPopup.querySelector('.ui-dialog108').inert=false;fundPopup.querySelector('[data-activity="'+group+'"]')?.focus()}}});
 const f=root.querySelector('form');
 if(preset.funding){f.dataset.funding='true';root.dataset.funding='true';}
 if(isFx){
  editFx=index;const prior=d.conversions[index];
  if(prior)for(const [k,v] of Object.entries({...prior,targetAmount290:report.conversionAmount(prior),evidence:prior.evidence||prior.reference||''}))if(f.elements[k])f.elements[k].value=v;
  f.oninput=f.onchange=e=>{const a=movementAmount(f.elements.amount);if(e?.target===f.elements.rate&&a>0&&movementAmount(f.elements.rate)>0)f.elements.targetAmount290.value=Math.round(a*movementAmount(f.elements.rate)*100)/100;const b=movementAmount(f.elements.targetAmount290);if(e?.target!==f.elements.rate)f.elements.rate.value=a>0&&b>0?b/a:'';f.querySelector('output').textContent=a>0&&b>0?'Rate: '+formatAppRate(b/a)+' '+f.elements.target.value+' / '+f.elements.currency.value:'';f.elements.targetAmount290.dataset.currency=f.elements.target.value;window.financialNumbers14231?.scan(f)};
  f.oninput();f.onsubmit=e=>{e.preventDefault();saveConversion(f)};
 }else{
  editMove=index;const prior=d.movements[index];
  if(prior)for(const [k,v] of Object.entries({...prior,type290:report.kind(prior),date290:prior.date290||d.date,amount:prior.inflow||prior.outflow,equivalent:prior.loanAmount290||prior.budgetAmount290||''}))if(f.elements[k])f.elements[k].value=v;
  if(prior?.worksheetLine!=null&&!prior.budgetKey117)f.elements.budgetKey117.value='worksheet:'+prior.worksheetLine;
  if(group==='spend'){
   if(!prior){
    f.elements.account.value='Budget funds';
    if(preset.line!=null)f.elements.budgetKey117.value=d.lines[preset.line].key117||'worksheet:'+preset.line;
    f.elements.currency.value=preset.currency||d.lines[preset.line]?.currency||d.lines[0]?.currency||cs[0][0];
   }else if(!prior.budgetKey117&&prior.worksheetLine==null){
    f.elements.item290.value=prior.item290||prior.destination290||prior.description290||'Additional spending';
   }
  }
  if(group==='spend'&&!prior?.ownerCurrency){
   const funds=[...new Set((d.movements||[]).filter(m=>report.kind(m)==='receipt'&&m.ownerSource!=='other').map(m=>m.currency))];
   f.elements.ownerCurrency.value=funds.length===1?funds[0]:f.elements.currency.value;
  }
  if(group==='spend'&&(!prior||prior.worksheetSpend)){f.elements.account.required=false;f.elements.reference.required=false;}
  if(group==='spend'){
   const more=document.createElement('details');more.className='spend-more';more.innerHTML='<summary>More details</summary><div></div>';
   for(const key of ['account','destination290','cashDistributed','equivalent','ownerAmount','ownerCurrency']){
    more.lastElementChild.append(f.elements[key].closest('label'));
   }
   f.querySelector('[type=submit]').before(more);
   if(prior?.cashDistributed!=null||prior?.ownerAmount!=null)more.open=true;
   if(prior?.cashUnconfirmed){
    const confirm=document.createElement('label');
    confirm.innerHTML='<input type="checkbox" name="cashConfirmed"> Cash payment amount confirmed';
    f.elements.cashDistributed.closest('label').after(confirm);
   }
   f.addEventListener('invalid',e=>{if(more.contains(e.target))more.open=true;},true);
   let currency=f.elements.currency.value;
   f.elements.currency.onchange=()=>{
    if(currency===f.elements.currency.value)return;
    currency=f.elements.currency.value;
    for(const key of ['amount','cashDistributed','equivalent','ownerAmount'])f.elements[key].value='';
    f.elements.amount.focus();
   };
   if(prior&&preset.currency&&prior.currency!==preset.currency){f.elements.currency.value=preset.currency;f.elements.currency.onchange();}
  }
  f.onchange=()=>movementFields(f);movementFields(f);
  f.onsubmit=e=>{e.preventDefault();saveMovement(f)};
 }
 // Keep concise, related fields together, independent of optional detail visibility.
 for(const label of f.querySelectorAll('label')){
  const field=label.querySelector('input,select,textarea');if(field)label.dataset.field=field.name;
 }
 const row=(className,names)=>{
  const labels=names.map(name=>f.elements[name]?.closest('label')).filter(Boolean);
  if(!labels.length)return;
  const wrap=document.createElement('div');wrap.className='fund-field-row '+className;
  labels[0].before(wrap);for(const label of labels)wrap.append(label);
 };
 if(isFx){
  row('fund-source-row',['date','source','destination290']);
  row('fund-exchange-row',['currency','amount','target','targetAmount290']);
  row('fund-rate-row',['rate','evidence']);
 }else{
  row('fund-date-row',['date290',group==='spend'?'budgetKey117':'ownerSource']);
  row('fund-source-pair',['account','destination290']);
  row('fund-item-row',['item290','category290']);
  row('fund-payment-row',['currency','amount','reference']);
  row('fund-description-row',['description290']);
  row('fund-owner-row',['ownerCurrency','ownerAmount','cashDistributed','equivalent']);
 }
 const submit=f.querySelector('[type=submit]');
 const footer=document.createElement('div');footer.className='fund-form-actions';submit.before(footer);footer.append(submit);
 if(preset.funding){
  const initial=JSON.stringify([...new FormData(f)]);
  root.querySelector('[data-back-funding]').onclick=async()=>{
   if(JSON.stringify([...new FormData(f)])!==initial&&!await ui117.confirm('Discard the unsaved changes to this funding entry?'))return;
   openFundingEditor();
  };
 }
 f.querySelector('[type=submit]').textContent=index!==null?'Update':isFx?'Add conversion':group==='receipt'?'Add receipt':group==='coverage'?'Add coverage':group==='spend'?'Add spending':'Add movement';
 f.querySelector('[data-cancel]').remove();
 f.querySelector('input:not([type=hidden]),select')?.focus();
 }catch(e){showCenterStatus(e.message,true)}
}
function movementAmount(field){
 return field.type==='number'||field.dataset.numeric88?field.valueAsNumber:parseAppNumber(field.value);
}
function movementFields(f){
 const type=f.elements.type290.value,spend=type==='spend',repay=type==='repay',transfer=type==='transfer';
 const loan=allocation.movements.find(m=>m.id290===f.elements.loanId290.value&&report.kind(m)==='borrow');
 const item=allocation.lines.find((l,i)=>(l.key117||'worksheet:'+i)===f.elements.budgetKey117.value);
 f.querySelector('[data-loan-field]').hidden=!repay;f.elements.loanId290.required=repay;
 f.querySelector('[data-item-field]').hidden=!spend;f.querySelector('[data-cash-field]').hidden=!spend;
 f.querySelectorAll('[data-extra-item]').forEach(label=>{label.hidden=!!item;});
 if(f.elements.item290)f.elements.item290.required=spend&&!item;
 const labels={receipt:['Funding from','Received into'],coverage:['Covered by','Applied to'],borrow:['Lender / company fund','Received into'],repay:['Paid from','Repaid to'],spend:['Paid from','Paid to'],refund:['Returned from','Returned to'],transfer:['Transferred from','Transferred to']};
 f.querySelector('[data-source-label]').textContent=labels[type][0];f.querySelector('[data-dest-label]').textContent=labels[type][1];
 f.elements.destination290.required=transfer;
 const target=repay?loan:spend?item:null,cross=target&&target.currency!==f.elements.currency.value;
 const field=f.querySelector('[data-equivalent-field]');field.hidden=!cross;f.elements.equivalent.required=!!cross&&repay;
 if(cross){field.querySelector('span').textContent=repay?'Debt settled in '+target.currency:'Budget equivalent ('+target.currency+')';}
}
function editMovement(i,currency){
 const m=allocation?.movements[i];if(!m)return;
 const type=report.kind(m);openActivity(['receipt','spend','coverage'].includes(type)?type:'other',i,{currency});
}
function saveMovement(f){
 try{guard();if(!activityPopup?.contains(f)||!f.reportValidity())return;captureFund();
  const fields=Object.fromEntries(new FormData(f)),type=fields.type290,amount=movementAmount(f.elements.amount),incoming=['receipt','coverage','borrow'].includes(type);
  const prior=editMove===null?null:allocation.movements[editMove];
  const next={id290:prior?.id290||crypto.randomUUID(),type290:type,date290:fields.date290,account:fields.account.trim(),destination290:fields.destination290.trim(),reference:fields.reference.trim(),description290:fields.description290.trim(),currency:fields.currency,budgetKey117:type==='spend'?fields.budgetKey117:'',inflow:incoming?amount:0,outflow:incoming?0:amount};
  if(type==='receipt'&&fields.ownerSource)next.ownerSource=fields.ownerSource;
  if(type==='spend'&&fields.ownerAmount!==''){
   next.ownerAmount=movementAmount(f.elements.ownerAmount);
   next.ownerCurrency=fields.ownerCurrency;
   BudgetOwnerBalance.validateShare(next);
  }
  if(type==='spend'&&fields.cashDistributed!=='')next.cashDistributed=movementAmount(f.elements.cashDistributed);
  if(type==='spend'&&prior?.cashUnconfirmed&&!fields.cashConfirmed)next.cashUnconfirmed=true;
  if(type==='spend'){
   if(!prior||prior.worksheetSpend)next.worksheetSpend=true;
   if(!next.budgetKey117){
    next.item290=fields.item290.trim();
    next.category290=fields.category290.trim();
   }
  }
  if(type==='spend'&&next.budgetKey117.startsWith('worksheet:')&&!allocation.lines.some(l=>l.key117===next.budgetKey117)){
   next.worksheetLine=allocation.lines.findIndex((l,i)=>!l.key117&&'worksheet:'+i===next.budgetKey117);
   next.budgetKey117='';
  }
  if(type==='spend' && next.cashDistributed!=null && prior?.cashBudgetAmount!=null && prior.currency===next.currency &&
     prior.budgetKey117===next.budgetKey117 && prior.worksheetLine===next.worksheetLine && next.cashDistributed===prior.cashDistributed)next.cashBudgetAmount=prior.cashBudgetAmount;
  if(type==='repay'){next.loanId290=fields.loanId290;const loan=allocation.movements.find(m=>m.id290===next.loanId290);next.loanAmount290=loan?.currency===next.currency?amount:movementAmount(f.elements.equivalent);}
  if(type==='spend'&&!f.querySelector('[data-equivalent-field]').hidden&&fields.equivalent)next.budgetAmount290=movementAmount(f.elements.equivalent);
  const rows=[...allocation.movements];if(prior)rows[editMove]=next;else rows.push(next);
  validateAllocation({...allocation,movements:rows},false);allocation.movements=rows;const funding=f.dataset.funding==='true';closeActivity();renderAllocation();if(funding)openFundingEditor();
 }catch(e){showCenterStatus(e.message,true)}
}
async function removeMovement(i){
 try{const check=context(),rows=allocation.movements,m=rows[i];if(!m)return;
  if(m.id290&&rows.some(r=>r.loanId290===m.id290))throw Error('Remove or reassign repayments before deleting their advance.');
  if(!await ui117.confirm('Delete this movement?'))return;check();if(rows!==allocation.movements||rows[i]!==m)return;captureFund();const funding=activityPopup?.dataset.funding==='true';rows.splice(i,1);closeActivity();renderAllocation();if(funding)openFundingEditor();
 }catch(e){showCenterStatus(e.message,true)}
}
function editConversion(i){if(allocation?.conversions[i])openActivity('conversion',i);}
function saveConversion(f){
 try{guard();if(!activityPopup?.contains(f)||!f.reportValidity())return;captureFund();
  const fields=Object.fromEntries(new FormData(f)),amount=movementAmount(f.elements.amount),target=movementAmount(f.elements.targetAmount290);
  const next={...(editFx===null?{}:allocation.conversions[editFx]),...fields,amount,targetAmount290:target,rate:target/amount,source:fields.source.trim(),destination290:fields.destination290.trim(),evidence:fields.evidence.trim()};
  const rows=[...allocation.conversions];if(editFx===null)rows.push(next);else rows[editFx]=next;
  validateAllocation({...allocation,conversions:rows},false);allocation.conversions=rows;const funding=f.dataset.funding==='true';closeActivity();renderAllocation();if(funding)openFundingEditor();
 }catch(e){showCenterStatus(e.message,true)}
}
function postControl(record){
 return record&&!record._pending14333&&access113.can('journal','post')?'<button type="button" data-prepare-budget title="Open in Post Transaction">Journal</button>':'';
}
function editorData(d){
 return JSON.stringify([d.date,d.budgetMonth290,d.receiptReference290||'',d.recipient||'',d.purpose||'',d.notes||'',d.movements||[],d.conversions||[],d.lines.map((l,i)=>report.lineFunding(d,l,i))]);
}
function showJournalReference(host,record){
 const field=host.querySelector('[data-journal-ref]'),post=field.closest('[role=dialog]').querySelector('[data-prepare-budget]');
 if(!record||record._pending14333)return;
 if(post)post.onclick=()=>prepareSummary(record,host,post);
 const check=context();
 journal.lookup(record.id).then(link=>{
  check();if(!field.isConnected)return;
  const label=journal.reference(link);
  if(label){field.textContent='Utilization journal · '+label+' · report version '+link.report_version;if(post)post.hidden=true;}
  else{
   const job=journal.localJob(record.id);
   if(job){field.textContent='Utilization journal · '+(job.message||'Awaiting posting confirmation');if(post)post.hidden=true;}
  }
 }).catch(()=>{if(field.isConnected)field.textContent='Utilization journal reference unavailable.';});
}
async function prepareSummary(record,host,post){
 const check=context();if(busy||post.disabled)return;
 post.disabled=true;
 try{
  const worksheet=!!host.querySelector('#fundHeader290');
  function saved(){
   if(worksheet){applySpending();if(editorData(allocation)!==editorData(record.data))throw Error('Save the report before opening the updated summary in Post Transaction.');}
  }
  saved();
  const current=await live(record.id,record.version);check();
  const link=await journal.lookup(record.id);check();if(!host.isConnected)return;
  if(link)throw Error('This report is already linked to journal '+journal.reference(link)+'.');
  if(journal.localJob(record.id))throw Error('The utilization posting is waiting for confirmation. Open Data Check to review it.');
  const groups=BudgetSupportEquity.groups(current.data);
  const evidence=await BudgetSupportEquity.evidence(groups);
  check();if(!host.isConnected)return;
  saved();journal.open(current,groups,evidence);
  if(worksheet)clearFundPopup();else host.resolve108(false);
 }catch(e){showCenterStatus(e.message,true)}finally{post.disabled=false}
}
async function printUtilization(d,record,dialog){
 const check=context(),origin=fundPopup;
 let reference='';
 if(record){
  try{reference=journal.reference(await journal.lookup(record.id));}
  catch{reference='Reference unavailable';}
  check();
 }
 const content=document.createElement('div');content.innerHTML=report.report(d,reference,true);content.querySelector('h1')?.remove();
 if(await print82(report.title,content.innerHTML,'')){
  if(dialog?.isConnected)dialog.resolve108(false);
  if(!dialog&&origin&&origin===fundPopup)await closeFundEditor();
 }
}
function headerValid(){const form=fundPopup?.querySelector('#fundHeader290');if(form&&!form.checkValidity())form.closest('details').open=true;return form?.reportValidity();}
async function previewAllocation(){try{if(!headerValid())return;applySpending();const d=clone(captureFund());validateAllocation(d,false);d.preparedBy=liveProfile.full_name||liveProfile.email;await printUtilization(d,allocationRecord)}catch(e){showCenterStatus(e.message,true)}}
// The verified source file stays in private Bookkeeping. Save the complete linked batch in one database request.
function historyImportButton(){
 const months=new Set(Work82.reports.filter(r=>r.data?.mode==='utilization').map(r=>r.data.budgetMonth290));
 return ['2026-01','2026-02'].every(m=>months.has(m))?'':button('Record verified history','importHistory()');
}
function importHistory(){
 const check=context(),client=ojmDb;
 const {root}=budgetDialog('Record verified budget history','<label>January and February history file <input type="file" accept=".json" data-history-file></label><p role="status"></p><button type="button" disabled data-save-history>Save both months</button>');
 const file=root.querySelector('[data-history-file]'),save=root.querySelector('[data-save-history]'),status=root.querySelector('[role=status]');
 let rows;
 file.onchange=async()=>{
  const selected=file.files[0];rows=null;save.disabled=true;
  try{
   if(!selected||selected.size>200000)throw Error('Choose the verified January and February file.');
   const bytes=await selected.arrayBuffer();
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
   if(digest!=='8aa566452771e68f0e36e844797700cc941848df6480448982a1a6b4e360701a')throw Error('The selected file does not match the verified history.');
   const prepared=JSON.parse(new TextDecoder().decode(bytes));check();
   for(const row of prepared){
    if(row.data.mode==='utilization')validateAllocation(row.data,false);
    else row.data.document14316={title:'Budget Request — '+row.data.purpose,html:requestHTML(row.data),settings:{}};
   }
   if(file.files[0]!==selected)return;
   rows=prepared;save.disabled=false;
   status.textContent='Ready: '+rows.filter(r=>r.data.mode==='request').map(r=>report.period(r.data)+' · '+totals327(r.data)).join(' / ');
  }catch(e){status.textContent=e.message;}
 };
 save.onclick=async()=>{
  if(busy||!rows)return;busy=true;save.disabled=true;file.disabled=true;
  try{
   check();await ensureLifecycle();check();
   const months=rows.filter(r=>r.data.mode==='request').map(r=>r.data.budgetMonth290);
   const existing=await client.from('operational_reports').select(BudgetReportWording.select).eq('data->>kind','finance').in('data->>budgetMonth290',months);
   check();if(existing.error)throw existing.error;
   let saved=existing.data||[];
   const complete=list=>list.length===rows.length&&rows.every(row=>list.some(r=>r.id===row.id&&r.data.mode===row.data.mode&&r.data.budgetMonth290===row.data.budgetMonth290&&r.data.requestId14316===row.data.requestId14316));
   if(saved.length&&!complete(saved))throw Error('These months already contain budget records. Review the existing requests before importing.');
   if(!saved.length){
    const result=await client.from('operational_reports').insert(rows).select('*');
    check();if(result.error)throw result.error;saved=result.data||[];
   }
   if(!complete(saved))throw Error('The database response was incomplete. Reopen the import to verify the saved records.');
   const ids=new Set(saved.map(r=>r.id));
   Work82.reports=[...saved,...Work82.reports.filter(r=>!ids.has(r.id))];
   if(document.querySelector('#transactions-budget14313.active'))renderRequest();
   root.resolve108(false);busy=false;chooseRequest(true);
  }catch(e){status.textContent=e.message;file.disabled=false;save.disabled=false;}finally{busy=false;}
 };
}
function canLinkRequest(record){
 const d=allocation;
 return !!(fundPopup?.isConnected&&allocationRecord&&d?.status==='draft'&&!d.requestId14316&&!d.lines.length&&
  record.data.mode==='request'&&record.data.budgetMonth290===d.budgetMonth290&&record.data.purpose===d.purpose&&record.data.recipient===d.recipient);
}
async function linkRequest(id){
 try{
  const check=context(),draft=allocation,record=allocationRecord;
  if(busy||!record)return;
  const parent=await editableRecord(id);check();
  if(draft!==allocation||record!==allocationRecord||!canLinkRequest(parent))return;
  const child=await linkedUtilization(id);check();
  if(child)throw Error('This budget request already has a utilization report.');
  if(draft!==allocation||record!==allocationRecord||busy)return;
  applySpending();
  if(draft.movements.some(m=>m.budgetKey117||m.worksheetLine!=null))throw Error('Review existing item links before attaching this budget request.');
  draft.lines=clone(parent.data.lines);
  draft.fundingByItem=Object.fromEntries(draft.lines.map((line,i)=>[report.fundingKey(line,i),{status:'unconfirmed'}]));
  draft.requestId14316=id;draft.requestVersion14316=parent.version;draft.requestDate290=parent.data.date;
  selectedParent=id;renderAllocation();
 }catch(e){showCenterStatus(e.message,true)}
}
function chooseRequest(offerNewRequest=false){
 guard();if(busy)return;
 const saved=budgetRows().filter(r=>r.data.mode==='utilization');
 const entries=requests().map(r=>[esc(report.period(r.data)),esc(r.data.purpose),canLinkRequest(r)?
  button('Link to this draft',`linkRequest(${JSON.stringify(r.id)})`):button('Use request',`startAllocation(${JSON.stringify(r.id)})`)]);
 const reports=saved.map(r=>[esc(report.period(r.data)),esc(r.data.purpose),esc(r._pending14333?(window.localFirst14333?.budgetSave(r.id)?.status||'Waiting for confirmation'):r.data.status||'Draft'),button(r._pending14333?'Save status':isFinal(r)?'View':'Edit',`openAllocation(${JSON.stringify(r.id)})`)]);
 const {root}=budgetDialog('Requests and saved reports',

  section82('Budget requests',table82(['Month','Purpose','Action'],entries))+
  section82('Utilization reports',table82(['Month','Purpose','Status','Action'],reports))+
  (offerNewRequest?button('New Report','newRequest()'):button('New utilization','newUnlinked()'))+historyImportButton());
 root.querySelector('.ui-body108').addEventListener('click',e=>{if(e.target.closest('button[onclick^="budgetWorkflow14316."]'))root.resolve108(false)},true);
}
async function newUnlinked(){
 const check=context();if(busy||!await canLeaveFund())return;
 check();selectedParent='';allocationRequest14370++;allocationRecord=null;allocation=newUtilization();presentFundEditor();
}
async function removeConversion(i){try{const check=context();captureFund();const rows=allocation.conversions,item=rows[i];if(!item)return;if(await ui117.confirm('Delete this conversion?')){check();if(allocation.conversions!==rows)return;const index=rows.indexOf(item);if(index<0)return;const funding=activityPopup?.dataset.funding==='true';rows.splice(index,1);closeActivity();renderAllocation();if(funding)openFundingEditor()}}catch(e){showCenterStatus(e.message,true)}}
function validateAllocation(d,finalize){
 if(!validDate14317(d.date))throw Error('Enter a valid report date.');
 const currencies=new Set(CurrencyStore.currencies.map(c=>c.code));
 const positive=n=>Number.isFinite(Number(n))&&Number(n)>0&&Number.isSafeInteger(Math.round(Number(n)*100));
 if(!d.movements.length&&!d.conversions.length&&!(d.lines.length&&d.fundingByItem))throw Error('Record a funding decision, receipt, movement or conversion first.');
 const loans=new Map(d.movements.filter(m=>report.kind(m)==='borrow').map(m=>[m.id290,m]));
 for(const m of d.movements){
  if(m.ownerAmount!=null){BudgetOwnerBalance.validateShare(m);if(!currencies.has(m.ownerCurrency))throw Error('Choose the original owner funding currency.');}
  const type=report.kind(m),incoming=['receipt','coverage','borrow'].includes(type);
  if(!Object.hasOwn(report.labels,type)||!currencies.has(m.currency)||(!(type==='spend'&&m.worksheetSpend)&&(!m.account||!m.reference))||m.date290&&!validDate14317(m.date290)||!positive(incoming?m.inflow:m.outflow)||Number((incoming?m.outflow:m.inflow)||0)!==0)throw Error('Each movement needs a source, reference, configured currency and one positive amount.');
  if(m.cashDistributed!=null&&(type!=='spend'||!Number.isFinite(m.cashDistributed)||m.cashDistributed<0||!Number.isSafeInteger(Math.round(m.cashDistributed*100))||Math.abs(m.cashDistributed*100-Math.round(m.cashDistributed*100))>0.00001))throw Error('Enter a nonnegative cash distribution with up to two decimal places.');
  if(type==='transfer'&&(!m.destination290||m.destination290===m.account))throw Error('Choose different source and destination accounts for a transfer.');
  const line=d.lines.find(l=>l.key117===m.budgetKey117);
  if(m.budgetKey117&&!line)throw Error('Select a budget item from this request.');
  if(m.cashBudgetAmount!=null&&(m.cashDistributed==null||!positive(m.cashBudgetAmount)))throw Error('Enter a positive cash equivalent, or leave it blank.');
  if(m.budgetAmount290!=null&&!positive(m.budgetAmount290))throw Error('Enter a positive budget equivalent, or leave it blank.');
  if(type==='borrow'&&(!m.id290||report.outstanding(d,m)<0))throw Error('Repayments exceed the amount borrowed. Review the linked advance.');
  if(type==='repay'&&(!loans.has(m.loanId290)||!positive(m.loanAmount290)||m.date290<loans.get(m.loanId290).date290))throw Error('Choose an advance, its settlement amount, and a repayment date on or after the advance.');
 }
 for(const f of d.conversions)if(!currencies.has(f.currency)||!currencies.has(f.target)||f.currency===f.target||!validDate14317(f.date)||!f.source||!(f.evidence||f.reference)||!positive(f.amount)||!Number.isFinite(Number(f.rate))||Number(f.rate)<=0||!positive(report.conversionAmount(f)))throw Error('Enter both currencies, amounts, date, source and evidence for the exchange.');
 const totals=[...report.balances(d).values()];
 if(totals.some(t=>Object.values(t).some(n=>n!==null&&(!Number.isFinite(n)||!Number.isSafeInteger(Math.round(n*100))))))throw Error('Funding totals exceed the supported amount range.');
}
function negativeAllocationBalances(d){
 return [...report.balances(d)].filter(([c,t])=>Math.round(t.remaining*100)<0&&!(d.movements||[]).some(m=>m.currency===c&&m.cashUnconfirmed))
  .map(([currency,t])=>currency+' ('+Math.abs(t.remaining).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+')').join(', ');
}
async function confirmAllocationFinalization(d){
 const negative=negativeAllocationBalances(d);
 if(!negative)return ui117.confirm('Finalize the received funding and allocations? This saved version becomes read-only in History.');
 return ui108.modal('Negative remaining balance',
  '<p><strong>'+esc(negative)+'</strong></p><p>You can finalize with this negative monthly balance, including when payments use funds from previous months. USD and LAK balances remain separate.</p><p>This saved report becomes read-only in History. Journal posting is a separate step.</p>',
  [{label:'Cancel',value:false},{label:'Finalize anyway',value:true,primary:true}]);
}
async function saveAllocation(finalize){
 const check=context(),record=allocationRecord,selection=allocationRequest14370,controls=[];
 if(busy)return;busy=true;
 try{
  if(confirmedFinals.has(record?.id)||record?.data.status==='finalized')throw Error('This report is finalized or awaiting finalization. Open its notification to review the save.');
  if(!headerValid())return;
  applySpending();const d=clone(allocation);validateAllocation(d,finalize);
  for(const node of fundPopup?.querySelectorAll('input,select,textarea,button:not([data-dismiss])')||[]){controls.push([node,node.disabled]);node.disabled=true;}
  if(finalize&&!await confirmAllocationFinalization(d))return;
  check();if(selection!==allocationRequest14370)return;
  delete d.document14316;d.kind='finance';d.mode='utilization';d.status=finalize?'finalized':'draft';
  d.preparedBy=liveProfile.full_name||liveProfile.email;d.preparedRole290=liveProfile.job_title||livePermission?.job_title||'Prepared by';
  d.finalizedAt14316=finalize?new Date().toISOString():null;
  // The atomic server save validates linked versions; delivery retains the new-report duplicate check.
  // Retain the local identity before releasing the editor; never wait for a network preflight here.
  const r=await saveWork82('reports',d,record);check();
  if(selection!==allocationRequest14370)return;
  const confirmed=Work82.reports.find(row=>row.id===r.id&&row.version===r.version&&!row._pending14333);
  const saved=confirmed||r;
  checkedOnVisit.add(saved.id);
  Work82.reports=[saved,...Work82.reports.filter(old=>old.id!==saved.id)];allocationRecord=saved;allocation=clone(saved.data);
  if(finalize){if(!saved._pending14333)rememberFinal(saved);clearFundPopup();}else renderAllocation();
  if(document.querySelector('#transactions-budget14313.active'))renderRequest();
  const negative=negativeAllocationBalances(d);
  showCenterStatus((saved._pending14333?(finalize?'Finalization queued.':'Save queued.')+' Your copy is saved on this device; follow progress or retry from Notifications.':finalize?'Fund allocation finalized.':'Fund allocation saved.')+(negative&&!finalize?' Warning: negative remaining balance — '+negative+'.':''));
 }catch(e){showCenterStatus(e.message,true);}
 finally{for(const [node,disabled]of controls)node.disabled=disabled;busy=false;}
}
function budgetDialog(title,html,save=false){const pending=ui108.modal(title,html,save?[{label:'Cancel',value:false},{label:'Save',value:true,primary:true}]:[{label:'Close',value:false}]);const root=document.querySelector('.ui-overlay108:last-child');root.querySelector('.ui-dialog108').classList.add('budget-dialog14313');return {pending,root}}
function renderFinalization(){if(liveProfile?.role!=='admin')return;if(finalTab==='funds')finalTab='submitted';const panel=document.getElementById('user-entry-review');if(!panel)return;let bar=panel.querySelector('#finalizationSwitch14316');if(!bar){bar=document.createElement('div');bar.id='finalizationSwitch14316';bar.className='workflow-switch14316';bar.innerHTML=button('Submitted Entries',"finalization('submitted')")+button('Reconciliation',"finalization('reconciliation')");panel.prepend(bar)}let fund=panel.querySelector('#fundAllocation14316');if(!fund){fund=document.createElement('section');fund.id='fundAllocation14316';panel.append(fund)}window.workspace14337?.mountReconciliation(panel);for(const child of panel.children)if(!child.matches('#finalizationSwitch14316,#fundAllocation14316,#reconciliationWork14337,.area-banner113,.module-header,#categoryTabShell'))child.hidden=finalTab!=='submitted';const rec=panel.querySelector('#reconciliationWork14337');if(rec)rec.hidden=finalTab!=='reconciliation';fund.hidden=finalTab!=='funds';bar.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(['submitted','reconciliation'][i]===finalTab)));panel.querySelectorAll('[onclick*=toggleSubmissionHistory]').forEach(b=>b.remove());if(bar.children[1])bar.children[1].hidden=!access113.can('report-reconciliation');if(finalTab==='funds')fund.innerHTML=button('Open budget utilization','showFunds()');if(finalTab==='reconciliation')void renderReconciliationList71()}
function finalization(tab){if(tab==='reconciliation'&&!access113.can('report-reconciliation'))return showCenterStatus('Reconciliation access is required.',true);if(tab==='funds'&&(liveProfile?.role!=='admin'||!access113.can('transactions-budget14313')))return showCenterStatus('Budget Request access is required for Fund Allocation.',true);if(tab==='funds')tab='submitted';finalTab=tab;window.workspace14337?.closeReconciliationHistory();renderFinalization()}
function renderHistory(){const budgetAllowed=liveProfile?.role==='admin'&&!!access113.can('transactions-budget14313')&&Work82.owner===liveProfile.id;const submissionAllowed=!!access113.can('user-entry-review');if(historyTab==='budget'&&!(liveProfile?.role==='admin'&&access113.can('transactions-budget14313'))||historyTab==='submitted'&&!submissionAllowed)historyTab='journal';const panel=document.getElementById('transactions-all');if(!panel)return;let bar=panel.querySelector('#historySwitch14316');if(!bar){const journal=document.createElement('div');journal.id='journalHistory14316';for(const child of [...panel.children])if(!child.matches('.area-banner113,.module-header,#categoryTabShell'))journal.append(child);panel.append(journal);bar=document.createElement('div');bar.id='historySwitch14316';bar.className='workflow-switch14316';bar.innerHTML=button('Journal',"history('journal')")+button('Submitted Entries',"history('submitted')")+button('Budget Requests',"history('budget')");journal.before(bar);const budget=document.createElement('section');budget.id='budgetHistory14316';panel.append(budget)}bar.querySelectorAll('button').forEach((b,i)=>b.hidden=i===1&&!submissionAllowed||i===2&&!budgetAllowed);const submission=document.getElementById('userEntryHistoryPanel');if(submission&&submission.parentElement!==panel){panel.append(submission);submission.querySelectorAll('[onclick*=toggleSubmissionHistory]').forEach(b=>b.remove())}document.getElementById('journalHistory14316').hidden=historyTab!=='journal';if(submission)submission.hidden=historyTab!=='submitted';const budget=document.getElementById('budgetHistory14316');budget.hidden=historyTab!=='budget';bar.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(['journal','submitted','budget'][i]===historyTab)));const historyRecords=budgetAllowed?budgetRows():[];const month=historyMonth14341.choose('budget',historyRecords.map(budgetMonth));if(historyTab!=='budget')return;budget.innerHTML=historyMonth14341.control('budget',month)+historyMonth14341.summary([['Budget Records',budgetMonthRows(historyRecords,month).length]])+section82('Budget Request History',table82(['Date','Purpose','Record','Status','Action'],budgetMonthRows(historyRecords,month).map(r=>[esc(formatAppDate(r.data.date)),esc(r.data.purpose),r.data.mode==='utilization'?'Fund allocation':'Budget request',esc(r._pending14333?(window.localFirst14333?.budgetSave(r.id)?.status||'Waiting for confirmation'):r.data.status||'Saved'),button('View',`view(${JSON.stringify(r.id)})`)+(r.data.mode!=='utilization'?button('Editor',`openRequest(${JSON.stringify(r.id)})`):r.data.status!=='finalized'?button('Continue',`openAllocation(${JSON.stringify(r.id)})`):'')+button('Delete',`remove(${JSON.stringify(r.id)})`)])));historyMonth14341.bind(budget,'budget',renderHistory,true)}
function history(tab){historyTab=tab;renderHistory();if(tab==='submitted')window.renderUserEntryReview?.();if(tab==='budget')(window.startup14257?.isPrepared('payroll')?Promise.resolve():loadWork82()).then(renderHistory)}
function payrollDraftClean(id){
 const host=fundPopup?.querySelector('#budgetFunds290');
 if(host&&allocationRecord?.id===id){
  captureFund();
  if(editorData(allocation)!==host.savedValues||host.worksheetChanged())throw Error('Save your report edits before updating payroll amounts.');
 }
 if(Work82.reports.find(r=>r.id===id)?._pending14333)throw Error('Wait for this report to finish syncing before updating payroll amounts.');
}
async function reviewPayroll(id,reportRoot){
 try{
  const check=context();if(busy)return;
  if(window.offline14239?.offline())throw Error('Connect to the internet to check the finalized payroll.');
  payrollDraftClean(id);
  const record=await live(id);check();payrollDraftClean(id);
  const preview=await ojmDb.rpc('budget_payroll_protocol',{p_report:id,p_version:record.version});
  check();if(preview.error)throw Error(preview.error.message);
  const result=preview.data;
  const rows=changes=>table82(['Employee','Currency','Current expense','Earned gross','Change'],changes.map(c=>[
   esc(c.employee),esc(c.currency),c.before==null?'—':report.amountHtml(c.currency,c.before),report.amountHtml(c.currency,c.after),esc(c.action)]));
  const html='<p>Use earned gross after absence and late deductions, before employee deductions and advance recovery. Existing cash payments and posted journals stay unchanged.</p>'+
   '<p>Payroll: '+esc(result.source||report.period(record.data))+'</p>'+
   (result.changes.length?rows(result.changes):'<p>Salary amounts already match the finalized payroll.</p>')+
   (result.skipped.length?'<p>Needs individual review:</p><ul>'+result.skipped.map(c=>'<li>'+esc(c.employee)+': '+esc(c.reason)+'</li>').join('')+'</ul>':'')+
   (result.history.length?'<details><summary>Previous corrections</summary>'+result.history.map(h=>'<p>Version '+esc(h.version)+' · '+esc(formatAppDate(String(h.date).slice(0,10)))+'</p>'+rows(h.changes)).join('')+'</details>':'')+
   '<p role="status"></p>'+(result.changes.length?'<button type="button" data-apply-payroll>Apply payroll amounts</button>':'');
  const {root}=budgetDialog('Payroll amounts · '+report.period(record.data),html);
  const apply=root.querySelector('[data-apply-payroll]');
  if(apply)apply.onclick=async()=>{
   if(busy)return;
   busy=true;apply.disabled=true;
   const status=root.querySelector('[role=status]');status.textContent='Saving payroll amounts…';
   try{
    check();payrollDraftClean(id);
    const response=await ojmDb.rpc('budget_payroll_protocol',{p_report:id,p_version:record.version,p_apply:true,p_fingerprint:result.fingerprint});
    check();if(response.error)throw Error(response.error.message);
    const saved=response.data.record;
    if(saved?.id!==id||saved.version!==record.version+1)throw Error('The saved correction could not be confirmed. Reopen the report to check its status.');
    cacheWording(saved);
    window.dispatchEvent(new Event('save-state14234'));
    if(root.isConnected)root.resolve108(true);
    if(reportRoot?.isConnected){reportRoot.resolve108(true);await showReport(saved);}
    else if(allocationRecord?.id===id){allocationRecord=saved;allocation=clone(saved.data);renderAllocation();}
    if(document.querySelector('#transactions-budget14313.active'))renderRequest();
    showCenterStatus('Payroll amounts saved to Supabase. Other report details preserved.');
   }catch(e){status.textContent=e.message;apply.disabled=false;}
   finally{busy=false;}
  };
 }catch(e){showCenterStatus(e.message,true);}
}
async function showFinal(record){
 rememberFinal(record);
 if(allocation&&(allocationRecord?.id===record.id||record.data.requestId14316&&allocation.requestId14316===record.data.requestId14316)){
  const current=allocation;
  if(!await canLeaveFund()||allocation!==current)return;
  clearFundPopup();
 }
 selectedParent=record.data.requestId14316||'';
 if(document.querySelector('#transactions-budget14313.active'))renderRequest();
 return showReport(record);
}
async function view(id){
 if(window.localFirst14333?.budgetSave(id)&&!window.localFirst14333.budgetSave(id).confirmed)return window.budgetSaveStatus472.open(id);
 try{const r=await editableRecord(id);if(isFinal(r))await showFinal(r);else await showReport(r);}catch(e){showCenterStatus(e.message,true)}
}
function cacheWording(record){
 const index=Work82.reports.findIndex(r=>r.id===record.id);
 if(index>=0)Work82.reports[index]=record;
 rememberFinal(record);
}
async function showReport(r){
  const d=BudgetReportWording.data(r),utilization=d.mode==='utilization',id=r.id;
  const check=context();
  const html=documentWorkspace105.sanitize(utilization?report.report(d):d.document14316?.html||financeHtml82(d));
  const {root}=budgetDialog(utilization?report.title:'Budget request',html+'<div data-journal-ref></div>');
  root.classList.add('fund-popup326','budget-report-preview');
  const canEditWording=isFinal(r)||(!utilization&&(r.budget_report_wording||budgetRows().some(x=>x.data.requestId14316===id)));
  reportToolbar(root,(canEditWording?'<button type="button" data-edit-wording>Wording</button>':'')+(utilization?'<button type="button" data-payroll-protocol>Payroll amounts</button>':'')+'<button type="button" data-print-record>Print</button>'+(utilization?postControl(r):''));
  root.querySelectorAll('[contenteditable]').forEach(n=>n.removeAttribute('contenteditable'));
  const payroll=root.querySelector('[data-payroll-protocol]');
  if(payroll)payroll.onclick=()=>reviewPayroll(id,root);
  const wording=root.querySelector('[data-edit-wording]');
  if(wording)wording.onclick=()=>BudgetReportWording.edit(r,budgetDialog,context(),saved=>{
   cacheWording(saved);if(root.isConnected){root.resolve108(true);showReport(saved);}
  });
  root.querySelector('[data-print-record]').onclick=()=>printRecord(id,root);
  if(utilization){
   showJournalReference(root,r);
   if(d.notes){const details=document.createElement('details');details.className='worksheet-details';
    details.innerHTML='<summary>Report notes</summary><p>'+esc(d.notes)+'</p>';root.querySelector('[data-journal-ref]').before(details);}
  }
}

async function printRecord(id,dialog){
 try{
  if(window.localFirst14333?.budgetSave(id)&&!window.localFirst14333.budgetSave(id).confirmed)return window.budgetSaveStatus472.open(id);
  const r=await live(id);
  const d=BudgetReportWording.data(r);
  if(d.mode==='utilization')return await printUtilization(d,r,dialog);
  return await print82('Budget Request',documentWorkspace105.sanitize(d.document14316?.html||financeHtml82(d)),d.date);
 }catch(e){showCenterStatus(e.message,true)}
}
async function remove(id){try{const check=context(),client=ojmDb;if(Work82.reports.some(r=>(r.id===id||r.data.requestId14316===id)&&r._pending14333))throw Error('A save for this report is awaiting confirmation. Open its notification before deleting.');const r=await live(id);const children=Work82.reports.filter(x=>x.data.requestId14316===id);if(!await ui117.confirm('Delete this '+(r.data.mode==='utilization'?'allocation':'request and all linked allocations')+'? The saved document and shared link will also be removed.'))return;check();const out=await client.rpc('delete_budget14316',{p_id:id,p_version:r.version});check();if(out.error)throw Error(out.error.code==='PGRST202'?'Install INSTALL-BUDGET-LIFECYCLE-v143.16.sql before deleting a linked budget record.':out.error.message);const removed=new Set(out.data?.deletedIds||[id,...children.map(x=>x.id)]);Work82.reports=Work82.reports.filter(x=>!removed.has(x.id));if(removed.has(allocationRecord?.id)||removed.has(allocation?.requestId14316)){allocation=null;allocationRecord=null}if(removed.has(Work82.reportRecord?.id)){Work82.reportRecord=null;Work82.report=null}renderHistory();showCenterStatus('Budget transaction deleted.')}catch(e){showCenterStatus(e.message,true)}}
const switchBefore=window.switchTab;window.switchTab=function(id,...args){if(id==='transactions-budget14313')checkedOnVisit=new Set();captureFund();return switchBefore.call(this,id,...args)};
const renderBefore=window.renderWork82;window.renderWork82=function(...args){const out=renderBefore.apply(this,args);if(document.querySelector('#user-entry-review.active'))renderFinalization();if(document.querySelector('#transactions-all.active'))renderHistory();return out};
const deleteBefore=window.deleteWork108;window.deleteWork108=function(kind,id){return kind==='reports'&&Work82.reports.find(r=>r.id===id)?.data.kind==='finance'?remove(id):deleteBefore(kind,id)};
const openBefore=window.openOperational82;window.openOperational82=function(id){const r=Work82.reports.find(r=>r.id===id);return r?.data.kind==='finance'?(r.data.mode==='utilization'?openAllocation(id):openRequest(id)):openBefore(id)};
window.budgetWorkflow14316={refreshSaveStatus(){if(!busy&&actor===liveProfile?.id&&actorClient===ojmDb&&document.querySelector('#transactions-budget14313.active'))renderRequest();},get finalTab(){return finalTab},get historyTab(){return historyTab},prepareHistory:renderHistory,prepareFinalization:renderFinalization,renderRequest,reviewPayroll,newRequest,editRequest,requestData,refreshCategories,templateApplied,printPicker,requestHTML,showFunds,combineRequests,saveDocument,requireSaved,decorateEditor,openRequest,startAllocation,openAllocation,chooseRequest,linkRequest,importHistory,saveAllocation,previewAllocation,newUnlinked,removeMovement,removeConversion,finalization,history,view,printRecord,remove,parseDocument,recalculate,validDate14317,editMovement,editConversion,openFundingEditor};
window.addEventListener('transactions-reset14316',e=>{if(e.detail.scopes.includes('reports')){confirmedFinals.clear();checkedOnVisit=new Set();selectedParent='';if(requestEditor){requestEditor.root.resolve108(false);requestEditor=null;}allocation=null;allocationRecord=null;clearFundPopup();Work82.reports=[];Work82.report=null;Work82.reportRecord=null;Object.assign(Finance82,{mode:'request',date:today82(),recipient:'',purpose:'',notes:'',lines:[],movements:[],conversions:[]});renderHistory()}});
function checkPopupAccess(){
 if(requestEditor&&(liveProfile?.id!==actor||ojmDb!==actorClient||liveProfile?.role!=='admin'||!access113.can('transactions-budget14313')||!document.getElementById('loginGate')?.classList.contains('is-authenticated'))){requestEditor.root.resolve108(false);requestEditor=null;}

 if(fundPopup&&(liveProfile?.id!==actor||actorClient!==ojmDb||liveProfile?.role!=='admin'||!access113.can('transactions-budget14313')||!document.getElementById('loginGate')?.classList.contains('is-authenticated'))){
  clearFundPopup();allocation=null;allocationRecord=null;allocationRequest14370++;
 }
}
const loginGate=document.getElementById('loginGate');if(loginGate)new MutationObserver(checkPopupAccess).observe(loginGate,{attributes:true,attributeFilter:['class']});
window.addEventListener('page113',()=>{checkPopupAccess();if(window.workspaceViews14364?.reuseView(document.querySelector('.tab-content.active')?.id)){decorateEditor();return}if(document.querySelector('#user-entry-review.active')&&liveProfile?.role==='admin'){renderFinalization();if(finalTab==='submitted'&&!window.startup14257?.isPrepared('payroll'))void loadWork82().then(()=>{if(document.querySelector('#user-entry-review.active'))renderFinalization()}).catch(e=>showCenterStatus(e.message,true))}if(document.querySelector('#transactions-all.active')){renderHistory();if(!window.startup14257?.isPrepared('payroll'))void loadWork82().then(()=>{if(document.querySelector('#transactions-all.active'))renderHistory()}).catch(e=>showCenterStatus(e.message,true))}decorateEditor()});
})();
