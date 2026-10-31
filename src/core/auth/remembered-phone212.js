/* Device-bound phone reopening. Persist a non-extractable wrapping key, never a password. */
(function(root){'use strict';
function createRememberedPhone212(scope, generation){
 let opened;
 const aad=new TextEncoder().encode('ojm-phone-session212:'+scope);
 function database(){return opened ||= new Promise((resolve,reject)=>{const r=indexedDB.open('ojm-device-session212',1);r.onupgradeneeded=()=>r.result.createObjectStore('sessions');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Device session storage is busy.'));});}
 async function record(mode,operation){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('sessions',mode);let value;operation(tx.objectStore('sessions'),v=>value=v);tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Device session could not be saved.'));});}
 async function load(){
  const saved=await record('readonly',(s,set)=>{s.get(scope).onsuccess=e=>set(e.target.result);});
  if(!saved||saved.generation!==generation(saved.actor)||saved.key?.extractable!==false)return null;
  const bytes=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:saved.iv,additionalData:aad},saved.key,saved.ciphertext));
  if(bytes.length!==32||saved.generation!==generation(saved.actor)){bytes.fill(0);return null;}
  return {actor:saved.actor,generation:saved.generation,key:bytes};
 }
 async function save(actor,bytes,stamp){
  if(!actor||bytes.length!==32||stamp!==generation(actor))return false;
  const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']),iv=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},key,bytes);
  if(stamp!==generation(actor))return false;
  await record('readwrite',s=>s.put({actor,generation:stamp,key,iv,ciphertext},scope));
  return stamp===generation(actor);
 }
 async function forget(actor){await record('readwrite',s=>{s.get(scope).onsuccess=e=>{if(!actor||e.target.result?.actor===actor)s.delete(scope);};});}
 return {load,save,forget};
}
root.createRememberedPhone212=createRememberedPhone212;
if(typeof module!=='undefined')module.exports=createRememberedPhone212;
})(globalThis);
