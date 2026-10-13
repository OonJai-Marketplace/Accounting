const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{const {page,login}=await f.open();await login();
 const result=await page.evaluate(async()=>{
  const rpc=ojmDb.rpc.bind(ojmDb);let reads=0;
  const row=n=>({id:'J-'+n,dbEntryId:'db-'+n,date:'2026-10-05',accountId:AccountingStore.accounts[0].id,account:'Cash',currency:'LAK',debit:100,credit:0,archived:false,memo:'Confirmed '+n});
  ojmDb.rpc=async function(name,args){if(name!=='journal_window14333')return rpc(name,args);const n=++reads;await new Promise(r=>setTimeout(r,n===1?250:10));return {data:{rows:[row(n)],opening:[],revision:'race-'+n},error:null}};
  await Promise.all([loadJournalFromSupabase(),loadJournalFromSupabase()]);
  const online=JournalModule.entries.map(x=>x.id);ojmDb.rpc=rpc;return {online,reads};
 });
 assert.deepEqual(result.online,['J-2'],'an older response must not replace the newer journal');
 await page.context().setOffline(true);await page.evaluate(()=>loadJournalFromSupabase());
 assert.deepEqual(await page.evaluate(()=>JournalModule.entries.map(x=>x.id)),['J-2'],'offline reload must retain the last complete journal');
 await page.context().setOffline(false);
 const recovery=await page.evaluate(async()=>{const rpc=ojmDb.rpc.bind(ojmDb);let calls=0;ojmDb.rpc=async(n,p)=>n==='journal_window14333'&&++calls===1?{error:{message:'Intentional failed read'}}:rpc(n,p);const results=await Promise.allSettled([loadJournalFromSupabase(),loadJournalFromSupabase()]);ojmDb.rpc=rpc;return results.map(r=>r.status)});
 assert.deepEqual(recovery,['rejected','fulfilled'],'a failed refresh must not poison queued refreshes');
 const isolated=await page.evaluate(async()=>{const rpc=ojmDb.rpc.bind(ojmDb),profile=liveProfile;let release;ojmDb.rpc=async(n,p)=>{if(n!=='journal_window14333')return rpc(n,p);await new Promise(r=>release=r);return {data:{rows:[{id:'wrong-actor',date:'2026-10-05',debit:1,credit:0}],opening:[],revision:'wrong-actor'},error:null}};const pending=loadJournalFromSupabase().then(()=>false,()=>true);while(!release)await new Promise(r=>setTimeout(r,10));liveProfile={...profile,id:'other-actor'};release();const rejected=await pending,leaked=JournalModule.entries.some(r=>r.id==='wrong-actor');liveProfile=profile;ojmDb.rpc=rpc;return {rejected,leaked}});
 assert.deepEqual(isolated,{rejected:true,leaked:false});
 console.log('PASS concurrent journal refresh order, offline snapshot consistency, failed-read recovery and account isolation');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
