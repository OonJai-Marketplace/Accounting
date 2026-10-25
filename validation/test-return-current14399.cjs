/* Returned-report correction using genuine local-fixture authentication and vault setup. */
const assert=require('node:assert/strict');
if(process.argv[2])process.env.PHASE0_ROOT=process.argv[2];
const create=require('./phase0-browser-fixture.cjs');
async function check(name,fn){await fn();console.log('PASS',name)}
(async()=>{const f=await create();try{
 const {page,login}=await f.open(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await login();await page.waitForFunction(()=>idleSync14341.session?.trigger==='login'&&!idleSync14341.running);
 await page.evaluate(()=>{syncAssessment14332.beforeClose=()=>{}});
await check('Single-entry returned report opens editable journal above an existing draft without filter failure',async()=>{
 await page.evaluate(()=>{const id=__fixture.profiles[1].id;window.__owner=id;const base={owner_id:id,period_start:'2026-10-01',lines:[]};const line={id:'returned-line',staff_journal_id:'returned-book',workspace_entry_no:1,transaction_date:'2026-10-01',direction:'out',fund_account_id:__fixture.accounts[0].id,account_id:__fixture.accounts[3].id,currency_code:'LAK',amount:20,memo:'Returned groceries',editor_snapshot1437:{mode:'single',memo:'Returned groceries',components1437:[{date:'2026-10-01',direction:'out',fund:__fixture.accounts[0].id,account:__fixture.accounts[3].id,amount:20,memo:'Returned groceries'}]}};reviewStaffJournals=[{...base,id:'returned-book',status:'returned',return_note:'Check receipt',lines:[line]},{...base,id:'draft-book',status:'draft',lines:[{...line,id:'draft-line',staff_journal_id:'draft-book',transaction_date:'2026-10-12',memo:'Existing saved entry',editor_snapshot1437:null}]}];window.__returnedFixture=structuredClone(reviewStaffJournals);const rpc=ojmDb.rpc.bind(ojmDb);ojmDb.rpc=async(n,a)=>n==='review_inbox14229'?{data:structuredClone(__returnedFixture),error:null}:rpc(n,a);openWorkspaceUser(id);personalJournal1437.show(id,'journal');});
 assert.equal(await page.locator('[data-entry-menu14387="returned-line"]').count(),0);assert(await page.locator('[data-entry-menu14387="draft-line"]').isVisible());await page.evaluate(()=>openWorkspaceReview(__owner,'review'));assert((await page.locator('[data-personal-panel=review]').innerText()).includes('Check receipt'));await page.evaluate(()=>openReturnedBook('returned-book'));
 assert.equal(await page.locator('#returnedBookOverlay').count(),0);assert(await page.locator('#personalActive1437').isVisible());assert.equal(await page.locator('#personalActive1437 tbody tr').first().getAttribute('data-entry-id'),'returned-line');assert(await page.locator('[data-entry-menu14387="returned-line"]').isVisible());assert(await page.locator('[data-entry-menu14387="draft-line"]').isVisible());
 await page.locator('[data-entry-menu14387="returned-line"]').dblclick();await page.locator('.journal-entry-menu14387 button').filter({hasText:'Edit'}).click();assert.equal(await page.locator('#jeGeneralMemo').inputValue(),'Returned groceries');assert.deepEqual(await page.evaluate(()=>document.getElementById('journalEntry98')._editIds1437),['returned-line']);
});
await check('Review badge and returned record retained; correction opens directly on tablet too',async()=>{
 await page.evaluate(()=>{navigationBadges14311.render();});
 const buttons=page.locator('[onclick*="openWorkspaceReview"]');assert(await buttons.count()>0);assert.equal(await buttons.locator('.nav-count14311').count(),0) // The report currently being corrected is excluded from pending badges.
;
 await page.setViewportSize({width:820,height:1000});await page.evaluate(()=>{renderSubUserWorkspace();openReturnedBook('returned-book')});assert(await page.locator('#personalActive1437').isVisible());assert(await page.locator('[data-entry-menu14387="returned-line"]').isVisible());
 await page.setViewportSize({width:1280,height:900});
});
assert.deepEqual(errors,[]);console.log('PASS returned-report correction via current entry menu on desktop and tablet');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
