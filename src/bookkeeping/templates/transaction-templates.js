// ------------------------- Transaction Templates -------------------------------
const TemplateStore = {
  key: 'ojm_transaction_templates_v1',
  templates: [],
  load() {
    try { this.templates = JSON.parse(localStorage.getItem(this.key) || '[]'); } catch { this.templates = []; }
    if (!this.templates.length) {
      this.templates = [{
        id:'tpl-payroll-sample', name:'Monthly Payroll — Sample',
        generalMemo:'Monthly payroll posting',
        lines:[
          {account:'Salaries & Wages (USD)', memo:'Employee salary / payroll reference'},
          {account:'Payroll Tax Payable (LAK)', memo:'PIT payable'},
          {account:'SSO Payable (LAK)', memo:'SSO payable'}
        ]
      }];
      this.save();
    }
  },
  save(){ localStorage.setItem(this.key, JSON.stringify(this.templates)); }
};

let pendingTemplateLines = null;
let editingTemplateId = null;

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
  pendingTemplateLines = structure;
  editingTemplateId = null;
  document.getElementById('templateNameInput').value = '';
  openModal('modalTemplateName');
}
function confirmSaveTemplate() {
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
  TemplateStore.save(); closeModal('modalTemplateName'); renderTemplateManager();
  showAppNotification('Template Saved', `${name} is permanently saved in this browser until edited or removed.`, false);
}
function openTemplateManager(){ renderTemplateManager(); openModal('modalTemplateManager'); }
function renderTemplateManager(){
  const host=document.getElementById('templateManagerList'); if(!host)return;
  host.innerHTML = TemplateStore.templates.length ? TemplateStore.templates.map(t=>`
    <div class="template-item">
      <div><strong>${escapeHtml(t.name)}</strong><div class="je-subtitle">${t.lines.length} saved line${t.lines.length===1?'':'s'} • amounts always load as zero</div></div>
      <div class="template-item-actions">
        <button class="je-btn je-btn-emerald" onclick="applyTransactionTemplate('${t.id}')">Use</button>
        <button class="je-btn je-btn-secondary" onclick="editTransactionTemplate('${t.id}')">Edit</button>
        <button class="je-btn je-btn-danger" onclick="deleteTransactionTemplate('${t.id}')">Remove</button>
      </div>
    </div>`).join('') : '<div class="empty-archive-state">No templates saved.</div>';
}
function applyTransactionTemplate(id){
  const t=TemplateStore.templates.find(x=>x.id===id); if(!t)return;
  resetJournalLinesForm();
  const body=document.getElementById('jeLinesBody'); body.innerHTML='';
  document.getElementById('jeGeneralMemo').value=t.generalMemo || '';
  t.lines.forEach(line=>addJournalLineRow(line.account,line.memo,'',{}));
  while(body.querySelectorAll('tr').length<2)addJournalLineRow();
  setTransactionDateToToday(true); updateNextEntryIdDisplay(); calculateJournalBalance();
  closeModal('modalTemplateManager');
}
function editTransactionTemplate(id){
  const t=TemplateStore.templates.find(x=>x.id===id); if(!t)return;
  pendingTemplateLines={generalMemo:t.generalMemo||'',lines:t.lines.map(x=>({...x}))};
  editingTemplateId=id; document.getElementById('templateNameInput').value=t.name;
  closeModal('modalTemplateManager'); openModal('modalTemplateName');
}
async function deleteTransactionTemplate(id){
  const t=TemplateStore.templates.find(x=>x.id===id); if(!t)return;
  if(!await ui117.confirm(`Remove template "${t.name}"?`))return;
  TemplateStore.templates=TemplateStore.templates.filter(x=>x.id!==id); TemplateStore.save(); renderTemplateManager();
}

