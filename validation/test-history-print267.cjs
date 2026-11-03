const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<body><section class="tab-content active"><article data-record-key="journal:posted"><header>Posted report</header></article><details data-record-key="journal:approved"><summary>Approved report</summary></details><details data-record-key="journal:other"><summary>Other owner</summary></details></section></body>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
let printed=[],allowed=true;
Object.assign(w,{console,ojmDb:{},escapeHtml:String,formatAppNumber:String,access113:{can:()=>allowed},liveProfile:{id:'owner',role:'submitter'},liveProfiles:[],reviewStaffJournals:[{id:'posted',owner_id:'owner',status:'posted'},{id:'approved',owner_id:'owner',status:'approved'},{id:'other',owner_id:'someone',status:'posted'}],reportHistory1443:{load:async()=>[],has:id=>id==='posted'||id==='approved',print:id=>printed.push(id)},CurrencyStore:{currencies:[]},showCenterStatus(){}});const c=dom.getInternalVMContext();
vm.runInContext(fs.readFileSync('src/reports/history/saved-reports1434.js','utf8'),c);
(async()=>{
 w.savedReports1434.decorate();assert.equal(w.document.querySelectorAll('[data-print-saved1434]').length,2);
 const main=w.document.querySelector('header [data-print-saved1434]'),personal=w.document.querySelector('summary [data-print-saved1434]');assert(main,'expanded Journal History has Print');assert(personal,'personal History has Print');
 main.click();personal.click();await new Promise(r=>setTimeout(r,0));assert.deepEqual(printed,['posted','approved'],'both routes print the saved approved report');
 w.savedReports1434.decorate();assert.equal(w.document.querySelectorAll('[data-print-saved1434]').length,2,'decoration remains idempotent');
 allowed=false;await w.savedReports1434.print('posted');assert.equal(printed.length,2,'export permission is still checked');allowed=true;w.document.documentElement.dataset.device132='phone';assert.equal(w.savedReports1434.canPrint(),false,'phone printing restriction preserved');
 assert.match(fs.readFileSync('src/subusers/entries/personal-journal1437.js','utf8'),/data-record-key="journal:\$\{esc\(j.id\)\}"/,'personal history exposes its report identity');
 dom.window.close();console.log('PASS Print in expanded Journal History and personal History, immutable report routing, owner/export restrictions, phone exclusion and idempotent controls');
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
