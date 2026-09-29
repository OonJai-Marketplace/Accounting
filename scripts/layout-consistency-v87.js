/* Shared desktop module geometry, without changing mobile journal layout. */
function polish87(){
 const accountRoots=['sec-general-ledger','sec-chart-accounts','sec-sub-accounts','sec-other-accounts','trial-balance','account-balances'];
 accountRoots.forEach(id=>{
  const root=document.getElementById(id);if(!root)return;
  const main=root.matches('.module-card')?root:root.querySelector('.je-card,.module-card');
  main?.classList.add('main-module87');
  root.querySelector('.je-card-header,.card-header-flex')?.classList.add('main-heading87');
 });
 document.querySelectorAll('[data-module="transactions"] .je-card-header,#user-entry-review>.settings-page-heading,.period-review-toolbar').forEach(n=>n.classList.add('main-heading87'));
 document.querySelectorAll('#sec-chart-accounts>.table-container,#sec-sub-accounts>.table-container,#otherAccounts69>.table-container').forEach(n=>n.classList.add('account-table-module87'));
 document.querySelectorAll('#tblChartOfAccounts,#tblSubAccounts,#otherAccounts69 table').forEach(table=>{
  table.querySelectorAll('tbody tr').forEach(row=>{
   const cell=row.lastElementChild;if(!cell||cell.colSpan>1||!cell.querySelector('button'))return;
   cell.classList.add('account-action87');
   if(!cell.querySelector(':scope>.account-actions87')){
    const actions=document.createElement('div');actions.className='account-actions87';
    actions.append(...cell.childNodes);cell.append(actions);
   }
  });
 });
 document.querySelectorAll('button.purpose-help71,button.v56-balance-alert').forEach(n=>n.classList.add('round-help87'));
}
let polishPending87=false;
new MutationObserver(()=>{if(polishPending87)return;polishPending87=true;requestAnimationFrame(()=>{polishPending87=false;polish87()})}).observe(document.body,{childList:true,subtree:true});
polish87();
