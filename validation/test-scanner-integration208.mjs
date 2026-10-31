import test from 'node:test';
import assert from 'node:assert/strict';
import {validateManifest,pinnedTargets,latestGroups} from '../supabase/functions/scanner-integration/validation.mjs';
const owner='11111111-1111-4111-8111-111111111111',scan='22222222-2222-4222-8222-222222222222',group='33333333-3333-4333-8333-333333333333',page='44444444-4444-4444-8444-444444444444';
const manifest=()=>({id:scan,revision:1,title:'Receipts',provider:'supabase',bucket:'scan-documents208',pdf:{path:owner+'/'+scan+'/1/document.pdf',sha256:'a'.repeat(64)},groups:[{id:group,entryLabel:'OJM26-0001'}],pages:[{id:page,groupID:group,page:2,label:'OJM26-0001A',preview:{path:owner+'/'+scan+'/1/'+page+'.jpg'}}]});
test('one immutable owner/document/revision namespace for PDFs and page previews',()=>{assert.equal(validateManifest(manifest(),owner).groups[0].pages[0].page,2);for(const change of [m=>m.pages[0].preview.path='other/'+scan+'/1/'+page+'.jpg',m=>m.pdf.path='https://evil.example/doc.pdf',m=>m.pages.push({...m.pages[0]}),m=>m.groups.push({...m.groups[0]}),m=>m.revision=-1,m=>m.pages[0].page=0,m=>m.pages[0].groupID=owner]){const m=manifest();change(m);assert.throws(()=>validateManifest(m,owner));}});
test('journal identities remain pinned across numeric-ID reuse and retries',()=>{const rows=[{entry_label:'OJM26-0001',journal_ids:[],staff_line_ids:[]},{entry_label:'OJM26-0001',journal_ids:['original-uuid'],staff_line_ids:[]},{entry_label:'OJM26-0001',journal_ids:['reused-number-uuid'],staff_line_ids:[]}];assert.deepEqual(pinnedTargets(rows,'OJM26-0001').journal_ids,['original-uuid']);assert.equal(pinnedTargets(rows,'OJM26-0002'),null);});
test('latest revision selected independently for each owner and document section',()=>{const rows=[{owner_id:owner,scan_id:scan,group_id:group,revision:1},{owner_id:owner,scan_id:scan,group_id:group,revision:2},{owner_id:page,scan_id:scan,group_id:group,revision:1}];assert.deepEqual(latestGroups(rows).map(r=>r.revision),[2,1]);});

await import('../src/documents/scanner/links208.js');
test('private upload retries verify bytes and reject changed sessions',async()=>{
 let calls=0,actor='owner';const blob=new Blob(['approved bytes']);
 const client=ReceiptLinks208.create({url:'https://fixture.test',key:'public',session:async()=>({access_token:'fixture',user:{id:actor}}),request:async(url,o)=>{calls++;assert.equal(o.headers.Authorization,'Bearer fixture');return o.method==='POST'?new Response('{}',{status:409}):new Response(blob);}});
 assert.equal(calls,0);await client.put('owner/doc/1/page.jpg',blob,'image/jpeg');assert.equal(calls,2);
 await assert.rejects(client.put('owner/doc/1/page.jpg',new Blob(['changed']),'image/jpeg'),/different|differs/);
 const switched=ReceiptLinks208.create({url:'https://fixture.test',key:'public',session:async()=>({access_token:'fixture',user:{id:actor}}),request:async()=>{actor='other';return new Response('{}');}});
 await assert.rejects(switched.api('list',{entry:'TEST'}),/account changed/);
});
