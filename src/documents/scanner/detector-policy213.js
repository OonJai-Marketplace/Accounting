/* Shared, deterministic safety checks for trained document-corner predictions. */
(function(root){'use strict';
 const full=()=>({automatic:false,corners:[[0,0],[1,0],[1,1],[0,1]],confidence:0});
 function accept(coords,score){
  if(!Number.isFinite(score)||score<.9||!coords||coords.length!==8)return full();
  const p=Array.from({length:4},(_,i)=>[coords[i*2],coords[i*2+1]]);
  // An edge at the frame boundary can mean a clipped document. Keep the original.
  if(p.some(a=>a.some(v=>!Number.isFinite(v)||v<.006||v>.994)))return full();
  let area=0;
  for(let i=0;i<4;i++){
   const a=p[i],b=p[(i+1)%4],c=p[(i+2)%4];
   const cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
   if(cross<.001||Math.hypot(a[0]-b[0],a[1]-b[1])<.045)return full();
   area+=a[0]*b[1]-b[0]*a[1];
  }
  if(area/2<.025||area/2>.97)return full();
  // A little breathing room protects thin borders, digits and signatures.
  const center=[0,1].map(j=>p.reduce((n,a)=>n+a[j],0)/4);
  const corners=p.map(a=>a.map((v,j)=>Math.max(0,Math.min(1,center[j]+(v-center[j])*1.018))));
  return {automatic:true,corners,confidence:score,method:'model'};
 }
 function tracker(){
  let previous=null,count=0;
  return found=>{
   if(!found.automatic){previous=null;count=0;return found;}
   const close=previous&&found.corners.every((p,i)=>Math.hypot(p[0]-previous[i][0],p[1]-previous[i][1])<.045);
   count=close?count+1:1;
   previous=close?found.corners.map((p,i)=>p.map((v,j)=>v*.7+previous[i][j]*.3)):found.corners.map(p=>p.slice());
   // Never leave the old outline over a moved/removed document.
   return count<2?{...full(),status:'aligning'}:{...found,corners:previous,stable:true};
  };
 }
 const api={full,accept,tracker};root.ReceiptDetectorPolicy213=api;
 if(typeof module!=='undefined')module.exports=api;
})(globalThis);
