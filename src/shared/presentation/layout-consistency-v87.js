/* Shared desktop module geometry, without changing mobile journal layout. */
function polish87(scope=document){
 const all=selector=>[...(scope.matches?.(selector)?[scope]:[]),...scope.querySelectorAll(selector)];
 const accountRoots=['sec-general-ledger','sec-chart-accounts','sec-sub-accounts','sec-other-accounts','trial-balance','account-balances'];
 accountRoots.forEach(id=>{
  const root=document.getElementById(id);if(!root||scope!==document&&!scope.contains(root)&&!root.contains(scope))return;
  const main=root.matches('.module-card')?root:root.querySelector('.je-card,.module-card');
  main?.classList.add('main-module87');
  root.querySelector('.je-card-header,.card-header-flex')?.classList.add('main-heading87');
 });
 all('[data-module="transactions"] .je-card-header,#user-entry-review>.settings-page-heading,.period-review-toolbar').forEach(n=>n.classList.add('main-heading87'));
 all('#sec-chart-accounts>.table-container,#sec-sub-accounts>.table-container,#otherAccounts69>.table-container').forEach(n=>n.classList.add('account-table-module87'));
 all('#tblChartOfAccounts tbody tr,#tblSubAccounts tbody tr,#otherAccounts69 table tbody tr').forEach(row=>{
   const cell=row.lastElementChild;if(!cell||cell.colSpan>1||!cell.querySelector('button'))return;
   cell.classList.add('account-action87');
   if(!cell.querySelector(':scope>.account-actions87')){
    const actions=document.createElement('div');actions.className='account-actions87';
    actions.append(...cell.childNodes);cell.append(actions);
   }
 });
 all('button.purpose-help71,button.v56-balance-alert').forEach(n=>n.classList.add('round-help87'));
}
// New content receives geometry once; unrelated mutations leave retained rows alone.
let polishPending87=false;const polishRoots87=new Set();
new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)polishRoots87.add(n.closest('#tblChartOfAccounts tbody tr,#tblSubAccounts tbody tr,#otherAccounts69 table tbody tr')||n);if(polishPending87||!polishRoots87.size)return;polishPending87=true;requestAnimationFrame(()=>{polishPending87=false;const roots=[...polishRoots87].filter(n=>n.isConnected),pendingRoots=new Set(roots);polishRoots87.clear();for(const root of roots){let parent=root.parentNode;while(parent&&!pendingRoots.has(parent))parent=parent.parentNode;if(!parent)polish87(root)}})}).observe(document.body,{childList:true,subtree:true});
polish87()
