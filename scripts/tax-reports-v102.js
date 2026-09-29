/* Tax and SSO read-only reports from finalized payroll and posted journal lines. */
(function(){
  'use strict';
  const views={
    'tax-overview':'Tax Overview','tax-vat':'VAT','tax-pit':'Personal Income Tax',
    'tax-social':'Social Security','tax-payment':'Tax and Social Payment',
    'tax-sso-payment':'SSO Payment','tax-records':'Tax and SSO Records'
  };
  const state={month:new Date().toISOString().slice(0,7),loading:false,error:'',exports:[]};
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=value=>Number(value||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const paidRuns=()=>((typeof Work82!=='undefined'&&Work82.runs)||[]).filter(record=>record.data?.status==='finalized'&&!record.data?.isSample&&record.data?.month===state.month);
  function payrollRows(){return paidRuns().flatMap(record=>(record.data.results||[]).map(row=>({
    date:record.data.finalizedAt?.slice(0,10)||state.month+'-01',reference:record.data.reference||record.id,
    employee:row.employee?.name||'Employee',currency:row.currency||row.employee?.currency||'LAK',
    ssoBase:Number(row.ssoBase||0),taxable:Number(row.taxable||0),
    employeePit:Number(row.employeePit||0),employerPit:Number(row.employerPit||0),
    employeeSso:Number(row.employeeSso||0),employerSso:Number(row.employerSso||0),
    runId:record.id
  })))}
  function groupOf(line){const name=String(line.account||'');if(/\b(?:VAT|value.added.tax)\b/i.test(name))return 'VAT';if(/\b(?:PITx?|personal.income.tax|withholding.tax|payroll.tax.bridge)\b/i.test(name))return 'PIT';if(/\b(?:SSO|social.security)\b/i.test(name))return 'SSO';return ''}
  function journalRows(){return ((typeof JournalModule!=='undefined'&&JournalModule.entries)||[]).filter(line=>String(line.date||'').slice(0,7)===state.month).map(line=>({...line,group:groupOf(line)})).filter(line=>line.group)}
  const total=(rows,key)=>rows.reduce((sum,row)=>sum+Number(row[key]||0),0);
  const id=()=>document.querySelector('.tab-content.active')?.id;
  function table(headers,rows){state.exports.push({headers,rows});return `<div class="tax-table-scroll102"><table class="je-table"><thead><tr>${headers.map(h=>`<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map(cell=>`<td>${escape(cell)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">No matching saved records for ${escape(state.month)}.</td></tr>`}</tbody></table></div>`}
  function card(title,content){return `<section class="module-card tax-card102"><div class="je-card-header"><h3>${escape(title)}</h3></div><div class="tax-card-body102">${content}</div></section>`}
  function journalTable(rows){return table(['Date','Entry #','Account','Memo','Currency','DR','CR','Source'],rows.map(line=>[line.date,line.id,line.account,line.memo,line.currency,number(line.debit),number(line.credit),line.group]))}
  function payrollTable(rows,kind){const pit=kind==='PIT';return table(['Employee','Payroll reference','Tax basis · LAK',`Employee ${kind} · LAK`,`Employer ${kind} · LAK`,`Total ${kind} · LAK`],rows.map(row=>[row.employee,row.reference,number(pit?row.taxable:row.ssoBase),number(pit?row.employeePit:row.employeeSso),number(pit?row.employerPit:row.employerSso),number(pit?row.employeePit+row.employerPit:row.employeeSso+row.employerSso)]))}
  function totals(rows,key){const labels={employeePit:'Employee PIT',employerPit:'Employer PIT',employeeSso:'Employee SSO',employerSso:'Employer SSO'};const sum=total(rows,key);return `<div class="tax-total102"><span>${escape(labels[key]||key)}</span><strong>₭ ${number(sum)}</strong></div>`}
  function render(){const active=id();if(!views[active])return;const host=document.getElementById(active);if(!host)return;if(typeof liveProfile==='undefined'||liveProfile?.role!=='admin'){host.innerHTML=card(views[active],'<p>Administrator access is required for tax and payroll records.</p>');return}
    state.exports=[];
    const payroll=payrollRows(),journal=journalRows();let content='';
    if(active==='tax-overview'){
      content=card('Monthly totals from finalized payroll',`<div class="tax-metrics102">${totals(payroll,'employeePit')}${totals(payroll,'employerPit')}${totals(payroll,'employeeSso')}${totals(payroll,'employerSso')}</div>`+table(['Payroll reference','Employee','PIT employee · LAK','PIT employer · LAK','SSO employee · LAK','SSO employer · LAK'],payroll.map(r=>[r.reference,r.employee,number(r.employeePit),number(r.employerPit),number(r.employeeSso),number(r.employerSso)])))+
        card('VAT journal account activity',journalTable(journal.filter(r=>r.group==='VAT')));
    }else if(active==='tax-vat'){
      content=card('VAT · posted journal activity',journalTable(journal.filter(r=>r.group==='VAT')));
    }else if(active==='tax-pit'||active==='tax-social'){
      const kind=active==='tax-pit'?'PIT':'SSO',employee=kind==='PIT'?'employeePit':'employeeSso',employer=kind==='PIT'?'employerPit':'employerSso';
      content=card(kind+' · finalized payroll',`<div class="tax-metrics102">${totals(payroll,employee)}${totals(payroll,employer)}</div>`+payrollTable(payroll,kind))+
        card(kind+' · posted journal activity',journalTable(journal.filter(r=>r.group===kind)));
    }else if(active==='tax-payment'||active==='tax-sso-payment'){
      const related=journal.filter(r=>active==='tax-payment'||r.group==='SSO');
      const rows=related.filter(r=>r.debit>0&&/\b(?:payable|liabilit(?:y|ies)|due)\b/i.test(String(r.account||'')));
      content=card('Potential settlements · journal debit lines',journalTable(rows))+
        card('Other related journal activity',journalTable(related.filter(r=>!rows.includes(r))));
    }else{
      content=card('Finalized payroll snapshots',table(['Month','Reference','Finalized','Employees','PIT · LAK','SSO · LAK'],paidRuns().map(record=>[record.data.month,record.data.reference,record.data.finalizedAt?.slice(0,10)||'—',record.data.results?.length||0,number(total(record.data.results||[],'pit')),number((record.data.results||[]).reduce((sum,r)=>sum+Number(r.employeeSso||0)+Number(r.employerSso||0),0))])))+
        card('Posted tax and SSO journal lines',journalTable(journal));
    }
    host.innerHTML=`<div class="tax-report102"><div class="tax-toolbar102"><label for="taxMonth102">Month <input id="taxMonth102" type="month" value="${escape(state.month)}"></label><button type="button" class="je-btn je-btn-secondary" id="taxRefresh102">Refresh</button><button type="button" class="je-btn je-btn-secondary" id="taxCsv102">Export CSV</button><button type="button" class="je-btn je-btn-secondary" id="taxPrint102">Print</button></div>${state.error?`<p class="tax-error102">${escape(state.error)}</p>`:''}${state.loading?'<p class="tax-note102">Loading saved records…</p>':''}${content}</div>`;
    host.querySelector('#taxMonth102').onchange=event=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)){state.month=event.target.value;render()}};
    host.querySelector('#taxRefresh102').onclick=()=>refresh(true);
    host.querySelector('#taxCsv102').onclick=downloadCsv;
    host.querySelector('#taxPrint102').onclick=()=>window.print();
  }
  function downloadCsv(){if(!state.exports.some(block=>block.rows.length))return window.showCenterStatus?.('No current table rows to export.',true);const lines=state.exports.flatMap((block,index)=>[...(index?[[]]:[]),block.headers,...block.rows]);const csv=lines.map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=id()+'-'+state.month+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  async function refresh(force){if(state.loading)return;state.loading=true;state.error='';render();try{if(typeof ojmDb!=='undefined'&&ojmDb){await window.loadWork82?.(Boolean(force));if(typeof Work82!=='undefined'&&Work82.error)state.error=Work82.error;if(force)await window.loadJournalFromSupabase?.()}}catch(error){state.error='Some records could not be loaded: '+(error.message||error)}finally{state.loading=false;render()}}
  const previous=window.switchTab;
  window.switchTab=function(target,...args){const result=previous.call(this,target,...args);if(views[target]){render();refresh(false)}return result};
  window.taxReports102={render,refresh,groupOf,payrollRows,journalRows};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(views[id()])refresh(false)},{once:true});else if(views[id()])refresh(false);
})();
