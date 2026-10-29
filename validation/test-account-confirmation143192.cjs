const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('src/accounts/data/reference-data.js','utf8');
function fixture(result){
 const dom=new JSDOM('<form id="formSubAccount"><input id="subAccountOrigCode" value="sub"><input id="subParentCode" value="parent"><input id="subCurrency" value="LAK"><input id="subCode" value="sub"><input id="subName" value="Child"><input id="subDesc"><button type="submit">Save</button></form><p id="confirmDeletePrompt"></p><button id="btnDeleteConfirmAction"></button>',{runScripts:'outside-only'}),w=dom.window;
 const parent={id:'parent-id',code:'parent',isPosting:false,type:'ASSET'},sub={id:'sub-id',code:'sub',postingAccountId14285:'posting-id'};
 let changes=0,closed=0,writes=0;const messages=[];w.liveProfile={id:'admin'};w.AccountingStore={accounts:[parent,{id:'account-id',code:'account'}],subAccounts:[sub]};w.CurrencyStore={currencies:[{code:'LAK'}]};w.AccountSheet143191={changed:()=>changes++};w.openModal=()=>{};w.closeModal=()=>closed++;w.loadReferenceDataFromSupabase=async()=>{};w.showCenterStatus=w.showAppNotification=(...args)=>messages.push(args.join(' '));
 w.ojmDb={from:()=>{const q={update:()=>q,insert:()=>q,delete:()=>q,eq:()=>q,select:async()=>{writes++;return result;}};return q;}};
 w.eval(source.slice(source.indexOf('promptDeleteAccount =')));
 return {w,dom,messages,get changes(){return changes},get closed(){return closed},get writes(){return writes}};
}
(async()=>{
 for(const data of [[],[{id:'wrong-id',code:'sub'}]]){const f=fixture({data});await f.w.handleSubAccountFormSubmit({preventDefault(){}});assert.equal(f.closed,0);assert.equal(f.changes,0);assert(f.messages.some(m=>/not confirmed/.test(m)));f.w.close();}
 let f=fixture({data:[{id:'sub-id',code:'sub'}]});await f.w.handleSubAccountFormSubmit({preventDefault(){}});assert.equal(f.closed,1);assert.equal(f.changes,1);f.w.close();
 f=fixture({data:[]});f.w.AccountingStore.subAccounts=[];await f.w.handleSubAccountFormSubmit({preventDefault(){}});assert.equal(f.writes,0,'missing edited sub-account cannot turn into an insert');f.w.close();
 let release;f=fixture(new Promise(resolve=>release=resolve));const saving=f.w.handleSubAccountFormSubmit({preventDefault(){}});f.w.document.getElementById('subName').value='Unsaved next edit';release({data:[{id:'sub-id',code:'sub'}]});await saving;assert.equal(f.changes,1);assert.equal(f.closed,0,'a late save response must not close a changed sub-account editor');assert.equal(f.w.document.getElementById('subName').value,'Unsaved next edit');assert.equal(f.w.document.querySelector('[type=submit]').disabled,false);f.w.close();
 for(const [method,code,id] of [['promptDeleteAccount','account','account-id'],['promptDeleteSubAccount','sub','sub-id']]){
  for(const data of [[],[{id:'wrong-id'}],[{id}]]){f=fixture({data});f.w[method](code);await f.w.document.getElementById('btnDeleteConfirmAction').onclick();const ok=data[0]?.id===id;assert.equal(f.changes,ok?1:0);assert.equal(f.closed,ok?1:0);if(!ok)assert(f.messages.some(m=>/not confirmed/.test(m)));f.w.close();}
 }
 console.log('PASS sub-account saves and account/sub-account deletes require the exact affected row; stale edits never create new records');
})().catch(e=>{console.error(e);process.exitCode=1});
