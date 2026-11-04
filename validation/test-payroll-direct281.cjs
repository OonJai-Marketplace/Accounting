// Integrated UI + real save coordinator; all storage/RPCs remain synthetic.
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),fixture=require('./payroll-lifecycle-fixture277.cjs');
const dom=new JSDOM(fixture.html,{url:'https://fixture.test',runScripts:'dangerously',pretendToBeVisual:true}),w=dom.window;
w.eval('('+fixture.baseSetup.toString()+')();('+fixture.setup.toString()+')();');fixture.scripts().forEach(s=>w.eval(s));
const tick=()=>new Promise(r=>setTimeout(r,40)),el=id=>w.document.getElementById(id);
async function click(label,scope=w.document){const b=[...scope.querySelectorAll('button')].find(b=>b.textContent.trim()===label);assert(b,label);b.click();await tick();}
const mockSave=w.saveWork82,jobs=[];let globalSync=0,queueSync=0,confirmed=true;
w.tables82={runs:'payroll_runs'};w.date71=(y,m,d)=>[y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');w.offline14239={offline:()=>false};
w.idleSync14341={syncNow:async()=>{globalSync++;throw Error('Unexpected full workspace sync');}};
w.localFirst14333={saveWork:async(kind,data,record)=>{const row=await mockSave(kind,data,record);jobs.push({row,status:'pending'});return {...row,_pending14333:true};},sync:async options=>{assert.equal(options.coordinated,true);queueSync++;if(confirmed)jobs.forEach(j=>{j.status='synced';j.receipt=j.row;})},state:()=>({jobs})};
const storage=fs.readFileSync('src/shared/data/workforce-storage-v82.js','utf8');w.eval(storage.slice(storage.indexOf('async function saveWork82('),storage.indexOf('async function runAction82(')));
(async()=>{
 await tick();assert.equal([...el('payroll-entries').querySelectorAll('button')].filter(b=>/Save Draft|Close payroll/.test(b.textContent)).length,0);
 await click('Save & Close Payroll',el('payroll-entries'));await click('Confirm',[...w.document.querySelectorAll('.ui-overlay108')].at(-1));assert.equal(w.Work82.run.status,'finalized');assert.equal(el('qa-tab').textContent,'payroll-entries');assert.equal(w.qa276.postCalls,0);
 await click('Payroll journal',el('payroll-entries'));await click('Post to Active Journal');assert.equal(w.qa276.postCalls,0);await click('Cancel',[...w.document.querySelectorAll('.ui-overlay108')].at(-1));assert.equal(w.qa276.postCalls,0);
 await click('Post to Active Journal');await click('Confirm',[...w.document.querySelectorAll('.ui-overlay108')].at(-1));assert.equal(w.qa276.entries.length,1);assert.equal(el('qa-tab').textContent,'journal');assert.match(el('qa-status').textContent,/confirmed in Active Journal/);assert.equal(globalSync,0);assert(queueSync>=2);
 // Simulate stale device state after the server committed: reopening resolves it without reposting.
 w.Work82.runRecord.data.journalLink1429=null;w.Work82.run.journalLink1429=null;w.switchTab('payroll-entries');await tick();const posts=w.qa276.postCalls;await click('Payroll journal',el('payroll-entries'));assert.equal(w.qa276.postCalls,posts);assert.equal(el('qa-tab').textContent,'journal');assert.equal(w.document.querySelector('.pay-dialog1432'),null);
 console.log('PASS combined save/close and direct post through real save coordinator: no global sync, cancellation safe, Active Journal navigation and stale receipt recovery without duplicate posting.');w.close();
})().catch(e=>{console.error(e);console.error(el('qa-status')?.textContent);w.close();process.exitCode=1});
