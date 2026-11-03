/* Editable journal drafts from the approved Complex Journal Protocol v3.
   Pure arithmetic: no posting, IDs, remote writes, inferred rates or FX plugs. */
((root)=>{'use strict';
const expenseMappings={5010:{USD:'9202',THB:'9201'},5111:{USD:'9211',THB:'9212'},5119:{THB:'9222'},5311:{USD:'9231',THB:'9232'},5315:{USD:'9233',THB:'9234'},5414:{USD:'9241',THB:'9242'}};
const incomeMappings={4010:{USD:'9102',THB:'9101'},4110:{USD:'9111',THB:'9112'},4120:{USD:'9121'},4130:{USD:'9131',THB:'9132'}};
const currency=a=>a?.currency||a?.currency_code;
const type=a=>String(a?.baseType||a?.type||a?.account_type||'').toUpperCase();
const technical=a=>a?.isTechnical||a?.is_technical||a?.type==='SYSTEM';
const available=a=>a?.id&&a.isPosting!==false&&a.is_posting!==false&&a.active!==false&&a.is_active!==false&&['LAK','USD','THB'].includes(currency(a));
// Funds in this chart are the 10xx family. Never treat employee clearing,
// prepayments or technical mappings as spendable foreign cash.
const fund=a=>available(a)&&type(a)==='ASSET'&&!technical(a)&&/^10\d{2}$/.test(String(a.code));
const obligation=a=>available(a)&&!technical(a)&&(type(a)==='LIABILITY'||/^12[12]\d$/.test(String(a.code)));
function rounded(value){if(!Number.isFinite(value)||Math.abs(value)>9e12)throw Error('Amount is too large to calculate safely.');return Math.round((value+Number.EPSILON)*100)/100;}
function positive(value,label){const n=Number(value);if(!Number.isFinite(n)||n<=0)throw Error('Enter a positive '+label+'.');return n;}
function money(value,label){const n=positive(value,label);if(Math.abs(n-rounded(n))>1e-8)throw Error(label+' must have no more than two decimal places.');return rounded(n);}
function build(input,chart,balances={}){
 const accounts=chart.filter(available),lookup=id=>accounts.find(a=>String(a.id)===String(id));
 const source=lookup(input.source),target=lookup(input.target),kind=input.kind;
 if(!['expense','income','payable','transfer'].includes(kind))throw Error('Choose a transaction type.');
 if(/BCEL Note/.test(input.rateSource||'')&&kind!=='transfer')throw Error('BCEL Note rates are only for an actual cash-counter currency exchange. Use the supported EFT or agreed settlement rate for this transaction.');
 if(!fund(source))throw Error('Choose the actual cash or bank account.');
 if(!target)throw Error('Choose the category, existing balance or receiving account.');
 if(target.id===source.id)throw Error('Choose two different accounts.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date||'')||new Date(input.date+'T00:00:00Z').toISOString().slice(0,10)!==input.date)throw Error('Choose a valid transaction date.');
 const c=currency(source),tc=currency(target),q=money(input.amount,'amount'),fee=Number(input.fee||0),lines=[],components=[];
 if(!Number.isFinite(fee)||fee<0||fee!==rounded(fee))throw Error('Enter a valid separate bank fee (up to two decimals).');
 if(kind==='income'&&fee)throw Error('Record a fee separately from an income receipt.');
 const sameTransfer=kind==='transfer'&&c===tc;
 const rt=c==='LAK'?1:sameTransfer&&!fee?null:positive(input.rate,'transaction rate in LAK per '+c);
 let rb=1;
 if(c!=='LAK'&&kind!=='income'){
  const balance=balances[source.id];rb=positive(balance?.rate,'recorded book rate for '+source.name);
  if(!Number.isFinite(balance?.quantity)||balance.quantity<q+fee-1e-8)throw Error('The recorded '+c+' balance cannot cover this payment and fee. Check earlier entries first.');
 }
 const fmt=n=>String(rounded(n)),rateLabel=n=>String(Number(Number(n).toFixed(8)));
 function system(code,ccy){const a=accounts.find(a=>String(a.code)===String(code)&&currency(a)===ccy);if(!a)throw Error('Required account '+code+' ('+ccy+') is missing, inactive or unavailable. Update the account setup before generating this transaction.');return a;}
 function line(a,side,n,memo,fx=1,book=null){n=rounded(n);if(!n)return;if(n<0)throw Error('Invalid negative journal amount.');lines.push({account_id:a.id,code:String(a.code),name:a.name,currency:currency(a),debit:side==='debit'?n:0,credit:side==='credit'?n:0,fx_rate_lak:currency(a)==='LAK'?1:fx,book_rate_lak:currency(a)==='LAK'?null:book,line_memo:memo});}
 function fx(n,label,offset){n=rounded(n);if(!n)return;components.push({label,loss:n});line(system('5419','LAK'),n>0?'debit':'credit',Math.abs(n),label+' · '+(n>0?'loss':'gain')+' '+fmt(Math.abs(n))+' LAK');if(offset)line(offset,n>0?'credit':'debit',Math.abs(n),label+' · valuation bridge');}
 function expense(a,amount,word){
  if(currency(a)!=='LAK'||type(a)!=='EXPENSE'||technical(a))throw Error('Choose the actual LAK expense category.');
  if(c==='LAK'){line(a,'debit',amount,word);line(source,'credit',amount,word+' · paid from '+source.name);return;}
  const code=expenseMappings[String(a.code)]?.[c];if(!code)throw Error(a.name+' has no approved '+c+' mapping. Choose the correct category after its mapping is configured; do not use another expense to force a balance.');
  const economic=rounded(amount*rt),book=rounded(amount*rb);
  line(system(code,c),'debit',amount,word+' · foreign mapping at book rate '+rateLabel(rb),rt,rb);
  line(source,'credit',amount,word+' · paid; book rate '+rateLabel(rb),rt,rb);
  line(a,'debit',economic,word+' · '+fmt(amount)+' '+c+' × '+rateLabel(rt));
  line(system('9290','LAK'),'credit',book,word+' · foreign cash book value');fx(book-economic,word+' cash FX');
 }
 let title='';
 if(kind==='expense'){expense(target,q,target.name);title=target.name+' paid from '+source.name;}
 if(kind==='income'){
  if(tc!=='LAK'||!['REVENUE','INCOME'].includes(type(target))||technical(target))throw Error('Choose the actual LAK income category.');
  if(c==='LAK'){line(source,'debit',q,'Income received');line(target,'credit',q,target.name);}
  else{const code=incomeMappings[String(target.code)]?.[c];if(!code)throw Error(target.name+' has no approved '+c+' income mapping.');const v=rounded(q*rt);line(source,'debit',q,'Income received · '+rateLabel(rt)+' LAK/'+c,rt);line(system(code,c),'credit',q,target.name+' · foreign mapping',rt);line(system('9190','LAK'),'debit',v,'Income mapping · LAK equivalent');line(target,'credit',v,target.name+' · '+fmt(q)+' '+c+' × '+rateLabel(rt));}
  title=target.name+' received in '+source.name;
 }
 if(kind==='transfer'){
  if(!fund(target))throw Error('Choose the actual receiving cash or bank account.');
  if(c===tc){if(input.received&&money(input.received,'amount received')!==q)throw Error('A same-currency transfer must move the same amount. Enter any separate bank fee in the fee field.');line(target,'debit',q,'Transfer from '+source.name,c==='LAK'?1:rb,c==='LAK'?null:rb);line(source,'credit',q,'Transfer to '+target.name,c==='LAK'?1:rb,c==='LAK'?null:rb);title='Transfer from '+source.name+' to '+target.name;}
  else{
   const received=money(input.received,'gross amount received'),rr=tc==='LAK'?1:positive(input.receiveRate,'receiving-currency rate in LAK per '+tc),sentValue=rounded(q*rb),receivedValue=rounded(received*rr),bridge=system('9010','LAK');
   if(c==='LAK'){line(bridge,'debit',q,'Currency exchange · LAK paid');line(source,'credit',q,'Currency exchange · amount paid');}
   else{line(system(c==='USD'?'9011':'9012',c),'debit',q,'Exchange · outgoing foreign bridge',rt,rb);line(source,'credit',q,'Exchange · cash released at book rate '+rateLabel(rb),rt,rb);}
   line(target,'debit',received,'Exchange · amount received',rr);
   if(tc==='LAK')line(bridge,'credit',sentValue,'Exchange · outgoing cash book value');
   else line(system(tc==='USD'?'9011':'9012',tc),'credit',received,'Exchange · incoming foreign bridge',rr);
   fx(sentValue-receivedValue,'Currency exchange FX',tc==='LAK'?null:bridge);title='Exchange '+fmt(q)+' '+c+' for '+fmt(received)+' '+tc;
  }
 }
 if(kind==='payable'){
  if(!obligation(target))throw Error('Choose the existing payable or staff clearing account.');
  if(!String(input.reference||'').trim())throw Error('Enter the original entry or payroll period being settled.');
  if(c!=='LAK'&&tc!=='LAK'&&c!==tc)throw Error('Different foreign-currency payable settlements require a reviewed manual entry.');
  const discharge=tc===c?q:money(input.discharge,'balance amount cleared'),rp=tc==='LAK'?1:positive(input.payableRate,'book rate of the specific balance being cleared'),value=rounded(discharge*rp),cash=rounded(q*rb),ref=String(input.reference).trim();
  const rs=tc==='LAK'?1:c==='LAK'?q/discharge:rt;
  if(c===tc&&c==='LAK'){line(target,'debit',q,'Settle '+ref);line(source,'credit',q,'Payment of '+ref);}
  else{
   const bridge=system('9010','LAK');
   line(target,'debit',discharge,'Settle '+ref+' · original book value',rs,tc==='LAK'?null:rp);
   if(tc!=='LAK')line(system(tc==='USD'?'9011':'9012',tc),'credit',discharge,'Settlement · payable book value',rs,rp);
   if(c!=='LAK')line(system(c==='USD'?'9011':'9012',c),'debit',q,'Settlement · cash book value',rt,rb);
   line(source,'credit',q,'Payment of '+ref+' · cash book value',c==='LAK'?1:rt,c==='LAK'?null:rb);
   if(tc==='LAK'){line(bridge,'credit',cash,'Settlement · foreign cash book value');fx(cash-value,'Cash settlement FX');}
   else if(c==='LAK'){line(bridge,'debit',value,'Settlement · payable book value');fx(cash-value,'Payable settlement FX');}
   else{const settled=rounded(q*rt);fx(settled-value,'Payable settlement FX',bridge);fx(cash-settled,'Cash disposal FX',bridge);}
  }
  title='Settle '+ref+' from '+source.name;
 }
 if(fee)expense(system('5414','LAK'),fee,'Bank fee');
 const totals={};let baseBalance=0;
 for(const l of lines){const t=totals[l.currency]||(totals[l.currency]={debit:0,credit:0});t.debit=rounded(t.debit+l.debit);t.credit=rounded(t.credit+l.credit);baseBalance=rounded(baseBalance+rounded(l.debit*(l.book_rate_lak||l.fx_rate_lak))-rounded(l.credit*(l.book_rate_lak||l.fx_rate_lak)));}
 if(Object.values(totals).some(t=>Math.abs(t.debit-t.credit)>.001)||Math.abs(baseBalance)>.001)throw Error('Generated lines do not balance. Review the transaction inputs.');
 const detail=String(input.detail||'').trim(),sourceText=String(input.rateSource||'BCEL EFT').trim(),url=String(input.rateUrl||'').trim();
 if(url&&!/^https?:\/\/[^\s<>]+$/.test(url))throw Error('Use an http or https rate-source link.');
 let description=(detail?detail+' · ':'')+title+' · '+fmt(q)+' '+c+(fee?' + fee '+fmt(fee)+' '+c:'');
 if(lines.some(l=>l.currency!=='LAK'))description+='\n'+(sameTransfer?'Source account book value retained.':sourceText+(rt&&c!=='LAK'?' · '+rateLabel(rt)+' LAK/'+c:''))+(url?' · Rate Source: '+url:'');
 return {date:input.date,lines,description,totals,fxLoss:rounded(components.reduce((n,x)=>n+x.loss,0)),components};
}
root.JournalGenerator257={build,expenseMappings,incomeMappings,fund,obligation,available,currency,type,technical};
})(globalThis);
