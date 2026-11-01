const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open();await login();await page.evaluate(()=>idleSync14341.run(false));
 const today=await page.evaluate(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
 const id='schedule-approval-fixture',row={id,schedule_no:'SCH-225',title:'Monthly receipt approval',memo:'Prepared receipt',frequency:'monthly',day_rule:'same_day',anchor_day:Number(today.slice(-2)),next_due:today,start_date:today,amount:100,credit_amount:100,currency_code:'LAK',status:'active',is_sample:false,auto_post:true,reminder_days:3};
 f.fixture.tables.scheduled_journals=[row];f.fixture.tables.scheduled_journal_occurrences=[];
 let posts=0,requests=[],release,started=false;
 await page.route('**/rest/v1/rpc/post_scheduled_one92',async route=>{
  posts++;requests.push(route.request().postDataJSON());started=true;await new Promise(r=>release=r);
  row.next_due='2099-12-31';row.posted_count=1;row.auto_post=false;
  return route.fulfill({json:'OJM260225'});
 });
 await page.evaluate(async()=>{await loadSchedules91(true);refreshNotices1443()});
 assert.equal(posts,0);
 const notices=await page.evaluate(()=>getNotices14311().filter(n=>n.scheduleId));
 assert.equal(notices.length,1);assert.equal(notices[0].type,'Scheduled journal · Awaiting approval');
 const card=page.locator('[data-schedule-id="'+id+'"]');
 if(process.env.PHASE0_DEVICE==='tablet'){
  // Tablets use the existing Upcoming navigation badge instead of the desktop dock.
  assert((await page.evaluate(()=>navigationBadges14311.counts()['transactions-recurring']))>=1);
  await page.evaluate(()=>{switchTab('transactions-recurring');workspace14337.showSection('scheduled')});
  if(!await card.evaluate(n=>n.open))await card.locator('summary').click();
 }else{
  await page.locator('#upcomingBell101').click();
  await page.locator('#headerNoticeList104 button').filter({hasText:row.title}).click();
 }
 await page.waitForFunction(id=>document.querySelector('[data-schedule-id="'+id+'"]')?.open,id);
 assert(await card.isVisible());assert.equal(posts,0,'navigation does not post');await page.screenshot({path:'/tmp/scheduled-approval225-'+(process.env.PHASE0_DEVICE||'desktop')+'.png'});
 await card.getByRole('button',{name:'Edit',exact:true}).click();
 assert.equal(await page.locator('#scheduledForm91 [name=automatic]').count(),0);
 assert.match(await page.locator('#scheduledForm91').innerText(),/Approval is required/);
 await page.evaluate(()=>closeScheduledEditor91());
 await card.getByRole('button',{name:'Approve & Post',exact:true}).click();
 assert.equal(posts,0);await page.locator('#activeAppConfirm [data-cancel]').click();
 assert.equal(posts,0);assert.equal(row.next_due,today);
 await card.getByRole('button',{name:'Approve & Post',exact:true}).click();
 await page.locator('#activeAppConfirm [data-confirm]').click();
 for(let i=0;!started&&i<80;i++)await page.waitForTimeout(25);
 assert.equal(posts,1);
 await page.evaluate(id=>postScheduledNow91(id),id);
 assert.equal(await page.locator('#activeAppConfirm').count(),0,'busy occurrence cannot be submitted twice');
 release();await page.waitForFunction(()=>getScheduledAlerts104().length===0);
 assert.deepEqual(requests,[{p_id:id,p_expected_due:today,p_early:true}]);
 assert.equal(posts,1);assert.equal(await page.locator('#scheduledJournals91').getByText('Awaiting approval',{exact:true}).count(),0);
 console.log('PASS due notification opens schedule; edit/cancel/navigation allocate nothing; explicit approval posts once with expected due date and refreshes notifications');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
