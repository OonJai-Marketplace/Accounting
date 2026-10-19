// Run with linkedom 0.18.12 available through NODE_PATH; no application dependency.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const {window}=parseHTML('<html><body><section id="journalEntry98"><input id="jeTransDate" type="date" value="2026-10-19"><input class="je-line-date" type="date" value="2025-06-20" min="2025-06-15" max="2025-08-20"><input id="memo" value="Keep my work"></section><input id="period" type="month" value="2026-10"><input id="unrelated" type="date" value="2026-10-19"></body></html>');
const {document}=window;
for(const input of document.querySelectorAll('input'))for(const prop of ['min','max','readOnly','required'])Object.defineProperty(input,prop,{get(){return ['readOnly','required'].includes(prop)?this.hasAttribute(prop.toLowerCase()):this.getAttribute(prop)||''}});
const context={document,window,Event:window.Event,MutationObserver:class{observe(){}},requestAnimationFrame:f=>f(),innerWidth:1024,innerHeight:768,Intl,Date,WeakMap,Set,console,formatAppDate:v=>'Formatted '+v};
vm.runInNewContext(fs.readFileSync('src/shared/formatting/universal-date-v104.js','utf8'),context);
const date=document.getElementById('jeTransDate'),panel=()=>document.querySelector('.oj-date-popup104');
const click=s=>{const b=panel().querySelector(s);assert.ok(b,s);assert.equal(!!b.disabled,false,s+' enabled');b.click()};
const title=()=>click('.oj-date-title143115'),pick=v=>click('[data-value="'+v+'"]');
let changes=0,inputs=0;date.addEventListener('change',()=>changes++);date.addEventListener('input',()=>inputs++);
date.showPicker();title();assert.ok(panel().querySelector('.month'));assert.equal(panel().querySelectorAll('[data-value]').length,12);
title();assert.ok(panel().querySelector('.year'));pick('2025');pick('2025-12');assert.ok(panel().querySelector('.date'));
assert.equal(date.value,'2026-10-19');assert.equal(changes,0);pick('2025-12-31');
assert.equal(date.value,'2025-12-31');assert.equal(changes,1);assert.equal(inputs,1);assert.equal(panel(),null);
assert.equal(date.closest('.oj-date-shell104').querySelector('.oj-date-label104').textContent,'Formatted 2025-12-31');
// Browsing or cancelling cannot change a saved draft.
date.showPicker();title();title();pick('2024');pick('2024-02');assert.ok(panel().querySelector('[data-value="2024-02-29"]'));
panel().dispatchEvent(new window.Event('keydown'));document.dispatchEvent(Object.assign(new window.Event('keydown'),{key:'Escape'}));
assert.equal(panel(),null);assert.equal(date.value,'2025-12-31');assert.equal(document.getElementById('memo').value,'Keep my work');assert.equal(changes,1);
// Partially allowed months stay selectable, but individual out-of-range days do not.
const line=document.querySelector('.je-line-date');line.showPicker();title();assert.equal(panel().querySelector('[data-value="2025-05"]').disabled,true);assert.equal(panel().querySelector('[data-value="2025-09"]').disabled,true);
pick('2025-06');assert.equal(panel().querySelector('[data-value="2025-06-14"]').disabled,true);pick('2025-06-15');assert.equal(line.value,'2025-06-15');
line.showPicker();title();title();assert.equal(panel().querySelector('[data-value="2024"]').disabled,true);pick('2025');pick('2025-08');assert.equal(panel().querySelector('[data-value="2025-08-21"]').disabled,true);pick('2025-08-20');
// Existing month controls retain immediate month selection; unrelated dates retain their existing header.
const period=document.getElementById('period');period.showPicker();assert.equal(panel().querySelector('.oj-date-title143115'),null);pick('2026-01');assert.equal(period.value,'2026-01');
const unrelated=document.getElementById('unrelated');unrelated.showPicker();assert.equal(panel().querySelector('.oj-date-title143115'),null);pick('2026-10-02');
// Today remains a full date when activated from the month grid.
date.showPicker();title();click('.oj-date-footer104 button');assert.match(date.value,/^\d{4}-\d{2}-\d{2}$/);assert.equal(changes,2);
date.disabled=true;date.showPicker();assert.equal(panel(),null);
console.log('Journal calendar: month/year jump, leap day, bounds, cancellation, date events and existing controls passed.');
