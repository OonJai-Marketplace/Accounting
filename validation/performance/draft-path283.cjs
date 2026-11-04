const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {fixture,key,prefix}=require('../test-account-draft-typing272.cjs');
const baseline=execFileSync('git',['show','4fa4107d960a55d8d9d3bc5aa6b4b5b0265936e2:src/subusers/entries/drafts1427.js'],{encoding:'utf8'});
async function burst(script){const f=await fixture(undefined,script);for(let i=1;i<=40;i++)f.edit('payAmount',String(i));await f.settle();const during={writes:f.writes.length,modelClones:f.clones,modelReads:f.modelReads};f.idle();const result={keystrokes:40,during,writes:f.writes.length,bytes:f.writes.reduce((n,x)=>n+x.bytes,0),modelClones:f.clones,modelReads:f.modelReads};assert.equal(JSON.parse(f.store.get(key)).forms['payroll-entries|runMeta95|2026-11'].fields['#payAmount'],'40');f.close();return result;}
(async()=>{
 const before=await burst(baseline),after=await burst();assert.equal(after.during.writes,0);assert.equal(after.during.modelClones,0);assert.equal(after.writes,1);assert(before.writes>after.writes);
 for(const boundary of ['submit','pagehide','beforeunload','navigation','focusout','explicit']){
  const f=await fixture();f.edit('payAmount','Final keystroke');
  if(boundary==='submit')f.d.getElementById('runMeta95').dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
  else if(boundary==='navigation')f.w.switchTab('accounts');
  else if(boundary==='focusout')f.d.getElementById('payAmount').dispatchEvent(new f.w.FocusEvent('focusout',{bubbles:true,relatedTarget:f.d.getElementById('outside')}));
  else if(boundary==='explicit')f.w.drafts1427.flush();else f.w.dispatchEvent(new f.w.Event(boundary));
  assert.equal(JSON.parse(f.store.get(key)).forms['payroll-entries|runMeta95|2026-11'].fields['#payAmount'],'Final keystroke',boundary);assert.equal(f.timers.size,0,boundary);f.close();
 }
 let f=await fixture();f.edit('payAmount','Restore later');f.idle();const retained=new Map(f.store);f.close();f=await fixture(retained);f.d.getElementById('payroll-entries').classList.add('active');f.w.drafts1427.restore();assert.equal(f.d.getElementById('payAmount').value,'Restore later');f.edit('payAmount','Discard this');f.w.drafts1427.forget('runMeta95','2026-11');f.idle();assert.equal(JSON.parse(f.store.get(key)).forms['payroll-entries|runMeta95|2026-11'],undefined);f.close();
 f=await fixture();f.edit('payAmount','Old actor');f.w.liveProfile={id:'other'};f.idle();assert.equal(f.writes.length,0);f.w.drafts1427.restore();f.edit('payAmount','New actor');f.idle();assert(f.store.get(prefix+'other').includes('New actor'));assert(!f.store.get(key).includes('New actor'));f.close();
 f=await fixture();f.setFail(true);f.edit('payAmount','Keep on storage failure');f.idle();assert.equal(f.warnings.length,1);f.w.drafts1427.flush();assert.equal(f.warnings.length,1);f.setFail(false);f.w.drafts1427.flush();assert(f.store.get(key).includes('Keep on storage failure'));f.close();
 const metrics={fixture:'40 payroll field input events; 1500 synthetic recovery rows; deterministic timer flush',baselineCommit:'4fa4107d960a55d8d9d3bc5aa6b4b5b0265936e2',before,after,limitations:'Counts and serialized bytes in jsdom, not measured iPad latency or production timings.'};
 fs.writeFileSync('validation/performance/draft-metrics283.json',JSON.stringify(metrics,null,2)+'\n');console.log(JSON.stringify(metrics));
 console.log('PASS draft batching, six immediate recovery boundaries, reload, discard, account isolation and storage failure recovery');
})().catch(e=>{console.error(e);process.exitCode=1});
