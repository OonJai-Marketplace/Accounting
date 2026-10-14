function staffForm(){
 const d=staffDraft14225(),double=d.mode==='double',r=A.rules(S.user),dir=d.single[0]?.direction||r.directions[0]||'out',can=A.canWriteStaff(S.user);
 const toggle='<div class="staff-controls14225"><button id="staffModeToggle" class="btn mode-toggle14225" type="button" '+action(toggleStaffMode14225)+' aria-label="Entry type: '+(double?'Double Entry':'Single Entry')+'. Tap to switch.">'+swap14225+(double?'Double Entry':'Single Entry')+'</button>'+
 (double?'<button class="btn add-staff14225" type="button" '+action(()=>{S.staffDraft=staffData();S.staffDraft.lines.push({});render()})+'>'+icon('plus')+'Add Line</button>':
 '<button id="staffDirectionToggle" class="btn direction-toggle14225 '+(dir==='out'?'out':'in')+'" type="button" '+action(()=>setDirection(dir==='out'?'in':'out'))+' '+(r.directions.length<2||d.unmapped14232?'disabled':'')+' aria-label="'+(dir==='out'?'Money Out':'Money In')+'. Tap to switch.">'+swap14225+(dir==='out'?'Money Out':'Money In')+'</button>')+'</div>';
 const common='<div class="grid staff-date14225">'+field('Date','staffDate','date',d.date)+field('Reference (optional)','staffReference','text',d.reference)+'</div>';
 const description=field('General Description','staffMemo','text',d.memo);
 return '<header class="staff-post-header14287"><h1>'+(S.editingStaff?'Edit Entry':'Post Entry')+'</h1><div class="staff-template-tools14285">'+button('Add Template',addTemplate14285,false,!can).replace('<button ','<button aria-label="Add Template" title="Add Template" ')+button('Templates',templates14285,false,!can)+'</div></header><p>Record a new transaction</p><fieldset class="staff-editor14225" '+(!can||busy?'disabled':'')+'>'+toggle+(double?common:'')+
 (d.unmapped14232?'<p role="status">Complete journal details retained. Switch to Double Entry to review and save.</p>':'')+(double?description+'<div id="staffDoubleLines">'+d.lines.map(staffDoubleLine14225).join('')+'</div><div id="staffDoubleTotals" class="staff-summary1425"></div><div id="staffBalance14225" class="staff-balance14225" role="status" aria-live="polite"></div>':
 '<input id="staffDirection" type="hidden" value="'+esc(dir)+'"><fieldset '+(d.unmapped14232?'disabled':'')+'><div id="staffSingleLines">'+d.single.map(staffLine14225).join('')+'</div>'+
 '<button class="btn staff-add-single14225" type="button" '+action(()=>{S.staffDraft=staffData();S.staffDraft.single.push({direction:dir,source:r.fundIds.length===1?r.fundIds[0]:'',affected:'',amount:'',memo:'',date:S.staffDraft.date});render()})+'>'+icon('plus')+'Add Line</button><div id="staffSummary1425" class="staff-summary1425"></div></fieldset>')+
 '<div class="actions">'+button('Clear',()=>{S.staffDraft=null;S.editingStaff=false;render()})+button('Post Entry',saveStaff,true,!can)+'</div></fieldset>';
}
function staffData(){
 const d=staffDraft14225(),next={...d,date:$('staffDate').value,reference:$('staffReference')?.value||d.reference||'',memo:$('staffMemo').value};
 if(d.mode==='double')next.lines=[...document.querySelectorAll('[data-staff-double]')].map(n=>{const i=n.dataset.staffDouble;return {account:$('staffAccount'+i).value,debit:$('staffDebit'+i).value,credit:$('staffCredit'+i).value,memo:$('staffDoubleMemo'+i).value}});
 else next.single=[...document.querySelectorAll('[data-staff-single]')].map(n=>{const i=Number(n.dataset.staffSingle),suffix=i?'_'+i:'';return {...d.single[i],source:$('staffFund'+suffix).value,affected:$('staffCategory'+suffix).value,amount:$('staffAmount'+suffix).value,date:$('staffDate'+suffix).value,memo:$('staffLineMemo'+suffix).value,reference:$('staffLineMemo'+suffix).value,description:next.memo}});
 return next;
}
function toggleStaffMode14225(){
 const d=staffData(),toDouble=d.mode!=='double';if(toDouble&&new Set(d.single.map(l=>l.date||d.date)).size>1){parent.showCenterStatus('These entries have different dates. Save them in Single Entry to keep every date.',true);return;}
 if(toDouble){if(d.unmapped14232){d.lines=d.retainedLines14232;delete d.unmapped14232;}else d.lines=d.single.flatMap(l=>[{account:l.direction==='in'?l.source:l.affected,debit:l.amount||'',credit:'',memo:l.memo||''},{account:l.direction==='in'?l.affected:l.source,debit:'',credit:l.amount||'',memo:l.memo||''}]);if(!d.lines.length)d.lines=[{},{}];d.lastSingle14232=structuredClone(d.single);d.doubleSignature14232=JSON.stringify(d.lines);}
 else{const rules=A.rules(S.user),pairs=[],lines=d.lines.slice();if(lines.length%2)lines.push({});let valid=true;for(let i=0;valid&&i<lines.length;i+=2){const parts=lines.slice(i,i+2),values=parts.some(l=>Number(l.debit)||Number(l.credit)),dr=parts.find(l=>Number(l.debit)>0&&!Number(l.credit))||(!values?parts[0]:null),cr=parts.find(l=>Number(l.credit)>0&&!Number(l.debit))||(!values?parts[1]:null),debit=dr||parts.find(l=>l!==cr),credit=cr||parts.find(l=>l!==dr);if(!debit||!credit||debit===credit||parts.some(l=>Number(l.debit)&&Number(l.credit))||(Number(debit.debit)&&Number(credit.credit)&&Number(debit.debit)!==Number(credit.credit))||(debit.memo&&credit.memo&&debit.memo!==credit.memo)){valid=false;break}const incoming=rules.directions.includes('in')&&(!debit.account||rules.fundIds.includes(debit.account))&&(!credit.account||rules.entryIds.includes(credit.account)),outgoing=rules.directions.includes('out')&&(!credit.account||rules.fundIds.includes(credit.account))&&(!debit.account||rules.entryIds.includes(debit.account));if(!incoming&&!outgoing){valid=false;break}const inc=incoming&&!outgoing;pairs.push({direction:inc?'in':'out',source:(inc?debit.account:credit.account)||'',affected:(inc?credit.account:debit.account)||'',amount:debit.debit||credit.credit||'',memo:debit.memo||credit.memo||''});}
 if(d.doubleSignature14232===JSON.stringify(d.lines)&&d.lastSingle14232)d.single=d.lastSingle14232;else if(valid)d.single=pairs;else{d.unmapped14232=true;d.retainedLines14232=structuredClone(d.lines);d.single=d.lines.map(l=>({source:l.debit?l.account:'',affected:l.credit?l.account:'',direction:l.debit?'in':'out',amount:l.debit||l.credit||'',memo:l.memo||''}));}}
 d.mode=toDouble?'double':'single';d.requestKey='phone-'+crypto.randomUUID();S.staffDraft=d;render();
}
function setDirection(dir){
 const r=A.rules(S.user);if(!r.directions.includes(dir)){parent.showCenterStatus('This direction is not enabled for this account.',true);return}
 const d=staffData();d.single=d.single.map(l=>({...l,direction:dir,affected:r.entryIds.includes(l.affected)?l.affected:r.entryIds.length===1?r.entryIds[0]:''}));d.requestKey='phone-'+crypto.randomUUID();S.staffDraft=d;render();
}
async function saveStaff(){
 if(busy)return;if(S.staffDraft?.unmapped14232){parent.showCenterStatus('The complete journal is retained. Switch to Double Entry to review and save it.',true);return;}
 const invalid=$('post').querySelector('.account-search1428:invalid');if(invalid){invalid.reportValidity();invalid.focus();return}
 const data=staffData(),owner=S.user,actor=A.profile().id,session=A.session(),navigation=workspaceOpen14238;
 try{A.validateStaff(owner,data)}catch(e){parent.showCenterStatus(e.message,true);return}
 S.staffDraft=data;persistPhoneDraft1427();busy=true;
 const controls=[...$('post').querySelectorAll('input,select,button')].map(n=>[n,n.disabled]);controls.forEach(([n])=>n.disabled=true);
 try{
  const result=await A.saveStaffEditor(owner,data);
  if(result?.saved||result?.queued){
   if(A.profile()?.id!==actor||A.session()!==session)return;
   if(result.queued)parent.showCenterStatus('Saved on this device. It will sync automatically when connected.');
   delete phoneDrafts1427.staff[owner];
   // A failed refresh after a confirmed save must not leave a resubmittable draft.
   if(S.user===owner&&S.staffDraft===data){S.staffDraft=null;S.editingStaff=false;S.month=data.date.slice(0,7);}persistPhoneDraft1427();busy=false;if(S.user===owner&&workspaceOpen14238===navigation)navigate('subusers','entries',false);
  }
 }catch(e){if(A.profile()?.id!==actor||A.session()!==session)return;parent.showCenterStatus('Saving was not confirmed. Your draft is kept; check Entries before retrying. '+e.message,true)}
 finally{busy=false;controls.forEach(([n,disabled])=>{if(n.isConnected)n.disabled=disabled});if(A.session()===session&&S.module==='subusers'&&S.page==='post')render()}
}
