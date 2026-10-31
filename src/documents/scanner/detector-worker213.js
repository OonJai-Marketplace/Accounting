/* Dedicated worker: pinned, same-origin ONNX Runtime and DocCornerNet assets. */
'use strict';
const base=new URL('../assets/vendor/document-detector213/',self.location.href).href;
let loading;
async function initialize(){
 if(!loading)loading=(async()=>{
  const ort=await import(base+'ort-api.js');
  ort.env.wasm.wasmPaths=base;ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
  let bytes;try{const response=await fetch(base+'doccornernet_lean.ort',{signal:abort.signal});if(!response.ok)throw Error('Model unavailable');bytes=new Uint8Array(await response.arrayBuffer());}finally{clearTimeout(timer);}
  const session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
  return {ort,session};
 })();
 return loading;
}
async function detect(pixels){
 const {ort,session}=await initialize();
 if(pixels?.length!==224*224*4)throw Error('Invalid detector frame');
 const input=new Float32Array(224*224*3),mean=[.485,.456,.406],std=[.229,.224,.225];
 for(let p=0,o=0;p<pixels.length;p+=4,o+=3)for(let c=0;c<3;c++)input[o+c]=(pixels[p+c]/255-mean[c])/std[c];
 const tensor=new ort.Tensor('float32',input,[1,224,224,3]);let outputs;
 try{
  outputs=await session.run({[session.inputNames[0]]:tensor});
  const coords=outputs.coords?.data,logit=outputs.score_logit?.data?.[0];
  if(!coords||coords.length!==8||!Number.isFinite(logit))throw Error('Invalid detector result');
  return {coords:Array.from(coords),score:1/(1+Math.exp(-logit))};
 }finally{tensor.dispose();if(outputs)for(const value of Object.values(outputs))value.dispose();}
}
// A capture may arrive during the last live-frame inference. Serialize both.
let queue=Promise.resolve();
self.onmessage=({data})=>{queue=queue.then(async()=>{
 try{const result=data.type==='ready'?(await initialize(),{ready:true}):await detect(data.pixels);self.postMessage({id:data.id,...result});}
 catch{self.postMessage({id:data.id,error:true});}
});};
