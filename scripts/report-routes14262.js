/* One destination for company ledger and trial balance reports. */
(()=>{'use strict';
const aliases={'sec-general-ledger':'report-open-gl','trial-balance':'report-open-tb','account-balances':'report-open-tb'};
window.normalizeReportTarget14262=id=>aliases[id]||id;
function copyLegacyFilters(){Object.assign(Reports79,{selectedMonths14331:null,allMonths14331:false,mode:Accounts69.mode,month:Accounts69.month,year:Accounts69.year,quarter:Accounts69.quarter,from:Accounts69.from,to:Accounts69.to,currency:Accounts69.currency||'',account:Accounts69.account||'',query:Accounts69.query||''})}
function ready(){const change=window.switchTab;window.switchTab=function(id,...args){if(aliases[id]){if(!canAccessAppTarget(aliases[id]))return showCenterStatus('This report is not enabled in your permissions.',true);copyLegacyFilters();id=aliases[id]}return change.call(this,id,...args)};const scroll=window.scrollToAccountModule;window.scrollToAccountModule=function(id,...args){if(aliases[id])return switchTab(id);return scroll.call(this,id,...args)}}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
