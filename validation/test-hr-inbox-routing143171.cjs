const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const dom=new JSDOM('<main><div id="nav-module-payroll"><div class="nav-links"></div></div><div id="nav-module-hr"><div class="nav-links"></div></div><div id="payroll-overview"></div><div id="hr-ai-inbox" class="tab-content active"><section class="hr-ai-shell">Inbox content</section></div><div id="hr-calendar" class="tab-content"></div></main>',{runScripts:'outside-only'}),w=dom.window;let mounts=0,calendarRenders=0;
Object.assign(w,{escapeHtml:String,Work82:{loaded:true},admin82:()=>true,renderWork82:()=>{},loadWork82:()=>{},mount82:()=>{mounts++},hrCalendar14306:{render:()=>calendarRenders++},switchTab:id=>{w.document.querySelectorAll('.tab-content').forEach(n=>n.classList.toggle('active',n.id===id));}});
w.eval(fs.readFileSync('src/hr/employees/hr-v99.js','utf8'));w.dispatchEvent(new w.Event('DOMContentLoaded'));
assert.equal(w.document.querySelector('[onclick*="hr-assessments"]'),null);assert.equal(w.document.getElementById('hr-assessments'),null);
for(let i=0;i<3;i++){w.switchTab('hr-ai-inbox');w.renderWork82();w.renderHr99();}
assert.equal(mounts,0,'Legacy assessment renderer must not mount into AI HR Inbox');assert.equal(w.document.querySelector('.hr-ai-shell').textContent,'Inbox content');
w.switchTab('hr-calendar');assert(calendarRenders>0,'Existing Calendar route must still work');
for(const file of ['src/core/permissions/navigation-permissions.js','src/subusers/review/submission-review-v139.js'])assert(!fs.readFileSync(file,'utf8').includes("['hr-assessments','Assessment']"));
assert(!fs.readFileSync('desktop.html','utf8').includes('id="hr-assessments"'));
dom.window.close();console.log('PASS: startup, repeated navigation and workforce refresh never recreate Assessment or render it into AI HR Inbox; Calendar remains routed');
