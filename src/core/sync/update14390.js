/* Independent update entry point. Never reads or removes accounting storage. */
(()=>{'use strict';
let VERSION='143.211';
const status=document.getElementById('updateStatus'),retry=document.getElementById('updateRetry'),progress=document.getElementById('updateProgress');
let attempt=0,finished=false,timer,poll,registration,unwatch=()=>{},lastProgress='',reportedError=false;
function fail(message){clearTimeout(timer);clearInterval(poll);status.textContent=message;retry.hidden=false;}
function watchForStall(token){clearTimeout(timer);timer=setTimeout(()=>{if(token===attempt&&!finished)fail('The update has stopped making progress. Tap Retry update. Completed files are saved; this does not necessarily mean your internet is disconnected.')},90000);}
function showProgress(data,token){
 if(finished||token!==attempt||data?.version!==VERSION)return;
 if(data.type==='ojm-shell-error'){
  reportedError=true;fail((data.message||'Some files could not download.')+(data.file?' ('+data.file+')':'')+' Tap Retry update.');return;
 }
 if(data.type!=='ojm-shell-progress'||!data.total||reportedError)return;
 const signature=JSON.stringify([data.completed,data.file,data.bytes,data.retry]);
 if(signature!==lastProgress){lastProgress=signature;watchForStall(token);}
 progress.value=data.completed/data.total;
 const file=data.file?.split('/').pop();
 status.textContent='Downloading update: '+Math.round(progress.value*100)+'% · '+Math.max(0,data.total-data.completed)+' files remaining'+(file?' · '+file:'')+(data.bytes?' · '+Math.ceil(data.bytes/1024)+' KB':'')+(data.retry?' · retry '+data.retry:'');
}
async function verify(worker,token){
 if(!worker||finished||token!==attempt)return;
 const channel=new MessageChannel();let timeout;
 try{
  const reply=await new Promise((resolve,reject)=>{timeout=setTimeout(()=>reject(Error('Waiting for the new website files.')),2000);channel.port1.onmessage=e=>resolve(e.data);worker.postMessage({type:'ojm-shell-status'},[channel.port2])});
  if(token!==attempt||finished)return;
  if(reply.progress)showProgress(reply.progress,token);
  if(worker.state!=='activated'||!reply.ready)return;
  if(String(reply.version).localeCompare(VERSION,undefined,{numeric:true})<0){if(new URL(worker.scriptURL).searchParams.get('v')===VERSION&&!registration?.installing&&!registration?.waiting){reportedError=true;fail('The website announced '+VERSION+' but supplied offline files for '+reply.version+'. The release files do not match. Retry after publication finishes.');}return;}
  finished=true;clearTimeout(timer);clearInterval(poll);unwatch();status.textContent='Update ready. Opening Accounting…';progress.value=1;
  const url=new URL('desktop.html',location.href);url.searchParams.set('v',reply.version);location.replace(url.href);
 }catch{}finally{clearTimeout(timeout);channel.port1.close();}
}
async function start(){
 const token=++attempt;finished=false;reportedError=false;lastProgress='';clearTimeout(timer);clearInterval(poll);unwatch();retry.hidden=true;progress.removeAttribute('value');status.textContent='Downloading update…';
 if(!('serviceWorker'in navigator)){fail('This browser cannot prepare the offline update. Open Accounting in Safari.');return;}
 if(navigator.onLine===false){fail('Reconnect to the internet, then tap Retry update.');return;}
 watchForStall(token);
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch('release-version.json?check='+Date.now(),{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Unable to check the published version');
   const release=await response.json();if(!/^\d+\.\d+$/.test(release.version))throw Error('Invalid published version');
   if(release.version.localeCompare(VERSION,undefined,{numeric:true})>0)VERSION=release.version;
   const notes=document.getElementById('updateNotes');notes.replaceChildren();
   if(Array.isArray(release.changes)&&release.changes.length){const heading=document.createElement('h2');heading.textContent='What changed in '+release.version;const list=document.createElement('ul');for(const change of release.changes.filter(x=>typeof x==='string').slice(0,30)){const li=document.createElement('li');li.textContent=change;list.append(li)}notes.append(heading,list);notes.hidden=false;}
  }finally{clearTimeout(timeout);}
  registration=await navigator.serviceWorker.register('desktop-sw14242.js?v='+VERSION,{scope:'./',updateViaCache:'none'});
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
