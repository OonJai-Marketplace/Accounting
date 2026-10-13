const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(failure=''){
 const calls=[],stages=[],nodes={p:{},button:{},'.loading-orbit1444':{}};
 Object.defineProperty(nodes.p,'textContent',{set:v=>stages.push(v)});
 const box={hidden:false,setAttribute(){},querySelector:s=>nodes[s]};
 const ctx={console,Promise,Map,Set,Date,Error,navigator:{onLine:true},document:{readyState:'complete',body:{classList:{toggle(){}}},getElementById:()=>box,addEventListener(){}},addEventListener(){},switchTab:id=>ctx.Location69.view=id,scrollToAccountModule:id=>ctx.Location69.view=id,setTimeout:(f,ms)=>ms===30?setTimeout(f,0):0,clearTimeout(){},Location69:{view:'journal'},liveProfile:{id:'admin',role:'admin'},access113:{can:()=>true},Work82:{},localFirst14333:{initialize:async()=>{},loadDocuments:async()=>{calls.push('documents');return {data:[],error:null}}},documentWorkspace105:{prepare:async()=>{}},offline14239:{cacheRevision:0,changed(){}},idleSync14341:{allowed:()=>false,preparation(){}}};
 for(const [name,stage] of Object.entries({loadReferenceDataFromSupabase:'reference',loadBusinessSettingsFromSupabase:'business',loadProfilesFromSupabase:'profiles',loadJournalFromSupabase:'journal',loadWork82:'payroll',loadLegalDocumentsFromSupabase:'legal',loadSubmissionsFromSupabase:'submissions'}))ctx[name]=async()=>{calls.push(stage);if(failure===stage)throw Error(stage+' unavailable')};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('scripts/startup14257.js','utf8'),ctx);return {ctx,calls,stages};
}
(async()=>{
 const a=fixture();await a.ctx.startupData1443(()=>{});assert.deepEqual(a.calls,['reference','business','profiles','journal','payroll','documents']);assert(a.ctx.startup14257.prepared);assert.equal(a.stages.filter(x=>/^Preparing \w+ ·/.test(x)).length,6);
 for(const id of ['journal','settings-users','payroll-history','document-editor105','sec-chart'])a.ctx.switchTab(id);
 await Promise.resolve();assert.equal(a.calls.length,6,'navigation reuses successful stages');assert(a.ctx.startup14257.isPrepared('profiles'));a.ctx.liveProfile={id:'other',role:'admin'};assert(!a.ctx.startup14257.isPrepared('profiles'),'ready state is per identity');console.log('PASS six sequential preload stages, no repeat work, identity isolation');
 for(const failed of ['business','profiles','payroll','documents']){
  const b=fixture(failed);if(failed==='documents')b.ctx.localFirst14333.loadDocuments=async()=>({error:Error('documents unavailable')});await b.ctx.startupData1443(()=>{});assert.equal(b.ctx.startup14257.prepared,false);assert(!b.ctx.startup14257.isPrepared(failed));assert(b.stages.at(-1).startsWith('Preparation paused:'));console.log('PASS failed stage remains unprepared:',failed);
 }
 for(const [file,fn] of [['src/settings/users/profile-data.js','loadProfilesFromSupabase'],['src/settings/business/business-data.js','loadBusinessSettingsFromSupabase']]){
  const error=Error('Server unavailable'),query=new Proxy({}, {get:(_,key)=>key==='then'?(resolve=>Promise.resolve({error}).then(resolve)):()=>query});const ctx={liveProfile:{role:'admin'},ojmDb:{from:()=>query}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(file,'utf8'),ctx);await assert.rejects(ctx[fn](),/Server unavailable/);
 }console.log('PASS business/profile errors reach the preload coordinator');
})().catch(e=>{console.error(e);process.exitCode=1});
