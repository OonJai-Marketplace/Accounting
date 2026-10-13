function results(run=Work82.run){if(!run)return[];if(run.status==='finalized')return [...(run.results||[])].sort(payrollOrder14337);const config=payrollConfig82(),rules=legends();return run.rows.map(row=>{
 const days=dayResults(run,row,config,rules),sum=k=>days.reduce((s,d)=>s+Number(d[k]||0),0),input=row.input,unpaid=approved(run,row.employeeId).filter(l=>l.paid==='no').reduce((n,l)=>n+remainingLeave105(run,row,l),0);
 const time=round82(sum('time')),latePenalty=round82(sum('penalty')),fixed=round82(sum('fixed')),manual=round82(sum('manual'));
 const base={...input,attendance:(input.attendance||[]).map(a=>({...a,late:0})),absentDays:number(input.absentDays,'Additional absence days')+sum('lostDays'),penalty:number(input.penalty,'Additional penalty')+latePenalty+fixed+manual,otherDeduction:number(input.otherDeduction,'Other deduction')+time};
 const x=calcPay82(row.employee,base,config,Number(run.rates[row.employee.currency]),unpaid),paidDays=number(input.paidHolidayDays,'Additional paid holiday days')+sum('paidDays')+approved(run,row.employeeId).filter(l=>l.paid==='yes').reduce((n,l)=>n+remainingLeave105(run,row,l),0);
 if(paidDays>config.workDays)throw Error('Paid leave/holiday days exceed working days for '+row.employee.name+'.');
 const usage={};days.filter(d=>d.leaveType&&!d.linked).forEach(d=>usage[d.leaveType]=(usage[d.leaveType]||0)+d.scheduleFraction);
 return {...x,employeeId:row.employeeId,employee:row.employee,late:time,other:number(input.otherDeduction,'Other deduction'),manualPenalty:number(input.penalty,'Additional penalty'),latePenalty,minutes:sum('deductible'),lateCount:days.filter(d=>d.penalty>0).length,legendFixed:fixed,manualDayDeduction:manual,attendance95:days,legendLeaveUsage95:usage,paidLeaveDays:paidDays,paidLeaveValue:round82(paidDays*x.daily)};
 }).sort(payrollOrder14337)}
window.runResults82=results;
