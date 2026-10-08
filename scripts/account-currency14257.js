/* Display-only: resolve badges from the canonical posting account by identity. */
(()=>{'use strict';
function resolve(sub,accounts){return accounts.find(a=>sub.accountId&&a.id===sub.accountId||sub.account_id&&a.id===sub.account_id||a.code===sub.code)}
const parentCode=code=>/^(?:NA|N\/A|PARENT|__PARENT__)$/i.test(String(code||''));const symbol=window.currencySymbolV6;window.currencySymbolV6=function(code){return parentCode(code)?'▦':symbol(code)};
function badge(n,account,fullLabel=false){const parent=account?.isPosting===false||account?.is_posting===false||parentCode(account?.currency)||parentCode(account?.currency_code);const code=parent?'NA':account?.currency||account?.currency_code;if(!code)return;n.classList.toggle('parent-account-badge',parent);if(n.dataset.currencyCode!==code)n.dataset.currencyCode=code;const title=parent?'Parent account':code;if(n.title!==title)n.title=title;const mark=parent?(fullLabel?'Parent':'▦'):currencySymbolV6(code);if(n.textContent!==mark)n.textContent=mark;if(n.getAttribute('aria-label')!==title)n.setAttribute('aria-label',title);}
function paint(){if(typeof AccountingStore==='undefined')return;const accounts=AccountingStore.accounts||[];
 document.querySelectorAll('#coaTableBody tr').forEach(row=>{const code=row.querySelector('[onclick^="openEditAccountModal"]')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1],account=accounts.find(a=>a.code===code),n=row.querySelector('.currency-tag');if(n&&account&&(account.isPosting===false||account.is_posting===false||parentCode(account.currency)||parentCode(account.currency_code)))badge(n,account,true)});
 document.querySelectorAll('.currency-symbol-badge,.currency-tag').forEach(n=>{if(n.closest('#coaTableBody'))return;if(parentCode(n.dataset.currencyCode))badge(n,{isPosting:false,currency:'NA'})});
 document.querySelectorAll('#subAccountTableBody tr').forEach(row=>{const code=row.cells[1]?.textContent.trim(),sub=AccountingStore.subAccounts.find(s=>s.code===code);if(!sub)return;const account=resolve(sub,accounts);const b=row.querySelector('.currency-symbol-badge');if(b&&account)badge(b,account)});
 for(const root of document.querySelectorAll('#userFundAccountGrid,#userAccountAccessGrid,#userLedgerAccountGrid14281,#subUserWorkspacePanel'))for(const b of root.querySelectorAll('.currency-symbol-badge,.currency-tag')){
  const label=b.closest('label'),choice=label?.querySelector('input[type=checkbox],input[type=radio]'),row=b.closest('[data-account-id],[data-fund-id]'),id=choice?.value?.split('|')[0]||row?.dataset.accountId||row?.dataset.fundId;
  const account=accounts.find(a=>a.id===id||a.code===id);if(account)badge(b,account);
 }
}
function ready(){paint();let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;paint()})}).observe(document.body,{childList:true,subtree:true});window.addEventListener('page113',paint)}
window.accountCurrency14257={resolve,paint};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
