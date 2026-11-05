/* Geometry and lifecycle regressions with synthetic viewport events.
   These checks do not emulate Safari or a physical iPad keyboard. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function fixture({ua='iPad',platform='iPad',touch=5,width=834,height=1104}={}){
 const dom=new JSDOM('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body><div class="workspace-scroll"><nav class="sticky-tabs14344"></nav><section id="journalEntry98"><input id="memo"><span id="rich" contenteditable="true"></span><div class="je-actions-bar"></div></section></div></body>',{runScripts:'outside-only',url:'https://fixture.invalid/'}),w=dom.window;
 for(const[k,v]of Object.entries({userAgent:ua,platform,maxTouchPoints:touch}))Object.defineProperty(w.navigator,k,{value:v});
 const direction={type:'portrait-primary',addEventListener(){}};
 Object.defineProperty(w.screen,'orientation',{value:direction});Object.defineProperty(w.screen,'width',{value:834});Object.defineProperty(w.screen,'height',{value:1194});
 const vv=Object.assign(new w.EventTarget(),{width:1280,height:height/(width/1280),scale:width/1280,offsetTop:0,offsetLeft:0});Object.defineProperty(w,'visualViewport',{value:vv});
 const frames=[];w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length};const flush=()=>{for(let i=0;frames.length&&i<30;i++)frames.shift()();assert.equal(frames.length,0,'viewport events must settle')};
 const host=w.document.querySelector('.workspace-scroll'),memo=w.document.querySelector('#memo'),rich=w.document.querySelector('#rich'),bar=w.document.querySelector('.je-actions-bar');let top=1200,total=height/(width/1280),scroll=0;
 host.style.paddingBottom='17px';host.getBoundingClientRect=()=>({top:80,bottom:total,height:total-80});host.scrollBy=({top:n})=>{scroll+=n;top-=n};
 memo.getBoundingClientRect=rich.getBoundingClientRect=()=>({top,bottom:top+40,height:40});bar.getBoundingClientRect=()=>{
  const css=w.document.documentElement.style;
  const bottom=parseFloat(css.getPropertyValue('--tablet-main-height285'))-(parseFloat(css.getPropertyValue('--tablet-actions-inset285'))||0);
  return {top:bottom-60,bottom,height:60};
 };host.querySelector('nav').getBoundingClientRect=()=>({top:80,bottom:120});
 w.eval(fs.readFileSync('src/core/startup/device-mode132.js','utf8'));w.eval(fs.readFileSync('src/bookkeeping/journal/tablet-journal14266.js','utf8'));flush();
 return {w,vv,root:w.document.documentElement,memo,rich,host,bar,direction,flush,get top(){return top},get scroll(){return scroll},set top(v){top=v},rotate(){direction.type='landscape-primary';vv.width=1280;vv.scale=1194/1280;total=744/vv.scale;vv.height=total;w.dispatchEvent(new w.Event('orientationchange'));flush()},resize(){vv.dispatchEvent(new w.Event('resize'));w.dispatchEvent(new w.Event('resize'));flush()},close(){dom.window.close()}};
}
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name)}
check('one viewport declaration across orientation, keyboard, pinch and resize',()=>{const f=fixture(),meta=f.w.document.querySelector('meta').content;assert(!meta.includes('initial-scale'));assert.match(meta,/user-scalable=yes/);f.memo.focus();f.vv.height=700;f.resize();assert.equal(f.root.dataset.tabletOrientation132,'portrait');assert(f.w.tabletViewport132.state.keyboard);f.rotate();assert.equal(f.root.dataset.tabletOrientation132,'landscape');f.vv.width/=1.5;f.vv.height/=1.5;f.vv.scale*=1.5;f.resize();assert.equal(f.w.document.querySelector('meta').content,meta);assert.equal(f.w.tabletViewport132.state.width,1194);f.close()});
check('120% text remains 120% after fitting, with pinch independently available',()=>{const f=fixture();f.w.ApplicationSettings={system:{fontSize:'large'}};f.w.eval(fs.readFileSync('src/settings/application/font-size14380.js','utf8'));f.w.fontSize14380.apply();let size=Number(f.root.style.getPropertyValue('--app-font-scale14380'));assert(Math.abs(size*f.vv.scale-1.2)<1e-8);f.rotate();size=Number(f.root.style.getPropertyValue('--app-font-scale14380'));assert(Math.abs(size*f.vv.scale-1.2)<1e-8);f.vv.width/=2;f.vv.height/=2;f.vv.scale*=2;f.resize();assert.equal(Number(f.root.style.getPropertyValue('--app-font-scale14380')),size);f.close()});
check('iPad journal actions stay anchored while the active row uses the visible area',()=>{
 for(const userAgent of [{},{ua:'Mozilla Macintosh',platform:'MacIntel',touch:5}]){
  const f=fixture(userAgent);
  for(const orientation of ['portrait','landscape']){
   if(orientation==='landscape')f.rotate();
   const full=f.vv.height,barTop=f.bar.getBoundingClientRect().top;
   f.top=full+30;f.memo.focus();f.vv.height=full-350;f.resize();
   assert(f.root.hasAttribute('data-tablet-keyboard14266'));
   assert.equal(f.bar.getBoundingClientRect().top,barTop);
   assert.equal(f.top+40,f.vv.height-16,'the covered bar takes no editing space');
   assert.equal(f.host.style.paddingBottom,'0px');
   f.vv.offsetTop=60;f.resize();
   assert.equal(f.bar.getBoundingClientRect().top,barTop,'viewport panning preserves the anchor');
   f.vv.offsetTop=0;f.vv.height=full;f.resize();
   assert.equal(f.bar.getBoundingClientRect().top,barTop);
  }
  f.close();
 }
});
check('switching fields and Safari offset preserve focus and reveal the edited row',()=>{const f=fixture();f.memo.focus();f.vv.height=900;f.resize();f.top=1300;f.rich.focus();f.flush();assert.equal(f.w.document.activeElement,f.rich);assert.equal(f.top+40,884);f.vv.offsetTop=100;f.vv.dispatchEvent(new f.w.Event('scroll'));f.flush();assert.equal(f.w.document.activeElement,f.rich);assert(f.top>=116);f.close()});
check('Android tablet keeps its action bar above the keyboard',()=>{
 const f=fixture({ua:'Android',platform:'Linux',touch:5});
 f.memo.focus();f.vv.height=900;f.resize();
 assert.equal(f.bar.getBoundingClientRect().bottom,900);assert.equal(f.top+40,824);f.close();
});
check('dismissed keyboard restores original padding, toolbar position and full height',()=>{const f=fixture();f.memo.focus();const h=f.vv.height;f.vv.height=900;f.resize();f.memo.blur();f.vv.height=h;f.resize();assert(!f.w.tabletViewport132.state.keyboard);assert.equal(f.host.style.paddingBottom,'17px');assert.equal(f.root.style.getPropertyValue('--tablet-actions-inset285'),'0px');assert(!f.root.hasAttribute('data-tablet-keyboard14266'));f.close()});
check('keyboard rotation uses an unoccluded orientation baseline',()=>{const f=fixture();f.memo.focus();f.vv.height=900;f.resize();f.direction.type='landscape-primary';f.vv.scale=1194/1280;f.vv.width=1280;f.vv.height=414/f.vv.scale;f.resize();assert(f.w.tabletViewport132.state.keyboard);assert(Math.abs(f.w.tabletViewport132.state.height-744/f.vv.scale)<1);f.close()});
check('desktop and phone keep their native viewport and font scaling',()=>{for(const opts of [{ua:'Chrome',platform:'Linux',touch:0},{ua:'iPhone',platform:'iPhone',touch:5},{ua:'Android Mobile',platform:'Linux',touch:5}]){const f=fixture(opts);assert.equal(f.w.document.querySelector('meta').content,'width=device-width,initial-scale=1');assert.equal(f.w.tabletViewport132,undefined);f.close()}});
check('iPad desktop UA and Android tablets use the tablet controller',()=>{for(const opts of [{ua:'Mozilla Macintosh',platform:'MacIntel',touch:5},{ua:'Android',platform:'Linux',touch:5}]){const f=fixture(opts);assert.equal(f.root.dataset.device132,'tablet');assert(f.w.tabletViewport132);f.close()}});
console.log(checks+' tablet viewport regression groups passed.');
