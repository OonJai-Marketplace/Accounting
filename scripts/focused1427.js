/* Only the requested recovery placement and table heading alignment. */
(()=>{'use strict';let cards=[];
window.placeRecoveryTools1427=host=>{for(const card of cards)host.append(card)};
function align(root){if(root.nodeType!==1&&root!==document)return;const nodes=[...(root.matches?.('table th,table thead td,[role=columnheader]')?[root]:[]),...root.querySelectorAll('table th,table thead td,[role=columnheader]')];nodes.forEach(n=>{n.style.setProperty('text-align','left','important');n.style.setProperty('font-weight','700','important')})}
function ready(){align(document);new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)align(n)}).observe(document.body,{childList:true,subtree:true});const backup=document.querySelector('#settingsBackupInput')?.closest('.settings-section-card'),password=document.querySelector('.auth-settings105');cards=[backup,password].filter(Boolean);cards.forEach(n=>n.remove());const host=document.getElementById('settings-recovery113');if(host?.querySelector('#vaultForm113'))placeRecoveryTools1427(host);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
