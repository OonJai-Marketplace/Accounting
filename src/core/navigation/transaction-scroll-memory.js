// TRANSACTION SCROLL MEMORY — remember subsection positions only while the user
// remains inside Transactions. Leaving the module clears the saved positions.
const TransactionScrollMemory={positions:{},activeTab:'',activeModule:''};
function appWorkspaceScroller(){return document.getElementById('printableDocArea')||document.querySelector('.workspace-scroll')}
function moduleForTab(tabId){const target=document.getElementById(tabId);if(target?.dataset.module)return target.dataset.module;if(target?.closest('[data-module]')?.dataset.module)return target.closest('[data-module]').dataset.module;if(['journal','transactions-new','transactions-all','transactions-voided','transactions-recurring','period-review'].includes(tabId))return'transactions';return tabId.startsWith('sec-')?'accounts':''}
const switchTabBeforeScrollMemory=switchTab;
switchTab=function(tabId){
  const scroller=appWorkspaceScroller(),nextModule=moduleForTab(tabId),previousModule=TransactionScrollMemory.activeModule;
  if(previousModule==='transactions'&&TransactionScrollMemory.activeTab&&scroller)TransactionScrollMemory.positions[TransactionScrollMemory.activeTab]=scroller.scrollTop;
  if(previousModule==='transactions'&&nextModule!=='transactions')TransactionScrollMemory.positions={};
  switchTabBeforeScrollMemory(tabId);
  const stayingInsideTransactions=previousModule==='transactions'&&nextModule==='transactions';
  TransactionScrollMemory.activeTab=tabId;TransactionScrollMemory.activeModule=nextModule;
  requestAnimationFrame(()=>{const liveScroller=appWorkspaceScroller();if(liveScroller)liveScroller.scrollTop=stayingInsideTransactions?(TransactionScrollMemory.positions[tabId]||0):0});
};
const scrollToAccountModuleBeforeScrollMemory=scrollToAccountModule;
scrollToAccountModule=function(moduleId){
  if(TransactionScrollMemory.activeModule==='transactions')TransactionScrollMemory.positions={};
  TransactionScrollMemory.activeModule='accounts';TransactionScrollMemory.activeTab=moduleId;
  const scroller=appWorkspaceScroller();if(scroller)scroller.scrollTop=0;
  return scrollToAccountModuleBeforeScrollMemory(moduleId);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{const active=document.querySelector('.tab-content.active');TransactionScrollMemory.activeTab=active?.id||'';TransactionScrollMemory.activeModule=moduleForTab(TransactionScrollMemory.activeTab)},{once:true});

