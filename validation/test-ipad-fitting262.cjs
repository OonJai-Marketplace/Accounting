const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const code=fs.readFileSync('src/core/startup/device-mode132.js','utf8');
function fixture(){const events={},meta={content:''},style={},root={dataset:{},style:{setProperty:(k,v)=>style[k]=v}},vv={width:834,height:1104,scale:1};const ctx={navigator:{userAgent:'iPad',platform:'iPad',maxTouchPoints:5},screen:{width:834,height:1194,orientation:{type:'portrait-primary',addEventListener(){}}},innerWidth:1280,innerHeight:1694,document:{documentElement:root,querySelector:()=>meta,readyState:'complete',body:{classList:{toggle(){}}}},matchMedia:()=>({matches:true}),requestAnimationFrame:fn=>fn(),setTimeout:fn=>fn()};ctx.window={visualViewport:vv,addEventListener:(k,fn)=>events[k]=fn};vm.runInNewContext(code,ctx);return {events,meta,root,vv,ctx,style};}
const f=fixture();assert.match(f.meta.content,/initial-scale=0.6515625/);assert.match(f.meta.content,/minimum-scale=0.25.*maximum-scale=5, user-scalable=yes/);
let before=f.meta.content;f.vv.height=400;f.events.resize();assert.equal(f.meta.content,before,'keyboard must not change fit');
f.vv.width=1280/1.5;f.vv.scale=(834/1280)*1.5;f.events.resize();assert.equal(f.meta.content,before,'pinch must not reset fit');
f.ctx.screen.orientation.type='landscape-primary';f.vv.width=1280;f.vv.scale=1194/1280;f.vv.height=797;f.events.resize();assert.match(f.meta.content,/initial-scale=0.9328125/);
f.vv.width=1280;f.vv.scale=507/1280;f.events.resize();assert.match(f.meta.content,/initial-scale=0.39609375/,'Split View uses available width');
console.log('PASS portrait, landscape, keyboard-stable fit, pinch preservation, Split View and zoom permission');
