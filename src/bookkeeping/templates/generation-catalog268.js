/* Chart-backed starters and conservative matching; never changes saved templates. */
((root)=>{'use strict';
const G=()=>root.JournalCompletion258;
function templates(chart){
 const g=G();if(!g)return [];const reg=g.registry(chart),out=[];
 const row=(a,side,memo)=>({code:String(a.code),currency:g.currency(a),memo: memo||a.name,side});
 const slot=(role,currency,side,memo)=>({role,currency,side,memo});
 const add=(id,name,lines,autoMatch=true)=>out.push({id:'gen268-'+id,name,builtin:true,lines,generalMemo:'',autoMatch});
 for(const [id,m] of reg.maps){
  const a=reg.all.find(a=>a.id===id),c=g.currency(a);if(!m.actual||!m.offset)continue;
  const expense=g.type(m.actual)==='EXPENSE',asset=g.type(m.actual)==='ASSET';
  const name=String(m.actual.name||m.actual.code).replace(/\s*[—–-]?\s*LAK\s*$/i,'').trim();
  if(String(m.actual.code)==='5311'){
   add('payroll-'+c,'Salary accrual · '+c,[row(a,'debit','Gross salary'),slot('staff',c,'credit','Net salary owed')]);
   const tax=reg.bridge(c,true),pit=reg.byCode('2111'),sso=reg.byCode('2112');
   if(tax&&pit)add('payroll-pit-'+c,'Salary accrual with PIT · '+c,[row(a,'debit','Gross salary'),slot('staff',c,'credit','Net salary owed'),row(tax,'credit','Employee PIT withholding'),row(pit,'credit','PIT payable')],false);
   if(tax&&pit&&sso)add('payroll-tax-sso-'+c,'Salary accrual with PIT and SSO · '+c,[row(a,'debit','Gross salary'),slot('staff',c,'credit','Net salary owed'),row(tax,'credit','Employee withholding'),row(pit,'credit','PIT payable — enter the allocation'),row(sso,'credit','SSO payable — enter the allocation')],false);
   continue;
  }
  add('mapping-'+a.code+'-'+c,name+' · '+c+(expense?' payment':asset?' purchase':' receipt'),expense||asset?[row(a,'debit'),slot('fund',c,'credit','Cash / bank payment')]:[slot('fund',c,'debit','Cash / bank receipt'),row(a,'credit')]);
  const fee=[...reg.maps].find(([id,m])=>String(m.actual?.code)==='5414'&&g.currency(reg.all.find(a=>a.id===id))===c);
  if(expense&&String(m.actual.code)!=='5414'&&fee){const feeAccount=reg.all.find(a=>a.id===fee[0]);add('fee-'+a.code+'-'+c,name+' with bank fee · '+c,[row(a,'debit'),row(feeAccount,'debit','Separate bank fee'),slot('fund',c,'credit','Total paid including bank fee')],false);}
 }
 const salaries=[...reg.maps].filter(([,m])=>String(m.actual?.code)==='5311').map(([id])=>reg.all.find(a=>a.id===id));
 if(salaries.length>1)add('mixed-payroll','Salary accrual · mixed currencies',salaries.flatMap(a=>[row(a,'debit','Gross salary'),slot('staff',g.currency(a),'credit','Net salary owed')]),false);
 const currencies=[...new Set(reg.all.filter(g.fund).map(g.currency))].sort();
 for(const c of currencies){
  add('transfer-'+c,'Cash / bank transfer · '+c,[slot('fund',c,'debit','Receiving fund'),slot('fund',c,'credit','Paying fund')],false);
  add('settlement-'+c,'Pay salary or existing balance · '+c,[slot('balance',c,'debit','Balance payment'),slot('fund','', 'credit','Cash / bank payment')],false);
  for(const to of currencies.filter(x=>x!==c))add('exchange-'+c+'-'+to,'Currency exchange · '+c+' to '+to,[slot('fund',c,'credit','Amount paid'),slot('fund',to,'debit','Amount received')],false);
 }
 for(const a of reg.all.filter(a=>g.currency(a)==='LAK'&&!g.technical(a)&&['EXPENSE','REVENUE','EQUITY'].includes(g.type(a))&&String(a.code)!=='5419')){
  const expense=g.type(a)==='EXPENSE';add('local-'+a.code,a.name+' · LAK '+(expense?'payment':'receipt'),expense?[row(a,'debit'),slot('fund','LAK','credit','Paying fund')]:[slot('fund','LAK','debit','Receiving fund'),row(a,'credit')]);
 }
 // Releases consume the prepaid asset; they do not repeat the original payment.
 for(const [id,name,expense,prepaid,c] of [['wifi','Prepaid Wi-Fi amortization','5110','1311','LAK'],['rent','Prepaid house rent amortization','5119','1310','LAK'],['restaurant','Prepaid restaurant rent amortization','9222','1312','THB']]){
  const e=reg.byCode(expense,c),p=reg.byCode(prepaid,c);if(e&&p)add('amortization-'+id,name+' · '+c,[row(e,'debit','Monthly prepaid expense'),row(p,'credit','Release prepaid balance')]);
 }
 add('amortization-insurance','Prepaid insurance amortization · LAK',[slot('expense','LAK','debit','Insurance expense'),slot('prepaid','LAK','credit','Release prepaid insurance')],false);
 add('amortization-other','Other prepaid amortization · LAK',[slot('expense','LAK','debit','Prepaid expense allocation'),slot('prepaid','LAK','credit','Release prepaid balance')],false);
 return out;
}
function accepts(line,a){const g=G();return !!a&&(!line.currency||line.currency===g.currency(a))&&(line.role==='fund'?g.fund(a):line.role==='staff'?g.staff(a):line.role==='balance'?g.staff(a)||g.type(a)==='LIABILITY':line.role==='prepaid'?g.type(a)==='ASSET'&&/^13\d\d$/.test(String(a.code)):line.role==='expense'?g.type(a)==='EXPENSE'&&!g.technical(a):false);}
function resolve(line,chart){return line.accountId?chart.find(a=>a.id===line.accountId&&(!line.currency||G().currency(a)===line.currency)):line.code?chart.find(a=>String(a.code)===String(line.code)&&(!line.currency||G().currency(a)===line.currency)):root.resolveTemplateAccount14397?.(line);}
function match(rows,definitions,chart){
 const g=G(),reg=g.registry(chart),entered=rows.filter(l=>l.account_id&&l.generated!=='output'),anchors=entered.filter(l=>{const a=chart.find(a=>a.id===l.account_id);return a&&!g.fund(a)&&(!g.technical(a)||reg.maps.has(a.id))});
 if(!anchors.length)return [];
 const candidates=[];
 for(const t of definitions.filter(t=>t.id!=='blank'&&t.autoMatch!==false)){
  const lines=t.lines||[];let score=0,valid=true;
  for(const l of entered){const a=chart.find(a=>a.id===l.account_id);if(!a)continue;const side=Number(l.debit)>0?'debit':Number(l.credit)>0?'credit':'';
   const matches=lines.filter(x=>(!side||!x.side||x.side===side)&&(resolve(x,chart)?.id===a.id||accepts(x,a)||reg.maps.get(resolve(x,chart)?.id)?.actual?.id===a.id));
   if(!matches.length){if(anchors.includes(l)||g.fund(a)){valid=false;break;}continue;}
   if(anchors.includes(l))score+=matches.some(x=>resolve(x,chart)?.id===a.id)?4:2;
   else score++;
  }
  if(valid&&score>=2)candidates.push({template:t,score});
 }
 candidates.sort((a,b)=>b.score-a.score);return candidates.filter(x=>x.score===candidates[0]?.score).map(x=>x.template);
}
function merge(rows,template,chart,makeRows){
 const result=rows.map(l=>({...l})),used=new Set();
 for(const [i,line] of (template.lines||[]).entries()){
  const a=resolve(line,chart),index=result.findIndex((l,j)=>!used.has(j)&&l.account_id&&(!line.side||!Number(l.debit)&&!Number(l.credit)||Number(l[line.side])>0)&&(a?.id===l.account_id||accepts(line,chart.find(a=>a.id===l.account_id))));
  if(index>=0){used.add(index);continue;}
  const empty=result.findIndex((l,j)=>!used.has(j)&&!l.account_id&&!l.line_memo&&!l.debit&&!l.credit),next=makeRows(template)[i];
  if(empty>=0){result[empty]=next;used.add(empty);}else{result.push(next);used.add(result.length-1);}
 }
 return result;
}
root.JournalTemplateCatalog268={templates,accepts,resolve,match,merge};
})(globalThis);
