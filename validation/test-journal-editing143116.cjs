// NODE_PATH=/tmp/accounting-calendar143115/node_modules node validation/test-journal-editing143116.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{parseHTML}=require('linkedom');
function fixture(html=''){
 const dom=parseHTML('<html><body>'+html+'</body></html>'),document=dom.document;
 const c={document,HTMLInputElement:dom.HTMLInputElement,Event:dom.Event,MutationObserver:class{observe(){}},requestAnimationFrame:()=>{},queueMicrotask:()=>{},matchMedia:()=>({matches:false,addEventListener(){}}),console,Intl,Date,saveSettingsGroup(){},ApplicationSettings:{system:{numberFormat:'1,234.56'},accounting:{decimalPlaces:2}},AccountingStore:{accounts:[]},CurrencyStore:{currencies:[]},addEventListener(){},formatAppDate:v=>'Formatted '+v};c.window=c;c.parent=c;vm.createContext(c);
 c.run=p=>vm.runInContext(fs.readFileSync(p,'utf8'),c,{filename:p});
 for(const n of document.querySelectorAll('input')){n.setSelectionRange=(s,e)=>{n.selectionStart=s;n.selectionEnd=e};n.setCustomValidity=()=>{};for(const prop of ['step','min','max'])Object.defineProperty(n,prop,{get(){return this.getAttribute(prop)||''}});}
 return c;
}
const c=fixture('<input id="amount" class="je-line-dr num" type="text"><input id="salary" type="number" step="0.01"><input data-fx-rate14383="USD" inputmode="decimal" type="text">');
c.run('src/shared/formatting/numbers.js');c.run('src/shared/presentation/design-system-v58.js');c.run('src/core/auth/session-inputs-v88.js');c.run('src/shared/formatting/financial-numbers14231.js');c.run('src/shared/formatting/numeric-caret14257.js');
const native=Object.getOwnPropertyDescriptor(c.HTMLInputElement.prototype,'value'),raw=n=>native.get.call(n);
function input(n,value,at){native.set.call(n,value);n.setSelectionRange(at,at);n.dispatchEvent(new c.Event('input',{bubbles:true}));}
for(const style of ['1,234.56','1.234,56','1 234,56']){
 c.ApplicationSettings.system.numberFormat=style;
 const group=style==='1,234.56'?',':style==='1.234,56'?'.':' ',decimal=style==='1,234.56'?'.':',';
 for(const n of [c.document.getElementById('amount'),c.document.getElementById('salary')]){
  input(n,`5${group}000${group}000`,1);n.dispatchEvent(new c.Event('focus',{bubbles:true}));assert.equal(raw(n),`5${group}000${group}000`);assert.equal(n.selectionStart,1);
  input(n,`${group}000${group}000`,0);assert.equal(raw(n),`000${group}000`,'remaining six zeros retained');assert.equal(n.selectionStart,0);
  // A background currency/amount rescan must not collapse the edit either.
  c.financialNumbers14231.scan();assert.equal(raw(n),`000${group}000`);assert.equal(n.selectionStart,0);
  input(n,`6000${group}000`,1);assert.equal(raw(n),`6${group}000${group}000`);assert.equal(n.selectionStart,1);assert.equal(c.parseAppNumber(raw(n)),6000000);
  input(n,`6${group}000${group}000${decimal}50`,10);assert.equal(raw(n),`6${group}000${group}000${decimal}50`);assert.equal(n.selectionStart,10,'decimal position remains stable');
 }
 const rate=c.document.querySelector('[data-fx-rate14383]');input(rate,`21400${decimal}12345678`,14);assert.equal(raw(rate),`21${group}400${decimal}12345678`,'rates keep eight decimals');
 assert.equal(c.formatAppRate(21400.12345678),new Intl.NumberFormat(c.appNumberLocale(),{maximumFractionDigits:8}).format(21400.12345678));
}
c.ApplicationSettings.system.numberFormat='1,234.56';const amount=c.document.getElementById('amount');input(amount,'000,000',0);c.finishAppNumberEditing(amount);assert.equal(raw(amount),'0.00','normalization happens on commit');
// Execute the real date-mode functions and all their change listeners.
const d=fixture('<section id="journalEntry98"><input id="jeTransDate" type="date" value="2025-12-31"><input id="jeMultipleDates" type="checkbox"><input id="jeSingleDate" type="checkbox"><table><tbody id="jeLinesBody"><tr><td><input class="je-line-date" type="date" value="2026-10-19"></td></tr></tbody></table><div id="simpleRows1430"><input data-simple="date" type="date" value="2026-10-19"></div></section>');
Object.assign(d,{syncCoaDatalist(){},addJournalLineRow(){},setupJournalColumns(){},calculateJournalBalance(){},submitJournalEntry(){},loadEntryForEdit(){},getSelectedAccountInfo(){return null},parseCleanNumber(){return 0}});
d.run('src/bookkeeping/journal/multiple-dates-and-currency-badges.js');d.run('src/bookkeeping/journal/transactions-v67/date-mode-and-edit.js');d.run('src/shared/formatting/universal-date-v104.js');
const dates=[...d.document.querySelectorAll('.je-line-date,[data-simple=date]')];
d.setJournalDateMode(true,true);for(const n of dates){assert.equal(n.value,'2025-12-31');assert.equal(n.closest('.oj-date-shell104').querySelector('.oj-date-label104').textContent,'Formatted 2025-12-31');}
dates[0].value='2025-12-15';dates[1].value='2025-12-20';d.setJournalDateMode(true);assert.equal(dates[0].value,'2025-12-15');assert.equal(dates[1].value,'2025-12-20','restored dates retained');
dates[1].dispatchEvent(new d.Event('change',{bubbles:true}));const main=d.document.getElementById('jeTransDate');main.value='2025-11-30';main.dispatchEvent(new d.Event('change',{bubbles:true}));assert.equal(dates[0].value,'2025-11-30');assert.equal(dates[1].value,'2025-12-20','manual date retained');
console.log('PASS: digit-preserving editing, caret, rescans, locales, precise grouped rates, date inheritance, calendar labels and restored/manual dates.');

// Exercise selected-cell clipboard handling and the actual account picker together.
const grid=fixture('<section id="journalEntry98"><table><tbody id="jeLinesBody"><tr><td><div class="account-input-wrap"><span class="currency-symbol-badge">₭</span><input class="je-line-acc" list="coaList" value="102 — Bank"></div></td><td><input class="je-line-memo" value="Opening money"></td><td><span>₭</span><input class="je-line-dr" value="5,000,000"></td><td><input class="je-line-cr" value="5,000,000"></td></tr></tbody></table></section><datalist id="coaList"><option value="101 — Cash"></option><option value="102 — Bank"></option></datalist>');
grid.matchMedia=()=>({matches:true,addEventListener(){}});grid.innerWidth=1200;grid.innerHeight=800;grid.setTimeout=()=>{};grid.performance={now:()=>1000};
grid.AccountingStore.accounts=[{id:'1',code:'101',name:'Cash',currency:'LAK',type:'ASSET'},{id:'2',code:'102',name:'Bank',currency:'LAK',type:'ASSET'}];
grid.getSelectedAccountInfo=value=>grid.AccountingStore.accounts.find(a=>value.startsWith(a.code));
Object.defineProperty(grid.document.getElementById('coaList'),'options',{get(){return this.querySelectorAll('option')}});
const proto=Object.getPrototypeOf(grid.document.body);proto.getBoundingClientRect=()=>({left:10,top:10,bottom:40,width:200});proto.scrollIntoView=()=>{};
// linkedom omits capture ordering; run registered document capture listeners first.
const captures=new Map(),listen=grid.document.addEventListener.bind(grid.document);grid.document.addEventListener=(type,fn,options)=>{if(options===true){if(!captures.has(type))captures.set(type,[]);captures.get(type).push(fn);}else listen(type,fn,options);};
grid.run('src/shared/formatting/numbers.js');grid.run('src/bookkeeping/journal/cell-editing143116.js');grid.run('src/shared/ui/account-picker1428.js');
const dr=grid.document.querySelector('.je-line-dr'),cr=grid.document.querySelector('.je-line-cr'),account=grid.document.querySelector('.je-line-acc');
function event(target,type,props={}){const e=Object.assign(new grid.Event(type,{bubbles:true,cancelable:true}),props);e.target=target;for(const listener of captures.get(type)||[]){listener(e);if(e._stopImmediatePropagationFlag)break;}if(!e.cancelBubble)target.dispatchEvent(e);return e;}
event(dr,'pointerdown',{button:0});event(dr,'click');assert.equal(dr.value,'5,000,000');assert.equal(grid.JournalCells143116.editing(dr),false);assert.ok(dr.closest('td').classList.contains('cell-selected143116'));
let clipboard='';event(dr.closest('td'),'copy',{clipboardData:{setData:(type,text)=>clipboard=text}});assert.equal(clipboard,'5,000,000');assert.ok(!clipboard.includes('₭'));
event(cr,'pointerdown',{button:0});event(cr,'click');event(cr.closest('td'),'paste',{clipboardData:{getData:()=> '6,000,000'}});assert.equal(cr.value,'6,000,000.00');assert.equal(dr.value,'5,000,000');
event(dr,'dblclick');assert.equal(grid.JournalCells143116.editing(dr),true);assert.equal(dr.value,'5,000,000','double click never clears numbers');
event(account,'pointerdown',{button:0});event(account,'click');assert.equal(account.value,'102 — Bank');assert.ok(!grid.document.querySelector('.account-list1428'),'single click does not open populated picker');
event(account,'dblclick');assert.equal(account.value,'');let options=grid.document.querySelectorAll('.account-option1428');assert.equal(options.length,2);assert.ok(options[0].textContent.includes('Bank'),'previous selection moves to top');options[1].click();assert.equal(account.value,'101 — Cash');assert.equal(grid.JournalCells143116.editing(account),false,'choosing returns to cell selection');
event(account,'pointerdown',{button:0});event(account,'click');assert.equal(account.value,'101 — Cash','returning to a cell preserves its selection');
console.log('PASS: cell select/copy/paste, numeric double-click preservation, account clear/search, previous-first ordering and selection after choosing.');
// Report rows use saved rates; running direction belongs with the running balance.
const reports=fixture();Object.assign(reports,{Accounts69:{},JournalModule:{entries:[]},switchTab(){},refreshAllTables(){},logoutDemoUser(){},escapeHtml:v=>String(v).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),money69:n=>(n/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),balanceText69:n=>reports.money69(Math.abs(n))+' '+(n<0?'CR':'DR')});
Object.defineProperty(Object.getPrototypeOf(reports.document.createElement('tr')),'cells',{get(){return this.querySelectorAll('td,th')}});
reports.run('src/shared/formatting/numbers.js');reports.run('src/reports/financial/reports-desktop-v79.js');
const valuation={currency:'Recorded valuation detail',headers:['Account','Original balance','LAK value','Rate'],values:[['Bank','100 USD','2,140,000.00','21,400 LAK / USD']],metrics:[],note:''};
reports.ForeignFunds14386={hierarchy:rows=>rows,select:rows=>rows,reportDetails:()=>valuation};
reports.reportData79=()=>[{currency:'LAK',sourceCurrency:'USD',key:'bank',account:{name:'Bank',type:'ASSET'},opening:0,debit:214000000,credit:0,closing:214000000,original:{closing:10000},lines:[{id:'OJM260001',date:'2025-12-31',dr:214000000,cr:0,book_rate_lak:21400,originalCurrency:'USD',memo:'Opening money',originalIndex:0}]}];
reports.run('src/reports/financial/reports-v118.js');
const gl=reports.reportModel79('gl');assert.equal(gl[0].values[0][2],'Bank');assert.equal(gl[0].values[0][4],'21,400');assert.equal(gl[0].values[0].at(-1),'2,140,000.00 DR');assert.deepEqual(gl[1],valuation,'supplemental detail remains intact');
const table=reports.reportTable79(gl[0].headers,gl[0].values,'LAK');assert.ok(table.includes('--report-id-width143116:calc(11ch + 16px)'));assert.ok(table.includes('data-account="Bank"'));assert.ok(table.includes('data-ledger-column143108="description"'));
const tb=reports.reportModel79('tb')[0],tbHtml=reports.reportTable79(tb.headers,tb.values,'LAK');assert.ok(tbHtml.includes('trial-columns143116'));assert.equal((tbHtml.match(/<th data-trial-column143116="amount"/g)||[]).length,5);assert.ok(tbHtml.includes('data-trial-column143116="account"'));
console.log('PASS: grouped saved rates, clean account labels, running direction, untouched valuation detail and semantic ledger/trial-balance widths.');
