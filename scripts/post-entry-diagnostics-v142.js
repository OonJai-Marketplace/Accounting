/* Version 142 focused repair: visible, exact Post Double Entry diagnostics. */
(function(){'use strict';
 const byId=id=>document.getElementById(id);
 const number=value=>{const clean=String(value??'').replaceAll(',','').trim();if(!clean)return 0;const n=Number(clean);return Number.isFinite(n)?n:NaN};
 const money=value=>typeof formatAppNumber==='function'?formatAppNumber(value):Number(value).toLocaleString(undefined,{maximumFractionDigits:2});
 function detailNode(){return null;}
 function diagnose(){
  const rows=[...document.querySelectorAll('#jeLinesBody tr')],problems=[];
  const general=(byId('jeGeneralMemo')?.value||'').trim();
  let used=0;
  rows.forEach((row,index)=>{
   const raw=(row.querySelector('.je-line-acc')?.value||'').trim(),drRaw=(row.querySelector('.je-line-dr')?.value||'').trim(),crInput=row.querySelector('.je-line-cr'),crRaw=(crInput?.value||'').trim();
   if(!raw&&!drRaw&&!crRaw)return;used++;
   const date=(byId('jeMultipleDates')?.checked?row.querySelector('.je-line-date')?.value:'')||byId('jeTransDate')?.value||'';
   const account=typeof getSelectedAccountInfo==='function'?getSelectedAccountInfo(raw):null,dr=number(drRaw),cr=number(crRaw);
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
  const differences=(state.differences||[]).map(d=>{const gap=Math.abs(Number(d.debit)-Number(d.credit)),side=Number(d.debit)>Number(d.credit)?'Credit':'Debit';return `${d.date} · ${d.currency}: add ${side} ${money(gap)} (DR ${money(d.debit)} / CR ${money(d.credit)}).`;});
  if(!used)return {valid:false,label:'Enter debit and credit',details:'Start with at least two posting lines: one Debit and one Credit.'};
  if(problems.length)return {valid:false,label:problems[0],details:[...problems,...differences].join('\n')};
  if(differences.length){const d=state.differences[0],gap=Math.abs(Number(d.debit)-Number(d.credit)),side=Number(d.debit)>Number(d.credit)?'CR':'DR';return {valid:false,label:`Add ${side} ${d.currency} ${money(gap)}`,details:differences.join('\n')};}
  const dates=Object.keys(state.grouped||{}).length;return {valid:true,label:'✓ Balanced',details:`Ready to post. Debit equals Credit${dates>1?` for all ${dates} dates`:''} in every currency.`};
 }
 function install(){
  if(!byId('jeBalanceIndicator')||window.postEntryDiagnostics142Installed)return;window.postEntryDiagnostics142Installed=true;
  const original=window.calculateJournalBalance;
  window.calculateJournalBalance=function(){try{original?.apply(this,arguments)}catch(_){}const result=diagnose(),badge=byId('jeBalanceIndicator'),post=byId('btnPostJournal'),details=detailNode();if(!badge)return;badge.hidden=false;badge.textContent=result.label;badge.title=result.details;badge.setAttribute('aria-label',`${result.label}. ${result.details}`);badge.className='je-status-badge '+(result.valid?'balanced':'unbalanced');if(post)post.disabled=!result.valid;if(details){details.textContent=result.details;details.classList.toggle('balanced',result.valid);}};
  const memo=byId('jeGeneralMemo');memo?.addEventListener('input',()=>window.calculateJournalBalance());
  window.calculateJournalBalance();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
