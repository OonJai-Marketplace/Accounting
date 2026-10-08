/* Display-only: resolve badges from the canonical posting account by identity. */
(()=>{'use strict';
function resolve(sub,accounts){return accounts.find(a=>sub.accountId&&a.id===sub.accountId||sub.account_id&&a.id===sub.account_id||a.code===sub.code)}
function badge(n,account){const parent=account?.isPosting===false||account?.is_posting===false||account?.currency==='NA'||account?.currency_code==='NA';const code=parent?'NA':account?.currency||account?.currency_code;if(!code)return;n.classList.toggle('parent-account-badge',parent);if(n.dataset.currencyCode!==code)n.dataset.currencyCode=code;const title=parent?'Parent':code;if(n.title!==title)n.title=title;const symbol=parent?'Parent':currencySymbolV6(code);if(n.textContent!==symbol)n.textContent=symbol;}
function paint(){if(typeof AccountingStore==='undefined')return;const accounts=AccountingStore.accounts||[];
 document.querySelectorAll('#subAccountTableBody tr').forEach(row=>{const code=row.cells[1]?.textContent.trim(),sub=AccountingStore.subAccounts.find(s=>s.code===code);if(!sub)return;const account=resolve(sub,accounts);const b=row.querySelector('.currency-symbol-badge');if(b&&account)badge(b,account)});
 for(const root of document.querySelectorAll('#userFundAccountGrid,#userAccountAccessGrid,#subUserWorkspacePanel'))for(const b of root.querySelectorAll('.currency-symbol-badge,.currency-tag')){
  const label=b.closest('label'),choice=label?.querySelector('input[type=checkbox],input[type=radio]'),row=b.closest('[data-account-id],[data-fund-id]'),id=choice?.value?.split('|')[0]||row?.dataset.accountId||row?.dataset.fundId;
  const account=accounts.find(a=>a.id===id||a.code===id);if(account)badge(b,account);
 }
}
function ready(){paint();let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;paint()})}).observe(document.body,{childList:true,subtree:true});window.addEventListener('page113',paint)}
window.accountCurrency14257={resolve,paint};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
