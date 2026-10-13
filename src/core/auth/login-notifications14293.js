/* Sign-in uses the loading animation; failures appear in a dismissible dialog. */
(()=>{'use strict';
let text='',dialog;
const quiet=message=>!message||/^(?:Signing in|Preparing your workspace|Requesting password recovery|Please sign in\.?$|Sign in again\.?$)/i.test(message);
function show(message,error=true){
 message=String(message||'').trim();if(quiet(message))return;
 if(!document.body){document.addEventListener('DOMContentLoaded',()=>show(message,error),{once:true});return;}
 if(!dialog){dialog=document.createElement('dialog');dialog.id='loginNotification14293';dialog.className='login-notification14293';dialog.setAttribute('role','alertdialog');dialog.setAttribute('aria-labelledby','loginNotificationTitle14293');dialog.setAttribute('aria-describedby','loginNotificationText14293');dialog.innerHTML='<h2 id="loginNotificationTitle14293"></h2><p id="loginNotificationText14293"></p><form method="dialog"><button type="submit">Close</button></form>';document.body.append(dialog);}
 dialog.querySelector('h2').textContent=error?(location.pathname.endsWith('/recovery.html')?'Password setup':'Unable to sign in'):'Account notification';
 dialog.querySelector('p').textContent=/invalid login credentials/i.test(message)?'The email or password is incorrect. Please check both and try again.':message;
 if(!dialog.open)dialog.showModal();
 window.releaseLogin1443?.();
}
const target={};Object.defineProperty(target,'textContent',{get:()=>text,set:value=>{text=String(value||'');if(/session.*expired|invalid refresh token|refresh token.*not found/i.test(text)){text='';void window.endExpiredSession14284?.();return;}if(quiet(text)){text='';return;}show(text,!/^If this account exists|^Password updated/i.test(text));}});
window.loginMessageTarget14293=()=>target;
window.loginNotice14293=show;
window.clearLoginNotice14293=()=>{text='';dialog?.close();};
})();
