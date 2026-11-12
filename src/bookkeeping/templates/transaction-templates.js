// ------------------------- Transaction Templates -------------------------------
const TemplateStore = {
  key: 'ojm_transaction_templates_v1', templates: [], owner: '', baseline: null, loaded: false, error: '',
  actor(){return typeof liveProfile==='undefined'?'':liveProfile?.id||'';},
  load(){
    const owner=this.actor();
    if(!owner||window.deviceVault14334&&(!window.deviceVault14334.unlocked||window.deviceVault14334.actor&&window.deviceVault14334.actor!==owner)){this.templates=[];this.owner='';this.loaded=false;return false;}
    if(owner!==this.owner){this.templates=[];this.loaded=false;this.owner=owner;this.baseline=null;}
    try{
      const raw=localStorage.getItem(this.key);
      if(this.loaded&&raw===this.baseline)return true;
      if(this.loaded&&JSON.stringify(this.templates)!==JSON.stringify(JSON.parse(this.baseline||'[]')))throw Error('Templates changed in another tab. Reopen Templates before saving.');
      const value=JSON.parse(raw||'[]');
      if(!Array.isArray(value)||value.some(t=>!t||typeof t.id!=='string'||!t.deleted&&(!Array.isArray(t.lines)||typeof t.name!=='string'))||new Set(value.map(t=>t.id)).size!==value.length)throw Error('Saved template data is invalid. It has been retained; restore a verified device backup.');
      this.templates=value;this.baseline=raw;this.loaded=true;this.error='';return true;
    }catch(e){this.error=e.message;throw e;}
  },
  async save(){
    const owner=this.owner,baseline=this.baseline,value=JSON.stringify(this.templates);
    const write=()=>{
      if(!this.loaded||!owner||owner!==this.actor()||window.deviceVault14334&&!window.deviceVault14334.unlocked)throw Error('Sign in again before saving templates.');
      if(localStorage.getItem(this.key)!==baseline)throw Error('Templates changed in another tab. Your edits have not overwritten them. Reopen Templates to review.');
      if(baseline!==null)localStorage.setItem(this.key+':previous274',baseline);
      localStorage.setItem(this.key,value);
      if(localStorage.getItem(this.key)!==value)throw Error('The device template save could not be confirmed.');
      this.baseline=value;this.error='';
    };
    const result=await (navigator.locks?.request?navigator.locks.request('ojm-template-save274',write):write());window.TemplateCloud275?.queue();return result;
  }
};

// Numbers are independent of names and retained after deletion. The Web Lock
// serializes allocation across tabs; the registry is written as one value.
async function ensureTemplateNumbers143125(){
  if(!TemplateStore.load())throw Error('Sign in to unlock saved templates.');
  const owner=TemplateStore.owner;
  const allocate=()=>{
    if(TemplateStore.actor()!==owner||window.deviceVault14334&&!window.deviceVault14334.unlocked)throw Error('Account changed before template numbers were saved.');
    const key=TemplateStore.key+':numbers143125',raw=localStorage.getItem(key);
    const registry=raw?JSON.parse(raw):{next:1,ids:{}};
    if(!registry.ids||!Number.isSafeInteger(registry.next)||registry.next<1)throw Error('Template number registry is invalid. Restore the device backup before saving.');
    const templates=[...builtInTransactionTemplates268(),...TemplateStore.templates];
    for(const t of templates){if(!Object.hasOwn(registry.ids,t.id)){registry.ids[t.id]=registry.next++;}}
    const value=JSON.stringify(registry);if(raw!==value){localStorage.setItem(key,value);window.TemplateCloud275?.queue();}
    return registry.ids;
  };
  return navigator.locks?.request?navigator.locks.request('ojm-template-numbers143125',allocate):allocate();
}
function templateDisplayName143125(t){return /^fx14383-(income|expense)$/.test(t.id)?t.name.replace(/^[12]\.\s+(?=Foreign Currency)/,''):t.name;}

let pendingTemplateLines = null;
let savingTemplate143125=false;
let editingTemplateId = null;
let pendingTemplateOwner = null;
let pendingTemplateRevision274 = null;

// Old local templates stored display text. Resolve known restructuring aliases
// only against the expected account/currency; new templates keep stable identities.
const templateAliases14397 = [["3021","Owner Financial Support – Remaining","USD","9311","Owner Financial Support — Remaining — USD Mapping"],["3022","Owner Financial Support – Used","USD","9321","Owner Financial Support — Used — USD Mapping"],["3030","Owner Support Contribution – Airfare","USD","9331","Owner Support Contribution — Airfare — USD Mapping"],["3111","Retained Earnings – USD","USD","9341","Retained Earnings — USD Mapping"],["3112","Retained Earnings – THB","THB","9342","Retained Earnings — THB Mapping"],["4111","Donations & External Support – USD","USD","9111","Donations & External Support — USD Mapping"],["4112","Donations & External Support – THB","THB","9112","Donations & External Support — THB Mapping"],["4131","Other Income – USD","USD","9131","Other Income — USD Mapping"],["4132","Other Income – THB","THB","9132","Other Income — THB Mapping"],["5112","Kitchen Supplies – USD","USD","9211","Kitchen Supplies — USD Mapping"],["5310","Salaries – USD","USD","9231","Salaries — USD Mapping"],["5314","Employee Benefits","USD","9233","Employee Benefits — USD Mapping"],["5415","Bank Fees – USD","USD","9241","Bank Fees — USD Mapping"],["9031","Income – THB (System)","THB","9101","Sales – Dine-in — THB Mapping"],["9032","Expense – THB (System)","THB","9201","Food Cost / Cost of Goods Sold — THB Mapping"],["9033","Income – USD (System)","USD","9102","Sales – Dine-in — USD Mapping"],["9034","Expense – USD (System)","USD","9202","Food Cost / Cost of Goods Sold — USD Mapping"],["9035","Income Mapping - LAK (System)","LAK","9190","Revenue Mapping — LAK (System)"],["9036","Expense Mapping – LAK (System)","LAK","9290","Expense Mapping — LAK (System)"]];
function resolveTemplateAccount14397(line){
  const accounts=AccountingStore.accounts.filter(a=>a.active!==false&&a.isPosting!==false);
  if(line.accountId)return accounts.find(a=>a.id===line.accountId&&(!line.currency||a.currency===line.currency));
  const text=String(line.account||'').trim();if(!text)return null;
  const alias=templateAliases14397.find(([code,name,currency])=>[code+' — '+name,name+' ('+currency+')'].includes(text));
  if(alias){
    const [code,name,currency,newCode,newName]=alias;
    return accounts.find(a=>a.code===code&&a.name===name&&a.currency===currency)||accounts.find(a=>a.code===newCode&&a.name===newName&&a.currency===currency&&a.isTechnical);
  }
  return getSelectedAccountInfo(text);
}
function captureTemplateStructure() {
  const lines = [];
  document.querySelectorAll('#jeLinesBody tr').forEach(row => {
    const account = row.querySelector('.je-line-acc')?.value?.trim() || '';
    const memo = row.querySelector('.je-line-memo')?.value?.trim() || '';
    const resolved=getSelectedAccountInfo(account);
    const debit=parseAppNumber(row.querySelector('.je-line-dr')?.value||'0'),credit=parseAppNumber(row.querySelector('.je-line-cr')?.value||'0');
    const side=debit>0&&credit===0?'debit':credit>0&&debit===0?'credit':row.dataset.templateSide274||'';
    if (account || memo) lines.push({account, memo,side, ...(resolved?.id?{accountId:resolved.id,currency:resolved.currency}:{})});
  });
  return { generalMemo: document.getElementById('jeGeneralMemo')?.value?.trim() || '', lines };
}
function createTemplateFromCurrent() {
  try{if(!TemplateStore.load())return;}catch(e){showAppNotification('Templates Unavailable',e.message,true);return;}
  pendingTemplateRevision274=TemplateStore.baseline;
  const structure = captureTemplateStructure();
  if (!structure.lines.length) {
    showAppNotification('Template Needs Accounts', 'Enter the account names and line descriptions you want to save, then create the template.', true);
    return;
  }
  pendingTemplateOwner=liveProfile?.id;pendingTemplateLines = structure;
  editingTemplateId = null;
  document.getElementById('templateNameInput').value = '';templateEditorFields14399(null);
  openModal('modalTemplateName');
}
async function confirmSaveTemplate() {
  if(savingTemplate143125||liveProfile?.id!==pendingTemplateOwner)return;
  if(!TemplateStore.loaded||TemplateStore.owner!==pendingTemplateOwner||localStorage.getItem(TemplateStore.key)!==pendingTemplateRevision274){showAppNotification('Template Changed','Reopen the template before saving; another tab or account changed its saved copy.',true);return;}
  const previous=structuredClone(TemplateStore.templates);
  const name = document.getElementById('templateNameInput').value.trim();
  if (!name || !pendingTemplateLines) {
    showAppNotification('Missing Template Name', 'Please enter a name for this template.', true); return;
  }
  if(editingTemplateId){
    const rows=[...document.querySelectorAll('#templateRows14399 .template-row14399')];
    const lines=rows.map(row=>{const a=AccountingStore.accounts.find(a=>a.id===row.querySelector('select').value);return a?{accountId:a.id,currency:a.currency,account:a.code+' — '+a.name,memo:row.querySelector('[data-template-line-memo14399]').value.trim(),side:row.querySelector('[data-template-side274]').value}:null});
    if(lines.length<2||lines.some(l=>!l)){showAppNotification('Template Needs Accounts','Choose a valid account for each of at least two lines.',true);return}
    pendingTemplateLines={generalMemo:document.querySelector('[data-template-memo14399]').value.trim(),lines};
  }
  savingTemplate143125=true;
  if (editingTemplateId) {
    const t = TemplateStore.templates.find(x => x.id === editingTemplateId);
    if (t) Object.assign(t, {name, ...pendingTemplateLines,builtin:false,deleted:false});
    else TemplateStore.templates.push({id:editingTemplateId,name,...pendingTemplateLines});
  } else {
    TemplateStore.templates.push({id:'tpl-'+crypto.randomUUID(), name, ...pendingTemplateLines});
  }
  try{await ensureTemplateNumbers143125();if(liveProfile?.id!==pendingTemplateOwner)return;await TemplateStore.save()}catch(error){TemplateStore.templates=previous;showAppNotification('Template Not Saved',error.message,true);return}finally{savingTemplate143125=false} closeModal('modalTemplateName'); renderTemplateManager();
  showAppNotification('Template Saved', `${name} was saved and verified on this browser for your signed-in account. ${window.TemplateCloud275?'Cloud confirmation is pending; check Templates for the result.':'It is not a cloud copy.'}`, false);
}
async function openTemplateManager(){if(await renderTemplateManager())openModal('modalTemplateManager');const status=document.getElementById('templateCloudStatus275'),owner=liveProfile?.id;await window.TemplateCloud275?.sync();if(status?.isConnected&&liveProfile?.id===owner)await renderTemplateManager();}
function builtInTransactionTemplates268(){return [...(window.JournalFX14383?.templates()||[]),...(window.JournalTemplateCatalog268?.templates(AccountingStore.accounts)||[])];}
function availableTransactionTemplates(){
  TemplateStore.load();
  const overrides=new Map(TemplateStore.templates.map(t=>[t.id,t]));
  return [...builtInTransactionTemplates268().filter(t=>!overrides.has(t.id)),...TemplateStore.templates].filter(t=>!t.deleted);
}
function templateEditorFields14399(t){
  let host=document.getElementById('templateFields14399');
  if(!host){host=document.createElement('div');host.id='templateFields14399';document.querySelector('#modalTemplateName .modal-body').append(host)}
  host.replaceChildren();
  if(!t)return;
  const label=document.createElement('label');label.textContent='General description';
  const memo=document.createElement('textarea');memo.value=t.generalMemo||'';memo.dataset.templateMemo14399='';label.append(memo);host.append(label);
  const list=document.createElement('div');list.id='templateRows14399';host.append(list);
  function add(line={}){
    const row=document.createElement('div');row.className='template-row14399';
    const account=document.createElement('select');account.setAttribute('aria-label','Template account');account.dataset.templateAccount14399='';account.innerHTML='<option value="">Choose account</option>';
    const resolved=line.code?AccountingStore.accounts.find(a=>a.code===line.code&&a.currency===line.currency):resolveTemplateAccount14397(line);
    for(const a of AccountingStore.accounts.filter(a=>a.isPosting!==false&&a.active!==false&&(!window.personalJournal1437?.active||personalJournal1437.allowed(a)))){const o=document.createElement('option');o.value=a.id;o.textContent=a.code+' — '+a.name+' ('+a.currency+')';account.append(o)}
    account.value=resolved?.id||'';
    const description=document.createElement('input');description.value=line.memo||'';description.placeholder='Line description';description.setAttribute('aria-label','Line description');description.dataset.templateLineMemo14399='';
    const remove=document.createElement('button');remove.type='button';remove.className='je-btn je-btn-secondary';remove.textContent='Remove line';remove.onclick=()=>row.remove();
    const side=document.createElement('select');side.dataset.templateSide274='';side.setAttribute('aria-label','Template debit or credit');for(const [value,label] of [['','Choose side'],['debit','Debit'],['credit','Credit']]){const o=document.createElement('option');o.value=value;o.textContent=label;side.append(o);}side.value=line.side||'';
    row.append(account,side,description,remove);list.append(row);window.dropdown1434?.enhance(row);
  }
  (t.lines||[]).forEach(add);
  const button=document.createElement('button');button.type='button';button.className='je-btn je-btn-secondary';button.textContent='Add line';button.onclick=()=>add();host.append(button);
}
async function renderTemplateManager(){
  const host=document.getElementById('templateManagerList'); if(!host)return;
  const owner=liveProfile?.id;let numbers;try{numbers=await ensureTemplateNumbers143125()}catch(error){if(window.TemplateCloud275){TemplateCloud275.renderFailure(host,error);return true;}showAppNotification('Template Numbers Unavailable',error.message,true);return}if(liveProfile?.id!==owner)return;
  const templates=availableTransactionTemplates();
  host.innerHTML = '<p class="je-subtitle">'+TemplateStore.templates.filter(t=>!t.deleted).length+' saved custom templates · '+templates.filter(t=>t.builtin).length+' built-in templates. Saved templates belong to this signed-in account.</p>'+ (templates.length ? templates.map(t=>`
    <div class="template-item">
      <div><strong><span class="template-number143125">${numbers[t.id]}.</span> ${escapeHtml(templateDisplayName143125(t))}</strong><div class="je-subtitle">${t.lines.length+' saved lines • amounts always load as zero'}</div></div>
      <div class="template-item-actions">
        <button class="je-btn je-btn-emerald" onclick="applyTransactionTemplate(${escapeHtml(JSON.stringify(t.id))})">Use</button>
        <button class="je-btn je-btn-secondary" onclick="editTransactionTemplate(${escapeHtml(JSON.stringify(t.id))})">Edit</button>
        <button class="je-btn je-btn-danger" onclick="deleteTransactionTemplate(${escapeHtml(JSON.stringify(t.id))})">Remove</button>
      </div>
    </div>`).join('') : '<div class="empty-archive-state">No templates saved.</div>');window.TemplateCloud275?.decorate(host);return true;
}
function setTemplateAmountHints(row,side,calculated){
  for(const input of row.querySelectorAll('.je-line-dr,.je-line-cr,[data-field="debit"],[data-field="credit"]')){
    const field=input.dataset.field||(input.classList.contains('je-line-dr')?'debit':'credit');
    if(!calculated&&side===field){
      input.placeholder='Enter '+field;
      input.dataset.templateAmountHint='';
    }else{
      input.removeAttribute('placeholder');
      delete input.dataset.templateAmountHint;
    }
  }
}
function currencyTemplateSide(template,account){
  if(!template?.builtin||!account)return '';
  return template.lines.find(line=>line.code===account.code&&line.currency===account.currency)?.side||'';
}
function restoreJournalTemplateHints(row){
  const data=row.dataset;
  if(data.generatorCurrency&&!data.templateSide274&&!data.generatorCalculated&&!data.generatorOutput&&/^fx14383-(income|expense)$/.test(data.generatorTemplate)){
    const template=window.JournalFX14383?.templates().find(t=>t.id===data.generatorTemplate);
    const side=currencyTemplateSide(template,getSelectedAccountInfo(row.querySelector('.je-line-acc').value));
    if(side)data.templateSide274=side;
  }
  setTemplateAmountHints(row,data.templateSide274,data.generatorCalculated||data.generatorOutput);
}
function applyTransactionTemplate(id){
  const t=availableTransactionTemplates().find(x=>x.id===id); if(!t)return;
  let lines=t.lines;
  if(t.builtin){
    lines=t.lines.map(line=>{const a=AccountingStore.accounts.find(a=>a.code===line.code&&a.currency===line.currency&&a.isPosting!==false&&a.active!==false);return {...line,account:a?a.code+' — '+a.name:'',resolved:a}});
    const missing=lines.filter(l=>!l.resolved&&!l.role);
    if(missing.length){showAppNotification('Template Accounts Missing','Check these posting accounts: '+missing.map(l=>l.code+' ('+l.currency+')').join(', '),true);return;}
    if(window.personalJournal1437?.active&&lines.some(l=>l.resolved&&!personalJournal1437.allowed(l.resolved))){showAppNotification('Template Accounts Not Assigned','This template includes accounts outside this user’s assignments. Use the main journal or update the user’s allowed accounts.',true);return;}
  }
  if(!t.builtin){
    lines=t.lines.map(line=>{const a=resolveTemplateAccount14397(line);return {...line,account:a?a.code+' — '+a.name:line.account,resolved:a}});
    const missing=lines.filter(l=>l.account&&!l.resolved);
    if(missing.length){showAppNotification('Template Accounts Missing','Update these saved template accounts: '+missing.map(l=>l.account).join(', '),true);return;}
    if(window.personalJournal1437?.active&&lines.some(l=>l.resolved&&!personalJournal1437.allowed(l.resolved))){showAppNotification('Template Accounts Not Assigned','This template includes accounts outside this user’s assignments.',true);return;}
  }
  resetJournalLinesForm();window.JournalFX14383?.restore({});
  window.entry1430?.restore('double',[]);
  const body=document.getElementById('jeLinesBody'); body.innerHTML='';
  document.getElementById('jeGeneralMemo').value=t.generalMemo || '';
  lines.forEach(line=>{
    addJournalLineRow(line.account,line.memo,'',{});
    const row=body.lastElementChild,data=row.dataset;
    data.generatorTemplate=t.id;data.templateSide274=line.side||'';
    setTemplateAmountHints(row,line.side,line.calculated);
    if(t.builtin){data.generatorRole=line.role||'';data.generatorCurrency=line.currency||'';data.generatorStage=line.stage||'';data.generatorReceipt=line.receiptLeg||'';if(line.calculated)data.generatorCalculated='true';}});
  while(body.querySelectorAll('tr').length<2)addJournalLineRow();

  setTransactionDateToToday(true); updateNextEntryIdDisplay(); calculateJournalBalance();
  closeModal('modalTemplateManager');
  window.JournalFX14383?.restore({});showJournalEntry98();window.dispatchEvent(new Event('save-state14234'));
}
function editTransactionTemplate(id){
  const t=availableTransactionTemplates().find(x=>x.id===id); if(!t)return;
  pendingTemplateRevision274=TemplateStore.baseline;pendingTemplateOwner=liveProfile?.id;pendingTemplateLines={generalMemo:t.generalMemo||'',lines:t.lines.map(x=>({...x}))};
  editingTemplateId=id; document.getElementById('templateNameInput').value=templateDisplayName143125(t);templateEditorFields14399(t);
  closeModal('modalTemplateManager'); openModal('modalTemplateName');
}
async function deleteTransactionTemplate(id){
  const owner=liveProfile?.id;
  const t=availableTransactionTemplates().find(x=>x.id===id); if(!t)return;
  if(!await ui117.confirm(`Remove template "${t.name}"?`))return;
  if(liveProfile?.id!==owner)return;const previous=TemplateStore.templates;TemplateStore.templates=previous.filter(x=>x.id!==id);TemplateStore.templates.push({id,deleted:true});try{await TemplateStore.save()}catch(error){TemplateStore.templates=previous;showAppNotification('Template Not Removed',error.message,true);return}renderTemplateManager();
}

