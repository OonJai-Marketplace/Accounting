// DOM unit tests; no live service requests or real employee records.
const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const dom=new JSDOM('<div id="nav-module-hr"><div class="nav-links"></div></div><main><div id="hr-attendance"></div></main>',{runScripts:'outside-only',url:'https://example.invalid/'}),w=dom.window;
w.setInterval=()=>0;w.APP_PERMISSION_TREE=[{id:'hr',children:[]}];w.applyGranularPermissionAccess=()=>{};w.switchTab=()=>{};w.liveProfile={id:'fixture',role:'admin'};w.ojmDb={};
w.eval(fs.readFileSync('scripts/hr-inbox143168.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
const api=w.HRInbox143168,s=api.state;s.owner='fixture';s.ready=true;s.employees=[{id:'e1',data:{name:'Jade',active:true}}];s.rows=[{id:'HR-0001',status:'pending',version:1,data:{type:'closure',scope:'all',employeeIds:[],start:'2026-10-24',end:'2026-10-24',reason:'Maintenance',work:'no_work',pay:'paid',status:'late',minutes:15,notes:'',exceptions:[]}}];s.expanded.add('HR-0001');api.draw();const q=x=>w.document.querySelector(x),click=x=>q(x).click();
assert.equal(q('#nav-module-hr button').textContent,'AI HR Inbox');assert.equal(w.document.querySelectorAll('.hr-ai-review').length,4);
click('[data-select]');assert.equal(s.selected.size,1);assert.match(q('.hr-ai-bottom').textContent,/Review & confirm \(1\)/);
click('[data-action="pay"][data-value="unpaid"]');assert.equal(s.rows[0].data.pay,'unpaid');assert(s.dirty.has('HR-0001'));
click('[data-action="exception"]');assert.equal(w.document.querySelectorAll('[data-exception]').length,1);
click('[data-action="remove-exception"]');assert.equal(s.rows[0].data.exceptions.length,0);
let n=q('[data-field="notes"]');n.value='<img src=x onerror=alert(1)>';n.dispatchEvent(new w.Event('input',{bubbles:true}));api.draw();assert.equal(q('img'),null);assert.equal(q('[data-field="notes"]').value,n.value);
n=q('[data-field="type"]');n.value='attendance';n.dispatchEvent(new w.Event('change',{bubbles:true}));assert(q('[data-field="minutes"]'));assert.equal(s.rows[0].data.type,'attendance');
click('[data-action="collapse-all"]');assert(q('fieldset').hidden);click('[data-action="expand-all"]');assert(!q('fieldset').hidden);
s.rows[0].status='accepted';s.filter='accepted';api.draw();assert(q('fieldset').disabled);assert(q('[data-select]').disabled);
dom.window.close();console.log('PASS: HR navigation, four review panels, selection, pay toggles, exceptions, editing, escaping, expansion and accepted-record locks');
