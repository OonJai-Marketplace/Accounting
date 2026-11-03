const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const root=path.resolve(__dirname,'..');
const listeners={},visualListeners={},frames=[],scrolls=[];
const vv={offsetTop:0,height:1200,addEventListener:(name,handler)=>visualListeners[name]=handler};
let fieldTop=900;
const padding={value:'17px',priority:''};
const scroller={style:{getPropertyValue:()=>padding.value,getPropertyPriority:()=>padding.priority,setProperty:(_,value,priority='')=>{padding.value=value;padding.priority=priority}},scrollBy:move=>{scrolls.push(move);fieldTop-=move.top}};
const field={isConnected:true,matches:selector=>selector.includes('input:not([readonly])'),closest:selector=>selector==='.workspace-scroll,.modal-body,[data-scroll-host]'?scroller:null,
 getAttribute:()=>null,getBoundingClientRect:()=>({top:fieldTop,bottom:fieldTop+40,height:40})};
const rootElement={dataset:{device132:'tablet'},setAttribute(name){this[name]=true},removeAttribute(name){delete this[name]},hasAttribute(name){return Boolean(this[name])}};
const doc={documentElement:rootElement,body:{style:{}},activeElement:field,addEventListener:(name,handler)=>listeners[name]=handler};
vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/tablet-journal14266.js'),'utf8'),{
 document:doc,window:{visualViewport:vv,addEventListener(){}},innerHeight:1200,getComputedStyle:()=>({paddingBottom:'17px'}),
 requestAnimationFrame:callback=>{frames.push(callback);return frames.length},setTimeout:callback=>callback()
});
listeners.focusin({target:field});assert.equal(padding.value,'17px');
vv.height=650;visualListeners.resize();while(frames.length)frames.shift()();
assert.equal(padding.value,'567px','reserve enough scroll range to reveal fields above the keyboard');
listeners.focusout({target:field});listeners.focusin({target:field});
assert.equal(padding.value,'567px','changing fields must retain the unoccluded baseline');
assert.equal(padding.priority,'important');
assert(scrolls.some(move=>move.top>0),'covered input should scroll above the keyboard');
assert(fieldTop>=24&&fieldTop+40<=vv.height-16,'the input must be fully visible, including in landscape');
assert(rootElement['data-tablet-keyboard14266']);
doc.activeElement=null;listeners.focusout({target:field});
assert.equal(padding.value,'17px');
assert(!rootElement['data-tablet-keyboard14266']);

console.log('PASS keyboard reveal, scroll range and focus-switch baseline');
