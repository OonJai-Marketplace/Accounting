window.addEventListener('DOMContentLoaded',()=>{
 const panel=document.getElementById('employee-accounts'),gate=document.getElementById('loginGate');
 if(!panel)return;
 let owner=null,release,sequence=0;
 async function sync(){
   const id=panel.classList.contains('active')&&(!gate||gate.classList.contains('is-authenticated'))&&admin()?liveProfile.id:null;
   if(id===owner)return;
   owner=id;const turn=++sequence;release?.();release=null;panel.replaceChildren();
   if(!id)return;
   try{const module=await import('./employee-accounts.js?v=143.508');
     if(turn===sequence&&admin()&&liveProfile.id===id)release=module.openAccounts(panel);
   }catch{if(turn===sequence){owner=null;const retry=document.createElement('button');retry.textContent='Retry loading Employee Accounts';retry.onclick=sync;panel.replaceChildren(retry);}}
 }
 const observer=new MutationObserver(sync);
 observer.observe(panel,{attributes:true,attributeFilter:['class']});
 if(gate)observer.observe(gate,{attributes:true,attributeFilter:['class']});
 void sync();
});
window.hrWorkspace14306={saveAttendance,leaveApprovalData,prepareLeaveRequest,finishLeaveBatch,employeeHistory,renderEmployees,renderContracts,renderLeave,openContract,openLeave,documents,createDraft,contractTemplate};
window.addEventListener('DOMContentLoaded',()=>{window.archiveEmployee95=archive;const oldDay=window.payDay95;window.payDay95=function(...args){oldDay(...args);const f=document.querySelector('#payDay95 form');if(!f)return;const sync=()=>['amount','currency','reason'].forEach(name=>{f.elements[name].closest('label').hidden=!f.elements.override.checked});f.elements.override.addEventListener('change',sync);sync();};window.openCalendar99=()=>hrCalendar14306.workSchedule();const oldSave=window.saveWork82;window.saveWork82=async function(kind,data,record){if(kind==='leaves'&&!record)data=prepareLeaveRequest(data);if(kind==='runs'&&data.status==='finalized'){hrCalendar14306.guard(false);if(!data.calendarSnapshot14306)data={...data,calendarSnapshot14306:hrCalendar14306.snapshot()};}const saved=await oldSave(kind,data,record);if(kind==='leaves'&&!window.leaveBatchSaving82){leaveOpen=false;hrCalendar14306.changed()}return saved;};});
})();
