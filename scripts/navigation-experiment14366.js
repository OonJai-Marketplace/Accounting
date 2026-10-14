/* Temporary desktop navigation comparison. Reuses the real journal without duplicating IDs or financial records. */
(()=>{'use strict';
const blank='navigation-blank14366';let opening='',selected='';
const allowed=()=>typeof liveProfile!=='undefined'&&liveProfile?.role==='admin'&&window.access113?.can('journal');
function sync(){
 const active=document.querySelector('.tab-content.active')?.id;
 if(selected==='Journal'&&active!=='journal'||selected==='Blank'&&active!==blank)selected='';
 const show=!!allowed();
 for(const label of ['Journal','Blank']){const node=document.getElementById('nav-experiment-'+label);if(!node)continue;node.hidden=!show;node.classList.toggle('active-category',show&&selected===label);node.querySelector('.nav-header').setAttribute('aria-current',selected===label?'page':'false');}
 document.body.dataset.navigationExperiment14366=show?selected:'';
 if(show&&selected){document.querySelectorAll('#appSidebar .nav-category:not([data-experiment14366])').forEach(n=>n.classList.remove('active-category'));const title=document.getElementById('mainHeaderTitle');if(title)title.textContent=selected;}
}
function open(label){if(!allowed())return;opening=label;try{window.switchTab(label==='Journal'?'journal':blank)}finally{opening='';sync();}}
function ready(){
 const journal=document.getElementById('journal'),sidebar=document.getElementById('nav-module-transactions');if(!journal||!sidebar)return;
 const empty=document.createElement('section');empty.id=blank;empty.className='tab-content';empty.dataset.module='navigation-experiment';empty.setAttribute('aria-label','Blank navigation test');journal.parentElement.append(empty);
 let previous=sidebar;
 for(const label of ['Journal','Blank']){const node=document.createElement('div');node.id='nav-experiment-'+label;node.className='nav-category';node.dataset.module='transactions';node.dataset.experiment14366=label;node.hidden=true;const button=document.createElement('div');button.className='nav-header';button.textContent=label;button.setAttribute('role','button');button.tabIndex=0;button.title='Temporary navigation comparison';button.onclick=()=>open(label);node.append(button);previous.after(node);previous=node;}
 const sw=window.switchTab;window.switchTab=function(...args){selected=opening;const result=sw.apply(this,args);sync();requestAnimationFrame(sync);return result};
 const permissions=window.applyGranularPermissionAccess;if(typeof permissions==='function')window.applyGranularPermissionAccess=function(...args){const result=permissions.apply(this,args);sync();return result};
 window.addEventListener('page113',sync);sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
