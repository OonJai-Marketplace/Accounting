async function loadReferenceDataFromSupabase() {
  const [{data:currencies,error:currencyError},{data:accounts,error:accountError},{data:subs,error:subError}] = await Promise.all([
    ojmDb.from('currencies').select('*').eq('is_active',true).order('code'),
    ojmDb.from('accounts').select('*').eq('is_active',true).order('code'),
    ojmDb.from('sub_accounts').select('*').eq('is_active',true).order('code')
  ]);
  if(currencyError||accountError||subError) throw new Error((currencyError||accountError||subError).message);
  CurrencyStore.currencies=(currencies||[]).map(c=>({code:c.code,name:c.name,symbol:c.symbol,isBase:c.is_base}));
  AccountingStore.accounts=(accounts||[]).map(a=>({id:a.id,code:a.code,name:a.name,currency:a.currency_code,displayCurrency:a.currency_label||a.currency_code,baseType:a.account_type,type:a.is_technical?'SYSTEM':a.account_type,purpose:a.account_purpose||'regular',desc:a.description||'',parentCode:a.parent_code||'',isPosting:a.is_posting!==false,isTechnical:a.is_technical===true}));
  AccountingStore.subAccounts=(subs||[]).map(s=>({id:s.id,parentId:s.parent_account_id,parentCode:AccountingStore.accounts.find(a=>a.id===s.parent_account_id)?.code||'',currency:s.currency_code||AccountingStore.accounts.find(a=>a.id===s.parent_account_id)?.currency||'',code:s.code,name:s.name,desc:s.description||''}));
  for(const sub of AccountingStore.subAccounts){const raw=(subs||[]).find(x=>x.id===sub.id);sub.postingAccountId14285=raw?.posting_account_id14285||null;const posting=AccountingStore.accounts.find(a=>a.id===sub.postingAccountId14285);if(posting)posting.subAccountId14285=sub.id;}
  CurrencyStore.render(); refreshSettingsCurrencyOptions(); renderChartOfAccountsTable(); renderSubAccountsTable(); setupJournalColumns();
}

CurrencyStore.add = async function(code,name,symbol){
  const clean=String(code||'').toUpperCase().replace(/[^A-Z]/g,'').trim();
  const cleanName=String(name||'').trim(),cleanSymbol=String(symbol||'').trim();
  if(!/^[A-Z]{3}$/.test(clean)){
    showAppNotification('Currency Code Required','Use exactly three letters, such as LAK, USD, THB, EUR, or CNY.',true);
    document.getElementById('newCurrencyCode')?.focus();return false
  }
  if(!cleanName){showAppNotification('Currency Name Required','Enter the full currency name before saving.',true);document.getElementById('newCurrencyName')?.focus();return false}
  if((CurrencyStore.currencies||[]).some(item=>String(item.code).toUpperCase()===clean)){
    showAppNotification('Currency Already Exists',`${clean} is already available in Currency Manager.`,true);return false
  }
  const{error}=await ojmDb.from('currencies').insert({code:clean,name:cleanName,symbol:cleanSymbol||clean,is_base:false});
  if(error){
    const constraint=String(error.message||'').includes('currencies_code_check');
    showAppNotification('Currency Save Failed',constraint?'The currency code must contain exactly three letters.':error.message,true);return false
  }
  await loadReferenceDataFromSupabase();showAppNotification('Currency Saved',`${clean} is now available to accounts and transactions.`,false);return true
};
CurrencyStore.edit = async function(code){const current=this.currencies.find(c=>c.code===code);if(!current)return;const name=await ui117.prompt(`Currency name for ${code}:`,current.name);if(name===null)return;const symbol=await ui117.prompt(`Symbol for ${code}:`,current.symbol);if(symbol===null)return;const{error}=await ojmDb.from('currencies').update({name:name.trim(),symbol:symbol.trim()}).eq('code',code);if(error){showAppNotification('Currency Update Failed',error.message,true);return}await loadReferenceDataFromSupabase()};
CurrencyStore.remove = async function(code){if(!await ui117.confirm(`Remove currency ${code}?`))return;const{error}=await ojmDb.from('currencies').delete().eq('code',code);if(error){showAppNotification('Currency Delete Failed','The currency may still be linked to accounts or transactions.',true);return}await loadReferenceDataFromSupabase()};

handleAccountFormSubmit = async function(event){event.preventDefault();const purpose=document.getElementById('accPurpose71');if(!purpose.value||(purpose.dataset.systemOnly==='true'&&purpose.value==='regular')){purpose.reportValidity();return}const original=document.getElementById('accountOrigCode').value;const payload={code:document.getElementById('accCode').value.trim(),name:document.getElementById('accName').value.trim(),currency_code:document.getElementById('accCurrency').value,account_type:document.getElementById('accType').value,description:document.getElementById('accDesc').value.trim(),account_purpose:document.getElementById('accPurpose71').value,created_by:liveProfile.id};const existing=AccountingStore.accounts.find(a=>a.code===original);const parent=payload.currency_code==='__PARENT__';payload.is_posting=!parent;payload.currency_label=parent?'—':payload.currency_code;if(parent){payload.currency_code=existing?.currency||CurrencyStore.currencies[0]?.code;if(!payload.currency_code){showAppNotification('Currency Required','Add at least one currency in Settings before creating an account.',true);return}if(existing?.id){const used=await ojmDb.from('journal_lines').select('id').eq('account_id',existing.id).limit(1);if(used.error){showAppNotification('Account Check Failed',used.error.message,true);return}if(used.data?.length){showAppNotification('Account Has Transactions','Keep this account as a posting account. Create a separate parent account for grouping.',true);return}}}if(existing?.isTechnical)payload.account_type=existing.baseType||'EQUITY';const query=existing?ojmDb.from('accounts').update(payload).eq('id',existing.id):ojmDb.from('accounts').insert(payload);const{error}=await query;if(error){showAppNotification('Account Save Failed',String(error.message).includes('account_purpose')?'Read setup/SETUP-GUIDE-v142.20.txt for the required existing database setup.':error.message,true);return}closeModal('modalAccount');await loadReferenceDataFromSupabase()};
promptDeleteAccount = function(code){const acc=AccountingStore.accounts.find(a=>a.code===code);if(!acc)return;if(acc.subAccountId14285)return promptDeleteSubAccount(code);document.getElementById('confirmDeletePrompt').innerText=`Delete account “${acc.code} — ${acc.name}”? Linked sub-accounts will also be deleted.`;openModal('modalConfirmDelete');document.getElementById('btnDeleteConfirmAction').onclick=async()=>{const{error}=await ojmDb.from('accounts').delete().eq('id',acc.id);if(error){showAppNotification('Account Delete Failed','Posted journal lines may protect this account from deletion. Deactivate it instead.',true);return}closeModal('modalConfirmDelete');await loadReferenceDataFromSupabase()}};
handleSubAccountFormSubmit = async function(event){
  event.preventDefault();
  const form=document.getElementById('formSubAccount');
  const original=document.getElementById('subAccountOrigCode').value;
  const parent=AccountingStore.accounts.find(a=>a.code===document.getElementById('subParentCode').value);
  if(!parent||parent.isPosting!==false){showCenterStatus('Choose a parent grouping account from the Chart of Accounts.',true);return}
  const currency=document.getElementById('subCurrency').value;
  if(!CurrencyStore.currencies.some(c=>c.code===currency&&c.active!==false)){
    showCenterStatus('Choose an active currency from Currency Settings.',true);return;
  }
  const payload={parent_account_id:parent.id,currency_code:currency,code:document.getElementById('subCode').value.trim(),name:document.getElementById('subName').value.trim(),description:document.getElementById('subDesc').value.trim()};
  if(!payload.code||!payload.name){showCenterStatus('Enter a sub-account code and name.',true);return}
  const existing=AccountingStore.subAccounts.find(s=>s.code===original);
  const button=form.querySelector('[type=submit]');
  if(button.disabled)return;
  button.disabled=true;
  try{
    const query=existing?ojmDb.from('sub_accounts').update(payload).eq('id',existing.id):ojmDb.from('sub_accounts').insert(payload);
    const {error}=await query;
    if(error)throw error;
    closeModal('modalSubAccount');
    await loadReferenceDataFromSupabase();
    const saved=AccountingStore.subAccounts.find(s=>s.code===payload.code);if(!saved?.postingAccountId14285)showAppNotification('Sub-account saved','Run setup/INSTALL-SUBACCOUNT-POSTING-REPAIR-v142.87.sql to make sub-accounts available in the chart and posting account picker.',true);
  }catch(error){
    const message=/currency_code/i.test(error.message||'')&&['PGRST204','42703'].includes(error.code)
      ?'Run setup/INSTALL-SUBACCOUNT-CURRENCY-v142.16.sql once in Supabase, then save again.'
      :error.message||'The sub-account could not be saved.';
    showAppNotification('Sub-Account Save Failed',message,true);
  }finally{button.disabled=false}
};
promptDeleteSubAccount = function(code){const sub=AccountingStore.subAccounts.find(s=>s.code===code);if(!sub)return;document.getElementById('confirmDeletePrompt').innerText=`Delete sub-account “${sub.code} — ${sub.name}”?`;openModal('modalConfirmDelete');document.getElementById('btnDeleteConfirmAction').onclick=async()=>{const{error}=await ojmDb.from('sub_accounts').delete().eq('id',sub.id);if(error){showAppNotification('Delete Failed',error.message,true);return}closeModal('modalConfirmDelete');await loadReferenceDataFromSupabase()}};

