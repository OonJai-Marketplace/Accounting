const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=path=>fs.readFileSync(path,'utf8');
const dom=new JSDOM('<!doctype html><html lang="en"><body><main class="tab-content active" id="report-tb"><section class="r79"></section></main></body></html>',{url:'https://example.invalid/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,host=w.document.querySelector('.r79');
Object.assign(w,{liveProfile:{id:'owner-a'},Reports79:{kind:'tb',trialView:'standard'},renderedViews:new WeakMap(),scope:'owner-a',generation:0,
 restoreFilters(){},reportBooks:{sync:()=>true},complete:()=>true,normalizeAll(){},signature:()=>[w.scope,w.generation,w.Reports79.trialView].join('|')});
const windowFile=source('src/reports/financial/report-window143195.js');
w.eval(windowFile.slice(windowFile.indexOf('const trialViews='),windowFile.indexOf('function rendered(host)')));
const standard=w.document.createElement('table'),quarter=w.document.createElement('table');
assert.equal(w.reuse(host),false);host.append(standard);w.renderedViews.set(host,w.signature());
w.Reports79.trialView='comparative';assert.equal(w.reuse(host),false);host.append(quarter);w.renderedViews.set(host,w.signature());
w.Reports79.trialView='standard';assert.equal(w.reuse(host),true);assert.equal(host.firstChild,standard);
w.Reports79.trialView='comparative';assert.equal(w.reuse(host),true);assert.equal(host.firstChild,quarter);
w.generation++;w.Reports79.trialView='standard';assert.equal(w.reuse(host),false);
w.scope='owner-b';assert.equal(w.reuse(host),false);
const report=source('src/reports/financial/reports-desktop-v79.js');
w.eval(source('src/reports/financial/summary-period14331.js'));
w.eval(source('src/reports/financial/period-filters14331.js'));
w.eval(report.slice(report.indexOf('function trialComparisonPeriod'),report.indexOf('const reportBooks=')));
for(const [from,to,mode,expectedFrom,expectedTo] of [
 ['2026-10-12','2026-10-31','quarterly','2026-10-01','2026-12-31'],
 ['2028-02-01','2028-02-29','quarterly','2028-01-01','2028-03-31'],
 ['2026-01-01','2026-12-31','yearly','2026-01-01','2026-12-31']
]){const state={from,to};w.trialComparisonPeriod(state);assert.deepEqual([state.mode,state.from,state.to],[mode,expectedFrom,expectedTo]);}
let measurements=0;
w.HTMLCanvasElement.prototype.getContext=()=>({measureText(value){measurements++;return {width:value.length*8};}});
w.eval(source('src/shared/ui/table-resize143117.js'));
function sample(){const table=w.document.createElement('table');table.innerHTML='<thead><tr><th>DR</th><th>CR</th><th>Description</th></tr></thead><tbody><tr><td>1,987,654,321.99</td><td>2.00</td><td>Supplier credit settlement</td></tr></tbody>';host.replaceChildren(table);return table;}
let table=sample();w.tableResize143117.install(table);
const widths=t=>Array.from(t.querySelectorAll('col'),c=>parseInt(c.style.width,10));
const first=widths(table);assert.equal(first.length,3);assert.ok(first[0]>first[1]&&first[2]>first[0]);assert.ok(measurements>0);
const original=measurements;w.tableResize143117.install(table);assert.equal(measurements,original);
table=sample();w.tableResize143117.install(table);assert.deepEqual(widths(table),first);assert.equal(measurements,original);
table=sample();table.rows[1].cells[1].textContent='(999,999,999,999.99)';w.tableResize143117.install(table);assert.ok(widths(table)[1]>first[1]);
dom.window.close();
console.log('PASS retained report nodes, revision and owner invalidation, quarter/year migration, independent column widths, device reuse and wider replacement data');
