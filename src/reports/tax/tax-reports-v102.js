/* Tax and SSO read-only reports from finalized payroll and posted journal lines. */
(function(){
  'use strict';
  const views={
    'tax-overview':'Monthly Statutory','tax-vat':'VAT','tax-pit':'Personal Income Tax',
    'tax-social':'Social Security','tax-payment':'Tax and Social Payment',
    'tax-sso-payment':'SSO Payment','tax-records':'Tax and SSO Records'
  };
  let refreshRequest14370=0;const state={month:appLocalDate().slice(0,7),loading:false,error:'',exports:[],monthChosen:false};
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=value=>formatAppNumber(Number(value||0));
  const paidRuns=()=>((typeof Work82!=='undefined'&&Work82.runs)||[]).filter(record=>record.data?.status==='finalized'&&!record.data?.isSample&&record.data?.month===state.month);
  function payrollRows(){return paidRuns().flatMap(record=>[...(record.data.results||[])].sort(employeeOrder82).map(row=>({
    date:record.data.finalizedAt?.slice(0,10)||state.month+'-01',reference:record.data.reference||record.id,
    employee:row.employee?.name||'Employee',currency:row.currency||row.employee?.currency||'LAK',
    ssoBase:Number(row.ssoBase||0),taxable:Number(row.taxable||0),
    employeePit:Number(row.employeePit||0),employerPit:Number(row.employerPit||0),
    employeeSso:Number(row.employeeSso||0),employerSso:Number(row.employerSso||0),
    runId:record.id
  })))}
  function groupOf(line){const name=String(line.account||'');if(/\bprofit.tax\b/i.test(name))return 'Profit Tax';if(/\b(?:VAT|value.added.tax)\b/i.test(name))return 'VAT';if(/\b(?:PITx?|personal.income.tax|withholding.tax|payroll.tax.bridge)\b/i.test(name))return 'PIT';if(/\b(?:SSO|social.security)\b/i.test(name))return 'SSO';return ''}
  const postedLines=()=>((typeof JournalModule!=='undefined'&&JournalModule.entries)||[]).filter(line=>!line.pendingSync&&!line.local14333&&!line.voided_at&&(!line.status||line.status==='posted'));
  function journalRows(){return postedLines().filter(line=>String(line.date||'').slice(0,7)===state.month).map(line=>({...line,group:groupOf(line)})).filter(line=>line.group)}
  function statutoryBalances(){
    const accounts=typeof AccountingStore!=='undefined'?AccountingStore.accounts||[]:[],groups=new Map(),balances=new Map(),start=state.month+'-01',year=state.month.slice(0,4)+'-01-01';
    const cents=v=>Math.round(Number(v||0)*100);
    for(const line of postedLines()){
      const date=String(line.date||'').slice(0,10);if(date<year||date.slice(0,7)>state.month)continue;
      const a=accounts.find(a=>line.accountId&&a.id===line.accountId||line.accountCode&&a.code===line.accountCode||a.name===line.account&&a.currency===line.currency);
      if(a?.isTechnical)continue;
      const group=groupOf({...line,account:a?.name||line.account});if(!group)continue;
      const currency=line.currency||a?.currency||'Unknown',key=group+'|'+currency;
      if(!groups.has(key))groups.set(key,{group,currency,opening:0,credits:0,reductions:0,expense:0,due:0,advance:0});
      const g=groups.get(key),type=String(a?.baseType||a?.type||'').toUpperCase(),payable=type==='LIABILITY'||(!a&&/\b(?:payable|liabilit(?:y|ies)|due)\b/i.test(line.account||'')),dr=cents(line.debit),cr=cents(line.credit);
      if(payable){const accountKey=key+'|'+(a?.id||line.accountId||line.accountCode||line.account);balances.set(accountKey,{key,net:(balances.get(accountKey)?.net||0)+cr-dr});if(date<start)g.opening+=cr-dr;else{g.credits+=cr;g.reductions+=dr}}
      else if(date>=start&&(type==='EXPENSE'||(!a&&/expense/i.test(line.account||''))))g.expense+=dr-cr;
    }
    for(const {key,net} of balances.values()){const g=groups.get(key);g.due+=Math.max(0,net);g.advance+=Math.max(0,-net)}
    return [...groups.values()].sort((a,b)=>a.currency.localeCompare(b.currency)||a.group.localeCompare(b.group));
  }
  function balanceSummary(active){
    const kind=({'tax-vat':'VAT','tax-pit':'PIT','tax-social':'SSO','tax-sso-payment':'SSO'})[active],rows=statutoryBalances().filter(r=>!kind||r.group===kind),currencies=[...new Set(rows.map(r=>r.currency))];
    const money=n=>number(n/100),headers=['Tax','Currency','Opening payable','Added to payable','Settlements / reductions','Still payable','Debit balance / advance','Direct expense'];
    const values=rows.map(r=>[r.group,r.currency,...['opening','credits','reductions','due','advance','expense'].map(k=>money(r[k]))]);
    for(const currency of currencies){const group=rows.filter(r=>r.currency===currency);values.push(['TOTAL',currency,...['opening','credits','reductions','due','advance','expense'].map(k=>money(group.reduce((n,r)=>n+r[k],0)))])}
    return card('Recorded amount still payable',`<div class="tax-metrics102">${currencies.map(currency=>`<div class="tax-total102"><span>Total still payable · ${escape(currency)}</span><strong>${money(rows.filter(r=>r.currency===currency).reduce((n,r)=>n+r.due,0))}</strong></div>`).join('')}</div>`+table(headers,values)+`<p class="tax-note102">Opening payable + additions − settlements/reductions gives the closing liability. Positive balances are still payable; debit balances are shown separately. Direct expenses are not added again to the unpaid total. This summary uses posted tax liability accounts through the selected month, including this year's opening balances; it does not calculate unrecorded tax. Payroll snapshots below are supporting detail and are not added twice.</p>`);
  }

  const total=(rows,key)=>rows.reduce((sum,row)=>sum+Number(row[key]||0),0);
  const id=()=>document.querySelector('.tab-content.active')?.id;
  function table(headers,rows,exportRows=rows){state.exports.push({headers,rows:exportRows});return `<div class="tax-table-scroll102"><table class="je-table"><thead><tr>${headers.map(h=>`<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map(cell=>`<td>${escape(cell)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">No matching saved records for ${escape(state.month)}. Use Filter to choose the month of your journal entries.</td></tr>`}</tbody></table></div>`}
  function card(title,content){return `<section class="module-card tax-card102"><div class="je-card-header"><h3>${escape(title)}</h3></div><div class="tax-card-body102">${content}</div></section>`}
  function journalTable(rows){const raw=rows.map(line=>[line.date,line.id,line.account,line.memo,line.currency,number(line.debit),number(line.credit),line.group]);for(const currency of [...new Set(rows.map(r=>r.currency))]){const group=rows.filter(r=>r.currency===currency);raw.push(['','TOTAL','','',currency,number(total(group,'debit')),number(total(group,'credit')),''])}return table(['Date','Entry #','Account','Memo','Currency','DR','CR','Source'],raw.map(([date,...cells])=>[date?formatAppDate(date):'',...cells]),raw)}
  function payrollTable(rows,kind){const pit=kind==='PIT';return table(['Employee','Payroll reference','Tax basis · LAK',`Employee ${kind} · LAK`,`Employer ${kind} · LAK`,`Total ${kind} · LAK`],rows.map(row=>[row.employee,row.reference,number(pit?row.taxable:row.ssoBase),number(pit?row.employeePit:row.employeeSso),number(pit?row.employerPit:row.employerSso),number(pit?row.employeePit+row.employerPit:row.employeeSso+row.employerSso)]))}
  function totals(rows,key){const labels={employeePit:'Employee PIT',employerPit:'Employer PIT',employeeSso:'Employee SSO',employerSso:'Employer SSO'};const sum=total(rows,key);return `<div class="tax-total102"><span>${escape(labels[key]||key)}</span><strong>₭ ${number(sum)}</strong></div>`}
  function render(){const active=id();if(!views[active])return;const host=document.getElementById(active);if(!host)return;if(typeof liveProfile==='undefined'||liveProfile?.role!=='admin'){host.innerHTML=card(views[active],'<p>Administrator access is required for tax and payroll records.</p>');return}
    if(!state.monthChosen){const months=((typeof JournalModule!=='undefined'&&JournalModule.entries)||[]).filter(l=>!l.pendingSync&&!l.local14333&&!l.voided_at&&(!l.status||l.status==='posted')).map(l=>String(l.date||'').slice(0,7)).filter(m=>/^\d{4}-\d{2}$/.test(m)).sort();if(months.length)state.month=months.at(-1)}
    state.exports=[];
    const payroll=payrollRows(),journal=journalRows();let content='';
    if(active==='tax-overview'){
      content=card('Monthly statutory summary',`<p>One monthly working report from finalized payroll and posted journal activity. Review source records before filing.</p><div class="tax-metrics102">${totals(payroll,'employeePit')}${totals(payroll,'employerPit')}${totals(payroll,'employeeSso')}${totals(payroll,'employerSso')}</div>`+table(['Payroll reference','Employee','PIT employee · LAK','PIT employer · LAK','SSO employee · LAK','SSO employer · LAK'],payroll.map(r=>[r.reference,r.employee,number(r.employeePit),number(r.employerPit),number(r.employeeSso),number(r.employerSso)])))+
        card('VAT · posted journal activity',journalTable(journal.filter(r=>r.group==='VAT')))+
        card('Profit tax · posted journal activity',journalTable(journal.filter(r=>r.group==='Profit Tax')))+
        card('Income tax · posted journal activity',journalTable(journal.filter(r=>r.group==='PIT')))+
        card('Social security · posted journal activity',journalTable(journal.filter(r=>r.group==='SSO')));
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
      content=card('Finalized payroll snapshots',table(['Month','Reference','Finalized','Employees','PIT · LAK','SSO · LAK'],paidRuns().map(record=>[record.data.month,record.data.reference,record.data.finalizedAt?.slice(0,10)||'—',record.data.results?.length||0,number((record.data.results||[]).reduce((sum,r)=>sum+Number(r.employeePit||0)+Number(r.employerPit||0),0)),number((record.data.results||[]).reduce((sum,r)=>sum+Number(r.employeeSso||0)+Number(r.employerSso||0),0))])))+
        card('Posted tax and SSO journal lines',journalTable(journal));
    }
    content=balanceSummary(active)+content;
    let report=host.querySelector(':scope>.tax-report102');
    if(!report){for(const child of [...host.children])if(!child.classList.contains('area-banner113'))child.remove();report=document.createElement('div');report.className='tax-report102';report.innerHTML=`<div class="tax-toolbar102"><strong data-tax-period143154></strong><button type="button" class="je-btn je-btn-secondary" id="taxFilter143153" aria-expanded="false" aria-controls="taxFilters143153-${active}">Filter</button><button type="button" class="je-btn je-btn-secondary" id="taxRefresh102">Refresh</button><button type="button" class="je-btn je-btn-secondary" id="taxCsv102">Export CSV</button><button type="button" class="je-btn je-btn-secondary" id="taxPrint102">Print</button></div><div id="taxFilters143153-${active}" class="tax-filters143153 no-print" hidden><label for="taxMonth102">Month <input id="taxMonth102" type="month" value="${escape(state.month)}"></label></div><p class="tax-error102" hidden role="status"></p><p class="tax-note102" hidden role="status">Loading saved records…</p><div class="tax-content102"></div>`;host.append(report);
      report.querySelector('#taxFilter143153').onclick=event=>{const filters=report.querySelector('.tax-filters143153');filters.hidden=!filters.hidden;event.currentTarget.setAttribute('aria-expanded',String(!filters.hidden));};
      report.querySelector('#taxMonth102').onchange=event=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)){state.month=event.target.value;state.monthChosen=true;refresh(false)}};
      report.querySelector('#taxRefresh102').onclick=()=>refresh(true);
      report.querySelector('#taxCsv102').onclick=downloadCsv;
      report.querySelector('#taxPrint102').onclick=()=>window.print();
    }
    report.querySelector('[data-tax-period143154]').textContent='Reporting month: '+state.month;
    const body=report.querySelector('.tax-content102');if(body._content102!==content){body._content102=content;body.innerHTML=content}
    const error=report.querySelector('.tax-error102');error.hidden=!state.error;if(error.textContent!==state.error)error.textContent=state.error;
    report.querySelector('.tax-note102').hidden=!state.loading;
    report.querySelector('#taxRefresh102').disabled=state.loading;
    const month=report.querySelector('#taxMonth102');if(month.value!==state.month)month.value=state.month;

  }
  function downloadCsv(){render();if(liveProfile?.role!=='admin')return;if(!state.exports.some(block=>block.rows.length))return window.showCenterStatus?.('No current table rows to export.',true);const lines=state.exports.flatMap((block,index)=>[...(index?[[]]:[]),block.headers,...block.rows]);const csv=lines.map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=id()+'-'+state.month+'.csv';Promise.resolve(window.exportCenter14337?exportCenter14337.fromLink(link):link.click()).finally(()=>setTimeout(()=>URL.revokeObjectURL(url),60000)).catch(()=>{})}
  async function refresh(force){const actor=liveProfile?.id,db=ojmDb,month=state.month,request=++refreshRequest14370,current=()=>liveProfile?.id===actor&&ojmDb===db&&request===refreshRequest14370&&state.month===month;state.loading=true;state.error='';render();try{if(typeof ojmDb!=='undefined'&&ojmDb){await window.yearWindow14333?.ensure(month+'-01',month+'-01');if(!current())return;await window.loadWork82?.(Boolean(force));if(!current())return;if(typeof Work82!=='undefined'&&Work82.error)state.error=Work82.error;if(force)await window.loadJournalFromSupabase?.()}}catch(error){if(current())state.error='Some records could not be loaded: '+(error.message||error)}finally{if(request===refreshRequest14370)state.loading=false;if(current())render()}}
  const previous=window.switchTab;
  window.switchTab=function(target,...args){const result=previous.call(this,target,...args);if(views[target]&&!window.workspaceViews14364?.reuseView(target)){render();if(!window.startup14257?.isPrepared('payroll'))refresh(false)}return result};
  window.taxReports102={render,refresh,groupOf,payrollRows,journalRows,statutoryBalances};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(views[id()])refresh(false)},{once:true});else if(views[id()])refresh(false);
})()