/* Shared live guidance; the authentication server remains the final validator. */
(()=>{'use strict';
const rules=[['12–128 characters',v=>[...v].length>=12&&v.length<=128],['Uppercase letter',v=>/\p{Lu}/u.test(v)],['Lowercase letter',v=>/\p{Ll}/u.test(v)],['Number',v=>/\p{N}/u.test(v)],['Symbol',v=>/[^\p{L}\p{N}\s]/u.test(v)],['No leading or trailing spaces',v=>v===v.trim()]];
const accepted=v=>rules.every(([,test])=>test(v));
const fields='input[data-new-password14257],#phoneUserSettings input[name="password"],#userAccessPassword,#recoveryPassword,#phoneNewPassword,input[autocomplete="new-password"]';
function update(n){
 if(!n.matches(fields)||/confirm/i.test(n.id+' '+n.name))return;
 let help=n.parentElement.querySelector('[data-password-help14257]');
 if(!help){help=document.createElement('div');help.dataset.passwordHelp14257='';help.style.cssText='font:12px/1.5 sans-serif;white-space:normal;margin-top:5px';help.id='password-help-'+Math.random().toString(36).slice(2);n.after(help);n.setAttribute('aria-describedby',help.id)}
 if(n.id==='userAccessPassword')help.hidden=!n.value||document.activeElement!==n;
 const valid=accepted(n.value),required=n.required||n.value.length>0;
 const signature=JSON.stringify([n.value.length,rules.map(([,test])=>test(n.value)),required]);
 if(help.dataset.result!==signature){help.dataset.result=signature;help.replaceChildren();const title=document.createElement('strong');title.textContent=!n.value?'Password requirements':valid?'Meets password requirements':'Password is not strong enough';help.append(title);for(const [label,test]of rules){const row=document.createElement('div');row.textContent=(test(n.value)?'✓ ':'○ ')+label;row.style.color=test(n.value)?'#137649':'#8a3832';help.append(row)}}
 n.setCustomValidity(required&&!valid?'Use a password that meets all the requirements shown below.':'');
 const form=n.form;if(form)for(const b of form.querySelectorAll('[type=submit]')){if([...form.querySelectorAll(fields)].some(f=>!f.disabled&&!/confirm/i.test(f.id+' '+f.name)&&(f.required||f.value.length>0)&&!accepted(f.value))){if(!b.disabled)b.dataset.passwordDisabled14257='1';b.disabled=true}else if(b.dataset.passwordDisabled14257){b.disabled=false;delete b.dataset.passwordDisabled14257}}
}
function scan(){document.querySelectorAll(fields).forEach(update)}
document.addEventListener('input',e=>{if(e.target.matches?.(fields))update(e.target)});
document.addEventListener('focusin',e=>{if(e.target.matches?.(fields))update(e.target)});
document.addEventListener('focusout',e=>{if(e.target.id==='userAccessPassword'){const help=e.target.parentElement.querySelector('[data-password-help14257]');if(help)help.hidden=true}});
document.addEventListener('submit',e=>{for(const n of e.target.querySelectorAll(fields)){update(n);if(!n.checkValidity()){e.preventDefault();e.stopImmediatePropagation();n.reportValidity();return}}},true);
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan()})}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});window.passwordPolicy14257={accepted,scan,update,rules};schedule();
})();
