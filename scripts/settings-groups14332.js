/* Four settings groups; existing settings forms and permissions stay intact. */
(()=>{'use strict';
const groups=[
 {label:'Company',targets:['settings-business','settings-users']},
 {label:'Accounting',targets:['settings-accounting']},
 {label:'People & Statutory',targets:['settings-payroll','settings-tax']},
 {label:'System & Tools',targets:['settings-system','settings-printing','settings-maintenance14324']}
];
function active(){return document.querySelector('.tab-content.active')?.id||''}
function sync(){const root=document.getElementById('settingsTabShell'),top=root?.querySelector('.settings-browser-tabs');if(!top)return;
 const target=active(),group=groups.find(g=>g.targets.includes(target))||groups[3],sub=root.querySelector('.settings-subtabs14332');
 top.querySelectorAll('[data-settings-group14332]').forEach(b=>{const on=b.dataset.settingsGroup14332===group.label;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on))});
 sub.replaceChildren();const available=[...document.querySelectorAll('#nav-module-settings .nav-links [onclick]')];
 for(const id of group.targets){const panel=document.getElementById(id);if(!panel||window.access113&&!window.access113.can(id))continue;const original=available.find(b=>b.getAttribute('onclick')?.includes("'"+id+"'")),button=document.createElement('button');button.type='button';button.textContent=original?.textContent?.trim()||id.replace(/^settings-/,'').replace(/143\d+$/,'').replace(/-/g,' ');button.className='settings-subtab14332';button.classList.toggle('active',target===id);button.setAttribute('aria-current',target===id?'page':'false');button.onclick=()=>window.switchTab(id);sub.append(button)}
 sub.hidden=!target.startsWith('settings-')||sub.children.length<2;
}
function install(){const root=document.getElementById('settingsTabShell'),top=root?.querySelector('.settings-browser-tabs');if(!top||root.dataset.grouped14332)return;root.dataset.grouped14332='true';top.replaceChildren();for(const group of groups){const button=document.createElement('button');button.type='button';button.className='settings-browser-tab';button.dataset.settingsGroup14332=group.label;button.textContent=group.label;button.onclick=()=>{const current=active();if(group.targets.includes(current))return;const target=group.targets.find(id=>document.getElementById(id)&&(!window.access113||window.access113.can(id)));if(target)window.switchTab(target)};top.append(button)}const sub=document.createElement('div');sub.className='settings-subtabs14332';sub.setAttribute('aria-label','Settings sections');top.after(sub);sync();window.addEventListener('page113',sync);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
