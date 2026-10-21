const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const src=fs.readFileSync('src/payroll/workspace/payroll-v99.js','utf8');const c={window:{},liveProfile:{id:'admin'}};vm.createContext(c);vm.runInContext(src.slice(src.indexOf('const attendanceSelection143154'),src.indexOf('window.renderAttendance99=')),c);
const row=id=>({dataset:{employeeId:id},selected:false,pressed:'false',classList:{toggle(_,v){this.owner.selected=v}},querySelector(){return {setAttribute:(_,v)=>this.pressed=v}}});const rows=[row('a'),row('b')];rows.forEach(r=>r.classList.owner=r);const table={dataset:{selectionKey143154:'admin:2026-01'},tBodies:[{rows}]};const button=id=>({dataset:{employeeId:id},closest:()=>table});c.window.highlightAttendance143154(button('a'));assert.equal(rows[0].selected,true);assert.equal(rows[1].selected,false);c.window.highlightAttendance143154(button('b'));assert.equal(rows[0].selected,false);assert.equal(rows[1].pressed,'true');c.window.highlightAttendance143154(button('b'));assert.equal(rows[1].selected,false);
const css=fs.readFileSync('src/hr/employees/hr-workspace14306.css','utf8');assert.ok(css.includes('width:calc((100% - 112px)/var(--days99))!important'));assert.ok(css.includes('padding:0!important'));assert.match(src,/data-selection-key143154/);console.log('Attendance passed: highlight, switch, deselect, identity-based selection and compact 31-day sizing');
const defaultCode=src.match(/const recorded=Work82\.run\?\.rows\[i\][\s\S]*?select\.value=([^;]+);/)[1];
for(const [parsed,recorded,expected] of [[{minutes:0},false,'late'],[{minutes:0},true,''],[{minutes:12},true,'late'],[{rule:{code:'A'}},true,'A']]){const context={parsed,recorded};vm.createContext(context);assert.equal(vm.runInContext(defaultCode,context),expected)}
console.log('Attendance default passed: new days open Late; saved Present, Late and absence codes remain intact');

const resize=fs.readFileSync('src/shared/ui/table-resize143117.js','utf8');
let removed=0;
const rc={WeakMap,Set};
vm.createContext(rc);
vm.runInContext(resize.slice(resize.indexOf('const states='),resize.indexOf('function measure('))+';globalThis.install=install;',rc);
rc.install({isConnected:true,matches:selector=>selector==='.attendance-grid99',querySelectorAll:()=>[{remove(){removed++},classList:{remove(){removed++}}}]});
assert.equal(removed,2);
console.log('Attendance fit passed: calendar bypasses saved widths and removes resize controls before reading headers or storage');
