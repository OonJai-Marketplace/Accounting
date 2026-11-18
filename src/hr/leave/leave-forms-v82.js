// Leave values are day counts, independent of accounting decimal precision.
function leaveDaysText466(value){if(value==null||!Number.isFinite(Number(value)))return '—';return Number(value).toLocaleString(typeof appNumberLocale==='function'?appNumberLocale():'en-US',{maximumFractionDigits:3});}
function leaveDayNumber466(value){return '<span class="leave-days466">'+leaveDaysText466(value)+'</span>';}
function leaveTable466(headers,rows,widths,kind=''){
 return '<div class="data-table82"><table class="hr-table466 '+kind+'" data-fixed-columns466 data-plain-number><colgroup>'+widths.map(w=>'<col style="width:'+w+'%">').join('')+'</colgroup><thead><tr>'+headers.map(h=>'<th scope="col">'+esc82(h)+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(row=>'<tr>'+row.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+headers.length+'" class="hr-empty466">No matching records.</td></tr>')+'</tbody></table></div>';
}
function leaveHistoryRows466(employees,view='records',employeeId='',month=''){
 const rows=[];
 for(const e of employees){if(employeeId&&e.id!==employeeId)continue;const h=e.data.leaveHistory200;if(!h)continue;
  const values=view==='records'?h.records||[]:[...(h.closedPeriods||[]),...(h.snapshots||[])];
  for(const data of values){const date=view==='records'?data.from:data.sourceMonth||data.end||data.sourcePeriodDate||'';
   if(month&&(view==='records'?(String(data.from||'').slice(0,7)>month||String(data.to||data.from||'').slice(0,7)<month):String(date).slice(0,7)!==month))continue;
   rows.push({employee:e,data,date});
  }
 }
 return rows.sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.employee.data.name).localeCompare(String(b.employee.data.name)));
}
function leaveHistoryTable466(rows,view='records'){
 const date=v=>v?esc82(formatAppDate(v)):'—',fmt=leaveDayNumber466;
 if(view==='records')return leaveTable466(['Employee','From','To','Leave type','Days','Informed / form','Reason / notes'],rows.map(({employee:e,data:r})=>[esc82(e.data.name),date(r.from),date(r.to),esc82(r.type==='absent'?'Time without pay':r.type),fmt(r.days),(r.informed?'Yes':'No')+' / '+(r.formReceived?'Yes':'No'),esc82(r.notes||'—')]),[19,11,11,13,7,12,27],'hr-history-records466');
 return leaveTable466(['Employee','Month / period end','Entitlement start','Vacation used / allowance','Sick used / allowance','Personal used / allowance','Bereavement used / allowance','Vacation remaining'],rows.map(({employee:e,data:s})=>[esc82(e.data.name),esc82(s.sourceMonth||'')+(s.endConfirmed?'<br><small>Ended '+date(s.end)+'</small>':''),date(s.sourcePeriodDate),...['vacation','sick','personal','bereavement'].map(k=>fmt(s.used?.[k])+' / '+fmt(s.allowance?.[k])),fmt(s.remainingAgainstAllowance?.vacation)]),[18,12,12,12,12,11,12,11],'hr-history-balances466');
}
function historicalLeaveHistory200(onlyId='',interactive=false){
 const employees=orderedEmployees82().filter(e=>(!onlyId||e.id===onlyId)&&e.data.leaveHistory200);
 if(!employees.length)return '';
 if(!interactive)return section82('Leave History',leaveHistoryTable466(leaveHistoryRows466(employees))+leaveHistoryTable466(leaveHistoryRows466(employees,'balances'),'balances'));
 const months=[...new Set(employees.flatMap(e=>{const h=e.data.leaveHistory200;return [...(h.records||[]).flatMap(r=>[r.from,r.to]),...(h.snapshots||[]).map(s=>s.sourceMonth),...(h.closedPeriods||[]).map(s=>s.sourceMonth||s.end)].filter(Boolean).map(d=>d.slice(0,7));}))].sort().reverse();
 return '<section class="block82 hr-history466"><header><h4>Leave History</h4></header><div class="hr-history-filters466">'+
 '<label for="leaveHistoryEmployee466">Employee<select id="leaveHistoryEmployee466"><option value="">All employees</option>'+employees.map(e=>'<option value="'+esc82(e.id)+'">'+esc82(e.data.name)+'</option>').join('')+'</select></label>'+
 '<label for="leaveHistoryMonth466">Month<select id="leaveHistoryMonth466"><option value="">All months</option>'+months.map(m=>'<option value="'+esc82(m)+'">'+esc82(m)+'</option>').join('')+'</select></label>'+
 '<label for="leaveHistoryView466">View<select id="leaveHistoryView466"><option value="records">Leave taken</option><option value="balances">Monthly balances</option></select></label></div><div data-leave-history-table466></div><footer class="hr-history-pages466"><span data-history-count466 role="status"></span><button type="button" data-history-prev466>Previous</button><button type="button" data-history-next466>Next</button></footer></section>';
}
window.historicalLeaveHistory200=historicalLeaveHistory200;
function leaveSummary82(e){const d=e.data,leaves=Work82.leaves.filter(r=>r.data.employeeId===e.id&&r.data.status==='approved'&&r.data.from>=d.renewal),used=k=>leaves.filter(r=>r.data.type===k||(k==='sick'&&r.data.type==='minorSick')).reduce((s,r)=>s+Number(r.data.days),0);return [esc82(d.name),leaveDayNumber466(Number(d.vacation)-used('vacation')),leaveDayNumber466(used('vacation')),leaveDayNumber466(used('sick')),leaveDayNumber466(used('personal')),leaveDayNumber466(used('bereavement')),esc82(d.renewal?formatAppDate(d.renewal):'')]}
function leaveForm82(){return `<form id="leaveForm82" onsubmit="event.preventDefault();saveLeave82()"><div class="fields82">${select82('Employees','employeeId','',orderedEmployees82().filter(e=>e.data.active!==false&&!e.data.archived).map(e=>[e.id,e.data.name])).replace('<select','<select multiple size=\"4\"')}${select82('Leave type','type','vacation',['vacation','sick','personal','bereavement','absent','other'].map(x=>[x,x==='absent'?'Time without pay':x[0].toUpperCase()+x.slice(1)]))}${field82('From','from',today82(),'date','required')}${field82('Through','to',today82(),'date','required')}${field82('Working days / fraction','days','','number','min="0.125" step="0.125" required')}${field82('Apply to payroll month','month',today82().slice(0,7),'month','required')}${select82('Payment treatment','paid','yes',[['yes','Paid — no salary deduction'],['no','Unpaid — deduct working days']])}${field82('Form / supporting reference','reference','','text','required')}${field82('Explanation','notes','','text','required')}${field82('Time off accrued / used (optional)','timeOff459','','text','maxlength="200"')}${select82('Supervisor consulted and absence covered','coverage459','',[['','Not recorded'],['yes','Yes'],['no','No']])}${select82('Enough time available for this request','enoughTime459','',[['','Not recorded'],['yes','Yes'],['no','No']])}${field82('Employee signature date (optional)','employeeDate459','','date')}${check82('Employee informed management','informed',false)}${check82('Leave form received','formReceived',false)}</div><p class="notice82">Enter actual working days; holidays and weekends are not counted automatically. Split leave crossing payroll months into separate records. Approval makes unpaid days available to that payroll month.</p><div class="form-actions82"><button type="submit" class="primary82">Save Leave Request</button></div></form>`}
function leaveSelection82(form){return [...form.elements.employeeId.selectedOptions].map(o=>o.value).filter(Boolean)}
function syncLeaveEmployees82(form){const select=form.elements.employeeId,ids=leaveSelection82(form);form.querySelectorAll('[data-leave-employee]').forEach(box=>box.checked=ids.includes(box.dataset.leaveEmployee));const title=form.querySelector('[data-leave-selection]');if(title)title.textContent=ids.length?ids.length+' employee'+(ids.length===1?'':'s')+' selected':'Choose employees';}
function toggleLeaveEmployee82(box){const form=box.closest('form'),option=[...form.elements.employeeId.options].find(o=>o.value===box.dataset.leaveEmployee);if(option)option.selected=box.checked;syncLeaveEmployees82(form);form.elements.employeeId.dispatchEvent(new Event('change',{bubbles:true}));}
function saveLeave82(){const form=document.getElementById('leaveForm82'),d=form82('leaveForm82');if(!d)return;const ids=leaveSelection82(form),actor=liveProfile?.id,client=ojmDb;delete d[''];const guard=()=>{if(!actor||actor!==liveProfile?.id||client!==ojmDb)throw Error('The signed-in account changed. Reopen Leave before continuing.');};return runAction82(async()=>{
 guard();
 if(!ids.length)throw Error('Select at least one employee.');
 if(d.from>d.to)throw Error('End date must follow the start date.');
 if(d.from.slice(0,7)!==d.month||d.to.slice(0,7)!==d.month)throw Error('Split leave across months before saving.');
 const duration=(Date.parse(d.to)-Date.parse(d.from))/86400000+1;
 const requests=ids.map(employeeId=>{const e=Work82.employees.find(e=>e.id===employeeId);if(!e||e.data.active===false||e.data.archived)throw Error('Select active employees only.');
 if(Work82.leaves.some(r=>r.data.employeeId===employeeId&&r.data.status!=='cancelled'&&d.from<=r.data.to&&d.to>=r.data.from))throw Error('Overlapping leave for '+e.data.name+'. No new requests were saved.');
 let data={...d,employeeId,status:'pending'};if(window.hrWorkspace14306?.prepareLeaveRequest)data=hrWorkspace14306.prepareLeaveRequest(data,true);
 if(!Number.isFinite(Number(data.days))||Number(data.days)<=0||Number(data.days)>duration)throw Error('Review working days for '+e.data.name+'.');return {name:e.data.name,data};});
 const saved=[],waiting=[];window.leaveBatchSaving82=true;
 try{for(const request of requests){guard();const result=await saveWork82('leaves',request.data);guard();saved.push(request.name);if(result._pending14333)waiting.push(request.name);const option=[...form.elements.employeeId.options].find(o=>o.value===request.data.employeeId);if(option)option.selected=false;syncLeaveEmployees82(form)}}
 catch(error){guard();throw Error((saved.length?'Retained requests for '+saved.join(', ')+(waiting.length?'. Waiting for database confirmation: '+waiting.join(', '):'. Database confirmed')+'. Do not re-enter those requests. Remaining employees are still selected; retry saves only those remaining. ':'No requests saved. ')+(error.message||error))}
 finally{window.leaveBatchSaving82=false;}
 window.hrWorkspace14306?.finishLeaveBatch?.();renderWork82();showCenterStatus(waiting.length?'Leave for '+waiting.join(', ')+': waiting for database confirmation. '+(saved.length-waiting.length)+' confirmed. Open Synchronization; do not enter these requests again.':saved.length+' leave request'+(saved.length===1?'':'s')+' saved to company records for review.');
})}

function leaveStatus82(id,status){runAction82(async()=>{const r=Work82.leaves.find(x=>x.id===id);if(!r)return;if(window.payrollWindow14334?.finalized(r.data.month,r.data.employeeId)||Work82.runs.some(run=>run.data.status==='finalized'&&run.data.month===r.data.month&&run.data.rows.some(x=>x.employeeId===r.data.employeeId)))throw Error('That month has finalized payroll. Record the correction in a new payroll period.');const data=status==='approved'&&window.hrWorkspace14306?hrWorkspace14306.leaveApprovalData(r):r.data;const decision=data.hub&&status==='cancelled'&&r.data.status==='pending'?{hub:true,rejected:true,employeeId:data.employeeId,type:data.type,from:data.from,to:data.to,month:data.month,status}:{...data,status};await saveWork82('leaves',decision,r);renderWork82()})}

function closeLeavePeriod200(e,contract,outcome){
 const start=e.data.renewal||contract.start,end=outcome.date,types=['vacation','sick','personal','bereavement'],used={},allowance={},remainingAgainstAllowance={};
 for(const type of types){
  const matches=t=>t===type||type==='sick'&&t==='minorSick';
  const records=Work82.leaves.filter(l=>l.data.employeeId===e.id&&l.data.status==='approved'&&l.data.from>=start&&l.data.from<=end&&matches(l.data.type)).reduce((n,l)=>n+Number(l.data.days||0),0);
  const attendance=Work82.runs.filter(r=>r.data.status==='finalized'&&!r.data.isSample).reduce((n,r)=>n+(r.data.results||[]).filter(x=>x.employeeId===e.id).reduce((v,x)=>v+(x.attendance95||[]).filter(d=>!d.linked&&d.date>=start&&d.date<=end&&matches(d.leaveType)).reduce((v,d)=>v+Number(d.scheduleFraction??1),0),0),0);
  used[type]=records+attendance+(Work82.leaveCarry14334||[]).filter(r=>!Work82.runs.some(run=>run.id===r.runId)&&r.employeeId===e.id&&r.date>=start&&r.date<=end&&matches(r.type)).reduce((n,r)=>n+Number(r.days||0),0);allowance[type]=Number(e.data[type]||0);remainingAgainstAllowance[type]=allowance[type]-used[type];
 }
 const prior=e.data.leaveHistory200||{records:[],snapshots:[]};
 return {...prior,closedPeriods:[...(prior.closedPeriods||[]).filter(p=>p.contractId!==contract.id),{contractId:contract.id,sourceMonth:end.slice(0,7),sourcePeriodDate:start,end,endConfirmed:true,dateMeaning:'Closed entitlement period',used,allowance,remainingAgainstAllowance,source:'Contract outcome: '+outcome.status,sourceRange:contract.title}]};
}
window.closeLeavePeriod200=closeLeavePeriod200;
