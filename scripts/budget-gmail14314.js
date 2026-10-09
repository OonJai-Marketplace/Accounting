/* Browser-only Gmail authorization. Access tokens stay in this page's memory. */
(()=>{'use strict';
const SEND='https://www.googleapis.com/auth/gmail.send',EMAIL='https://www.googleapis.com/auth/userinfo.email';
let session=null,loading=null,generation=0,sending=false;
const actor=()=>liveProfile?.role==='admin'&&window.access113?.can('transactions-budget14313')?liveProfile.id:'';
function clear(){session=null;generation++}
function ensure(owner){if(!owner||actor()!==owner)throw Error('Administrator access changed. Reopen Budget Request.');}
function status(clientId){if(session&&(session.owner!==actor()||session.clientId!==clientId||session.expires<=Date.now()))clear();return {connected:!!session,email:session?.email||''};}
function validClientId(value){return /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(String(value||'').trim())}
function load(){
 if(window.google?.accounts?.oauth2)return Promise.resolve();
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
  const timer=setTimeout(()=>{script.remove();reject(Error('Google could not load. Check your connection and try again.'));},15000);
  script.onload=()=>{clearTimeout(timer);if(window.google?.accounts?.oauth2)resolve();else reject(Error('Google authorization is unavailable.'));};
  script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('Google could not load. Check your connection and try again.'));};
  document.head.append(script);
 }).catch(e=>{loading=null;throw e});return loading;
}
// Invoke from the Connect Gmail click itself so Google's account chooser is allowed.
function connect(clientId){
 const owner=actor();ensure(owner);clientId=String(clientId||'').trim();
 if(!validClientId(clientId))return Promise.reject(Error('Complete Gmail setup in Budget Request Settings first.'));
 if(!window.google?.accounts?.oauth2){load().catch(()=>{});return Promise.reject(Error('Google is loading. Click Connect Gmail again in a moment.'));}
 clear();const epoch=generation;
 return new Promise((resolve,reject)=>{
  let settled=false;const finish=(err,result)=>{if(settled)return;settled=true;clearTimeout(timer);err?reject(err):resolve(result)};
  const timer=setTimeout(()=>finish(Error('Gmail connection timed out. Click Connect Gmail to try again.')),120000);
  const client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:SEND+' '+EMAIL,include_granted_scopes:false,
   error_callback:()=>finish(Error('Gmail connection was cancelled or the popup was blocked.')),
   callback:async response=>{
    if(settled)return;
    try{
     ensure(owner);if(epoch!==generation)throw Error('Gmail connection changed. Please reconnect.');
     if(response.error||!response.access_token||!google.accounts.oauth2.hasGrantedAllScopes(response,SEND,EMAIL))throw Error('Allow Gmail sending and email identity permissions to connect.');
     const r=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+response.access_token},cache:'no-store',signal:AbortSignal.timeout(15000)});
     if(!r.ok)throw Error('Your Gmail address could not be verified. Please reconnect.');
     const identity=await r.json();ensure(owner);
     if(settled||epoch!==generation)throw Error('Gmail connection changed. Please reconnect.');
     if(!identity.email||identity.email_verified!==true)throw Error('Connect a verified Google email account.');
     session={owner,clientId,email:identity.email,token:response.access_token,expires:Date.now()+Math.max(0,Number(response.expires_in||3600)-60)*1000};
     finish(null,{email:session.email});
    }catch(e){finish(e)}
   }});
  try{client.requestAccessToken({prompt:'select_account'})}catch(e){finish(e)}
 });
}
function recipients(value){
 const list=[...new Set(String(value||'').split(/[,;\n]+/).map(s=>s.trim().toLowerCase()).filter(Boolean))];
 if(!list.length)throw Error('Add at least one email recipient.');
 if(list.length>100)throw Error('Use at most 100 recipients per request.');
 if(list.some(s=>s.length>254||! /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(s)))throw Error('Check the recipient email addresses. Use addresses separated by commas.');
 return list;
}
function base64(value){const bytes=new TextEncoder().encode(value);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary)}
function subjectHeader(value){
 const chunks=[];let chunk='';for(const c of String(value||'Budget request').replace(/[\r\n]/g,' ')){
  if(new TextEncoder().encode(chunk+c).length>42){chunks.push(chunk);chunk=''}chunk+=c;
 }if(chunk)chunks.push(chunk);return chunks.map(s=>'=?UTF-8?B?'+base64(s)+'?=').join('\r\n ');
}
function rawMessage({from,to,subject,detail,html,messageId}){
 const checked=recipients(to);if(!/^[^\s<>\r\n@]+@[^\s<>\r\n@]+$/.test(from))throw Error('Reconnect Gmail to verify the sender.');
 const boundary='oonjai-'+crypto.randomUUID();
 const part=(type,text)=>['--'+boundary,'Content-Type: '+type+'; charset=UTF-8','Content-Transfer-Encoding: base64','',base64(text).match(/.{1,76}/g)?.join('\r\n')||''].join('\r\n');
 const mime=['From: '+from,'To: '+checked.join(',\r\n '),'Subject: '+subjectHeader(subject),'Date: '+new Date().toUTCString(),'Message-ID: <'+messageId+'@oonjai-budget.invalid>','MIME-Version: 1.0','Content-Type: multipart/alternative; boundary="'+boundary+'"','',part('text/plain',detail),part('text/html',html),'--'+boundary+'--',''].join('\r\n');
 return base64(mime).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function send(clientId,message){
 const owner=actor();ensure(owner);if(sending)throw Error('An email is already being sent.');
 if(!status(clientId).connected)throw Error('Connect Gmail before sending.');
 if(navigator.onLine===false)throw Error('Sending email needs an internet connection.');
 if(message.from!==session.email)throw Error('The Gmail sender changed. Review the message again.');
 const raw=rawMessage(message),token=session.token;sending=true;
 try{
  const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({raw}),cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!r.ok){if(r.status===401)clear();const e=Error(r.status===401?'Gmail authorization expired. Reconnect Gmail before sending.':r.status===403?'Google refused sending. Check Gmail API setup and sending permission.':r.status===429?'Gmail sending limit reached. Try again later.':'Gmail did not confirm sending. Check Gmail Sent before trying again.');e.uncertain=r.status>=500;throw e;}
  const result=await r.json();if(!result.id){const e=Error('Gmail did not confirm sending. Check Gmail Sent before trying again.');e.uncertain=true;throw e;}
  return {id:result.id,email:message.from};
 }catch(e){if(e.uncertain!==undefined)throw e;const unknown=Error('Sending could not be confirmed. Check Gmail Sent before trying again to avoid sending twice.');unknown.uncertain=true;throw unknown}
 finally{sending=false}
}
function disconnect(){clear();}
const gate=document.getElementById('loginGate');if(gate)new MutationObserver(()=>{if(!gate.classList.contains('is-authenticated')||session&&session.owner!==actor())clear()}).observe(gate,{attributes:true,attributeFilter:['class']});
window.addEventListener('page113',()=>{if(session&&session.owner!==actor())clear()});
window.addEventListener('pagehide',clear);
window.budgetGmail14314={load,connect,disconnect,status,validClientId,recipients,rawMessage,send};
})();
