const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const config={workDays:22,hours:8,grace:5,penaltyGrace:5,overtime:1.5,latePenaltyFirst:3000,latePenaltySecond:5000,latePenaltyThird:7000,employeeSso:5.5,employerSso:6,ssoCap:null,sharing:'equal',brackets:[{from:0,to:2500000,rate:0},{from:2500000,to:null,rate:5}]};
const c={structuredClone,console,Intl,Date,ApplicationSettings:{payroll:{}},Work82:{leaves:[],employees:[]},testConfig:config,employeeOrder82:()=>0,esc82:String,money82:String,formatAppDate:String};c.window=c;vm.createContext(c);
vm.runInContext(read('src/hr/calendar/hr-calendar-model14306.js'),c);
const M=c.HRCalendarModel14306,schedule=M.scheduleDefaults({nonWorkDays99:[0,6]});
schedule.schedules.push({from:'2026-10-19',days:Array.from({length:7},(_,day)=>({day,work:day!==6,fraction:1,start:'08:00',end:'17:00'}))});
let events=[];c.hrCalendar14306={day:(date,id)=>M.dayInfo(date,id,schedule,events,{})};
vm.runInContext(read('src/payroll/engine/payroll-engine-v82.js')+'\npayrollConfig82=()=>testConfig;',c);
vm.runInContext(read('src/bridges/hr-payroll/attendance-v96/scope-and-state.js')+read('src/bridges/hr-payroll/attendance-v96/legend-and-marks.js')+read('src/bridges/hr-payroll/attendance-v96/approved-leave-and-days.js')+read('src/payroll/engine/results-v96.js')+'\nwindow.test234={results,dayResults,legends};})();',c);

const row={employeeId:'e',employee:{name:'Employee',salary:2200000,currency:'LAK',renewal:'2026-01-01',pit:false,sso:false},input:{attendance:[]}};
const run={month:'2026-10',status:'draft',rates:{LAK:1},rows:[row]};
const calc=()=>c.test234.results(run)[0];
events=[{id:'holiday',data:{start:'2026-10-26',end:'2026-10-27',type:'holiday',effect:'off',status:'completed',title:'Company holiday'}}];
let x=calc();assert.equal(x.paidLeaveDays,2);assert.equal(x.paidLeaveValue,200000);assert.equal(x.gross,2200000);
row.input.attendance=[{date:'2026-10-26',mark95:'H'},{date:'2026-10-27',mark95:'H'},{date:'2026-10-02',mark95:'EX:149'}];
x=calc();assert.equal(x.paidLeaveDays,2);assert.equal(x.attendance95.find(d=>d.mark==='EX:149').paidDays,0);assert.equal(x.late,0);assert.equal(x.latePenalty,0);assert.equal(x.gross,2200000);
c.Work82.leaves=[{data:{employeeId:'e',month:run.month,from:'2026-10-09',to:'2026-10-09',days:1,status:'approved',paid:'yes',type:'vacation'}},{data:{employeeId:'e',month:run.month,from:'2026-10-12',to:'2026-10-14',days:3,status:'approved',paid:'yes',type:'vacation'}}];
x=calc();assert.equal(x.paidLeaveDays,6);assert.equal(x.paidLeaveValue,600000);
row.input.attendance=[{date:'2026-10-26',mark95:'0'},{date:'2026-10-27',mark95:'0'}];assert.equal(calc().paidLeaveDays,6);
row.input.attendance.push({date:'2026-10-09',mark95:'L'});assert.equal(calc().paidLeaveDays,6);
c.Work82.leaves=[];row.input.attendance=Array.from({length:16},(_,i)=>({date:'2026-10-'+String(i+1).padStart(2,'0'),mark95:'EX'}));assert.equal(calc().paidLeaveDays,2);assert.equal(calc().gross,2200000);
// A regular weekend is not an extra holiday; employee-specific and cancelled events do not apply.
events[0].data.employeeIds=['someone-else'];assert.equal(calc().paidLeaveDays,0);delete events[0].data.employeeIds;events[0].data.status='cancelled';assert.equal(calc().paidLeaveDays,0);
events[0].data.status='completed';row.employee.renewal='2026-10-27';assert.equal(calc().paidLeaveDays,1);
const historical={...run,status:'finalized',results:[{employeeId:'e',paidLeaveDays:7,paidLeaveValue:700000,paidAmount:123456}],historicalImport199:null};assert.equal(c.test234.results(historical)[0].paidLeaveDays,7);assert.equal(c.test234.results(historical)[0].paidAmount,123456);
assert.equal(c.test234.legends().find(r=>r.code==='EX').description,'Excused late');
console.log('PASS paid calendar holidays, legacy H marks without duplication, approved leave, zero placeholders, EX separation, employment dates, targeting/cancellation and immutable finalized results');
if(process.env.PAYROLL_EVIDENCE246){
 const evidence=JSON.parse(read(process.env.PAYROLL_EVIDENCE246));Object.assign(schedule,evidence.settings);events=evidence.events;c.Work82.leaves=evidence.leaves;
 const results=c.test234.results(evidence.run);for(const x of results)console.log(JSON.stringify({name:x.employee.name,paidDays:x.paidLeaveDays,paidValue:x.paidLeaveValue,excusedDays:x.attendance95.filter(d=>String(d.mark).startsWith('EX')).length}));
 for(const x of results)assert.equal(x.paidLeaveDays,x.employee.name.includes('Romel')?6:2);
}
