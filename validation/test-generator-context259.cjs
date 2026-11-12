const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('src/bookkeeping/journal/completion-ui258.js','utf8');
async function scenario(initialPersonal){
 const dom=new JSDOM('<style>.je-btn{display:flex!important}</style><div id="loginGate" class="is-authenticated"></div><section id="journalEntry98"><input id="jeTransDate" value="2026-11-03"><button id="addEntryRow14271">Add</button></section>',{url:'https://accounting.example.test',runScripts:'outside-only'}),w=dom.window,d=w.document;
 try{
  await new Promise(resolve=>w.addEventListener('load',resolve,{once:true}));
  w.liveProfile={id:'review-admin'};w.AccountingStore={accounts:[]};w.JournalCompletion258={available:()=>true,currency:()=>"LAK"};w.escapeHtml=s=>s;w.access113={can:()=>true};w.pendingWorkspacePostOwnerId='';w.pendingWorkspacePostJournalId='';w.personalJournal1437={active:initialPersonal};w.showCenterStatus=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  const card=d.querySelector('#journalEntry98');if(initialPersonal)card.dataset.personalOwner1437='user-a';
  w.ApplicationSettings={system:{},accounting:{}};w.eval(fs.readFileSync('src/shared/formatting/numbers.js','utf8'));
  w.eval(fs.readFileSync('src/bookkeeping/templates/transaction-templates.js','utf8'));
  w.eval(source);const button=d.querySelector('#generateJournal258');
  assert.equal(button.hidden,initialPersonal,'initial context');
  const switchOwner=async owner=>{w.personalJournal1437.active=!!owner;if(owner)card.dataset.personalOwner1437=owner;else card.removeAttribute('data-personal-owner1437');await new Promise(resolve=>w.setTimeout(resolve,0))};
  await switchOwner('');assert.equal(button.hidden,false);button.click();let popup=d.querySelector('#journalGenerator258');assert(popup?.open);
  popup.querySelector('[data-memo]').value='Retain main draft';popup.querySelector('[data-memo]').dispatchEvent(new w.Event('input'));
  await switchOwner('user-a');assert.equal(button.hidden,true);assert.equal(w.getComputedStyle(button).display,'none','hidden beats action button display');assert.equal(d.querySelector('#journalGenerator258'),null,'close popup after personal mount');
  await switchOwner('user-b');assert.equal(button.hidden,true);
  await switchOwner('');assert.equal(button.hidden,false);button.click();popup=d.querySelector('#journalGenerator258');assert(popup?.open);assert.equal(popup.querySelector('[data-memo]').value,'Retain main draft');
  d.querySelector('#loginGate').classList.remove('is-authenticated');await new Promise(resolve=>w.setTimeout(resolve,0));assert.equal(d.querySelector('#journalGenerator258'),null,'locking closes popup');
 }finally{w.close()}
}
(async()=>{await scenario(false);await scenario(true);console.log('PASS initial/personal/main workspace visibility, owner switching, popup closure, retained company draft and session locking');})().catch(e=>{console.error(e);process.exitCode=1});
