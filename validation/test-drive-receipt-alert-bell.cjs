const assert=require('node:assert/strict');
const createFixture=require('./phase0-browser-fixture.cjs');

(async()=>{
 const fixture=await createFixture();
 try{
   const {page,login}=await fixture.open();
   const issue={title:'More than one file names OJM260388',detail:'Page 1 of Ojm260388-OJM260389.pdf and OJM260388.pdf both point to the same entry.',fix:'Compare the files. If one is an extra receipt, rename it OJM260388-part02.pdf.'};
   let summary={issue_count:1,revision:1,first_issue:issue},detailReads=0;
   await page.route('**/rest/v1/receipt_drive_notice*',r=>r.fulfill({json:summary}));
   await page.route('**/rest/v1/receipt_drive_issues*',r=>{detailReads++;return r.fulfill({json:summary.issue_count?[issue]:[]});});
   await login();await page.waitForFunction(()=>startup14257.interactive);
   if(process.env.PHASE0_DEVICE==='tablet'){
     const tabletBell=page.getByRole('button',{name:'Review 1 receipt problem',exact:true});
     await tabletBell.click();
     const dialog=page.getByRole('dialog',{name:'Drive receipt problems'});
     await dialog.getByText(issue.fix,{exact:true}).waitFor();assert.equal(detailReads,1);
     await dialog.getByRole('button',{name:'Close',exact:true}).click();
     summary={issue_count:0,revision:2,first_issue:null};
     await page.evaluate(()=>driveReceiptAlerts.start(true));
     await tabletBell.waitFor({state:'detached'});
     console.log('PASS tablet navigation receipt alert, review, and clearance.');return;
   }
   const bell=page.locator('#upcomingBell101');await bell.click();
   const warning=page.locator('#headerNoticeList104 [data-target="receipt-drive-problems"]');
   await warning.waitFor();assert.equal(await warning.count(),1);
   assert.match(await warning.textContent(),/OJM260388-part02.pdf/);
   assert.equal(detailReads,0);
   await warning.click();
   const dialog=page.getByRole('dialog',{name:'Drive receipt problems'});
   await dialog.getByText(issue.fix,{exact:true}).waitFor();
   assert.equal(await dialog.locator('li').count(),1);
   await dialog.getByRole('button',{name:'Close',exact:true}).click();
   await bell.click();await warning.waitFor();
   assert.equal(await warning.count(),1);
   assert.equal(detailReads,1);
   summary={issue_count:0,revision:2,first_issue:null};
   await bell.click();await bell.click();
   await warning.waitFor({state:'detached'});
   assert.equal(detailReads,1);
   console.log('PASS a single critical bell item, both filenames, plain fix, on-demand review, and clearance.');
 }finally{await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
