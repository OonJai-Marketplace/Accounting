const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
const dom=new JSDOM(read('desktop.html'),{url:'https://accounting.example.test',runScripts:'outside-only'}),w=dom.window;
try{
 w.document.body.insertAdjacentHTML('beforeend','<div id="nav-module-documents"><button class="nav-header">Editor</button></div>');w.document.querySelector('#nav-module-hr .nav-links').insertAdjacentHTML('beforeend',`<button class="tab-btn" data-target="hr-ai-inbox">AI HR Inbox</button>`);
 w.access113={can:()=>true};w.switchTab=()=>{};
 w.settingsGroups14332={available:()=>[{label:'Company',targets:['company']},{label:'Accounting',targets:['accounting']},{label:'System & Tools',targets:['system']}],sectionChoices:()=>['Accounting App','General preferences','Printing','Logo & banner','Installation & Handover','Google Accounting Archive','Portable Data Backup','Previous Local Audit Copy','Reset Operational Data','Recovery vault','Maintenance & Audit'].map(label=>({label,id:label,button:{click(){}}}))};
 w.eval(read('src/core/navigation/navigation-workflow14316.js'));w.dispatchEvent(new w.Event('DOMContentLoaded'));
 const nav=w.navigationWorkflow14316;
 for(const area of [...Object.keys(nav.modules),'settings-sections']){const rows=nav.choices(area),keys=rows.map(x=>x.key);assert.equal(new Set(keys).size,keys.length,area+' shortcuts must be unique');assert(keys.every(k=>/^[A-Z0-9]$/.test(k)),area+' shortcuts must be usable');}
 for(const [area,prefix,second,target] of [['hr','H','A','hr-attendance'],['hr','H','I','hr-ai-inbox'],['transactions','B','J','journal'],['transactions','B','S','user-entry-review'],['tax-sso','M','P','tax-profit'],['tax-sso','M','Y','tax-payment']]){
  const choice=nav.choices(area).find(x=>x.key===second);assert(choice,area+' '+second);assert.equal(choice.id,target);let clicked=0;choice.button.addEventListener('click',()=>clicked++,{once:true});
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:prefix,ctrlKey:true,altKey:true,bubbles:true,cancelable:true}));
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:second,bubbles:true,cancelable:true}));assert.equal(clicked,1,area+' '+second+' activates its target');
 }
 console.log('PASS unique shortcuts across all modules/settings; HR, bookkeeping and mandatory keyboard actions reach distinct targets');
}finally{w.close()}
const editor=new JSDOM('<section id="document-editor105"><div class="doc-shell105"></div></section>',{runScripts:'outside-only'}),v=editor.window;
try{
 const queue=[];v.requestAnimationFrame=fn=>queue.push(fn);const flush=()=>{while(queue.length)queue.shift()()};
 Object.defineProperty(v.HTMLElement.prototype,'clientWidth',{get(){return this.classList.contains('doc-worktabs1432')?120:60}});
 v.HTMLElement.prototype.getBoundingClientRect=function(){if(this.classList.contains('doc-worktabs1432'))return {left:10,right:130,width:120};const bar=this.parentElement,index=[...bar.querySelectorAll('.doc-worktab1432')].indexOf(this),left=10+index*60-bar.scrollLeft;return {left,right:left+60,width:60}};
 const src=read('src/documents/editor/document-editor-v105.js');
 v.eval(`const ID='document-editor105';let activeTab1432='t4',model={title:'Document 4'},dirty=false,documentTabs1432=Array.from({length:5},(_,i)=>({id:'t'+i,model:{title:'Document '+i}}));const drawTemplateSave14298=()=>{},esc=s=>s,activateTab1432=()=>{},closeTab1432=()=>{},newTab1432=()=>{};${src.slice(src.indexOf('function drawTabs1432(){'),src.indexOf('function loadTab1432('))}window.probe={draw:drawTabs1432,select(id){activeTab1432=id;model={title:id};drawTabs1432()},rename(){model.title+=' edited';drawTabs1432()}};`);
 v.probe.draw();flush();const bar=v.document.querySelector('.doc-worktabs1432');assert.equal(bar.scrollLeft,180,'new far-right tab must become visible');
 bar.scrollLeft=0;v.probe.rename();flush();assert.equal(bar.scrollLeft,0,'editing must preserve deliberate tab-bar scrolling');
 bar.scrollLeft=180;v.probe.select('t0');flush();assert.equal(bar.scrollLeft,0,'selecting first tab must reveal it');
 v.probe.select('t4');v.probe.select('t1');flush();assert.equal(bar.scrollLeft,0,'stale pending reveal must not scroll to the previous document');
 console.log('PASS new and switched document tabs are revealed; edits preserve manual scrolling; stale animation callbacks are ignored');
}finally{v.close()}
