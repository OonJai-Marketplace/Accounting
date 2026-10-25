/* Background refresh must retain unsaved business fields and their dirty state. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const fields={companyName:{value:''},phone:{value:''}},badge={textContent:'',classList:{add(){},toggle(){}}},status={textContent:'',classList:{add(){},remove(){}}};
let release;
const q={select(){return this},eq(){return this},single:()=>new Promise(r=>release=r)};
const ctx={liveProfile:{id:'first'},ojmDb:{from:()=>q},BusinessSettings:{current:{companyName:'',phone:''}},AccountingStore:{},BUSINESS_FIELD_MAP:{companyName:'companyName',phone:'phone'},document:{getElementById:id=>fields[id]||({businessSavedBadge:badge,businessSettingsStatus:status})[id]||null,querySelector:()=>null,querySelectorAll:()=>[]},collectBusinessSettings:()=>Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value.trim()])),renderBusinessIdentity(){},syncEntrySequence(){},updateNextEntryIdDisplay(){},switchTab(){},scrollToAccountModule(){},reloadBusinessSettings(){},saveBusinessSettings(){},setTimeout,clearTimeout};
ctx.window=ctx;vm.createContext(ctx);
for(const file of ['src/settings/business/business-data.js','src/settings/application/settings-navigation.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const response=(name,phone)=>release({data:{display_name:name,phone},error:null});
(async()=>{
 let pending=ctx.loadBusinessSettingsFromSupabase();response('Original Company','111');await pending;
 assert.equal(fields.companyName.value,'Original Company');assert.equal(badge.textContent,'Saved');
 fields.companyName.value='Unsaved Company';
 pending=ctx.loadBusinessSettingsFromSupabase();response('Refreshed Company','222');await pending;
 assert.equal(fields.companyName.value,'Unsaved Company','existing draft retained');
 assert.equal(fields.phone.value,'222','pristine field receives server change');
 assert.equal(ctx.BusinessSettings.current.companyName,'Refreshed Company','saved model remains authoritative');
 assert.equal(badge.textContent,'Unsaved changes');assert.match(status.textContent,/unsaved changes are retained/);
 ctx.reloadBusinessSettings();assert.equal(fields.companyName.value,'Refreshed Company');assert.equal(badge.textContent,'Saved');
 pending=ctx.loadBusinessSettingsFromSupabase();fields.phone.value='Typed during request';response('Latest Company','333');await pending;
 assert.equal(fields.companyName.value,'Latest Company');assert.equal(fields.phone.value,'Typed during request');assert.equal(badge.textContent,'Unsaved changes');
 ctx.liveProfile={id:'second'};pending=ctx.loadBusinessSettingsFromSupabase();response('Second Account','444');await pending;
 assert.equal(fields.companyName.value,'Second Account');assert.equal(fields.phone.value,'444','old account draft cannot leak to new account');
 fields.companyName.value='Second Account Draft';ctx.ojmDb={from:()=>q};pending=ctx.loadBusinessSettingsFromSupabase();response('New Database','555');await pending;
 assert.equal(fields.companyName.value,'New Database','replacement database uses its own saved profile');
 pending=ctx.loadBusinessSettingsFromSupabase();ctx.liveProfile={id:'third'};response('Stale response','666');await pending;
 assert.equal(fields.companyName.value,'New Database','late response from previous actor is ignored');
 console.log('PASS business refresh preserves old/new drafts, updates pristine fields and baseline, supports Undo, and isolates accounts/database clients');
})().catch(e=>{console.error(e);process.exitCode=1});
