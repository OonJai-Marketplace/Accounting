function leaveDayFractions459(data){
 const days=[];for(let day=data.from;day<=data.to;day=M.addDays(day,1))days.push(M.dayInfo(day,data.employeeId,hrCalendar14306.config(),hrCalendar14306.state.rows,ApplicationSettings.payroll).fraction);return days;
}
function leaveApprovalData(record){
 hrCalendar14306.guard(false);const d=record.data,e=employee(d.employeeId);
 if(d.status!=='pending')throw Error('Only pending leave can be approved.');
 if(!e||e.data.active===false||e.data.archived)throw Error('Restore the employee before approving new leave.');
 const days=M.leaveDays(d.from,d.to,d.employeeId,hrCalendar14306.config(),hrCalendar14306.state.rows,ApplicationSettings.payroll),dayFractions=leaveDayFractions459(d);
 if(days<=0)throw Error('This request no longer contains working time. Cancel it or record new dates.');
 if(d.paid==='yes'&&Object.hasOwn(vacationLedger.types||{vacation:true},d.type)){
   const lines=vacationLedger.leaveLines({...d,days,dayFractions}).map(x=>({...x,type:d.type}));
   vacationLedger.check(e,lines,'',d.type);
   if(d.type==='minorSick')vacationLedger.check(e,lines,'','sick');
 }
 const {calendarBasis14306,...details}=d;
 return {...details,days,dayFractions,requestedDays14307:d.requestedDays14307??Number(d.days)};
}
function prepareLeaveRequest(data,recalculate=false){
 hrCalendar14306.guard(false);const e=employee(data.employeeId);
 if(!e||e.data.active===false||e.data.archived)throw Error('Select an active employee.');
 if(window.payrollWindow14334?.finalized(data.month,data.employeeId)||Work82.runs.some(r=>r.data.status==='finalized'&&r.data.month===data.month&&r.data.rows?.some(x=>x.employeeId===data.employeeId)))throw Error('Payroll is finalized for '+e.data.name+' in that month.');
 const days=M.leaveDays(data.from,data.to,data.employeeId,hrCalendar14306.config(),hrCalendar14306.state.rows,ApplicationSettings.payroll);
 if(days<=0)throw Error('No working time in the selected dates for '+e.data.name+'.');
 if(!recalculate&&Number(data.days)!==days)throw Error('The calendar changed. Review working days for '+e.data.name+'.');
 const {calendarBasis14306,...details}=data;return {...details,...(data.type==='absent'?{paid:'no'}:{}),days,dayFractions:leaveDayFractions459(data)};
}
function finishLeaveBatch(){document.getElementById('hrLeaveRequest459')?.remove();leaveOpen=false;hrCalendar14306.changed();}
function leaveForm(){const wrapper=document.createElement('div');wrapper.innerHTML=leaveForm82();const form=wrapper.firstElementChild;form.dataset.collapsed108='1';const picker=form.elements.employeeId;[...picker.options].forEach(o=>{const e=employee(o.value);if(!e||e.data.active===false||e.data.archived)o.remove()});const originalLabel=picker.closest('label'),employeeField=document.createElement('div');employeeField.className='leave-employee-field143154';while(originalLabel.firstChild)employeeField.append(originalLabel.firstChild);originalLabel.replaceWith(employeeField);picker.required=false;picker.hidden=true;picker.multiple=true;[...picker.options].forEach(o=>o.selected=false);employeeField.insertAdjacentHTML('beforeend','<details class="leave-employees143154"><summary data-leave-selection>Choose employees</summary><div>'+[...picker.options].map(o=>'<label><input type="checkbox" data-leave-employee="'+esc(o.value)+'" onchange="toggleLeaveEmployee82(this)"><span>'+esc(o.textContent)+'</span></label>').join('')+'</div></details><div data-leave-days role="status"></div>');form.querySelector('.notice82').textContent='Working days are calculated from the company calendar, excluding holidays and non-working days. Select one or more employees. Working days are calculated separately for each employee; half-days count as 0.5. Split requests that cross payroll months into separate records. Pending leave appears in Calendar; approved leave also appears in Attendance.';const days=form.elements.days;days.readOnly=true;days.step='0.5';days.required=false;days.closest('label').hidden=true;days.closest('label').querySelector('input').setAttribute('aria-label','Calculated working days');form.querySelector('.fields82').insertAdjacentHTML('beforeend',field82('Remind months before','reminderMonths14306',0,'number','min="0" max="12" required')+field82('Additional days before','reminderDays14306',7,'number','min="0" max="365" required'));return wrapper.innerHTML}
function bindLeaveForm459(f){
 const sync=()=>{try{const ids=leaveSelection82(f),counts=ids.map(id=>({name:employee(id)?.data.name||'Employee',days:M.leaveDays(f.elements.from.value,f.elements.to.value,id,hrCalendar14306.config(),hrCalendar14306.state.rows,ApplicationSettings.payroll)}));f.elements.days.value=counts[0]?.days||'';f.querySelector('[data-leave-days]').textContent=counts.map(x=>x.name+': '+x.days+' working day(s)').join(' · ');f.elements.month.value=f.elements.from.value.slice(0,7);syncLeaveEmployees82(f)}catch{f.elements.days.value='';f.querySelector('[data-leave-days]').textContent='Choose valid dates to calculate working days.'}};
 f.elements.from.onchange=sync;f.elements.to.onchange=sync;f.elements.employeeId.onchange=sync;
 f.elements.type.onchange=()=>{if(f.elements.type.value==='absent')f.elements.paid.value='no';};sync();
}
function newLeave459(){
 if(!admin())return;const existing=$('hrLeaveRequest459');if(existing?.dataset.owner===liveProfile.id){existing.showModal();return;}existing?.remove();
 const box=document.createElement('dialog');box.id='hrLeaveRequest459';box.dataset.owner=liveProfile.id;box.className='hr-dialog14306 hr-leave-request459';
 box.innerHTML='<header><h3>Leave Request Form</h3><button type="button" aria-label="Close">×</button></header><div class="hr-dialog-body14306">'+leaveForm()+'</div>';
 document.body.append(box);box.querySelector('header button').onclick=()=>box.close();bindLeaveForm459(box.querySelector('form'));box.showModal();
}
let leaveView466=null,historyFilter466={actor:null,client:null,employee:'',month:'',view:'records',page:0};
function leaveViewSignature466(){
 return [liveProfile?.id,ojmDb,Work82.owner,Work82.loaded,Work82.loading,Work82.error,today82(),Work82.employees,Work82.leaves,Work82.runs,Work82.leaveCarry14334,Work82.payrollIndex14334,
  ...[...Work82.employees,...Work82.leaves,...Work82.runs].flatMap(r=>[r.id,r.version,r.data]),
  hrCalendar14306.state.settings,hrCalendar14306.state.rows,hrCalendar14306.state.ready,JSON.stringify(ApplicationSettings.payroll),ApplicationSettings.system?.dateFormat,ApplicationSettings.system?.numberFormat];
}
function bindLeaveHistory466(root){
 const box=root.querySelector('.hr-history466');if(!box)return;
 if(historyFilter466.actor!==liveProfile.id||historyFilter466.client!==ojmDb)historyFilter466={actor:liveProfile.id,client:ojmDb,employee:'',month:'',view:'records',page:0};
 const controls={employee:box.querySelector('#leaveHistoryEmployee466'),month:box.querySelector('#leaveHistoryMonth466'),view:box.querySelector('#leaveHistoryView466')};
 const paint=()=>{
  const rows=leaveHistoryRows466(orderedEmployees82(),historyFilter466.view,historyFilter466.employee,historyFilter466.month),size=25,pages=Math.max(1,Math.ceil(rows.length/size));
  historyFilter466.page=Math.min(historyFilter466.page,pages-1);const start=historyFilter466.page*size;
  box.querySelector('[data-leave-history-table466]').innerHTML=leaveHistoryTable466(rows.slice(start,start+size),historyFilter466.view);
  box.querySelector('[data-history-count466]').textContent=rows.length?(start+1)+'–'+Math.min(start+size,rows.length)+' of '+rows.length:'0 records';
  box.querySelector('[data-history-prev466]').disabled=historyFilter466.page===0;box.querySelector('[data-history-next466]').disabled=historyFilter466.page===pages-1;
  window.workspaceViews14364?.remember('hr-leave');
 };
 for(const [key,control] of Object.entries(controls)){control.value=historyFilter466[key];if(control.selectedIndex<0){historyFilter466[key]=key==='view'?'records':'';control.value=historyFilter466[key];}control.onchange=()=>{historyFilter466[key]=control.value;historyFilter466.page=0;paint();};}
 box.querySelector('[data-history-prev466]').onclick=()=>{historyFilter466.page=Math.max(0,historyFilter466.page-1);paint();};box.querySelector('[data-history-next466]').onclick=()=>{historyFilter466.page++;paint();};paint();
}
function manageLeaveBalance(){
 const staff=orderedEmployees82().filter(e=>e.data.active!==false&&!e.data.archived);
 if(!admin()||!staff.length)return;
 const ledger=window.vacationLedger,today=M.today(),labels=ledger.types;
 let row=staff[0],mode='grant',years=[];
 const body=select82('Employee','employeeId',row.id,staff.map(e=>[e.id,e.data.name]))+
  '<div class="leave-mode489" role="group" aria-label="Balance action"><button type="button" data-mode="grant">Add leave days</button><button type="button" data-mode="extension">Extend earned vacation</button></div>'+
  '<div class="leave-entry489" data-entry></div><div class="leave-preview489" role="status" data-preview></div>'+
  field82('Approval reference or note (optional)','note','','text','maxlength="250"')+
  '<details class="leave-history489"><summary>Balance approvals</summary><div data-history></div></details>';
 const box=dialog('Manage leave balance',body,async form=>{
   if(!admin()||employee(row.id)!==row)throw Error('The employee record changed. Reopen the balance before saving.');
   const f=form.elements,ref=f.note.value.trim(),approvedOn=M.today();
   const input=mode==='grant'?{kind:mode,type:f.type.value,days:f.days.valueAsNumber,from:f.from.value,until:f.until.value}:
    {kind:mode,anniversary:f.year.value,effective:f.effective.value,months:f.months.valueAsNumber,...(f.priorUnused&&!f.priorUnused.disabled?{priorUnused:f.priorUnused.valueAsNumber}:{})};
   const approval={...ledger.approval(row,input,approvedOn),id:crypto.randomUUID(),by:liveProfile.id,note:ref};
   const saved=await saveEmployeeChange(row,{...row.data,leaveBalanceApprovals:[...(row.data.leaveBalanceApprovals||[]),approval]});
   renderLeave();showCenterStatus(saved._pending14333?'Leave balance saved on this device. Database confirmation is pending.':'Leave balance saved for '+row.data.name+'.');
 });
 box.classList.add('leave-balance489');
 const form=box.querySelector('form'),panel=box.querySelector('[data-entry]'),preview=box.querySelector('[data-preview]'),save=box.querySelector('[type=submit]');
 const fmt=n=>leaveDaysText466(n),date=value=>formatAppDate(value),option=(value,title)=>'<option value="'+esc(value)+'">'+esc(title)+'</option>';
 function updatePreview(){
   const f=form.elements;let message='';
   if(mode==='grant'){
     const balance=ledger.balance(row,today,[],'',f.type.value);
     message=labels[f.type.value]+' available today · '+fmt(balance?.available||0)+' days';
     if(f.from.value&&f.until.value&&f.days.valueAsNumber>0&&f.until.value>=f.from.value)
       message+=' · '+fmt(f.days.valueAsNumber)+' extra days usable '+date(f.from.value)+' – '+date(f.until.value);
   }else{
     const year=years.find(x=>x.end===f.year.value),months=f.months.valueAsNumber;
     if(year){
       f.priorUnused.closest('label').hidden=!year.needsConfirmation;
       f.priorUnused.disabled=!year.needsConfirmation;
       f.priorUnused.max=year.needsConfirmation?String(year.annual):'';
       message=year.needsConfirmation?'Confirm unused days for '+date(year.end)+'. '+(year.remaining!=null?'Remaining against allowance: '+fmt(year.remaining)+'. ':'')+(year.cached!=null?'Historical availability: '+fmt(year.cached)+'.':''):fmt(year.amount)+' unused earned days at the '+date(year.end)+' anniversary';
       if(Number.isSafeInteger(months)&&months>0&&months<=1200)message+=' · Last day to use them: '+date(M.addDays(ledger.addMonths(year.end,months),-1));}
   }
   preview.textContent=message;
 }
 function paint(){
   years=ledger.completed(row,today);
   const extend=box.querySelector('[data-mode="extension"]');extend.disabled=!years.length;
   if(extend.disabled)mode='grant';
   box.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
   if(mode==='grant'){
     panel.innerHTML=select82('Leave type','type','vacation',Object.entries(labels))+field82('Additional days','days','','number','min="0.001" step="0.001" required')+
      field82('Available from','from',today,'date','required')+field82('Use through','until','','date','required');
     form.elements.from.min=ledger.serviceStart(row.data,today)||'';
     form.elements.until.min=today;
   }else{
     panel.innerHTML='<label>Completed service year<select name="year">'+years.map(y=>option(y.end,'Year ending '+date(M.addDays(y.end,-1)))).join('')+'</select></label>'+
       field82('Months after anniversary','months','','number','min="1" step="1" required')+
       field82('Extension effective from','effective',years[0].end,'date','required min="'+years[0].end+'" max="'+today+'"')+
       field82('Verified unused days at year-end','priorUnused','','number','min="0.001" step="0.001" required');
   }
   const oldHint=box.querySelector('.leave-eligibility489');if(oldHint)oldHint.remove();
   if(!years.length){
     const hint=document.createElement('p');hint.className='leave-eligibility489';
     const start=ledger.serviceStart(row.data,today),first=M.valid(start)?ledger.addMonths(start,12):'';
     hint.textContent=first&&today<first?'First service year completes on '+date(first)+'. Earned vacation can be extended from that anniversary.':'Extensions require unused earned vacation from a completed service year.';
     box.querySelector('.leave-mode489').after(hint);
   }
   save.textContent=mode==='grant'?'Add leave days':'Save extension';
   const entries=[...(row.data.leaveBalanceApprovals||[])].reverse();
   const history=box.querySelector('[data-history]');
   history.replaceChildren();
   if(!entries.length)history.textContent='No balance approvals recorded.';
   for(const x of entries){
     const line=document.createElement('div'),label=document.createElement('strong'),detail=document.createElement('span');
     label.textContent=x.kind==='grant'?labels[x.type]+' · +'+fmt(x.days)+' days':'Vacation extension · '+x.months+' months';
     detail.textContent=x.kind==='grant'?date(x.from)+' – '+date(x.until):'Effective '+date(x.effective||x.approvedOn)+' · Use through '+date(M.addDays(ledger.addMonths(x.anniversary,x.months),-1));
     line.append(label,detail);if(x.note){const note=document.createElement('small');note.textContent=x.note;line.append(note);}history.append(line);
   }
   updatePreview();
 }
 for(const b of box.querySelectorAll('[data-mode]'))b.onclick=()=>{if(mode!==b.dataset.mode){mode=b.dataset.mode;paint();}};
 form.elements.employeeId.onchange=()=>{row=employee(form.elements.employeeId.value);mode='grant';form.elements.note.value='';paint();};
 panel.addEventListener('input',event=>{if(event.target.name==='year'){form.elements.priorUnused.value='';form.elements.effective.min=event.target.value;form.elements.effective.value=event.target.value;}if(mode==='grant')form.elements.until.min=form.elements.from.value;updatePreview();});
 paint();
}

function renderLeave(){
 if(!admin()){leaveView466=null;return;}
 const root=$('hr-leave');if(!root)return;
 const signature=leaveViewSignature466();
 if(leaveView466?.node===root.querySelector('.hr-leave-work466')&&signature.length===leaveView466.signature.length&&signature.every((v,i)=>v===leaveView466.signature[i])){hrCalendar14306.paintInbox();return;}
 if(Work82.owner&&Work82.owner!==liveProfile.id){leaveView466=null;mount82('hr-leave','Leave','','<p>Loading employee records…</p>');return;}
 const rows=[...Work82.leaves].sort((a,b)=>String(b.data.from).localeCompare(String(a.data.from))||employeeOrder82(a,b)),active=orderedEmployees82().filter(e=>e.data.active!==false&&!e.data.archived);
 const balances=section82('Leave Balances · days',leaveTable466(['Employee','Vacation available','Vacation used','Sick used','Personal used','Bereavement used','Current period begins'],active.map(leaveSummary82),[22,14,12,12,12,14,14],'hr-leave-balances466'),active.length?'<button type="button" data-hr-action="balance">Manage leave balance</button>':'');
 const records=section82('Leave Records',leaveTable466(['Employee','Dates','Type','Working days','Status','Action'],rows.map(r=>[esc(employee(r.data.employeeId)?.data.name||'Employee'),esc(formatAppDate(r.data.from)+' – '+formatAppDate(r.data.to)),esc(r.data.type==='absent'?'Time without pay':r.data.type),leaveDayNumber466(r.data.days),esc(r.data.rejected?'rejected':r.data.status),'<button type="button" data-leave-id="'+esc(r.id)+'">Details</button>']),[22,26,16,12,14,10],'hr-leave-records466'));
 mount82('hr-leave','Leave','Requests, approvals and employee leave balances (days).',storageNotice82()+'<section class="block82 hr-hub-inbox466" data-hub-inbox></section>'+balances+records+historicalLeaveHistory200('',true),'<button type="button" data-hr-action="print">Print Leave Report</button><button type="button" data-hr-action="blank">Print Blank Leave Form</button><button type="button" class="primary82" data-hr-action="add">Add Leave Request</button>');
 root.querySelector('.work82').classList.add('hr-leave-work466');hrCalendar14306.paintInbox();bindActions(root,{balance:manageLeaveBalance,add:newLeave459,print:()=>printLeave82(),blank:()=>printLeaveApplication97('')});root.querySelectorAll('[data-leave-id]').forEach(b=>b.onclick=()=>openLeave(b.dataset.leaveId));bindLeaveHistory466(root);
 leaveView466={node:root.querySelector('.hr-leave-work466'),signature};
}
function openLeave(id){const row=Work82.leaves.find(r=>r.id===id);if(!row||!admin())return;const d=row.data;let review='';if(d.status==='pending'&&hrCalendar14306.state.ready){try{const updated=leaveApprovalData(row);if(Number(d.days)!==updated.days)review='<p class="hr-review-note14307">The calendar now counts <strong>'+updated.days+' working day(s)</strong>. Approval will use this updated total; the original '+esc(d.days)+' day(s) remains recorded.</p>'}catch(error){review='<p class="hr-review-note14307">'+esc(error.message)+'</p>'}}const box=dialog('Leave Request','<p><strong>'+esc(employee(d.employeeId)?.data.name||'Employee')+'</strong></p><dl class="hr-detail14306"><dt>Dates</dt><dd>'+esc(formatAppDate(d.from)+' – '+formatAppDate(d.to))+'</dd><dt>Type / status</dt><dd>'+esc(d.type+' · '+(d.rejected?'rejected':d.status))+'</dd><dt>Working days</dt><dd>'+esc(d.days)+'</dd><dt>Treatment</dt><dd>'+esc(d.paid==='yes'?'Paid':'Unpaid')+'</dd><dt>Reason</dt><dd>'+esc(d.notes)+'</dd><dt>Supervisor consulted / coverage</dt><dd>'+esc(d.coverage459||'Not recorded')+'</dd><dt>Enough leave time</dt><dd>'+esc(d.enoughTime459||'Not recorded')+'</dd><dt>Time off accrued / used</dt><dd>'+esc(d.timeOff459||'Not recorded')+'</dd><dt>Supervisor comments</dt><dd>'+esc(d.supervisorComments459||'—')+'</dd></dl>'+review+'<div class="hr-row-actions14306">'+buttons([['Print Form','print'],...(d.status==='pending'?[['Review notes','notes'],['Approve','approve']]:[]),...(d.status!=='cancelled'?[[d.hub&&d.status==='pending'?'Reject':'Cancel Leave','cancel']]:[]),['Open Leave Tab','tab']])+'</div>');bindActions(box,{notes:()=>{box.close();editLeaveNotes459(id)},print:()=>{box.close();printLeaveApplication97(id)},approve:()=>{box.close();leaveStatus82(id,'approved')},cancel:()=>{box.close();leaveStatus82(id,'cancelled')},tab:()=>{box.close();switchTab('hr-leave')}})}

function editLeaveNotes459(id){
 const row=Work82.leaves.find(r=>r.id===id);if(!row||row.data.status!=='pending'||!admin())return;
 dialog('Supervisor Review Notes','<label>Comments<textarea name="comments" rows="4" maxlength="1000">'+esc(row.data.supervisorComments459||'')+'</textarea></label>'+field82('Supervisor signature date (optional)','date',row.data.supervisorDate459||'','date'),async f=>{
  if(Work82.leaves.find(r=>r.id===id)!==row)throw Error('This request changed. Open it again.');
  await saveWork82('leaves',{...row.data,supervisorComments459:f.elements.comments.value.trim(),supervisorDate459:f.elements.date.value},row);renderLeave();
 });
}
