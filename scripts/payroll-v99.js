/* v99: one employee roster, employee-by-day attendance, shared calendar rules. */
(function(){
'use strict';
const esc=v=>escapeHtml(String(v??''));
const money=v=>formatAppNumber(Number(v||0));
const daysOfWeek=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function shortName(name){const words=String(name||'').trim().split(/\s+/).filter(Boolean);return words.length>1?words[0][0].toUpperCase()+'. '+words[words.length-1]:String(name||'')}
window.syncPayrollRoster99=function(){
 const run=Work82.run;if(!run||run.status==='finalized'||!Work82.loaded)return;
 const previous=new Map([...(run.inactiveRows99||[]),...(run.rows||[])].map(r=>[r.employeeId,r]));
 const activeIds=new Set(Work82.employees.filter(e=>e.data.active!==false&&!e.data.archived).map(e=>e.id));run.inactiveRows99=[...previous.values()].filter(r=>!activeIds.has(r.employeeId));
 run.rows=Work82.employees.filter(e=>e.data.active!==false&&!e.data.archived).map(e=>{
  const old=previous.get(e.id);return {...(old||{}),employeeId:e.id,employee:structuredClone(e.data),input:old?.input||{attendance:[],absentDays:0,penalty:0,otherDeduction:0,allowance:0,reimbursement:0,advance:0}};
 });
};
window.openPayroll99=async function(){
 await loadWork82();if(Work82.error)return;
 const month=document.getElementById('overviewPayrollMonth97')?.value||new Date().toISOString().slice(0,7);
 payroll95.selectMonth(month);syncPayrollRoster99();switchTab('payroll-entries');renderWork82();
};
function calendar(run){const [y,m]=run.month.split('-').map(Number);return Array.from({length:new Date(y,m,0).getDate()},(_,i)=>({day:i+1,date:run.month+'-'+String(i+1).padStart(2,'0'),weekday:new Date(y,m-1,i+1).getDay()}))}
function nonWork(run){return run.status==='finalized'?(run.nonWorkDays99||run.settingsSnapshot?.payroll?.nonWorkDays99||[]):(ApplicationSettings.payroll.nonWorkDays99||[])}
function status(run,row,day){
 const a=(row.input.attendance||[]).find(a=>a.date===day.date);
 const rules=run.status==='finalized'?(run.legendSnapshot95||[]):payroll95.legends();
 let parsed={minutes:0,rule:null};try{parsed=payroll95.parseMark(a?.mark95??a?.late??0,rules)}catch(_){}
 const leave=(run.status==='finalized'?(run.leaveSnapshot||[]):Work82.leaves.map(l=>l.data)).find(l=>l.employeeId===row.employeeId&&l.status==='approved'&&day.date>=l.from&&day.date<=l.to);
 let rule=parsed.rule;
 if(!a&&leave)rule=rules.find(r=>r.leaveType===leave.type)||{color:'#6366f1',description:leave.type};
 const off=nonWork(run).includes(day.weekday),absent=rule?.code==='A';
 const kind=absent?'Absent':rule?'Leave / legend':parsed.minutes>0?'Late':off&&!a?'Non-work day':'Present';
 const color=rule?.color||(absent?'#dc2626':parsed.minutes>0?'#f59e0b':'#22a06b');
 return {kind,color,off,minutes:parsed.minutes||0,label:(rule?.description||kind)+(off?' · non-work day':'')+(a?' · manually entered':''),a};
}
function calculations(run){const map=new Map();for(const row of run.rows){try{const saved=run.results?.find(r=>r.employeeId===row.employeeId);map.set(row.employeeId,run.status==='finalized'?(saved?.attendance95||[]):payroll95.dayResults(run,row,payrollConfig82(),payroll95.legends()))}catch(_){map.set(row.employeeId,null)}}return map}
function summary(run,dates,computed){
 const rows=run.rows.map(row=>{const counts={Present:0,Late:0,Absent:0,'Leave / legend':0};let minutes=0;
 dates.forEach(day=>{const s=status(run,row,day);if(s.kind in counts)counts[s.kind]++;minutes+=s.minutes});
 const calc=computed.get(row.employeeId);return `<tr><th scope="row">${esc(row.employee.name)}</th><td>${counts.Present}</td><td>${counts.Late}</td><td>${counts.Absent}</td><td>${counts['Leave / legend']}</td><td>${money(minutes)}</td><td>${calc?money(calc.reduce((n,d)=>n+d.amount,0))+' ₭':'Rates / inputs needed'}</td></tr>`;
 }).join('');
 return `<section class="attendance-summary99"><h4>Attendance Summary</h4><div class="data-table82"><table><thead><tr><th>Employee</th><th>Present</th><th>Late</th><th>Absent</th><th>Leave / legend</th><th>Total late minutes</th><th>Attendance deductions</th></tr></thead><tbody>${rows}</tbody></table></div><small>Green is the default attendance status. Non-work days are excluded from default present counts. Deduction amounts follow the saved payroll rules.</small></section>`;
}
window.renderAttendance99=function(run,readonly=false){
 const dates=calendar(run),computed=calculations(run),rules=run.status==='finalized'?(run.legendSnapshot95||[]):payroll95.legends();
 return `<div class="attendance-toolbar99"><span><label for="hrAttendanceMonth101">Month</label> <input type="month" id="hrAttendanceMonth101" value="${esc(run.month)}" onchange="changeHrAttendanceMonth101(this.value)"> · Select a day cell to edit its attendance.</span><button type="button" class="je-btn je-btn-secondary" onclick="openAttendanceLegend101()">Legend</button></div><div class="attendance-scroll99"><table class="attendance-grid99" style="--days99:${dates.length}"><thead><tr><th scope="col">Employee</th>${dates.map(d=>`<th scope="col" class="${nonWork(run).includes(d.weekday)?'nonwork99':''}" title="${daysOfWeek[d.weekday]}">${d.day}</th>`).join('')}</tr></thead><tbody>${run.rows.map((row,i)=>`<tr><th scope="row" title="${esc(row.employee.name)}">${esc(shortName(row.employee.name))}</th>${dates.map(day=>{const s=status(run,row,day);return `<td class="${s.off?'nonwork99':''}"><button type="button" class="attendance-cell101" style="--dot-color:${esc(s.color)}" title="${esc(row.employee.name+' · '+day.date+' · '+s.label+(s.minutes?' · '+s.minutes+' minutes':''))}" aria-label="${esc(row.employee.name+' '+day.date+' '+s.label)}" ${readonly?'disabled':`onclick="payDay95(${i},'${day.date}')"`}><i class="attendance-dot99" aria-hidden="true"></i></button></td>`}).join('')}</tr>`).join('')}</tbody></table></div>${summary(run,dates,computed)}`;
};
window.changeHrAttendanceMonth101=function(month){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return;payroll95.selectMonth(month);syncPayrollRoster99();renderWork82();renderHr99()};
window.openAttendanceLegend101=function(){document.getElementById('attendanceLegend101')?.remove();const rules=Work82.run?.status==='finalized'?(Work82.run.legendSnapshot95||[]):payroll95.legends();const box=document.createElement('div');box.id='attendanceLegend101';box.className='pay-overlay95';box.innerHTML=`<section class="pay-dialog95 attendance-legend-dialog101" role="dialog" aria-modal="true" aria-labelledby="attendanceLegendTitle101"><header><h3 id="attendanceLegendTitle101">Attendance Legend</h3><button type="button" aria-label="Close">×</button></header><div class="attendance-legend-list101">${[['#22a06b','Present'],['#f59e0b','Late'],['#dc2626','Absent'],...rules.filter(r=>r.code!=='A').map(r=>[r.color,r.description])].map(([color,label])=>`<div><i style="background:${esc(color)}"></i><span>${esc(label)}</span></div>`).join('')}<div><i class="muted-dot101"></i><span>Muted: non-work day</span></div></div><p>Change legend colors and non-work days in Settings → Payroll.</p></section>`;document.body.append(box);box.querySelector('header button').onclick=()=>box.remove();box.addEventListener('click',e=>{if(e.target===box)box.remove()});box.querySelector('header button').focus()};
window.renderPayrollAttendanceSummary101=function(run){const computed=calculations(run);const lines=run.rows.flatMap(row=>(row.input.attendance||[]).filter(a=>String(a.mark95??a.late??0)!=='0'||a.note||a.override95).map(a=>{const daily=computed.get(row.employeeId)?.find(x=>x.date===a.date);let rule={rule:null,minutes:0};try{rule=payroll95.parseMark(a.mark95??a.late??0,run.status==='finalized'?(run.legendSnapshot95||[]):payroll95.legends())}catch(_){}return `<tr><td>${esc(a.date)}</td><td>${esc(row.employee.name)}</td><td>${esc(rule.rule?.description||a.note||'Late')} · ${esc(rule.minutes||0)} minutes</td><td>${daily?money(daily.amount)+' ₭':'Pending'}</td></tr>`}));return `<section class="pay-attendance-summary101"><h4>Attendance deductions</h4><div class="data-table82"><table><thead><tr><th>Date</th><th>Employee</th><th>Reason / minutes</th><th>Deduction</th></tr></thead><tbody>${lines.join('')||'<tr><td colspan="4">No attendance deductions recorded for this month.</td></tr>'}</tbody></table></div></section>`};
window.printPayrollBody99=function(run){
 const computed=calculations(run);let total=0,complete=true;const printed=document.createElement('template');printed.innerHTML=payroll95.groupedTables(run,false,'print');printed.content.querySelector('[data-group95$="-internal"]')?.remove();printed.content.querySelectorAll('details').forEach(d=>d.open=true);
 const rows=run.rows.flatMap(row=>(row.input.attendance||[]).filter(a=>String(a.mark95??a.late??0)!=='0'||a.note||a.override95).map(a=>{
 const d=computed.get(row.employeeId)?.find(d=>d.date===a.date);if(d)total+=d.amount;else complete=false;
 return {date:a.date,html:`<tr><td>${esc(a.date)}</td><td>${esc(row.employee.name)}</td><td>${esc(a.mark95??a.late??0)}${a.note?' · '+esc(a.note):''}</td><td>${d?money(d.amount)+' ₭':'Pending'}</td></tr>`};})).sort((a,b)=>a.date.localeCompare(b.date));
 const extra=run.rows.map(row=>{let x;try{x=payroll95.results({...run,rows:[row]})[0]}catch(_){}const daily=computed.get(row.employeeId)?.reduce((n,d)=>n+d.amount,0);if(!x||daily===undefined)return '';const remainder=x.late+x.absence+x.penalty+x.other-daily;if(Math.abs(remainder)<.005)return '';total+=remainder;return `<tr><td>${esc(run.month)}</td><td>${esc(row.employee.name)}</td><td>Other internal deductions / approved leave · ${esc(row.input.note||'')}</td><td>${money(remainder)} ₭</td></tr>`}).join('');
 return `<style>table{width:100%;border-collapse:collapse;font-size:10px}th,td{padding:4px;border-bottom:1px solid #ddd}thead{display:table-header-group}tr{break-inside:avoid}.pay-group95{margin:4px 0}.pay-group95 summary{font-weight:bold;padding:5px}input,button{display:none}</style><p>${esc(run.reference)} · ${esc(run.month)}</p>${printed.innerHTML}<h3>Attendance & Internal Deduction Detail</h3><table><thead><tr><th>Date</th><th>Employee</th><th>Reason / late minutes</th><th>Deduction</th></tr></thead><tbody>${rows.map(r=>r.html).join('')}${extra||''}</tbody><tfoot><tr><th colspan="3">Total</th><td>${complete?money(total)+' ₭':'Pending calculation'}</td></tr></tfoot></table>`;
};
window.openCalendar99=function(){
 document.getElementById('calendar99')?.remove();const root=document.createElement('div');root.id='calendar99';root.className='pay-overlay95';
 root.innerHTML=`<section class="pay-dialog95" role="dialog" aria-modal="true" aria-label="Weekly non-work days"><header><h3>Weekly Non-work Days</h3><button type="button" aria-label="Close">×</button></header><form><p>These days are muted in attendance. Existing attendance and saved payroll snapshots are preserved.</p>${daysOfWeek.map((d,i)=>`<label class="check82"><input type="checkbox" name="day" value="${i}" ${(ApplicationSettings.payroll.nonWorkDays99||[]).includes(i)?'checked':''}>${d}</label>`).join('')}<footer><button class="primary82">Save Days</button></footer></form></section>`;
 document.body.append(root);root.querySelector('header button').onclick=()=>root.remove();root.querySelector('form').onsubmit=e=>{e.preventDefault();ApplicationSettings.payroll.nonWorkDays99=[...new FormData(e.target).getAll('day')].map(Number);localStorage.setItem(APP_SETTINGS_KEY,JSON.stringify(ApplicationSettings));root.remove();renderWork82();showCenterStatus('Non-work days saved in the shared attendance settings for this browser.');};
};
window.addEventListener('DOMContentLoaded',()=>{
 const oldRender=renderWork82;window.renderWork82=function(...args){syncPayrollRoster99();const out=oldRender.apply(this,args);const f=document.querySelector('[data-settings-group=payroll]');if(f&&!f.querySelector('[data-calendar99]')){const b=document.createElement('button');b.type='button';b.dataset.calendar99='';b.className='je-btn je-btn-secondary';b.textContent='Weekly Non-work Days';b.onclick=openCalendar99;f.append(b)}return out;};
 const oldDay=payDay95;window.payDay95=function(i,date){oldDay(i,date);const form=document.querySelector('#payDay95 form');if(!form)return;
 const mark=form.elements.mark,parsed=payroll95.parseMark(mark.value),label=document.createElement('label');label.textContent='Attendance status';
 const select=document.createElement('select');select.innerHTML='<option value="">Present</option><option value="late">Late</option>'+payroll95.legends().map(r=>`<option value="${esc(r.code)}">${esc(r.description)}</option>`).join('');select.value=parsed.rule?.code||(parsed.minutes?'late':'');label.append(select);mark.closest('label').before(label);
 const late=document.createElement('label');late.innerHTML='<span>Late minutes</span><input type="number" min="0" step="1">';const input=late.querySelector('input');input.value=parsed.minutes||'';label.after(late);mark.closest('label').hidden=true;
 function sync(){late.hidden=select.value==='' ;mark.value=select.value==='late'?String(Number(input.value)||0):select.value?select.value+(Number(input.value)>0?':'+Number(input.value):''):'0'}select.onchange=sync;input.oninput=sync;sync();
 };
});
})();
