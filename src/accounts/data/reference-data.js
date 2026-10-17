let referenceLoadSerial14370=0;
async function loadReferenceDataFromSupabase() {
  const actor=liveProfile?.id,db=ojmDb,serial=++referenceLoadSerial14370;
  const [{data:currencies,error:currencyError},{data:accounts,error:accountError},{data:subs,error:subError}] = await Promise.all([
    db.from('currencies').select('*').eq('is_active',true).order('code'),
    db.from('accounts').select('*').eq('is_active',true).order('code'),
    db.from('sub_accounts').select('*').eq('is_active',true).order('code')
  ]);
  if(liveProfile?.id!==actor||ojmDb!==db||serial!==referenceLoadSerial14370)throw Error('Reference data request was superseded.');
  if(currencyError||accountError||subError) throw new Error((currencyError||accountError||subError).message);
  CurrencyStore.currencies=(currencies||[]).map(c=>({code:c.code,name:c.name,symbol:c.symbol,isBase:c.is_base}));
  AccountingStore.accounts=(accounts||[]).map(a=>({id:a.id,code:a.code,name:a.name,currency:a.currency_code,displayCurrency:a.currency_label||a.currency_code,baseType:a.account_type,type:a.is_technical?'SYSTEM':a.account_type,purpose:a.account_purpose||'regular',desc:a.description||'',parentCode:a.parent_code||'',isPosting:a.is_posting!==false,isTechnical:a.is_technical===true,trackForeignFunds:a.is_posting!==false&&!!a.currency_code&&!['LAK','NA'].includes(a.currency_code)}));
  const byId=new Map(AccountingStore.accounts.map(a=>[a.id,a]));
  AccountingStore.subAccounts=(subs||[]).map(s=>{const parent=byId.get(s.parent_account_id);return {id:s.id,parentId:s.parent_account_id,parentCode:parent?.code||'',currency:s.currency_code||parent?.currency||'',code:s.code,name:s.name,desc:s.description||'',postingAccountId14285:s.posting_account_id14285||null,trackForeignFunds:!!(s.currency_code||parent?.currency)&&!['LAK','NA'].includes(s.currency_code||parent?.currency)}});
  for(const sub of AccountingStore.subAccounts){const posting=byId.get(sub.postingAccountId14285);if(posting)posting.subAccountId14285=sub.id;}
  CurrencyStore.render(); refreshSettingsCurrencyOptions(); renderChartOfAccountsTable(); renderSubAccountsTable(); setupJournalColumns();
}

CurrencyStore.add = async function(code,name,symbol){const actor=liveProfile?.id,db=ojmDb,isCurrent=()=>liveProfile?.id===actor&&ojmDb===db;
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
  const{error}=await db.from('currencies').insert({code:clean,name:cleanName,symbol:cleanSymbol||clean,is_base:false});
  if(!isCurrent())return;if(error){
    const constraint=String(error.message||'').includes('currencies_code_check');
    showAppNotification('Currency Save Failed',constraint?'The currency code must contain exactly three letters.':error.message,true);return false
  }
  await loadReferenceDataFromSupabase();if(!isCurrent())return;showAppNotification('Currency Saved',`${clean} is now available to accounts and transactions.`,false);return true
};
CurrencyStore.edit = async function(code){const actor=liveProfile?.id,db=ojmDb,isCurrent=()=>liveProfile?.id===actor&&ojmDb===db;const current=this.currencies.find(c=>c.code===code);if(!current)return;const name=await ui117.prompt(`Currency name for ${code}:`,current.name);if(name===null||!isCurrent())return;const symbol=await ui117.prompt(`Symbol for ${code}:`,current.symbol);if(symbol===null||!isCurrent())return;const{error}=await db.from('currencies').update({name:name.trim(),symbol:symbol.trim()}).eq('code',code);if(!isCurrent())return;if(error){showAppNotification('Currency Update Failed',error.message,true);return}await loadReferenceDataFromSupabase()};
CurrencyStore.remove = async function(code){const actor=liveProfile?.id,db=ojmDb,isCurrent=()=>liveProfile?.id===actor&&ojmDb===db;if(!await ui117.confirm(`Remove currency ${code}?`)||!isCurrent())return;const{error}=await db.from('currencies').delete().eq('code',code);if(!isCurrent())return;if(error){showAppNotification('Currency Delete Failed','The currency may still be linked to accounts or transactions.',true);return}await loadReferenceDataFromSupabase()};

// The legacy database flag is asset-only; automatic report tracking is derived from currency for every account type.
handleAccountFormSubmit = async function(event){const actor=liveProfile?.id,db=ojmDb,isCurrent=()=>liveProfile?.id===actor&&ojmDb===db;event.preventDefault();const purpose=document.getElementById('accPurpose71');if(!purpose.value||(purpose.dataset.systemOnly==='true'&&purpose.value==='regular')){purpose.reportValidity();return}const original=document.getElementById('accountOrigCode').value;const payload={code:document.getElementById('accCode').value.trim(),name:document.getElementById('accName').value.trim(),currency_code:document.getElementById('accCurrency').value,account_type:document.getElementById('accType').value,description:document.getElementById('accDesc').value.trim(),account_purpose:document.getElementById('accPurpose71').value,created_by:liveProfile.id};const existing=AccountingStore.accounts.find(a=>a.code===original);const parent=payload.currency_code==='__PARENT__';payload.track_foreign_funds=!parent&&!!payload.currency_code&&!['LAK','NA'].includes(payload.currency_code)&&payload.account_type==='ASSET'&&payload.account_purpose==='regular'&&!existing?.isTechnical;payload.is_posting=!parent;payload.currency_label=parent?'—':payload.currency_code;if(parent){payload.currency_code=existing?.currency||CurrencyStore.currencies[0]?.code;if(!payload.currency_code){showAppNotification('Currency Required','Add at least one currency in Settings before creating an account.',true);return}if(existing?.id){const used=await db.from('journal_lines').select('id').eq('account_id',existing.id).limit(1);if(!isCurrent())return;if(used.error){showAppNotification('Account Check Failed',used.error.message,true);return}if(used.data?.length){showAppNotification('Account Has Transactions','Keep this account as a posting account. Create a separate parent account for grouping.',true);return}}}if(!isCurrent())return;const query=existing?db.from('accounts').update(payload).eq('id',existing.id):db.from('accounts').insert(payload);const{error}=await query;if(!isCurrent())return;if(error){showAppNotification('Account Save Failed',String(error.message).includes('account_purpose')?'Read setup/SETUP-GUIDE-v142.20.txt for the required existing database setup.':error.message,true);return}closeModal('modalAccount');await loadReferenceDataFromSupabase()};
promptDeleteAccount = function(code){const actor=liveProfile?.id,db=ojmDb,isCurrent=()=>liveProfile?.id===actor&&ojmDb===db;const acc=AccountingStore.accounts.find(a=>a.code===code);if(!acc)return;if(acc.subAccountId14285)return promptDeleteSubAccount(code);document.getElementById('confirmDeletePrompt').innerText=`Delete account “${acc.code} — ${acc.name}”? Linked sub-accounts will also be deleted.`;openModal('modalConfirmDelete');document.getElementById('btnDeleteConfirmAction').onclick=async()=>{if(!isCurrent())return;const{error}=await db.from('accounts').delete().eq('id',acc.id);if(!isCurrent())return;if(error){showAppNotification('Account Delete Failed','Posted journal lines may protect this account from deletion. Deactivate it instead.',true);return}closeModal('modalConfirmDelete');await loadReferenceDataFromSupabase()}};
handleSubAccountFormSubmit = async function(event){const actor=liveProfile?.id,db=ojmDb,isCurrent=()=>liveProfile?.id===actor&&ojmDb===db;
  event.preventDefault();
  const form=document.getElementById('formSubAccount');
  const original=document.getElementById('subAccountOrigCode').value;
  const parent=AccountingStore.accounts.find(a=>a.code===document.getElementById('subParentCode').value);
  if(!parent||parent.isPosting!==false){showCenterStatus('Choose a parent grouping account from the Chart of Accounts.',true);return}
  const currency=document.getElementById('subCurrency').value;
  if(!CurrencyStore.currencies.some(c=>c.code===currency&&c.active!==false)){
    showCenterStatus('Choose an active currency from Currency Settings.',true);return;
  }
  const payload={track_foreign_funds:!!currency&&!['LAK','NA'].includes(currency)&&(parent.baseType||parent.type)==='ASSET'&&!parent.isTechnical&&(!parent.purpose||parent.purpose==='regular'),parent_account_id:parent.id,currency_code:currency,code:document.getElementById('subCode').value.trim(),name:document.getElementById('subName').value.trim(),description:document.getElementById('subDesc').value.trim()};
  if(!payload.code||!payload.name){showCenterStatus('Enter a sub-account code and name.',true);return}
  const existing=AccountingStore.subAccounts.find(s=>s.code===original);
  const button=form.querySelector('[type=submit]');
  if(button.disabled)return;
  button.disabled=true;
  try{
    if(!isCurrent())return;const query=existing?db.from('sub_accounts').update(payload).eq('id',existing.id):db.from('sub_accounts').insert(payload);
    const {error}=await query;
    if(!isCurrent())return;if(error)throw error;
    closeModal('modalSubAccount');
    await loadReferenceDataFromSupabase();
    if(!isCurrent())return;const saved=AccountingStore.subAccounts.find(s=>s.code===payload.code);if(!saved?.postingAccountId14285)showAppNotification('Sub-account saved','Run setup/INSTALL-SUBACCOUNT-POSTING-REPAIR-v142.87.sql to make sub-accounts available in the chart and posting account picker.',true);
  }catch(error){
    if(!isCurrent())return;const message=/currency_code/i.test(error.message||'')&&['PGRST204','42703'].includes(error.code)
      ?'Run setup/INSTALL-SUBACCOUNT-CURRENCY-v142.16.sql once in Supabase, then save again.'
      :error.message||'The sub-account could not be saved.';
    showAppNotification('Sub-Account Save Failed',message,true);
  }finally{button.disabled=false}
};
promptDeleteSubAccount = function(code){const actor=liveProfile?.id,db=ojmDb,isCurrent=()=>liveProfile?.id===actor&&ojmDb===db;const sub=AccountingStore.subAccounts.find(s=>s.code===code);if(!sub)return;document.getElementById('confirmDeletePrompt').innerText=`Delete sub-account “${sub.code} — ${sub.name}”?`;openModal('modalConfirmDelete');document.getElementById('btnDeleteConfirmAction').onclick=async()=>{if(!isCurrent())return;const{error}=await db.from('sub_accounts').delete().eq('id',sub.id);if(!isCurrent())return;if(error){showAppNotification('Delete Failed',error.message,true);return}closeModal('modalConfirmDelete');await loadReferenceDataFromSupabase()}};

