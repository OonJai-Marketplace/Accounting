// Exercise the real picker and discard protection with isolated user selections.
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const read=p=>fs.readFileSync('src/'+p,'utf8');
const html=fs.readFileSync('desktop.html','utf8'),start=html.indexOf('  <div id="modalUserAccess"'),end=html.indexOf('  <div id="modalSettingHelp"',start);
const dom=new JSDOM(html.slice(start,end),{runScripts:'dangerously',url:'https://fixture.invalid'}),w=dom.window,d=w.document,$=id=>d.getElementById(id),tick=()=>new Promise(r=>setTimeout(r,0));
let prompts=0,discard=false,saves=0;
Object.assign(w,{structuredClone,requestAnimationFrame:fn=>setTimeout(fn,0),escapeHtml:s=>String(s??''),liveProfile:null,liveProfiles:[],livePermission:null,APP_PERMISSION_TREE:[{id:'bookkeeping',label:'Bookkeeping',children:[['journal','Journal'],['history','History']]}],canAccessAppTarget:()=>true,openUserAccessEditor:()=>{},openWorkspaceUser:()=>{},saveUserAccess:e=>{e.preventDefault();saves++;},applyPermissionAccess:()=>{},switchTab:()=>{},openModal:id=>{$(id).style.display='block';},closeModal:id=>{$(id).style.display='none';},ui108:{modal:async()=>{prompts++;return discard;}},shell113:{esc:s=>String(s)}});
w.HTMLElement.prototype.getClientRects=function(){for(let n=this;n;n=n.parentElement)if(n.hidden||n.style.display==='none')return[];return[{}];};
(async()=>{
 await tick();for(const id of ['modalUserAccess','modalAccessPicker'])$(id).style.display='none';
 w.eval(read('core/permissions/workspace-access-pickers.js'));
 w.eval(read('core/auth/access-v113.js'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
 w.eval(read('shared/ui/editor-protection14380.js'));
 $('userFundAccountGrid').innerHTML='<label><input type="radio" name="fund" value="cash" checked><span>Cash</span></label><label><input type="radio" name="fund" value="bank"><span>Bank</span></label>';
 $('userAccountAccessGrid').innerHTML='<label><input type="checkbox" value="food" checked><span>Food</span></label><label><input type="checkbox" value="supplies"><span>Supplies</span></label>';
 const choose=()=>w.openAccessPicker('Account Assignment','userAccountAssignmentPanel'),entry=()=>d.querySelector('input[value=supplies]'),fund=()=>d.querySelector('input[value=bank]');
 const done=()=>d.querySelector('[onclick="completeAccessPicker265()"]'),cancel=()=>d.querySelector('#modalAccessPicker .modal-footer [onclick="closeAccessPicker()"]');
 w.openModal('modalUserAccess');await tick();choose();await tick();entry().click();done().click();await tick();
 assert.equal(prompts,0,'Done never asks to discard');assert.equal($('modalAccessPicker').style.display,'none');assert.equal(entry().checked,true,'Done stages selection in main form');assert.equal(saves,0,'Done does not save user');
 choose();await tick();entry().click();cancel().click();await tick();assert.equal(prompts,1);assert.equal($('modalAccessPicker').style.display,'block','Keep Editing stays open');assert.equal(entry().checked,false);
 discard=true;cancel().click();await tick();assert.equal(entry().checked,true,'Discard restores last accepted selection');assert.equal($('modalAccessPicker').style.display,'none');assert.equal(saves,0);
 choose();await tick();fund().click();$('permissionMultipleFunds').checked=true;for(const n of $('userFundAccountGrid').querySelectorAll('input')){n.type='checkbox';n.removeAttribute('name');n.checked=true;}w.closeAccessPicker();await tick();assert.equal(fund().type,'radio');assert.equal(fund().name,'fund');assert.equal(fund().checked,false);assert.equal($('permissionMultipleFunds').checked,false);
 w.access113.restoreEditor({journal:['view']});w.openAccessPicker('Module Access','userModuleAccessPanel');await tick();d.querySelector('[data-target113=journal][data-action113=edit]').click();assert(w.access113.editorCan('journal','edit'));cancel().click();await tick();assert.equal(w.access113.editorCan('journal','edit'),false,'Discard restores underlying permission matrix');assert.equal(w.access113.editorCan('journal','view'),true);
 w.openAccessPicker('Module Access','userModuleAccessPanel');await tick();d.querySelector('[data-target113=journal][data-action113=edit]').click();const before=prompts;done().click();await tick();assert.equal(prompts,before);assert(w.access113.editorCan('journal','edit'));assert.equal(saves,0);$('userAccessForm').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(saves,1);
 console.log('PASS real Done/Keep Editing/Discard behavior, staged account selections, radio restoration, permission matrix rollback and explicit Save User');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exit(1);});
