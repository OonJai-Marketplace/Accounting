const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open();const errors=[];page.on('pageerror',e=>errors.push(e.message));await login();
 await page.evaluate(()=>{
  switchTab('accounts-modular-container');scrollToAccountModule('sec-chart-accounts');
  AccountingStore.accounts=Array.from({length:205},(_,i)=>({id:'page-'+i,code:String(1000+i),name:'Pagination Account '+i,currency:i%2?'USD':'LAK',type:'ASSET',desc:'Page retention fixture',isPosting:true}));
  document.getElementById('searchCoa1439').value='';renderChartOfAccountsTable();
 });
 // v143.180 deliberately keeps the full filtered chart visible; only journal tables paginate.
 const rows=page.locator('#coaTableBody tr');
 assert.equal(await rows.count(),205);
 assert.equal(await page.locator('#coaTableBody tr[data-page-hidden14383]').count(),0);
 assert.equal(await page.locator('#chartMain143180 .table-pages14383').count(),0);
 await rows.last().evaluate(n=>n.scrollIntoView({block:'nearest'}));assert(await rows.last().isVisible());
 await page.evaluate(()=>renderChartOfAccountsTable());assert.equal(await rows.count(),205);
 await page.evaluate(()=>{AccountingStore.accounts.splice(150);renderChartOfAccountsTable()});assert.equal(await rows.count(),150);
 await page.evaluate(()=>{document.getElementById('searchCoa1439').value='Account 149';renderChartOfAccountsTable()});assert.equal(await rows.count(),1);assert.equal(await rows.first().locator('td').first().innerText(),'1149');
 await page.evaluate(()=>renderChartOfAccountsTable());assert.equal(await rows.count(),1,'refresh retains search');
 await page.evaluate(()=>{document.getElementById('searchCoa1439').value='';renderChartOfAccountsTable()});assert.equal(await rows.count(),150);
 console.log('PASS complete account list, last row reachable, refresh, deleted rows and retained search filter');
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
