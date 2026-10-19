const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let stored=null, fail=false;
const db={from(){let operation='read',payload,filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},maybeSingle(){return Promise.resolve(fail?{error:{message:'offline'}}:{data:structuredClone(stored)})},insert(p){operation='insert';payload=p;return q},update(p){operation='update';payload=p;return q},then(resolve){if(fail)return resolve({error:{message:'offline'}});if(operation==='insert'&&stored)return resolve({error:{message:'duplicate'}});if(operation==='update'&&filters.version!==stored?.version)return resolve({data:[]});stored=structuredClone(payload);resolve({data:[structuredClone(stored)]})}};return q}};
function device(){const cache=new Map();const c=vm.createContext({console,structuredClone,window:{OJM_SUPABASE_URL:'test'},ojmDb:db,liveProfile:{id:'admin',role:'admin'},localStorage:{getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)},document:{querySelector:()=>null},Work82:{run:{status:'draft',reviewed:true}},setSettingsFormValues(){}});vm.runInContext(fs.readFileSync('src/settings/application/settings-store.js','utf8')+fs.readFileSync('src/payroll/engine/payroll-engine-v82.js','utf8'),c);return {run:s=>vm.runInContext(s,c),c}}
(async()=>{const a=device(),b=device();await assert.rejects(a.run('payrollTaxSettings.verify()'),/save Payroll and Tax/);
await a.run("payrollTaxSettings.save('tax',{ssoEmployeeRate:'4',pit2Rate:'7'})");assert.equal(stored.version,1);await b.run('payrollTaxSettings.load()');assert.equal(b.run('ApplicationSettings.tax.ssoEmployeeRate'),'4');assert.equal(b.run('Work82.run.reviewed'),false);
assert.equal(await b.run('payrollTaxSettings.verify()'),1);
await a.run("payrollTaxSettings.save('payroll',{pitSharing:'employee',attendanceLegend95:[{code:'L'}]})");await assert.rejects(b.run("payrollTaxSettings.save('tax',{pit2Rate:'8'})"),/another device/);assert.equal(stored.data.tax.pit2Rate,'7');
await assert.rejects(b.run('payrollTaxSettings.verify()'),/changed on another device/);assert.equal(await b.run('payrollTaxSettings.verify()'),2);
// Database JSON key order must not create a false configuration change.
stored.data=Object.fromEntries(Object.entries(stored.data).reverse());assert.equal(await b.run('payrollTaxSettings.verify()'),2);
await b.run("payrollTaxSettings.save('payroll',{nonWorkDays99:[0,6]})");assert.equal(stored.data.payroll.attendanceLegend95[0].code,'L');
fail=true;await assert.rejects(b.run("payrollTaxSettings.save('tax',{pit2Rate:'9'})"),/not saved/);assert.equal(b.run('ApplicationSettings.tax.pit2Rate'),'7');await assert.rejects(b.run('payrollTaxSettings.verify()'),/could not be refreshed/);fail=false;
await assert.rejects(b.run("payrollTaxSettings.save('tax',{pit2Rate:'150'})"));assert.equal(stored.version,3);
b.run("liveProfile={id:'staff',role:'user'}");await assert.rejects(b.run("payrollTaxSettings.save('tax',{})"),/administrator/);
console.log('PASS: shared configuration, revision conflicts, finalization refresh, key ordering, structured rules, failed saves and role guard');})().catch(e=>{console.error(e);process.exit(1)});
