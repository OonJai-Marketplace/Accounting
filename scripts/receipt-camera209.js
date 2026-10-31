/* Browser camera lifecycle. Full-resolution stills use the existing encrypted draft pipeline. */
(()=>{'use strict';
 let stream=null,request=0,watchRequest=0,video=null,edgeTimer=null,resumeWatch=null;
 function stop(){request++;watchRequest++;resumeWatch=null;if(edgeTimer!==null){clearTimeout(edgeTimer);edgeTimer=null;}if(stream)for(const track of stream.getTracks())track.stop();stream=null;if(video)video.srcObject=null;video=null;}
 async function start(element){
  stop();const ticket=request;void window.ReceiptDetector213?.warmup();
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Live camera is unavailable here. Use Phone camera or Import photos.');
  let next;
  try{next=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:2560},height:{ideal:1920}}});}
  catch(e){throw Error(e.name==='NotAllowedError'?'Camera access was not allowed. Enable it in your browser, or use Phone camera / Import photos.':'The camera could not open. Use Phone camera / Import photos.');}
  if(ticket!==request||document.hidden){for(const track of next.getTracks())track.stop();return false;}
  stream=next;video=element;element.srcObject=next;
  try{await element.play();}catch(e){if(ticket!==request)return false;stop();throw Error('The camera could not start. Use Phone camera / Import photos.');}
  return ticket===request;
 }
 function frame(){
  if(!video||!stream||!video.videoWidth||!video.videoHeight)throw Error('The camera is still opening. Try Capture again.');
  const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  canvas.getContext('2d').drawImage(video,0,0);return canvas;
 }
 function capture(){return frame().toDataURL('image/jpeg',.97);}
 async function captureScan(canvas=frame()){const [found,original]=await Promise.all([window.ReceiptCore202.detectDocument(canvas),window.ReceiptCore202.jpeg(canvas,.97)]);return {original,corners:found.corners,automatic:found.automatic,source:canvas};}
 function watch(onEdges){
  if(edgeTimer!==null)clearTimeout(edgeTimer);const ticket=request,watchTicket=++watchRequest;
  let track=window.ReceiptDetectorPolicy213.tracker(),inFlight=false;
  const currentWatch=()=>ticket===request&&watchTicket===watchRequest&&stream&&video;
  async function inspect(){
   edgeTimer=null;if(inFlight||!currentWatch()||document.hidden)return;
   const current=video,w=current.videoWidth,h=current.videoHeight;inFlight=true;
   try{if(w&&h){const found=await window.ReceiptCore202.detectDocument(current,{live:true});if(currentWatch()&&video===current&&!document.hidden)onEdges(track(found),w,h);}}
   catch{if(currentWatch()&&!document.hidden)onEdges(track(window.ReceiptDetectorPolicy213.full()),w,h);}
   finally{inFlight=false;if(currentWatch()&&!document.hidden)edgeTimer=setTimeout(inspect,120);}
  }
  resumeWatch=hidden=>{track=window.ReceiptDetectorPolicy213.tracker();if(hidden)onEdges(window.ReceiptDetectorPolicy213.full(),video?.videoWidth,video?.videoHeight);else void inspect();};
  void inspect();
 }
 document.addEventListener?.('visibilitychange',()=>{if(edgeTimer!==null){clearTimeout(edgeTimer);edgeTimer=null;}resumeWatch?.(document.hidden);});
 window.ReceiptCamera209={start,stop,capture,frame,captureScan,watch,get active(){return !!stream}};
 window.addEventListener('pagehide',stop);
})();
