const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),fixture=require('./payroll-source-fixture286.cjs');
const tick=()=>new Promise(r=>setTimeout(r,45));
async function scenario(mode){
 const dom=new JSDOM(fixture.html,{url:'https://fixture.test',runScripts:'dangerously',pretendToBeVisual:true}),w=dom.window,d=w.document;
 try{
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
  d.execCommand=(command,unused,html)=>{assert.equal(command,'insertHTML');const selection=w.getSelection(),range=selection.getRangeAt(0),fragment=range.createContextualFragment(html),last=fragment.lastChild;range.deleteContents();range.insertNode(fragment);range.setStartAfter(last);range.collapse(true);selection.removeAllRanges();selection.addRange(range);return true;};
  w.eval('('+fixture.baseSetup.toString()+')();('+fixture.lifecycleSetup.toString()+')();('+fixture.setup.toString()+')();');
  fixture.scripts().forEach(s=>w.eval(s));await tick();
  const el=id=>d.getElementById(id),source=()=>d.querySelector('#runMeta95 [name=rateSource]'),editor=()=>source().parentElement.querySelector('[role=textbox]');
  async function click(label,scope=d){let button;for(let i=0;i<20;i++){button=[...scope.querySelectorAll('button')].find(b=>b.textContent.trim()===label&&!b.disabled);if(button)break;await tick();}assert(button,label);button.click();await tick();}
  const before=JSON.stringify(w.payrollTemplate1431.buildLines(w.Work82.run,w.payrollTemplate1431.defaultTemplate(w.Work82.run)));
  editor().textContent='Synthetic rate evidence';editor().dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(w.Work82.run.rateSource,'Synthetic rate evidence');
  editor().focus();const range=d.createRange();range.selectNodeContents(editor());w.getSelection().removeAllRanges();w.getSelection().addRange(range);
  editor().dispatchEvent(new w.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));await tick();
  const dialog=el('memoLinkDialog143187'),original=source();assert(dialog,'Ctrl+K opens payroll source link dialog');assert(original.isConnected,'blur must not replace the source field');
  dialog.querySelector('[name=url]').value='javascript:alert(1)';dialog.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert.match(dialog.querySelector('[role=alert]').textContent,/http/);assert.equal(source().value,'Synthetic rate evidence');
  dialog.querySelector('[name=url]').value='https://example.test/rates?date=2026-10-30&currency=USD';
  dialog.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
  const savedSource='[Synthetic rate evidence](https://example.test/rates?date=2026-10-30&currency=USD)';
  assert.equal(source().value,savedSource);assert.equal(w.Work82.run.rateSource,savedSource);assert.equal(source(),original,'source editing keeps its DOM and focus');
  assert.equal(JSON.stringify(w.payrollTemplate1431.buildLines(w.Work82.run,w.payrollTemplate1431.defaultTemplate(w.Work82.run))),before,'source edit must not alter financial lines');
  await w.saveRun82(false);await tick();assert.equal(w.qa276.record.data.rateSource,savedSource);
  w.openRun82(w.qa276.record.id);await tick();assert.equal(source().value,savedSource);assert(editor().querySelector('a[href^="https://example.test/"]'),'saved link reloads as a link');
  // Report metadata uses the safe link renderer; hostile markup stays text.
  const reports=fs.readFileSync('src/reports/financial/reports14254.js','utf8'),metadata=reports.slice(reports.indexOf('function payrollMetadata277('),reports.indexOf('function payroll(run,results)'));
  w.eval('var textStyle="",quantity=formatAppNumber;'+metadata);const report=d.createElement('div');report.innerHTML=w.payrollMetadata277(w.Work82.run);assert(report.querySelector('a[href^="https://example.test/"]'));
  report.innerHTML=w.payrollMetadata277({...w.Work82.run,rateSource:'<img src=x onerror=alert(1)>'});assert.equal(report.querySelector('img'),null);
  await click('Save & Close Payroll',el('payroll-entries'));await click('Confirm',[...d.querySelectorAll('.ui-overlay108')].at(-1));assert.equal(w.Work82.run.status,'finalized');assert(source().disabled);assert(source().parentElement.querySelector('button').disabled);assert.equal(w.qa276.postCalls,0);
  await click('Payroll journal',el('payroll-entries'));assert(d.querySelector('.pay-date274 a[href^="https://example.test/"]'));
  if(mode==='prepare'){
   await click('Prepare in Transactions');assert.match(el('jeGeneralMemo').value,/\[Payroll:test-run\]/);assert(el('jeGeneralMemo').value.includes(savedSource));assert.match(el('jeGeneralMemo').value,/₭22,294\/\$/);assert.equal(w.qa276.postCalls,0);
  }else{
   await click('Post to Active Journal');await click('Cancel',[...d.querySelectorAll('.ui-overlay108')].at(-1));assert.equal(w.qa276.postCalls,0);
   await click('Post to Active Journal');await click('Confirm',[...d.querySelectorAll('.ui-overlay108')].at(-1));assert.equal(w.qa276.postCalls,1);assert(w.qa276.entries[0].memo.includes(savedSource));assert.match(w.qa276.entries[0].memo,/Rate date: 2026-10-30/);assert.match(w.qa276.entries[0].memo,/\[Payroll:test-run\]/);
  }
 }finally{w.close();}
}
(async()=>{await scenario('prepare');await scenario('direct');console.log('PASS payroll source link: Ctrl+K, safe URL validation, stable blur, save/reload, locked finalized source, report link, prepared and direct journal evidence, unchanged financial lines and cancellation.');})().catch(e=>{console.error(e);process.exitCode=1;});
