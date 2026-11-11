const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

async function settings(fixture, device) {
  const {page, context, login} = await fixture.open(device, 'admin');
  const staff = fixture.fixture.profiles[1];
  const originalFunds = [...staff.user_permissions.assigned_fund_account_ids];
  let saved;
  await page.route('**/rpc/admin_save_access14281', async route => {
    const {p_user, p_permissions} = route.request().postDataJSON();
    assert.equal(p_user, staff.id);
    saved = p_permissions;
    Object.assign(staff.user_permissions, saved);
    Object.assign(fixture.fixture.tables.user_permissions.find(p => p.user_id === p_user), saved);
    await route.fulfill({json:{user_id:p_user, saved:true, ledger_saved:true}});
  });
  await login();
  const phone = device === 'phone';
  if (phone) {
    await page.locator('[data-area=settings]').click();
  }
  const open = async () => {
    if (phone) {
      await page.locator('[data-tool-user="' + staff.id + '"]').click();
      await page.getByText('Entry accounts and directions', {exact:true}).click();
    } else {
      await page.evaluate(id => {switchTab('settings-users');openUserAccessEditor(id)}, staff.id);
    }
  };
  await open();
  const picker = phone ? page.locator('#phoneUserSettings select[name=entry_method]') :
    page.getByLabel('Transaction entry option', {exact:true});
  await picker.waitFor({state:'visible'});
  assert.deepEqual(await picker.locator('option').evaluateAll(nodes => nodes.map(o=>o.value)), ['double','cashbook','both']);
  await picker.selectOption('both');
  const response = page.waitForResponse(r => r.url().includes('/rpc/admin_save_access14281'));
  await page.getByRole('button', {name:phone?'Save settings':'Save User', exact:true}).click();
  await response;
  assert.equal(saved.workspace_entry_mode240, 'both');
  assert.deepEqual(saved.assigned_fund_account_ids, originalFunds);
  if (!phone) await page.locator('#modalUserAccess').waitFor({state:'hidden'});
  await open();
  assert.equal(await picker.inputValue(), 'both');
  await context.close();
}

async function postBoth(fixture, device) {
  const {page, context, login, me} = await fixture.open(device, 'submitter');
  me.user_permissions.workspace_entry_mode240 = 'both';
  Object.assign(fixture.fixture.tables.user_permissions.find(p=>p.user_id===me.id), me.user_permissions);
  const receipts = [];
  await page.route('**/rpc/save_staff_editor1437', async route => {
    const params = route.request().postDataJSON();
    receipts.push(params);
    await route.fulfill({json:{line_ids:params.p_items.map(() => crypto.randomUUID())}});
  });
  await login();
  const phone = device === 'phone';
  async function open() {
    if (phone) await page.locator('[data-page=post]').click();
    else await page.evaluate(() => {openWorkspaceUser(liveProfile.id); personalJournal1437.show(liveProfile.id,'journal');showJournalEntry98();});
  }
  await open();
  const methods = phone?page.locator('[data-action=switch-method]'):page.getByRole('group', {name:'Transaction entry method'});
  const single = methods.getByRole('button',{name:phone?'Cashbook':'Single Entry (Cashbook)', exact:true});
  const double = methods.getByRole('button',{name:phone?'Double Entry':'Double Entry Journal', exact:true});
  const fund = me.user_permissions.assigned_fund_account_ids[0];
  const account = me.user_permissions.destination_account_ids[0];
  for (const [index, mode] of ['single','double'].entries()) {
    if (index && !await methods.isVisible()) await open();
    if(phone){if(await methods.getAttribute('data-mode')!=='single')await methods.click();}else await single.click();
    const prefix = phone?'data-field':'data-simple';
    await page.locator('['+prefix+'=source]').first().selectOption(fund,{force:true});
    await page.locator('['+prefix+'=affected]').first().selectOption(account,{force:true});
    await page.locator('['+prefix+'=amount]').first().fill(String(1200+index));
    const memo = phone ? page.locator('[data-field=memo]:not([data-index])') :
      page.locator('#jeGeneralMemo').locator('..').locator('.memo-link-text143187');
    await memo.fill('Fixture method '+mode);
    if (mode === 'double') await (phone?methods:double).click();
    if(phone)assert.equal(await methods.getAttribute('data-mode'),mode);
    else assert.equal(await (mode==='single'?single:double).getAttribute('aria-pressed'), 'true');
    await Promise.all([
      page.waitForResponse(r=>r.url().includes('/rpc/save_staff_editor1437')),
      (async () => {
        await page.locator(phone?'#postForm button[type=submit]':'#btnPostJournal').click();
        if (!phone) {
          await page.waitForFunction(()=>!document.getElementById('jeGeneralMemo').value);
          await page.evaluate(async () => {
            const pending = offline14239.queue().find(job=>job.status==='pending');
            if (pending) await offline14239.retryEntry(pending.payload.p_key);
          });
        }
      })()
    ]);
    const receipt = receipts[index];
    assert.equal(receipt.p_snapshot.mode, mode);
    assert.equal(receipt.p_owner, me.id);
    assert.equal(receipt.p_items.length, 1);
    assert.equal(receipt.p_items[0].amount, 1200+index);
    assert.equal(receipt.p_items[0].fund, fund);
    assert.equal(receipt.p_items[0].account, account);
    await page.waitForFunction(phone?
      ()=>!document.querySelector('#postForm [type=submit]')?.disabled && !document.querySelector('[data-field=memo]:not([data-index])')?.value:
      ()=>!document.getElementById('jeGeneralMemo').value);
  }
  assert.notEqual(receipts[0].p_key,receipts[1].p_key);
  await context.close();
}

(async () => {
  const fixture = await createFixture();
  try {
    for (const device of ['desktop','phone']) {
      await settings(fixture,device);
      console.log('PASS '+device+' administration saves and reopens Both');
      await postBoth(fixture,device);
      console.log('PASS '+device+' posts each form to the assigned personal account');
    }
  } finally {await fixture.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
