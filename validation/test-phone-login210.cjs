const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ui=fs.readFileSync('src/subusers/phone/runtime/login210.js','utf8');
const registrations=fs.readFileSync('src/subusers/phone/runtime/registration-and-scope-close.js','utf8');
const handler=registrations.slice(registrations.indexOf("  $('phoneForgotPassword210')"),registrations.indexOf("  $('phoneRecoveryForm').onsubmit"));
function classes(){const values=new Set();return {add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v)}}
async function scenario(mode){
 const nodes=new Map(),button={disabled:false};const $=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,value:'fixture@example.test',classList:classes(),setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},querySelector:()=>button,checkValidity:()=>true,focus(){}});return nodes.get(id)};
 let calls=0,finishAuth;const message={textContent:''},root={classList:classes()};root.classList.add('session-checking1444');
 const ctx={$ ,document:{documentElement:root},window:{loading1444:{markup:()=>'<span class="loading-orbit1444">six marbles</span>'}},authBusy:false,URL,localStorage:{getItem:()=>null},loginMessageTarget14293:()=>message,db:{auth:{signInWithPassword:async()=>{calls++;return new Promise(resolve=>finishAuth=resolve)},resetPasswordForEmail:async()=>{throw Error('Unexpected recovery request')}}},enter:async()=>ctx.window.phoneLogin210.finish()};
 if(mode==='vault')ctx.window.deviceVault14334={};vm.createContext(ctx);vm.runInContext(ui+handler,ctx);
 ctx.window.phoneLogin210.show();assert.equal(root.classList.contains('session-checking1444'),false);
 const promise=$('loginForm').onsubmit({preventDefault(){}});assert.equal($('loginGate').classList.contains('busy99'),true);assert.equal($('loginProgress99').hidden,false);assert.equal(button.disabled,true);
 await $('loginForm').onsubmit({preventDefault(){}});assert.equal(calls,1,'duplicate sign-in must be ignored');
 finishAuth(mode==='error'?{error:{message:'Invalid login credentials'}}:{data:{session:{user:{id:'fixture'}}}});await promise;
 if(mode==='error'){assert.equal(button.disabled,false);assert.equal($('loginProgress99').hidden,true);assert.equal(message.textContent,'Invalid login credentials');assert.equal($('loginGate').classList.contains('is-authenticated'),false)}
 if(mode==='vault'){assert.equal(button.disabled,true);assert.equal($('loginProgress99').hidden,false,'loader stays visible until vault reload');}
 if(mode==='direct'){assert.equal($('loginGate').classList.contains('is-authenticated'),true);assert.equal($('loginProgress99').hidden,true);}
}
(async()=>{for(const mode of ['error','vault','direct'])await scenario(mode);console.log('PASS shared login overlay, duplicate-submit guard, failed sign-in recovery and vault reload handoff');})().catch(e=>{console.error(e);process.exitCode=1});
