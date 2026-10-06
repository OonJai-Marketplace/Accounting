const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

const meta={content:''},styles={};
const element={dataset:{},style:{setProperty:(key,value)=>styles[key]=value}};
vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/device-mode132.js'),'utf8'),{
 navigator:{maxTouchPoints:5,platform:'iPad'},screen:{width:768,height:1024,orientation:{addEventListener(){}}},
 innerWidth:1280,innerHeight:1700,matchMedia:q=>({matches:q.includes('orientation:landscape')?false:true}),
 document:{documentElement:element,querySelector:()=>meta},window:{addEventListener(){}},setTimeout
});
assert.equal(element.dataset.device132,'tablet');
assert.equal(styles['--tablet-workspace132'],'1280px');
assert.match(meta.content,/width=1280, initial-scale=0\.6/);
assert.match(meta.content,/user-scalable=yes/);

const listeners={},visualListeners={},frames=[],scrolls=[];
const vv={offsetTop:0,height:650,addEventListener:(name,handler)=>visualListeners[name]=handler};
const scroller={style:{paddingBottom:'17px'},scrollBy:move=>scrolls.push(move)};
const field={matches:selector=>selector.includes('input:not([readonly])'),closest:selector=>selector.includes('#sub-users-workspace')?scroller:selector==='.workspace-scroll'?scroller:null,
 getBoundingClientRect:()=>({top:900,bottom:940}),scrollIntoView:()=>{}};
const rootElement={dataset:{device132:'tablet'},setAttribute(name){this[name]=true},removeAttribute(name){delete this[name]},hasAttribute(name){return Boolean(this[name])}};
const doc={documentElement:rootElement,body:{style:{}},activeElement:field,addEventListener:(name,handler)=>listeners[name]=handler};
vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/tablet-journal14266.js'),'utf8'),{
 document:doc,window:{visualViewport:vv,addEventListener(){}},innerHeight:1200,
 requestAnimationFrame:callback=>{frames.push(callback);return frames.length},setTimeout:callback=>callback()
});
listeners.focusin({target:field});while(frames.length)frames.shift()();
assert.equal(scroller.style.paddingBottom,'574px');
assert(scrolls.some(move=>move.top>0),'focused editor should scroll above the keyboard');
assert(rootElement['data-tablet-keyboard14266']);
doc.activeElement=null;listeners.focusout({target:field});
assert.equal(scroller.style.paddingBottom,'17px');
assert(!rootElement['data-tablet-keyboard14266']);

const source=fs.readFileSync(path.join(root,'scripts/account-picker1428.js'),'utf8').trim();
const bundle=fs.readFileSync(path.join(root,'scripts/desktop14245-6.js'),'utf8');
assert(bundle.includes('/* scripts/account-picker1428.js */\n'+source),'published picker bundle must match source');
console.log('PASS tablet portrait scale, keyboard reveal and reset, picker bundle sync');
