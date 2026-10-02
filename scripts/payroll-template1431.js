/* User-approved journal layout. Values come from payroll, never from the example amounts. */
(()=>{'use strict';
const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const eligible=()=>AccountingStore.accounts.filter(a=>a.id&&a.isPosting!==false&&a.currency&&a.currency!=='NA'&&a.displayCurrency!=='—');
const norm=s=>String(s||'').toLowerCase().replace(/[–—-]/g,' ').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const fields={contractLak:'Contracted salary',gross:'Gross salary',taxable:'Adjusted salary for PIT',employeePit:'Employee PIT share',employerPit:'Company PIT share',pit:'Total PIT (employee + company)',employeeSso:'Employee SSO',employerSso:'Company SSO',totalSso:'Total SSO',net:'Net salary before recoveries',adjusted:'Final net payment',cashAdvance:'Salary advance recovery',loanRecovery:'Loan / MOU recovery',reimbursement:'Reimbursement',internal:'Internal deductions',allowance:'Allowance',overtime:'Overtime',rounding:'Currency rounding difference'};
function exact(code,currency,names=[]){const list=eligible().filter(a=>a.currency===currency);return list.find(a=>String(a.code)===code&&(!names.length||names.some(n=>norm(a.name)===norm(n))))?.id||((()=>{const matched=list.filter(a=>names.some(n=>norm(a.name)===norm(n)));return matched.length===1?matched[0].id:''})());}
function employeeAccount(employee){
 if(employee.payrollAccountId)return employee.payrollAccountId;
 const name=norm(employee.name).split(' ').filter(x=>x.length>1).join(' ');
 const matches=eligible().filter(a=>a.currency===employee.currency&&norm(a.name).replace(/^staff clearing /,'').replace(/ (usd|lak|thb)$/,'')===name);
 return matches.length===1?matches[0].id:'';
}
function settingsAccount(value,code,names){
 if(value==null)return exact(code,'LAK',names);
 const text=String(value).trim(),accounts=eligible().filter(a=>a.currency==='LAK');
 const matches=accounts.filter(a=>a.id===text||String(a.code)===text||norm(a.name)===norm(text)||norm(a.code+' '+a.name)===norm(text));
 return matches.length===1?matches[0].id:'';
}
function defaultTemplate(run){
 const rows=run.rows||[],currencies=[...new Set(rows.map(r=>r.employee.currency))].sort((a,b)=>(a==='LAK'?1:b==='LAK'?-1:a==='USD'?-1:b==='USD'?1:a.localeCompare(b)));
 const t={name:'Oon Jai payroll journal',version:1431,employeeAccounts:{},lines:[]};
 rows.forEach(r=>t.employeeAccounts[r.employeeId]=employeeAccount(r.employee));
 const tax=(run.status==='finalized'?run.settingsSnapshot:ApplicationSettings)?.tax||ApplicationSettings.tax||{};
 const pitExpense=exact('5211','LAK',['PIT Expense','OJM- PITx Expense']),pitPayable=settingsAccount(tax.pitAccount,'2111',['PIT Payable','OJM- PITx Payable']),ssoExpense=exact('5212','LAK',['SSO Expense']),ssoPayable=settingsAccount(tax.ssoAccount,'2112',['SSO Payable','OJM- SSO Payable']);
 const rule=(account,side,basis,currency,scope,memo,expectedCurrency=currency)=>({account,side,basis,employees:currency,scope,memo,expectedCurrency,manual:''});
 for(const c of currencies){
  const group=rows.filter(r=>r.employee.currency===c),sso=group.some(r=>r.employee.sso),foreign=c!=='LAK';
  const salary=exact(c==='USD'?'5310':c==='LAK'?'5311':'',c,['Salaries – '+c,'PERSONNEL- Salaries ('+c+')']);
  t.lines.push(rule(salary,'DR','gross',c,'total','Gross salaries · '+c),rule('$employee','CR','adjusted',c,'each','Final salary'));
  t.lines.push(rule('$employee','CR','cashAdvance',c,'each','Salary advance recovery'),rule('$employee','CR','loanRecovery',c,'each','Advance repayment / MOU'));
  // Non-zero reimbursements need their own expense mapping, never an invented salary offset.
  if(group.some(r=>Number(r.input?.reimbursement)>0)||run.results?.some(x=>x.currency===c&&Number(x.reimbursement)>0))t.lines.push(rule('','DR','reimbursement',c,'each','Reimbursement'));
  if(foreign){
   t.lines.push(rule(exact(c==='USD'?'9042':'',c,['Payroll Tax Bridge – '+c,'X-Payroll Tax Bridge '+c]),'CR','employeePit',c,'total','Foreign workers PIT withholding'));
   if(sso)t.lines.push(rule('','CR','employeeSso',c,'total','Foreign employee SSO bridge'));
   t.lines.push(rule(exact('',c,['Rounding Difference','X-Exchange & Rounding Difference']),'AUTO','rounding',c,'total','Payroll currency rounding'));
   t.lines.push(rule(pitExpense,'DR','employerPit',c,'total','Foreign workers PIT · company share','LAK'),rule(pitExpense,'DR','employeePit',c,'total','Foreign workers PIT · employee share equivalent','LAK'),rule(pitPayable,'CR','pit',c,'total','Foreign workers PIT · total payable','LAK'));
   if(sso)t.lines.push(rule('','DR','employeeSso',c,'total','Foreign employee SSO bridge equivalent','LAK'),rule(ssoPayable,'CR','employeeSso',c,'total','Foreign employee SSO withholding','LAK'));
  }else{
   if(sso)t.lines.push(rule(ssoPayable,'CR','employeeSso',c,'total','Local workers SSO withholding'));
   t.lines.push(rule(pitPayable,'CR','employeePit',c,'total','Local workers PIT · employee withholding'),rule(pitExpense,'DR','employerPit',c,'total','Local workers PIT · company share'),rule(pitPayable,'CR','employerPit',c,'total','Local workers PIT · company share payable'));
  }
  if(sso)t.lines.push(rule(ssoExpense,'DR','employerSso',c,'total','Company SSO share','LAK'),rule(ssoPayable,'CR','employerSso',c,'total','Company SSO payable','LAK'));
 }
 return t;
}
function isStarter(t){return t?.lines?.length===2&&t.lines[0].account===''&&t.lines[0].basis==='gross'&&t.lines[1].account==='$employee'&&t.lines[1].basis==='adjusted';}
function selected(results,filter){return results.filter(x=>!filter||filter==='all'||x.currency===filter||filter==='employee:'+x.employeeId);}
function amountLak(x,basis){
 const v=k=>Number(x[k]||0);
 if(basis==='pit')return round(v('employeePit')+v('employerPit'));
 if(basis==='totalSso')return round(v('employeeSso')+v('employerSso'));
 if(basis==='internal')return ['late','absence','penalty','other'].reduce((n,k)=>n+v(k),0);
 return v(basis);
}
function evaluate(run,template){
 const results=run.status==='finalized'?run.results:payroll95.results(run);
 if(!results?.length)throw Error('This payroll has no calculated employees.');
 if(!template?.lines?.length)throw Error('Add at least two payroll template lines.');
 const lines=[],issues=[],rules=template.lines;
 const report=m=>{if(!issues.includes(m))issues.push(m);};
 const accountFor=(r,x)=>{
  const e=run.rows.find(row=>row.employeeId===x.employeeId)?.employee||x.employee||{};
  const id=r.account==='$employee'?(Object.hasOwn(template.employeeAccounts||{},x.employeeId)?template.employeeAccounts[x.employeeId]:e.payrollAccountId):r.account;
  const a=eligible().find(a=>a.id===id),currency=r.account==='$employee'?x.currency:r.expectedCurrency||a?.currency||x.currency;
  if(!a)report('Choose '+currency+' account: '+(r.account==='$employee'?e.name||x.employeeId:r.memo||fields[r.basis]));
  else if(r.account==='$employee'&&a.currency!==x.currency)report((e.name||'Employee')+' clearing account must use '+x.currency+'.');
  else if(r.expectedCurrency&&a.currency!==r.expectedCurrency)report((r.memo||fields[r.basis])+' requires '+r.expectedCurrency+'.');
  return a||{id:'',code:'',name:'Choose account · '+(r.account==='$employee'?e.name||x.employeeId:r.memo||fields[r.basis]),currency};
 };
 function push(r,a,value,x,ruleIndex){
  if(!value)return;
  const e=run.rows.find(row=>row.employeeId===x.employeeId)?.employee||x.employee||{};
  lines.push({account:a,amount:round(value),side:r.side,memo:r.manualMemo??((r.scope==='each'?(e.name||x.employeeId)+' · ':'')+(r.memo||fields[r.basis])+' · '+run.reference),ruleIndex});
 }
 rules.forEach((r,ruleIndex)=>{
  if(r.basis==='rounding')return;
  if(!fields[r.basis]){report('Choose a payroll amount for line '+(ruleIndex+1)+'.');return;}
  if(!['DR','CR'].includes(r.side)){report('Choose DR or CR for line '+(ruleIndex+1)+'.');return;}
  if(!['each','total'].includes(r.scope)){report('Choose a grouping for line '+(ruleIndex+1)+'.');return;}
  if(r.account==='$employee'&&r.scope==='total'){report('Employee clearing accounts require Per employee grouping.');return;}
  const chosen=selected(results,r.employees),groups=new Map(),manual=String(r.manual??'').trim();
  if(manual!==''&&(!Number.isFinite(Number(manual))||Number(manual)<0)){report('Enter a non-negative manual amount for line '+(ruleIndex+1)+'.');return;}
  for(const x of chosen){
   const lak=amountLak(x,r.basis);if(!Number.isFinite(lak)||lak<0){report('Review '+fields[r.basis]+' for '+(x.employee?.name||x.employeeId)+'.');continue;}
   if(manual===''&&lak===0||manual!==''&&Number(manual)===0)continue;
   const a=accountFor(r,x),rate=a.currency==='LAK'?1:Number(run.rates?.[a.currency]);
   if(manual===''&&(!Number.isFinite(rate)||rate<=0)){report('Enter the saved LAK exchange rate for '+a.currency+' in Payroll.');continue;}
   if(manual===''&&a.currency!=='LAK'&&!run.rateSource?.trim()){report('Enter the exchange-rate source in Payroll.');continue;}
   const raw=manual!==''?Number(manual):lak/rate;
   if(r.scope==='total'){
    const key=a.id||a.currency;const g=groups.get(key)||{a,x,value:0};g.value=manual!==''?Number(manual):g.value+raw;groups.set(key,g);
   }else push(r,a,round(raw),x,ruleIndex);
  }
  for(const g of groups.values())push(r,g.a,round(g.value),g.x,ruleIndex);
 });
 // Only conversion-size differences may use the explicit rounding row. Never hide
 // a missing withholding or expense behind a balancing amount.
 const rounded=new Set();
 rules.forEach((r,ruleIndex)=>{
  if(r.basis!=='rounding')return;
  const chosen=selected(results,r.employees),c=r.expectedCurrency||eligible().find(a=>a.id===r.account)?.currency||r.employees;
  if(rounded.has(c)){report('Use only one rounding line per currency.');return;}rounded.add(c);
  const gap=round(lines.filter(l=>l.account.currency===c).reduce((n,l)=>n+(l.side==='DR'?l.amount:-l.amount),0));
  if(!gap)return;
  if(Math.abs(gap)>Math.max(.01,chosen.length*.01)+.000001){report(c+' difference '+Math.abs(gap).toFixed(2)+' exceeds a rounding adjustment. Review the template lines.');return;}
  if(!chosen.length)return;
  const a=accountFor(r,chosen[0]),side=gap>0?'CR':'DR';
  if(r.side!=='AUTO'&&r.side!==side){report('Rounding line must use '+side+' for '+c+'.');return;}
  push({...r,side},a,Math.abs(gap),chosen[0],ruleIndex);
 });
 // Keep rule order, including the small foreign rounding row beside the bridge.
 lines.sort((a,b)=>a.ruleIndex-b.ruleIndex);
 const balances={};for(const l of lines){const b=balances[l.account.currency]||={debit:0,credit:0};b[l.side==='DR'?'debit':'credit']=round(b[l.side==='DR'?'debit':'credit']+l.amount);}
 for(const b of Object.values(balances))b.difference=round(b.debit-b.credit);
 return {lines,issues,balances};
}
function buildLines(run,t){const e=evaluate(run,t);if(e.issues.length)throw Error(e.issues.join('\n'));if(e.lines.length<2)throw Error('The template needs at least two non-zero posting lines.');return e.lines;}
window.payrollTemplate1431={fields,eligible,defaultTemplate,isStarter,evaluate,buildLines};
})();
