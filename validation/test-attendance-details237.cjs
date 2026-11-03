// Requires linkedom (NODE_PATH may point to an external install); fixtures contain no employee data.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),read=p=>fs.readFileSync(p,'utf8');
const {document}=parseHTML('<html><body><section id="hr-leave"><table><tbody><tr><td class="actions-column99"><button>Details</button></td></tr></tbody></table></section></body></html>');
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
let opened=null,dialogHTML='';
const row={employeeId:'employee',employee:{name:'Test employee',code:'TEST'},input:{attendance:[]}};
const run={status:'draft',month:'2026-10',rows:[row]};
const leave={id:'leave-record',data:{employeeId:'employee',from:'2026-10-12',to:'2026-10-14',type:'vacation',paid:'yes',status:'approved',days:3,notes:'Vacation abroad <saved reason>'}};
const c={document,structuredClone,console,window:null,Work82:{run,leaves:[leave]},liveProfile:{id:'actor'},ApplicationSettings:{payroll:{}},CurrencyStore:{currencies:[{code:'LAK'}]},esc,formatAppDate:v=>'Date '+v,updateRun82(){},renderWork82(){},hrWorkspace14306:{openLeave:id=>{opened=id}},hrCalendar14306:{day:date=>({work:date!=='2026-10-25',label:'Sunday off'})},field82:(label,name,value)=>`<label>${esc(label)}<input name="${name}" value="${esc(value)}"></label>`,check82:(label,name,value)=>`<label><input type="checkbox" name="${name}" ${value?'checked':''}>${esc(label)}</label>`,select82:(label,name,value)=>`<label>${label}<select name="${name}"><option>${value}</option></select></label>`};c.window=c;vm.createContext(c);
const defaults=read('src/bridges/hr-payroll/attendance-v96/scope-and-state.js');
vm.runInContext(defaults.slice(defaults.indexOf('const legendDefaults=')),c);
vm.runInContext(read('src/bridges/hr-payroll/attendance-v96/legend-and-marks.js'),c);
const source=read('src/payroll/workspace/groups-v96/drafts-and-finalization.js');
vm.runInContext(source.slice(source.indexOf('function modal('),source.indexOf('window.openLegend95=')),c);
const date='2026-10-12';
function open(mark,extras={},day=date){opened=null;row.input.attendance=mark===null?[]:[{date:day,mark95:mark,late:0,overtime:0,...extras}];const before=JSON.stringify(run);c.payDay95(0,day);assert.equal(JSON.stringify(run),before,'Opening a day must not change payroll inputs');return document.querySelector('#payDay95');}
for(const mark of ['L','0',null]){assert.equal(open(mark),null);assert.equal(opened,leave.id)}
for(const change of [{status:'pending'},{status:'cancelled'},{employeeId:'another'},{from:'2026-10-20'}]){const original={...leave.data};Object.assign(leave.data,change);assert(open('L'));assert.equal(opened,null);Object.assign(leave.data,original)}
for(const [mark,extras] of [['9',{}],['L',{overtime:2}],['L',{override95:{amount:10,currency:'LAK',reason:'Reviewed'}}]]){const modal=open(mark,extras);assert(modal);assert.equal(opened,null);assert(modal.textContent.includes('Vacation abroad <saved reason>'));assert(modal.innerHTML.includes('&lt;saved reason&gt;'));modal.querySelector('[data-leave-details237]').click();assert.equal(opened,leave.id);assert.equal(document.querySelector('#payDay95'),null)}
for(const [mark,label] of [['H','Paid holiday'],['EX','Excused late'],['EX:149','Excused late']]){const modal=open(mark,{note:'Imported attendance note'},'2026-10-26');assert(modal.textContent.includes(label));assert(modal.textContent.includes('Imported attendance note'));if(mark==='EX:149')assert(modal.textContent.includes('149 · Excused'));modal.querySelector('header button').click();assert.equal(document.querySelector('#payDay95'),null)}
assert(open('0',{},'2026-10-25').textContent.includes('Recorded attendance · Sunday off'));
document.querySelector('#payDay95').remove();run.status='finalized';assert.equal(open('H'),null);run.status='draft';
// Real leave details render the authoritative reason and full range.
c.admin=()=>true;c.employee=()=>({data:row.employee});c.dialog=(title,html)=>{dialogHTML=html;return{close(){}}};c.buttons=()=>'';c.bindActions=()=>{};
const approval=read('src/hr/leave/approval14306.js');vm.runInContext(approval.slice(approval.indexOf('function openLeave(')),c);
c.openLeave(leave.id);assert(dialogHTML.includes('Vacation abroad &lt;saved reason&gt;'));assert(dialogHTML.includes('Date 2026-10-12 – Date 2026-10-14'));assert(dialogHTML.includes('vacation · approved'));assert(dialogHTML.includes('Paid'));
// Default display colors are distinct, configured settings stay authoritative.
const rules=c.legends(),by=code=>rules.find(r=>r.code===code);
assert.equal(by('H').color,'#c39131');assert.equal(by('EX').color,'#7c3aed');assert.equal(by('L').color,'#1d4ed8');
for(const code of ['H','L','EX']){assert.equal(by(code).value,0);assert.equal(by(code).lateMode,'exempt')}
c.ApplicationSettings.payroll.attendanceLegend95=[{...by('EX'),color:'#abcdef'}];assert.equal(c.legends()[0].color,'#abcdef');delete c.ApplicationSettings.payroll.attendanceLegend95;
// Only draft holiday grouping changes; stored snapshot colors/history remain intact.
c.payroll95={legends:c.legends,parseMark:c.parseMark};c.beforeEmployment234=()=>false;c.HRCalendarModel14306={today:()=> '2026-11-02'};
const calendar=read('src/payroll/workspace/payroll-v99.js');vm.runInContext(calendar.slice(calendar.indexOf('function status('),calendar.indexOf('function calculations(')),c);
row.input.attendance=[{date:'2026-10-26',mark95:'H'}];const day={date:'2026-10-26',weekday:1};assert.equal(c.status(run,row,day).kind,'Holiday');assert.equal(c.status(run,row,day).color,'#c39131');
const historic={...run,status:'finalized',legendSnapshot95:[{...by('H'),color:'#166534'}]};assert.equal(c.status(historic,row,day).kind,'Leave / legend');assert.equal(c.status(historic,row,day).color,'#166534');
row.input.attendance[0].mark95='EX';assert.equal(c.status(run,row,day).color,'#7c3aed');
// Repeated polishing keeps one real row menu; the scoped CSS clips no menu control.
const menuSource=read('src/bridges/bookkeeping-startup/workspace-v99.js');vm.runInContext(menuSource.slice(menuSource.indexOf('function menu('),menuSource.indexOf('function updateHeading(')),c);
const cell=document.querySelector('#hr-leave td');c.menu(cell);c.menu(cell);assert.equal(cell.querySelectorAll('summary').length,1);assert.equal(cell.querySelectorAll('button').length,1);assert.equal(cell.querySelector('summary').getAttribute('aria-label'),'Row actions');
const css=read('src/hr/employees/hr-workspace14306.css');assert.match(css,/#hr-leave td\.actions-column99\{[^}]*overflow:visible!important;[^}]*text-overflow:clip!important/);assert.match(css,/#hr-leave \.row-menu99>summary\{[^}]*width:32px!important/);
console.log('PASS saved leave routing/reasons, attendance exceptions, non-mutating opens, overrides/overtime, configured colors, finalized history and single Leave action menu.');
