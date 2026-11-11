const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const createFixture = require('./phase0-browser-fixture.cjs');

const root=path.resolve(__dirname,'..');
const desktop=fs.readFileSync(path.join(root,'desktop.html'),'utf8');
const startupScripts=[...desktop.matchAll(/<script\b[^>]*\bsrc="(scripts\/[^"?]+\.js)(?:\?[^"]*)?"/g)].map(match=>match[1]);
const lookbehind=/\(\?<[=!]/;

async function signIn(fixture,role){
  const {page,login,context,me}=await fixture.open('desktop',role);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    for(const key of ['timeout','any'])Object.defineProperty(AbortSignal,key,{value:undefined,configurable:true});
  });
  await page.reload();
  await login();
  const state=await page.evaluate(()=>({
    owner:liveProfile.id,role:liveProfile.role,
    hasWorkflow:typeof window.workflow136?.reload==='function',
    authenticated:document.getElementById('loginGate').classList.contains('is-authenticated'),
    alert:document.querySelector('#loginNotification14293[open]')?.textContent
  }));
  assert.equal(state.owner,me.id);
  assert.equal(state.role,me.role);
  assert(state.hasWorkflow&&state.authenticated);
  assert(!state.alert);
  if(role==='submitter'){
    await page.evaluate(()=>{openWorkspaceUser(liveProfile.id);personalJournal1437.show(liveProfile.id,'journal');showJournalEntry98();});
    assert(await page.locator('#journalEntry98').isVisible());
  }
  assert(!errors.some(message=>/workflow136|invalid regular expression/i.test(message)),errors.join('\n'));
  await page.evaluate(()=>{
    status118.clear();
    status118.error('Connection required. first step; second step. Retry now! Then continue? Check once more.');
  });
  assert.deepEqual(await page.locator('#status118 li').allTextContents(),['First step','Second step.','Retry now!','Then continue?','Check once more.']);
  await context.close();
}

(async()=>{
  // Before Safari 16.4 a lookbehind literal rejects its entire script at parse time,
  // even when the notification formatter is never called during sign-in.
  assert(startupScripts.some(s=>s.includes('desktop14245-5')));
  for(const file of new Set(startupScripts))assert(!lookbehind.test(fs.readFileSync(path.join(root,file),'utf8')),file+' contains unsupported regexp lookbehind');
  process.env.PHASE0_DEVICE='tablet';
  const fixture=await createFixture();
  try{
    await signIn(fixture,'admin');
    await signIn(fixture,'submitter');
    console.log('PASS iPad startup scripts, admin and sub-user sign-in, personal journal, and connection-notice formatting');
  }finally{await fixture.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
