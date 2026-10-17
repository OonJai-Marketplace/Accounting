const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os');
const create=require('./phase0-browser-fixture.cjs');
const checks=[];
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name)}
(async()=>{const f=await create();try{
const {page,login}=await f.open();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const admin=f.fixture.profiles[0],staff=f.fixture.profiles[1],system={...f.fixture.accounts[3],id:'00000000-0000-4000-8000-000000009030',code:'9030',name:'Expense Mapping LAK',currency_code:'LAK',account_type:'EXPENSE',is_technical:true,is_active:true,is_posting:true};
f.fixture.tables.accounts.push(system);
f.fixture.tables.workspace_actor_audit138=Array.from({length:525},(_,i)=>({id:i+1,created_at:'2026-10-05T10:00:00Z',actor_id:admin.id,effective_user_id:staff.id,operation:'UPDATE',table_name:'staff_journal_lines',row_id:'ENTRY-'+i,before_data:{amount:1},after_data:{amount:2}}));
f.fixture.tables.workspace_actor_audit138.push({id:526,created_at:'2026-09-05T10:00:00Z',actor_id:admin.id,effective_user_id:staff.id,operation:'UPDATE',table_name:'staff_journal_lines',row_id:'SEPTEMBER',before_data:{amount:1},after_data:{amount:2}});
const assistedRequests=[];
await page.route('**/rest/v1/workspace_actor_audit138?*',route=>{const u=new URL(route.request().url()),offset=Number(u.searchParams.get('offset')||0),limit=Number(u.searchParams.get('limit')||1000);assistedRequests.push(offset);return route.fulfill({contentType:'application/json',body:JSON.stringify(f.fixture.tables.workspace_actor_audit138.slice(offset,offset+limit))})});
f.fixture.tables.audit_log=Array.from({length:125},(_,i)=>({id:i+1,created_at:'2026-10-05T10:00:00Z',actor_id:admin.id,action:'UPDATE',table_name:'journal_entries',record_id:'AUDIT-'+i,old_data:{memo:'Before'},new_data:{memo:'After'}}));
f.fixture.tables.scheduled_journals=[{id:'schedule-fixture',schedule_no:'SCH-001',title:'Monthly supplies',frequency:'monthly',anchor_day:5,next_due:'2026-11-05',start_date:'2026-10-05',amount:10000000,currency_code:'LAK',status:'active',is_sample:true}];
await login();page.setDefaultTimeout(12000);
await check('Update notice opens the version dialog with message and download action together',async()=>{
 await page.route('**/release-version.json*',r=>r.fulfill({contentType:'application/json',body:'{"version":"144.00"}'}));
 await page.evaluate(()=>offline14239.checkForUpdates());
 if(process.env.PHASE0_DEVICE==='tablet'){await page.evaluate(()=>websiteUpdates143103.open())}else{await page.locator('#upcomingBell101').click();await page.locator('#headerNoticeList104 [data-target="website-update"]').click()}
 await page.waitForSelector('#websiteUpdates143103[open]');
 assert.match(await page.locator('#websiteUpdateMessage143103').textContent(),/144.00.*available/);
 assert(await page.locator('#websiteUpdateDownload143103').isVisible());assert.match(await page.locator('#websiteUpdateDownload143103').getAttribute('href'),/update.html/);await page.locator('#websiteUpdates143103 [data-update-close]').first().click();
});
await check('Journal history has no empty header; audit month picker is adjacent to Print / Preview',async()=>{
 await page.evaluate(()=>switchTab('transactions-all'));assert.equal(await page.locator('#journalHistory14316 .history-search14343').count(),0);
 await page.evaluate(()=>switchTab('transactions-voided'));await page.waitForTimeout(200);
 const info=await page.locator('#transactions-voided .history-header14342').evaluate(h=>{const month=h.querySelector('.history-month14341'),print=h.querySelector('[data-print-page14301]'),a=month.getBoundingClientRect(),b=print.getBoundingClientRect();return {same:month.parentElement===print.parentElement,gap:b.left-a.right}});
 assert(info.same);assert(info.gap>=0&&info.gap<24,JSON.stringify(info));
});
await check('Assisted audit shows all 525 October records across server pages and follows September month selection',async()=>{
 assert.equal(await page.locator('#assistedAudit138 [data-assisted-detail14361]').count(),525); assert(assistedRequests.includes(500)); assert.equal(await page.locator('#auditMonths98 tbody tr').count(),125);
 assert.equal(await page.locator('#transactions-voided .table-pages14383').count(),0);
 await page.locator('[data-history-month14341="audit"]').evaluate(n=>{n.value='2026-09';n.dispatchEvent(new Event('change',{bubbles:true}))});
 await page.waitForFunction(()=>document.querySelectorAll('#assistedAudit138 [data-assisted-detail14361]').length===1);
 assert.match(await page.locator('#assistedAudit138').textContent(),/SEPTEMBER/);
});
await check('System accounts use red text without added SYSTEM labels or highlights',async()=>{
 await page.evaluate(()=>{switchTab('accounts');renderChartOfAccountsTable()});
 const row=page.locator('#coaTableBody tr').filter({hasText:'Expense Mapping LAK'});assert.equal(await row.locator('.system-account-badge14399').count(),0);
 const style=await row.locator('.system-account-name14399').evaluate(n=>({color:getComputedStyle(n).color,bg:getComputedStyle(n).backgroundColor}));assert.equal(style.color,'rgb(185, 28, 28)');assert.equal(style.bg,'rgba(0, 0, 0, 0)');
});
await page.evaluate(()=>{switchTab('journal');entry1430.restore('double',[]);clearJournalEntry();JournalUndo143103.reset()});
let account=page.locator('#jeLinesBody .je-line-acc').first();
await check('Selected account is first in the dropdown, double-click clearing supports Ctrl+Z and Ctrl+Y',async()=>{
 await page.waitForFunction(()=>document.querySelector('#jeLinesBody .je-line-acc')?.getAttribute('role')==='combobox');await account.click();await page.locator('.account-option1428').filter({hasText:'Expense Mapping'}).click();const value=await account.inputValue();
 await account.evaluate(n=>n.blur());const appearance=await account.evaluate(n=>({color:getComputedStyle(n).color,bg:getComputedStyle(n).backgroundColor}));assert.equal(appearance.color,'rgb(185, 28, 28)');assert.equal(appearance.bg,'rgba(0, 0, 0, 0)');
 await account.click();assert.match(await page.locator('.account-option1428').first().textContent(),/Expense Mapping/);await page.keyboard.press('Escape');
 await page.evaluate(()=>{const r=document.querySelector('#jeLinesBody tr');r.dataset.bookRate14383='6.5';r.dataset.sourceIds14253='["source-fixture"]';JournalUndo143103.reset()});
 await account.dblclick();assert.equal(await account.inputValue(),'');await page.keyboard.press('Control+z');assert.equal(await account.inputValue(),value);
 assert.equal(await page.locator('#jeLinesBody tr').first().getAttribute('data-source-ids14253'),'["source-fixture"]');
 assert.equal(await page.locator('#jeLinesBody tr').first().getAttribute('data-book-rate14383'),'6.5');
 await page.keyboard.press('Control+y');assert.equal(await account.inputValue(),'');await page.keyboard.press('Control+z');assert.equal(await account.inputValue(),value);
});
await check('Journal undo/redo covers typing, removed rows, draft clearing and invalidates redo after new edits',async()=>{
 const memo=page.locator('#jeLinesBody .je-line-memo').first();await memo.fill('Before');await memo.fill('After');await page.keyboard.press('Control+z');assert.equal(await memo.inputValue(),'Before');await page.keyboard.press('Control+y');assert.equal(await memo.inputValue(),'After');
 await page.evaluate(()=>addJournalLineRow('', 'third line'));await page.waitForTimeout(50);assert.equal(await page.locator('#jeLinesBody tr').count(),3);
 await page.evaluate(()=>removeJournalLineRow(document.querySelector('#jeLinesBody tr:last-child button')));await page.waitForTimeout(50);assert.equal(await page.locator('#jeLinesBody tr').count(),2);
 await memo.focus();await page.keyboard.press('Control+z');assert.equal(await page.locator('#jeLinesBody tr').count(),3);
 await page.evaluate(()=>clearJournalEntry());await page.waitForTimeout(50);await page.locator('#jeGeneralMemo').focus();await page.keyboard.press('Control+z');assert.equal(await page.locator('#jeLinesBody tr').count(),3);assert.equal(await page.locator('#jeLinesBody .je-line-memo').first().inputValue(),'After');
 await page.locator('#jeLinesBody .je-line-memo').first().fill('New edit');assert.equal(await page.evaluate(()=>JournalUndo143103.redo()),false);
});
await check('Single-entry dropdown clearing also restores its source selection and amount',async()=>{
 await page.evaluate(({system,cash})=>{entry1430.restore('single',[{date:'2026-10-05',direction:'out',source:cash,affected:system,amount:'100',memo:'Single fixture'}]);dropdown1434.enhance(document.getElementById('journalEntry98'));JournalUndo143103.reset()},{system:system.id,cash:f.fixture.accounts[0].id});
 const n=page.locator('#simpleRows1430 input.account-search1428').last();await n.dblclick();assert.equal(await n.inputValue(),'');await page.keyboard.press('Control+z');assert.match(await n.inputValue(),/Expense Mapping/);assert.equal(await page.locator('#simpleRows1430 select[data-simple=affected]').inputValue(),system.id);assert.match(await page.locator('#simpleRows1430 [data-simple=amount]').inputValue(),/100/);
});
await check('Recurring amount fits 10 million kip; numbered to-dos keep due dates in collapsed headers',async()=>{
 await page.evaluate(()=>{switchTab('transactions-recurring');workspace14337.showSection('recurring');RecurringStore.items=[{id:'rec-fixture',createdAt:'2026-10-05',memo:'Sample obligation',frequency:'Monthly',nextDate:'2026-10-20',amount:10000000,currency:'LAK',reminders:[]}];renderRecurringTransactions();});
 const cell=page.locator('.recurring-amount143103');assert.match(await cell.textContent(),/10,000,000\.00/);assert.match(await cell.textContent(),/₭/);assert(await cell.evaluate(n=>n.scrollWidth<=n.clientWidth));
 await page.evaluate(()=>{workflow136.state.todos=Array.from({length:6},(_,i)=>({id:'todo-fixture-'+i,title:'Checklist '+(i+1),due_date:'2026-10-20',steps:[{text:'Prepare supplies',done:false},{text:'Check station',done:false}]}));todos1438.render();workspace14337.showSection('todos')});
 assert.deepEqual(await page.locator('#todos136 .task-number143103').allTextContents(),['1.','2.','3.','4.','5.','6.']);assert.match(await page.locator('#todos136 summary').first().textContent(),/20\/10\/2026/);
 await page.screenshot({path:path.join(process.env.QA_SCREENSHOT_DIR||os.tmpdir(),'todos-143103-'+(process.env.PHASE0_DEVICE||'desktop')+'.png')});
});
await check('Schedules and monthly user submissions have no page controls; shared header emphasizes user and report type',async()=>{
 await page.evaluate(()=>{workspace14337.showSection('scheduled');renderSchedules14364();tablePagination14383.scan()});assert.equal(await page.locator('#scheduledJournals91 .table-pages14383').count(),0);
 await page.screenshot({path:path.join(process.env.QA_SCREENSHOT_DIR||os.tmpdir(),'schedule-143103-'+(process.env.PHASE0_DEVICE||'desktop')+'.png')});
 await page.evaluate(staff=>{reviewStaffJournals=[{id:'submission-fixture',owner_id:staff.id,seed_key:'SUB-FIXTURE',period_start:'2026-10-01',status:'posted',report_types14253:[{name:'Cashier report'}],lines:Array.from({length:125},(_,i)=>({id:'line-'+i,workspace_entry_no:'ENTRY-'+i,transaction_date:'2026-10-05',account_id:AccountingStore.accounts[3].id,fund_account_id:AccountingStore.accounts[0].id,currency_code:'LAK',amount:100,memo:'Fixture line',direction:'out'})),reconciliation14345:{responsible:staff.full_name,asOf:'2026-10-31',funds:[{account_id:AccountingStore.accounts[0].id,name:'Cash',currency:'LAK',recorded:100,actual:100,difference:0}]}}];switchTab('transactions-all');budgetWorkflow14316.history('submitted');renderUserEntryReview();tablePagination14383.scan()},staff);
 assert.equal(await page.locator('#userEntryHistoryCards .final-source-table tbody tr').count(),125);assert.equal(await page.locator('#userEntryHistoryCards [data-page-hidden14383],#userEntryHistoryCards .table-pages14383').count(),0);
 const identity=page.locator('#userEntryHistoryCards .submission-identity143103');assert.match(await identity.textContent(),/Cashier report/);assert.match(await identity.locator('strong').first().textContent(),new RegExp(staff.full_name.split(' ')[0]));assert.match(await identity.locator('small').first().textContent(),/SUB-FIXTURE/);
 await page.screenshot({path:path.join(process.env.QA_SCREENSHOT_DIR||os.tmpdir(),'submission-143103-'+(process.env.PHASE0_DEVICE||'desktop')+'.png')});
});
await check('Budget history shows the complete selected month while other long tables retain pagination',async()=>{
 await page.evaluate(()=>{Work82.reports=Array.from({length:125},(_,i)=>({id:'budget-fixture-'+i,data:{kind:'finance',mode:'request',date:'2026-10-05',purpose:'Budget '+i,status:'draft'}}));Work82.reports.push({id:'budget-old',data:{kind:'finance',mode:'request',date:'2026-09-05',purpose:'Previous month'}});budgetWorkflow14316.history('budget');tablePagination14383.scan()});
 assert.equal(await page.locator('#budgetHistory14316 tbody tr').count(),125);assert.equal(await page.locator('#budgetHistory14316 .table-pages14383,#budgetHistory14316 [data-page-hidden14383]').count(),0);
 await page.locator('[data-history-month14341="budget"]').evaluate(n=>{n.value='2026-09';n.dispatchEvent(new Event('change',{bubbles:true}))});await page.waitForFunction(()=>document.querySelectorAll('#budgetHistory14316 tbody tr').length===1);
 await page.evaluate(()=>{const host=document.createElement('section');host.id='pager-fixture';host.className='tab-content active';host.innerHTML='<table><tbody>'+Array.from({length:125},(_,i)=>'<tr><td>'+i+'</td></tr>').join('')+'</tbody></table>';document.body.append(host);tablePagination14383.scan()});assert.match(await page.locator('#pager-fixture .table-pages14383').textContent(),/1 of 2/);await page.evaluate(()=>document.getElementById('pager-fixture').remove());
});
await check('Undo history does not cross an entry context boundary',async()=>{
 await page.evaluate(()=>{switchTab('journal');JournalModule.editingEntryId='different-entry'});assert.equal(await page.evaluate(()=>JournalUndo143103.undo()),false);
});
assert.deepEqual(errors,[]);console.log('PASS',checks.length,'focused browser checks; no runtime errors');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exit(1)});
