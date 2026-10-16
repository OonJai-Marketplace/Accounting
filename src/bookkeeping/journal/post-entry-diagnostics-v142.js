/* Version 142 focused repair: visible, exact Post Double Entry diagnostics. */
(function(){'use strict';
 const byId=id=>document.getElementById(id);
 let touched=false;
 function started(){return touched||!!JournalModule.editingEntryId||!!byId('jeGeneralMemo')?.value.trim()||!!byId('jeVoucher14299')?.value||[...document.querySelectorAll('#jeLinesBody .je-line-acc,#jeLinesBody .je-line-dr,#jeLinesBody .je-line-cr,#jeLinesBody .je-line-memo')].some(n=>n.value.trim())}
 const number=(value,input)=>{const clean=String(value??'').trim();if(!clean)return 0;const n=input?.dataset.numeric88||input?.type==='number'?Number(clean):parseAppNumber(clean);return Number.isFinite(n)?n:NaN};
 const money=value=>typeof formatAppNumber==='function'?formatAppNumber(value):Number(value).toLocaleString(undefined,{maximumFractionDigits:2});
 function diagnose(){
  const rows=[...document.querySelectorAll('#jeLinesBody tr')],problems=[];
  const general=(byId('jeGeneralMemo')?.value||'').trim();
  let used=0;
  rows.forEach((row,index)=>{
   const raw=(row.querySelector('.je-line-acc')?.value||'').trim(),drRaw=(row.querySelector('.je-line-dr')?.value||'').trim(),crInput=row.querySelector('.je-line-cr'),crRaw=(crInput?.value||'').trim();
   if(!raw&&!drRaw&&!crRaw)return;used++;
   const date=(byId('jeMultipleDates')?.checked?row.querySelector('.je-line-date')?.value:'')||byId('jeTransDate')?.value||'';
   const account=typeof getSelectedAccountInfo==='function'?getSelectedAccountInfo(raw):null,dr=number(drRaw,row.querySelector('.je-line-dr')),cr=number(crRaw,crInput);
   if(!date)problems.push(`Row ${index+1}: select a transaction date.`);
   if(!raw)problems.push(`Row ${index+1}: select an account.`);else if(!account)problems.push(`Row ${index+1}: “${raw}” is not a valid Chart of Accounts account.`);
   if(Number.isNaN(dr)||dr<0)problems.push(`Row ${index+1}: Debit must be zero or a positive number.`);
   if(Number.isNaN(cr)||cr<0)problems.push(`Row ${index+1}: Credit must be zero or a positive number.`);
   if(Number.isFinite(dr)&&Number.isFinite(cr)){if(dr>0&&cr>0)problems.push(`Row ${index+1}: enter an amount in Debit or Credit—not both.`);else if(!(dr>0)&&!(cr>0))problems.push(`Row ${index+1}: enter a Debit or Credit amount.`);}
   if(account&&cr>0&&crInput?.dataset.currency&&crInput.dataset.currency!==account.currency)problems.push(`Row ${index+1}: ${account.name} requires ${account.currency}.`);
  });
  if(used&&!general)problems.unshift('Add the General Description / Memo.');
  let state={grouped:{},errors:[],differences:[]};try{state=getMultiDateJournalState()}catch(error){problems.push(error.message||'The entry could not be calculated.');}
  for(const message of state.errors||[])if(!problems.includes(message))problems.push(message);
  const differences=(state.differences||[]).map(d=>{const gap=Math.abs(Number(d.debit)-Number(d.credit)),side=Number(d.debit)>Number(d.credit)?'Credit':'Debit';return `${formatAppDate(d.date)} · ${d.currency}: add ${side} ${money(gap)} (DR ${money(d.debit)} / CR ${money(d.credit)}).`;});
  if(!used)return {valid:false,label:'Enter debit and credit',details:'Start with at least two posting lines: one Debit and one Credit.'};
  const gaps=(state.differences||[]).map(d=>`${Object.keys(state.grouped||{}).length>1?formatAppDate(d.date)+' · ':''}Add ${Number(d.debit)>Number(d.credit)?'CR':'DR'} ${d.currency} ${money(Math.abs(Number(d.debit)-Number(d.credit)))}`);
  if(problems.length||gaps.length)return {valid:false,label:[...(problems.length?[problems[0]]:[]),...gaps].join(' · '),details:[...problems,...differences].join('\n')};
  const dates=Object.keys(state.grouped||{}).length;return {valid:true,label:'✓ Balanced',details:`Ready to post. Debit equals Credit${dates>1?` for all ${dates} dates`:''} in every currency.`};
 }
 function install(){
  if(!byId('jeBalanceIndicator')||window.postEntryDiagnostics142Installed)return;window.postEntryDiagnostics142Installed=true;
  const original=window.calculateJournalBalance;
  window.calculateJournalBalance=function(){
   try{original?.apply(this,arguments)}catch(_){}
   const result=diagnose(),badge=byId('jeBalanceIndicator'),post=byId('btnPostJournal');if(!badge)return;
   badge.hidden=!started();badge.textContent=result.label;badge.title=result.details;badge.setAttribute('aria-label',`${result.label}. ${result.details}`);badge.className='je-status-badge '+(result.valid?'balanced':'unbalanced');if(post)post.disabled=!result.valid;
   window.JournalCalculation14391?.refresh();
  };
  const changed=event=>{if(event.target.closest('#journalEntry98,#journalRates14383')){touched=true;window.calculateJournalBalance()}};
  document.addEventListener('input',changed);document.addEventListener('change',changed);
  const reset=window.clearJournalEntry;window.clearJournalEntry=function(...args){touched=false;const result=reset.apply(this,args);touched=false;window.calculateJournalBalance();return result};
  window.calculateJournalBalance();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})()