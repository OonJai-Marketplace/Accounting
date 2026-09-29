/* Compact journal actions and currency labels. Monetary input values stay numeric. */
(function(){
'use strict';
let queued=false;
function rowCurrency(row){const input=row.querySelector('.je-line-acc');if(!input)return '';const account=getSelectedAccountInfo(input.value);return account?.currency||''}
function syncMoney(row){const code=rowCurrency(row),symbol=code?currencySymbolV6(code):'';row.querySelectorAll('.je-line-dr,.je-line-cr').forEach(input=>{let wrapper=input.closest('.journal-money102');if(!wrapper){wrapper=document.createElement('span');wrapper.className='journal-money102';input.before(wrapper);wrapper.append(input)}let mark=wrapper.querySelector('.journal-currency102');if(!mark){mark=document.createElement('span');mark.className='journal-currency102';mark.setAttribute('aria-hidden','true');wrapper.prepend(mark)}if(mark.textContent!==symbol)mark.textContent=symbol;wrapper.dataset.currency=code;input.setAttribute('aria-label',(input.classList.contains('je-line-dr')?'Debit':'Credit')+(code?' in '+code:''));});}
function syncMenu(row){const panel=row.querySelector('.row-menu-panel99');if(!panel)return;panel.classList.add('journal-panel102');const del=panel.querySelector('.je-btn-del');if(del){if(del.textContent!=='Delete')del.textContent='Delete';del.classList.add('journal-delete102');del.removeAttribute('style');del.setAttribute('aria-label','Delete this row')}
 const tools=panel.querySelector('[data-row-tools99]');if(!tools)return;tools.classList.add('journal-tools102');const add=tools.querySelector('[aria-label="Add a row below"]');if(add){if(add.textContent!=='Add')add.textContent='Add';add.classList.add('journal-add102')}
 const up=tools.querySelector('[aria-label="Move row up"]'),down=tools.querySelector('[aria-label="Move row down"]');if(!up||!down)return;let pair=tools.querySelector('.journal-arrows102');if(!pair){pair=document.createElement('div');pair.className='journal-arrows102';tools.append(pair)}if(up.parentElement!==pair||down.parentElement!==pair)pair.append(up,down);up.classList.add('journal-arrow102');down.classList.add('journal-arrow102');}
function sync(){queued=false;document.querySelectorAll('#jeLinesBody tr').forEach(row=>{syncMoney(row);syncMenu(row)})}
function schedule(){if(!queued){queued=true;requestAnimationFrame(sync)}}
function install(){schedule();const base=window.updateJournalAccountBadge;window.updateJournalAccountBadge=function(input){const result=base(input);syncMoney(input.closest('tr'));return result};document.getElementById('jeLinesBody')&&new MutationObserver(schedule).observe(document.getElementById('jeLinesBody'),{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
