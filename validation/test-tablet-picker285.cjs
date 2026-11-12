const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
(async()=>{
const d=new JSDOM('<!doctype html><html data-device132="tablet"><body><section id="journalEntry98"><label for="fund">Fund</label><select id="fund" data-simple="source"><option value="">Choose fund</option><option value="cash">Cash</option></select><table><tbody id="jeLinesBody"></tbody></table></section><datalist id="chart"><option value="1010 — Cash"></option></datalist></body></html>',{runScripts:'outside-only',url:'https://fixture.invalid/'}),w=d.window;
w.AccountingStore={accounts:[{id:'cash',code:'1010',name:'Cash',type:'ASSET',currency:'LAK'}],subAccounts:[]};w.getSelectedAccountInfo=()=>null;w.requestAnimationFrame=fn=>w.setTimeout(fn,0);w.HTMLElement.prototype.getBoundingClientRect=()=>({top:100,bottom:140,left:50,right:350,width:300,height:40});
w.eval(fs.readFileSync('src/shared/ui/account-picker1428.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,0));
const original=w.document.querySelector('select'),trigger=w.document.querySelector('#fundSearch1434');assert(trigger);assert.equal(trigger.type,'button');assert.equal(w.document.querySelector('label').htmlFor,trigger.id,'label must target the visible button rather than hidden select');assert.equal(original.value,'');
// Insert and immediately touch: no mutation-observer delivery occurs in between.
const input=w.document.createElement('input');input.className='je-line-acc';input.setAttribute('list','chart');const wrap=w.document.createElement('div');wrap.className='account-input-wrap';w.document.querySelector('#jeLinesBody').append(wrap);wrap.append(input);
input.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));assert.equal(input.type,'button','the very first touch must not request text input');assert.equal(input.inputMode,'none');input.click();assert.equal(input.getAttribute('aria-expanded'),'true');assert.equal(w.document.querySelectorAll('.account-filter14266').length,0);
w.document.querySelector('[role=option]').click();assert.equal(input.value,'1010 — Cash');assert.equal(input.getAttribute('aria-expanded'),'false');assert.equal(w.document.querySelector('.account-list1428'),null);assert.equal(original.value,'','main journal choice must not mutate cashbook source');
const clear=input.closest('.account-input-wrap').querySelector('.journal-account-clear');
assert.equal(clear.hidden,false);clear.click();assert.equal(input.value,'');assert.equal(clear.hidden,true);
input.click();w.document.querySelector('[role=option]').click();assert.equal(input.value,'1010 — Cash');
console.log('PASS first-touch race, native account control, visible label target, dropdown-only choice and source isolation');d.window.close();
})().catch(e=>{console.error(e);process.exitCode=1});
