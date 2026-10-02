/* V56 — employee review separation, returned-book correction, and final UI parity. */
(function(){
  'use strict';
  const fmt=value=>typeof wsNumber==='function'?wsNumber(value):Number(value||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const userById=id=>availableSubUsers().find(user=>String(user.id)===String(id))||liveProfiles.find(user=>String(user.id)===String(id))||liveProfile;
  const journalById=id=>(reviewStaffJournals||[]).find(journal=>String(journal.id)===String(id));
  const accountName=id=>accountLabelOnly(id)||workspaceAccountName(id,'Unassigned account');
  const isAdjustment=item=>Object.prototype.hasOwnProperty.call(item||{},'request_no');
  const statusLabel=status=>String(status||'').replaceAll('_',' ').toUpperCase();
  const employeeStatus=status=>status==='submitted'?'Under Review':status==='returned'?'Returned':statusLabel(status);

  function ledgerRows(lines){
    const totals=new Map();
    const add=(id,side,amount)=>{if(!id)return;const label=accountName(id);if(!totals.has(label))totals.set(label,{dr:0,cr:0});totals.get(label)[side]+=Math.abs(Number(amount||0))};
    (lines||[]).forEach(line=>{if(line.direction==='in'||line.entry_kind==='collection'){add(line.fund_account_id,'dr',line.amount);add(line.account_id,'cr',line.amount)}else{add(line.account_id,'dr',line.amount);add(line.fund_account_id,'cr',line.amount)}});
    return [...totals].filter(([,row])=>row.dr||row.cr);
  }
  function totalsHtml(lines){
    const rows=ledgerRows(lines),dr=rows.reduce((sum,[,row])=>sum+row.dr,0),cr=rows.reduce((sum,[,row])=>sum+row.cr,0);
    return `<section class="final-account-totals v56-book-totals"><div class="final-section-title">Account Totals</div><div class="final-scroll-table"><table><thead><tr><th>Account</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${rows.map(([name,row])=>`<tr><td>${escapeHtml(name)}</td><td>${row.dr?fmt(row.dr):'—'}</td><td>${row.cr?fmt(row.cr):'—'}</td><td class="${row.dr-row.cr<0?'negative-amount':''}">${fmt(row.dr-row.cr)}</td></tr>`).join('')}<tr class="final-overall"><td>Overall total</td><td>${fmt(dr)}</td><td>${fmt(cr)}</td><td>${fmt(dr-cr)}</td></tr></tbody></table></div></section>`;
  }
  function bookHtml(journal){
    const lines=journal.lines||[];
    return `<section class="book-module87"><div class="final-section-title">Submitted Book</div><div class="final-scroll-table final-source-table"><table><thead><tr><th>Entry ID</th><th>Date</th><th>Account</th><th>Description / Reference</th><th>Amount</th></tr></thead><tbody>${lines.map(line=>`<tr data-created-at="${escapeHtml(line.created_at||line.transaction_date||'')}"><td><strong>${escapeHtml(line.workspace_entry_no||'—')}</strong></td><td>${escapeHtml(formatAppDate(line.transaction_date))}</td><td>${escapeHtml(lineAccountName(line))}</td><td>${escapeHtml([line.memo,line.reference].filter(Boolean).join(' · '))}</td><td>${fmt(line.amount)}</td></tr>`).join('')}</tbody></table></div></section>${journal.return_note?`<div class="v56-return-note"><b>Supervisor correction note</b><span>${escapeHtml(journal.return_note)}</span></div>`:''}${totalsHtml(lines)}`;
  }
  function adjustmentHtml(item){if(window.adjustmentReport69)return window.adjustmentReport69(item);
    const lines=item.lines||[];
    return `<div class="final-section-title">Submitted Comparison</div><div class="final-scroll-table final-four-column"><table><thead><tr><th>Activity</th><th>Original</th><th>Requested</th><th>Difference</th></tr></thead><tbody>${lines.map(line=>`<tr><td>${escapeHtml(String(line.activity_key||'').replaceAll('_',' '))}</td><td>${fmt(line.original_value)}</td><td>${fmt(line.requested_value)}</td><td class="${Number(line.difference)<0?'negative-amount':''}">${Number(line.difference)>0?'+':''}${fmt(line.difference)}</td></tr>`).join('')}</tbody></table></div>${item.status==='approved_applied'?`<div class="final-section-title">Applied to Live Activity</div><div class="final-scroll-table final-four-column"><table><thead><tr><th>Activity</th><th>Current Before</th><th>Difference Applied</th><th>Current After</th></tr></thead><tbody>${lines.map(line=>`<tr><td>${escapeHtml(String(line.activity_key||'').replaceAll('_',' '))}</td><td>${fmt(line.current_before)}</td><td>${fmt(line.difference_applied)}</td><td>${fmt(line.current_after)}</td></tr>`).join('')}</tbody></table></div>`:''}<div class="final-record-note"><b>Explanation:</b> ${escapeHtml(item.explanation||'—')}<br><b>Supporting report:</b> ${escapeHtml(item.report_reference||'—')}</div>`;
  }
  function employeeCard(item){
    const adjustment=isAdjustment(item),returned=!adjustment&&item.status==='returned',count=item.lines?.length||0,id=adjustment?item.request_no:(item.seed_key||`SUB-${String(item.id).slice(0,8).toUpperCase()}`),subtitle=adjustment?`${accountName(item.fund_account_id)} · ${employeeStatus(item.status)}`:`${String(item.period_start||'').slice(0,7)} · ${employeeStatus(item.status)}`;
    const action=returned?`<button type="button" class="je-btn je-btn-danger v56-record-action" onclick="event.preventDefault();event.stopPropagation();openReturnedBook('${item.id}')">Open for Correction</button>`:`<button type="button" class="je-btn je-btn-secondary v56-record-action" onclick="v56ToggleRecord(event)">${adjustment?'View Details':'View Book'}</button>`;
    return `<details class="final-record-card ${adjustment?'final-adjustment-record':''} ${returned?'v56-returned-record':''}"><summary><span><strong>${escapeHtml(id)}</strong><small>${escapeHtml(subtitle)}</small></span><span class="final-record-count"><small>${adjustment?'Changes':'Entries'}</small><b>${count}</b></span>${action}<i>⌄</i></summary><div class="final-record-content">${adjustment?adjustmentHtml(item):bookHtml(item)}${window.v66ReviewMetadata?window.v66ReviewMetadata(item):''}</div></details>`;
  }
  window.v56ToggleRecord=function(event){event.preventDefault();event.stopPropagation();const details=event.currentTarget.closest('details');if(details)details.open=!details.open};
  window.finalFilterRecords=function(value){const query=String(value||'').trim().toLowerCase();document.querySelectorAll('#finalRecordList>.final-record-card').forEach(card=>card.hidden=Boolean(query&&!card.textContent.toLowerCase().includes(query)))};

  async function getAdjustments(userId){
    if(!ojmDb||!liveProfile)return[];
    const result=await ojmDb.from('fund_adjustment_requests').select('*,lines:fund_adjustment_lines(*)').eq('owner_id',userId).order('submitted_at',{ascending:false});
    return result.error?[]:(result.data||[]);
  }
  async function openEmployeeReview(userId,mode='review'){
    const user=userById(userId),adjustments=await getAdjustments(userId),journals=(reviewStaffJournals||[]).filter(item=>String(item.owner_id)===String(userId));
    const items=(mode==='history'?[...adjustments.filter(item=>!['submitted','returned'].includes(item.status)),...journals.filter(item=>!['draft','submitted','returned'].includes(item.status))]:[...adjustments.filter(item=>['submitted','returned'].includes(item.status)),...journals.filter(item=>['submitted','returned'].includes(item.status))]).sort((a,b)=>String(b.updated_at||b.submitted_at||b.period_start||'').localeCompare(String(a.updated_at||a.submitted_at||a.period_start||'')));
    document.getElementById('finalRecordsOverlay')?.remove();
    const overlay=document.createElement('div');overlay.id='finalRecordsOverlay';overlay.className='submission-compare-overlay final-records-overlay v56-employee-records';
    overlay.innerHTML=`<section class="final-records-dialog"><header><div><span>${mode==='history'?'EMPLOYEE HISTORY':'SUBMISSIONS'}</span><h2>${mode==='history'?'History':'Review'}</h2><p>${escapeHtml(subUserName(user||{}))} · ${mode==='history'?'approved and posted records, newest first.':'under-review and returned records.'}</p></div><button type="button" aria-label="Close" onclick="document.getElementById('finalRecordsOverlay').remove()">×</button></header><div class="final-record-search"><input type="search" placeholder="Search period, reference, or status" oninput="finalFilterRecords(this.value)"></div><div id="finalRecordList" class="final-record-list">${items.map(employeeCard).join('')||'<div class="period-empty">No matching records.</div>'}</div></section>`;
    document.body.appendChild(overlay);
  }
  window.workspaceRecords1437={card:employeeCard,getAdjustments};
  window.openWorkspaceReview=(userId,mode='review')=>openEmployeeReview(userId,mode==='history'?'history':'review');
  window.v49OpenReview=userId=>openEmployeeReview(userId,'review');

  /* Use the focused Home search field so duplicate responsive shells cannot receive the results. */
  window.renderSubUserTabSearch=function(query=''){
    const inputs=[...document.querySelectorAll('#subUserTabSearch')],input=inputs.find(node=>node===document.activeElement)||inputs.find(node=>node.offsetParent!==null)||inputs[0],host=input?.closest('.sub-user-search-wrap')?.querySelector('#subUserSearchResults');if(!host)return;
    const term=String(query||'').trim().toLowerCase(),users=availableSubUsers().filter(user=>[subUserName(user),user.email,user.role,subUserPermission(user).job_title].some(value=>String(value||'').toLowerCase().includes(term)));
    host.innerHTML=users.length?users.map(user=>`<button type="button" class="sub-user-search-result" onpointerdown="event.preventDefault()" onclick="selectSubUserForActiveTab('${user.id}')"><div><strong>${escapeHtml(subUserName(user))}</strong><span>${escapeHtml(user.email||'No email')} · ${escapeHtml(subUserPermission(user).job_title||user.role||'Sub-user')}</span></div><span>Open</span></button>`).join(''):'<div class="sub-user-empty-state">No matching sub-users.</div>';
    host.hidden=false;
  };

  function optionList(ids,selected){return ids.map(id=>`<option value="${escapeHtml(id)}" ${String(id)===String(selected)?'selected':''}>${escapeHtml(accountName(id))}</option>`).join('')}
  function correctionRow(user,line){
    const rules=workspaceRules(user),direction=line.entry_kind==='handover'?'handover':line.direction,accountIds=direction==='in'?rules.fundIds:rules.entryIds,directions=[...(rules.directions.includes('out')?['out','handover']:[]),...(rules.directions.includes('in')?['in']:[])],description=[line.memo,line.reference].filter(Boolean).join(' / ');
    return `<tr data-line-id="${escapeHtml(line.id)}" data-entry-id="${escapeHtml(line.workspace_entry_no||'')}" data-currency="${escapeHtml(line.currency_code||'LAK')}"><td><strong>${escapeHtml(line.workspace_entry_no||'—')}</strong></td><td><input class="v56-date" type="date" value="${escapeHtml(line.transaction_date||'')}"></td><td><select class="v56-direction" onchange="v56CorrectionDirectionChanged(this)">${directions.map(value=>`<option value="${value}" ${value===direction?'selected':''}>${value==='in'?'Money In':value==='handover'?'Handover':'Money Out'}</option>`).join('')}</select></td><td><select class="v56-account" onchange="v56CorrectionAccountChanged(this)">${optionList(accountIds,line.account_id)}</select></td><td><select class="v56-fund" onchange="v56CorrectionFundChanged(this)">${optionList(rules.fundIds,line.fund_account_id)}</select></td><td><textarea class="v56-description" rows="2" placeholder="Description / Reference" oninput="v56AutoGrow(this)">${escapeHtml(description)}</textarea></td><td><input class="v56-amount" inputmode="decimal" value="${escapeHtml(fmt(line.amount))}" onfocus="v56BeginAmount(this)" oninput="v56FormatCorrectionAmount(this)" onblur="v56FinishAmount(this)"></td></tr>`;
  }
  window.openReturnedBook=function(journalId){
    const journal=journalById(journalId);if(!journal||journal.status!=='returned'){showCenterStatus('Only a returned book can be corrected here.',true);return}
    const user=userById(journal.owner_id);document.getElementById('returnedBookOverlay')?.remove();const overlay=document.createElement('div');overlay.id='returnedBookOverlay';overlay.className='submission-compare-overlay v56-returned-overlay';
    overlay.innerHTML=`<section class="v56-returned-dialog" data-journal-id="${escapeHtml(journal.id)}" data-owner-id="${escapeHtml(journal.owner_id)}"><header><div><span>RETURNED SUBMISSION</span><h2>Open Book for Correction</h2><p>${escapeHtml(subUserName(user))} · ${escapeHtml(String(journal.period_start||'').slice(0,7))}</p></div><button type="button" aria-label="Close" onclick="document.getElementById('returnedBookOverlay').remove()">×</button></header><div class="v56-returned-scroll">${journal.return_note?`<div class="v56-return-note"><b>Supervisor correction note</b><span>${escapeHtml(journal.return_note)}</span></div>`:''}<div class="v56-correction-table"><table><thead><tr><th>Entry ID</th><th>Date</th><th>Direction</th><th>Account</th><th>Main / Fund</th><th>Description / Reference</th><th>Amount</th></tr></thead><tbody>${(journal.lines||[]).map(line=>correctionRow(user,line)).join('')}</tbody></table></div><div id="v56CorrectionTotals">${totalsHtml(journal.lines||[])}</div><p class="correction-note88">Saving updates this book and the sub-user’s tracked balance. Main-ledger posting remains subject to review and approval.</p></div><footer><button class="je-btn je-btn-secondary" onclick="document.getElementById('returnedBookOverlay').remove()">Cancel</button><button class="je-btn je-btn-secondary" onclick="saveReturnedBook('${journal.id}',false)">Save Corrections</button><button class="je-btn je-btn-emerald" onclick="saveReturnedBook('${journal.id}',true)">Save &amp; Resubmit</button></footer></section>`;
    document.body.appendChild(overlay);overlay.querySelectorAll('input,select,textarea').forEach(control=>control.addEventListener('input',renderReturnedBookTotals));overlay.querySelectorAll('.v56-description').forEach(v56AutoGrow);renderReturnedBookTotals();
  };
  window.v56CorrectionDirectionChanged=function(select){
    const row=select.closest('tr'),dialog=document.querySelector('.v56-returned-dialog'),journal=journalById(dialog?.dataset?.journalId),account=row?.querySelector('.v56-account');
    if(!row||!account)return;const ownerId=journal?.owner_id||dialog?.dataset?.ownerId,user=userById(ownerId),rules=user?workspaceRules(user):null;if(!rules)return;
    const ids=select.value==='in'?rules.fundIds:rules.entryIds;account.innerHTML=optionList(ids,select.value==='in'?row.querySelector('.v56-fund')?.value:'');renderReturnedBookTotals();
  };
  window.v56CorrectionAccountChanged=function(select){const row=select.closest('tr');if(row?.querySelector('.v56-direction')?.value==='in')row.querySelector('.v56-fund').value=select.value;renderReturnedBookTotals()};
  window.v56CorrectionFundChanged=function(select){const row=select.closest('tr');if(row?.querySelector('.v56-direction')?.value==='in')row.querySelector('.v56-account').value=select.value;renderReturnedBookTotals()};
  window.v56AutoGrow=function(textarea){textarea.style.height='auto';textarea.style.height=`${Math.max(46,textarea.scrollHeight)}px`};
  function numberParts(){const style=ApplicationSettings.system?.numberFormat||'1,234.56';return style==='1.234,56'?{group:'.',decimal:','}:style==='1 234,56'?{group:' ',decimal:','}:{group:',',decimal:'.'}}
  window.v56BeginAmount=function(input){const value=typeof wsParse==='function'?wsParse(input.value):Number(String(input.value).replaceAll(',',''));if(Number.isFinite(value))input.value=String(value).replace('.',numberParts().decimal);input.select()};
  window.v56FormatCorrectionAmount=function(input){const {group,decimal}=numberParts(),escaped=decimal==='.'?'\\.':decimal,clean=String(input.value).replace(new RegExp(`[^0-9${escaped}]`,'g'),''),parts=clean.split(decimal),whole=(parts.shift()||'0').replace(/^0+(?=\d)/,''),grouped=whole.replace(/\B(?=(\d{3})+(?!\d))/g,group),places=Math.max(0,Number(ApplicationSettings.accounting?.decimalPlaces??2));input.value=grouped+(clean.includes(decimal)&&places?decimal+(parts.join('').slice(0,places)): '')};
  window.v56FinishAmount=function(input){const value=typeof wsParse==='function'?wsParse(input.value):Number(String(input.value).replaceAll(',',''));input.value=Number.isFinite(value)?fmt(value):'';renderReturnedBookTotals()};
  function splitDescription(value){const text=String(value||'').trim(),marker=' / ',at=text.lastIndexOf(marker);return at>0?{memo:text.slice(0,at).trim(),reference:text.slice(at+marker.length).trim()}:{memo:text,reference:''}}
  function returnedBookLines(){
    const journalId=document.querySelector('.v56-returned-dialog')?.dataset?.journalId,journal=journalById(journalId);
    return [...document.querySelectorAll('#returnedBookOverlay .v56-correction-table tbody tr')].map(row=>{const directionValue=row.querySelector('.v56-direction').value,direction=directionValue==='in'?'in':'out',fundId=row.querySelector('.v56-fund').value,description=splitDescription(row.querySelector('.v56-description').value),amount=typeof wsParse==='function'?wsParse(row.querySelector('.v56-amount').value):Number(String(row.querySelector('.v56-amount').value).replaceAll(',',''));return{id:row.dataset.lineId,workspace_entry_no:row.dataset.entryId,transaction_date:row.querySelector('.v56-date').value,direction,entry_kind:directionValue==='in'?'collection':directionValue==='handover'?'handover':'payment',account_id:directionValue==='in'?fundId:row.querySelector('.v56-account').value,fund_account_id:fundId,memo:description.memo,reference:description.reference,amount,currency_code:row.dataset.currency||'LAK',staff_journal_id:journal?.id}});
  }
  window.renderReturnedBookTotals=function(){const host=document.getElementById('v56CorrectionTotals');if(host)host.innerHTML=totalsHtml(returnedBookLines())};
  window.saveReturnedBook=async function(journalId,resubmit){
    const dialog=document.querySelector('.v56-returned-dialog');if(dialog?.dataset.saving)return;
    const journal=journalById(journalId);if(!journal||journal.status!=='returned'){showCenterStatus('This book is no longer available for correction.',true);return}
    const lines=returnedBookLines(),invalid=lines.find(line=>!line.transaction_date||!line.account_id||!line.fund_account_id||!line.memo||!(line.amount>0));if(invalid){showCenterStatus('Complete the date, account, main fund, description, and amount in every row.',true);return}
    if(dialog){dialog.dataset.saving='true';dialog.querySelectorAll('button,input,select,textarea').forEach(n=>n.disabled=true)}
    try{
    for(const line of lines){const result=await ojmDb.rpc('save_staff_workspace_entry_v3',{p_owner_id:journal.owner_id,p_line_id:line.id,p_client_key:null,p_transaction_date:line.transaction_date,p_direction:line.direction,p_fund_account_id:line.fund_account_id,p_account_id:line.account_id,p_memo:line.memo,p_reference:line.reference,p_amount:line.amount,p_entry_kind:line.entry_kind});if(result.error){showCenterStatus(`Correction save stopped: ${result.error.message}. Earlier rows may already be saved; reload the book before retrying`,true);return}}
    if(resubmit){const submitted=await ojmDb.rpc('submit_staff_journal',{p_journal_id:journal.id});if(submitted.error){showCenterStatus(`Corrections were saved, but resubmission failed: ${submitted.error.message}`,true);return}}
    document.getElementById('returnedBookOverlay')?.remove();await loadStaffJournalsForReview();await openEmployeeReview(journal.owner_id,'review');showCenterStatus(resubmit?'Corrections saved and resubmitted for review.':'Corrections saved. The book remains returned until resubmitted.');
    }catch(error){showCenterStatus('Correction save failed: '+error.message,true)}finally{if(dialog?.isConnected){delete dialog.dataset.saving;dialog.querySelectorAll('button,input,select,textarea').forEach(n=>n.disabled=false)}}
  };

  /* Restore the detailed original protocol that existed before the simplified transfer. */
  window.v49OpenProtocol=function(){const active=typeof activeSubUserTab==='function'?activeSubUserTab():null,userId=active?.userId||liveProfile?.id;if(typeof openWorkspaceProtocol==='function'&&userId)openWorkspaceProtocol(userId)};

  window.v56OpenBalanceExplanation=function(userId,fundId){
    const user=userById(userId),fund=fundId?accountName(fundId):'this assigned main account',values=user&&fundId&&typeof v49FundActivity==='function'?v49FundActivity(userId,fundId):null;
    document.getElementById('v56BalanceOverlay')?.remove();const overlay=document.createElement('div');overlay.id='v56BalanceOverlay';overlay.className='submission-compare-overlay v56-balance-overlay';overlay.innerHTML=`<section class="v56-balance-dialog"><header><div><span>BALANCE EXPLANATION</span><h2>Why is this fund negative?</h2><p>${escapeHtml(fund)}</p></div><button type="button" aria-label="Close" onclick="document.getElementById('v56BalanceOverlay').remove()">×</button></header><div class="v56-balance-body">${values?`<div class="v56-balance-formula"><span>Opening funds <b>${fmt(values.opening)}</b></span><span>+ Funds received <b>${fmt(values.received)}</b></span><span>− Funds used <b>${fmt(values.used)}</b></span><span>− Handed over <b>${fmt(values.handover)}</b></span><strong>= ${fmt(values.balance)}</strong></div>`:''}<p>A negative tracked balance means opening funds and receipts are lower than recorded spending and handovers for this assigned main account.</p><ul><li>Check whether a Money In entry is missing or assigned to another fund.</li><li>Check whether a payment or handover was duplicated or assigned to the wrong fund.</li><li>Compare the entries with the physical cash and supporting receipts.</li><li>If the source records are correct, submit a documented fund adjustment for supervisor review.</li></ul><small>This is the sub-user workbench’s tracked balance. The official ledger changes only through the approved transaction workflow.</small></div></section>`;document.body.appendChild(overlay);
  };

  function polish(){
    document.querySelectorAll('.v49-desktop-negative').forEach(node=>node.remove());
    const active=typeof activeSubUserTab==='function'?activeSubUserTab():null,userId=active?.userId||liveProfile?.id,user=userById(userId),fundIds=user&&typeof workspaceRules==='function'?workspaceRules(user).fundIds:[];
    document.querySelectorAll('.v49-desktop-fund-row.attention,.v49-funds article.attention').forEach(article=>{const cell=article.querySelector('.remaining')||article.querySelector(':scope > div:last-child');if(!cell||cell.querySelector('.v56-balance-alert'))return;const label=[...article.querySelectorAll('strong')].map(node=>node.textContent.trim()).find(text=>fundIds.some(id=>accountName(id)===text)),fundId=fundIds.find(id=>accountName(id)===label)||'';const icon=document.createElement('button');icon.type='button';icon.className='v56-balance-alert';icon.textContent='!';icon.title='Explain this negative balance';icon.setAttribute('aria-label','Explain this negative balance');icon.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();v56OpenBalanceExplanation(userId,fundId)});cell.prepend(icon)});
  }
  const observer=new MutationObserver(polish),start=()=>{polish();observer.observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
