/* Bounded document-boundary detection. Runs locally; no photos leave the device.
   Connected paper regions -> convex hull -> four fitted sides. Low-confidence
   scenes return no crop rather than cutting off an uncertain document. */
(function(root){'use strict';
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const area=p=>Math.abs(p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a[0]*b[1]-b[0]*a[1];},0))/2;
function hull(points){points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const lo=[],hi=[];for(const p of points){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}for(let i=points.length-1;i>=0;i--){const p=points[i];while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}lo.pop();hi.pop();return lo.concat(hi);}
function quadFromHull(points){let p=points.slice();while(p.length>4){let best=Infinity,index=-1;for(let i=0;i<p.length;i++){const a=p[(i+p.length-1)%p.length],b=p[i],c=p[(i+1)%p.length],cost=Math.abs(cross(a,b,c));if(cost<best){best=cost;index=i;}}p.splice(index,1);}if(p.length!==4)return null;let first=0;for(let i=1;i<4;i++)if(p[i][0]+p[i][1]<p[first][0]+p[first][1])first=i;return p.slice(first).concat(p.slice(0,first));}
function closePaper(gray,w,h,threshold){
 const binary=Uint8Array.from(gray,v=>v>threshold?1:0),radius=2;
 function box(input,all){const stride=w+1,sum=new Uint32Array(stride*(h+1)),out=new Uint8Array(w*h);for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=input[y*w+x];sum[(y+1)*stride+x+1]=sum[y*stride+x+1]+row;}}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const l=Math.max(0,x-radius),r=Math.min(w,x+radius+1),t=Math.max(0,y-radius),b=Math.min(h,y+radius+1),count=sum[b*stride+r]-sum[t*stride+r]-sum[b*stride+l]+sum[t*stride+l];out[y*w+x]=all?Number(count===(r-l)*(b-t)):Number(count>0);}return out;
 }
 return box(box(binary,false),true);
}
function find({data,width:w,height:h}){
 const none={automatic:false,corners:[[0,0],[1,0],[1,1],[0,1]],confidence:0};if(w<20||h<20||data.length<w*h*4)return none;
 const size=w*h,gray=new Uint8Array(size),hist=new Uint32Array(256);let total=0;
 for(let i=0;i<size;i++){const v=Math.round(data[i*4]*.299+data[i*4+1]*.587+data[i*4+2]*.114);gray[i]=v;hist[v]++;total+=v;}
 let count=0,sum=0,best=0,otsu=128;for(let t=0;t<255;t++){count+=hist[t];sum+=hist[t]*t;if(!count||count===size)continue;const d=sum/count-(total-sum)/(size-count),score=count*(size-count)*d*d;if(score>best){best=score;otsu=t;}}
 const quantile=q=>{let n=0;for(let i=0;i<256;i++){n+=hist[i];if(n>=size*q)return i;}return 255;};
 const low=quantile(.12),high=quantile(.88);if(high-low<9)return none;
 const thresholds=[...new Set([otsu+2,Math.round(low+(high-low)*.35),Math.round(low+(high-low)*.65)])];
 let winner=null;
 for(const threshold of thresholds){
  const mask=closePaper(gray,w,h,threshold),seen=new Uint8Array(size),queue=new Int32Array(size);
  for(let start=0;start<size;start++){
   if(seen[start]||!mask[start])continue;
   let head=0,tail=1,edge=0;queue[0]=start;seen[start]=1;const boundary=[];
   while(head<tail){const n=queue[head++],x=n%w,y=(n/w)|0;let rim=false;
    if(x===0||x===w-1||y===0||y===h-1)edge++;
    for(const k of [x?n-1:-1,x<w-1?n+1:-1,y?n-w:-1,y<h-1?n+w:-1]){if(k<0||!mask[k]){rim=true;continue;}if(!seen[k]){seen[k]=1;queue[tail++]=k;}}
    if(rim)boundary.push([x,y]);
   }
   if(tail<size*.065||tail>size*.94||edge>Math.min(w,h)*.12||boundary.length<12)continue;
   const outline=hull(boundary),q=quadFromHull(outline);if(!q)continue;
   const hullArea=area(outline),quadArea=area(q),fraction=quadArea/size,fit=quadArea/hullArea,fill=tail/quadArea;
   if(fraction<.07||fraction>.93||fit<.91||fill<.55||fill>1.12)continue;
   let ok=true,contrast=0,samples=0;
   const center=q.reduce((a,b)=>[a[0]+b[0]/4,a[1]+b[1]/4],[0,0]);
   for(let i=0;i<4;i++){
    const a=q[i],b=q[(i+1)%4],c=q[(i+2)%4],u=[a[0]-b[0],a[1]-b[1]],v=[c[0]-b[0],c[1]-b[1]];
    const cosine=(u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v));
    if(Math.abs(cosine)>.83||Math.hypot(a[0]-b[0],a[1]-b[1])<Math.min(w,h)*.08)ok=false;
    for(let t=1;t<10;t++){const x=a[0]+(b[0]-a[0])*t/10,y=a[1]+(b[1]-a[1])*t/10,dx=center[0]-x,dy=center[1]-y,len=Math.hypot(dx,dy),step=3;
     const at=(xx,yy)=>gray[Math.max(0,Math.min(h-1,Math.round(yy)))*w+Math.max(0,Math.min(w-1,Math.round(xx)))];
     contrast+=at(x+dx/len*step,y+dy/len*step)-at(x-dx/len*step,y-dy/len*step);samples++;
    }
   }
   contrast/=samples;if(!ok||contrast<7)continue;
   const score=fraction*fit*Math.min(1,contrast/35);
   if(!winner||score>winner.score){
    // Leave a small safety margin around the fitted paper, including its edges.
    const corners=q.map(p=>p.map((v,i)=>Math.max(0,Math.min(1,(center[i]+(v-center[i])*1.012)/(i?h-1:w-1)))));
    winner={corners,automatic:true,confidence:Math.min(1,fit*Math.min(1,contrast/24)),score};
   }
  }
 }
 return winner||none;
}
const api={find,hull,quadFromHull};root.ReceiptEdges211=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
;
/* Receipt grouping and perspective correction. No journal mutations or OCR guessing. */
(function(root){'use strict';
const uid=()=>crypto.randomUUID(),nextID=id=>{const m=String(id).trim().match(/^(.*?)(\d+)$/);if(!m||m[2].length>12)throw Error('Use a prefix followed by an entry number, such as OJM26-0001.');const n=BigInt(m[2])+1n;if(String(n).length>m[2].length)throw Error('The numbering range is full. Choose the next starting ID.');return m[1]+String(n).padStart(m[2].length,'0');};
function letters(n){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
function folderID(value){const s=String(value||'').trim();if(s==='root'||/^[\w-]{10,160}$/.test(s))return s;try{const u=new URL(s);if(u.protocol==='https:'&&u.hostname==='drive.google.com'){const m=u.pathname.match(/\/folders\/([\w-]+)/),id=m?.[1]||u.searchParams.get('id');if(/^[\w-]{10,160}$/.test(id||''))return id;}}catch{}throw Error('Paste a Google Drive folder link or folder ID.');}
function monthNow(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit'}).format(new Date()).replace(/^(\d{2})\/(\d{4})$/,'$2-$1');}
function monthTitle(month){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Choose a month.');return new Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'));}
function create(month,start,kind='journal'){if(kind!=='support')nextID(start);const d={id:uid(),created:new Date().toISOString(),month,title:monthTitle(month),groups:[],pages:[],next:{journal:'OJM'+month.slice(2,4)+'-0001',hr:'HR'+month.slice(2,4)+'-0001'},folder:{id:'root',name:'My Drive'},revision:0};if(kind!=='support')d.next[kind]=start;addGroup(d,kind,start);return d;}
function addGroup(d,type,label){label=String(label||'').trim();if(!label||label.length>120||/[\x00-\x1f]/.test(label))throw Error('Enter a group name, up to 120 characters.');if(d.groups.some(g=>g.label===label))throw Error('That group already exists. Select it to add pages.');if(type!=='support')d.next[type]=nextID(label);const g={id:uid(),type,label};d.groups.push(g);d.active=g.id;return g;}
function plan(d){return d.groups.map(g=>({...g,pages:d.pages.filter(p=>p.group===g.id).map((p,i)=>({...p,label:g.type==='support'?g.label+' '+letters(i):g.label+letters(i)}))})).filter(g=>g.pages.length);}
function split(d,pageID,type,label){const at=d.pages.findIndex(p=>p.id===pageID);if(at<0)throw Error('Page no longer exists.');const original=d.pages[at].group,g=addGroup(d,type,label);for(let i=at;i<d.pages.length;i++)if(d.pages[i].group===original)d.pages[i].group=g.id;return g;}
function validQuad(p){if(p.length!==4||p.some(a=>!a.every(Number.isFinite)||a.some(x=>x<0||x>1)))return false;let sign=0,area=0;for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4],c=p[(i+2)%4],cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(cross)<.0001)return false;if(sign&&Math.sign(cross)!==sign)return false;sign=Math.sign(cross);area+=a[0]*b[1]-b[0]*a[1];}return sign>0&&area/2>.01;}
function homography(p){const A=[],B=[],uv=[[0,0],[1,0],[1,1],[0,1]];for(let i=0;i<4;i++){const [u,v]=uv[i],[x,y]=p[i];A.push([u,v,1,0,0,0,-u*x,-v*x],[0,0,0,u,v,1,-u*y,-v*y]);B.push(x,y);}for(let i=0;i<8;i++){let k=i;for(let j=i+1;j<8;j++)if(Math.abs(A[j][i])>Math.abs(A[k][i]))k=j;if(Math.abs(A[k][i])<1e-10)throw Error('Adjust the four corners into a rectangle.');[A[k],A[i]]=[A[i],A[k]];[B[k],B[i]]=[B[i],B[k]];const a=A[i][i];for(let j=i;j<8;j++)A[i][j]/=a;B[i]/=a;for(let r=0;r<8;r++)if(r!==i){const f=A[r][i];for(let j=i;j<8;j++)A[r][j]-=f*A[i][j];B[r]-=f*B[i];}}return B;}
const project=(h,u,v)=>{const z=h[6]*u+h[7]*v+1;return [(h[0]*u+h[1]*v+h[2])/z,(h[3]*u+h[4]*v+h[5])/z];};
async function image(data){const i=new Image();i.src=data;await i.decode();return i;}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
// Downsample only the detection view; preserve full-resolution pixels for correction.
function detect(source,maxSize=480){const sw=source.videoWidth||source.width,sh=source.videoHeight||source.height,scale=Math.min(1,maxSize/Math.max(sw,sh)),w=Math.max(2,Math.round(sw*scale)),h=Math.max(2,Math.round(sh*scale)),c=canvas(w,h),x=c.getContext('2d',{willReadFrequently:true});x.drawImage(source,0,0,w,h);return root.ReceiptEdges211.find(x.getImageData(0,0,w,h));}
async function warp(source,corners,gray=false){if(!validQuad(corners))throw Error('Keep four corners in clockwise order without crossing.');const p=corners.map(([x,y])=>[x*(source.width-1),y*(source.height-1)]),dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);let w=Math.round(Math.max(dist(p[0],p[1]),dist(p[3],p[2]))),h=Math.round(Math.max(dist(p[0],p[3]),dist(p[1],p[2])));const scale=Math.min(1,Math.sqrt(12000000/(w*h)));w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));const mapping=homography(p);const input=source.getContext('2d',{willReadFrequently:true}).getImageData(0,0,source.width,source.height).data,out=canvas(w,h),ctx=out.getContext('2d'),pixels=ctx.createImageData(w,h),m=mapping;let sliceAt=Date.now();
 for(let y=0;y<h;y++){for(let x=0;x<w;x++){const u=x/Math.max(1,w-1),v=y/Math.max(1,h-1),z=m[6]*u+m[7]*v+1,sx=(m[0]*u+m[1]*v+m[2])/z,sy=(m[3]*u+m[4]*v+m[5])/z,ix=Math.max(0,Math.min(source.width-2,Math.floor(sx))),iy=Math.max(0,Math.min(source.height-2,Math.floor(sy))),dx=Math.max(0,Math.min(1,sx-ix)),dy=Math.max(0,Math.min(1,sy-iy)),at=(iy*source.width+ix)*4,to=(y*w+x)*4;for(let k=0;k<3;k++)pixels.data[to+k]=input[at+k]*(1-dx)*(1-dy)+input[at+4+k]*dx*(1-dy)+input[at+source.width*4+k]*(1-dx)*dy+input[at+source.width*4+4+k]*dx*dy;if(gray){const a=pixels.data[to]*.299+pixels.data[to+1]*.587+pixels.data[to+2]*.114;pixels.data[to]=pixels.data[to+1]=pixels.data[to+2]=a;}pixels.data[to+3]=255;}if(y%64===63&&Date.now()-sliceAt>12){await new Promise(r=>setTimeout(r,0));sliceAt=Date.now();}}ctx.putImageData(pixels,0,0);return {data:await jpeg(out,.95),width:w,height:h};}
async function jpeg(c,quality=.95){if(!c.toBlob)return c.toDataURL('image/jpeg',quality);const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('The photo could not be encoded.')),'image/jpeg',quality));return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});}
async function sourceCanvas(data,rotate=0){const i=await image(data);if(i.naturalWidth<2||i.naturalHeight<2)throw Error('Use a larger photo.');const scale=Math.min(1,Math.sqrt(12000000/(i.naturalWidth*i.naturalHeight))),w=Math.round(i.naturalWidth*scale),h=Math.round(i.naturalHeight*scale),c=canvas(rotate%180?h:w,rotate%180?w:h),x=c.getContext('2d');x.translate(c.width/2,c.height/2);x.rotate(rotate*Math.PI/180);x.drawImage(i,-w/2,-h/2,w,h);return c;}
const api={nextID,letters,folderID,monthNow,monthTitle,create,addGroup,plan,split,validQuad,homography,project,image,canvas,detect,warp,jpeg,sourceCanvas};root.ReceiptCore202=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
