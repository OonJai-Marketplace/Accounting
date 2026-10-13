const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{const {page,login}=await f.open();await login();
 const result=await page.evaluate(()=>{const api=navigationWorkflow14316,clone=Node.prototype.cloneNode;let clones=0;
 const expected=b=>{const copy=clone.call(b,true);copy.querySelectorAll('.nav-count14311,.submission-count-badge,.arrow,svg').forEach(n=>n.remove());return copy.textContent.trim()};
 const root=document.querySelector('#nav-module-transactions .nav-links'),probe=document.createElement('button');probe.className='tab-btn';probe.dataset.target='journal';probe.innerHTML=' Custom <span>nested <i>label</i><span class="nav-count14311">123</span></span><svg><text>icon</text></svg><span class="arrow">v</span><!-- comment -->';root.append(probe);
 const prior=api.choices('transactions').find(c=>c.button===probe);const original=expected(probe);probe.querySelector('i').textContent='updated';const changed=api.choices('transactions').find(c=>c.button===probe);const fresh=expected(probe);probe.remove();
 try{Node.prototype.cloneNode=function(...args){if(this.nodeType===1&&this.closest('#appSidebar,#categoryTabs,#dashboard'))clones++;return clone.apply(this,args)};api.sync()}finally{Node.prototype.cloneNode=clone}
 const observer=new MutationObserver(()=>{});observer.observe(document.body,{attributes:true,childList:true,characterData:true,subtree:true});api.sync();const unchangedMutations=observer.takeRecords().length;observer.disconnect();
 const mismatches=[];for(const key of Object.keys(api.modules)){if(['settings','documents'].includes(key))continue;for(const c of api.choices(key)){if(c.label!==expected(c.button))mismatches.push(c.id)}}
 return {unchangedMutations,prior:prior.label,original,changed:changed.label,fresh,clones,mismatches,badge:!!document.getElementById('navUserReviewCount')};
 });assert.equal(result.prior,result.original);assert.equal(result.changed,result.fresh);assert.notEqual(result.prior,result.changed);assert.equal(result.clones,0);assert.equal(result.unchangedMutations,0,'unchanged navigation decoration must not wake DOM observers');assert.deepEqual(result.mismatches,[]);assert(result.badge);
 await page.keyboard.press('Control+Alt+b');await page.keyboard.press('u');await page.waitForFunction(()=>document.getElementById('transactions-recurring').classList.contains('active'));
 console.log('PASS equivalent nested label text, live updates, retained badges, zero navigation subtree clones, trusted two-step keyboard navigation');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
