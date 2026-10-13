const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{const {page,context,login}=await f.open();await login();const before=await page.evaluate(()=>localFirst14333.state().jobs.length);await context.setOffline(true);
 const offline=await page.evaluate(async()=>{try{await saveWork82('runs',{month:'2026-10',status:'finalized',rows:[]});return 'unexpected'}catch(e){return e.message}});assert.match(offline,/requires server confirmation/);assert.equal(await page.evaluate(()=>localFirst14333.state().jobs.length),before);await context.setOffline(false);await page.waitForTimeout(500);await page.waitForFunction(()=>window.startup14257?.prepared);
 const saved=await page.evaluate(()=>saveWork82('runs',{month:'2026-10',status:'finalized',rows:[]}));assert.equal(saved.data.status,'finalized');assert(saved.id);assert(!saved._pending14333);assert.equal(f.fixture.tables.payroll_runs.length,1);
 console.log('PASS finalization refuses offline completion, preserves drafts, and waits for an exact server receipt rather than the idle timer');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
