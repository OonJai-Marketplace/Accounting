/* Real browser, local synthetic data only. Picker scans must not repeat identical
 * account resolution or retain stale lookup results between enhancement passes. */
const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open();await login();await page.waitForFunction(()=>offline14239.state().shellReady);
 const result=await page.evaluate(()=>{
  const root=document.createElement('section');root.id='picker-cost-regression';document.getElementById('settings-business').append(root);
  const account=AccountingStore.accounts[0],oldName=account.name,oldCurrency=account.currency;
  for(let i=0;i<20;i++){const s=document.createElement('select');s.id='picker-cost-'+i;s.innerHTML='<option value="generic-one">First</option><option value="generic-two">Second</option>';root.append(s)}
  const financial=document.createElement('select');financial.id='picker-cost-financial';const option=document.createElement('option');option.value=account.id;option.textContent=account.name;financial.append(option);root.append(financial);
  const old=getSelectedAccountInfo;let calls=0;window.getSelectedAccountInfo=function(...args){calls++;return old.apply(this,args)};
  try{
   dropdown1434.enhance(root);const firstCalls=calls;
   const input=document.getElementById(financial.id+'Search1434'),original=input.value;
   const before=[...root.querySelectorAll('select')].map(s=>s.value);
   calls=0;dropdown1434.enhance(root);const secondCalls=calls;
   const after=[...root.querySelectorAll('select')].map(s=>s.value);
   account.name='Updated account name';account.currency=oldCurrency==='USD'?'LAK':'USD';dropdown1434.enhance(root);
   const changed=input.value,badge=input.closest('.account-choice14231')?.querySelector('.currency-symbol-badge')?.dataset.currencyCode;
   input.dataset.pickerDraft1444='true';input.value='Unfinished search';dropdown1434.enhance(root);const draft=input.value;
   financial.disabled=true;dropdown1434.enhance(root);const disabled=input.disabled;
   financial.hidden=true;dropdown1434.enhance(root);const hidden=input.hidden;
   return {firstCalls,secondCalls,before,after,original,changed,badge,expectedCurrency:account.currency,draft,disabled,hidden};
  }finally{window.getSelectedAccountInfo=old;account.name=oldName;account.currency=oldCurrency;root.remove()}
 });
 console.log(JSON.stringify({firstCalls:result.firstCalls,secondCalls:result.secondCalls}));
 assert(result.firstCalls<=2&&result.secondCalls<=2,'each distinct non-account value is resolved once per synchronous scan');
 assert.deepEqual(result.before,result.after,'underlying select values unchanged');
 assert.match(result.changed,/Updated account name/,'in-place account updates visible on next scan');
 assert.equal(result.badge,result.expectedCurrency);assert.equal(result.draft,'Unfinished search');assert(result.disabled&&result.hidden);
 console.log('PASS bounded picker lookups, fresh account name/currency, original values, unfinished input and disabled/hidden state');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
