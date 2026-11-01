const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
(async()=>{
 const dom=new JSDOM('<main id="settings-backup113"></main>',{url:'https://accounting.example.test',runScripts:'outside-only'});
 const w=dom.window,doc=w.document,tick=()=>new Promise(r=>setTimeout(r,0));
 try{
  let downloads=[],resolveRead;
  w.liveProfile={id:'admin',role:'admin'};w.shell113={admin:()=>w.liveProfile.role==='admin'};w.access113={can:()=>true};w.escapeHtml=s=>s;
  w.archiveScopes14232={scopes:[{id:'journal',group:'Accounting',label:'Journal',tables:['journals']},{id:'settings',group:'System',label:'Settings',tables:['settings'],protected:true}]};
  w.ojmDb={functions:{invoke:async()=>({data:{config:{sheet:'actualarchive123456789012',last_saved:'2026-11-01T00:00:00Z'},pending:0}})}};
  w.auditStorage14232={read:async key=>{assert.equal(key,'admin:admin');return {value:{draft:'retained'}};}};
  w.URL.createObjectURL=()=> 'blob:fixture';w.URL.revokeObjectURL=()=>{};w.exportCenter14337={fromLink:a=>{downloads.push(a.download);return true;}};
  w.eval(fs.readFileSync('src/maintenance/backup/data-tools14232.js','utf8'));
  await tick();assert(doc.getElementById('archiveExport129'));assert(doc.getElementById('resetFile14232'));assert.equal(doc.getElementById('resetApply14232').disabled,true);
  assert.equal(doc.querySelector('#auditUpload14232,#auditOpen14232,#prepareCurrentAudit14232,iframe'),null);assert.equal(w.dataTools14232.openAudit,undefined);
  await doc.getElementById('previousAuditDownload230').onclick();assert.equal(downloads.length,1);assert.match(downloads[0],/previous-local-audit/);assert.match(doc.getElementById('previousAuditStatus230').textContent,/stored copy has been retained/);
  w.auditStorage14232.read=()=>new Promise(r=>resolveRead=r);const pending=doc.getElementById('previousAuditDownload230').onclick();w.liveProfile.id='other';resolveRead({value:{draft:'private'}});await pending;assert.equal(downloads.length,1,'account changes must prevent a stale recovery download');
  w.liveProfile.id='admin';w.eval(fs.readFileSync('src/maintenance/backup/google-history194.js','utf8'));
  await doc.getElementById('historyCheck194').onclick();assert.match(doc.getElementById('historyWorkbook230').href,/actualarchive123456789012/);assert.equal(doc.getElementById('historyWorkbook230').hidden,false);assert(doc.getElementById('historyCleanup194'));
  console.log('PASS retired audit UI absent; portable backup/reset guards retained; prior copy recovery is account-bound; archive link uses current server configuration');
 }finally{w.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
