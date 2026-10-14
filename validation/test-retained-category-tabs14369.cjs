const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{const {page,login}=await f.open();await login();
const result=await page.evaluate(async()=>{switchTab('journal');await new Promise(r=>setTimeout(r,200));const host=document.getElementById('categoryTabs'),tabs=[...host.children];tabs[0].dataset.auditDecoration='retained';switchTab('transactions-all');switchTab('journal');return {same:tabs.every((n,i)=>host.children[i]===n),decoration:host.children[0].dataset.auditDecoration,selected:host.querySelector('[aria-selected="true"]')?.dataset.target};});
assert.equal(result.same,true);assert.equal(result.decoration,'retained');assert.equal(result.selected,'journal');console.log('PASS category button identity, decorations and selected state retained across navigation');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
