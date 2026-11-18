/* The normal Post Transaction form and durable journal queue own posting and numbering. */
window.BudgetUtilizationJournal=(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 let prepared=null;
 function snapshot(){return prepared?.owner===liveProfile?.id?structuredClone(prepared):null;}
 function restore(value){
  prepared=value?.owner===liveProfile?.id?value:null;
  $('budgetJournalNotice')?.remove();
  // Keep the prepared journal association without an instructional banner.
 }
 async function lookup(id){
  const {data,error}=await ojmDb.rpc('budget_utilization_journal',{p_report:id});
  if(error)throw Error('The utilization journal reference could not be checked. '+error.message);
  return data?.entry_no?data:null;
 }
 function localJob(id){return window.journalDurable14385?.pending().find(j=>j.id.startsWith('budget-use:'+id+':'));}
 function reference(link){return link?link.entry_no+(link.status==='posted'?'':' ('+link.status+')'):'';}
 async function view(id){
  const actor=liveProfile?.id,db=ojmDb;
  const check=()=>{if(!actor||liveProfile?.id!==actor||ojmDb!==db||!access113.can('journal','view')||window.workspaceRequest138?.target||window.personalJournal1437?.active)throw Error('Open your company journal with View permission.');};
  check();const link=await lookup(id);check();
  if(!link)throw Error('This report has no recorded utilization journal.');
  const {data:e,error}=await db.from('journal_entries').select('id,entry_no,transaction_date,memo,cash_slip_ref,status,journal_lines(line_no,line_date,description,currency_code,debit,credit,fx_rate_lak,book_rate_lak,accounts(id,name,code))').eq('entry_no',link.entry_no).maybeSingle();
  check();if(error)throw error;if(!e?.journal_lines?.length)throw Error('The linked journal could not be loaded.');
  const lines=[...e.journal_lines].sort((a,b)=>a.line_no-b.line_no).map(l=>({id:e.entry_no,dbEntryId:e.id,date:l.line_date||e.transaction_date,account:[l.accounts?.code,l.accounts?.name].filter(Boolean).join(' — '),currency:l.currency_code,memo:l.description||'',generalMemo:e.memo,cashSlipRef:e.cash_slip_ref,fx_rate_lak:l.fx_rate_lak,book_rate_lak:l.book_rate_lak,debit:Number(l.debit),credit:Number(l.credit),archived:(PeriodReview.periods[e.transaction_date.slice(0,7)]?.status||'open')!=='open'}));
  showJournalSource69(encodeURIComponent(e.entry_no),lines);
  document.getElementById('source69').style.zIndex='16000';
  if(e.status!=='posted')document.querySelector('#source69 h3').textContent='Journal Entry '+e.entry_no+' · '+e.status;
 }
 function amounts(data){
  const totals=[...BudgetReport290.balances(data)];
  if(totals.some(([,t])=>t.allocated===null))throw Error('Enter the missing funding equivalent before preparing the utilization journal.');
  return totals.map(([c,t])=>[c,Math.round((t.allocated||0)*100)/100]).filter(([,n])=>n>0);
 }
 function open(record,groups=BudgetSupportEquity.groups(record.data),journals=[]){
  if(!access113.can('journal','post')||window.workspaceRequest138?.target)throw Error('Open your company journal with Post permission.');
  const d=record.data;
  const support=BudgetSupportEquity.plan(d,groups,journals);
  const pairs=support.pairs;
  if(!pairs.length)throw Error('Record funding received or actual spending and save the report first.');
  const same=snapshot();
  if(same?.id===record.id&&same.version===record.version){switchTab('journal');showJournalEntry98(true,false);return;}
  const busy=JournalModule.editingEntryId||pendingWorkspacePostJournalId||pendingWorkspacePostOwnerId||PeriodReview.pendingAdjustment||
   window.personalJournal1437?.active||window.payrollJournal1429?.snapshot()||$('jeGeneralMemo')?.value.trim()||$('journalDocumentRef')?.value.trim()||
   [...document.querySelectorAll('#jeLinesBody input:not(.je-line-date):not([data-line-rate291])')].some(n=>n.value.trim())||
   (window.entry1430?.mode==='single'&&entry1430.read().some(r=>r.source||r.affected||r.amount||r.memo));
  if(busy)throw Error('Save or reset the unfinished Post Transaction entry first.');
  const period=BudgetReport290.period(d);
  const receipts=[...new Set([d.receiptReference290,...d.movements.filter(m=>BudgetReport290.kind(m)==='receipt').map(m=>m.reference)].filter(Boolean))];
  switchTab('journal');showJournalEntry98(true,false);window.entry1430?.setMode('double');setJournalDateMode(false);
  $('jeTransDate').value=d.date;window.datePicker104?.refresh($('jeTransDate'));
  $('jeGeneralMemo').value=['Budget utilization · '+period,d.purpose,'Owner support',receipts.join(' / ')].filter(Boolean).join(' · ');
  const body=$('jeLinesBody');body.replaceChildren();
  const rates={};
  for(const {label,currency,amount:n,debitCode,creditCode,rate,bookRate} of pairs){
   const amount=String(n),description=label+' · '+period+' · '+currency+' '+formatAppNumber(n);
   const fx=rate;
   if(currency!=='LAK'&&fx)rates[currency]=fx;
   for(const [i,code] of [debitCode,creditCode].entries()){
    addJournalLineRow(code||'',description,i===0?amount:'',i===1?{[currency]:amount}:{});
    if(rate){
     body.lastElementChild.dataset.fxRate14383=rate;
     body.lastElementChild.dataset.bookRate14383=bookRate||rate;
    }
   }
  }
  window.JournalFX14383?.restore(rates);calculateJournalBalance();
  restore({owner:liveProfile.id,id:record.id,version:record.version,period,pairs,fingerprint:support.fingerprint,templateVersion:2,notice:support.notice});
  $('jeGeneralMemo').dispatchEvent(new Event('input',{bubbles:true}));window.drafts1427?.flush();
 }
 function postingKey(entries){
  const source=snapshot();if(!source)return null;
  if(entries.length!==1)throw Error('Post the utilization summary as one transaction.');
  const lines=entries[0].p_lines;
  // Existing saved drafts have only the spending pairs from the previous release.
  const expected=source.pairs||source.used.map(([currency,amount])=>({currency,amount}));
  const valid=lines.length===2*expected.length&&expected.every((pair,i)=>{
   const entered=lines.slice(2*i,2*i+2);
   if(pair.roles)return BudgetSupportEquity.validate(pair,entered);
   return entered.every(l=>l.currency_code===pair.currency)&&entered[0].account_id!==entered[1].account_id&&
    entered.some(l=>l.debit===pair.amount&&!l.credit)&&entered.some(l=>l.credit===pair.amount&&!l.debit);
  });
  if(!valid)throw Error('Keep the prepared currency pairs balanced and use their corresponding equity accounts. Posted receipt reclassifications and verified exchange amounts/rates must stay unchanged.');
  if(source.templateVersion===2&&!/^[a-f0-9]{32}$/.test(source.fingerprint||''))throw Error('Reopen the saved report to verify its source journals before posting.');
  return 'budget-use:'+source.id+':'+source.version+(source.fingerprint?':'+source.fingerprint:'');
 }
 return {open,view,amounts,lookup,localJob,reference,snapshot,restore,postingKey};
})();
