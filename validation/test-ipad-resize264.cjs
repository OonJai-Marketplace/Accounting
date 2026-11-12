const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const listeners={},storage={};
const style=()=>{const values={};return {setProperty(k,v){values[k]=v},getPropertyValue:k=>values[k]||'',getPropertyPriority:()=>''}};
const classes=()=>{const s=new Set();return {add:n=>s.add(n),remove:n=>s.delete(n),contains:n=>s.has(n)}};
const node=tag=>({tagName:tag,style:style(),classList:classes(),dataset:{},children:[],attrs:{},isConnected:true,
 setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]??null},removeAttribute(k){delete this.attrs[k]},
 append(n){n.parentElement=this;this.children.push(n)},prepend(n){n.parentElement=this;this.children.unshift(n)},
 querySelector(){return this.children.find(n=>n.className?.includes('column-resize143117'))||null},
 remove(){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.isConnected=false},
 setPointerCapture(id){this.capture=id},
});
const table=node('TABLE');table.id='journal';table.matches=()=>false;table.closest=selector=>selector==='[id]'?table:null;
const make=(text,left,width,hidden=false)=>Object.assign(node('TH'),{textContent:text,colSpan:1,rowSpan:1,hidden,closest:()=>table,getBoundingClientRect:()=>({left,right:left+width,width})});
const date=make('Date',0,100,true),account=make('Account',0,100),memo=make('Memo',100,200),debit=make('Debit',300,180);
const cells=[date,account,memo,debit];table.tHead={rows:[{cells}]};table.getBoundingClientRect=()=>({left:0,width:480});
const document={readyState:'loading',documentElement:{dataset:{device132:'tablet'},classList:classes()},
 addEventListener(k,fn){listeners[k]=fn},removeEventListener(){},createElement:tag=>node(tag.toUpperCase())};
const ctx={document,window:{addEventListener(){}},location:{pathname:'/journal'},liveProfile:{id:'fixture'},
 localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},getComputedStyle:n=>({display:n.hidden?'none':'table-cell'}),
 requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout:fn=>fn()};
vm.runInNewContext(fs.readFileSync('src/shared/ui/table-resize143117.js','utf8'),ctx);
ctx.window.tableResize143117.install(table);
function drag(header,delta){
 const handle=header.querySelector();handle.closest=s=>s==='.column-resize143117'?handle:table;
 // Reproduce a stale compressed-column index; ownership must come from TH.
 handle.dataset.end143117=2;let prevented=0;
 const e={target:handle,button:0,pointerId:7,pointerType:'touch',clientX:100,preventDefault(){prevented++},stopImmediatePropagation(){}};
 listeners.pointerdown(e);assert.equal(handle.capture,7,'touch stays captured by divider');
 listeners.pointermove({...e,clientX:100+delta});listeners.pointerup({...e,clientX:100+delta});
 assert.ok(prevented>=1,'native selection/scroll prevented on divider');
}
drag(account,40);
assert.equal(account.style.getPropertyValue('width'),'140px');assert.equal(memo.style.getPropertyValue('width'),'200px');
assert.equal(table.children.filter(n=>n.tagName==='COLGROUP').length,0,'tablet widths attached to native visible headers');
drag(memo,25);
assert.equal(account.style.getPropertyValue('width'),'140px');assert.equal(memo.style.getPropertyValue('width'),'225px');
assert.equal(debit.style.getPropertyValue('width'),'180px');
console.log('PASS touch pointer capture; stale index ignored; Account and Memo resize independently with Date hidden; tablet has no compressed COLGROUP');
