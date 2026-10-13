// FINAL POLISH: Dashboard opens with navigation collapsed; clicking a calendar field opens its picker anywhere in the field.
const switchTabAfterAllFeatures=switchTab;
switchTab=function(tabId){
  switchTabAfterAllFeatures(tabId);
  if(tabId==='dashboard') document.querySelectorAll('.nav-category.open').forEach(category=>category.classList.remove('open'));
};
document.addEventListener('click',event=>{
  const picker=event.target.closest('.period-review-picker');
  if(picker && !event.target.matches('input')){const input=picker.querySelector('input[type="month"],input[type="date"]');if(input?.showPicker)input.showPicker();else input?.focus();}
});

