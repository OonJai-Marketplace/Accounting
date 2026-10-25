const fs=require('node:fs'),assert=require('node:assert/strict');
const tick=()=>new Promise(r=>setTimeout(r,5));
function baseFixture(){
 let source=fs.readFileSync('validation/test-ai-stack143160.cjs','utf8').split('(async()=>{')[0];
 source=source.replace("w.eval(fs.readFileSync('src/bookkeeping/journal/drive-drafts143128.js','utf8'));", "w.receivers={};w.AIInboxSync143173={register:(name,c)=>w.receivers[name]=c,check:async()=>{}};w.eval(fs.readFileSync('src/bookkeeping/journal/drive-drafts143128.js','utf8'));");
 return new Function('require',source+'\nreturn {fixture,makeRows};')(require);
}
(async()=>{
 const {fixture,makeRows}=baseFixture(),f=await fixture();
 try{
  const receiver=f.w.receivers.journal,meta={owner:'reviewer',sheet:'1lkn2dk1PGJyNhrPiZsyqmueK4bN8iDvTNPau5f6U2pk'};
  await receiver.receive({rows:f.state.rows},meta);
  const first=f.d.querySelector('[data-draft="draft-0001"]');
  f.state.rows.push(...makeRows('draft-retry1','Temporary connection failure'));
  const original=f.w.ojmDb.rpc;let fail=true,reads=0;
  f.w.ojmDb.rpc=async(name,args)=>{
   if(name==='drive_journal_receipt143128'&&args.p_draft==='draft-retry1'){reads++;if(fail){fail=false;throw Error('Temporary connection failure');}}
   return original(name,args);
  };
  await assert.rejects(receiver.receive({rows:f.state.rows},meta),/retry/i,'transient receipt failure must remain pending for the coordinator');
  const failed=f.d.querySelector('[data-draft="draft-retry1"]');
  assert.match(failed.textContent,/Temporary connection failure/);
  assert.equal(failed.querySelector('[data-draft-action="post"]').disabled,true);
  assert.equal(receiver.cache().pending,true,'a reload must retain incomplete validation');
  await receiver.receive({rows:f.state.rows},meta);
  assert.equal(reads,2,'unchanged rows must retry a failed database check');
  assert.equal(f.d.querySelector('[data-draft="draft-retry1"] [data-draft-action="post"]').disabled,false);
  assert.equal(f.d.querySelector('[data-draft="draft-0001"]'),first,'completed validations keep their existing cards');
  assert.equal(receiver.cache().pending,false);
  await receiver.receive({rows:f.state.rows},meta);
  assert.equal(reads,2,'successful checks are not repeated');
  f.state.rows.push(...makeRows('draft-invalid','Invalid account'));
  f.state.rows.find(r=>r[0]==='draft-invalid')[4]='missing-account';
  await receiver.receive({rows:f.state.rows},meta);
  assert.equal(receiver.cache().pending,false,'invalid source data requires correction, not an endless network retry');
  const invalid=f.d.querySelector('[data-draft="draft-invalid"]');
  await receiver.receive({rows:f.state.rows},meta);
  assert.equal(f.d.querySelector('[data-draft="draft-invalid"]'),invalid);
  assert.equal(f.state.posted.length,0,'automatic validation never posts');
  console.log('PASS AI transient receipt retry, pending-cache recovery, unchanged card preservation, deterministic validation and no automatic posting');
 }finally{f.dom.window.close();await tick();}
})().catch(e=>{console.error(e);process.exitCode=1});
