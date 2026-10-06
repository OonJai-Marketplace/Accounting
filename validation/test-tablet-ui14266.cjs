const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

const meta={content:''},styles={},viewportListeners={},deviceListeners={},windowListeners={};let now=0,landscape=false;
const element={dataset:{},style:{setProperty:(key,value)=>styles[key]=value}};
const viewport={width:1280,scale:0.6,addEventListener:(name,handler)=>viewportListeners[name]=handler};
vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/device-mode132.js'),'utf8'),{
 navigator:{maxTouchPoints:5,platform:'iPad'},screen:{width:768,height:1024,orientation:{addEventListener(){}}},
 innerWidth:1280,innerHeight:1700,matchMedia:q=>({matches:q.includes('orientation:landscape')?landscape:true}),
 document:{documentElement:element,querySelector:()=>meta,addEventListener:(name,handler)=>deviceListeners[name]=handler},window:{visualViewport:viewport,addEventListener:(name,handler)=>windowListeners[name]=handler},requestAnimationFrame:callback=>callback(),setTimeout,Date:{now:()=>now}
});
assert.equal(element.dataset.device132,'tablet');
assert.equal(styles['--tablet-workspace132'],'1280px');
assert.match(meta.content,new RegExp(`width=1280, initial-scale=${768/1280}`.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
assert.match(meta.content,/user-scalable=yes/);
viewport.width=1000;windowListeners.resize();
assert.match(meta.content,new RegExp(`initial-scale=${768/1280}`.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'visual viewport drift must not shrink the tablet page');
assert.equal(viewportListeners.resize,undefined,'visual viewport changes must not trigger another page fit');
viewport.width=800;windowListeners.resize();
assert.equal(styles['--tablet-workspace132'],'1280px','switching entry mode must not rescale the tablet');
assert.match(meta.content,new RegExp(`initial-scale=${768/1280}`.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
now=900;
viewport.width=600;viewport.scale=1;windowListeners.resize();
assert.match(meta.content,new RegExp(`initial-scale=${768/1280}`.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'visual viewport zoom must not reset the fit after mode switch');
landscape=true;windowListeners.resize();
assert.match(meta.content,new RegExp(`initial-scale=${1024/1280}`.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'real orientation changes still refit the page');

const wideMeta={content:''},wideStyles={};
vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/device-mode132.js'),'utf8'),{
 navigator:{maxTouchPoints:5,platform:'iPad'},screen:{width:1366,height:1024,orientation:{addEventListener(){}}},
 innerWidth:1366,innerHeight:1024,matchMedia:()=>({matches:true}),
 document:{documentElement:{dataset:{},style:{setProperty:(key,value)=>wideStyles[key]=value}},querySelector:()=>wideMeta,addEventListener(){}},
 window:{visualViewport:{width:1366,scale:1,addEventListener(){}},addEventListener(){}},requestAnimationFrame:callback=>callback(),setTimeout
});
assert.equal(wideStyles['--tablet-workspace132'],'1366px','wide landscape should fill the screen without a right gutter');
assert.match(wideMeta.content,/width=1366, initial-scale=1/);

let holder;
const originalTabs={id:'subUserWorkspaceTabs'};
const header={append(node){this.child=node}};
vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/workspace-header14266.js'),'utf8'),{
 document:{readyState:'complete',querySelector:()=>header,getElementById:()=>originalTabs,createElement:()=>holder={append(node){this.child=node}}}
});
assert.equal(header.child,holder);
assert.equal(holder.child,originalTabs,'header must move the existing tabs, not duplicate the names');

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
const deviceSource=fs.readFileSync(path.join(root,'scripts/device-mode132.js'),'utf8').trim();
const entryBundle=fs.readFileSync(path.join(root,'scripts/desktop14245-1.js'),'utf8');
assert(entryBundle.includes('/* scripts/device-mode132.js */\n'+deviceSource),'published device bundle must match source');
const appSource=fs.readFileSync(path.join(root,'scripts/script.js'),'utf8');
const appBundle=fs.readFileSync(path.join(root,'scripts/desktop14245-3.js'),'utf8');
assert(appBundle.includes('/* scripts/script.js */\n'+appSource),'published workspace bundle must match source');
const extract=name=>{const found=appSource.match(new RegExp(`function ${name}\\([^\\n]+`));assert(found,`${name} source missing`);return found[0]};
const permissions={assigned_fund_account_ids:['fund'],destination_account_ids:Array.from({length:7},(_,i)=>`category-${i+1}`),allowed_directions:['out']};
const userContext={liveProfile:{id:'staff',role:'submitter'},livePermission:permissions,AccountingStore:{accounts:[...permissions.destination_account_ids.map(id=>({id,isPosting:true})),{id:'unassigned',isPosting:true},{id:'parent',isPosting:false}]}};
vm.runInNewContext([extract('accountKey'),extract('subUserPermission'),extract('workspaceRules'),extract('allowedStaffAccounts')].join('\n')+'\nthis.own=workspaceRules(liveProfile);this.allowed=allowedStaffAccounts();this.other=workspaceRules({id:"other",user_permissions:{destination_account_ids:["other-only"]}});',userContext);
assert.deepEqual(Array.from(userContext.own.entryIds),permissions.destination_account_ids,'all seven assigned categories must reach the signed-in user');
assert.equal(userContext.allowed.length,7,'the separate staff journal must show only assigned posting categories');
assert.deepEqual(Array.from(userContext.other.entryIds),['other-only'],'another user must keep their own assignment');
console.log('PASS tablet fit, original header tabs, keyboard reveal, permissions, bundle sync');
