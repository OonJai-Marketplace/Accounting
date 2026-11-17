/* Requests and received-fund finalization share the operational-report lifecycle. */
(()=>{'use strict';
function validDate14317(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value}
const esc=v=>escapeHtml(String(v??'')),clone=x=>structuredClone(x),num=x=>Number(x)||0;
let finalTab='submitted',historyTab='journal',allocation=null,allocationRecord=null,fundPopup=null,retainedForm=null,actor='',busy=false,editMove=null,editFx=null,actorClient=null,allocationRequest14370=0;
const report=BudgetReport290,journal=BudgetUtilizationJournal;
let activityPopup=null;
let selectedParent='',requestEditor=null;
const requests=()=>Work82.reports.filter(r=>r.data.kind==='finance'&&r.data.mode!=='utilization'&&!r.data.requestId14316);
function guard(){if(!liveProfile?.id||liveProfile.role!=='admin'||!access113.can('transactions-budget14313'))throw Error('Administrator access is required.');if(actor!==liveProfile.id||actorClient!==ojmDb){if(requestEditor){requestEditor.root.resolve108(false);requestEditor=null;}selectedParent='';actor=liveProfile.id;actorClient=ojmDb;allocation=null;allocationRecord=null;clearFundPopup();editMove=null;editFx=null;allocationRequest14370++}return actor}
function context(){const owner=guard(),client=ojmDb;return()=>{if(owner!==liveProfile?.id||client!==ojmDb)throw Error('Your sign-in changed. Reopen the budget record.');guard();}}
const button=(label,fn)=>`<button type="button" onclick="${esc('budgetWorkflow14316.'+fn)}">${label}</button>`;
function captureFund(){
 const form=fundPopup?.querySelector('#fundHeader290');
 if(form&&allocation&&form.dataset.parent===(allocation.requestId14316||'')&&form.dataset.record===(allocationRecord?.id||''))Object.assign(allocation,Object.fromEntries(new FormData(form)));return allocation;
}
function clearFundPopup(){
 closeActivity();retainedForm=null;const root=fundPopup;fundPopup=null;root?.resolve108(false);
}
function newUtilization(){
 const today=today82();
 return {kind:'finance',mode:'utilization',status:'draft',budgetMonth290:today.slice(0,7),
  date:today,purpose:'',recipient:'',lines:[],movements:[],conversions:[],notes:''};
}
function showFunds(open=true){
 guard();if(busy)return;
 if(!open){fundPopup?.resolve108(false);return;}
 if(selectedParent&&selectedParent!==allocation?.requestId14316)return startAllocation(selectedParent);
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
 const previous=retainedForm;retainedForm=null;
 const {root,pending}=budgetDialog(report.title,'<div id="budgetFunds290"></div>');
 root.classList.add('fund-popup326');fundPopup=root;
 if(previous?.allocation===allocation){
  root.querySelector('#budgetFunds290').replaceWith(previous.host);
  pinReportToolbar(root,previous.toolbar);
  showJournalReference(previous.host,allocationRecord);
 }else renderAllocation();
 pending.then(()=>{
  if(fundPopup!==root)return;
  retainedForm=allocation?{allocation,host:root.querySelector('#budgetFunds290'),toolbar:root.querySelector('.fund-report-toolbar')}:null;
  fundPopup=null;
 });
}
function requestData(){return requestEditor?.data||null}
function refreshCategories(){
 const list=requestEditor?.root.querySelector('#budgetCategories14321');
 if(list)list.innerHTML=budget14313.categoryOptions(requestEditor.data.lines).map(([v])=>'<option value="'+esc(v)+'"></option>').join('');
 const names=requestEditor?.root.querySelector('[data-categories]');
 if(names)names.textContent=(budget14313.config().categories||[]).join(' · ');
}
function totals327(d){
 const sums=new Map();
 for(const line of d.lines||[])sums.set(line.currency,(sums.get(line.currency)||0)+Math.round(Number(line.amount)*100));
 return [...sums].map(([code,cents])=>code+' '+formatAppNumber(cents/100)).join(' + ')||'—';
}
function renderRequest(notice=''){
 guard();
 const rows=Work82.reports.filter(r=>r.data?.kind==='finance');
 const requestRows=rows.filter(r=>r.data.mode!=='utilization').map(r=>[esc(report.period(r.data)),esc(r.data.recipient),esc(r.data.purpose),esc(totals327(r.data)),button('Open request',`editRequest(${JSON.stringify(r.id)})`)+button('Fund utilization',`startAllocation(${JSON.stringify(r.id)})`)]);
 const utilization=rows.filter(r=>r.data.mode==='utilization').map(r=>[esc(report.period(r.data)),esc(r.data.purpose),esc(r.data.status||'Draft'),esc([...report.balances({...r.data,lines:r.data.lines||[]})].map(([c,t])=>c+' '+formatAppNumber(t.remaining)).join(' + ')||'—'),button(r.data.status==='finalized'?'View report':'Continue',`openAllocation(${JSON.stringify(r.id)})`)]);
 const content=section82('Saved budget requests',table82(['Budget month','Recipient','Purpose','Requested',''],requestRows))+section82('Fund utilization reports',table82(['Budget month','Purpose','Status','Cash remaining',''],utilization));
 mount82('transactions-budget14313','Budget Requests','',notice+content+historyImportButton(),button('Fund utilization','showFunds()')+button('New Report','newRequest()')+button('Print / PDF','printPicker()')+(access113.can('transactions-all')?'<button type="button" data-book-history="budget">History</button>':''));
}
function printPicker(){
 guard();const rows=Work82.reports.filter(r=>r.data.kind==='finance');
 const {root}=budgetDialog('Print / PDF',rows.length?table82(['Month','Report','Purpose',''],rows.map(r=>[esc(report.period(r.data)),r.data.mode==='utilization'?'Fund utilization':'Budget request',esc(r.data.purpose),'<button type="button" data-print-record="'+esc(r.id)+'">Print / PDF</button>'])):'<p>Save a budget request or utilization report to print it here.</p>');
 root.querySelectorAll('[data-print-record]').forEach(b=>b.onclick=()=>{root.resolve108(false);void printRecord(b.dataset.printRecord)});
}
function newRequest(){
 guard();selectedParent='';openRequestForm({mode:'request',budgetMonth290:today82().slice(0,7),date:today82(),recipient:'',purpose:'',notes:'',lines:[],movements:[],conversions:[]},null);
}
async function editRequest(id){
 try{const check=context(),record=await editableRecord(id);check();if(record.data.mode==='utilization')return openAllocation(id);selectedParent=id;openRequestForm(clone(record.data),record)}catch(e){showCenterStatus(e.message,true)}
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
 if(row?.data?.kind==='finance'&&(row._pending14333||window.offline14239?.offline())){check();return row;}
 return live(id);
}
async function live(id,version){const check=context(),client=ojmDb,r=await client.from('operational_reports').select('*').eq('id',id).single();check();if(r.error||!r.data||r.data.data.kind!=='finance')throw Error('This transaction was deleted, reset or is unavailable. Open a current record from History.');if(version!==undefined&&r.data.version!==version)throw Error('This transaction changed elsewhere. Reopen its current saved version.');return r.data}
async function saveDocument(model){
 if(busy)throw Error('A budget save is already in progress.');
 busy=true;try{return await persistDocument(model)}finally{busy=false}
}
async function persistDocument(model){
 const check=context(),parsed=parseDocument(model),meta=model.budget14316;
 guard();const id=meta.id||meta.draftId14317;
 if(!id)throw Error('Keep the budget device draft before saving.');
 const record=Work82.reports.find(row=>row.id===id);
 if(record&&(record.data.kind!=='finance'||record.data.mode!=='request'))throw Error('Open the original budget request.');
 const document={html:parsed.html,title:model.title,settings:clone(model.settings)};
 const payload={...parsed.data,document14316:document};
 let saved=record;
 if(!record||localFirst14333.canonical(record.data)!==localFirst14333.canonical(payload)){
  if(meta.id&&record&&meta.version!==record.version)throw Error('This request changed. Reopen its current saved version.');
  if(Work82.reports.some(row=>row.data.requestId14316===id))throw Error('This request has fund allocations. Start a new request for changes.');
  const base=meta.id?{id,version:meta.version}:null;
  saved=await localFirst14333.saveWork('reports',payload,base,{data:payload,version:base?base.version+1:1},{createId:id});
 }
 check();Work82.reportRecord=saved;Work82.report=clone(saved.data);Object.assign(Finance82,clone(saved.data));
 showCenterStatus(saved._pending14333?'Budget request saved on this device. It will sync automatically.':'Budget request saved to company records.');
 return {id:saved.id,version:saved.version,data:clone(parsed.data),_pending14333:!!saved._pending14333};
}
async function requireSaved(){const model=documentWorkspace105.model,meta=model?.budget14316;guard();if(!meta?.id)throw Error('Save the budget request before sending Email or using WhatsApp.');const r=await live(meta.id,meta.version),doc=r.data.document14316;if(!doc||model.html!==doc.html||model.title!==doc.title||JSON.stringify(model.settings)!==JSON.stringify(doc.settings))throw Error('The document has changed. Save it before sharing.');return r}
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
async function openRequest(id){try{guard();const r=await editableRecord(id);if(r.data.mode==='utilization')return view(id);await openDocumentEditor105({...(r.data.document14316||{title:'Budget Request',html:requestHTML(r.data)}),source:'transactions-budget14313',category:'Reports',budget14316:{id:r.id,version:r.version,data:clone(r.data)}})}catch(e){showCenterStatus(e.message,true)}}
async function startAllocation(id){try{const check=context();if(allocation?.requestId14316===id){selectedParent=id;if(!fundPopup?.isConnected)presentFundEditor();return;}if(busy)throw Error('Wait for the budget save to finish.');const request=++allocationRequest14370;if(allocation&&!await ui117.confirm('Replace the open fund allocation? Save your changes first.'))return;check();if(request!==allocationRequest14370)return;const r=await live(id);check();if(request!==allocationRequest14370)return;if(r.data.mode==='utilization')throw Error('Choose an original budget request.');
 const saved=await ojmDb.from('operational_reports').select('*').eq('data->>requestId14316',id).eq('data->>status','draft').order('updated_at',{ascending:false}).limit(1);check();if(request!==allocationRequest14370)return;if(saved.error)throw saved.error;
 if(saved.data?.[0]){const draft=saved.data[0];if(draft.data.requestId14316!==id||draft.data.requestVersion14316!==r.version)throw Error('Reopen the current saved request before continuing.');selectedParent=id;allocation=clone(draft.data);allocation.requestDate290||=r.data.date;allocation.budgetMonth290||=r.data.budgetMonth290||String(r.data.date).slice(0,7);allocation.conversions||=[];allocationRecord=draft;presentFundEditor();return;}
 selectedParent=id;allocation={...clone(r.data),mode:'utilization',requestDate290:r.data.date,budgetMonth290:r.data.budgetMonth290||String(r.data.date).slice(0,7),requestId14316:r.id,requestVersion14316:r.version,status:'draft',date:today82(),movements:[],conversions:[]};delete allocation.document14316;allocationRecord=null;presentFundEditor()}catch(e){showCenterStatus(e.message,true)}}
async function openAllocation(id){try{const check=context();if(busy)throw Error('Wait for the budget save to finish.');const request=++allocationRequest14370;if(allocation&&!await ui117.confirm('Replace the open allocation? Save your changes first.'))return;check();if(request!==allocationRequest14370)return;const r=await editableRecord(id);check();if(request!==allocationRequest14370)return;if(r.data.status==='finalized'||r.data.mode!=='utilization')return view(id);const parent=r.data.requestId14316?await editableRecord(r.data.requestId14316):null;if(parent&&parent.version!==r.data.requestVersion14316)throw Error('The original budget changed. Reopen its current version.');check();if(request!==allocationRequest14370)return;selectedParent=r.data.requestId14316||'';allocation=clone(r.data);allocation.requestDate290||=parent?.data.date||r.data.date;allocation.budgetMonth290||=parent?.data.budgetMonth290||String(allocation.requestDate290).slice(0,7);allocation.conversions||=[];allocationRecord=r;presentFundEditor()}catch(e){showCenterStatus(e.message,true)}}
function renderAllocation(){
 const host=fundPopup?.querySelector('#budgetFunds290');if(!host||!allocation)return;
 const d=allocation;
 const actions=button('Open reports','chooseRequest()')+button('Print / PDF','previewAllocation()')+
  button('Save draft','saveAllocation(false)')+button('Finalize','saveAllocation(true)')+postControl(allocationRecord);
 const activities='<button type="button" data-add-spending>Add row</button><button type="button" data-activity="spend">Spending details</button>'+
  '<button type="button" data-activity="receipt">Amount received</button><button type="button" data-activity="conversion">Currency conversion</button><button type="button" data-activity="other">Other fund movements</button>';
 const toolbar=reportToolbar(fundPopup,actions,activities);
 toolbar.querySelector('[onclick*="chooseRequest"]').title='Browse budget requests and saved utilization reports';
 toolbar.querySelector('[onclick*="saveAllocation(true)"]').title='Save as read-only in History';
 const save=toolbar.querySelector('[onclick*="saveAllocation(false)"]');
 save.title='Save an editable draft';save.classList.add('fund-save-draft');
 const table='<div class="data-table82"><table class="spending-worksheet"><thead><tr><th>Item / category</th><th>Requested</th><th>Status</th><th>Funded</th><th>Actual spending</th><th aria-label="Actions"></th></tr></thead><tbody data-spending-rows></tbody></table></div>';
 const rowHeader=d.requestId14316?[report.period(d),d.recipient].filter(Boolean).map(esc).join(' · '):'';
 const header='<form id="fundHeader290" data-parent="'+esc(d.requestId14316||'')+'" data-record="'+esc(allocationRecord?.id||'')+'"><div class="fund-report-fields">'+
  field82('Report date','date',d.date,'date','required')+field82('Reference','receiptReference290',d.receiptReference290||'')+
  field82('Recipient','recipient',d.recipient,'text','required')+field82('Purpose','purpose',d.purpose,'text','required')+
  (d.requestId14316?'':field82('Budget month','budgetMonth290',d.budgetMonth290||String(d.date).slice(0,7),'month','required'))+
  field82('Notes','notes',d.notes)+'</div></form>';
 host.innerHTML='<header class="worksheet-header"><h3>'+esc(d.purpose||'Unlinked utilization report')+'</h3><span>'+rowHeader+'</span></header>'+
  '<div data-journal-ref aria-live="polite"></div>'+section82('Budget and actual spending',table)+
  '<details class="worksheet-details" '+(d.requestId14316?'':'open')+'><summary>Report details</summary>'+header+'</details>'+
  '<details class="worksheet-details" data-summary><summary>Funding and spending summary <span data-budget-balance></span></summary><div></div></details>'+
  (!allocationRecord&&access113.can('journal','post')?'<small>Save a draft to open its summary in Post Transaction.</small>':'');
 showJournalReference(host,allocationRecord);
 host.querySelector('#fundHeader290').oninput=captureFund;
 function refreshWorksheet(){
  host.querySelector('[data-spending-rows]').replaceChildren();
  host.applySpending=BudgetSpendingWorksheet.mount(fundPopup,d,editMovement);
 }
 refreshWorksheet();
 toolbar.querySelectorAll('[data-activity]').forEach(b=>b.onclick=()=>openActivity(b.dataset.activity));
 const summary=host.querySelector('[data-summary]'),balance=summary.querySelector('[data-budget-balance]');
 function showBalance(){
  const {currencies,totals}=report.compare(d);
  balance.textContent=currencies.length?' · Remaining '+currencies.map(c=>currencySymbolV6(c)+' '+report.amountText(totals[c].remaining)).join(' / '):'';
 }
 showBalance();
 host.oninput=()=>{summary.open=false;balance.textContent='';};
 summary.ontoggle=()=>{if(summary.open){try{captureFund();host.applySpending();refreshWorksheet();showBalance();summary.lastElementChild.innerHTML=report.summary(d)}catch(err){summary.open=false;showCenterStatus(err.message,true)}}};
}
function applySpending(){
 guard();captureFund();
 fundPopup?.querySelector('#budgetFunds290')?.applySpending?.();
}
function closeActivity(){
 if(fundPopup)fundPopup.querySelector('.ui-dialog108').inert=false;
 if(activityPopup){activityPopup.resolve108(false);activityPopup=null;}
}
function openActivity(group,index=null){
 try{
  if(busy||!fundPopup?.isConnected)return;
  applySpending();closeActivity();renderAllocation();
  const d=allocation,cs=budget14313.currencyOptions(d.lines),loans=d.movements.filter(m=>report.kind(m)==='borrow');
  const isFx=group==='conversion',types=Object.entries(report.labels).filter(([k])=>group==='other'?!['receipt','spend'].includes(k):k===group);
  const type=isFx?'':index!==null?report.kind(d.movements[index]):types[0][0];
  const options=rows=>rows.map(([v,name])=>`<option value="${esc(v)}">${esc(name)}</option>`).join('');
  const amountInput=(label,name)=>field82(label,name,'','number','min="0.01" step="0.01" required');
  const actions=(kind,i)=>button('Edit',`edit${kind}(${i})`)+button('Delete',`remove${kind}(${i})`);
  const title={receipt:'Amount received',conversion:'Currency conversion',spend:'Spending details',other:'Other fund movements'}[group];
 const movement=`<form id="financeMove82" class="finance-controls117">${types.length>1?select82('Activity','type290',type,types):'<input type="hidden" name="type290" value="'+esc(type)+'">'}${field82('Date','date290',d.date,'date','required')}
  <label data-loan-field hidden>Advance to repay<select name="loanId290"><option value="">Choose an advance</option>${options(loans.map(l=>[l.id290,l.account+' · '+l.reference+' · '+l.currency+' '+formatAppNumber(report.outstanding(d,l))+' outstanding']))}</select>${loans.length?'':'<small>Record the original advance with its borrowing date first.</small>'}</label>
  <label><span data-source-label>Funding from</span><input name="account" required></label><label><span data-dest-label>Received into</span><input name="destination290"></label>
  <label data-item-field hidden>Budget item<select name="budgetKey117"><option value="">Unassigned</option>${options(d.lines.map((l,i)=>[l.key117||'worksheet:'+i,l.category+' · '+l.description+' · '+l.currency]))}</select></label>
  ${select82('Currency','currency',d.lines[0]?.currency||'LAK',cs)}${amountInput('Amount','amount')}
  <label data-cash-field hidden>Cash distributed if different<input name="cashDistributed" type="number" min="0" step="0.01"></label>
  <label data-equivalent-field hidden><span></span><input name="equivalent" type="number" min="0.01" step="0.01"></label>
  ${field82('Description / use of money','description290','','text')}${field82('Reference','reference','','text','required')}<button type="submit">Add movement</button><button type="button" data-cancel hidden>Cancel edit</button></form>`;
 const fx=`<form id="financeFx117" class="finance-controls117">${field82('Date','date',d.date,'date','required')}${field82('From account','source','','text','required')}${select82('From currency','currency','USD',cs)}${amountInput('Amount exchanged','amount')}
  ${field82('Received into','destination290','','text','required')}${select82('To currency','target','LAK',cs)}${amountInput('Amount received','targetAmount290')}${field82('Evidence / reference','evidence','','text','required')}<output aria-live="polite"></output><button type="submit">Add conversion</button><button type="button" data-cancel hidden>Cancel edit</button></form>`;
 const fxTable=table82(['Date','From account','Amount exchanged','Received into','Amount received','Rate','Reference','Action'],d.conversions.map((f,i)=>[esc(formatAppDate(f.date)),esc(f.source),esc(f.currency+' '+formatAppNumber(f.amount)),esc(f.destination290||'—'),esc(f.target+' '+formatAppNumber(report.conversionAmount(f))),esc(formatAppRate(f.rate)),esc(f.evidence||f.reference),actions('Conversion',i)]));
 const movementRows=report.movementRows(d).flatMap((row,i)=>types.some(([k])=>k===report.kind(d.movements[i]))?[[...row,actions('Movement',i)]]:[]);
 const {root,pending}=budgetDialog(title,isFx?fx+fxTable:movement+table82([...report.movementHeaders,'Action'],movementRows));
 activityPopup=root;root.classList.add('fund-activity');fundPopup.querySelector('.ui-dialog108').inert=true;
 pending.then(()=>{if(activityPopup===root){activityPopup=null;if(fundPopup){fundPopup.querySelector('.ui-dialog108').inert=false;fundPopup.querySelector('[data-activity="'+group+'"]')?.focus()}}});
 const f=root.querySelector('form');
 if(isFx){
  editFx=index;const prior=d.conversions[index];
  if(prior)for(const [k,v] of Object.entries({...prior,targetAmount290:report.conversionAmount(prior),evidence:prior.evidence||prior.reference||''}))if(f.elements[k])f.elements[k].value=v;
  f.oninput=f.onchange=()=>{const a=movementAmount(f.elements.amount),b=movementAmount(f.elements.targetAmount290);f.querySelector('output').textContent=a>0&&b>0?'Rate: '+formatAppRate(b/a)+' '+f.elements.target.value+' / '+f.elements.currency.value:'';f.elements.targetAmount290.dataset.currency=f.elements.target.value;window.financialNumbers14231?.scan(f)};
  f.oninput();f.onsubmit=e=>{e.preventDefault();saveConversion(f)};
 }else{
  editMove=index;const prior=d.movements[index];
  if(prior)for(const [k,v] of Object.entries({...prior,type290:report.kind(prior),date290:prior.date290||d.date,amount:prior.inflow||prior.outflow,equivalent:prior.loanAmount290||prior.budgetAmount290||''}))if(f.elements[k])f.elements[k].value=v;
  if(prior?.worksheetLine!=null&&!prior.budgetKey117)f.elements.budgetKey117.value='worksheet:'+prior.worksheetLine;
  if(prior?.worksheetSpend){f.elements.account.required=false;f.elements.reference.required=false;}
  f.onchange=()=>movementFields(f);movementFields(f);
  f.onsubmit=e=>{e.preventDefault();saveMovement(f)};
 }
 f.querySelector('[type=submit]').textContent=index!==null?'Update':isFx?'Add conversion':group==='receipt'?'Add receipt':group==='spend'?'Add spending':'Add movement';
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
 const labels={receipt:['Funding from','Received into'],borrow:['Lender / company fund','Received into'],repay:['Paid from','Repaid to'],spend:['Paid from','Paid to / destination'],refund:['Returned from','Returned to'],transfer:['Transferred from','Transferred to']};
 f.querySelector('[data-source-label]').textContent=labels[type][0];f.querySelector('[data-dest-label]').textContent=labels[type][1];
 f.elements.destination290.required=transfer;
 const target=repay?loan:spend?item:null,cross=target&&target.currency!==f.elements.currency.value;
 const field=f.querySelector('[data-equivalent-field]');field.hidden=!cross;f.elements.equivalent.required=!!cross&&repay;
 if(cross){field.querySelector('span').textContent=repay?'Debt settled in '+target.currency:'Budget equivalent in '+target.currency+' (optional)';}
}
function editMovement(i){
 const m=allocation?.movements[i];if(!m)return;
 const type=report.kind(m);openActivity(['receipt','spend'].includes(type)?type:'other',i);
}
function saveMovement(f){
 try{guard();if(!activityPopup?.contains(f)||!f.reportValidity())return;captureFund();
  const fields=Object.fromEntries(new FormData(f)),type=fields.type290,amount=movementAmount(f.elements.amount),incoming=type==='receipt'||type==='borrow';
  const prior=editMove===null?null:allocation.movements[editMove];
  const next={id290:prior?.id290||crypto.randomUUID(),type290:type,date290:fields.date290,account:fields.account.trim(),destination290:fields.destination290.trim(),reference:fields.reference.trim(),description290:fields.description290.trim(),currency:fields.currency,budgetKey117:type==='spend'?fields.budgetKey117:'',inflow:incoming?amount:0,outflow:incoming?0:amount};
  if(type==='spend'&&fields.cashDistributed!=='')next.cashDistributed=movementAmount(f.elements.cashDistributed);
  if(prior?.worksheetSpend&&type==='spend')next.worksheetSpend=true;
  if(type==='spend'&&next.budgetKey117.startsWith('worksheet:')&&!allocation.lines.some(l=>l.key117===next.budgetKey117)){
   next.worksheetLine=allocation.lines.findIndex((l,i)=>!l.key117&&'worksheet:'+i===next.budgetKey117);
   next.budgetKey117='';
  }
  if(type==='repay'){next.loanId290=fields.loanId290;const loan=allocation.movements.find(m=>m.id290===next.loanId290);next.loanAmount290=loan?.currency===next.currency?amount:movementAmount(f.elements.equivalent);}
  if(type==='spend'&&!f.querySelector('[data-equivalent-field]').hidden&&fields.equivalent)next.budgetAmount290=movementAmount(f.elements.equivalent);
  const rows=[...allocation.movements];if(prior)rows[editMove]=next;else rows.push(next);
  validateAllocation({...allocation,movements:rows},false);allocation.movements=rows;closeActivity();renderAllocation();
 }catch(e){showCenterStatus(e.message,true)}
}
async function removeMovement(i){
 try{const check=context(),rows=allocation.movements,m=rows[i];if(!m)return;
  if(m.id290&&rows.some(r=>r.loanId290===m.id290))throw Error('Remove or reassign repayments before deleting their advance.');
  if(!await ui117.confirm('Delete this movement?'))return;check();if(rows!==allocation.movements||rows[i]!==m)return;captureFund();rows.splice(i,1);closeActivity();renderAllocation();
 }catch(e){showCenterStatus(e.message,true)}
}
function editConversion(i){if(allocation?.conversions[i])openActivity('conversion',i);}
function saveConversion(f){
 try{guard();if(!activityPopup?.contains(f)||!f.reportValidity())return;captureFund();
  const fields=Object.fromEntries(new FormData(f)),amount=movementAmount(f.elements.amount),target=movementAmount(f.elements.targetAmount290);
  const next={...fields,amount,targetAmount290:target,rate:target/amount,source:fields.source.trim(),destination290:fields.destination290.trim(),evidence:fields.evidence.trim()};
  const rows=[...allocation.conversions];if(editFx===null)rows.push(next);else rows[editFx]=next;
  validateAllocation({...allocation,conversions:rows},false);allocation.conversions=rows;closeActivity();renderAllocation();
 }catch(e){showCenterStatus(e.message,true)}
}
function postControl(record){
 return record&&access113.can('journal','post')?'<button type="button" data-prepare-budget>Open in Post Transaction</button>':'';
}
function editorData(d){
 return JSON.stringify([d.date,d.budgetMonth290,d.receiptReference290||'',d.recipient||'',d.purpose||'',d.notes||'',d.movements||[],d.conversions||[],d.lines.map((l,i)=>report.lineFunding(d,l,i))]);
}
function showJournalReference(host,record){
 const field=host.querySelector('[data-journal-ref]'),post=field.closest('[role=dialog]').querySelector('[data-prepare-budget]');
 if(!record)return;
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
  saved();journal.open(current);
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
 const content=document.createElement('div');content.innerHTML=report.report(d,reference);content.querySelector('h1')?.remove();
 if(await print82(report.title,content.innerHTML,'')){
  if(dialog?.isConnected)dialog.resolve108(false);
  if(origin&&origin===fundPopup)origin.resolve108(false);
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
   const existing=await client.from('operational_reports').select('*').eq('data->>kind','finance').in('data->>budgetMonth290',months);
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
function chooseRequest(offerNewRequest=false){
 guard();if(busy)return;
 const saved=Work82.reports.filter(r=>r.data.kind==='finance'&&r.data.mode==='utilization');
 const entries=requests().map(r=>[esc(report.period(r.data)),esc(r.data.purpose),button('Use request',`startAllocation(${JSON.stringify(r.id)})`)]);
 const reports=saved.map(r=>[esc(report.period(r.data)),esc(r.data.purpose),esc(r.data.status||'Draft'),button(r.data.status==='finalized'?'View':'Continue',`openAllocation(${JSON.stringify(r.id)})`)]);
 const {root}=budgetDialog('Requests and saved reports',

  section82('Budget requests',table82(['Month','Purpose','Action'],entries))+
  section82('Utilization reports',table82(['Month','Purpose','Status','Action'],reports))+
  (offerNewRequest?button('New Report','newRequest()'):button('New unlinked utilization report','newUnlinked()'))+historyImportButton());
 root.querySelector('.ui-body108').addEventListener('click',e=>{if(e.target.closest('button[onclick^="budgetWorkflow14316."]'))root.resolve108(false)},true);
}
async function newUnlinked(){
 const check=context();if(busy||!await ui117.confirm('Start a new utilization report? Save any changes you want to keep first.'))return;
 check();selectedParent='';allocationRequest14370++;allocationRecord=null;allocation=newUtilization();presentFundEditor();
}
async function removeConversion(i){try{const check=context();captureFund();const rows=allocation.conversions,item=rows[i];if(!item)return;if(await ui117.confirm('Delete this conversion?')){check();if(allocation.conversions!==rows)return;const index=rows.indexOf(item);if(index<0)return;rows.splice(index,1);closeActivity();renderAllocation()}}catch(e){showCenterStatus(e.message,true)}}
function validateAllocation(d,finalize){
 if(!validDate14317(d.date))throw Error('Enter a valid report date.');
 const currencies=new Set(CurrencyStore.currencies.map(c=>c.code));
 const positive=n=>Number.isFinite(Number(n))&&Number(n)>0&&Number.isSafeInteger(Math.round(Number(n)*100));
 if(!d.movements.length&&!d.conversions.length&&!(d.lines.length&&d.fundingByItem))throw Error('Record a funding decision, receipt, movement or conversion first.');
 const loans=new Map(d.movements.filter(m=>report.kind(m)==='borrow').map(m=>[m.id290,m]));
 for(const m of d.movements){
  const type=report.kind(m),incoming=type==='receipt'||type==='borrow';
  if(!Object.hasOwn(report.labels,type)||!currencies.has(m.currency)||(!(type==='spend'&&m.worksheetSpend)&&(!m.account||!m.reference))||m.date290&&!validDate14317(m.date290)||!positive(incoming?m.inflow:m.outflow)||Number((incoming?m.outflow:m.inflow)||0)!==0)throw Error('Each movement needs a source, reference, configured currency and one positive amount.');
  if(m.cashDistributed!=null&&(type!=='spend'||!Number.isFinite(m.cashDistributed)||m.cashDistributed<0||!Number.isSafeInteger(Math.round(m.cashDistributed*100))||Math.abs(m.cashDistributed*100-Math.round(m.cashDistributed*100))>0.00001))throw Error('Enter a nonnegative cash distribution with up to two decimal places.');
  if(type==='transfer'&&(!m.destination290||m.destination290===m.account))throw Error('Choose different source and destination accounts for a transfer.');
  const line=d.lines.find(l=>l.key117===m.budgetKey117);
  if(m.budgetKey117&&!line)throw Error('Select a budget item from this request.');
  if(m.budgetAmount290!=null&&!positive(m.budgetAmount290))throw Error('Enter a positive budget equivalent, or leave it blank.');
  if(type==='borrow'&&(!m.id290||report.outstanding(d,m)<0))throw Error('Repayments exceed the amount borrowed. Review the linked advance.');
  if(type==='repay'&&(!loans.has(m.loanId290)||!positive(m.loanAmount290)||m.date290<loans.get(m.loanId290).date290))throw Error('Choose an advance, its settlement amount, and a repayment date on or after the advance.');
 }
 for(const f of d.conversions)if(!currencies.has(f.currency)||!currencies.has(f.target)||f.currency===f.target||!validDate14317(f.date)||!f.source||!(f.evidence||f.reference)||!positive(f.amount)||!Number.isFinite(Number(f.rate))||Number(f.rate)<=0||!positive(report.conversionAmount(f)))throw Error('Enter both currencies, amounts, date, source and evidence for the exchange.');
 const totals=[...report.balances(d).values()];
 if(totals.some(t=>Object.values(t).some(n=>!Number.isFinite(n)||!Number.isSafeInteger(Math.round(n*100)))))throw Error('Funding totals exceed the supported amount range.');
 if(finalize&&totals.some(t=>t.remaining<0))throw Error('Review the receipts and conversions before finalizing a negative cash balance.');
}
async function ensureLifecycle(){const check=context(),r=await ojmDb.rpc('budget_capabilities14316');if(r.error||r.data?.version!==14316)throw Error('Install INSTALL-BUDGET-LIFECYCLE-v143.16.sql in Supabase before saving fund allocations. Your draft is kept.');check()}
async function saveAllocation(finalize){const check=context(),record=allocationRecord,selection=allocationRequest14370,controls=[];if(busy)return;busy=true;try{if(!headerValid())return;applySpending();const d=clone(allocation);validateAllocation(d,finalize);for(const node of fundPopup?.querySelectorAll('input,select,textarea,button:not([data-dismiss])')||[]){controls.push([node,node.disabled]);node.disabled=true}if(finalize&&!await ui117.confirm('Finalize the received funding and allocations? This saved version becomes read-only in History.'))return;check();if(finalize){await ensureLifecycle();check();if(d.requestId14316)await live(d.requestId14316,d.requestVersion14316);check();if(record)await live(record.id,record.version);check();}if(selection!==allocationRequest14370)return;delete d.document14316;d.kind='finance';d.mode='utilization';d.status=finalize?'finalized':'draft';d.preparedBy=liveProfile.full_name||liveProfile.email;d.preparedRole290=liveProfile.job_title||livePermission?.job_title||'Prepared by';d.finalizedAt14316=finalize?new Date().toISOString():null;const r=await saveWork82('reports',d,record);check();if(finalize&&r._pending14333)throw Error('Finalization is waiting for database confirmation. Review the saved request in Data Check.');if(selection!==allocationRequest14370)return;Work82.reports=[r,...Work82.reports.filter(old=>old.id!==r.id)];allocationRecord=r;allocation=clone(r.data);if(finalize){allocation=null;allocationRecord=null;clearFundPopup()}else{retainedForm=null;renderAllocation();}if(document.querySelector('#transactions-budget14313.active'))renderRequest();showCenterStatus(r._pending14333?'Fund allocation: Saved on this device; waiting for automatic sync.':finalize?'Fund allocation finalized.':'Fund allocation saved.')}catch(e){showCenterStatus(e.message,true)}finally{for(const [node,disabled]of controls)node.disabled=disabled;busy=false}}
function budgetDialog(title,html,save=false){const pending=ui108.modal(title,html,save?[{label:'Cancel',value:false},{label:'Save',value:true,primary:true}]:[{label:'Close',value:false}]);const root=document.querySelector('.ui-overlay108:last-child');root.querySelector('.ui-dialog108').classList.add('budget-dialog14313');return {pending,root}}
function renderFinalization(){if(liveProfile?.role!=='admin')return;if(finalTab==='funds')finalTab='submitted';const panel=document.getElementById('user-entry-review');if(!panel)return;let bar=panel.querySelector('#finalizationSwitch14316');if(!bar){bar=document.createElement('div');bar.id='finalizationSwitch14316';bar.className='workflow-switch14316';bar.innerHTML=button('Submitted Entries',"finalization('submitted')")+button('Reconciliation',"finalization('reconciliation')");panel.prepend(bar)}let fund=panel.querySelector('#fundAllocation14316');if(!fund){fund=document.createElement('section');fund.id='fundAllocation14316';panel.append(fund)}window.workspace14337?.mountReconciliation(panel);for(const child of panel.children)if(!child.matches('#finalizationSwitch14316,#fundAllocation14316,#reconciliationWork14337,.area-banner113,.module-header,#categoryTabShell'))child.hidden=finalTab!=='submitted';const rec=panel.querySelector('#reconciliationWork14337');if(rec)rec.hidden=finalTab!=='reconciliation';fund.hidden=finalTab!=='funds';bar.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(['submitted','reconciliation'][i]===finalTab)));panel.querySelectorAll('[onclick*=toggleSubmissionHistory]').forEach(b=>b.remove());if(bar.children[1])bar.children[1].hidden=!access113.can('report-reconciliation');if(finalTab==='funds')fund.innerHTML=button('Open budget utilization','showFunds()');if(finalTab==='reconciliation')void renderReconciliationList71()}
function finalization(tab){if(tab==='reconciliation'&&!access113.can('report-reconciliation'))return showCenterStatus('Reconciliation access is required.',true);if(tab==='funds'&&(liveProfile?.role!=='admin'||!access113.can('transactions-budget14313')))return showCenterStatus('Budget Request access is required for Fund Allocation.',true);if(tab==='funds')tab='submitted';finalTab=tab;window.workspace14337?.closeReconciliationHistory();renderFinalization()}
function renderHistory(){const budgetAllowed=liveProfile?.role==='admin'&&!!access113.can('transactions-budget14313')&&Work82.owner===liveProfile.id;const submissionAllowed=!!access113.can('user-entry-review');if(historyTab==='budget'&&!(liveProfile?.role==='admin'&&access113.can('transactions-budget14313'))||historyTab==='submitted'&&!submissionAllowed)historyTab='journal';const panel=document.getElementById('transactions-all');if(!panel)return;let bar=panel.querySelector('#historySwitch14316');if(!bar){const journal=document.createElement('div');journal.id='journalHistory14316';for(const child of [...panel.children])if(!child.matches('.area-banner113,.module-header,#categoryTabShell'))journal.append(child);panel.append(journal);bar=document.createElement('div');bar.id='historySwitch14316';bar.className='workflow-switch14316';bar.innerHTML=button('Journal',"history('journal')")+button('Submitted Entries',"history('submitted')")+button('Budget Requests',"history('budget')");journal.before(bar);const budget=document.createElement('section');budget.id='budgetHistory14316';panel.append(budget)}bar.querySelectorAll('button').forEach((b,i)=>b.hidden=i===1&&!submissionAllowed||i===2&&!budgetAllowed);const submission=document.getElementById('userEntryHistoryPanel');if(submission&&submission.parentElement!==panel){panel.append(submission);submission.querySelectorAll('[onclick*=toggleSubmissionHistory]').forEach(b=>b.remove())}document.getElementById('journalHistory14316').hidden=historyTab!=='journal';if(submission)submission.hidden=historyTab!=='submitted';const budget=document.getElementById('budgetHistory14316');budget.hidden=historyTab!=='budget';bar.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(['journal','submitted','budget'][i]===historyTab)));const historyRecords=(budgetAllowed?Work82.reports:[]).filter(r=>r.data.kind==='finance');const month=historyMonth14341.choose('budget',historyRecords.map(r=>String(r.data.date).slice(0,7)));if(historyTab!=='budget')return;budget.innerHTML=historyMonth14341.control('budget',month)+historyMonth14341.summary([['Budget Records',historyRecords.filter(r=>String(r.data.date).startsWith(month)).length]])+section82('Budget Request History',table82(['Date','Purpose','Record','Status','Action'],historyRecords.filter(r=>String(r.data.date).startsWith(month)).map(r=>[esc(formatAppDate(r.data.date)),esc(r.data.purpose),r.data.mode==='utilization'?'Fund allocation':'Budget request',esc(r.data.status||'Saved'),button('View',`view(${JSON.stringify(r.id)})`)+(r.data.mode!=='utilization'?button('Editor',`openRequest(${JSON.stringify(r.id)})`):r.data.status!=='finalized'?button('Continue',`openAllocation(${JSON.stringify(r.id)})`):'')+button('Delete',`remove(${JSON.stringify(r.id)})`)])));historyMonth14341.bind(budget,'budget',renderHistory,true)}
function history(tab){historyTab=tab;renderHistory();if(tab==='submitted')window.renderUserEntryReview?.();if(tab==='budget')(window.startup14257?.isPrepared('payroll')?Promise.resolve():loadWork82()).then(renderHistory)}
async function view(id){
 try{
  const r=await live(id),utilization=r.data.mode==='utilization';
  const html=documentWorkspace105.sanitize(utilization?report.report(r.data):r.data.document14316?.html||financeHtml82(r.data));
  const {root}=budgetDialog(utilization?report.title:'Budget request',html+'<div data-journal-ref></div>');
  reportToolbar(root,'<button type="button" data-print-record>Print / PDF</button>'+(utilization?postControl(r):''));
  root.querySelectorAll('[contenteditable]').forEach(n=>n.removeAttribute('contenteditable'));
  root.querySelector('[data-print-record]').onclick=()=>printRecord(id,root);
  if(utilization)showJournalReference(root,r);
 }catch(e){showCenterStatus(e.message,true)}
}
async function printRecord(id,dialog){
 try{
  const r=await live(id);
  if(r.data.mode==='utilization')return await printUtilization(r.data,r,dialog);
  return await print82('Budget Request',documentWorkspace105.sanitize(r.data.document14316?.html||financeHtml82(r.data)),r.data.date);
 }catch(e){showCenterStatus(e.message,true)}
}
async function remove(id){try{const check=context(),client=ojmDb;const r=await live(id);const children=Work82.reports.filter(x=>x.data.requestId14316===id);if(!await ui117.confirm('Delete this '+(r.data.mode==='utilization'?'allocation':'request and all linked allocations')+'? The saved document and shared link will also be removed.'))return;check();const out=await client.rpc('delete_budget14316',{p_id:id,p_version:r.version});check();if(out.error)throw Error(out.error.code==='PGRST202'?'Install INSTALL-BUDGET-LIFECYCLE-v143.16.sql before deleting a linked budget record.':out.error.message);const removed=new Set(out.data?.deletedIds||[id,...children.map(x=>x.id)]);Work82.reports=Work82.reports.filter(x=>!removed.has(x.id));if(removed.has(allocationRecord?.id)||removed.has(allocation?.requestId14316)){allocation=null;allocationRecord=null}if(removed.has(Work82.reportRecord?.id)){Work82.reportRecord=null;Work82.report=null}renderHistory();showCenterStatus('Budget transaction deleted.')}catch(e){showCenterStatus(e.message,true)}}
const switchBefore=window.switchTab;window.switchTab=function(id,...args){captureFund();return switchBefore.call(this,id,...args)};
const renderBefore=window.renderWork82;window.renderWork82=function(...args){const out=renderBefore.apply(this,args);if(document.querySelector('#user-entry-review.active'))renderFinalization();if(document.querySelector('#transactions-all.active'))renderHistory();return out};
const deleteBefore=window.deleteWork108;window.deleteWork108=function(kind,id){return kind==='reports'&&Work82.reports.find(r=>r.id===id)?.data.kind==='finance'?remove(id):deleteBefore(kind,id)};
const openBefore=window.openOperational82;window.openOperational82=function(id){const r=Work82.reports.find(r=>r.id===id);return r?.data.kind==='finance'?(r.data.mode==='utilization'?openAllocation(id):openRequest(id)):openBefore(id)};
window.budgetWorkflow14316={get finalTab(){return finalTab},get historyTab(){return historyTab},prepareHistory:renderHistory,prepareFinalization:renderFinalization,renderRequest,newRequest,editRequest,requestData,refreshCategories,templateApplied,printPicker,requestHTML,showFunds,saveDocument,requireSaved,decorateEditor,openRequest,startAllocation,openAllocation,chooseRequest,importHistory,saveAllocation,previewAllocation,newUnlinked,removeMovement,removeConversion,finalization,history,view,printRecord,remove,parseDocument,recalculate,validDate14317,editMovement,editConversion};
window.addEventListener('transactions-reset14316',e=>{if(e.detail.scopes.includes('reports')){selectedParent='';if(requestEditor){requestEditor.root.resolve108(false);requestEditor=null;}allocation=null;allocationRecord=null;clearFundPopup();Work82.reports=[];Work82.report=null;Work82.reportRecord=null;Object.assign(Finance82,{mode:'request',date:today82(),recipient:'',purpose:'',notes:'',lines:[],movements:[],conversions:[]});renderHistory()}});
function checkPopupAccess(){
 if(requestEditor&&(liveProfile?.id!==actor||ojmDb!==actorClient||liveProfile?.role!=='admin'||!access113.can('transactions-budget14313')||!document.getElementById('loginGate')?.classList.contains('is-authenticated'))){requestEditor.root.resolve108(false);requestEditor=null;}

 if((fundPopup||retainedForm)&&(liveProfile?.id!==actor||actorClient!==ojmDb||liveProfile?.role!=='admin'||!access113.can('transactions-budget14313')||!document.getElementById('loginGate')?.classList.contains('is-authenticated'))){
  clearFundPopup();allocation=null;allocationRecord=null;allocationRequest14370++;
 }
}
const loginGate=document.getElementById('loginGate');if(loginGate)new MutationObserver(checkPopupAccess).observe(loginGate,{attributes:true,attributeFilter:['class']});
window.addEventListener('page113',()=>{checkPopupAccess();if(window.workspaceViews14364?.reuseView(document.querySelector('.tab-content.active')?.id)){decorateEditor();return}if(document.querySelector('#user-entry-review.active')&&liveProfile?.role==='admin'){renderFinalization();if(finalTab==='submitted'&&!window.startup14257?.isPrepared('payroll'))void loadWork82().then(()=>{if(document.querySelector('#user-entry-review.active'))renderFinalization()}).catch(e=>showCenterStatus(e.message,true))}if(document.querySelector('#transactions-all.active')){renderHistory();if(!window.startup14257?.isPrepared('payroll'))void loadWork82().then(()=>{if(document.querySelector('#transactions-all.active'))renderHistory()}).catch(e=>showCenterStatus(e.message,true))}decorateEditor()});
})();
