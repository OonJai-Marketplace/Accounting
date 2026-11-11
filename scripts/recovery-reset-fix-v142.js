/* Range cleanup is provided solely by Backup & Recovery. */
(function(){
 'use strict';
 function showRecoveryNote(){
  const host=document.getElementById('settings-recovery113');
  if(!host||document.getElementById('recoveryServiceNote142'))return;
  const note=document.createElement('p');
  note.id='recoveryServiceNote142';
  note.textContent='Account recovery uses the secure company recovery service.';
  host.prepend(note);
 }
 function install(){showRecoveryNote();window.addEventListener('page113',showRecoveryNote);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
;
