function approved(run,id){return (run.isSample?[]:Work82.leaves).filter(l=>l.data.employeeId===id&&l.data.month===run.month&&l.data.status==='approved').map(l=>l.data)}
function overlapLeave(leaves,date){return leaves.find(l=>date>=l.from&&date<=l.to)}
// Allocate declared leave across scheduled dates. Explicit exceptions replace that share; zero-minute defaults do not.
function remainingLeave105(run,row,leave){
 const nonWork=ApplicationSettings.payroll.nonWorkDays99||[],dates=[];
 for(let date=new Date(leave.from+'T12:00:00');date<=new Date(leave.to+'T12:00:00');date.setDate(date.getDate()+1)){
 const iso=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');const info=window.hrCalendar14306?.day(iso,row.employeeId,run);const fraction=info?.fraction??(nonWork.includes(date.getDay())?0:1);if(fraction)dates.push({date:iso,fraction});
 }
 const overrides=new Set((row.input.attendance||[]).filter(a=>mark(a)!=='0'||Number(a.overtime||0)||a.override95).map(a=>a.date));
 if(!dates.length)return 0;
 const total=dates.reduce((s,d)=>s+d.fraction,0);return Math.min(Number(leave.days||0),total)*dates.filter(d=>!beforeEmployment234(row.employee,d.date)&&!overrides.has(d.date)).reduce((s,d)=>s+d.fraction,0)/total;
}
function dayResults(run,row,config,rules){
 const rate=Number(run.rates[row.employee.currency]);if(!Number.isFinite(rate)||rate<=0)throw Error('Enter the LAK exchange rate for '+row.employee.currency+'.');
 const daily=Number(row.employee.salary)*rate/config.workDays,hourly=daily/config.hours,leaves=approved(run,row.employeeId),seen=new Set();let count=0;
 return [...(row.input.attendance||[])].sort((a,b)=>a.date.localeCompare(b.date)).map(a=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(a.date)||a.date.slice(0,7)!==run.month||new Date(a.date+'T00:00:00Z').toISOString().slice(0,10)!==a.date||seen.has(a.date))throw Error('Attendance dates must be unique valid dates in the payroll month.');seen.add(a.date);
  if(beforeEmployment234(row.employee,a.date))return {date:a.date,mark:'NE',sourceMark:mark(a),scheduleFraction:0,minutes:0,deductible:0,normal:0,time:0,penalty:0,fixed:0,lostDays:0,paidDays:0,leaveType:'',linked:false,manual:null,amount:0,color:'#94a3a0',note:'Not yet employed',overtime:0,override:null};
  const {minutes,rule}=parseMark(mark(a),rules),linked=overlapLeave(leaves,a.date),schedule=window.hrCalendar14306?.day(a.date,row.employeeId,run),fraction=mark(a)==='NWU'?1:(schedule?.fraction??1),deductible=rule?.lateMode==='exempt'||fraction===0?0:Math.max(0,minutes-config.grace);const qualifies=rule?.lateMode!=='exempt'&&fraction>0&&minutes>(config.penaltyGrace??config.grace);if(qualifies)count++;
  let time=deductible*hourly/60,penalty=qualifies?(count<=5?config.latePenaltyFirst:count<=10?config.latePenaltySecond:config.latePenaltyThird):0,fixed=0,lostDays=0,paidDays=0,leaveType='';
  if(rule){if(rule.method==='percent'){lostDays=rule.value/100*fraction;paidDays=rule.code==='EX'?0:rule.code==='H'?Math.max(0,Number(schedule?.paidFraction??fraction)-lostDays):fraction-lostDays;leaveType=rule.code==='EX'?'':rule.leaveType||''}else if(rule.method==='fixed'){const fx=rule.currency==='LAK'?1:Number(run.rates[rule.currency]);if(!Number.isFinite(fx)||fx<=0)throw Error('Enter a LAK rate for legend currency '+rule.currency+'.');fixed=rule.value*fx} else if(!a.override95)throw Error(row.employee.name+' '+a.date+': enter the manual deduction using the calculated cell.');}
  const normal=time+penalty+fixed+lostDays*daily;let manual=null;
  if(a.override95){if(!String(a.override95.reason||'').trim())throw Error('A manual deduction needs a reason.');const currency=a.override95.currency||'LAK',fx=currency==='LAK'?1:Number(run.rates[currency]);if(!Number.isFinite(fx)||fx<=0)throw Error('Enter a LAK rate for override currency '+currency+'.');manual=number(a.override95.amount,'Manual deduction')*fx;time=0;penalty=0;fixed=0;lostDays=0;paidDays=0;}
  return {date:a.date,mark:mark(a),scheduleFraction:fraction,minutes,qualifyingLate234:qualifies,occurrence234:qualifies?count:null,deductible:manual===null?deductible:0,normal:round82(normal),time,penalty,fixed,lostDays,paidDays,leaveType,linked:Boolean(linked),manual,amount:round82(manual??normal),color:rule?.color||'',note:a.note||'',overtime:number(a.overtime,'Overtime hours'),override:a.override95||null};
 });
}

// Calendar holidays have no required attendance row. Count each eligible date once.
function calendarPaidDays246(run,row){
 let days=0;const end=new Date(Number(run.month.slice(0,4)),Number(run.month.slice(5,7)),0).getDate();
 const today=window.HRCalendarModel14306?.today?.()||'9999-12-31';
 for(let i=1;i<=end;i++){
  const date=run.month+'-'+String(i).padStart(2,'0');if(date>today||beforeEmployment234(row.employee,date))continue;
  const schedule=window.hrCalendar14306?.day(date,row.employeeId,run);if(!schedule?.holiday||schedule.work)continue;
  const a=(row.input.attendance||[]).find(a=>a.date===date);
  // An explicit holiday is already counted by dayResults; other explicit exceptions retain precedence.
  if(a&&(mark(a)!=='0'||a.override95))continue;
  days+=Number(schedule.paidFraction||0);
 }
 return days;
}
