// NODE_PATH may point to a temporary linkedom 0.18.12 installation; no app dependency.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),read=p=>fs.readFileSync(p,'utf8');
const {window}=parseHTML('<html><body><section id="payroll-entries" class="tab-content active"></section></body></html>'),{document}=window;
let observer,frames=[];
const c={window,document,boundForms235:new WeakMap(),Work82:{run:{}},Event:window.Event,MutationObserver:class{constructor(fn){observer=fn}observe(){}},requestAnimationFrame:f=>frames.push(f),innerWidth:1024,innerHeight:768,Intl,Date,WeakMap,Set,console,formatAppDate:v=>'Date '+v};
vm.createContext(c);vm.runInContext(read('src/shared/formatting/universal-date-v104.js'),c);
const source=read('src/payroll/workspace/groups-v96/drafts-and-finalization.js');vm.runInContext(source.slice(source.indexOf('function bindRun('),source.indexOf('function modal(')),c);
function mount(){const host=document.getElementById('payroll-entries');host.innerHTML='<form id="runMeta95"><label>Exchange Rate Date<input type="date" name="rateDate" value="2026-10-30"></label></form>';return host.querySelector('input')}
let input=mount();observer([{type:'childList',addedNodes:[document.getElementById('runMeta95')]}]);assert.equal(document.querySelector('.oj-date-button104'),null);assert.equal(frames.length,1);
c.bindRun();assert.ok(input.classList.contains('oj-date-original104'));assert.equal(document.querySelectorAll('.oj-date-button104').length,1);assert.equal(document.querySelector('.oj-date-label104').textContent,'Date 2026-10-30');frames.splice(0).forEach(f=>f());assert.equal(document.querySelectorAll('.oj-date-button104').length,1);
input.showPicker();assert.ok(document.querySelector('.oj-date-popup104'));input=mount();c.bindRun();assert.equal(document.querySelector('.oj-date-popup104'),null);assert.equal(document.querySelectorAll('.oj-date-button104').length,1);
input.disabled=true;window.datePicker104.refresh(input);assert.equal(document.querySelector('.oj-date-button104').disabled,true);
console.log('PASS payroll date enhancement before paint, one date control, stale popup cleanup and disabled state.');
