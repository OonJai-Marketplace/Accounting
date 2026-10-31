  // Reuse the approved login gate and shared six-marble animation on phones.
  function releasePhoneLogin210() {
    document.documentElement.classList.remove('session-checking1444');
    $('loginGate').classList.remove('busy99');$('loginProgress99').hidden=true;
    $('loginForm').removeAttribute('aria-busy');$('loginForm').querySelector('[type=submit]').disabled=false;
  }
  window.releaseLogin1443=releasePhoneLogin210;
  window.phoneLogin210={
    start(){document.documentElement.classList.remove('session-checking1444');$('loginGate').classList.remove('is-authenticated');$('loginGate').classList.add('busy99');$('loginProgress99').innerHTML=window.loading1444.markup();$('loginProgress99').hidden=false;$('loginForm').setAttribute('aria-busy','true');$('loginForm').querySelector('[type=submit]').disabled=true;},
    show(){releasePhoneLogin210();$('loginGate').classList.remove('is-authenticated');},
    finish(){releasePhoneLogin210();$('loginGate').classList.add('is-authenticated');}
  };
  async function phonePasswordReset210(){
    const input=$('loginEmail'),email=input.value.trim(),button=$('phoneForgotPassword210'),message=loginMessageTarget14293();
    if(authBusy||button.disabled)return;
    if(!email||!input.checkValidity()){message.textContent='Enter a valid email address first.';input.focus();return;}
    button.disabled=true;
    try{
      if(!db)throw Error('Authentication is still loading. Try again in a moment.');
      const url=new URL(String(window.OJM_PUBLIC_APP_URL||localStorage.getItem('ojm_public_app_url105')||window.location.href).trim());
      if(url.protocol!=='https:'||/^(?:localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(url.hostname)||/\.(?:local|localhost)$/i.test(url.hostname)||/(?:stackblitz|webcontainer|codesandbox)/i.test(url.hostname))throw Error('Open the published HTTPS app to request a password reset.');
      url.username='';url.password='';url.hash='';url.search='';url.searchParams.set('password-recovery','1');
      const result=await db.auth.resetPasswordForEmail(email,{redirectTo:url.href});if(result.error)throw result.error;
      message.textContent='If this account exists, check its recovery email and open the secure link.';
    }catch(e){message.textContent=e.message||'Recovery could not be requested. Try again.';}
    finally{button.disabled=false;}
  }
