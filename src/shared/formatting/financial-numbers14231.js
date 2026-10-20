/* Shared money presentation. Symbols never enter the editable or saved value. */
(()=>{'use strict';const native=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
const app=()=>{try{return typeof ApplicationSettings!=='undefined'?ApplicationSettings:{system:{numberFormat:parent.PhoneApp132?.numberFormat?.()||'1,234.56'}}}catch{return null}};
const excluded=n=>/^(vacationAllowance|sickAllowance|minorSickAllowance|personalAllowance|bereavementAllowance)$/.test(n.name)||/year|month|date|phone|code|prefix|sequence|digits|identifier|(?:^|[_-])id(?:$|[_-])|timeout|warning|width|height|font|margin/i.test(n.id+' '+n.name)||n.closest('#document-editor105,.page-setup1427,.doc-images-dialog112');
const monetary=n=>['text','number'].includes(n.type)&&!n.matches('[role=combobox],.account-search1428,.je-line-acc')&&!/description|name|memo|reference|type|email|phone|status|frequency|currency/i.test(n.id+' '+n.name)&&!excluded(n)&&!/percent|percentage|exchange|hours|days|minutes|quantity|qty|count|(?:^|[_-])age(?:$|[_-])/i.test(n.id+' '+n.name)&&(n.matches('.je-line-dr,.je-line-cr,.staff-entry-debit,.staff-entry-credit,.staff-line-amount,.v56-amount,.fund-allocation-input,.adjustment-input69,[data-financial-number],[data-debit],[data-credit],[data-staff-amount],[data-simple="amount"],.num')||/salary|wage|amount|gross|netpay|taxable|taxbase|opening|closing|balance|advance|reimbursement|deduction|bonus|allowance|penalty|ceiling|ssoMaxBase|pit.*(?:from|to)/i.test(n.id+' '+n.name));
function separators(){const style=app()?.system?.numberFormat;return style==='1.234,56'?['.',',']:style==='1 234,56'?[' ',',']:[',','.']}
function grouped(raw,places=2){const [group,decimal]=separators(),text=String(raw),negative=text.trim().startsWith('-');if(!text)return '';const cleaned=text.replace(new RegExp('[^0-9'+(decimal==='.'?'\\.':',')+']','g'),''),parts=cleaned.split(decimal),whole=(parts.shift()||'0');return (negative?'-':'')+whole.replace(/\B(?=(\d{3})+(?!\d))/g,group)+(cleaned.includes(decimal)&&places?decimal+parts.join('').slice(0,places):'')}
function parse(raw){const [group,decimal]=separators();return Number(String(raw).split(group).join('').replace(decimal,'.'))}
function format(n){const before=native.get.call(n),at=n.selectionStart??before.length,meaningful=ch=>/\d/.test(ch)||ch===separators()[1]||ch==='-',digits=[...before.slice(0,at)].filter(meaningful).length,result=grouped(before,Number(n.dataset.precision88||2));if(result===before)return;native.set.call(n,result);let i=0,count=0;while(i<result.length&&count<digits){if(meaningful(result[i]))count++;i++}if(at===before.length)i=result.length;try{n.setSelectionRange(i,i)}catch{}}
function bridge(n){if(n.type!=='number'||n.dataset.numeric88||excluded(n))return;const initial=n.value;n.type='text';n.inputMode='decimal';n.dataset.numeric88='true';n.dataset.precision88=n.step==='any'?'6':n.step.includes('.')?String(n.step.split('.')[1].length):monetary(n)?'2':'0';Object.defineProperty(n,'value',{configurable:true,get(){const raw=native.get.call(this);return raw?String(parse(raw)):''},set(v){const [,decimal]=separators();native.set.call(this,v===''?'':grouped(String(v).replace('.',decimal),Number(this.dataset.precision88)))}});Object.defineProperty(n,'valueAsNumber',{configurable:true,get(){return this.value?Number(this.value):NaN},set(v){this.value=Number.isFinite(v)?v:''}});n.value=initial}
function accounts(){try{return typeof AccountingStore!=='undefined'?AccountingStore.accounts:parent.PhoneApp132?.accounts()||[]}catch{return []}}
function code(n){if(n.id==='recStatement71'&&typeof currentReport71!=='undefined')return currentReport71?.currency||'';const row=n.closest('tr,.journal-line132,.staff-line14225,.simple-row1430'),value=row?.querySelector('.je-line-acc')?.value;let account;if(value&&typeof getSelectedAccountInfo==='function')account=getSelectedAccountInfo(value);if(!account&&row)for(const select of row.querySelectorAll('select')){account=accounts().find(a=>String(a.id||a.code)===select.value);if(account)break}if(account)return account.currency_code||account.currency||'';const allocation=accounts().find(a=>String(a.id||a.code)===String(n.dataset.fundId||'').split('|')[0]);if(allocation)return allocation.currency_code||allocation.currency;const form=n.form||n.closest('form,.card'),currency=form?.querySelector('[name="currency"],#recurringCurrency,[name="payCurrency"],[data-currency-select]');return n.dataset.currency||n.closest('[data-currency-code]')?.dataset.currencyCode||currency?.value||n.closest('.journal-money102')?.dataset.currency||baseCurrency14231()}
const symbol=c=>({LAK:'₭',USD:'$',THB:'฿',EUR:'€'}[c]||c||'¤');
function money(n){let wrap=n.closest('.journal-money102,.simple-amount1444,.money-field14231');if(!wrap){wrap=document.createElement('span');wrap.className='money-field14231';n.before(wrap);wrap.append(n)}let mark=wrap.querySelector('.journal-currency102,[data-currency1430],.money-symbol14231');if(!mark){mark=document.createElement('span');mark.className='money-symbol14231';wrap.prepend(mark)}mark.classList.add('money-symbol14231');const c=wrap.classList.contains('journal-money102')?wrap.dataset.currency||'':code(n);if(mark.dataset.currencyCode!==c)mark.dataset.currencyCode=c;mark.title=c;const text=c?symbol(c):'';if(mark.textContent!==text)mark.textContent=text;n.dataset.money14231='true';n.style.setProperty('text-align','right','important');if(wrap.hidden!==n.hidden)wrap.hidden=n.hidden;}
function baseCurrency14231(){try{return typeof CurrencyStore!=='undefined'?(CurrencyStore.currencies.find(c=>c.isBase)?.code||'LAK'):'LAK'}catch{return 'LAK'}}
function displayCurrency14231(n){const row=n.closest('tr'),table=n.closest('table'),index=n.cellIndex,header=table?.tHead?.rows[table.tHead.rows.length-1]?.cells[index]?.textContent||'';if(/(?:^|\b)(?:id|code|number|quantity|qty|count|entries|days|hours|age|year|rate|percent|%)\b/i.test(header))return null;const codes=['LAK','USD','THB','EUR'];const col=codes.find(c=>new RegExp('\\b'+c+'\\b').test(header));if(col)return col;const badge=row?.querySelector('[data-currency-code],.currency-symbol-badge');if(badge)return badge.dataset.currencyCode||badge.title||({'₭':'LAK','$':'USD','฿':'THB','€':'EUR'}[badge.textContent.trim()]);const cell=row&&[...row.cells].find(c=>codes.includes(c.textContent.trim()));if(cell)return cell.textContent.trim();if(row){let prev=row.previousElementSibling;while(prev){const currency=prev.querySelector('[data-currency-code]');if(currency)return currency.dataset.currencyCode;prev=prev.previousElementSibling}}return n.dataset.currency||n.closest('[data-currency-code]')?.dataset.currencyCode||baseCurrency14231()}
const within=(root,selector)=>[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
function displays(root=document){within(root,'td.num,td.amount82,.currency-cell97,[data-financial-display],.personal-recent1437 b,.th-money-grid strong').forEach(n=>{if(n.childElementCount)return;const text=n.textContent.trim(),match=text.match(/^(?:([₭$฿€]|LAK|USD|THB|EUR)\s*)?(-?[0-9][0-9,. ]*)(?:\s*([₭$฿€]|LAK|USD|THB|EUR))?$/);if(!match)return;const currency=match[1]||match[3]||displayCurrency14231(n);if(!currency)return;const mark=document.createElement('span'),value=document.createElement('span');mark.className='financial-display-symbol14231';mark.textContent=symbol(currency);value.className='financial-display-value14231';value.textContent=match[2].trim();n.classList.add('financial-display14231');n.replaceChildren(mark,value)})}
function scan(root=document){within(root,'input').forEach(n=>{bridge(n);if(monetary(n)){money(n);format(n)}});displays(root)}
// Immediate Post Entry amount suffixes; receipt/account/memo fields are excluded.
const shortcutField143126=n=>n instanceof HTMLInputElement&&!n.disabled&&!n.readOnly&&!!n.closest('#journalEntry98')&&n.matches('.je-line-dr,.je-line-cr,[data-simple="amount"]');
function expandAmount143126(input,key){
 const powers={h:2,k:3,m:6,t:12},power=powers[key.toLowerCase()];
 if(power===undefined)return false;
 const raw=native.get.call(input),end=input.selectionEnd??raw.length,start=input.selectionStart??end;
 // A suffix applies to the complete number before it, never a middle selection.
 if(start!==raw.length||end!==raw.length)return false;
 const [group,decimal]=separators(),text=raw.split(group).join('').replace(decimal,'.').trim();
 if(!/^\d+(?:\.\d*)?$/.test(text))return false;
 const [whole,fraction='']=text.split('.'),digits=whole+fraction,pivot=whole.length+power;
 const expanded=digits.padEnd(pivot,'0'),integer=(expanded.slice(0,pivot)||'0').replace(/^0+(?=\d)/,''),tail=expanded.slice(pivot).replace(/0+$/,'');
 if(tail.length>2||BigInt(integer)*100n+BigInt((tail||'').padEnd(2,'0'))>BigInt(Number.MAX_SAFE_INTEGER)){window.showCenterStatus?.('That amount exceeds the supported exact amount range.',true);return false;}
 const result=grouped(integer+(tail?decimal+tail:''),2);
 window.JournalUndo143103?.checkpoint();native.set.call(input,result);
 input.setSelectionRange(result.length,result.length);
 input.dispatchEvent(new Event('input',{bubbles:true}));window.JournalUndo143103?.record();return true;
}
function shortcut143126(e){
 const input=e.target;if(!shortcutField143126(input)||e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return;
 const key=e.type==='keydown'?e.key:e.inputType==='insertText'?e.data:null;
 if(!key||!key.match(/^[a-z]$/i))return;
 e.preventDefault();expandAmount143126(input,key);
}
document.addEventListener('keydown',shortcut143126,true);
document.addEventListener('beforeinput',shortcut143126,true);
function ready(){scan();document.addEventListener('focusin',e=>{const n=e.target;if(n instanceof HTMLInputElement&&!excluded(n)&&(n.dataset.numeric88||monetary(n)))format(n)});document.addEventListener('input',e=>{const n=e.target;if(n instanceof HTMLInputElement&&!excluded(n)&&(n.dataset.numeric88||monetary(n))){format(n);if(monetary(n))money(n)}});document.addEventListener('change',()=>scan());document.addEventListener('formdata',e=>e.target.querySelectorAll('[data-numeric88]').forEach(n=>{if(n.name&&!n.disabled)e.formData.set(n.name,n.value)}));const pending=new Set();let queued=false;
new MutationObserver(records=>{
 for(const r of records){
  // A currency/header change can affect sibling values. Revisit that table or
  // form, but never unrelated retained workspaces.
  const target=r.target.nodeType===1?r.target:r.target.parentElement;
  if(!target||target.closest('.financial-display-symbol14231,.financial-display-value14231,.money-symbol14231'))continue;
  const context=target.closest('table,form,.journal-line132,.staff-line14225,.simple-row1430');
  if(context)pending.add(context);
  else {if(target.matches('td.num,td.amount82,.currency-cell97,[data-financial-display],.personal-recent1437 b,.th-money-grid strong'))pending.add(target);for(const n of r.addedNodes)if(n.nodeType===1)pending.add(n);}
 }
 if(queued||!pending.size)return;queued=true;requestAnimationFrame(()=>{queued=false;const roots=new Set(pending);pending.clear();for(const root of roots){let parent=root.parentElement;while(parent&&!roots.has(parent))parent=parent.parentElement;if(root.isConnected&&!parent)scan(root)}});
}).observe(document.body,{childList:true,subtree:true,characterData:true});}
window.financialNumbers14231={scan};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();})()