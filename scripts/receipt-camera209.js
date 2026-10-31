/* Browser camera lifecycle. Full-resolution stills use the existing encrypted draft pipeline. */
(()=>{'use strict';
 let stream=null,request=0,video=null,edgeTimer=null;
 function stop(){request++;if(edgeTimer!==null){clearTimeout(edgeTimer);edgeTimer=null;}if(stream)for(const track of stream.getTracks())track.stop();stream=null;if(video)video.srcObject=null;video=null;}
 async function start(element){
  stop();const ticket=request;
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
 function captureScan(){const canvas=frame(),found=window.ReceiptCore202.detect(canvas);return {original:canvas.toDataURL('image/jpeg',.97),corners:found.corners,automatic:found.automatic};}
 function watch(onEdges){
  if(edgeTimer!==null)clearTimeout(edgeTimer);const ticket=request;let previous=null;
  function inspect(){
   if(ticket!==request||!stream||!video||document.hidden)return;
   try{if(video.videoWidth&&video.videoHeight){const found=window.ReceiptCore202.detect(video,320);if(found.automatic){if(previous&&found.corners.every((p,i)=>Math.hypot(p[0]-previous[i][0],p[1]-previous[i][1])<.06))found.corners=found.corners.map((p,i)=>p.map((v,j)=>v*.65+previous[i][j]*.35));previous=found.corners;}else previous=null;onEdges(found,video.videoWidth,video.videoHeight);}}catch{onEdges({automatic:false,corners:[]});}
   if(ticket===request&&stream)edgeTimer=setTimeout(inspect,240);
  }
  inspect();
 }
 window.ReceiptCamera209={start,stop,capture,captureScan,watch,get active(){return !!stream}};
 window.addEventListener('pagehide',stop);
})();
