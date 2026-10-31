/* Installation belongs to the top-level window, including the connected phone. */
(()=>{'use strict';
if(window.accountingInstall205)return;
let pending=null,installing=false,installed=false,dialog=null,opener=null;
const running=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const standalone=()=>installed||running();
function paint(){document.querySelectorAll('[data-accounting-install]').forEach(b=>{b.textContent=standalone()?'Accounting installed':'Install Accounting';b.disabled=installing;});}
function instructions(){
 if(running())return 'Accounting is already running as an installed app.';
 if(installed)return 'Accounting has been installed. Open it from your apps or home screen.';
 const ua=navigator.userAgent;
 if(/iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1))return 'Open this page in Safari. Tap Share, then Add to Home Screen, and confirm Add. If needed, enable Open as Web App.';
 if(/Android/.test(ua))return 'Open this page in Chrome. Tap the browser menu (⋮), then Install app or Add to Home screen. If the option is missing, reconnect, reload this page after saving your work, and try again.';
 return 'In Chrome or Edge, use the install icon in the address bar or the browser menu → Install Accounting / Install this site as an app. If it is unavailable, reconnect and try again after saving your work. On Mac, Safari also offers File → Add to Dock.';
}
function show(message){
 if(!dialog){
  dialog=document.createElement('dialog');dialog.id='accountingInstallDialog205';dialog.setAttribute('aria-labelledby','accountingInstallTitle205');
  dialog.innerHTML='<h2 id="accountingInstallTitle205">Install Accounting</h2><p role="status"></p><button type="button" class="install-close205">Close</button>';
  dialog.querySelector('button').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{try{opener?.focus({preventScroll:true});}catch{}});
  document.body.append(dialog);
 }
 dialog.querySelector('p').textContent=message||instructions();
 if(!dialog.open){opener=document.activeElement;dialog.showModal();}
}
async function open(){
 // Called directly by the user's click, including same-origin phone iframe clicks.
 // Do not await anything before prompt(): browsers require transient activation.
 if(installing)return;
 if(standalone()||!pending){show();return;}
 const event=pending;pending=null;installing=true;paint();
 try{
  await event.prompt();
  const choice=await event.userChoice;
  if(installed)show('Accounting has been installed. Open it from your apps or home screen.');
  else if(choice?.outcome==='accepted')show('Installation was requested. Follow your browser’s confirmation; Accounting will appear in your apps when installation finishes.');
  else show('Installation was cancelled. Your work remains open. You can try again from the browser menu.');
 }catch{show(instructions());}
 finally{installing=false;paint();}
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;paint();});
window.addEventListener('appinstalled',()=>{installed=true;pending=null;paint();if(dialog?.open)show('Accounting has been installed. You can open it from your apps.');});
window.matchMedia('(display-mode: standalone)').addEventListener?.('change',paint);
document.addEventListener('click',event=>{if(event.target.closest('[data-accounting-install]')){event.preventDefault();void open();}});
document.addEventListener('DOMContentLoaded',paint,{once:true});
window.accountingInstall205={open,isInstalled:standalone};
})();
