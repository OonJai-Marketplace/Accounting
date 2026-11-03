// Native-control regression checks. These do NOT emulate the iPad OS keyboard.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const picker=fs.readFileSync('src/shared/ui/account-picker1428.js','utf8');
const detection=picker.slice(picker.indexOf('const tabletPicker='),picker.indexOf('const accounts='));
const binding=picker.slice(picker.indexOf('function bind('),picker.indexOf('function accountChecks14231'));
for(const device of [
 {name:'tablet',kind:'tablet',ua:'',platform:'',touch:1,button:true},
 {name:'iPad desktop UA',kind:'desktop',ua:'Macintosh',platform:'MacIntel',touch:5,button:true},
 {name:'iPad mobile UA',kind:'desktop',ua:'iPad',platform:'iPad',touch:5,button:true},
 {name:'desktop',kind:'desktop',ua:'Macintosh',platform:'MacIntel',touch:0,button:false},
])for(const field of ['main journal','personal double entry','single entry fund','single entry category']){
 let opened=0,blurred=0;const events={};
 const input={type:'text',value:'1010',dataset:{},readOnly:false,
  matches:s=>s==='.je-line-acc'&&!field.startsWith('single'),
  setAttribute(k,v){this[k]=v},getAttribute(k){return this[k]},
  addEventListener(k,fn){(events[k]||=[]).push(fn)},
 };
 const source=field.startsWith('single')?{tagName:'SELECT',closest:()=>true}:Object.assign(input,{tagName:'INPUT',closest:()=>true});
 const ctx={navigator:{userAgent:device.ua,platform:device.platform,maxTouchPoints:device.touch},
  document:{documentElement:{dataset:{device132:device.kind}},activeElement:{blur(){blurred++}}},
  window:{},bound:new WeakSet(),clearers:new WeakMap(),active:null,open(){opened++}};
 vm.runInNewContext(detection+binding,ctx);ctx.bind(input,source);
 assert.equal(input.type,device.button?'button':'search',device.name+' '+field);
 assert.equal(input.value,'1010','binding preserves account data');
 if(device.button){assert.equal(input.inputMode,'none');events.click[0]({});assert.equal(opened,1);assert.equal(blurred,1);}
}
// Ordinary name/signatory autocomplete remains editable on tablets.
{
 const input={tagName:'INPUT',type:'text',dataset:{},matches:()=>false,closest:()=>null,setAttribute(){},addEventListener(){}};
 const ctx={navigator:{userAgent:'iPad',platform:'iPad',maxTouchPoints:5},document:{documentElement:{dataset:{device132:'tablet'}}},window:{},bound:new WeakSet(),clearers:new WeakMap()};
 vm.runInNewContext(detection+binding,ctx);ctx.bind(input,input);assert.equal(input.type,'text');
}
console.log('PASS native button account controls in main/personal double entry and single-entry fund/category; iPad UA fallback; desktop and name fields preserved');
