const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
(async()=>{
 const dom=new JSDOM('<section id="journal" class="tab-content"></section><section id="report:custom" class="tab-content"><div class="r79" aria-busy="true"></div></section>',{url:'https://fixture.test',runScripts:'outside-only'}),w=dom.window;
 Object.assign(w,{liveProfile:{id:'owner'},ojmDb:{},AccountingStore:{accounts:[],subAccounts:[]},CurrencyStore:{currencies:[]},JournalModule:{entries:[]},PeriodReview:{periods:{}},Work82:{employees:[],leaves:[],runs:[],reports:[]},DemoAccess:{submissions:[]},Reports79:{cash:[],payroll:[]},preparedViews14340:{},startup14257:{dataReady:true,prepared:false},canAccessAppTarget:()=>true,switchTab:()=>{},scrollToAccountModule:()=>{},hydrateSupabaseSession:async()=>{w.switchTab('journal');w.scrollToAccountModule('sec-missing');return 'session restored';}});
 // This is the actual reported selector and fails in a standards DOM.
 assert.throws(()=>w.document.querySelector('# .r79[aria-busy="true"]'),/valid selector/);
 w.eval(fs.readFileSync('src/core/rendering/prepared-workspace14364.js','utf8'));await new Promise(r=>w.addEventListener('DOMContentLoaded',r,{once:true}));
 assert.equal(await w.hydrateSupabaseSession({user:{id:'owner'}}),'session restored');assert.equal(w.startup14257.interactive,true,'no selected tab must not abort session hydration');
 for(const id of ['',undefined,null,'missing','report:missing'])assert.doesNotThrow(()=>w.workspaceViews14364.remember(id));
 w.workspaceViews14364.remember('report:custom');assert(!w.workspaceViews14364.state().prepared.includes('report:custom'),'busy reports remain uncached');
 w.document.querySelector('.r79').setAttribute('aria-busy','false');w.workspaceViews14364.remember('report:custom');assert(w.workspaceViews14364.state().prepared.includes('report:custom'),'valid IDs with CSS punctuation are supported without selector interpolation');
 w.document.getElementById('journal').classList.add('active');w.switchTab('journal');assert(w.workspaceViews14364.state().prepared.includes('journal'),'normal navigation still records prepared views');
 w.liveProfile=null;w.workspaceViews14364.remember('journal');assert(!w.workspaceViews14364.state().prepared.includes('journal'),'signed-out views are not retained');dom.window.close();
 console.log('PASS reported invalid selector reproduced; session hydration with no active tab, missing/special IDs, busy reports, normal navigation and signed-out guards.');
})().catch(e=>{console.error(e);process.exit(1)});
