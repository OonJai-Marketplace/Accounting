const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let stored=null, fail=false;
const db={from(){let operation='read',payload,filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},maybeSingle(){return Promise.resolve(fail?{error:{message:'offline'}}:{data:structuredClone(stored)})},insert(p){operation='insert';payload=p;return q},update(p){operation='update';payload=p;return q},then(resolve){if(fail)return resolve({error:{message:'offline'}});if(operation==='insert'&&stored)return resolve({error:{message:'duplicate',code:'23505'}});if(operation==='update'&&filters.version!==stored?.version)return resolve({data:[]});stored=structuredClone(payload);resolve({data:[structuredClone(stored)]})}};return q}};
function device(){const cache=new Map();const c=vm.createContext({console,structuredClone,window:{OJM_SUPABASE_URL:'test'},ojmDb:db,liveProfile:{id:'admin',role:'admin'},localStorage:{getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)},document:{querySelector:()=>null},Work82:{run:{status:'draft',reviewed:true}},setSettingsFormValues(){}});vm.runInContext(fs.readFileSync('src/settings/application/settings-store.js','utf8')+fs.readFileSync('src/payroll/engine/payroll-engine-v82.js','utf8'),c);return {run:s=>vm.runInContext(s,c),c}}
(async()=>{const a=device(),b=device();assert.equal(await a.run('payrollTaxSettings.verify()'),1);assert.equal(stored.data.payroll.workDaysMonth,'26');
await a.run("payrollTaxSettings.save('tax',{ssoEmployeeRate:'4',pit2Rate:'7'})");assert.equal(stored.version,2);await b.run('payrollTaxSettings.load()');assert.equal(b.run('ApplicationSettings.tax.ssoEmployeeRate'),'4');assert.equal(b.run('Work82.run.reviewed'),false);
assert.equal(await b.run('payrollTaxSettings.verify()'),2);
await a.run("payrollTaxSettings.save('payroll',{pitSharing:'employee',attendanceLegend95:[{code:'L'}]})");await assert.rejects(b.run("payrollTaxSettings.save('tax',{pit2Rate:'8'})"),/another device/);assert.equal(stored.data.tax.pit2Rate,'7');
await assert.rejects(b.run('payrollTaxSettings.verify()'),/changed on another device/);assert.equal(await b.run('payrollTaxSettings.verify()'),3);
// Database JSON key order must not create a false configuration change.
stored.data=Object.fromEntries(Object.entries(stored.data).reverse());assert.equal(await b.run('payrollTaxSettings.verify()'),3);
await b.run("payrollTaxSettings.save('payroll',{nonWorkDays99:[0,6]})");assert.equal(stored.data.payroll.attendanceLegend95[0].code,'L');
fail=true;await assert.rejects(b.run("payrollTaxSettings.save('tax',{pit2Rate:'9'})"),/not saved/);assert.equal(b.run('ApplicationSettings.tax.pit2Rate'),'7');await assert.rejects(b.run('payrollTaxSettings.verify()'),/could not be refreshed/);fail=false;
await assert.rejects(b.run("payrollTaxSettings.save('tax',{pit2Rate:'150'})"));assert.equal(stored.version,4);
b.run("liveProfile={id:'staff',role:'user'}");await assert.rejects(b.run("payrollTaxSettings.save('tax',{})"),/administrator/);
// Empty-server migration preserves the first device's current configured values.
stored=null;const c=device(),d=device();c.run("ApplicationSettings.tax.pit2Rate='6';ApplicationSettings.payroll.workDaysMonth='22'");
await Promise.all([c.run('payrollTaxSettings.load()'),d.run('payrollTaxSettings.load()')]);
assert.equal(stored.version,1);assert.equal(stored.data.tax.pit2Rate,'6');assert.equal(d.run('ApplicationSettings.payroll.workDaysMonth'),'22');
assert.equal(await c.run('payrollTaxSettings.verify()'),1);
// Statutory reports use finalized snapshots, not recalculated current settings.
c.c.appLocalDate=()=> '2026-10-19';c.c.document={readyState:'loading',addEventListener(){},querySelector(){return null}};c.c.window.switchTab=()=>{};
c.run("Work82.runs=[{id:'saved',data:{month:'2026-10',status:'finalized',results:[{employeePit:123,employerPit:45,employeeSso:67,employerSso:89}]}},{id:'draft',data:{month:'2026-10',status:'draft',results:[{employeePit:999}]}}]");
vm.runInContext(fs.readFileSync('src/reports/tax/tax-reports-v102.js','utf8'),c.c);
assert.equal(c.c.window.taxReports102.payrollRows().length,1);assert.equal(c.c.window.taxReports102.payrollRows()[0].employeePit,123);
c.run("ApplicationSettings.tax.pit2Rate='20'");assert.equal(c.c.window.taxReports102.payrollRows()[0].employeePit,123);
console.log('PASS: automatic migration, racing initializers, statutory snapshots, shared configuration, revision conflicts, finalization refresh, key ordering, structured rules, failed saves and role guard');})().catch(e=>{console.error(e);process.exit(1)});
