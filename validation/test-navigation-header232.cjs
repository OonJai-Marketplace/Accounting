/* Navigation remains usable after a workspace replaces the optional old title. */
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const dom=new JSDOM(`<button class="tab-btn" onclick="switchTab('report-bs')">Balance Sheet</button>
<button class="tab-btn" onclick="scrollToAccountModule('sec-general-ledger')">General Ledger</button>
<section id="dashboard" class="tab-content active"></section><section id="report-bs" class="tab-content"></section>
<section id="accounts-modular-container" class="tab-content"><div id="sec-general-ledger"></div></section>`,{url:'https://accounting.example.test',runScripts:'outside-only'});
const w=dom.window;
try{
 w.matchMedia=()=>({matches:false});w.requestAnimationFrame=fn=>fn();w.appWorkspaceScroller=()=>({scrollTop:1});
 w.eval(fs.readFileSync('src/core/navigation/base-navigation.js','utf8'));
 for(const hasTitle of [false,true]){
  if(hasTitle){const title=w.document.createElement('div');title.id='mainHeaderTitle';w.document.body.append(title);}
  w.switchTab('report-bs');assert.equal(w.document.querySelector('.tab-content.active').id,'report-bs');
  assert.equal(w.localStorage.getItem('ojm_last_active_view_v1'),'report-bs');
  if(hasTitle)assert.equal(w.document.getElementById('mainHeaderTitle').textContent,'Balance Sheet');
  w.scrollToAccountModule('sec-general-ledger');assert.equal(w.document.querySelector('.tab-content.active').id,'accounts-modular-container');
  assert.equal(w.localStorage.getItem('ojm_last_active_view_v1'),'sec-general-ledger');
  if(hasTitle)assert.equal(w.document.getElementById('mainHeaderTitle').textContent,'Accounts — General Ledger');
 }
 console.log('PASS report/account navigation, selection memory and optional header labels');
}finally{w.close();}
