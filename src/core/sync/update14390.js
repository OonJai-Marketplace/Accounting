/* Independent update entry point. Never reads or removes accounting storage. */
(()=>{'use strict';
let VERSION='143.106';const status=document.getElementById('updateStatus'),retry=document.getElementById('updateRetry'),progress=document.getElementById('updateProgress');
let attempt=0,finished=false,timer,registration;
function fail(message){clearTimeout(timer);status.textContent=message;retry.hidden=false;progress.removeAttribute('value')}
async function verify(worker,token){
 if(!worker||finished||token!==attempt)return;
 const channel=new MessageChannel();let timeout;
 try{const reply=await new Promise((resolve,reject)=>{timeout=setTimeout(()=>reject(Error('Waiting for the new website files.')),2000);channel.port1.onmessage=e=>resolve(e.data);worker.postMessage({type:'ojm-shell-status'},[channel.port2])});
  if(token!==attempt||!reply.ready||String(reply.version).localeCompare(VERSION,undefined,{numeric:true})<0)return;
  finished=true;clearTimeout(timer);status.textContent='Update ready. Opening Accounting…';progress.value=1;
  const url=new URL('desktop.html',location.href);url.searchParams.set('v',reply.version);location.replace(url.href);
 }catch{}finally{clearTimeout(timeout);channel.port1.close()}
}
async function start(){
 const token=++attempt;finished=false;clearTimeout(timer);retry.hidden=true;progress.removeAttribute('value');status.textContent='Downloading update…';
 if(!('serviceWorker'in navigator)){fail('This browser cannot prepare the offline update. Open Accounting in Safari.');return}
 if(navigator.onLine===false){fail('Reconnect to the internet, then tap Retry update.');return}
 timer=setTimeout(()=>{if(token===attempt&&!finished)fail('The download timed out. Tap Retry update.')},180000);
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{const response=await fetch('release-version.json?check='+Date.now(),{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('Unable to check the published version');const release=await response.json();if(!/^\d+\.\d+$/.test(release.version))throw Error('Invalid published version');if(release.version.localeCompare(VERSION,undefined,{numeric:true})>0)VERSION=release.version;const notes=document.getElementById('updateNotes');notes.replaceChildren();if(Array.isArray(release.changes)&&release.changes.length){const heading=document.createElement('h2');heading.textContent='What changed in '+release.version;const list=document.createElement('ul');for(const change of release.changes.filter(x=>typeof x==='string').slice(0,30)){const li=document.createElement('li');li.textContent=change;list.append(li)}notes.append(heading,list);notes.hidden=false;}}finally{clearTimeout(timeout)}
  registration=await navigator.serviceWorker.register('desktop-sw14242.js?v='+VERSION,{scope:'./',updateViaCache:'none'});
  if(token!==attempt)return;
  const watch=()=>{const worker=registration.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(token!==attempt)return;if(worker.state==='activated')verify(registration.active,token);else if(worker.state==='redundant'&&!finished)fail('Some files could not download. Tap Retry update.')})};
  registration.addEventListener('updatefound',watch);watch();await verify(registration.active,token);
  if(!finished&&!registration.installing&&!registration.waiting)await registration.update();
 }catch(e){if(token===attempt)fail('The update could not finish: '+e.message+'. Tap Retry update when connected.')}
}
navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.version!==VERSION)return;if(e.data.type==='ojm-shell-progress'){progress.value=e.data.completed/e.data.total;status.textContent='Downloading update: '+Math.round(e.data.completed/e.data.total*100)+'% · '+Math.max(0,e.data.total-e.data.completed)+' files remaining'}else if(e.data.type==='ojm-shell-ready')verify(registration?.active||navigator.serviceWorker.controller,attempt)});
navigator.serviceWorker?.addEventListener('controllerchange',()=>verify(registration?.active||navigator.serviceWorker.controller,attempt));
retry.addEventListener('click',start);start();
})();
