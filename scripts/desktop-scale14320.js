/* Fit the approved desktop canvas; phone and tablet retain their own layouts. */
(()=>{'use strict';const root=document.documentElement,media=new Map(),styles=new Map();let queued=false,printing=false,scale=1;
const desktop=()=>root.dataset.device132==='desktop';
function scan(rules,inPrint=false){for(const rule of rules){const print=inPrint||rule.type===4&&/\bprint\b/.test(rule.conditionText)&&!/(?:screen|all)/.test(rule.conditionText);if(rule.type===4&&!print&&!media.has(rule))media.set(rule,rule.conditionText);if(rule.style&&!print&&!styles.has(rule)&&/\b\d*\.?\d+(?:d|s|l)?v[wh]\b/.test(rule.style.cssText))styles.set(rule,rule.style.cssText);if(rule.cssRules)scan(rule.cssRules,print)}}
function fit(){queued=false;if(!desktop())return;const config=window.OJM_DEPLOYMENT?.desktop||{},base=Math.max(1024,Number(config.canvasWidth)||1280),max=Math.max(1,Math.min(2,Number(config.maximumScale)||1.5)),width=innerWidth,height=innerHeight;
scale=printing?1:Math.min(max,width/base);const w=printing?width:width/scale,h=printing?height:height/scale;
root.dataset.desktopScale14320=String(scale);root.style.setProperty('--desktop-scale14320',scale);root.style.setProperty('--desktop-width14320',w+'px');root.style.setProperty('--desktop-height14320',h+'px');
for(const sheet of document.styleSheets){try{scan(sheet.cssRules)}catch{/* External fonts are outside the workspace layout. */}}
for(const [rule,original]of media){try{rule.media.mediaText=printing?original:original.replace(/\((min|max)-(width|height)\s*:\s*(\d+(?:\.\d+)?)(px|em|rem)\)/gi,(_,bound,axis,n,unit)=>{const value=Number(n)*(unit==='px'?1:16),size=axis==='width'?w:h,yes=bound==='min'?size>=value:size<=value;return yes?'(min-width: 0px)':'(max-width: 0px)'})}catch{}}
for(const [rule,original]of styles){try{rule.style.cssText=printing?original:original.replace(/(\d*\.?\d+)(?:d|s|l)?v([wh])\b/g,(_,n,axis)=>Number(n)*(axis==='w'?w:h)/100+'px')}catch{}}
window.dispatchEvent(new Event('desktopscale14320'));
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(fit)}}
window.desktopScale14320={get scale(){return desktop()?scale:1},rect(element){const r=element.getBoundingClientRect(),s=this.scale;return {left:r.left/s,right:r.right/s,top:r.top/s,bottom:r.bottom/s,width:r.width/s,height:r.height/s}},get width(){return innerWidth/this.scale},get height(){return innerHeight/this.scale}};
window.addEventListener('resize',schedule);window.addEventListener('beforeprint',()=>{printing=true;fit()});window.addEventListener('afterprint',()=>{printing=false;fit()});window.addEventListener('DOMContentLoaded',fit,{once:true});window.addEventListener('load',fit,{once:true});
})();
