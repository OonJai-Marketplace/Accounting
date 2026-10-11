/* Group the current Settings navigation; keep every existing form and permission. */
(()=>{'use strict';
const groups=[
 {label:'Company',targets:['settings-business','settings-users','settings-organization14229']},
 {label:'Accounting',targets:['settings-accounting']},
 {label:'People & Statutory',targets:['settings-payroll','settings-tax']},
 {label:'System & Tools',targets:['settings-system','settings-data14231','settings-maintenance14324']}
];
const labels={'settings-business':'Business','settings-users':'Users & Permissions','settings-organization14229':'Organization & Reporting','settings-accounting':'Ledger & Numbering','settings-payroll':'Payroll','settings-tax':'Mandatory','settings-system':'System & Printing','settings-data14231':'Archive & Recovery','settings-maintenance14324':'Maintenance & Audit'};
const permitted=id=>!!document.getElementById(id)&&(!window.access113||window.access113.can(id));
const active=()=>document.querySelector('.tab-content.active')?.id||'';
function available(){return groups.map(g=>({...g,targets:g.targets.filter(permitted)})).filter(g=>g.targets.length)}
let accountingSection='accounting';
const accountingSections=[['accounting','Accounting'],['vouchers','Vouchers'],['currency','Currency Manager']];
function accountingChoice(key){accountingSection=key;render('settings-accounting');}
function accountingPanel(){const root=document.getElementById('settings-accounting');if(!root)return;const voucher=root.querySelector('.voucher-config14299'),currency=[...root.querySelectorAll('.settings-module94')].find(n=>n.querySelector('h4')?.textContent==='Currency Manager');for(const node of [root.querySelector('[data-settings-group=accounting]'),root.querySelector('#prefixRegistry89')])if(node&&!node.closest('.voucher-config14299'))node.hidden=accountingSection!=='accounting';if(voucher)voucher.hidden=accountingSection!=='vouchers';if(currency)currency.hidden=accountingSection!=='currency';}
function sectionChoices(){if(active()==='settings-accounting')return accountingSections.map(([id,label])=>({id,label,button:{click:()=>accountingChoice(id)}}));const group=available().find(g=>g.targets.includes(active()));return (group?.targets||[]).map(id=>({id,label:labels[id],button:{click:()=>window.switchTab(id)}}))}
function render(target=active()){
 const host=document.getElementById('categoryTabs'),shell=document.getElementById('categoryTabShell');if(!host||!shell)return false;
 let sub=document.getElementById('settingsSections14335');
 const options=available(),current=options.find(g=>g.targets.includes(target));
 if(!current){if(sub)sub.hidden=true;return false}
 const markup=options.map(g=>'<button type="button" class="category-tab'+(g.label===current.label?' active':'')+'" data-settings-group14332="'+g.label+'" role="tab" aria-selected="'+(g===current)+'">'+g.label+'</button>').join('');
 // Compare our own signature as other components decorate button labels and icons.
 if(host.dataset.settingsRender14335!==markup||!host.querySelector('[data-settings-group14332]')){host.innerHTML=markup;host.dataset.settingsRender14335=markup;host.querySelectorAll('[data-settings-group14332]').forEach(b=>b.onclick=()=>{const g=available().find(g=>g.label===b.dataset.settingsGroup14332);if(g&&!g.targets.includes(active()))window.switchTab(g.targets[0])})}
 shell.hidden=false;
 if(!sub){sub=document.createElement('nav');sub.id='settingsSections14335';sub.className='settings-subtabs14332';sub.setAttribute('aria-label','Settings sections');shell.after(sub)}
 const accounting=target==='settings-accounting';
 const sections=accounting?accountingSections.map(([key,label])=>'<button type="button" class="settings-subtab14332'+(key===accountingSection?' active':'')+'" data-accounting-section14337="'+key+'" aria-current="'+(key===accountingSection?'page':'false')+'">'+label+'</button>').join(''):current.targets.map(id=>'<button type="button" class="settings-subtab14332'+(id===target?' active':'')+'" data-settings-section14335="'+id+'" aria-current="'+(id===target?'page':'false')+'">'+labels[id]+'</button>').join('');
 if(sub.dataset.render14335!==sections){sub.innerHTML=sections;sub.dataset.render14335=sections;sub.querySelectorAll('button').forEach(b=>b.onclick=()=>b.dataset.accountingSection14337?accountingChoice(b.dataset.accountingSection14337):window.switchTab(b.dataset.settingsSection14335))}
 sub.hidden=!accounting&&current.targets.length<2;if(accounting)accountingPanel();return true;
}
function sync(){render()}
window.settingsGroups14332={groups,available,sectionChoices,render};
function install(){document.getElementById('settingsTabShell')?.remove();sync();window.addEventListener('page113',sync);window.addEventListener('resize',sync);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
