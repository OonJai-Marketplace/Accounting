const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const dom=new JSDOM('<main><div id="nav-module-payroll"><div class="nav-links"></div></div><div id="nav-module-hr"><div class="nav-links"></div></div><div id="payroll-overview"></div><div id="hr-ai-inbox" class="tab-content active"><section class="hr-ai-shell">Inbox content</section></div><div id="hr-calendar" class="tab-content"></div></main>',{runScripts:'outside-only'}),w=dom.window;let mounts=0,calendarRenders=0;
Object.assign(w,{escapeHtml:String,Work82:{loaded:true,employees:[]},orderedEmployees82:()=>[],storageNotice82:()=>'',table82:()=>'',admin82:()=>true,renderWork82:()=>{},loadWork82:()=>{},mount82:(id,title,description,content)=>{assert.equal(id,'hr-assessments');assert.equal(title,'Assessments');mounts++;w.document.getElementById(id).innerHTML=content},hrCalendar14306:{render:()=>calendarRenders++},switchTab:id=>{w.document.querySelectorAll('.tab-content').forEach(n=>n.classList.toggle('active',n.id===id));}});
w.eval(fs.readFileSync('src/hr/employees/hr-v99.js','utf8'));w.dispatchEvent(new w.Event('DOMContentLoaded'));
assert.equal(w.document.querySelectorAll('[onclick*="hr-assessments"]').length,1);assert(w.document.getElementById('hr-assessments'));
for(let i=0;i<3;i++){w.switchTab('hr-ai-inbox');w.renderWork82();w.renderHr99();}
assert.equal(mounts,0,'Legacy assessment renderer must not mount into AI HR Inbox');assert.equal(w.document.querySelector('.hr-ai-shell').textContent,'Inbox content');
w.switchTab('hr-assessments');assert.equal(mounts,1,'Standalone Assessment must render');assert(w.document.querySelector('#hr-assessments #hrEmployee99'));
for(let i=0;i<3;i++){w.switchTab('hr-ai-inbox');w.renderWork82();w.renderHr99();}
assert.equal(mounts,1,'Returning from Assessment must not mount Assessment inside the inbox');assert.equal(w.document.querySelector('.hr-ai-shell').textContent,'Inbox content');
w.switchTab('hr-calendar');assert(calendarRenders>0,'Existing Calendar route must still work');
for(const file of ['src/core/permissions/navigation-permissions.js','src/subusers/review/submission-review-v139.js'])assert(fs.readFileSync(file,'utf8').includes("['hr-assessments','Assessment']"));
const html=fs.readFileSync('desktop.html','utf8');assert(html.includes('id="hr-assessments"'));assert(html.includes("switchTab('hr-assessments')"));
dom.window.close();console.log('PASS: standalone Assessment navigation and rendering restored; repeated inbox navigation and workforce refresh stay isolated; Calendar remains routed');
