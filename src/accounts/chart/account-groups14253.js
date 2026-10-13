/* Shared display classification; never widens account permissions. */
(()=>{'use strict';
const groups=[['DRAWING','Drawings','↗'],['EXPENSE','Expenses','▤'],['ASSET','Assets','▣'],['LIABILITY','Liabilities','≋'],['EQUITY','Equity','◈'],['REVENUE','Revenue','↙'],['SYSTEM','System','⚙']];
function type(a){if(!a)return '';if(a.isTechnical||a.is_technical||a.type==='SYSTEM'||a.purpose&&a.purpose!=='regular'||a.account_purpose&&a.account_purpose!=='regular')return 'SYSTEM';const t=String(a.type||a.account_type||a.baseType||'').toUpperCase();if(t==='EQUITY'&&/\b(drawings?|withdrawals?)\b/i.test(a.name||''))return 'DRAWING';return t==='DRAWINGS'?'DRAWING':t;}
function find(value){return (AccountingStore.accounts||[]).find(a=>[a.id,a.code,a.code+' — '+a.name].some(v=>String(v)===String(value)));}
window.AccountGroups14253={groups,type,find};
})();
