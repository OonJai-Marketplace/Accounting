/* Private receipt bytes live in the same account's encrypted device vault. */
(()=>{
 'use strict';
 let opening;
 function database(){
  if(!opening)opening=new Promise((resolve,reject)=>{
   const q=indexedDB.open('ojm-receipt-pages',1);
   q.onupgradeneeded=()=>q.result.createObjectStore('records');
   q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  }).catch(e=>{opening=null;throw e;});
  return opening;
 }
 function owner(){
  const v=window.deviceVault14334;
  return v?.unlocked && v.actor && typeof liveProfile!=='undefined' && v.actor===liveProfile?.id && window.access113?.can('journal','view')?
   window.OJM_SUPABASE_URL+':'+v.actor:null;
 }
 async function read(name,keyOnly=false){
  const id=owner();if(!id)return;
  const key=id+':'+name,db=await database();
  const result=await new Promise((resolve,reject)=>{
   const store=db.transaction('records').objectStore('records'),q=keyOnly?store.getKey(key):store.get(key);
   q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  });
  if(id!==owner() || !result)return;
  return keyOnly?true:deviceVault14334.unpack(result.value,key);
 }
 async function save(name,data){
  const id=owner();if(!id)return;
  const key=id+':'+name;
  const value=await deviceVault14334.packAsync(data,key),db=await database();
  if(id!==owner())return;
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');
   store.put({owner:id,value},key);
   tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error);
  });
 }
 async function entryKeys(){
  const id=owner();if(!id)return new Set();
  const prefix=id+':entry:',db=await database();
  const keys=await new Promise((resolve,reject)=>{
   const q=db.transaction('records').objectStore('records').getAllKeys(IDBKeyRange.bound(prefix,prefix+'\uffff'));
   q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  });
  return new Set(owner()===id?keys.map(k=>k.slice(prefix.length)):[]);
 }
 async function putImage(key,blob){
  const id=owner();if(!id)return;
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
  if(owner()===id)await save('page:'+key,data);
 }
 async function getImage(key){
  const url=await read('page:'+key);if(!url || !/^data:image\/[a-z0-9.+-]+;base64,/i.test(url))return;
  const sep=url.indexOf(','),bytes=Uint8Array.from(atob(url.slice(sep+1)),c=>c.charCodeAt(0));
  return new Blob([bytes],{type:url.slice(5,url.indexOf(';'))});
 }
 window.ReceiptPageCache={read,save,entryKeys,putImage,getImage,hasImage:key=>read('page:'+key,true)};
})();
