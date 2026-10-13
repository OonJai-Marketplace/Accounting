/* Preserve normal caret placement and selection while editing existing digits. */
(()=>{'use strict';
function numeric(n){return n?.matches?.('input[type=number],input[data-numeric88],input[inputmode=decimal],input[inputmode=numeric],input.num,input.je-line-dr,input.je-line-cr,input.v56-amount,[contenteditable][data-field=amount],.pit-cell-editor')&&!n.matches('input[type=password],input[role=combobox],.account-search1428')}
// Legacy focus listeners select all or rewrite the amount. Input/blur handlers
// still perform formatting, validation, calculations and draft saves.
for(const event of ['focus','focusin'])document.addEventListener(event,e=>{if(numeric(e.target)&&!e.target.readOnly&&!e.target.disabled)e.stopImmediatePropagation()},true);
window.numericCaret14257={numeric};
})();
