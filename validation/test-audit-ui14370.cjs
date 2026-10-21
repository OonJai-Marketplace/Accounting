const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),{chromium}=require('playwright');
(async()=>{const server=http.createServer((req,res)=>res.end('<!doctype html><html data-device132="phone"><body></body></html>'));await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
await page.evaluate(()=>{document.body.innerHTML='<div id="userPermissionGrid">'+[3,6].map(n=>'<details><div class="permission-grid113" style="--permission-count:'+n+'">'+['Header','Employee'].map(label=>'<span>'+label+'</span>'+Array.from({length:n},(_,i)=>'<label><input data-action113="'+['view','edit','export','approve','post','void'][i]+'"></label>').join('')).join('')+'</div></details>').join('')+'</div>';window.AccountingStore={accounts:[{code:'1',name:'Cash',currency:'LAK'},{code:'10',name:'Cash on Hand',currency:'USD'}]}});
for(const name of ['src/settings/application/settings-phone133.js','src/bookkeeping/journal/column-display.js','src/maintenance/audit/audit-storage14232.js'])await page.addScriptTag({content:fs.readFileSync(name,'utf8')});
assert.deepEqual(await page.evaluate(()=>{compactUserSettings133();return [...document.querySelectorAll('.permission-grid113')].map(g=>[...g.children].map(row=>row.children.length))}),[[4,4],[7,7]]);
assert.deepEqual(await page.evaluate(()=>['Cash on Hand','10','10 — Cash on Hand','Cash on Hand (USD)','100 — Unknown'].map(v=>getCleanAccountDisplay(v).name)),['Cash on Hand','Cash on Hand','Cash on Hand','Cash on Hand','Unknown']);
const storage=await page.evaluate(async()=>{await auditStorage14232.save('test',{amount:12},0);let conflict=false;try{await auditStorage14232.save('test',{amount:99},0)}catch{conflict=true}window.deviceVault14334={unpack(){throw Error('Unreadable encrypted record')},pack:v=>v};let rejected=false;try{await auditStorage14232.save('test',{},1)}catch(e){rejected=e.message==='Unreadable encrypted record'}delete window.deviceVault14334;return {conflict,rejected,value:(await auditStorage14232.read('test')).value}});assert.deepEqual(storage,{conflict:true,rejected:true,value:{amount:12}});
const payrollSource=['src/payroll/workspace/groups-v96/calculation-details143157.js','src/payroll/workspace/groups-v96/tables-and-attendance.js'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
assert.deepEqual(await page.evaluate(code=>{
 const run={rows:[{employeeId:'low',employee:{name:'Low',salary:10,currency:'LAK'},input:{}},{employeeId:'high',employee:{name:'High',salary:20,currency:'LAK'},input:{}}],results:['low','high'].map((id,i)=>({employeeId:id,contract:(i+1)*10,late:0,absence:0,penalty:0,other:0,gross:1,taxable:1,employeePit:0,employeeSso:0,paidAmount:1}))};
 const table=(heads,rows)=>'<table><thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 const render=new Function('esc','money','results','payrollOrder14337','table82','ApplicationSettings','ui',code+';return groupedTables;')(String,String,r=>r.results,(a,b)=>b.employee.salary-a.employee.salary,table,{payroll:{}},{open:{}});
 document.body.innerHTML=render(run);document.body.innerHTML=render(run);
 return [...document.querySelectorAll('[data-group95="run-breakdown"] tbody tr')].map(tr=>({name:tr.cells[0].textContent,salary:tr.cells[1].textContent,nested:tr.querySelectorAll('td td').length}));
},payrollSource),[{name:'High',salary:'₭20',nested:0},{name:'Low',salary:'₭10',nested:0}]);
await page.evaluate(()=>{document.body.innerHTML='';window.reviewStaffJournals=[];window.liveProfile=null;window.CurrencyStore={currencies:[{code:'X['}]};window.formatAppNumber=String;window.escapeHtml=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));});
await page.addScriptTag({content:fs.readFileSync('src/reports/history/saved-reports1434.js','utf8')});
assert.deepEqual(await page.evaluate(()=>{
 const make=footer=>'<h3>USD</h3><table><thead><tr><th>Account</th><th>Amount USD</th></tr></thead><tbody><tr><td>Cash</td><td>0</td></tr></tbody>'+footer+'</table>';
 const result=[cleanPrint1434(make('<tfoot><tr><th>Total</th><td>15</td></tr></tfoot>')).includes('<table'),cleanPrint1434(make('<tfoot><tr><th>Total</th><td>0</td></tr></tfoot>')).includes('<table'),cleanPrint1434(make('<tfoot><tr><td colspan="2">Balance 15</td></tr></tfoot>')).includes('colspan="2"')];
 return result;
}),[true,false,true]);
console.log('PASS zero-table cleanup preserves nonzero footers and merged totals, and accepts literal currency codes');
console.log('PASS payroll breakdown retains sorted employee amounts and never nests table cells');
console.log('PASS variable phone permission columns, exact account labels and audit storage conflict/decryption failure recovery');
}finally{await browser?.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
