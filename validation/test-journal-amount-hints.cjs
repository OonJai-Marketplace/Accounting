const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
 const fixture = await createFixture();
 try {
  const {page, login} = await fixture.open();
  await login();
  await page.waitForFunction(() => startup14257.interactive);
  await page.evaluate(() => {
   switchTab('journal'); showJournalEntry98(); clearJournalEntry();
   for (const [code,currency,type] of [
    ['1016','LAK','ASSET'],['4010','LAK','REVENUE'],['9190','LAK','SYSTEM'],
    ['1017','THB','ASSET'],['9101','THB','SYSTEM'],['1018','USD','ASSET'],['9102','USD','SYSTEM'],
    ['9201','THB','SYSTEM'],['5010','LAK','EXPENSE'],['9290','LAK','SYSTEM'],['5419','LAK','EXPENSE'],['9202','USD','SYSTEM']
   ]) {
    if (!AccountingStore.accounts.some(a => a.code === code)) AccountingStore.accounts.push({
     id:code,code,currency,name:'Sample '+code,type,baseType:type,isTechnical:type==='SYSTEM',isPosting:true,active:true
    });
   }
  });
  const journal = page.locator('#jeLinesBody tr');
  const dialog = page.locator('#journalGenerator258');
  async function checkRows(rows, generator, sides) {
   assert.equal(await rows.count(), sides.length);
   for (const [i, side] of sides.entries()) {
    for (const field of ['debit','credit']) {
     const input=rows.nth(i).locator(generator?'[data-field='+field+']':field==='debit'?'.je-line-dr':'.je-line-cr');
     assert(await input.isVisible(), 'Hidden amount input on row '+(i+1));
     assert.equal(await input.evaluate(n=>n.placeholder), side===field?'Enter '+field:'', 'Row '+(i+1)+' '+field);
     if (side===field) {
      assert(await input.evaluate(n=>n.matches(':placeholder-shown')), 'A value is obscuring the hint');
     }
    }
   }
  }
  const cases=[
   ['Record sales received in multiple currencies',['debit','credit','debit','debit','credit','debit','credit']],
   ['Pay food costs in multiple currencies',['debit','credit','debit','credit','','debit','credit']]
  ];
  for (const [title,sides] of cases) {
   await page.evaluate(() => openTemplateManager());
   await page.locator('#templateManagerList .template-item').filter({hasText:title}).getByRole('button',{name:'Use',exact:true}).click();
   await checkRows(journal,false,sides);
   const first=journal.first().locator('.je-line-dr');
   await first.focus();
   assert(await first.evaluate(n=>n.matches(':placeholder-shown')));
   await first.fill('123');
   assert(!(await first.evaluate(n=>n.matches(':placeholder-shown'))));
   await first.fill('');
   await first.blur();
   assert(await first.evaluate(n=>n.matches(':placeholder-shown')));
   await page.evaluate(()=>{
    const snapshot=snapshotJournal69();
    for(const row of snapshot.rows)delete row.templateFields.templateSide274;
    restoreJournal69(snapshot);
   });
   await checkRows(journal,false,sides);
   await page.locator('#generateJournal258').click();
   await checkRows(dialog.locator('[data-row]'),true,sides);
   const amount=dialog.locator('[data-row="0"] [data-field=debit]');
   await amount.fill('25');
   assert(!(await amount.evaluate(n=>n.matches(':placeholder-shown'))));
   await amount.fill('');
   assert(await amount.evaluate(n=>n.matches(':placeholder-shown')));

   await dialog.locator('[data-close]').click();
  }
  console.log('PASS visible template amount hints in Post Entry and Generate, correct side only, focus, typing, clearing, and restored journal');
 } finally { await fixture.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
