/* Explain the voided-journal purge at the exact audit-deletion confirmation. */
(()=>{'use strict';function install(){const owner=window.ui108;if(!owner||typeof owner.confirm!=='function'||owner.confirm.auditExplanation14260)return;const original=owner.confirm;function confirm(title,message,...rest){if(typeof message==='string'){
 message=message.replace('This removes audit history only; the underlying transactions and employee records stay in place.','When this removes the last audit record of a voided main-journal entry, that entry and its lines are permanently removed too. Posted entries and employee records remain.');
 if(title==='Delete ONE audit record'&&message.includes('All other audit records will remain.'))message=message.replace('All other audit records will remain.','If this is the last audit record of a voided main-journal entry, that entry and its lines are permanently removed. Other audit records remain.');
 }return original.call(this,title,message,...rest)}confirm.auditExplanation14260=true;owner.confirm=confirm}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
