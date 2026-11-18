const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/documents/scanner/core202.js'),{jsPDF}=require('../assets/vendor/document14285/jspdf.umd.min.js');
const source=fs.readFileSync('src/documents/scanner/scanner202.js','utf8');
const part=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)+a.length));
(async()=>{
 const batch=C.create('2026-11','OJM260318');batch.folder={id:'folder',name:'Journal receipts'};
 batch.groups[0].label='OJM260318';const second=C.addGroup(batch,'journal','OJM260320');
 batch.pages=[{id:crypto.randomUUID(),group:batch.groups[0].id},{id:crypto.randomUUID(),group:second.id},{id:crypto.randomUUID(),group:second.id}];
 const records=new Map(),files=new Map();let starts=0,writes=0,linkAttempts=0,manifest,checks=0,failUpload=true;
 const image='data:image/jpeg;base64,'+fs.readFileSync('docs/evidence/upcoming280-synthetic-preview.jpg').toString('base64');
 const c={C,ReceiptCore202:C,jspdf:{jsPDF},crypto,Blob,URL,AbortSignal,Uint8Array,Date,structuredClone,setTimeout,console,
  draft:batch,draftIndex:[],pdfCache:null,saveChain:Promise.resolve(),window:{},idKey221:s=>String(s).replace(/^OJM[ -]*(\d{2})[ -]*(\d{4})$/i,'OJM$1$2'),settings:{folder:batch.folder},driveState:{email:'fixture@test.invalid',connected:true},
  owner:'fixture',scope:'fixture',OJM_SUPABASE_ANON_KEY:'fixture',db:{auth:{getSession:async()=>({data:{session:{user:{id:'fixture'}}}})}},localStorage:{setItem(){}},
  cameraQueue:[],editing:null,valid(){},render(){},status(){},closeDialog(){},$:()=>null,storageMode:()=>'drive',connection:async()=>{},checkDestination215:async()=>{},rememberIDs215:async()=>{},
  validateIDs215:async groups=>{checks++;return groups.map(g=>({...g,available:true,journal_ids:['uuid-'+g.label]}));},
  store:async(key,value)=>{if(key.startsWith('page:'))return {width:300,height:400,data:image};if(value!==undefined)records.set(key,structuredClone(value));return structuredClone(records.get(key));},
  writeRecords:async(entries,deletes)=>{for(const key of deletes||[])records.delete(key);for(const [key,value]of entries)records.set(key,structuredClone(value));},
  api:async(action,data)=>{
   if(action==='reserve-id')return {ids:['reserved-batch']};
   if(action==='file'){if(!files.has(data.id))throw Error('404 not found');return files.get(data.id);}
   if(action==='upload-start'){starts++;assert.equal(data.groups.length,2);assert.equal(data.name,'OJM260318 to OJM260320.pdf');return {session:'https://www.googleapis.com/upload/drive/v3/files?upload_id=fixture',origin477:true};}
   throw Error(action);
  },
  fetch:async(url,opts)=>{
   if(failUpload){failUpload=false;throw TypeError('Failed to fetch');}
   if(opts.headers['Content-Range'].startsWith('bytes */'))return new Response(null,{status:308});
   writes++;const data=await opts.body.arrayBuffer(),sha=Buffer.from(await crypto.subtle.digest('SHA-256',data)).toString('hex');
   assert.equal((Buffer.from(data).toString('latin1').match(/\/Type \/Page\b/g)||[]).length,4,'one contents page plus every scan');
   files.set('reserved-batch',{id:'reserved-batch',version:'1',size:data.byteLength,sha256Checksum:sha,name:'OJM260318 to OJM260320.pdf'});return new Response(null,{status:200});
  },
  ReceiptLinks208:{BUCKET:'fixture',create:()=>({previews:async()=>{},register:async value=>{linkAttempts++;if(linkAttempts===1)throw Error('link service unavailable');manifest=value;return {pending:0};}})}
 };
 vm.createContext(c);vm.runInContext(fs.readFileSync('src/documents/scanner/pdf202.js','utf8'),c);
 vm.runInContext(part('function draftSummary(', 'function draftsPanel(')+part('async function prepareEntryFiles()', 'function pdfFilename(')+part('function uploadHeaders(', 'async function download()')+part('async function saveBatch215()', 'async function action215(')+part('async function startNextBatch477()', 'async function nextEntry215('),c);
 await assert.rejects(c.saveBatch215(),/All scans are kept/);assert.equal(c.draft.pages.length,3);assert.equal(c.draft.upload.id,'reserved-batch');assert.equal(c.draft.completed215,undefined);
 await assert.rejects(c.saveBatch215(),/links are pending/);assert.equal(writes,1);assert.equal(c.draft.completed215,undefined);
 await c.saveBatch215();assert.equal(writes,1,'a lost link does not upload a second file');assert.equal(starts,1);assert.equal(checks,3,'fresh permission validation on each save');
 assert.equal(c.draft.completed215,c.draft.revision);assert.deepEqual(Array.from(manifest.groups,g=>g.entryLabel),['OJM260318','OJM260320']);assert.deepEqual(Array.from(manifest.pages,p=>p.page),[2,3,4]);assert.equal(new Set(manifest.pages.map(p=>p.groupID)).size,2);
 const savedID=c.draft.id;await c.startNextBatch477();assert.equal(c.draft,null);assert.equal(records.get('current'),null);assert.ok(records.has('draft:'+savedID),'completed PDF stays available');
 // Old, entirely unsaved per-entry drafts can be reconstructed without copying pixels.
 const old=C.entryDocuments(batch);c.draft=old[0];c.draftIndex=old.map(c.draftSummary);for(const item of old)records.set('draft:'+item.id,structuredClone(item));
 assert.equal(await c.restoreUnsavedBatch477(),true);assert.equal(c.draft.id,batch.id);assert.equal(c.draft.pages.length,3);assert.equal(c.draft.entryFile,undefined);
 c.draft=old[0];c.draftIndex=old.map(c.draftSummary);old[1].upload={id:'in-progress'};for(const item of old)records.set('draft:'+item.id,structuredClone(item));assert.equal(await c.restoreUnsavedBatch477(),false,'never merge an in-progress upload');
 let nativeCalls=0;c.ReceiptNative214=c.window.ReceiptNative214={upload:async()=>{nativeCalls++;return {status:308};}};assert.equal((await c.driveUpload477('x',{})).status,308);assert.equal(nativeCalls,1);
 console.log('PASS single batch PDF, two linked entry IDs, failed upload retention, link-only retry, next batch boundary, safe legacy recovery and native upload routing');
})().catch(e=>{console.error(e);process.exitCode=1;});
