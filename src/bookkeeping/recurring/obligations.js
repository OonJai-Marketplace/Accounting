// ------------------------- Recurring Obligations -------------------------------
const RecurringStore = {
  key:'ojm_recurring_transactions_v1',
  items:[],
  pendingReminders:[],
  load(){if(!window.PrivateReminders14229){this.items=[];return}return PrivateReminders14229.load().catch(()=>{})},
  save(){if(!window.PrivateReminders14229)return Promise.reject(Error('Sign in before saving reminders.'));return PrivateReminders14229.save()}
};
function resetRecurringForm(){
  ['recurringMemo','recurringAmount','recurringReference'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});
  const d=document.getElementById('recurringNextDate'); if(d)d.value='';
  const f=document.getElementById('recurringFrequency');if(f)f.value='Monthly';
  const t=document.getElementById('recurringType');if(t)t.value='recurring';updateUpcomingTypeFields();
  RecurringStore.pendingReminders=[]; renderPendingReminders();
}
function updateUpcomingTypeFields(){const oneTime=document.getElementById('recurringType')?.value==='one-time',group=document.getElementById('recurringFrequencyGroup');if(group)group.hidden=oneTime}
function addPendingReminder(){
  const count=Number(document.getElementById('reminderCount').value||1);if(!Number.isSafeInteger(count)||count<1){showCenterStatus('Enter a positive whole reminder interval.',true);return;}
  const unit=document.getElementById('reminderUnit').value;
  if(!RecurringStore.pendingReminders.some(r=>r.count===count&&r.unit===unit)) RecurringStore.pendingReminders.push({count,unit});
  renderPendingReminders();
}
function renderPendingReminders(){
  const host=document.getElementById('pendingReminderList');if(!host)return;
  host.innerHTML=RecurringStore.pendingReminders.map((r,i)=>`<span class="reminder-chip">${escapeHtml(r.count)} ${escapeHtml(r.count===1?r.unit.replace(/s$/,''):r.unit)} before <button type="button" aria-label="Remove reminder" onclick="RecurringStore.pendingReminders.splice(${i},1);renderPendingReminders()">×</button></span>`).join('');
}
async function saveRecurringTransaction(){
  const memo=document.getElementById('recurringMemo').value.trim();
  const nextDate=document.getElementById('recurringNextDate').value;
  if(!memo||!nextDate){showAppNotification('Missing Recurring Details','Description / Memo and Next Due Date are required.',true);return}
  const actor=liveProfile?.id;const item={
    id:'rec-'+crypto.randomUUID(),createdAt:new Date().toISOString(),type:document.getElementById('recurringType')?.value||'recurring',memo,frequency:document.getElementById('recurringType')?.value==='one-time'?'One-Time':document.getElementById('recurringFrequency').value,nextDate,
    amount:parseAppNumber(document.getElementById('recurringAmount').value||0),currency:document.getElementById('recurringCurrency').value,
    reference:document.getElementById('recurringReference').value.trim(),reminders:RecurringStore.pendingReminders.map(x=>({...x})),paused:false
  };if(!Number.isFinite(item.amount)||item.amount<0){showCenterStatus('Enter a nonnegative finite amount.',true);return false;}
  const {id,createdAt,...intent}=item;const saved=await PrivateReminders14229.mutate(()=>RecurringStore.items.push(item),'add:'+JSON.stringify(intent));
  if(!saved||liveProfile?.id!==actor)return false; resetRecurringForm(); renderRecurringTransactions(); showAppNotification('Upcoming Transaction Saved','The upcoming transaction has been saved.',false);return true;
}
function reminderThresholdDate(item){
  const due=new Date(item.nextDate+'T00:00:00');
  let earliest=new Date(due);
  (item.reminders||[]).forEach(r=>{
    const d=new Date(due);
    if(r.unit==='days')d.setDate(d.getDate()-r.count);
    if(r.unit==='weeks')d.setDate(d.getDate()-(r.count*7));
    if(r.unit==='months'){const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()-r.count);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));}
    if(d<earliest)earliest=d;
  });
  return earliest;
}
function recurringStatus(item){
  if(item.paused)return 'PAUSED';
  const today=new Date(); today.setHours(0,0,0,0);
  const due=new Date(item.nextDate+'T00:00:00');
  if(due<today)return 'OVERDUE';
  if(today>=reminderThresholdDate(item))return 'DUE SOON';
  return 'UPCOMING';
}
function reminderText(item){return (item.reminders||[]).map(r=>`${r.count} ${r.unit}`).join(' + ')||'No reminder'}
function renderRecurringTransactions(){
  const body=document.getElementById('tblRecurringTransactionsBody');if(!body)return;
  const items=orderedRecords78(window.PrivateReminders14229?.ready()?RecurringStore.items:[]);
  body.innerHTML=items.map(item=>{
    const status=recurringStatus(item), cls=status==='OVERDUE'?'due-overdue':status==='DUE SOON'?'due-soon':'';
    return `<tr data-recurring-id="${escapeHtml(item.id)}">
      <td class="${cls}">${formatAppDate(item.nextDate)}</td><td>${escapeHtml(item.type==='one-time'?'One-Time':item.frequency)}</td><td>${escapeHtml(item.memo)}${item.reference?`<div class="je-subtitle">${escapeHtml(item.reference)}</div>`:''}</td>
      <td class="num">${formatAppNumber(item.amount)} ${escapeHtml(item.currency)}</td>
      <td>${escapeHtml(reminderText(item))}</td><td class="${cls}">${status}</td>
      <td class="action-col upcoming-action-col no-print"><div class="recurring-inline-actions"><button class="je-btn je-btn-emerald" onclick="markRecurringPaid(${escapeHtml(JSON.stringify(item.id))})">Mark reminder paid</button><button class="je-btn je-btn-secondary" onclick="toggleRecurringPause(${escapeHtml(JSON.stringify(item.id))})">${item.paused?'Resume':'Pause'}</button><button class="je-btn je-btn-danger recurring-remove-x" onclick="removeRecurring(${escapeHtml(JSON.stringify(item.id))})" title="Remove upcoming transaction" aria-label="Remove upcoming transaction">&times;</button></div></td>
    </tr>`;
  }).join('');
}
function advanceRecurringDate(item){
  const d=new Date(item.nextDate+'T12:00:00Z');if(!Number.isFinite(d.getTime()))throw Error('The reminder due date is invalid.');
  if(item.frequency==='Weekly')d.setUTCDate(d.getUTCDate()+7);
  else{const day=Number.isInteger(item.anchorDay)&&item.anchorDay>=1&&item.anchorDay<=31?item.anchorDay:d.getUTCDate();item.anchorDay=day;const months=item.frequency==='Quarterly'?3:item.frequency==='Yearly'?12:1;d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));}
  item.nextDate=d.toISOString().slice(0,10);
}
async function markRecurringPaid(id){const actor=liveProfile?.id;const item=RecurringStore.items.find(x=>x.id===id);if(!item)return;const saved=await PrivateReminders14229.mutate(()=>{const current=RecurringStore.items.find(x=>x.id===id);if(!current)throw Error('Reminder changed. Reload first.');current.lastPaidDate=new Date().toISOString().slice(0,10);delete current.preparedUntil;if(current.type==='one-time'||current.frequency==='One-Time')RecurringStore.items=RecurringStore.items.filter(x=>x.id!==id);else advanceRecurringDate(current)},'paid:'+id);if(saved&&liveProfile?.id===actor)showAppNotification('Marked Paid',`${item.memo} was marked paid. No journal payment was posted.`,false);return saved;}
async function toggleRecurringPause(id){return PrivateReminders14229.mutate(()=>{const item=RecurringStore.items.find(x=>x.id===id);if(!item)throw Error('Reminder changed. Reload first.');item.paused=!item.paused},'pause:'+id)}
async function removeRecurring(id){const actor=liveProfile?.id;const item=RecurringStore.items.find(x=>x.id===id);if(!item)return;if(!await ui117.confirm(`Remove recurring item "${item.memo}"?`)||liveProfile?.id!==actor)return;return PrivateReminders14229.mutate(()=>{RecurringStore.items=RecurringStore.items.filter(x=>x.id!==id)},'remove:'+id)}

function getActiveRecurringWarnings(){
  if(!window.PrivateReminders14229?.ready())return [];
  return RecurringStore.items.filter(x=>!x.paused && (x.reminders||[]).length>0 && ['OVERDUE','DUE SOON'].includes(recurringStatus(x))).sort((a,b)=>{
    const sa=recurringStatus(a),sb=recurringStatus(b); if(sa!==sb)return sa==='OVERDUE'?-1:1; return a.nextDate.localeCompare(b.nextDate);
  });
}
function renderRecurringWarnings(){
  const host=document.getElementById('recurringWarningList');if(!host)return;
  const items=getActiveRecurringWarnings();
  host.innerHTML=items.length?items.map(item=>`<div class="recurring-warning-item ${recurringStatus(item)==='OVERDUE'?'overdue':''}">
    <h5>${recurringStatus(item)==='OVERDUE'?'OVERDUE':'UPCOMING'} — ${escapeHtml(item.memo)}</h5>
    <div>Due: <strong>${escapeHtml(formatAppDate(item.nextDate))}</strong> • ${formatAppNumber(item.amount)} ${escapeHtml(item.currency)}</div>
    <div class="je-subtitle">Reminder: ${escapeHtml(reminderText(item))}</div>
    <div style="margin-top:7px"><button class="je-btn je-btn-emerald" onclick="markRecurringPaid(${escapeHtml(JSON.stringify(item.id))})">Mark reminder paid</button></div>
  </div>`).join(''):'<div class="empty-archive-state">No recurring warnings are currently due.</div>';
}
async function showRecurringWarningsOnLogin(){
  const actor=liveProfile?.id;if(liveProfile?.role!=='admin'||!window.access113?.can('transactions-recurring'))return;try{await PrivateReminders14229.load()}catch{return}if(liveProfile?.id!==actor)return;renderRecurringWarnings();
  if(!liveProfile)return;
  const owner=liveProfile.id;const show=()=>{if(liveProfile?.id!==owner)return;if(document.querySelector('.modal-backdrop.active,.submission-compare-overlay')){setTimeout(show,500);return}if(getActiveRecurringWarnings().length)openModal('modalRecurringWarnings')};setTimeout(show,250);
}

// Extend tab behavior for recurring table.
const originalSwitchTabV5 = switchTab;
switchTab = function(tabId,...args){
  const result=originalSwitchTabV5.call(this,tabId,...args);
  if(tabId==='transactions-recurring') renderRecurringTransactions();return result;
};


