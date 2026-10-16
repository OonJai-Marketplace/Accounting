// STAFF JOURNALS — simple ledger input that is converted to double-entry only on approval.
let activeStaffJournal=null;
let activeStaffJournalLines=[];
let reviewStaffJournals=[];
let staffJournalLoadSerial14370=0;
function allowedStaffAccounts(){const p=livePermission||{},all=AccountingStore.accounts||[],permitted=new Set((p.destination_account_ids?.length?p.destination_account_ids:(p.allowed_account_ids||[])).map(String));return(p.allow_any_account||liveProfile?.role==='admin'?all:all.filter(a=>permitted.has(accountKey(a)))).filter(a=>a.active!==false&&a.is_active!==false&&a.isPosting!==false&&a.is_posting!==false&&a.currency!=='NA')}
function staffJournalMonth(){return document.getElementById('staffJournalPeriod')?.value||appLocalDate().slice(0,7)}
function accountOptionHtml(selected=''){return allowedStaffAccounts().map(a=>`<option value="${escapeHtml(a.id)}" ${a.id===selected?'selected':''}>${escapeHtml(a.code)} — ${escapeHtml(a.name)}</option>`).join('')}
async function openStaffJournalPeriod(month){
  if(!liveProfile||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return;
  const actor=liveProfile.id,db=ojmDb,serial=++staffJournalLoadSerial14370,periodStart=`${month}-01`;
  const current=()=>serial===staffJournalLoadSerial14370&&liveProfile?.id===actor&&ojmDb===db;
  const {data,error}=await db.from('staff_journals').select('*').eq('owner_id',actor).eq('period_start',periodStart).maybeSingle();
  if(!current())return;if(error){showAppNotification('Staff Journal Unavailable',error.message,true);return}
  let lines=[];
  if(data){const result=await db.from('staff_journal_lines').select('*').eq('staff_journal_id',data.id).order('line_no');if(!current())return;if(result.error){showAppNotification('Journal Lines Unavailable',result.error.message,true);return}lines=result.data||[]}
  activeStaffJournal=data||null;activeStaffJournalLines=lines;renderStaffJournal();
}
function renderStaffJournal(){
  const period=staffJournalMonth(),editable=!activeStaffJournal||['draft','returned'].includes(activeStaffJournal.status),body=document.getElementById('staffJournalLinesBody');
  const badge=document.getElementById('staffJournalStatusBadge');if(badge){badge.textContent=(activeStaffJournal?.status||'draft').toUpperCase();badge.classList.toggle('is-saved',!editable)}
  const guidance=document.getElementById('staffJournalGuidance');if(guidance){const p=livePermission||{};guidance.textContent=`Money Out is posted from your selected account to ${accountNameById(p.default_out_credit_account_id)||'your assigned payment account'}. Money In is posted from ${accountNameById(p.default_in_debit_account_id)||'your assigned receipt account'} to your selected account.`}
  if(body)body.innerHTML=activeStaffJournalLines.map((line,index)=>`<tr data-index="${index}"><td><input class="je-input staff-line-date" type="date" value="${escapeHtml(line.transaction_date||`${period}-01`)}" ${editable?'':'disabled'}></td><td><select class="je-select staff-line-direction" ${editable?'':'disabled'}><option value="out" ${line.direction==='out'?'selected':''} ${livePermission?.allowed_directions?.includes('out')===false?'disabled':''}>Money Out / Expense</option><option value="in" ${line.direction==='in'?'selected':''} ${livePermission?.allowed_directions?.includes('in')===false?'disabled':''}>Money In / Collection</option></select></td><td><select class="je-select staff-line-account" ${editable?'':'disabled'}><option value="">Choose category</option>${accountOptionHtml(line.account_id)}</select></td><td><input class="je-input staff-line-memo" value="${escapeHtml(line.memo||'')}" placeholder="What happened? Receipt no. optional" ${editable?'':'disabled'}></td><td><input class="je-input staff-line-amount" type="number" min="0.01" step="0.01" value="${escapeHtml(line.amount||'')}" ${editable?'':'disabled'}></td><td>${editable?`<button type="button" class="btn-action-delete" onclick="removeStaffJournalLine(${index})">✕</button>`:''}</td></tr>`).join('');
  document.querySelectorAll('#staffJournalLinesBody input,#staffJournalLinesBody select').forEach(node=>node.addEventListener('input',syncStaffJournalLines));renderStaffJournalSummary();
  document.querySelectorAll('.staff-journal-actions .je-btn').forEach(button=>{if(button.textContent.includes('Add')||button.textContent.includes('Save')||button.textContent.includes('Submit'))button.disabled=!editable});
}
function syncStaffJournalLines(){activeStaffJournalLines=[...document.querySelectorAll('#staffJournalLinesBody tr')].map((row,index)=>({...activeStaffJournalLines[index],transaction_date:row.querySelector('.staff-line-date').value,direction:row.querySelector('.staff-line-direction').value,account_id:row.querySelector('.staff-line-account').value,memo:row.querySelector('.staff-line-memo').value.trim(),amount:parseAppNumber(row.querySelector('.staff-line-amount').value||0)}));renderStaffJournalSummary()}
function addStaffJournalLine(){syncStaffJournalLines();activeStaffJournalLines.push({transaction_date:`${staffJournalMonth()}-01`,direction:'out',account_id:'',memo:'',reference:'',amount:''});renderStaffJournal()}
function removeStaffJournalLine(index){activeStaffJournalLines.splice(index,1);if(!activeStaffJournalLines.length)addStaffJournalLine();else renderStaffJournal()}
function renderStaffJournalSummary(){const host=document.getElementById('staffJournalSummary');if(!host)return;const totals=Object.create(null);activeStaffJournalLines.filter(line=>line.account_id&&Number(line.amount)>0).forEach(line=>{const key=`${line.direction}:${line.account_id}`;totals[key]=(totals[key]||0)+Number(line.amount)});host.innerHTML=Object.keys(totals).length?Object.entries(totals).map(([key,value])=>{const[direction,id]=key.split(':');return`<div><span>${direction==='out'?'Money Out':'Money In'} • ${escapeHtml(accountNameById(id)||'Account')}</span><strong>${formatAppNumber(value)}</strong></div>`}).join(''):'<span>No valid lines yet.</span>'}
function accountNameById(id){const account=(AccountingStore.accounts||[]).find(item=>item.id===id);return account?`${account.code} — ${account.name}`:''}
async function saveStaffJournalDraft(){
  // This retired form lacks the assigned fund and stable entry identity required
  // by the current atomic workspace save. Never delete existing rows to migrate it.
  showAppNotification('Open your user workspace','Save and submit entries from Journal in your user workspace. This older form cannot safely replace saved journal lines; its current draft has been kept.',true);
  return false;
}
async function submitStaffJournal(){const saved=await saveStaffJournalDraft();if(!saved||!activeStaffJournal?.id)return;const{error}=await ojmDb.rpc('submit_staff_journal',{p_journal_id:activeStaffJournal.id});if(error){showAppNotification('Journal Submission Failed',error.message,true);return}showAppNotification('Journal Submitted','Your complete journal is ready for review.',false);await openStaffJournalPeriod(staffJournalMonth())}
