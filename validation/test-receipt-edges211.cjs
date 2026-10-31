const assert=require('node:assert/strict'),D=require('../src/documents/scanner/edges211.js');
function inside(p,q){let odd=false;for(let i=0,j=q.length-1;i<q.length;j=i++){const a=q[i],b=q[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])odd=!odd;}return odd;}
function fixture(q,{background=48,paper=235,shadow=0,text=true,w=240,h=320}={}){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const nx=x/(w-1),ny=y/(h-1),inPaper=inside([nx,ny],q);let v=inPaper?paper-shadow*ny:background+Math.sin(x*.15)*3;if(inPaper&&text&&y%17<2&&nx>.3&&nx<.65&&ny>.25&&ny<.7)v=65;const n=(y*w+x)*4;data[n]=data[n+1]=data[n+2]=v;data[n+3]=255;}return {data,width:w,height:h};}
const cases=[
 ['perspective',[[.2,.1],[.83,.18],[.76,.91],[.12,.8]],{}],
 ['light table',[[.15,.12],[.85,.12],[.82,.9],[.18,.9]],{background:208,paper:240}],
 ['shadow',[[.2,.1],[.83,.18],[.76,.91],[.12,.8]],{background:48,paper:245,shadow:80}],
 ['rotated',[[.5,.08],[.91,.48],[.51,.91],[.09,.51]],{}],
 ['narrow receipt',[[.36,.08],[.63,.1],[.66,.93],[.31,.88]],{}]
];
for(const [name,q,options] of cases){const t=performance.now(),found=D.find(fixture(q,options));assert.equal(found.automatic,true,name);for(let i=0;i<4;i++)assert.ok(Math.hypot(found.corners[i][0]-q[i][0],found.corners[i][1]-q[i][1])<.045,name+' corner '+i+' '+JSON.stringify(found.corners));console.log('PASS',name,'corners',Math.round(performance.now()-t)+'ms');}
for(const [name,q,options] of [['blank',[],{}],['flat white',[[0,0],[1,0],[1,1],[0,1]],{text:false}],['clipped',[[-.1,.05],[.8,.05],[.8,.95],[-.1,.95]],{}]])assert.equal(D.find(fixture(q,options)).automatic,false,name+' must not silently crop');
console.log('PASS blank, flat and clipped scenes retain the entire photo');
