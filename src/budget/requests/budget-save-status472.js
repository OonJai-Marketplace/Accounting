/* Report-specific delivery feedback. Reads the existing durable queue; no polling. */
(()=>{'use strict';
const esc=v=>escapeHtml(String(v??''));
let current=null;
function render(){
 const item=current;if(!item)return;
 if(liveProfile?.id!==item.owner||ojmDb!==item.client){item.root.resolve108(false);return;}
 const s=window.localFirst14333?.budgetSave(item.id);
 if(!s){item.root.resolve108(false);return;}
 item.root.querySelector('[data-budget-save-state]').textContent=s.status;
 item.root.querySelector('[data-budget-save-detail]').textContent=s.detail;
 const retry=item.root.querySelector('[data-budget-retry]');
 retry.hidden=s.confirmed;retry.disabled=s.sending||navigator.onLine===false;
 retry.textContent=s.sending?'Sending…':s.finalizing?'Retry finalization':'Retry save';
 item.root.querySelector('[data-budget-open]').hidden=!s.confirmed;
 item.root.querySelector('[data-budget-review]').hidden=!s.failed;
 const copyKey=s.job.id+':'+s.confirmed;
 if(item.copyKey!==copyKey){
  const copy=structuredClone(s.job.row.data);if(!s.confirmed)copy.status='draft';
  item.root.querySelector('[data-budget-copy]').innerHTML=BudgetReport290.report(copy);item.copyKey=copyKey;
 }
}
async function open(id){
 const owner=liveProfile?.id,client=ojmDb;
 if(!owner||liveProfile.role!=='admin'||!access113.can('transactions-budget14313')||window.workspaceRequest138?.target)throw Error('Return to your administrator Budget Requests workspace.');
 await localFirst14333.initialize();
 if(owner!==liveProfile?.id||client!==ojmDb)throw Error('Your sign-in changed. Reopen the notification.');
 const s=localFirst14333.budgetSave(id);if(!s)throw Error('The saved request is no longer available. Open Budget Requests.');
 if(current?.id===id&&current.owner===owner){render();return true;}
 current?.root.resolve108(false);
 switchTab('transactions-budget14313');
 if(!document.getElementById('transactions-budget14313')?.classList.contains('active'))return false;
 const d=s.job.row.data;
 const pending=ui108.modal('Fund utilization · Save status',
  '<p><strong>'+esc(BudgetReport290.period(d))+'</strong> · '+esc(d.purpose)+'</p>'+
  '<p role="status" aria-live="polite"><strong data-budget-save-state></strong></p><p data-budget-save-detail></p>'+
  '<div class="actions82"><button type="button" data-budget-retry>Retry save</button><button type="button" data-budget-open>Open report</button><button type="button" data-budget-review>Review in Data Check</button></div>'+
  '<p data-budget-save-error role="alert"></p><details><summary>View the copy saved on this device</summary><div data-budget-copy></div></details>',
  [{label:'Close',value:false}]);
 const root=document.querySelector('.ui-overlay108:last-child');root.querySelector('.ui-dialog108').classList.add('budget-dialog14313');
 const item={id,owner,client,root};current=item;
 const valid=()=>current===item&&liveProfile?.id===owner&&ojmDb===client;
 root.querySelector('[data-budget-retry]').onclick=async()=>{
  if(!valid())return;
  const error=root.querySelector('[data-budget-save-error]');error.textContent='';
  try{await localFirst14333.retryBudget(id);}catch(e){if(valid())error.textContent=e.message;}
  if(valid())render();
 };
 root.querySelector('[data-budget-open]').onclick=async()=>{
  if(!valid()||!localFirst14333.budgetSave(id)?.confirmed)return;
  root.resolve108(false);await window.budgetWorkflow14316.openAllocation(id);
 };
 root.querySelector('[data-budget-review]').onclick=()=>{
  if(!valid())return;
  const state=localFirst14333.budgetSave(id);root.resolve108(false);
  switchTab('transactions-closing14325');window.syncAssessment14332?.focus(state.job.id,d.budgetMonth290||String(d.date||'').slice(0,7));
 };
 pending.finally(()=>{if(current===item)current=null;});render();return true;
}
window.budgetSaveStatus472={open};
window.addEventListener('local-work14333',()=>{
 render();
 window.budgetWorkflow14316?.refreshSaveStatus?.();
});
window.addEventListener('online',render);window.addEventListener('offline',render);
})();