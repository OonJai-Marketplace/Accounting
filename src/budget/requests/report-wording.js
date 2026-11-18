// Wording revisions apply to a single saved snapshot. All numeric fields come from that snapshot.
const BudgetReportWording=(()=>{
 const oldProtocol='Gross payroll includes employee deductions. Only the employer portion of PIT and social security adds to fund used. Cash balances use board disbursements in the original currencies.';
 const select='*,budget_report_wording(report_version,revision,notes,descriptions)';
 function data(record){
  const source=record.data,wording=record.budget_report_wording;
  if(!wording||wording.report_version!==record.version)return source;
  const d=structuredClone(source);
  if(source.mode==='utilization')d.printNotes290=wording.notes.trim()===oldProtocol?'':wording.notes;
  else d.notes=wording.notes;
  (d.movements||[]).forEach((m,i)=>{
   if(Object.hasOwn(wording.descriptions,i)){
    // Earlier reports used the original source and description to identify coverage.
    m.type290=BudgetReport290.kind(m);
    m.description290=wording.descriptions[i];
   }
  });
  if(d.document14316?.html){
   const template=document.createElement('template');
   template.innerHTML=documentWorkspace105.sanitize(d.document14316.html);
   const field=template.content.querySelector('[data-budget-field14316="notes"]');
   if(field){field.textContent=d.notes;d.document14316.html=template.innerHTML;}
  }
  return d;
 }
 function edit(record,dialog,check,onSave){
  const d=data(record),esc=s=>escapeHtml(String(s??''));
  const descriptions=(d.movements||[]).map((m,i)=>
   '<label>'+esc([BudgetReport290.labels[BudgetReport290.kind(m)],m.reference,m.destination290||m.account].filter(Boolean).join(' · '))+
   '<textarea rows="2" data-description="'+i+'">'+esc(m.description290)+'</textarea></label>').join('');
  const utilization=d.mode==='utilization';
  const {root}=dialog(utilization?'Additional information':'Edit report wording','<form><label>'+
   (utilization?'Additional information (optional, printed)':'Report notes')+'<textarea rows="4" name="notes">'+esc(utilization?d.printNotes290||'':d.notes)+'</textarea></label>'+
   (descriptions?'<details><summary>Movement descriptions</summary>'+descriptions+'</details>':'')+
   '<div role="status"></div><button type="submit">Save wording</button></form>');
  const form=root.querySelector('form'),status=form.querySelector('[role=status]');
  form.onsubmit=async e=>{
   e.preventDefault();const save=form.querySelector('button[type=submit]');if(save.disabled)return;
   save.disabled=true;status.textContent='Saving…';
   try{
    check();
    const changes={};
    for(const input of form.querySelectorAll('[data-description]')){
     const i=input.dataset.description;
     if(input.value!==(record.data.movements[i].description290||''))changes[i]=input.value;
    }
    const notes=form.elements.notes.value;
    const {data:revision,error}=await ojmDb.rpc('save_budget_report_wording',{
     p_report:record.id,p_version:record.version,p_revision:record.budget_report_wording?.revision||0,p_notes:notes,p_descriptions:changes
    });
    check();if(error)throw Error(error.message);if(!Number.isInteger(revision))throw Error('Wording save was not confirmed. Reopen the report.');
    const saved={...record,budget_report_wording:{report_version:record.version,revision,notes,descriptions:changes}};
    root.resolve108(true);onSave(saved);
   }catch(err){status.textContent=err.message;}finally{save.disabled=false;}
  };
 }
 return {select,data,edit};
})();
