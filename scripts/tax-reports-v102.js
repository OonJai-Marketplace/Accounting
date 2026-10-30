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
})();
/* Profit tax calculation */
/* Profit-tax working calculations. Saved documents never post or pay the ledger. */
(()=>{'use strict';
const S={owner:'',client:null,year:Number(appLocalDate().slice(0,4)),period:'H1',record:null,data:null,busy:false,error:'',request:0};
const names={H1:'First half',H2:'Second half',FY:'Full year'},esc=v=>escapeHtml(String(v??'')),money=v=>formatAppNumber(v),round=v=>Math.round((v+Number.EPSILON)*100)/100;
const active=()=>document.querySelector('.tab-content.active')?.id==='tax-profit';
function guard(action='view'){if(!liveProfile||liveProfile.role!=='admin'||!ojmDb||!access113.can('tax-profit',action))throw Error('Administrator profit-tax access is required.');}
function range(year,period){if(!Number.isInteger(Number(year))||year<1900||year>9999||!names[period])throw Error('Choose a valid tax year and period.');return {from:year+(period==='H2'?'-07-01':'-01-01'),to:year+(period==='H1'?'-06-30':'-12-31')};}
function identifier(year,period){range(year,period);return '14319900-0000-4000-8000-'+String(year).padStart(4,'0')+'000000'+({H1:'01',H2:'02',FY:'03'})[period];}
function calculate(data){
 const num=(key,negative=false)=>{const v=data[key];if(v===''||v===null||v===undefined)throw Error(key==='rate'?'Enter the applicable profit-tax rate.':'Enter '+key+'.');const n=Number(v);if(!Number.isFinite(n)||(!negative&&n<0)||Math.abs(n)>1e15)throw Error('Enter a valid '+key+'.');return n;};
 const profit=num('profit',true),additions=num('additions'),deductions=num('deductions'),rate=num('rate'),payments=num('payments'),credits=num('credits');if(rate>100)throw Error('Tax rate must be between 0 and 100%.');
 const adjustedProfit=round(profit+additions-deductions),taxable=Math.max(0,adjustedProfit),tax=round(taxable*rate/100),net=round(tax-payments-credits);
 return {adjustedProfit,taxable,tax,due:Math.max(0,net),excess:Math.max(0,-net)};
}
function blank(){return {year:S.year,period:S.period,...range(S.year,S.period),profit:0,additions:0,deductions:0,rate:ApplicationSettings.tax?.profitTaxRate??'',payments:0,credits:0,reference:'',basis:'manual',ledger:null};}
function scope(){const actor=liveProfile?.id,db=ojmDb;if(S.owner!==actor||S.client!==db){S.owner=actor;S.client=db;S.record=null;S.data=null;S.busy=false;S.error='';S.request++;}return ()=>liveProfile?.id===actor&&ojmDb===db;}
function values(){const form=document.querySelector('#profitTaxForm199');if(!form||!S.data)return;for(const key of ['profit','additions','deductions','rate','payments','credits'])S.data[key]=form.elements[key].value===''?'':parseAppNumber(form.elements[key].value);S.data.reference=form.elements.reference.value.trim();if(S.data.ledger&&S.data.profit!==S.data.ledger.profit)S.data.basis='manual';}
function rows(d){const c=calculate(d);return [['Profit / (loss)',d.profit],['Add back non-deductible amounts',d.additions],['Deduct exempt income / allowed adjustments',d.deductions],['Adjusted profit / (loss)',c.adjustedProfit],['Taxable profit',c.taxable],['Tax rate (%)',d.rate],['Calculated profit tax',c.tax],['Prior payments applied to this period',d.payments],['Other tax credits',d.credits],['Payment due',c.due],['Excess payments / credits',c.excess]];}
function html(d){return '<h1>Profit Tax Calculation</h1><p>'+esc(names[d.period]+' '+d.year)+' · '+esc(formatAppDate(d.from))+' – '+esc(formatAppDate(d.to))+'</p>'+reports14254.table(['Calculation','LAK / %'],rows(d).map(([label,n])=>[label,money(n)]),[70,30],{numeric:[1]})+(d.reference?'<p>Reference: '+esc(d.reference)+'</p>':'');}
function result(){const host=document.querySelector('#profitTaxResult199');if(!host||!S.data)return;try{const c=calculate(S.data);host.innerHTML='<div class="tax-metrics102">'+[['Taxable profit',c.taxable],['Calculated profit tax',c.tax],['Payment due',c.due],['Excess payments / credits',c.excess]].map(([label,n])=>'<div class="tax-total102"><span>'+esc(label)+' · LAK</span><strong>'+money(n)+'</strong></div>').join('')+'</div>'; }catch(e){host.textContent=e.message;}}
function render(){if(!active())return;const host=document.getElementById('tax-profit');if(!host)return;try{guard();scope();}catch(e){host.textContent=e.message;return;}if(!S.data)S.data=blank();let panel=host.querySelector('[data-profit-tax199]');if(!panel){panel=document.createElement('div');panel.dataset.profitTax199='';host.append(panel);}const d=S.data;
 const input=(name,label,negative=false)=>'<label class="settings-field">'+esc(label)+'<input class="je-input" name="'+name+'" inputmode="decimal" type="text" value="'+esc(d[name])+'"'+(name==='rate'?' placeholder="Applicable rate"':'')+'></label>';
 panel.innerHTML='<section class="module-card tax-card102"><div class="je-card-header"><h3>Profit Tax</h3></div><div class="tax-card-body102"><div class="settings-compact-grid cols-3"><label class="settings-field">Tax year<input id="profitYear199" class="je-input" type="number" min="1900" max="9999" value="'+S.year+'"></label><label class="settings-field">Period<select id="profitPeriod199" class="je-select">'+Object.entries(names).map(([k,v])=>'<option value="'+k+'"'+(k===S.period?' selected':'')+'>'+v+'</option>').join('')+'</select></label><div class="actions82"><button class="je-btn je-btn-secondary" data-profit-open>Open</button><button class="je-btn je-btn-secondary" data-profit-ledger>Use Ledger Profit</button></div></div><p>'+esc(names[S.period]+' '+S.year)+' · '+(S.record?'Saved calculation':'New calculation')+'</p><form id="profitTaxForm199"><div class="settings-compact-grid cols-3">'+input('profit','Profit / (loss) · LAK',true)+input('additions','Non-deductible amounts · LAK')+input('deductions','Exempt income / deductions · LAK')+input('rate','Profit-tax rate (%)')+input('payments','Prior payments for this period · LAK')+input('credits','Other tax credits · LAK')+'<label class="settings-field">Reference<input class="je-input" name="reference" value="'+esc(d.reference)+'"></label></div><div id="profitTaxResult199"></div><div class="actions82"><button type="submit" class="je-btn je-btn-primary">Save Calculation</button><button type="button" class="je-btn je-btn-secondary" data-profit-print>Print / Export</button><button type="button" class="je-btn je-btn-secondary" data-profit-settings>Tax Settings</button></div></form><p role="status" data-profit-status>'+esc(S.error|| (S.busy?'Loading…':''))+'</p></div></section>';
 panel.querySelector('[data-profit-open]').onclick=()=>open(Number(panel.querySelector('#profitYear199').value),panel.querySelector('#profitPeriod199').value);
 panel.querySelector('[data-profit-ledger]').onclick=ledger;
 panel.querySelector('[data-profit-print]').onclick=print;
 panel.querySelector('[data-profit-settings]').onclick=()=>switchTab('settings-tax');
 panel.querySelector('form').onsubmit=e=>{e.preventDefault();save();};panel.querySelector('form').oninput=()=>{values();result();};
 for(const el of panel.querySelectorAll('button,input,select'))el.disabled=S.busy;result();
}
async function open(year=S.year,period=S.period){try{guard();range(year,period);if(S.busy)return;const current=scope(),db=ojmDb,request=++S.request;S.year=year;S.period=period;S.record=null;S.data=blank();S.busy=true;S.error='';render();try{const r=await db.from('company_documents105').select('*').eq('id',identifier(year,period)).maybeSingle();if(!current()||request!==S.request)return;if(r.error)throw r.error;if(r.data){if(r.data.data?.source!=='profit-tax199'||r.data.data?.profitTax199?.year!==year||r.data.data?.profitTax199?.period!==period)throw Error('The saved document does not match this profit-tax period.');S.record=r.data;S.data=structuredClone(r.data.data.profitTax199);}}catch(e){if(current()&&request===S.request)S.error=e.message;}finally{if(current()&&request===S.request){S.busy=false;render();}}}catch(e){showCenterStatus(e.message,true);}}
async function ledger(){if(S.busy)return;values();const current=scope(),request=++S.request,year=S.year,period=S.period;try{guard();S.busy=true;S.error='';render();const p=range(year,period),db=ojmDb,lines=[];let revision;
 await loadReferenceDataFromSupabase();if(!current()||request!==S.request)return;
 for(let offset=0;;offset+=500){const r=await db.rpc('journal_window14333',{p_from:p.from,p_to:p.to,p_offset:offset});if(!current()||request!==S.request)return;if(r.error)throw r.error;const pack=r.data;if(!Array.isArray(pack?.rows))throw Error('The journal period could not be loaded.');if(offset===0)revision=pack.revision;else if(revision!==pack.revision)throw Error('The journal changed during loading. Try again.');lines.push(...pack.rows);if(pack.rows.length<500)break;}
 const totals=ledgerTotals(lines,AccountingStore.accounts);S.data={...S.data,profit:totals.profit,basis:'ledger',ledger:{...totals,from:p.from,to:p.to,revision,loadedAt:new Date().toISOString()}};
 }catch(e){if(current()&&request===S.request)S.error=e.message;}finally{if(current()&&request===S.request){S.busy=false;render();}}}
function ledgerTotals(lines,accounts){let revenue=0,expense=0;const mapping=String(ApplicationSettings.tax?.profitTaxExpenseAccount||'').trim();
 for(const l of lines){if(l.status&&l.status!=='posted'||l.voided_at||l.pendingSync||l.local14333||String(l.generalMemo||'').startsWith('Year-end closing '))continue;const a=accounts.find(a=>a.id===l.accountId||a.code===l.accountCode&&!!l.accountCode);if(!a)throw Error('A journal account could not be identified. Refresh and try again.');if(a.isTechnical)continue;const type=String(a.baseType||a.type).toUpperCase();if(!['REVENUE','EXPENSE'].includes(type))continue;if(type==='EXPENSE'&&((mapping&&[a.id,a.code,a.name].includes(mapping))||/\bprofit tax\b/i.test(a.name)))continue;
 const dr=window.JournalFX14383?.base(l,'debit'),cr=window.JournalFX14383?.base(l,'credit');if(dr==null||cr==null||!Number.isFinite(dr)||!Number.isFinite(cr))throw Error('A reporting exchange rate is missing.');if(type==='REVENUE')revenue+=cr-dr;else expense+=dr-cr;}
 return {revenue:round(revenue),expense:round(expense),profit:round(revenue-expense)};
}
async function save(){if(S.busy)return;values();const current=scope(),db=ojmDb;try{guard('edit');const data=structuredClone(S.data);data.result=calculate(data);const content=html(data),record=S.record,id=identifier(S.year,S.period);S.busy=true;S.error='';render();const payload={id,data:{...(record?.data||{}),title:'Profit Tax — '+names[data.period]+' '+data.year,category:'Tax & SSO',source:'profit-tax199',profitTax199:data,html:content,settings:reports14254.settings(),updatedAt:new Date().toISOString()},version:(record?.version||0)+1};let q=record?db.from('company_documents105').update(payload).eq('id',id).eq('version',record.version):db.from('company_documents105').insert(payload);const r=await q.select('*');if(!current())return;if(r.error)throw r.error;if(r.data?.length!==1)throw Error('This calculation changed on another device. Open it again before saving.');S.record=r.data[0];S.data=data;S.error='Calculation saved.';}catch(e){if(current())S.error=e.message;}finally{if(current()){S.busy=false;render();}}}
async function print(){const actor=liveProfile?.id,db=ojmDb;try{guard('export');values();const d=structuredClone(S.data);calculate(d);const choices=typeof choosePrintSignatories1424==='function'?await choosePrintSignatories1424({actionLabel:'Open report'}):{enabled:true,prepared:liveProfile.full_name||liveProfile.email,receiver:'',approver:''};if(!choices)return;guard('export');if(liveProfile?.id!==actor||ojmDb!==db)throw Error('Your account changed. Open the report again.');const signatures=typeof printSignatures1424==='function'?printSignatures1424(choices):'';return openDocumentEditor105({title:'Profit Tax — '+names[d.period]+' '+d.year,category:'Tax & SSO',source:'profit-tax199',html:html(d)+signatures,settings:reports14254.settings(),printPreview:true,approvedLayout14254:true});}catch(e){showCenterStatus(e.message,true);}}
const previous=window.switchTab;window.switchTab=function(target,...args){const r=previous.call(this,target,...args);if(target==='tax-profit'){const changed=S.owner!==liveProfile?.id||S.client!==ojmDb;scope();if(changed||!S.data)void open();else render();}return r;};
window.profitTax143199={calculate,range,identifier,ledgerTotals,open,render,print};
})();
;
