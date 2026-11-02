// Requires linkedom; fixtures contain no company employee or payroll data.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),M=require('../src/hr/calendar/hr-calendar-model14306.js'),read=p=>fs.readFileSync(p,'utf8');
const {document,HTMLElement,HTMLSelectElement}=parseHTML('<html><body><section id="hr-calendar" class="active"></section></body></html>');
Object.defineProperty(HTMLSelectElement.prototype,'value',{get(){return this.querySelector('option[selected]')?.value??this.querySelector('option')?.value??''},set(value){for(const o of this.options)o.toggleAttribute('selected',o.value===String(value))}});
Object.defineProperty(HTMLSelectElement.prototype,'selectedOptions',{get(){return [...this.options].filter(o=>o.hasAttribute('selected'))}});
Object.defineProperty(HTMLElement.prototype,'elements',{get(){return Object.fromEntries([...this.querySelectorAll('[name]')].map(n=>[n.name,n]))}});
HTMLElement.prototype.showModal=function(){this.open=true};HTMLElement.prototype.close=function(){this.remove()};
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
class TestFormData{constructor(form){this.items=[...form.querySelectorAll('[name]')].filter(n=>!n.disabled&&(n.type!=='checkbox'||n.checked)).map(n=>[n.name,n.value])}[Symbol.iterator](){return this.items[Symbol.iterator]()}}
const employee={id:'employee',data:{name:'Test employee',code:'TEST',salary:2200000,currency:'LAK',active:true}},date='2026-10-26';
const row={employeeId:employee.id,employee:employee.data,input:{attendance:[]}},run={status:'draft',month:'2026-10',rates:{LAK:1},rows:[row]};
const schedule=M.scheduleDefaults({nonWorkDays99:[0,6]}),listeners=[],writes=[];let target='';
const c={document,window:null,structuredClone,console,Intl,Date,FormData:TestFormData,ApplicationSettings:{payroll:{}},Work82:{run,leaves:[],employees:[employee],runs:[]},liveProfile:{id:'admin',role:'admin',status:'active'},navigator:{onLine:true},CurrencyStore:{currencies:[{code:'LAK'}]},escapeHtml:esc,esc,formatAppDate:String,formatAppNumber:String,HRCalendarModel14306:{...M,today:()=> '2026-11-02'},beforeEmployment234:()=>false,updateRun82(){},renderWork82(){},showCenterStatus(){},switchTab:id=>{target=id},orderedEmployees82:()=>[employee],requestAnimationFrame(){},addEventListener:(name,fn)=>{if(name==='DOMContentLoaded')listeners.push(fn)},setInterval(){},field82:(label,name,value,type='text')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}"></label>`,select82:(label,name,value,options)=>`<label>${label}<select name="${name}">${options.map(([v,t])=>`<option value="${v}" ${v===value?'selected':''}>${t}</option>`).join('')}</select></label>`,check82:(label,name,value)=>`<label><input name="${name}" type="checkbox" ${value?'checked':''}>${label}</label>`};
c.window=c;c.hrCalendar14306={state:{month:'2026-10'},day:(d,id)=>M.dayInfo(d,id,schedule,[])};
c.ojmDb={from:table=>({insert:payload=>({select:async()=>{writes.push({table,payload});return{data:[{...payload,id:'new-event'}]}}})})};vm.createContext(c);
const defaults=read('src/bridges/hr-payroll/attendance-v96/scope-and-state.js');vm.runInContext(defaults.slice(defaults.indexOf('const legendDefaults=')),c);vm.runInContext(read('src/bridges/hr-payroll/attendance-v96/legend-and-marks.js'),c);
c.payroll95={legends:c.legends,parseMark:c.parseMark,order:()=>0,dayResults:()=>[]};
const detail=read('src/payroll/workspace/groups-v96/drafts-and-finalization.js');vm.runInContext(detail.slice(detail.indexOf('function modal('),detail.indexOf('window.openLegend95=')),c);
const grid=read('src/payroll/workspace/payroll-v99.js');vm.runInContext(grid,c);listeners.shift()();
function open(mark){row.input.attendance=mark===null?[]:[{date,mark95:mark,late:0,overtime:0}];c.payDay95(0,date);return document.querySelector('#payDay95 form')}
let form=open('0'),options=[...form.querySelector('select:not([name])').options].map(o=>o.value);
assert(!options.includes('H')&&!options.includes('L'));for(const code of ['', 'late','A','EX','MTT','MMT'])assert(options.includes(code));
c.ApplicationSettings.payroll.attendanceLegend95=[...c.legends(),{code:'SICK',description:'Sick leave',leaveType:'sick',value:0,method:'percent',lateMode:'exempt'}];form=open('0');assert(![...form.querySelector('select:not([name])').options].some(o=>o.value==='SICK'));delete c.ApplicationSettings.payroll.attendanceLegend95;
for(const code of ['H','L']){form=open(code);assert.equal(form.querySelector('select:not([name])'),null);assert.equal(form.elements.mark.value,code);awaitSubmit(form);assert.equal(row.input.attendance[0].mark95,code);form=open(code);form.querySelector('p.notice82 button').click();assert.equal(target,code==='H'?'hr-calendar':'hr-leave')}
function awaitSubmit(f){f.onsubmit({preventDefault(){},currentTarget:f});assert.equal(document.querySelector('#payDay95'),null)}
// Ordinary zero placeholders no longer hide approved leave or remove its paid/unpaid day allocation.
vm.runInContext(grid.slice(grid.indexOf('function status('),grid.indexOf('function calculations(')),c);vm.runInContext(read('src/bridges/hr-payroll/attendance-v96/approved-leave-and-days.js'),c);
const leave={employeeId:employee.id,from:'2026-10-23',to:'2026-10-26',month:run.month,type:'vacation',status:'approved',paid:'no',days:2};c.Work82.leaves=[{id:'leave',data:leave}];row.input.attendance=[{date,mark95:'0',overtime:0}];
assert.equal(c.status(run,row,{date,weekday:1}).kind,'Leave / legend');assert(c.status(run,row,{date,weekday:1}).label.startsWith('Unpaid vacation leave'));assert.equal(c.remainingLeave105(run,row,leave),2);
const weekend={date:'2026-10-25',weekday:0};row.input.attendance.push({date:weekend.date,mark95:'0'});assert.equal(c.status(run,row,weekend).kind,'Non-work day');
for(const entry of [{mark95:'A'},{mark95:'0',overtime:2},{mark95:'0',override95:{amount:0,reason:'Explicit'}}]){row.input.attendance=[{date,...entry}];assert.equal(c.remainingLeave105(run,row,leave),1)}
row.input.attendance=[{date,mark95:'0'}];assert.equal(c.status({...run,status:'finalized',leaveSnapshot:[leave],legendSnapshot95:c.legends()},row,{date,weekday:1}).kind,'Present');
// Real Add Holiday form saves a calendar event, defaults to paid time off and retains the selected date.
vm.runInContext(read('src/hr/calendar/hr-calendar14306.js'),c);const cal=c.hrCalendar14306;Object.assign(cal.state,{owner:'admin',ready:true,month:'2026-10',settings:{id:true,version:1,data:schedule},rows:[]});c.Work82.leaves=[];
(async()=>{cal.render();assert(document.querySelector('[data-cal-holiday]'));
 let box=await cal.addHoliday(date),f=box.querySelector('form');assert.equal(f.elements.type.value,'holiday');assert.equal(f.elements.effect.value,'off');assert.equal(f.elements.start.value,date);assert.equal(f.elements.end.value,date);assert(f.elements.effect.textContent.includes('paid holiday'));f.elements.title.value='Test holiday';
 await f.onsubmit({preventDefault(){},currentTarget:f});assert.equal(writes.length,1);assert.equal(writes[0].table,'hr_calendar_events14306');assert.equal(writes[0].payload.data.type,'holiday');assert.equal(writes[0].payload.data.effect,'off');assert.equal(cal.day(date,employee.id,run).holiday,true);
 let s=c.status(run,row,{date,weekday:1});assert.equal(s.kind,'Holiday');assert.equal(s.color,'#c39131');assert.equal(c.status(run,row,weekend).color,'#94a3a0');
 c.payrollConfig82=()=>({});c.payrollExplain143157={amount:()=>''};const html=c.renderAttendance99(run);assert.match(html,/class="holiday238" title="Monday · Holiday · Test holiday">26/);assert.match(html,/class="nonwork99" title="Sunday">25/);
 cal.state.rows[0].data.start='2026-11-03';cal.state.rows[0].data.end='2026-11-03';row.input.attendance=[];s=c.status({...run,month:'2026-11'},row,{date:'2026-11-03',weekday:2});assert.equal(s.kind,'Upcoming');assert.equal(s.color,'#c39131');assert.equal(s.minutes,0);
 const copy=M.clone(cal.state.rows);copy[0].data.status='cancelled';assert.equal(M.dayInfo('2026-11-03',employee.id,schedule,copy).holiday,false);
 box=await cal.addHoliday();assert.equal(box.querySelector('form').elements.start.value,'2026-10-01');box.close();
 c.liveProfile.role='viewer';assert.equal(await cal.addHoliday(date),undefined);assert.equal(writes.length,1);
 console.log('PASS attendance choices, legacy marks, approved leave over zero placeholders, explicit overrides, holiday creation/date/header/color, future counts and administrator guard.');
})().catch(e=>{console.error(e);process.exitCode=1});
