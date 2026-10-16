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
    if (account || memo) lines.push({account, memo, ...(resolved?.id?{accountId:resolved.id,currency:resolved.currency}:{})});
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
      <div><strong>${escapeHtml(t.name)}</strong><div class="je-subtitle">${t.lines.length+' saved lines • amounts always load as zero'}</div></div>
      <div class="template-item-actions">
        <button class="je-btn je-btn-emerald" onclick="applyTransactionTemplate(${escapeHtml(JSON.stringify(t.id))})">Use</button>
        ${t.builtin?'':`<button class="je-btn je-btn-secondary" onclick="editTransactionTemplate(${escapeHtml(JSON.stringify(t.id))})">Edit</button>
        <button class="je-btn je-btn-danger" onclick="deleteTransactionTemplate(${escapeHtml(JSON.stringify(t.id))})">Remove</button>`}
      </div>
    </div>`).join('') : '<div class="empty-archive-state">No templates saved.</div>';
}
function applyTransactionTemplate(id){
  const t=[...(window.JournalFX14383?.templates()||[]),...TemplateStore.templates].find(x=>x.id===id); if(!t)return;
  let lines=t.lines;
  if(t.builtin){
    lines=t.lines.map(line=>{const a=AccountingStore.accounts.find(a=>a.code===line.code&&a.currency===line.currency&&a.isPosting!==false&&a.active!==false);return {...line,account:a?a.code+' — '+a.name:'',resolved:a}});
    const missing=lines.filter(l=>!l.resolved);
    if(missing.length){showAppNotification('Template Accounts Missing','Check these posting accounts: '+missing.map(l=>l.code+' ('+l.currency+')').join(', '),true);return;}
    if(window.personalJournal1437?.active&&lines.some(l=>!personalJournal1437.allowed(l.resolved))){showAppNotification('Template Accounts Not Assigned','This template includes accounts outside this user’s assignments. Use the main journal or update the user’s allowed accounts.',true);return;}
  }
  if(!t.builtin){
    lines=t.lines.map(line=>{const a=resolveTemplateAccount14397(line);return {...line,account:a?a.code+' — '+a.name:line.account,resolved:a}});
    const missing=lines.filter(l=>l.account&&!l.resolved);
    if(missing.length){showAppNotification('Template Accounts Missing','Update these saved template accounts: '+missing.map(l=>l.account).join(', '),true);return;}
    if(window.personalJournal1437?.active&&lines.some(l=>l.resolved&&!personalJournal1437.allowed(l.resolved))){showAppNotification('Template Accounts Not Assigned','This template includes accounts outside this user’s assignments.',true);return;}
  }
  resetJournalLinesForm();window.JournalFX14383?.restore({});
  if(t.builtin)window.entry1430?.restore('double',[]);
  const body=document.getElementById('jeLinesBody'); body.innerHTML='';
  document.getElementById('jeGeneralMemo').value=t.generalMemo || '';
  lines.forEach(line=>addJournalLineRow(line.account,line.memo,'',{}));
  while(body.querySelectorAll('tr').length<2)addJournalLineRow();

  setTransactionDateToToday(true); updateNextEntryIdDisplay(); calculateJournalBalance();
  closeModal('modalTemplateManager');
  window.JournalFX14383?.restore({});showJournalEntry98();window.dispatchEvent(new Event('save-state14234'));
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

