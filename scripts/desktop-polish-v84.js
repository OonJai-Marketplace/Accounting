/* Presentation only; findings still use the existing save and audit workflow. */
const desktop84=matchMedia('(min-width:768px)');
const adjustmentReportBefore84=window.adjustmentReport69;
window.adjustmentReport69=function(item){const html=adjustmentReportBefore84(item);return `<div class="adjustment-layout84 ${item.status==='approved_applied'?'applied84':''}">${html}</div>`};
const openFindingBefore84=openPeriodFindingForm;
openPeriodFindingForm=function(){openFindingBefore84();if(desktop84.matches){document.querySelector('.review-findings70')?.classList.add('findings-open84');document.getElementById('findingType').value='';requestAnimationFrame(()=>document.querySelector('.review-findings70')?.scrollIntoView({behavior:'smooth',block:'start'}))}};
const closeFindingBefore84=closePeriodFindingForm;
closePeriodFindingForm=function(){closeFindingBefore84();if(desktop84.matches)document.querySelector('.review-findings70')?.classList.remove('findings-open84')};
const saveFindingBefore84=savePeriodFinding;
savePeriodFinding=function(event){const type=document.getElementById('findingType');if(desktop84.matches&&!type.value){event.preventDefault();type.reportValidity();return}return saveFindingBefore84(event)};
let month84;
const renderPeriodBefore84=renderPeriodReview;
renderPeriodReview=function(...args){if(month84!==PeriodReview.selectedMonth){document.querySelector('.review-findings70')?.classList.remove('findings-open84');month84=PeriodReview.selectedMonth}return renderPeriodBefore84(...args)};
function polish84(){
 const desktop=desktop84.matches;
 for(const [id,short,long] of [['jeSingleDate','Single','Single Date'],['jeMultipleDates','Multiple','Multiple Dates']]){const input=document.getElementById(id);const label=input?.closest('label');if(label){const text=[...label.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(text&&text.textContent.trim()!==(desktop?short:long))text.textContent=' '+(desktop?short:long)}}
 const type=document.getElementById('findingType');if(type){let blank=type.querySelector('option[value=""]');if(desktop&&!blank){blank=new Option('Select finding type','');blank.disabled=true;blank.selected=true;type.prepend(blank);type.value=''}type.required=desktop;if(!desktop&&blank){blank.remove();if(!type.value)type.value='classification'}}
 document.querySelectorAll('.v49-desktop-entry-scroll .delete-row').forEach(b=>{if(desktop){if(!b.dataset.original84)b.dataset.original84=b.innerHTML;if(b.textContent!=='Delete')b.textContent='Delete';b.classList.add('je-btn-del');b.setAttribute('aria-label','Delete this entry line')}else if(b.dataset.original84){b.innerHTML=b.dataset.original84;delete b.dataset.original84;b.classList.remove('je-btn-del')}});
 const summary=[...document.querySelectorAll('.final-record-card>summary')].find(n=>n.getBoundingClientRect().height);if(desktop&&summary){const height=Math.round(summary.getBoundingClientRect().height/(window.desktopScale14320?.scale||1));if(height>40&&height<120)document.documentElement.style.setProperty('--review-header-height84',height+'px')}
}
let pending84=false;new MutationObserver(()=>{if(pending84)return;pending84=true;requestAnimationFrame(()=>{pending84=false;polish84()})}).observe(document.body,{childList:true,subtree:true});
desktop84.addEventListener('change',polish84);polish84();
