// ------------------------- Transaction Templates -------------------------------
const TemplateStore = {
  key: 'ojm_transaction_templates_v1',
  templates: [],
  load() {
    try { this.templates = JSON.parse(localStorage.getItem(this.key) || '[]'); } catch { this.templates = []; }
    if(!Array.isArray(this.templates))this.templates=[];
  },
  save(){ localStorage.setItem(this.key, JSON.stringify(this.templates)); }
};

let pendingTemplateLines = null;
let editingTemplateId = null;
let pendingTemplateOwner = null;

function captureTemplateStructure() {
  const lines = [];
  document.querySelectorAll('#jeLinesBody tr').forEach(row => {
    const account = row.querySelector('.je-line-acc')?.value?.trim() || '';
    const memo = row.querySelector('.je-line-memo')?.value?.trim() || '';
    if (account || memo) lines.push({account, memo});
  });
  return { generalMemo: document.getElementById('jeGeneralMemo')?.value?.trim() || '', lines };
}
function createTemplateFromCurrent() {
  const structure = captureTemplateStructure();
  if (!structure.lines.length) {
    showAppNotification('Template Needs Accounts', 'Enter the account names and line descriptions you want to save, then create the template.', true);
    return;
  }
  pendingTemplateOwner=liveProfile?.id;pendingTemplateLines = structure;
  editingTemplateId = null;
  document.getElementById('templateNameInput').value = '';
  openModal('modalTemplateName');
}
function confirmSaveTemplate() {
  if(liveProfile?.id!==pendingTemplateOwner)return;
  const previous=structuredClone(TemplateStore.templates);
  const name = document.getElementById('templateNameInput').value.trim();
  if (!name || !pendingTemplateLines) {
    showAppNotification('Missing Template Name', 'Please enter a name for this template.', true); return;
  }
  if (editingTemplateId) {
    const t = TemplateStore.templates.find(x => x.id === editingTemplateId);
    if (t) Object.assign(t, {name, ...pendingTemplateLines});
  } else {
    TemplateStore.templates.push({id:'tpl-'+Date.now(), name, ...pendingTemplateLines});
  }
  try{TemplateStore.save()}catch(error){TemplateStore.templates=previous;showAppNotification('Template Not Saved',error.message,true);return} closeModal('modalTemplateName'); renderTemplateManager();
  showAppNotification('Template Saved', `${name} is permanently saved in this browser until edited or removed.`, false);
}
function openTemplateManager(){ renderTemplateManager(); openModal('modalTemplateManager'); }
function renderTemplateManager(){
  const host=document.getElementById('templateManagerList'); if(!host)return;
  const templates=[...(window.JournalFX14383?.templates()||[]),...TemplateStore.templates];
  host.innerHTML = templates.length ? templates.map(t=>`
    <div class="template-item">
      <div><strong>${escapeHtml(t.name)}</strong><div class="je-subtitle">${t.builtin?'Enter currency, amount and rates to prepare balanced lines':t.lines.length+' saved lines • amounts always load as zero'}</div></div>
      <div class="template-item-actions">
        <button class="je-btn je-btn-emerald" onclick="applyTransactionTemplate(${escapeHtml(JSON.stringify(t.id))})">Use</button>
        ${t.builtin?'':`<button class="je-btn je-btn-secondary" onclick="editTransactionTemplate(${escapeHtml(JSON.stringify(t.id))})">Edit</button>
        <button class="je-btn je-btn-danger" onclick="deleteTransactionTemplate(${escapeHtml(JSON.stringify(t.id))})">Remove</button>`}
      </div>
    </div>`).join('') : '<div class="empty-archive-state">No templates saved.</div>';
}
function applyTransactionTemplate(id){
  if(String(id).startsWith('fx14383-'))return window.JournalFX14383.openTemplate(id.endsWith('income')?'income':'expense');
  const t=TemplateStore.templates.find(x=>x.id===id); if(!t)return;
  resetJournalLinesForm();window.JournalFX14383?.restore({});
  const body=document.getElementById('jeLinesBody'); body.innerHTML='';
  document.getElementById('jeGeneralMemo').value=t.generalMemo || '';
  t.lines.forEach(line=>addJournalLineRow(line.account,line.memo,'',{}));
  while(body.querySelectorAll('tr').length<2)addJournalLineRow();
  setTransactionDateToToday(true); updateNextEntryIdDisplay(); calculateJournalBalance();
  closeModal('modalTemplateManager');
}
function editTransactionTemplate(id){
  const t=TemplateStore.templates.find(x=>x.id===id); if(!t)return;
  pendingTemplateOwner=liveProfile?.id;pendingTemplateLines={generalMemo:t.generalMemo||'',lines:t.lines.map(x=>({...x}))};
  editingTemplateId=id; document.getElementById('templateNameInput').value=t.name;
  closeModal('modalTemplateManager'); openModal('modalTemplateName');
}
async function deleteTransactionTemplate(id){
  const owner=liveProfile?.id;
  const t=TemplateStore.templates.find(x=>x.id===id); if(!t)return;
  if(!await ui117.confirm(`Remove template "${t.name}"?`))return;
  if(liveProfile?.id!==owner)return;const previous=TemplateStore.templates;TemplateStore.templates=previous.filter(x=>x.id!==id);try{TemplateStore.save()}catch(error){TemplateStore.templates=previous;showAppNotification('Template Not Removed',error.message,true);return}renderTemplateManager();
}

