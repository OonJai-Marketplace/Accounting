const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{const {page,login}=await f.open();const errors=[];page.on('pageerror',e=>errors.push(e.message));await login();const result=await page.evaluate(async()=>{
 const settle=()=>new Promise(r=>setTimeout(r,250));
 switchTab('settings-business');await settle();
 const host=document.createElement('section');host.innerHTML='<table><thead><tr><th>USD</th></tr></thead><tbody><tr><td class="num">1234.50</td></tr></tbody></table><form><input type="number" name="salary" step="0.01" value="1234.50"><input type="search" id="auditSearchScope14369"></form><div class="personal-history-list1437"><div><details><summary>2025</summary></details></div><div><details><summary>2026</summary></details></div></div>';
 document.getElementById('settings-business').append(host);await settle();
 const cell=host.querySelector('td'),amount=host.querySelector('[name=salary]'),search=host.querySelector('[type=search]');
 const initial={cell:cell.textContent,amount:amount.value,numeric:amount.dataset.numeric88,search:search.autocomplete,history:host.querySelector('details').open};
 amount.focus();amount.setSelectionRange(2,2);const caret=amount.selectionStart;
 const before=amount.value;const marker=document.createElement('span');marker.textContent='Unrelated status';document.body.append(marker);await settle();const retained=amount.value===before&&amount.selectionStart===caret;
 cell.textContent='5678.00';await settle();const updated=cell.textContent;
 const history=document.createElement('div');history.className='personal-history-list1437';history.innerHTML='<div><details><summary>2026-10</summary></details></div>';host.append(history);await settle();const historyAdded=history.querySelector('details').open;
 const button=document.createElement('button');button.textContent='Print details';host.append(button);await settle();const report=button.classList.contains('report-action14300');
 const calls=[],query=document.querySelectorAll;document.querySelectorAll=function(selector){if(/^(td.num|input$|input\[type=search\]|input\[type="number"\]|#auditMonths98,|#voucherRows14299 tr>td:nth-child)/.test(selector))calls.push(selector);return query.call(this,selector)};
 marker.textContent='Updated unrelated status';await settle();document.querySelectorAll=query;
 marker.remove();host.remove();return {initial,retained,updated,historyAdded,report,calls};
 });assert.equal(result.initial.amount,'1234.5');assert.equal(result.initial.numeric,'true');assert.equal(result.initial.search,'off');assert(result.initial.cell.includes('$'));assert(result.updated.includes('5678.00'));for(const k of ['retained','historyAdded','report'])assert(result[k],k);assert.deepEqual(result.calls,[]);assert.deepEqual(errors,[]);console.log(JSON.stringify(result));console.log('PASS dynamic money, caret preservation, search setup, history, report buttons and bounded unrelated updates');}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
