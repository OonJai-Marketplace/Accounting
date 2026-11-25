/* Independent update entry point. Never reads or removes accounting storage. */
(()=>{'use strict';
let VERSION='143.505';
const ua=navigator.userAgent||'';
const phone=/iPhone|iPod/i.test(ua)||/Android/i.test(ua)&&/Mobile/i.test(ua);
const workerFile=phone?'phone-sw.js':'desktop-sw14242.js';
const status=document.getElementById('updateStatus'),retry=document.getElementById('updateRetry'),progress=document.getElementById('updateProgress');
let attempt=0,finished=false,timer,poll,registration,unwatch=()=>{},lastProgress='',reportedError=false;
let firstFileTimer,hasFileActivity=false;
const resumeParameter='resumeUpdate';
function fail(message){clearTimeout(firstFileTimer);clearTimeout(timer);clearInterval(poll);status.textContent=message;retry.hidden=false;}
function recoverFirstVisit(token){
 clearTimeout(firstFileTimer);
 const url=new URL(location.href);
 if(token!==attempt||finished||reportedError||hasFileActivity||url.searchParams.get(resumeParameter)===VERSION)return;
 firstFileTimer=setTimeout(()=>{
  if(token!==attempt||finished||reportedError||hasFileActivity||navigator.onLine===false)return;
  url.searchParams.set(resumeParameter,VERSION);
  url.searchParams.set('version',VERSION);
  status.textContent='Reconnecting to the update…';
  location.replace(url.href);
 },15000);
}
function watchForStall(token){clearTimeout(timer);timer=setTimeout(()=>{if(token===attempt&&!finished)fail('The update has stopped making progress. Tap Retry update. Completed files are saved; this does not necessarily mean your internet is disconnected.')},90000);}
function showProgress(data,token){
 if(finished||token!==attempt||data?.version!==VERSION)return;
 if(data.type==='ojm-shell-error'){
  reportedError=true;fail((data.message||'Some files could not download.')+(data.file?' ('+data.file+')':'')+' Tap Retry update.');return;
 }
 if(data.type!=='ojm-shell-progress'||!data.total||reportedError)return;
 if(data.completed>0||data.bytes>0){hasFileActivity=true;clearTimeout(firstFileTimer);}
 const signature=JSON.stringify([data.phase,data.completed,data.file,data.bytes,data.retry]);
 if(signature===lastProgress)return;
 lastProgress=signature;watchForStall(token);
 progress.value=data.completed/data.total;
 const file=data.file?.split('/').pop();
 const action=data.phase==='checking'?'Checking saved files':'Downloading update';
 status.textContent=action+': '+Math.round(progress.value*100)+'% · '+Math.max(0,data.total-data.completed)+' files remaining'+(file?' · '+file:'')+(data.bytes?' · '+Math.ceil(data.bytes/1024)+' KB':'')+(data.retry?' · retry '+data.retry:'');
}
async function verify(worker,token){
 if(!worker||finished||token!==attempt||new URL(worker.scriptURL).pathname!==new URL(workerFile,location.href).pathname)return;
 const channel=new MessageChannel();let timeout;
 try{
  const reply=await new Promise((resolve,reject)=>{timeout=setTimeout(()=>reject(Error('Waiting for the new website files.')),2000);channel.port1.onmessage=e=>resolve(e.data);worker.postMessage({type:'ojm-shell-status'},[channel.port2])});
  if(token!==attempt||finished)return;
  if(reply.progress)showProgress(reply.progress,token);
  if(worker.state!=='activated'||!reply.ready)return;
  if(String(reply.version).localeCompare(VERSION,undefined,{numeric:true})<0){if(new URL(worker.scriptURL).searchParams.get('v')===VERSION&&!registration?.installing&&!registration?.waiting){reportedError=true;fail('The website announced '+VERSION+' but supplied offline files for '+reply.version+'. The release files do not match. Retry after publication finishes.');}return;}
  finished=true;clearTimeout(firstFileTimer);clearTimeout(timer);clearInterval(poll);unwatch();status.textContent='Update ready. Opening Accounting…';progress.value=1;
  const url=new URL(phone?'phone.html':'desktop.html',location.href);url.searchParams.set('v',reply.version);location.replace(url.href);
 }catch{}finally{clearTimeout(timeout);channel.port1.close();}
}
function announcedRelease(){
 const params=new URL(location.href).searchParams;
 const announced=params.get('version')||params.get('v');
 if(announced!==VERSION)return null;
 try{
  const release=JSON.parse(document.getElementById('updateRelease').textContent);
  return release.version===announced&&Array.isArray(release.changes)?release:null;
 }catch{return null;}
}
async function fetchRelease(){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch('release-version.json?check='+Date.now(),{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('Unable to check the published version');
  const release=await response.json();
  if(!/^\d+\.\d+$/.test(release.version))throw Error('Invalid published version');
  return release;
 }finally{clearTimeout(timeout);}
}
async function start(){
 const token=++attempt;finished=false;reportedError=false;hasFileActivity=false;lastProgress='';clearTimeout(firstFileTimer);clearTimeout(timer);clearInterval(poll);unwatch();retry.hidden=true;progress.removeAttribute('value');status.textContent='Checking the latest version…';
 if(!('serviceWorker'in navigator)){fail('This browser cannot prepare the offline update. Open Accounting in a browser that supports offline apps.');return;}
 if(navigator.onLine===false){fail('Reconnect to the internet, then tap Retry update.');return;}
 watchForStall(token);
 try{
  // Settings and the phone reload check already put the detected version in the link.
  // Direct visits, publication mismatches and explicit retries still check the server.
  const release=(token===1&&announcedRelease())||await fetchRelease();
  if(token!==attempt)return;
  if(release.version.localeCompare(VERSION,undefined,{numeric:true})>0)VERSION=release.version;
  const notes=document.getElementById('updateNotes');notes.replaceChildren();
  if(Array.isArray(release.changes)&&release.changes.length){const heading=document.createElement('h2');heading.textContent='What changed in '+release.version;const list=document.createElement('ul');for(const change of release.changes.filter(x=>typeof x==='string').slice(0,30)){const li=document.createElement('li');li.textContent=change;list.append(li)}notes.append(heading,list);notes.hidden=false;}
  status.textContent='Starting the download…';
  if(!phone)recoverFirstVisit(token);
  registration=await navigator.serviceWorker.register(workerFile+'?v='+VERSION,{scope:'./',updateViaCache:'none'});
  if(token!==attempt)return;
  const watched=new Map();
  const watch=()=>{
   const worker=registration.installing;if(!worker||watched.has(worker))return;
   const change=()=>{if(token!==attempt)return;if(worker.state==='activated')verify(worker,token);else if(worker.state==='redundant'&&!finished&&!reportedError)fail('Some files could not download. Completed files are saved. Tap Retry update.');};
   watched.set(worker,change);worker.addEventListener('statechange',change);verify(worker,token);
  };
  registration.addEventListener('updatefound',watch);
  unwatch=()=>{registration.removeEventListener('updatefound',watch);for(const [worker,change]of watched)worker.removeEventListener('statechange',change);};
  watch();await verify(registration.active,token);
  if(finished||reportedError)return;
  poll=setInterval(()=>{verify(registration.installing||registration.waiting||registration.active,token)},4000);
  if(!registration.installing&&!registration.waiting)await registration.update();
 }catch(e){if(token===attempt)fail('The update could not finish: '+e.message+'. Tap Retry update.');}
}
navigator.serviceWorker?.addEventListener('message',e=>{
 if(e.data?.version!==VERSION)return;
 if(e.data.type==='ojm-shell-ready')verify(registration?.active||navigator.serviceWorker.controller,attempt);
 else showProgress(e.data,attempt);
});
navigator.serviceWorker?.addEventListener('controllerchange',()=>verify(registration?.active||navigator.serviceWorker.controller,attempt));
retry.addEventListener('click',start);start();
})();
