/* V58 — universal visual behavior, live financial formatting, and navigation repair. */
(function(){
  'use strict';

  function currencyCodeFrom(node){
    const explicit=node.dataset.currency||node.dataset.currencyCode||node.getAttribute('title')||'';
    const text=(explicit||node.textContent||'').trim().toUpperCase();
    if(text.includes('LAK')||text==='₭'||text==='K')return'LAK';
    if(text.includes('USD')||text==='$')return'USD';
    if(text.includes('THB')||text==='฿')return'THB';
    if(text.includes('EUR')||text==='€')return'EUR';
    return text.match(/\b[A-Z]{3}\b/)?.[0]||'OTHER';
  }
  function applyCurrencyColor(node){
    node.classList.remove('currency-lak','currency-usd','currency-thb','currency-eur','currency-other','currency-custom');
    const code=currencyCodeFrom(node),known=['LAK','USD','THB','EUR'];
    if(known.includes(code)){node.classList.add(`currency-${code.toLowerCase()}`);return}
    if(code==='OTHER'){node.classList.add('currency-other');return}
    const hue=[...code].reduce((sum,ch)=>sum+ch.charCodeAt(0),0)*47%360;
    node.classList.add('currency-custom');
    node.style.setProperty('--currency-custom-border',`hsl(${hue} 48% 68%)`);
    node.style.setProperty('--currency-custom-bg',`hsl(${hue} 55% 95%)`);
    node.style.setProperty('--currency-custom-text',`hsl(${hue} 62% 30%)`);
  }
  function syncCurrencyColors(root=document){
    root.querySelectorAll?.('.currency-symbol-badge,.currency-tag,[data-currency-code]').forEach(applyCurrencyColor);
  }

  function tagJournalColumns(){
    const rows=[
      document.getElementById('jeHeaderRow'),
      document.getElementById('thJournalHistoryRow'),
      document.getElementById('thNewTransRow'),
      document.getElementById('thAllTransRow'),
      document.getElementById('thVoidedTransRow'),
      ...document.querySelectorAll('[id^="openPeriodHeader"]')
    ].filter(Boolean);
    rows.forEach(row=>{
      row.querySelectorAll('th').forEach(th=>{
        const label=th.textContent.trim().toLowerCase();
        th.classList.toggle('je-account-col',label==='account');
        th.classList.toggle('je-memo-col',label.includes('memo'));
        th.classList.toggle('je-dr-col',label==='dr'||label.startsWith('dr '));
        th.classList.toggle('je-base-cr-col',label==='cr-lak');
        th.classList.toggle('je-foreign-cr-col',label==='cr-usd'||label==='cr-thb');
      });
    });
  }

  /* Format financial values on every keystroke using the saved Accounting settings. */
  const financialSelector=[
    '.je-line-dr','.je-line-cr','.staff-entry-debit','.staff-entry-credit','.staff-line-amount',
    '.fund-allocation-input','#v49Amount','input[id^="v49Adj-"]','input[data-financial-number]',
    '#workspaceEntryAmount','#workspaceEntryCredit','#recurringAmount',
    'input[name^="pit"][name$="From"]','input[name^="pit"][name$="To"]','input[name="ssoMaxBase"]',
    'input.num:not([type="date"]):not([type="month"])'
  ].join(',');
  function isFinancialInput(node){return node instanceof HTMLInputElement&&node.matches(financialSelector)}
  function prepareFinancialInput(input){
    if(input.dataset.liveAccountingFormat==='true')return;
    if(input.type==='number')input.type='text';
    input.inputMode='decimal';input.dataset.liveAccountingFormat='true';
  }
  function prepareFinancialInputs(root=document){root.querySelectorAll?.(financialSelector).forEach(prepareFinancialInput)}

  const originalFormatter=window.formatAppNumberEditing;
  window.formatAppNumberEditing=function(input){
    if(!input)return;
    prepareFinancialInput(input);
    const old=String(input.value??''),cursor=input.selectionStart??old.length;
    const settings=typeof ApplicationSettings!=='undefined'?ApplicationSettings:null;
    const style=settings?.system?.numberFormat||'1,234.56';
    const group=style==='1.234,56'?'.':style==='1 234,56'?' ':',';
    const decimal=style==='1,234.56'?'.':',';
    const places=typeof window.appDecimalPlaces==='function'?window.appDecimalPlaces():2;
    const before=old.slice(0,cursor);
    const meaningfulBefore=[...before].filter(ch=>/\d/.test(ch)||ch===decimal||ch==='-').length;
    const negative=/^\s*-/.test(old);
    const escapedDecimal=decimal==='.'?'\\.':decimal;
    const cleaned=old.replace(new RegExp(`[^0-9${escapedDecimal}]`,'g'),'');
    const pieces=cleaned.split(decimal),whole=(pieces.shift()||'0').replace(/^0+(?=\d)/,''),fraction=pieces.join('').slice(0,places);
    const grouped=whole.replace(/\B(?=(\d{3})+(?!\d))/g,group);
    const formatted=(negative?'-':'')+grouped+(cleaned.includes(decimal)&&places?decimal+fraction:'');
    input.value=formatted;
    let seen=0,next=formatted.length;
    for(let i=0;i<formatted.length;i++){
      if(/\d/.test(formatted[i])||formatted[i]===decimal||formatted[i]==='-')seen++;
      if(seen>=meaningfulBefore){next=i+1;break}
    }
    try{input.setSelectionRange(next,next)}catch(_){/* unsupported input selection */}
  };

  document.addEventListener('input',event=>{
    const input=event.target;
    if(!isFinancialInput(input)||input.dataset.numeric88)return;
    window.formatAppNumberEditing(input);
  },true);
  document.addEventListener('blur',event=>{
    const input=event.target;
    if(isFinancialInput(input)&&!input.dataset.numeric88&&typeof window.finishAppNumberEditing==='function')window.finishAppNumberEditing(input);
  },true);

  /* Leaving Sub-users through Accounts must remove its shell-only state. */
  if(typeof window.scrollToAccountModule==='function'){
    const beforeAccounts=window.scrollToAccountModule;
    window.scrollToAccountModule=function(moduleId){
      document.body.classList.remove('subusers-workspace-active');
      const result=beforeAccounts(moduleId);
      document.body.classList.remove('subusers-workspace-active');
      requestAnimationFrame(()=>{
        const shell=document.getElementById('categoryTabShell');
        if(shell&&document.getElementById('accounts-modular-container')?.classList.contains('active'))shell.hidden=false;
      });
      return result;
    };
  }
  if(typeof window.switchTab==='function'){
    const beforeSwitch=window.switchTab;
    window.switchTab=function(tabId){
      if(tabId!=='sub-users-workspace')document.body.classList.remove('subusers-workspace-active');
      const result=beforeSwitch(tabId);
      document.body.classList.toggle('subusers-workspace-active',tabId==='sub-users-workspace');
      return result;
    };
  }

  /* Re-color the existing badge when a journal account changes in-place. */
  if(typeof window.updateJournalAccountBadge==='function'){
    const beforeBadge=window.updateJournalAccountBadge;
    window.updateJournalAccountBadge=function(input){
      const result=beforeBadge(input);
      const badge=input?.closest?.('.account-input-wrap')?.querySelector('.currency-symbol-badge');
      if(badge)applyCurrencyColor(badge);
      return result;
    };
  }

  function sync(root=document){prepareFinancialInputs(root);syncCurrencyColors(root);tagJournalColumns()}
  const observer=new MutationObserver(records=>{let changed=false;records.forEach(record=>record.addedNodes.forEach(node=>{
    if(node.nodeType!==1)return;changed=true;prepareFinancialInputs(node);syncCurrencyColors(node);if(node.matches?.('.currency-symbol-badge,.currency-tag,[data-currency-code]'))applyCurrencyColor(node)
  }));if(changed)tagJournalColumns()});
  const start=()=>{sync();observer.observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
