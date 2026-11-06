/* Blank monthly cash slips. Preferences only; no voucher or journal issuance. */
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentMonth=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit'}).format(new Date());
const validMonth=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&Number(value.slice(0,4))>=1900&&Number(value.slice(0,4))<=9999;
const monthLabel=value=>validMonth(value)?new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'-01T12:00:00Z')):'________________ '+currentMonth().slice(0,4);
const permitted=()=>typeof liveProfile!=='undefined'&&liveProfile?.role==='admin'&&liveProfile.status==='active'&&(!window.access113||access113.can('transactions-vouchers14299','view')&&access113.can('document-editor105','edit'));
function validate(value){
 const legend=(value.legend||[]).map(r=>({initials:String(r.initials||'').trim().toUpperCase(),name:String(r.name||'').trim()})).filter(r=>r.initials||r.name);
 if(legend.length>12)throw Error('Use up to 12 names so the legend fits on the page.');
 const seen=new Set();for(const row of legend){if(!/^[\p{L}]{1,2}$/u.test(row.initials)||!row.name)throw Error('Enter one or two letters and a full name for each legend entry.');if(row.name.length>80)throw Error('Keep each legend name within 80 characters.');if(seen.has(row.initials))throw Error('Use different initials for each person.');seen.add(row.initials);}
 const reviewer=String(value.reviewer||'').trim(),role=String(value.role||'').trim();
 if(!reviewer||!role)throw Error('Enter the reviewer’s name and role.');
 if(reviewer.length>120||role.length>80)throw Error('Shorten the reviewer name or role.');
 return {legend,reviewer,role};
}
const sheetSettings={paper:'A4',orientation:'portrait',top:10,right:10,bottom:10,left:10,size:10,line:1,font:'Arial',showBusinessName:false,pageNumbers:false,applyHeader:false,applyFooter:false};
function html(options){
 const value=validate(options),period=options.month||'',start=Number(options.start)||1;
 const widths=[3,4,4,37,6,11,11,12,12],head=['No','Date','Name','Description','Source','Debit','Credit','Signature 1','Signature 2'];
 const cell='border:0.5pt solid #555;padding:0.25mm 0.5mm;vertical-align:middle;font-size:10pt;line-height:1;color:#111;';
 const legend=[...value.legend,{initials:'____',name:'____________________'},{initials:'____',name:'____________________'}];
 return `<h1 style="text-align:center;color:#111;font-size:14pt;line-height:1.1;margin:0 0 2mm">MONTHLY CASH SLIP</h1>
 <p style="font-size:9pt;line-height:1.15;color:#111;margin:0 0 2mm">Internal record of cash receipts, releases and other cash movements. Supporting voucher for cash transactions without official receipts; secondary supporting document for bank movements.</p>
 <table data-cash-slip-table277="1" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:0;color:#111"><colgroup>${widths.map(w=>`<col style="width:${w}%">`).join('')}</colgroup><thead><tr>${head.map(h=>`<th style="${cell}text-align:center;background-color:#fff;height:7mm;white-space:nowrap;padding:0.25mm 0.1mm;font-size:${['No','Date','Name'].includes(h)?'8':'9'}pt">${h}</th>`).join('')}</tr></thead><tbody>${Array.from({length:40},(_,i)=>`<tr style="height:4.8mm">${head.map((_,j)=>`<td style="${cell}height:4.8mm;${j===0?'text-align:center;':''}">${j===0?start+i:'<br>'}</td>`).join('')}</tr>`).join('')}</tbody></table>
 <div data-cash-slip-bottom277="1" style="display:flex;gap:6mm;margin-top:2mm;break-inside:avoid;color:#111">
 <div style="flex:1;min-width:0"><p style="font-size:10pt;line-height:1.15;margin:0 0 1.5mm"><strong>Month: </strong><span data-cash-slip-month277="${esc(period)}" style="display:inline-block;min-width:40mm;border-bottom:0.5pt solid #555">${esc(monthLabel(period))}</span></p><p style="font-size:9pt;line-height:1;margin:0 0 1mm"><strong>Name initials</strong></p><div style="column-count:2;column-gap:4mm">${legend.map(r=>`<p style="font-size:9pt;line-height:1.15;margin:0 0 1mm;break-inside:avoid"><strong>${esc(r.initials)}</strong> — ${esc(r.name)}</p>`).join('')}</div></div>
 <div data-cash-slip-reviewer277="1" style="width:46mm;flex-shrink:0;text-align:center"><p style="font-size:9pt;line-height:1.15;margin:0;text-align:center">Reviewed by</p><div style="height:11mm;border-bottom:0.5pt solid #333;margin:0 3mm 1mm"></div><p style="font-size:10pt;line-height:1.15;text-align:center;margin:0 0 1mm">${esc(value.reviewer)}</p><p style="font-size:9pt;line-height:1.15;text-align:center;margin:0">${esc(value.role)}</p></div></div>`;
}
function installStyle(){if(document.getElementById('cashSlipStyle277'))return;const style=document.createElement('style');style.id='cashSlipStyle277';style.textContent='.cash-slip-dialog277 .ui-modal108{width:min(620px,94vw)}#cashSlipSetup277 .cash-slip-fields277{display:grid;grid-template-columns:1fr 1fr;gap:12px}#cashSlipSetup277 .cash-slip-legend277{max-height:240px;overflow:auto;margin:8px 0}#cashSlipSetup277 [data-legend-row277]{display:grid;grid-template-columns:64px 1fr 32px;gap:8px;align-items:end;margin:6px 0}#cashSlipSetup277 input{min-width:0;width:100%}#cashSlipSetup277 input[type=checkbox]{width:auto}#cashSlipSetup277 label{display:block}#cashSlipSetup277 [role=alert]{color:#a32b2b}';document.head.append(style);}
let opening=false;
async function create(){
 if(opening||!permitted())return;opening=true;const actor=liveProfile.id,client=ojmDb,current=()=>permitted()&&liveProfile.id===actor&&ojmDb===client;
 try{
 const defaults=await window.printPreferences1434?.load();if(!current())return;const previous=defaults?.cashSlip277||{legend:[],reviewer:'Santos Cabigat',role:'Manager'};installStyle();
 const pending=ui108.modal('Monthly Cash Slip',`<form id="cashSlipSetup277"><div class="cash-slip-fields277"><label>Month and year<input class="je-input" type="month" name="month" min="1900-01" max="9999-12" value="${currentMonth()}"></label><label>First row number<input class="je-input" name="start" type="number" min="1" max="999960" value="1" required></label></div><p>40 blank rows for handwriting. Date cells are for the day number only.</p><fieldset><legend>Name initials</legend><div class="cash-slip-legend277"></div><button type="button" class="je-btn je-btn-secondary" data-add277>Add name</button></fieldset><div class="cash-slip-fields277"><label>Reviewer<input class="je-input" name="reviewer" list="cashSlipPeople277" maxlength="120" required value="${esc(previous.reviewer)}"></label><label>Role<input class="je-input" name="role" list="cashSlipRoles277" maxlength="80" required value="${esc(previous.role)}"></label></div><datalist id="cashSlipPeople277">${[...new Set([liveProfile.full_name,...(typeof liveProfiles!=='undefined'?liveProfiles:[]).map(p=>p.full_name)].filter(Boolean))].map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist><datalist id="cashSlipRoles277">${['Manager','Director','Cashier','Employee'].map(r=>`<option value="${r}"></option>`).join('')}</datalist><label><input type="checkbox" name="saveDefaults"> Save legend and reviewer as my defaults</label><p role="alert" aria-live="polite"></p></form>`,[{label:'Cancel',value:false},{label:'Open in Editor',value:true,primary:true}],true);
 const form=document.getElementById('cashSlipSetup277'),overlay=form.closest('.ui-overlay108'),list=form.querySelector('.cash-slip-legend277'),add=form.querySelector('[data-add277]'),button=overlay.querySelector('footer .primary108');overlay.classList.add('cash-slip-dialog277');
 const addRow=(r={})=>{if(list.children.length>=12)return;const row=document.createElement('div');row.dataset.legendRow277='1';row.innerHTML=`<label>Initials<input class="je-input" data-initials277 maxlength="2" value="${esc(r.initials||'')}" aria-label="Name initials"></label><label>Full name<input class="je-input" data-name277 maxlength="80" value="${esc(r.name||'')}" aria-label="Legend full name"></label><button class="je-btn je-btn-secondary" type="button" aria-label="Remove legend name">×</button>`;row.querySelector('button').onclick=()=>{row.remove();add.disabled=false};list.append(row);add.disabled=list.children.length>=12;};
 (previous.legend?.length?previous.legend:[{},{}]).forEach(addRow);add.onclick=()=>addRow();let options;
 button.onclick=async()=>{if(button.disabled)return;try{if(!current())throw Error('Your account changed. Reopen the cash slip.');if(!form.reportValidity())return;const value=validate({legend:[...list.children].map(r=>({initials:r.querySelector('[data-initials277]').value,name:r.querySelector('[data-name277]').value})),reviewer:form.elements.reviewer.value,role:form.elements.role.value});const month=form.elements.month.value,start=Number(form.elements.start.value);if(month&&!validMonth(month))throw Error('Choose a valid month and year.');if(!Number.isInteger(start)||start<1||start>999960)throw Error('Choose a valid first row number.');button.disabled=true;
 if(form.elements.saveDefaults.checked){if(!window.printPreferences1434)throw Error('Saved defaults are unavailable.');const latest=await printPreferences1434.load();if(!current())return;await printPreferences1434.save({...latest,cashSlip277:value});if(!current())return;}
 options={...value,month,start};overlay.resolve108(true);
 }catch(e){if(form.isConnected)form.querySelector('[role=alert]').textContent=e.message;}finally{button.disabled=false;}};
 if(!await pending||!options||!current())return;
 await openDocumentEditor105({title:'Monthly Cash Slip · '+monthLabel(options.month),category:'Transactions',cashSlip277:true,source:'transactions-vouchers14299',html:html(options),settings:sheetSettings});
 }finally{opening=false;}
}
async function pickMonth(node,changed,isCurrent){
 if(!node?.isConnected||!permitted())return;const actor=liveProfile.id,client=ojmDb,current=()=>permitted()&&liveProfile.id===actor&&ojmDb===client&&node.isConnected&&isCurrent();
 const pending=ui108.modal('Cash slip month',`<label>Month and year<input id="cashSlipMonth277" class="je-input" type="month" min="1900-01" max="9999-12" value="${esc(node.dataset.cashSlipMonth277||currentMonth())}"></label><p role="alert" id="cashSlipMonthError277"></p>`,[{label:'Cancel',value:false},{label:'Apply',value:true,primary:true}]);
 const input=document.getElementById('cashSlipMonth277'),overlay=input.closest('.ui-overlay108');let value;
 overlay.querySelector('footer .primary108').onclick=()=>{if(!input.reportValidity())return;if(input.value&&!validMonth(input.value)){document.getElementById('cashSlipMonthError277').textContent='Choose a valid month and year.';return;}value=input.value;overlay.resolve108(true);};
 if(await pending&&current()){node.dataset.cashSlipMonth277=value;node.textContent=monthLabel(value);changed();}
}
window.MonthlyCashSlip277={create,html,validate,monthLabel,currentMonth,pickMonth,sheetSettings};
})();
