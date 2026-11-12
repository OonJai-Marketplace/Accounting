const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../src/documents/scanner/core202.js');
const { jsPDF } = require('../assets/vendor/document14285/jspdf.umd.min.js');
const { createHash } = require('node:crypto');
const image = fs.readFileSync('docs/evidence/upcoming280-synthetic-preview.jpg').toString('base64');
const source = fs.readFileSync('src/documents/scanner/scanner202.js','utf8');
function functions(start,end) {
  const a=source.indexOf(start), b=source.indexOf(end,a+start.length);
  assert.ok(a>=0 && b>a);
  return source.slice(a,b);
}
(async () => {
  const batch=core.create('2026-11','OJM260377');
  const first=batch.groups[0], second=core.addGroup(batch,'journal','OJM260378');
  const third=core.addGroup(batch,'hr','HR260010'), alias=core.addGroup(batch,'journal','OJM26-0377');
  core.addGroup(batch,'support','Unused');
  for (const group of [first,second,alias,third,first]) batch.pages.push({id:crypto.randomUUID(),group:group.id});
  const original=structuredClone(batch);
  const files=core.entryDocuments(batch);
  assert.deepEqual(batch,original);
  assert.deepEqual(files.map(d=>[d.groups[0].label,d.pages.length]),[['OJM260377',3],['OJM260378',1],['HR260010',1]]);
  const pageIDs=files.flatMap(file=>file.pages.map(p=>p.id));
  assert.equal(new Set(pageIDs).size,5);
  const old=Object.assign(structuredClone(batch),{saved:{revision:0},file:{id:'old-monthly-pdf'}});
  assert.ok(core.entryDocuments(old).every(file=>!file.file&&!file.saved&&file.id!==old.id));
  assert.throws(()=>core.entryDocuments({...batch,pending:[{}]}),/Review/);
  assert.throws(()=>core.entryDocuments({...batch,pages:[...batch.pages,{group:'missing'}]}),/Assign/);
  const records=new Map(), uploads=new Map(), starts=new Map(), manifests=new Map();
  let ioFail=true, linkFail=true, lastStatus='';
  const context={window:{},cameraQueue:[],C:core, ReceiptCore202:core,jspdf:{jsPDF}, setTimeout,clearTimeout,crypto,structuredClone,
    Date,URL,AbortSignal,Uint8Array,Blob,console,draft:batch,draftIndex:[],pdfCache:null,
    driveState:{connected:true,email:'fixture@example.test'},settings:{folder:batch.folder},saveChain:Promise.resolve(),
    owner:'fixture-owner',scope:'fixture',OJM_SUPABASE_ANON_KEY:'fixture',db:{auth:{getSession:async()=>({data:{session:{user:{id:'fixture-owner'}}}})}},
    primaryDialog:{open:false},localStorage:{setItem(){}},$:()=>null,valid(){},status(text){lastStatus=text},render(){},
    closeDialog(){},nativeUI215:()=>false,storageMode:()=>'drive',connection:async()=>{},showEntryFiles(){},
    async store(key,value){if(key.startsWith('page:'))return {width:100,height:120,data:'data:image/jpeg;base64,'+image};
      if(value!==undefined)records.set(key,structuredClone(value));return structuredClone(records.get(key));},
    async writeRecords(entries,deletes){if(ioFail)throw Error('device write failed');
      for(const key of deletes)records.delete(key);for(const [key,value] of entries)records.set(key,structuredClone(value));},
    api:async(action,data)=>{
      if(action==='reserve-id')return {ids:['drive-file-'+crypto.randomUUID()]};
      if(action==='file'){if(!uploads.has(data.id))throw Error('File not found 404');return uploads.get(data.id);}
      if(action==='upload-start'){starts.set(data.id,data);return {session:'https://www.googleapis.com/upload/drive/v3/files?upload_id='+data.id};}
      throw Error(action);
    },
    async fetch(url,options){const id=new URL(url).searchParams.get('upload_id');
      if(options.headers['Content-Range'].startsWith('bytes */'))return new Response(null,{status:uploads.has(id)?200:308});
      const bytes=Buffer.from(await options.body.arrayBuffer()), name=starts.get(id).name;
      assert.equal((bytes.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,starts.get(id).groups[0].label==='OJM260377'?3:1);
      const sha256Checksum=createHash('sha256').update(bytes).digest('hex');
      const info={id,name,sha256Checksum,size:bytes.length,version:'1'};
      assert.ok(!uploads.has(id),'a verified file was uploaded twice');uploads.set(id,info);
      return new Response(null,{status:200});},
    ReceiptLinks208:{BUCKET:'test',create:()=>({
      previews:async()=>{}, register:async(manifest)=>{
        assert.equal(uploads.get(manifest.pdf.path).sha256Checksum,manifest.pdf.sha256);
        if(manifest.groups[0].entryLabel==='OJM260378'&&linkFail){linkFail=false;throw Error('service interruption');}
        manifests.set(manifest.id,manifest);return {pending:0};}
    })}
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/documents/scanner/pdf202.js','utf8'),context);
  vm.runInContext(functions('function draftSummary(', 'function draftsPanel(')+
    functions('async function prepareEntryFiles()', 'function pdfFilename(')+
    functions('function uploadHeaders(', 'async function download()'),context);
  context.showEntryFiles=()=>{};
  await assert.rejects(context.prepareEntryFiles(),/device write failed/);
  assert.deepEqual(context.draft,original);
  ioFail=false;
  const actual=await context.prepareEntryFiles();
  assert.equal(records.get('draft-list').length,3);
  assert.equal(records.has('draft:'+batch.id),false);
  await assert.rejects(context.saveEntryFiles(actual),/interruption/);
  assert.equal(uploads.size,2);assert.equal(manifests.size,1);
  // Simulate reopening the scanner after the interrupted upload/link.
  context.draft=structuredClone(records.get('current'));
  context.draftIndex=structuredClone(records.get('draft-list'));
  context.pdfCache=null;
  await context.saveEntryFiles(context.familyMembers());
  assert.equal(uploads.size,3);assert.equal(manifests.size,3);
  for(const manifest of manifests.values()){
    assert.equal(manifest.groups.length,1);
    const group=manifest.groups[0],expected=files.find(d=>d.active===group.id);
    assert.deepEqual(Array.from(manifest.pages,p=>p.id),expected.pages.map(p=>p.id));
    assert.deepEqual(Array.from(manifest.pages,p=>p.page),expected.pages.map((p,i)=>i+1));
    assert.deepEqual(Array.from(manifest.pages,p=>p.groupID),expected.pages.map(()=>group.id));
    assert.ok(uploads.get(manifest.pdf.path).name.startsWith(group.entryLabel));
  }
  assert.match(lastStatus,/3 entry PDFs saved/);
  console.log('PASS: 5 pages in 3 independently verified PDFs, ordered pages, normalized IDs, isolated links, safe local split and retry after a partial Drive save.');
})().catch(e=>{console.error(e);process.exitCode=1});
