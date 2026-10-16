const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open();const errors=[];page.on('pageerror',e=>errors.push(e.message));await login();
 await page.evaluate(()=>{
  switchTab('accounts-modular-container');scrollToAccountModule('sec-chart-accounts');
  AccountingStore.accounts=Array.from({length:205},(_,i)=>({id:'page-'+i,code:String(1000+i),name:'Pagination Account '+i,currency:i%2?'USD':'LAK',type:'ASSET',desc:'Page retention fixture',isPosting:true}));
  document.getElementById('searchCoa1439').value='';renderChartOfAccountsTable();
 });
 const pager=page.locator('#coaTableBody').locator('xpath=ancestor::table').locator('xpath=ancestor::*[contains(@class,"table-container")]/following-sibling::*[contains(@class,"table-pages14383")]');
 await page.waitForFunction(()=>document.querySelector('#coaTableBody tr:not([data-page-hidden14383])'));
 assert.match(await pager.innerText(),/1 of 3/);
 await pager.getByRole('button',{name:'Next',exact:true}).click();assert.match(await pager.innerText(),/2 of 3/);
 const position=await page.evaluate(()=>{const table=document.getElementById('coaTableBody').closest('table'),scroll=document.querySelector('.workspace-scroll');return {top:table.getBoundingClientRect().top,viewport:innerHeight,scroll:scroll.scrollTop}});
 assert.ok(position.top>=0&&position.top<position.viewport/2,JSON.stringify(position));
 await page.evaluate(()=>renderChartOfAccountsTable());assert.match(await pager.innerText(),/2 of 3/);
 assert.equal(await page.locator('#coaTableBody tr:not([data-page-hidden14383])').first().locator('td').first().innerText(),'1100');
 assert.ok(Math.abs((await page.evaluate(()=>document.querySelector('.workspace-scroll').scrollTop))-position.scroll)<3);
 await pager.getByRole('button',{name:'Next',exact:true}).click();assert.match(await pager.innerText(),/3 of 3/);
 await page.evaluate(()=>{AccountingStore.accounts.splice(150);renderChartOfAccountsTable()});assert.match(await pager.innerText(),/2 of 2/);
 await page.evaluate(()=>{document.getElementById('searchCoa1439').value='Account 149';renderChartOfAccountsTable()});assert.match(await pager.innerText(),/1 of 1/);
 console.log('PASS page retained during rebuilt refresh, Next scrolls to top, deleted rows clamp page, search resets page');
 await page.evaluate(()=>{
  AccountingStore.accounts=templateAliases14397.map(([oldCode,oldName,currency,code,name],i)=>({id:'alias-'+i,code,name,currency,isPosting:true,isTechnical:true,type:'SYSTEM'}));
 });
 const aliases=await page.evaluate(()=>templateAliases14397.map(([code,name,currency,newCode],i)=>{
  const old=resolveTemplateAccount14397({account:code+' — '+name});
  const legacy=resolveTemplateAccount14397({account:name+' ('+currency+')'});
  const identity=resolveTemplateAccount14397({accountId:'alias-'+i,currency,account:'old display'});
  return {expected:newCode,actual:old?.code,legacy:legacy?.code,identity:identity?.code};
 }));for(const a of aliases){assert.equal(a.actual,a.expected);assert.equal(a.legacy,a.expected);assert.equal(a.identity,a.expected)}
 assert.equal(await page.evaluate(()=>resolveTemplateAccount14397({accountId:'missing',account:AccountingStore.accounts[0].code})==null),true);
 await page.evaluate(()=>{switchTab('journal');TemplateStore.templates=[{id:'legacy-test',name:'Legacy mapping',lines:[{account:'5310 — Salaries – USD',memo:'Salary foreign amount'}]}];applyTransactionTemplate('legacy-test')});
 assert.match(await page.locator('#jeLinesBody .je-line-acc').first().inputValue(),/^9231 — /);
 assert.equal(await page.evaluate(()=>captureTemplateStructure().lines[0].accountId),await page.evaluate(()=>AccountingStore.accounts.find(a=>a.code==='9231').id));
 const missing=await page.evaluate(()=>{const a=AccountingStore.accounts.find(a=>a.code==='9231');a.currency='THB';return resolveTemplateAccount14397({account:'5310 — Salaries – USD'})==null});assert.equal(missing,true);
 const builtins=await page.evaluate(()=>JournalFX14383.templates().flatMap(t=>t.lines).filter(l=>/^9/.test(l.code)).map(l=>l.code));assert.ok(builtins.includes('9101')&&builtins.includes('9202')&&builtins.includes('9190')&&builtins.includes('9290'));
 assert.deepEqual(errors,[]);console.log('PASS saved display aliases, stable template IDs, currency mismatch blocked, new built-in mapping codes, no browser errors');
 }finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
