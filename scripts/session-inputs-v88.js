/* Shared localized editing. Native numeric fields retain canonical programmatic
   values so existing calculations and form submissions never parse group marks. */
(function(){
'use strict';
const nativeValue=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
const bridged=new Set();
const textSelector='input.je-line-dr,input.je-line-cr,input.v56-amount,input[inputmode="decimal"],input.adjustment-input69';
function parts(){const f=ApplicationSettings.system?.numberFormat;return f==='1.234,56'?['.',',']:f==='1 234,56'?[' ',',']:[',','.']}
function edit(value,places=appDecimalPlaces()){
 const [group,decimal]=parts();let s=String(value),negative=s.trim().startsWith('-');
 if(!s)return '';
 s=s.replace(new RegExp('[^0-9'+(decimal==='.'?'\\.':',')+']','g'),'');
 if(!s)return negative?'-':'';
 const bits=s.split(decimal),whole=(bits.shift()||'0').replace(/^0+(?=\d)/,''),fraction=bits.join('').slice(0,places);
 return (negative?'-':'')+whole.replace(/\B(?=(\d{3})+(?!\d))/g,group)+(s.includes(decimal)&&places?decimal+fraction:'');
}
function formatCaret(input,places){const before=nativeValue.get.call(input),at=input.selectionStart??before.length;const digits=before.slice(0,at).replace(/[^0-9]/g,'').length;const result=edit(before,places);nativeValue.set.call(input,result);let next=0,count=0;while(next<result.length&&count<digits){if(/\d/.test(result[next]))count++;next++}if(at===before.length)next=result.length;try{input.setSelectionRange(next,next)}catch{}}
window.formatAppNumberEditing=function(input){formatCaret(input,input.dataset.numeric88?Number(input.dataset.precision88):appDecimalPlaces())};
window.v56FormatCorrectionAmount=window.formatAppNumberEditing;
function precision(input){const key=(input.name||input.id||'').toLowerCase();if(/rate|exchange/.test(key))return 6;if(/salary|amount|base|pit\d.*(?:from|to)|opening|advance|reimbursement|deduction|bonus|allowance|penalty|ceiling/.test(key))return appDecimalPlaces();const step=input.getAttribute('step');return step==='any'?6:step?.includes('.')?step.split('.')[1].length:0}
function validate(input){const value=input.value,n=Number(value),min=input.getAttribute('min'),max=input.getAttribute('max');let message='';if(value!==''&&!Number.isFinite(n))message='Enter a valid number.';else if(value!==''&&min!==null&&n<Number(min))message='Minimum: '+min;else if(value!==''&&max!==null&&n>Number(max))message='Maximum: '+max;input.setCustomValidity(message)}
function bridge(input){
 if(input.closest('#document-editor105,.page-setup1427,.doc-images-dialog112')||input.hasAttribute('data-doc-setting'))return;
 if(input.dataset.numeric88||/year|code|sequence|prefix|next.*id/i.test(input.name+' '+input.id+' '+input.getAttribute('onchange')))return;
 const initial=input.value;input.dataset.numeric88='true';input.type='text';input.inputMode='decimal';input.dataset.precision88=precision(input);
 Object.defineProperty(input,'value',{configurable:true,get(){const raw=nativeValue.get.call(this);if(!raw)return '';const n=parseAppNumber(raw);return Number.isFinite(n)?String(n):raw},set(value){nativeValue.set.call(this,value===''?'':edit(String(value).replace('.',parts()[1]),Number(this.dataset.precision88)));validate(this)}});
 Object.defineProperty(input,'valueAsNumber',{configurable:true,get(){return this.value===''?NaN:Number(this.value)},set(n){this.value=Number.isFinite(n)?n:''}});
 input.value=initial;bridged.add(input);
}
function scan(){document.querySelectorAll('input[type="number"]').forEach(bridge);for(const n of bridged)if(!n.isConnected)bridged.delete(n);document.querySelectorAll('#returnedBookOverlay select').forEach(n=>{const text=n.selectedOptions[0]?.textContent||'';n.title=text;if(matchMedia('(min-width:1025px)').matches){n.style.minWidth=Math.max(130,...[...n.options].map(o=>o.textContent.length*8+48))+'px'}})}
document.addEventListener('input',e=>{const n=e.target;if(n instanceof HTMLInputElement){if(n.dataset.numeric88){formatCaret(n,Number(n.dataset.precision88));validate(n)}else if(n.matches(textSelector))formatCaret(n,appDecimalPlaces())}},true);
document.addEventListener('formdata',e=>{for(const input of e.target.querySelectorAll('[data-numeric88]'))if(input.name&&!input.disabled)e.formData.set(input.name,input.value)},true);
// Contenteditable single-entry amounts use the same parser on commit.
document.addEventListener('input',e=>{const cell=e.target.closest('[contenteditable][data-field="amount"],.pit-cell-editor');if(!cell)return;const selection=getSelection(),offset=selection?.anchorOffset||0,before=cell.textContent;cell.textContent=edit(before);const range=document.createRange();if(cell.firstChild){range.setStart(cell.firstChild,Math.min(cell.textContent.length,offset+cell.textContent.length-before.length));range.collapse(true);selection.removeAllRanges();selection.addRange(range)}},true);
let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;scan()})}).observe(document.body,{childList:true,subtree:true});scan();
const save=saveSettingsGroup;window.saveSettingsGroup=function(event){const canonical=[...bridged].map(n=>[n,n.value]);const result=save(event);canonical.forEach(([n,v])=>{if(n.isConnected){n.dataset.precision88=precision(n);n.value=v}});return result};
window.numericEditing88={edit,scan};
})();
