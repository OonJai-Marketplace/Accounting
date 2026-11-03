const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open('phone','submitter');const errors=[];page.on('pageerror',e=>errors.push(e.message));await login();await page.locator('[data-page=post]').click();
 await page.locator('#postForm summary').click();assert(await page.getByRole('button',{name:'Single Entry (Cashbook)',exact:true}).isVisible());await page.getByRole('button',{name:'Single Entry (Cashbook)',exact:true}).click();
 const choose=async selector=>{const select=page.locator(selector);const value=await select.locator('option').evaluateAll(ns=>ns.find(n=>n.value&&!n.disabled)?.value);assert(value,selector);await select.selectOption(value);};
 await choose('[data-field=source]');await choose('[data-field=affected]');await page.locator('[data-field=amount]').fill('2500');await page.locator('[data-field=memo][data-index]').fill('Phone retained');
 await page.locator('#postForm summary').click();await page.getByRole('button',{name:'Double Entry',exact:true}).click();assert.equal(await page.locator('[data-field=debit]').first().inputValue(),'2500');assert.equal(await page.locator('[data-field=credit]').nth(1).inputValue(),'2500');
 await page.locator('#postForm summary').click();await page.getByRole('button',{name:'Single Entry (Cashbook)',exact:true}).click();assert.equal(await page.locator('[data-field=amount]').inputValue(),'2500');assert.equal(await page.locator('[data-field=memo][data-index]').inputValue(),'Phone retained');
 await page.screenshot({path:'/workspace/scratch/68e847ad27bd/phone-cashbook143243.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS phone Entry options, cashbook/double-entry controls, retained amounts/memos');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
