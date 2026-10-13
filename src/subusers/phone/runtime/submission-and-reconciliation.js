  async function chooseReconciliation14345(batch){const c=await rpc('submission_context14345',{p_journal:batch.id});return new Promise(resolve=>{const dialog=$('dialog');dialog.close();$('dialogBody').innerHTML='<h2>Confirm remaining funds</h2>'+submissionReconciliation14345.fields(c);$('dialogButtons').innerHTML='<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="yes" disabled>Submit</button>';submissionReconciliation14345.bind($('dialogBody'),$('dialogButtons').querySelector('[value=yes]'));dialog.onclose=()=>{if(dialog.returnValue!=='yes'){resolve(false);return;}try{resolve({context:c,actuals:submissionReconciliation14345.answers($('dialogBody'))})}catch(e){notice(e.message,true);resolve(false)}};dialog.returnValue='cancel';dialog.showModal()})}
  async function submit(){if(S.submitting)return;S.submitting=true;render(S.page!=='post');try{return await submitPeriod();}finally{S.submitting=false;render(S.page!=='post');}}
  async function submitPeriod(){
    if(!permission('sub-users-workspace','edit')){notice('Submission is not enabled for this account.',true);return;}
    if(queue().length||S.syncing||S.saving||draftFilled()){notice('Save or clear your current draft, then sync all device entries before submitting.',true);return;}
    if(!navigator.onLine){notice('Reconnect before submitting. Your entries remain saved on this device.',true);return;}
    const owner=S.owner,epoch=S.epoch,month=S.month;await refresh();if(!current(owner,epoch)||!S.online||S.month!==month)return;
    const candidates=monthHeaders().filter(j=>editable14348(j)&&lines().some(l=>l.staff_journal_id===j.id));
    if(!candidates.length){notice('There are no saved entries ready to submit in this period.');return;}
    const available=(await http('report_types14253',{select:'id,name,active',active:'eq.true',order:'name.asc'})).data||[];
    if(!available.length){notice('Ask the administrator to add an active report type.',true);return;}
    const chosen=await chooseReportTypes14294(available,month);if(!chosen)return;
    if(!current(owner,epoch)||S.month!==month||draftFilled())return;
    const alreadyPending=await record(owner);if((alreadyPending.queue||[]).length){notice('Another tab has pending entries. Sync them before submitting.',true);return;}
    try{
      await access();
      for(const batch of candidates){
        const review=await chooseReconciliation14345(batch);if(!review||!current(owner,epoch))return;
        S.data=await persist(owner,{pendingSubmit:{id:batch.id,month,createdAt:Date.now()}});
        const result=await rpc('submit_reconciled14345',{p_journal:batch.id,p_types:chosen,p_as_of:review.context.asOf,p_fingerprint:review.context.fingerprint,p_actuals:review.actuals});if(result?.status!=='submitted')throw Error('Submission was not confirmed.');
        reopened14348.delete(correctionKey14348(batch));notice('Submitted for review.');
        const stored=await record(owner,old=>({...old,headers:(old.headers||[]).map(j=>j.id===batch.id?{...j,...result}:j),pendingSubmit:null}));if(!current(owner,epoch))return;S.data=stored;
      }
      notice('Submitted for review.');render();void refresh();
    }catch(e){if(!current(owner,epoch))return;if(denied(e))await revoke(e);else{if(!ambiguous(e))S.data=await persist(owner,{pendingSubmit:null});notice('Submission was not confirmed. Refresh to check its status before retrying. '+e.message,true);render();}}
  }
