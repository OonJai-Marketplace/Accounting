/* Settings-based calculation engine. No rates are inferred from PDF examples. */
const round82=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
function payrollConfig82(settings=ApplicationSettings){
 const p=settings.payroll||{},t=settings.tax||{};const num=(v,label,min=0,max=Infinity)=>{const n=Number(v);if(v===''||v==null||!Number.isFinite(n)||n<min||n>max)throw Error('Review '+label+' in Settings.');return n};
 if(!['equal','employee','employer','custom'].includes(p.pitSharing))throw Error('Review PIT sharing in Settings.');
 const brackets=Array.from({length:6},(_,i)=>{const k=i+1;return {from:num(t['pit'+k+'From'],'PIT bracket '+k),to:t['pit'+k+'To']===''?Infinity:num(t['pit'+k+'To'],'PIT upper limit '+k),rate:num(t['pit'+k+'Rate'],'PIT rate '+k,0,100)}});
 brackets.forEach((b,i)=>{if(b.to<=b.from||(i===0&&b.from!==0)||(i>0&&b.from!==brackets[i-1].to)||(i>0&&b.rate<brackets[i-1].rate)||(i===5&&b.to!==Infinity))throw Error('PIT brackets must be continuous, increasing, start at zero, and end without a maximum.')});
 return {brackets:brackets.map(b=>({...b,to:b.to===Infinity?null:b.to})),workDays:num(p.workDaysMonth,'working days',1,31),hours:num(p.hoursPerDay,'hours per day',1,24),weeklyHours:num(p.weeklyHours,'weekly hours',1,168),grace:num(p.lateGraceMinutes,'late grace',0,120),penaltyGrace:num(p.latePenaltyGraceMinutes??p.lateGraceMinutes,'late penalty threshold',0,120),overtime:num(p.overtimeRate,'overtime multiplier',1),employeeSso:num(t.ssoEmployeeRate,'Statutory employee SSO',0,100),employerSso:num(t.ssoEmployerRate,'Statutory employer SSO',0,100),ssoCap:t.ssoMaxBase===''||t.ssoMaxBase==null?null:num(t.ssoMaxBase,'SSO ceiling',0.01),latePenaltyFirst:num(p.latePenaltyFirst??5000,'late penalty 1–5'),latePenaltySecond:num(p.latePenaltySecond??7000,'late penalty 6–10'),latePenaltyThird:num(p.latePenaltyThird??10000,'late penalty 11+'),sharing:p.pitSharing||'equal',payFrequency:p.payFrequency||'monthly',cutoff:num(p.payrollCutoff,'payroll cutoff',1,31),paymentDay:num(p.paymentDay,'payment day',1,31)};
}
function pit82(taxable,config){return round82(config.brackets.reduce((sum,b)=>sum+Math.max(0,Math.min(taxable,b.to??Infinity)-b.from)*b.rate/100,0))}
function validEmploymentDate234(value){return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
// Use the original contract start, not a later renewal, so renewals do not restart employment.
function contractStart234(employee){
 const contracts=(employee.contracts99||[]).filter(c=>!['draft','cancelled'].includes(c.status)&&c.start);
 if(contracts.some(c=>!validEmploymentDate234(c.start)))throw Error('Review the contract start date for '+employee.name+'.');
 const start=contracts.length?contracts.map(c=>c.start).sort()[0]:employee.renewal;
 if(start&&!validEmploymentDate234(start))throw Error('Review the contract / entitlement date for '+employee.name+'.');
 return start||null;
}
function beforeEmployment234(employee,date){const start=contractStart234(employee);return !!start&&date<start;}
function employmentProration234(run,row,config){
 const start=contractStart234(row.employee);
 if(!start)return null;
 const first=run.month+'-01';
 if(start<=first)return null;
 const [year,month]=run.month.split('-').map(Number),count=new Date(Date.UTC(year,month,0)).getUTCDate();let eligibleDays=0;
 for(let day=1;day<=count;day++){
  const date=run.month+'-'+String(day).padStart(2,'0');if(date<start)continue;
  const schedule=window.hrCalendar14306?.day(date,row.employeeId,run);
  if(!schedule)throw Error('Load the company calendar before calculating first-month pay.');
  eligibleDays+=Number(schedule.paidFraction??schedule.fraction);
 }
 if(!Number.isFinite(eligibleDays)||eligibleDays<0)throw Error('Review the company work schedule.');
 const salary=Number(row.employee.salary)*Number(run.rates[row.employee.currency]);
 return {start,eligibleDays,basisDays:config.workDays,paidDays:Math.min(eligibleDays,config.workDays),earnedSalaryLak:round82(salary*Math.min(eligibleDays/config.workDays,1))};
}
function calcPay82(employee,input,config,rate,unpaidLeave=0,employment=null){
 const n=(v,label)=>{const x=Number(v??0);if(!Number.isFinite(x)||x<0)throw Error(label+' must be a non-negative number.');return x};
 if(!Number.isFinite(rate)||rate<=0)throw Error('Enter a positive LAK exchange rate for '+employee.currency+'.');
 const contract=n(employee.salary,'Contract salary'),contractLak=round82(contract*rate),daily=contractLak/config.workDays,hourly=daily/config.hours;
 const attendance=input.attendance||[];const seen=new Set();for(const a of attendance){if(!a.date||seen.has(a.date))throw Error('Attendance dates must be unique within each employee.');seen.add(a.date)}
 const minutes=attendance.reduce((s,a)=>s+Math.max(0,n(a.late,'Late minutes')-config.grace),0),ot=attendance.reduce((s,a)=>s+n(a.overtime,'Overtime hours'),0),late=round82(minutes*hourly/60),unpaidDays=n(input.absentDays,'Additional absence')+n(unpaidLeave,'Unpaid leave'),absence=round82(unpaidDays*daily),manualPenalty=n(input.penalty,'Penalty'),lateCount=attendance.filter(a=>Number(a.late)>(config.penaltyGrace??config.grace)).length,latePenalty=Array.from({length:lateCount},(_,i)=>i<5?(config.latePenaltyFirst||0):i<10?(config.latePenaltySecond||0):(config.latePenaltyThird||0)).reduce((a,b)=>a+b,0),reportedMissed=n(input.reportedMissed,'Reported missed time'),unreportedMissed=n(input.unreportedMissed,'Unreported missed time'),penalty=manualPenalty+latePenalty+reportedMissed+unreportedMissed,other=n(input.otherDeduction,'Other deduction'),overtime=round82(ot*hourly*config.overtime),allowance=n(input.allowance,'Taxable allowance');
 const earnedSalaryLak=employment?n(employment.earnedSalaryLak,'First-month salary'):contractLak;if(earnedSalaryLak>contractLak)throw Error('First-month salary exceeds the monthly contract salary.');
 const gross=round82(earnedSalaryLak+overtime+allowance-late-absence-penalty-other);if(gross<0)throw Error('Internal deductions exceed gross earnings for '+employee.name+'.');
 const ssoBase=employee.sso?Math.min(gross,config.ssoCap??Infinity):0,employeeSso=round82(ssoBase*config.employeeSso/100),employerSso=round82(ssoBase*config.employerSso/100),taxable=Math.max(0,round82(gross-employeeSso)),pit=employee.pit===false?0:pit82(taxable,config);
 if(config.sharing==='custom'&&employee.pit!==false&&(employee.pitShare==null||String(employee.pitShare).trim()===''))throw Error('Enter the custom employee PIT percentage for '+employee.name+'.');
 const share=config.sharing==='equal'?50:config.sharing==='employer'?0:config.sharing==='employee'?100:n(employee.pitShare,'Employee PIT share');if(share>100)throw Error('Employee PIT share cannot exceed 100%.');
 const employeePit=round82(pit*share/100),employerPit=round82(pit-employeePit),net=round82(gross-employeeSso-employeePit),cashAdvance=n(input.advance,'Advance recovery'),loanRecovery=n(input.loanRecovery,'Loan repayment'),advance=cashAdvance+loanRecovery,reimbursement=n(input.reimbursement,'Reimbursement'),adjusted=round82(net+reimbursement-advance);if(adjusted<0)throw Error('Advance recovery exceeds available net pay for '+employee.name+'.');
 if(![contractLak,daily,hourly,minutes,late,absence,penalty,overtime,gross,employeeSso,employerSso,taxable,pit,net,adjusted,adjusted/rate].every(Number.isFinite))throw Error('Payroll amounts exceed the supported numeric range for '+employee.name+'.');
 return {lateCount,latePenalty,manualPenalty,reportedMissed,unreportedMissed,cashAdvance,loanRecovery,contract,contractLak,earnedSalaryLak,employmentProration234:employment,rate,daily,hourly,minutes,late,unpaidDays,absence,penalty,other,overtime,allowance,gross,ssoBase,employeeSso,employerSso,taxable,pit,employeePit,employerPit,net,advance,reimbursement,adjusted,paidAmount:round82(adjusted/rate),currency:employee.currency};
}
