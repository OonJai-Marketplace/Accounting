/* Local document inference in a reusable worker; no camera pixels leave the device. */
(function(root){'use strict';
 const policy=root.ReceiptDetectorPolicy213;
 const script=typeof document!=='undefined'?document.currentScript?.src:null;
 const workerURL=script?new URL('receipt-detector-worker213.js?v=143.213',script):null;
 let worker=null,ready=null,state='idle',serial=0,failedAt=0;
 const waiting=new Map();
 function fail(){
  state='unavailable';failedAt=Date.now();worker?.terminate();worker=null;ready=null;
  for(const task of waiting.values()){clearTimeout(task.timer);task.resolve(null);}waiting.clear();
 }
 function ask(message,transfer=[],timeout=2000){
  if(!worker)return Promise.resolve(null);
  return new Promise(resolve=>{
   const id=++serial,timer=setTimeout(fail,timeout);waiting.set(id,{resolve,timer});
   try{worker.postMessage({...message,id},transfer);}catch{fail();}
  });
 }
 function warmup(){
  if(ready)return ready;
  if(!workerURL||typeof Worker==='undefined'||state==='unavailable'&&Date.now()-failedAt<15000)return Promise.resolve(false);
  state='loading';
  try{
   worker=new Worker(workerURL);
   worker.onerror=fail;worker.onmessage=({data})=>{
    const task=waiting.get(data?.id);if(!task)return;waiting.delete(data.id);clearTimeout(task.timer);
    if(data.error){task.resolve(null);fail();return;}task.resolve(data);
   };
   ready=ask({type:'ready'},[],15000).then(result=>{if(!result){ready=null;return false;}state='ready';return true;});
  }catch{fail();return Promise.resolve(false);}
  return ready;
 }
 function prepare(source){
  const c=document.createElement('canvas');c.width=c.height=224;
  const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(source,0,0,224,224);
  return x.getImageData(0,0,224,224).data;
 }
 async function boundedReady(){
  let timer;try{return await Promise.race([warmup(),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),1200);})]);}finally{clearTimeout(timer);}
 }
 async function detect(source,fallback,{live=false}={}){
  void warmup();
  // Live frames never queue up while the model downloads. Capture can always proceed.
  if(live&&state!=='ready')return {...policy.full(),status:state==='loading'?'preparing':'unavailable'};
  if(state==='ready'||!live&&await boundedReady()){
   try{
    const pixels=prepare(source),result=await ask({type:'detect',pixels},[pixels.buffer]);
    if(result)return policy.accept(result.coords,result.score);
   }catch{fail();}
  }
  // Unsupported/offline-first-use devices retain a conservative local fallback.
  if(live)return {...policy.full(),status:'unavailable'};
  try{const found=fallback();if(found.automatic&&found.confidence>=.85)return {...found,method:'edges'};}catch{}
  return policy.full();
 }
 root.ReceiptDetector213={warmup,detect,get state(){return state;}};
 if(typeof addEventListener==='function')addEventListener('pagehide',()=>{fail();state='idle';failedAt=0;});
})(globalThis);
