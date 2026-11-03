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

const row={employeeId:'editable',employee:{name:'Editable employee',code:'B01',salary:5000000,currency:'LAK',pit:false,sso:false},input:{attendance:[],advance:900000,note:'Salary advance recovery, October payroll: 900,000 LAK.\nAdditional advance supported by the cash record.'}};
const run={month:'2026-10',status:'draft',rates:{LAK:1},rows:[row]};
const report=read('src/reports/financial/reports14254.js');
const v={num:value=>Number(value)||0,money:value=>Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})};vm.createContext(v);vm.runInContext(report.slice(report.indexOf('function checkVoucherAdvance252('),report.indexOf('function voucher(')),v);
for(const amount of [900000,3500000,1200000,0,3750000]){
 row.input.advance=amount;const before=JSON.stringify(run);const x=c.test234.results(run)[0];
 assert.equal(x.cashAdvance,amount);assert.equal(x.paidAmount,5000000-amount);
 assert.equal(v.checkVoucherAdvance252(run,x),amount);
 const note=v.voucherAdvanceNote253(run,row,amount);
 assert(note.includes(v.money(amount)+' LAK.'));assert(note.includes('Additional advance supported by the cash record.'));
 assert.equal(JSON.stringify(run),before,'rendering must preserve the administrator draft and stored evidence');
}
const snapshot=c.test234.results(run)[0];const finalized={...structuredClone(run),status:'finalized',results:[snapshot]};
assert.equal(v.voucherAdvanceNote253(finalized,finalized.rows[0],snapshot.cashAdvance),row.input.note);
assert.deepEqual(JSON.parse(JSON.stringify(c.test234.results(finalized)[0])),JSON.parse(JSON.stringify(snapshot)));
assert.throws(()=>v.checkVoucherAdvance252(run,{...snapshot,cashAdvance:900000}),/does not match/);
const manual={input:{note:'Previously advanced 900,000 LAK; see signed receipts.'}};assert.equal(v.voucherAdvanceNote253(run,manual,3500000),manual.input.note);
console.log('PASS editable advances immediately recalculate final payment; older generated notes cannot block printing; rendered note follows current amount; unrelated notes, draft inputs and finalized snapshots preserved.');
