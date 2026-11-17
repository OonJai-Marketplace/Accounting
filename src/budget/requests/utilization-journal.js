/* The normal Post Transaction form and durable journal queue own posting and numbering. */
window.BudgetUtilizationJournal=(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 let prepared=null;
 function snapshot(){return prepared?.owner===liveProfile?.id?structuredClone(prepared):null;}
 function restore(value){
  prepared=value?.owner===liveProfile?.id?value:null;
  $('budgetJournalNotice')?.remove();
  if(!prepared)return;
  const notice=document.createElement('p');notice.id='budgetJournalNotice';
  notice.textContent='Budget utilization · '+prepared.period+'. Choose the debit and credit accounts for the summary, then review and post.';
  $('journalEntry98')?.prepend(notice);
 }
 async function lookup(id){
  const {data,error}=await ojmDb.rpc('budget_utilization_journal',{p_report:id});
  if(error)throw Error('The utilization journal reference could not be checked. '+error.message);
  return data?.entry_no?data:null;
 }
 function localJob(id){return window.journalDurable14385?.pending().find(j=>j.id.startsWith('budget-use:'+id+':'));}
 function reference(link){return link?link.entry_no+(link.status==='posted'?'':' ('+link.status+')'):'';}
 function amounts(data){
  const comparison=BudgetReport290.compare(data);
  const requested=[...new Set(data.lines.map(l=>l.currency))],currency=requested[0];
  if(requested.length===1&&comparison.totals[currency]?.used!=null)
   return [[currency,Math.round(comparison.totals[currency].used*100)/100]].filter(([,n])=>n>0);
  return [...BudgetReport290.balances(data)].map(([c,t])=>[c,Math.round(t.spend*100)/100]).filter(([,n])=>n>0);
 }
 function open(record){
  if(!access113.can('journal','post')||window.workspaceRequest138?.target)throw Error('Open your company journal with Post permission.');
  const d=record.data,used=amounts(d);
  if(!used.length)throw Error('Record actual spending and save the report first.');
  const same=snapshot();
  if(same?.id===record.id&&same.version===record.version){switchTab('journal');showJournalEntry98(true,false);return;}
  const busy=JournalModule.editingEntryId||pendingWorkspacePostJournalId||pendingWorkspacePostOwnerId||PeriodReview.pendingAdjustment||
   window.personalJournal1437?.active||window.payrollJournal1429?.snapshot()||$('jeGeneralMemo')?.value.trim()||$('journalDocumentRef')?.value.trim()||
   [...document.querySelectorAll('#jeLinesBody input:not(.je-line-date):not([data-line-rate291])')].some(n=>n.value.trim())||
   (window.entry1430?.mode==='single'&&entry1430.read().some(r=>r.source||r.affected||r.amount||r.memo));
  if(busy)throw Error('Save or reset the unfinished Post Transaction entry first.');
  const period=BudgetReport290.period(d);
  const receipts=[...new Set([d.receiptReference290,...d.movements.filter(m=>BudgetReport290.kind(m)==='receipt').map(m=>m.reference)].filter(Boolean))];
  const received=[...BudgetReport290.balances(d)].filter(([,v])=>v.receipt).map(([c,v])=>c+' '+formatAppNumber(v.receipt));
  switchTab('journal');showJournalEntry98(true,false);window.entry1430?.setMode('double');setJournalDateMode(false);
  $('jeTransDate').value=d.date;window.datePicker104?.refresh($('jeTransDate'));
  $('jeGeneralMemo').value=['Budget utilization · '+period,d.purpose,received.length?'Funding received · '+received.join(' + '):'',receipts.join(' / ')].filter(Boolean).join(' · ');
  const body=$('jeLinesBody');body.replaceChildren();
  const rates={};
  for(const [currency,n] of used){
   const amount=String(n),description='Fund used · '+period+' · '+currency+' '+formatAppNumber(n);
   const fx=BudgetReport290.reportRate(d,currency,'LAK');
   if(currency!=='LAK'&&fx)rates[currency]=fx;
   addJournalLineRow('',description,amount,{});
   addJournalLineRow('',description,'',{[currency]:amount});
  }
  window.JournalFX14383?.restore(rates);calculateJournalBalance();
  restore({owner:liveProfile.id,id:record.id,version:record.version,period,used});
  $('jeGeneralMemo').dispatchEvent(new Event('input',{bubbles:true}));window.drafts1427?.flush();
 }
 function postingKey(entries){
  const source=snapshot();if(!source)return null;
  if(entries.length!==1)throw Error('Post the utilization summary as one transaction.');
  const lines=entries[0].p_lines;
  if(lines.length!==2*source.used.length||source.used.some(([currency,amount])=>{
   const same=lines.filter(l=>l.currency_code===currency);
   return same.length!==2||!same.some(l=>l.debit===amount)||!same.some(l=>l.credit===amount)||same[0].account_id===same[1].account_id;
  }))throw Error('Choose two different accounts in each summary currency and keep the saved amount used.');
  return 'budget-use:'+source.id+':'+source.version;
 }
 return {open,amounts,lookup,localJob,reference,snapshot,restore,postingKey};
})();
