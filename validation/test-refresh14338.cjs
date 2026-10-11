const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
let count=1,delay=0,denied=false;
const server=http.createServer((req,res)=>{
 if(req.url.startsWith('/rest/v1/')){const value=count;setTimeout(()=>{res.setHeader('Content-Type','application/json');res.statusCode=denied?403:200;res.end(JSON.stringify(denied?{message:'denied'}:{count:value}));},delay);return;}
 if(req.url==='/fixture'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body></body>');return;}
 try{res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,req.url.split('?')[0])))}catch{res.statusCode=404;res.end()}
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:'/tmp/chromium',args:['--no-sandbox']});
 try{
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/fixture');
 await page.evaluate(()=>{window.OJM_SUPABASE_URL=location.origin;window.liveProfile={id:'actor-a',role:'admin'};window.access113={can:()=>true};window.loadStaffJournalsForReview=async()=>{};window.readRows=async()=>{const t='x.'+btoa(JSON.stringify({sub:liveProfile.id,exp:Math.floor(Date.now()/1000)+3600}))+'.x';const r=await fetch(location.origin+'/rest/v1/journal_entries',{headers:{Authorization:'Bearer '+t}});if(!r.ok)throw Error('Read denied '+r.status);return r.json()};});
 await page.addScriptTag({url:'/scripts/offline14239.js'});
 assert.equal(await page.evaluate(async()=> (await offline14239.snapshot('test-year',readRows)).count),1);
 count=101;delay=2300;
 // This reproduces the old fast-fallback behavior: returning the old value
 // marks reachability false, even though the server would finish successfully.
 assert.equal(await page.evaluate(async()=> (await readRows()).count),1);
 assert.equal(await page.evaluate(()=>offline14239.offline()),true);
 const refreshed=await page.evaluate(()=>offline14239.freshReads(()=>offline14239.snapshot('test-year',readRows)));
 assert.equal(refreshed.count,101);assert.equal(await page.evaluate(()=>offline14239.offline()),false);
 await page.evaluate(()=>offline14239.connectionIssue('Earlier slow request'));
 const newlyRequested=await page.evaluate(()=>offline14239.snapshot('previously-unseen-period',readRows));
 assert.equal(newlyRequested.count,101,'A new period must reconnect after an earlier transport failure');
 assert.equal(await page.evaluate(()=>offline14239.offline()),false);
 await context.setOffline(true);assert.equal(await page.evaluate(async()=> (await offline14239.snapshot('test-year',readRows)).count),101);
 await context.setOffline(false);delay=0;denied=true;
 assert.match(await page.evaluate(async()=>{try{await offline14239.freshReads(()=>offline14239.snapshot('test-year',readRows));return 'unexpected'}catch(e){return e.message}}),/Read denied 403/);denied=false;
 // Actual startup code: a failed optional profile download must not prevent
 // journal/payroll refresh, and concurrent reconnects must share one job.
 await page.evaluate(()=>{
 window.calls=[];window.notice='';window.freshLoginRequested=false;window.Location69={view:'chart-of-accounts'};
 window.localFirst14333={initialize:async()=>{},setNotice:s=>notice=s,loadDocuments:async()=>({data:[],error:null})};
 window.loadReferenceDataFromSupabase=async()=>{calls.push('reference')};window.loadBusinessSettingsFromSupabase=async()=>{calls.push('business')};
 window.loadProfilesFromSupabase=async()=>{calls.push('profiles');throw Error('profile refresh failed')};
 window.loadJournalFromSupabase=async options=>{calls.push(options.cacheFirst?'journal-cache':'journal-server');window.loadedJournal=await offline14239.snapshot('test-year',readRows,options)};
 window.Work82={error:''};window.loadWork82=async force=>{calls.push('payroll-'+force);window.loadedPayroll=9};window.loadLegalDocumentsFromSupabase=async()=>{};window.loadSubmissionsFromSupabase=async()=>{};window.documentWorkspace105={prepare:async()=>{}};
 window.switchTab=()=>{};window.scrollToAccountModule=()=>{};window.releaseLogin1443=()=>{};
 });
 await page.addScriptTag({url:'/scripts/startup14257.js'});await page.evaluate(()=>startupData1443(()=>{}));
 await page.waitForFunction(()=>window.calls.includes('payroll-true')&&!startup14257.preparing);
 assert.equal(await page.evaluate(()=>loadedJournal.count),101);assert.equal(await page.evaluate(()=>loadedPayroll),9);assert.match(await page.evaluate(()=>notice),/profile refresh failed/);assert.equal(await page.evaluate(()=>startup14257.prepared),false);
 const before=await page.evaluate(()=>calls.filter(x=>x==='journal-server').length);
 await page.evaluate(()=>{loadProfilesFromSupabase=async()=>calls.push('profiles-ok');dispatchEvent(new Event('online'));dispatchEvent(new Event('online'))});
 await page.waitForFunction(()=>startup14257.prepared===true);assert.equal(await page.evaluate(()=>calls.filter(x=>x==='journal-server').length),before+1);assert.equal(await page.evaluate(()=>notice),'');
 console.log(JSON.stringify({slowServerRevalidated:true,unreachableRecovery:true,offlineSnapshotRetained:true,permissionDenialNotMasked:true,independentLoadsContinue:true,reconnectDeduplicated:true}));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
