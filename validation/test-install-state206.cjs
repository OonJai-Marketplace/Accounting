'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({ua='',standalone=false}={}){
 const events={},status={},button={},close={},listeners={};let dialog;
 const document={activeElement:{focus(){}},querySelectorAll:()=>[button],addEventListener:(name,fn)=>events['document:'+name]=fn,body:{append(node){dialog=node;}},createElement:()=>({open:false,setAttribute(){},querySelector:selector=>selector==='p'?status:close,addEventListener:(name,fn)=>listeners[name]=fn,showModal(){this.open=true;},close(){this.open=false;listeners.close?.();}})};
 const window={matchMedia:()=>({matches:standalone,addEventListener(){}}),addEventListener:(name,fn)=>events[name]=fn};
 vm.runInNewContext(fs.readFileSync('scripts/app-install205.js','utf8'),{document,window,navigator:{userAgent:ua,maxTouchPoints:0}});
 events['document:DOMContentLoaded']();
 return {events,status,button,window,open:()=>window.accountingInstall205.open(),close:()=>dialog.close()};
}
(async()=>{
 for(const [ua,expected] of [['Android',/Chrome.*Install app/],['iPhone',/Safari.*Share.*Add to Home Screen/],['',/Chrome or Edge/]]){const f=fixture({ua});await f.open();assert.match(f.status.textContent,expected);f.close();}
 const f=fixture();let prompts=0,prevented=false;
 f.events.beforeinstallprompt({preventDefault(){prevented=true;},prompt(){prompts++;f.events.appinstalled();return Promise.resolve();},userChoice:Promise.resolve({outcome:'accepted'})});
 const job=f.open();assert.equal(prompts,1,'prompt is invoked synchronously in the click gesture');await job;
 assert(prevented);assert.equal(f.button.textContent,'Accounting installed');assert.equal(f.button.disabled,false);assert.match(f.status.textContent,/has been installed/);assert.doesNotMatch(f.status.textContent,/requested|already running/,'installation event must not be overwritten by delayed prompt choice');
 f.close();await f.open();assert.match(f.status.textContent,/Open it from your apps/);assert.equal(prompts,1);
 const running=fixture({standalone:true});await running.open();assert.match(running.status.textContent,/already running/);
 const cancelled=fixture();cancelled.events.beforeinstallprompt({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'dismissed'})});await cancelled.open();assert.match(cancelled.status.textContent,/cancelled/);cancelled.close();await cancelled.open();assert.match(cancelled.status.textContent,/Chrome or Edge/);
 console.log('PASS Android/iPhone/desktop instructions, synchronous prompt, completion-before-choice race, consumed prompt, cancellation, browser-tab vs installed-app state; no navigation or storage dependencies');
})().catch(error=>{console.error(error);process.exitCode=1;});
