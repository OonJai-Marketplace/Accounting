const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),fixture=require('./payroll-source-fixture286.cjs');
const read=p=>fs.readFileSync(p,'utf8'),tick=()=>new Promise(r=>setTimeout(r,65));
(async()=>{
 const dom=new JSDOM(fixture.html,{url:'https://fixture.test',runScripts:'dangerously',pretendToBeVisual:true}),w=dom.window,d=w.document;
 try{
  w.eval('('+fixture.baseSetup.toString()+')();('+fixture.lifecycleSetup.toString()+')();('+fixture.setup.toString()+')();');fixture.scripts().forEach(s=>w.eval(s));await tick();
  const quote={rateDate:'2026-10-30',rateSource:'BCEL EFT rate'};
  assert.equal(w.payrollRateSource287(quote),'[BCEL EFT rate](https://www.bcel.com.la/bcel/exchange-rate.html?exDate=2026-10-30&lang=en)');assert.equal(w.payrollRateSource287({...quote,rateSource:'Paid at receipt rate'}),'Paid at receipt rate');assert.equal(w.payrollRateSource287({...quote,rateSource:''}),'');
  Object.assign(w.Work82.run,quote);w.renderWork82();await tick();assert(d.querySelector('#runMeta95 [role=textbox] a[href*="exDate=2026-10-30"]'));
  const original=22192.7228566718;
  for(const [style,display] of [['1,234.56','22,192.72'],['1.234,56','22.192,72'],['1 234,56','22\u202f192,72']]){
   w.ApplicationSettings.system={numberFormat:style};const n=d.createElement('input');d.body.append(n);w.bindAppRateInput(n,original);assert.equal(n.value,display);assert.equal(w.formatAppRate(original,true),display);n.focus();n.blur();assert.equal(w.readAppRateInput(n),original,'no-op blur preserves exact stored rate');
   n.value=style==='1,234.56'?'22,273.25':'22273,25';n.dispatchEvent(new w.Event('input'));assert.equal(w.readAppRateInput(n),22273.25);n.remove();
  }
  w.ApplicationSettings.system={numberFormat:'1,234.56'};w.Work82.run.rates.USD=original;w.renderWork82();await tick();
  const rate=d.querySelector('#runMeta95 [name=rate_USD]');assert.equal(rate.value,'22192.72');rate.focus();rate.blur();w.updateRun82();assert.equal(w.Work82.run.rates.USD,original);await w.saveRun82(false);assert.equal(w.qa276.record.data.rates.USD,original,'payroll save preserves full rate');
  // The actual main-journal collector must also retain that value on restore/save.
  d.querySelector('#journalEntry98').insertAdjacentHTML('afterbegin','<div class="je-meta-grid"></div>');w.addJournalLineRow('1220 — Test Employee','',200,{});w.collectLiveJournalGroups=()=>({grouped:{},errors:[]});w.currencySymbolV6=c=>c;w.eval(read('src/bookkeeping/journal/foreign-currency14383.js'));w.JournalFX14383.restore({USD:original});
  const journal=d.querySelector('[data-fx-rate14383=USD]');assert(journal);assert.equal(journal.value,'22,192.72');journal.focus();journal.blur();assert.equal(w.JournalFX14383.rate('USD'),original);assert.equal(w.JournalFX14383.base({currency:'USD',debit:200,book_rate_lak:original},'debit'),4438544.57);
  journal.value='22,273';journal.dispatchEvent(new w.Event('input',{bubbles:true}));journal.focus();journal.blur();assert.equal(w.JournalFX14383.rate('USD'),22273);
  const text='Historical entry. [Source rate](https://www.bcel.com.la/bcel/exchange-rate.html?lang=en) USD: 21,178 LAK/USD · BCEL 2026-01-30, Round 1. USD: 21,392 LAK/USD · BCEL 2026-01-07, Round 1.',before=text;
  const links=w.JournalMemoLinks143187.parts(text).filter(p=>p.href);assert.equal(links.length,2);assert(links[0].href.includes('exDate=2026-01-30'));assert(links[1].href.includes('exDate=2026-01-07'));assert.equal(text,before,'closed journal text remains immutable');
  const actual='[Source rate](https://example.test/receipt) BCEL 2026-01-30, Round 1.';assert.equal(w.JournalMemoLinks143187.parts(actual).filter(p=>p.href)[0].href,'https://example.test/receipt');
  const ambiguous='[Source rate](https://www.bcel.com.la/bcel/exchange-rate.html?lang=en) Entry date 2026-01-30; actual rate 676.';assert(!w.JournalMemoLinks143187.parts(ambiguous).some(p=>p.href?.includes('exDate=')),'never manufacture a quote date for an actual-rate receipt');
  const target=d.createElement('div');target.innerHTML=w.journalMemoHtml143187('<img src=x onerror=alert(1)> '+text);assert.equal(target.querySelectorAll('img').length,0);assert.equal(target.querySelectorAll('a').length,2);
  console.log('PASS compact rates across locales; exact payroll save and journal capture/blur; explicit rate edits; historical date links, multiple source days, external evidence priority and safe rendering.');
 }finally{await tick();w.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
