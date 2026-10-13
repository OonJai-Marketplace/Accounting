  function mount() {
    const shell=byId('categoryTabShell'),journal=byId('journal');
    if(!shell||!journal||byId('transactionsHeading98'))return;
    const heading=document.createElement('header');heading.id='transactionsHeading98';heading.className='transactions-heading98 no-print';heading.innerHTML='<h1>Transactions</h1>';shell.before(heading);
    byId('journalEntry98').hidden=false;
    setupJournalColumns();calculateJournalBalance();syncTitle();renderVoidedTransactionsTable();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})()