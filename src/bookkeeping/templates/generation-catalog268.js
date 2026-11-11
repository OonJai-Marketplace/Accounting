/* Chart-backed starters and conservative matching; never changes saved templates. */
((root)=>{'use strict';
const G=()=>root.JournalCompletion258;
const actions={
 '1310':'Prepay company house rent','3010':'Receive an owner capital contribution',
 '3023':'Receive financial support','3024':'Apply financial support to expenses','3031':'Receive owner support for airfare',
 '4010':'Record dine-in sales','4019':'Record other sales','4110':'Receive a donation or external support',
 '4120':'Receive a housing contribution','4130':'Receive other income','5010':'Buy food for the restaurant',
 '5110':'Pay a utility bill','5111':'Buy kitchen supplies','5113':'Pay for transport','5114':'Pay for cleaning',
 '5115':'Pay for marketing','5116':'Pay for maintenance or repairs','5117':'Pay for an event',
 '5118':'Pay legal or permit fees','5119':'Pay restaurant rent','5120':'Pay an operating expense',
 '5210':'Record VAT expense','5211':'Record employer PIT','5212':'Record employer SSO','5213':'Record profit tax expense',
 '5311':'Record salary expense','5312':'Pay staff permit or legal fees','5313':'Pay for staff training',
 '5315':'Pay employee benefits','5410':'Buy office supplies','5411':'Pay a farm expense',
 '5412':'Pay for vehicle repairs','5413':'Pay for vehicle registration','5414':'Pay a bank fee',
 '5421':'Pay company house rent'
};
function action(a){
 const name=String(a.name||a.code).replace(/\s*[—–-]\s*LAK$/i,'').trim();
 if(/^Sales [—–-] /i.test(name))return 'Record '+name.slice(8)+' sales';
 return actions[a.code]||'Record '+name.charAt(0).toLowerCase()+name.slice(1);
}
function templates(chart){
 const g=G();if(!g)return [];const reg=g.registry(chart),out=[];
 const row=(a,side,memo)=>({code:String(a.code),currency:g.currency(a),memo: memo||a.name,side});
 const slot=(role,currency,side,memo)=>({role,currency,side,memo});
 const calculated=(a,side,memo)=>a?{...row(a,side,memo),calculated:true}:null;
 function add(id,name,lines,autoMatch=true){
  const outputs=[];
  const include=(a,side,memo)=>{const line=calculated(a,side,memo);if(line&&!outputs.some(x=>x.code===line.code&&x.side===line.side))outputs.push(line);};
  for(const line of lines){
   const account=reg.byCode(line.code,line.currency),mapping=reg.maps.get(account?.id);
   if(mapping){
    include(mapping.actual,line.side,'LAK recognition · '+mapping.actual.name);
    include(mapping.offset,line.side==='debit'?'credit':'debit','LAK mapping offset');
   }
   if(account&&reg.isTax(account))include(reg.bridge('LAK',true),'debit','LAK withholding bridge');
  }
  const exchange=id.startsWith('exchange-'),settlement=id.startsWith('settlement-');
  if(exchange||settlement){
   for(const c of new Set(lines.map(l=>l.currency).filter(c=>c&&c!=='LAK')))include(reg.bridge(c),'','Exchange or settlement at the evidenced rates');
   if(lines.some(l=>l.currency!=='LAK'))include(reg.bridge('LAK'),'','LAK bridge when required');
  }
  if((exchange||settlement||lines.some(l=>l.role==='fund'&&l.side==='credit'))&&lines.some(l=>l.currency&&l.currency!=='LAK'))include(reg.byCode('5419'),'','Realized FX if carrying and settlement values differ');
  const layout=id.startsWith('support-deposit-fee-')?[...lines.slice(0,4),...outputs,...lines.slice(4)]:[...lines,...outputs];
  out.push({id:'gen268-'+id,name,builtin:true,lines:layout,generalMemo:'',autoMatch});
 }
 for(const [id,m] of reg.maps){
  const a=reg.all.find(a=>a.id===id),c=g.currency(a);if(!m.actual||!m.offset)continue;
  const expense=g.type(m.actual)==='EXPENSE',asset=g.type(m.actual)==='ASSET';
  const name=action(m.actual);
  if(String(m.actual.code)==='5311'){
   add('payroll-'+c,'Accrue salaries · '+c,[row(a,'debit','Gross salary'),slot('staff',c,'credit','Net salary owed')]);
   const tax=reg.bridge(c,true),pit=reg.byCode('2111'),sso=reg.byCode('2112');
   if(tax&&pit)add('payroll-pit-'+c,'Accrue salaries with PIT · '+c,[row(a,'debit','Gross salary'),slot('staff',c,'credit','Net salary owed'),row(tax,'credit','Employee PIT withholding'),row(pit,'credit','PIT payable')],false);
   if(tax&&pit&&sso)add('payroll-tax-sso-'+c,'Accrue salaries with PIT and SSO · '+c,[row(a,'debit','Gross salary'),slot('staff',c,'credit','Net salary owed'),row(tax,'credit','Employee withholding'),row(pit,'credit','PIT payable — enter the allocation'),row(sso,'credit','SSO payable — enter the allocation')],false);
   continue;
  }
  if(m.actualCode==='3024'){
   const remaining=[...reg.maps].find(([key,v])=>v.actualCode==='3023'&&g.currency(reg.all.find(item=>item.id===key))===c);
   if(remaining)add('mapping-'+a.code+'-'+c,name+' · '+c,[row(reg.all.find(item=>item.id===remaining[0]),'debit','Release remaining support at its original rate'),row(a,'credit','Support used at the same original rate')],false);
   continue;
  }
  add('mapping-'+a.code+'-'+c,name+' · '+c,expense||asset?[row(a,'debit'),slot('fund',c,'credit','Cash / bank payment')]:[slot('fund',c,'debit','Cash / bank receipt'),row(a,'credit')]);
  if(m.actualCode==='3023'){
   const receipt=[{...slot('staff',c,'debit','Support received through staff'),receiptLeg:'receive'},
    {...row(a,'credit','Owner support received'),receiptLeg:'equity'},
    {...slot('fund',c,'debit','Full deposit into company cash / bank'),receiptLeg:'deposit'},
    {...slot('staff',c,'credit','Clear the same staff receipt'),receiptLeg:'clear'}];
   add('support-deposit-'+c,'Receive financial support via staff and deposit it · '+c,receipt,false);
   const feeAccount=reg.byCode('5414');
   if(feeAccount)add('support-deposit-fee-'+c,'Receive financial support via staff, deposit it and record a LAK fee · '+c,
    [...receipt,row(feeAccount,'debit','Separate LAK bank fee'),slot('payer','LAK','credit','Fund or staff who paid the fee')],false);
  }
  const fee=[...reg.maps].find(([id,m])=>String(m.actual?.code)==='5414'&&g.currency(reg.all.find(a=>a.id===id))===c);
  if((expense||asset)&&String(m.actual.code)!=='5414'&&fee){const feeAccount=reg.all.find(a=>a.id===fee[0]);const payment=asset?[row(a,'debit'),slot('fund',c,'credit','Prepayment released'),row(feeAccount,'debit','Separate bank fee'),slot('fund',c,'credit','Fee released at its own rate')]:[row(a,'debit'),row(feeAccount,'debit','Separate bank fee'),slot('fund',c,'credit','Total paid including bank fee')];add('fee-'+a.code+'-'+c,name+' and pay a bank fee · '+c,payment,false);}
 }
 const salaries=[...reg.maps].filter(([,m])=>String(m.actual?.code)==='5311').map(([id])=>reg.all.find(a=>a.id===id));
 if(salaries.length>1)add('mixed-payroll','Accrue salaries in multiple currencies',salaries.flatMap(a=>[row(a,'debit','Gross salary'),slot('staff',g.currency(a),'credit','Net salary owed')]),false);
 const currencies=[...new Set(reg.all.filter(g.fund).map(g.currency))].sort();
 for(const c of currencies){
  add('transfer-'+c,'Transfer between cash or bank accounts · '+c,[slot('fund',c,'debit','Receiving fund'),slot('fund',c,'credit','Paying fund')],false);
  add('settlement-'+c,'Settle a salary or outstanding payable · '+c,[slot('balance',c,'debit','Balance payment'),slot('fund','', 'credit','Cash / bank payment')],false);
  for(const to of currencies.filter(x=>x!==c))add('exchange-'+c+'-'+to,'Exchange currency · '+c+' to '+to,[slot('fund',c,'credit','Amount paid'),slot('fund',to,'debit','Amount received')],false);
 }
 for(const receipt of out.filter(t=>/^gen268-mapping-931[12]-/.test(t.id))){
  const c=receipt.lines[0].currency;
  for(const to of currencies.filter(x=>x!==c)){
   const exchange=out.find(t=>t.id==='gen268-exchange-'+c+'-'+to);
   out.push({id:'gen268-support-exchange-'+c+'-'+to,name:'Receive financial support and exchange part or all · '+c+' to '+to,builtin:true,autoMatch:false,
    lines:[...receipt.lines.map(l=>({...l,stage:'Receipt'})),...exchange.lines.map(l=>({...l,stage:'Exchange'}))]});
  }
 }
 if(currencies.includes('LAK')){
  for(const [code,label] of [['2111','PIT'],['2112','SSO']]){
   const payable=reg.byCode(code,'LAK');
   if(payable&&g.type(payable)==='LIABILITY')add('remit-'+label,'Pay '+label+' in whole kip',
    [row(payable,'debit',label+' liability to settle'),slot('fund','LAK','credit','Government payment')],false);
  }
 }
 for(const a of reg.all.filter(a=>g.currency(a)==='LAK'&&!g.technical(a)&&['EXPENSE','REVENUE','EQUITY'].includes(g.type(a))&&String(a.code)!=='5419')){
  if(String(a.code)==='3024'){
   const remaining=reg.byCode('3023');
   if(remaining)add('local-'+a.code,action(a)+' · LAK',[row(remaining,'debit','Release remaining support'),row(a,'credit','Support applied')],false);
   continue;
  }
  const expense=g.type(a)==='EXPENSE';add('local-'+a.code,action(a)+' · LAK',expense?[row(a,'debit'),slot('fund','LAK','credit','Paying fund')]:[slot('fund','LAK','debit','Receiving fund'),row(a,'credit')]);
 }
 // Releases consume the prepaid asset; they do not repeat the original payment.
 for(const [id,name,expense,prepaid,c] of [['wifi','Recognize prepaid Wi-Fi expense','5110','1311','LAK'],['rent','Recognize prepaid company house rent','5421','1310','LAK'],['restaurant','Recognize prepaid restaurant rent','9222','1312','THB']]){
  const e=reg.byCode(expense,c),p=reg.byCode(prepaid,c);
  if(!p)continue;
  const debit=e&&g.type(e)==='EXPENSE'?row(e,'debit','Monthly prepaid expense'):null;
  if(debit||id==='rent')add('amortization-'+id,name+' · '+c,[debit||slot('expense',c,'debit','Company house rent expense'),row(p,'credit','Release prepaid balance')]);
 }
 add('amortization-insurance','Recognize prepaid insurance expense · LAK',[slot('expense','LAK','debit','Insurance expense'),slot('prepaid','LAK','credit','Release prepaid insurance')],false);
 add('amortization-other','Recognize another prepaid expense · LAK',[slot('expense','LAK','debit','Prepaid expense allocation'),slot('prepaid','LAK','credit','Release prepaid balance')],false);
 return out;
}
function accepts(line,a){const g=G();return !!a&&(!line.currency||line.currency===g.currency(a))&&(line.role==='fund'?g.fund(a):line.role==='staff'?g.staff(a):line.role==='payer'?g.fund(a)||g.staff(a):line.role==='balance'?g.staff(a)||g.type(a)==='LIABILITY':line.role==='prepaid'?g.type(a)==='ASSET'&&/^13\d\d$/.test(String(a.code)):line.role==='expense'?g.type(a)==='EXPENSE'&&!g.technical(a):false);}
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
 const result=rows.map(l=>({...l})),used=new Set(),layout=makeRows(template);
 for(const [i,line] of (template.lines||[]).entries()){
  const a=resolve(line,chart),index=result.findIndex((l,j)=>!used.has(j)&&l.account_id&&(!line.side||!Number(l.debit)&&!Number(l.credit)||Number(l[line.side])>0)&&(a?.id===l.account_id||accepts(line,chart.find(a=>a.id===l.account_id))));
  if(index>=0){const current=result[index];result[index]={...current,role:line.role,expectedSide:line.side,expectedCurrency:line.currency,stage:line.stage,receiptLeg:line.receiptLeg,generated:layout[i].generated,autoMemo:layout[i].autoMemo,line_memo:current.line_memo||layout[i].line_memo};if(current.line_memo)result[index].autoMemo=current.autoMemo;if(!line.calculated||current.debit||current.credit)result[index].generated=current.generated;used.add(index);continue;}
  const empty=result.findIndex((l,j)=>!used.has(j)&&!l.account_id&&!l.line_memo&&!l.debit&&!l.credit),next=layout[i];
  if(empty>=0){result[empty]=next;used.add(empty);}else{result.push(next);used.add(result.length-1);}
 }
 return result;
}
root.JournalTemplateCatalog268={templates,accepts,resolve,match,merge};
})(globalThis);
