/* Sorting must respond to changed records, preserve grouped lines and print order,
 * and leave unchanged hidden tables alone after unrelated interface updates. */
const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage();await page.setContent('<div id="navigation"></div><section hidden><table id="records"><thead><tr><th>Date</th><th>Memo</th></tr></thead><tbody><tr data-entry-id="old"><td>2026-01-01</td><td>old</td></tr><tr data-entry-id="old" class="cluster-row-cont"><td></td><td>linked</td></tr><tr data-entry-id="new"><td>2026-02-01</td><td>new</td></tr></tbody></table></section>');
 await page.evaluate(()=>{window.ApplicationSettings={system:{dateFormat:'DD/MM/YYYY'}};window.__tableReads=0;const d=Object.getOwnPropertyDescriptor(HTMLTableSectionElement.prototype,'rows');Object.defineProperty(HTMLTableSectionElement.prototype,'rows',{...d,get(){window.__tableReads++;return d.get.call(this)}})});
 await page.addScriptTag({path:path.join(process.env.PHASE0_ROOT||path.resolve(__dirname,'..'),'src/subusers/review/review-mobile-v78.js')});
 const order=()=>page.locator('#records tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.entryId));
 await page.waitForFunction(()=>document.querySelector('#records tbody tr').dataset.entryId==='new');await page.waitForTimeout(150);
 assert.deepEqual(await order(),['new','old','old']);
 await page.evaluate(()=>{window.__tableReads=0;document.getElementById('navigation').innerHTML='<button>Blank</button>'});await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>window.__tableReads),0,'unrelated navigation must not read retained table rows');
 await page.evaluate(()=>{document.querySelector('[data-entry-id=old] td').firstChild.data='2026-03-01'});
 await page.waitForFunction(()=>document.querySelector('#records tbody tr').dataset.entryId==='old');assert.deepEqual(await order(),['old','old','new']);
 await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));assert.deepEqual(await order(),['new','old','old']);
 await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));assert.deepEqual(await order(),['old','old','new']);
 await page.evaluate(()=>{const row=document.createElement('tr');row.dataset.entryId='latest';row.innerHTML='<td>2026-04-01</td><td>newly loaded</td>';document.querySelector('#records tbody').append(row)});
 await page.waitForFunction(()=>document.querySelector('#records tbody tr').dataset.entryId==='latest');
 assert.deepEqual(await order(),['latest','old','old','new']);
 console.log('PASS unchanged hidden tables, changed date text, inserted rows, linked lines, oldest-first print and screen-order restoration');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
