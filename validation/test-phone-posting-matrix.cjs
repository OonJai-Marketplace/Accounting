const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

// Representative assigned account sets, including two accounts which serve as
// both a fund and a transfer category. All records and requests stay in the fixture.
const roles = [
  {title:'Head Cook', directions:['out'], funds:{LAK:1}, categories:{LAK:7}},
  {title:'Cashier', directions:['in','out'], funds:{LAK:4,THB:2,USD:1}, categories:{LAK:13,THB:2,USD:2}, overlap:2},
  {title:'Health Professional', directions:['out','in'], funds:{LAK:1}, categories:{LAK:1}}
];

async function exercise(fixture,role) {
  const {page,context,me,login}=await fixture.open('phone','submitter');
  const funds=[],categories=[];
  const make=(kind,currency_code,i)=>({id:crypto.randomUUID(),code:currency_code+'-'+kind+i,
    name:kind+' '+i,currency_code,is_active:true,is_posting:true});
  for(const [currency,count] of Object.entries(role.funds)){
    const local=Array.from({length:count},(_,i)=>make('Fund',currency,i));
    funds.push(...local);
    const overlap=currency==='LAK' ? role.overlap||0 : 0;
    categories.push(...local.slice(0,overlap),...Array.from({length:role.categories[currency]-overlap},(_,i)=>make('Category',currency,i)));
  }
  fixture.fixture.tables.accounts=[...new Set([...categories,...funds])];
  fixture.fixture.balances[me.id]=[];
  Object.assign(me.user_permissions,{job_title:role.title,assigned_fund_account_ids:funds.map(a=>a.id),
    destination_account_ids:categories.map(a=>a.id),allowed_directions:role.directions,allow_multiple_funds:funds.length>1});
  const errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/rpc/save_staff_editor1437',async route=>{
    const body=route.request().postDataJSON();
    requests.push(body);
    await route.fulfill({json:{line_ids:body.p_items.map(()=>crypto.randomUUID())}});
  });
  await login();
  await page.locator('[data-page=post]').click();
  const act=name=>page.locator('[data-action="'+name+'"]');
  const mode=async value=>{if(await act('switch-method').getAttribute('data-mode')!==value)await act('switch-method').tap();};
  let cases=0;
  for(const direction of role.directions)for(const finalMode of ['single','double']){
    await mode('single');
    await act('direction-'+direction).tap();
    await act('entry-date').tap();
    await page.getByRole('button',{name:'Previous month'}).tap();
    const dateCell=page.locator('[data-receipt-date$="-02"]');
    const date=await dateCell.getAttribute('data-receipt-date');
    await dateCell.tap();
    const pairs=funds.flatMap(f=>categories.filter(c=>c.id!==f.id&&c.currency_code===f.currency_code).map(c=>[f.id,c.id]));
    const memo=role.title+' '+direction+' '+finalMode;
    await page.evaluate(({pairs,memo})=>{
      function set(key,value,index){
        const field=document.querySelector('[data-field="'+key+'"]'+(index==null?':not([data-index])':'[data-index="'+index+'"]'));
        field.value=value;
        if(field.value!==value)throw Error('Picker rejected '+key+' on line '+index);
        field.dispatchEvent(new Event(field.tagName==='SELECT'?'change':'input',{bubbles:true}));
      }
      set('memo',memo);
      pairs.forEach(([fund,category],i)=>{
        if(i)document.querySelector('[data-action=add-receipt]').click();
        set('source',fund,i);set('affected',category,i);set('amount',String(i+1)+'.25',i);
        set('memo','Receipt '+(i+1),i);
      });
    },{pairs,memo});
    await mode(finalMode);
    if(finalMode==='double'){
      // Exercise the journal in both line orders on an independent conversion below.
      await mode('single');await mode('double');
    }
    if(!/complete entr/.test(await page.locator('#entryValidation').innerText()))
      throw Error(memo+': '+await page.locator('#entryValidation').innerText());
    const saved=page.waitForResponse(r=>r.url().includes('/rpc/save_staff_editor1437')&&r.request().postDataJSON()?.p_snapshot?.memo===memo);
    await page.locator('#postForm [type=submit]').tap();
    await saved;
    const items=requests.at(-1).p_items;
    assert.deepEqual(items.map(i=>[i.fund,i.account]),pairs);
    assert.deepEqual(items.map(i=>i.amount),pairs.map((_,i)=>i+1.25));
    assert(items.every(i=>i.direction===direction&&i.date===date));
    cases+=pairs.length;
  }
  assert.deepEqual(errors,[]);
  console.log('PASS',role.title,cases,'assigned fund/category, direction and posting-mode combinations with prior-month receipts');
  await context.close();
}
(async()=>{
  const fixture=await createFixture();
  try{for(const role of roles)await exercise(fixture,role);}
  finally{await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
