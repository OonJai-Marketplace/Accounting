const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../src/hr/calendar/hr-calendar-model14306.js'),read=p=>fs.readFileSync(p,'utf8');
const schedule=M.scheduleDefaults({nonWorkDays99:[0,6]}),events=[];
schedule.schedules.push({from:'2026-10-19',days:Array.from({length:7},(_,day)=>({day,work:day!==6,fraction:1,start:'08:00',end:'17:00'}))});
const c={window:null,ApplicationSettings:{payroll:{nonWorkDays99:[]}},Work82:{leaves:[]},HRCalendarModel14306:M,nonWork:()=>[],beforeEmployment234:()=>false,payroll95:{legends:()=>[{code:'A',description:'Absent',color:'#dc2626'},{code:'L',description:'Vacation',color:'#6366f1'}],parseMark:m=>({minutes:Number(m)||0,rule:['A','L'].includes(m)?{code:m,description:m,color:'#6366f1'}:null})},hrCalendar14306:{day:(date,id,run)=>run.status==='finalized'&&!run.calendarSnapshot14306?null:M.dayInfo(date,id,run.calendarSnapshot14306?.settings||schedule,run.calendarSnapshot14306?.events||events,{})}};c.window=c;vm.createContext(c);
const source=read('src/payroll/workspace/payroll-v99.js');vm.runInContext(source.slice(source.indexOf('function status('),source.indexOf('function calculations(')),c);
const run={month:'2026-10',status:'draft'},row={employeeId:'e',employee:{},input:{attendance:[]}},day={date:'2026-10-25',weekday:0};
assert.equal(c.status(run,row,day).kind,'Present');
events.push({id:'off',data:{title:'Company day off',start:day.date,end:day.date,type:'workday',effect:'off',status:'scheduled'}});
assert.equal(c.status(run,row,day).kind,'Non-work day');row.input.attendance=[{date:day.date,mark95:'0',overtime:0}];assert.equal(c.status(run,row,day).kind,'Non-work day');assert.equal(c.status(run,row,day).color,'#94a3a0');assert.equal(M.dayInfo(day.date,'e',schedule,events).paidFraction,0);
row.input.attendance[0].overtime=2;assert.equal(c.status(run,row,day).kind,'Present');row.input.attendance[0].overtime=0;
for(const [mark,kind] of [['9','Late'],['A','Absent'],['L','Leave / legend']]){row.input.attendance[0].mark95=mark;assert.equal(c.status(run,row,day).kind,kind)}
row.input.attendance[0].mark95='0';assert.equal(c.status({...run,status:'finalized'},row,day).kind,'Present');
const snapshot={settings:structuredClone(schedule),events:structuredClone(events)};assert.equal(c.status({...run,status:'finalized',calendarSnapshot14306:snapshot},row,day).kind,'Non-work day');
events[0].data.type='holiday';assert.equal(c.status(run,row,day).kind,'Holiday');assert.equal(M.dayInfo(day.date,'e',schedule,events).paidFraction,1);
events[0].data.type='workday';events[0].data.employeeIds=['other'];assert.equal(c.status(run,row,day).kind,'Present');
assert.equal(M.dayInfo('2026-10-18','e',schedule,events).work,false);assert.equal(M.dayInfo('2026-11-01','e',schedule,events).work,true);
console.log('PASS imported zero marks on off days, holidays, effective schedules, employee exceptions, overtime, explicit exceptions and saved history.');
