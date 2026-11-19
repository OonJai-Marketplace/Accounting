const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
(async()=>{
 const S={owner:'self',actor:'self',draft:{memo:'Unsaved receipt',amount:'125000'}},messages=[],menu={hidden:false};
 const ctx={S,permission:()=>true,$:id=>{assert.equal(id,'accountMenu');return menu;},notice:message=>messages.push(message)};
 vm.createContext(ctx);vm.runInContext(read('src/subusers/phone/runtime/navigation-and-dialogs.js').split('  function navigate')[0],ctx);
 ctx.showScanUnavailable();assert.deepEqual(messages,['Feature unavailable. Coming soon.']);assert.ok(menu.hidden);
 assert.deepEqual(S.draft,{memo:'Unsaved receipt',amount:'125000'});
 assert.match(read('src/subusers/phone/runtime/actions.js'),/name==='scan'\|\|name==='scan-settings'\)return showScanUnavailable/);
 assert.match(read('src/subusers/phone/runtime/authentication.js'),/url.searchParams.delete\('scan'\);[\s\S]*?showScanUnavailable\(\);/);
 assert.match(read('phone.html'),/aria-label="Scan receipts"/);
 const html=read('scan.html'),boot=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const shell=html.replace(/<template[^>]*>[\s\S]*?<\/template>/g,'');
 assert.match(shell,/Feature unavailable\. Coming soon\./);
 assert.doesNotMatch(shell,/<input\b|<script[^>]+src=/);
 for(const ua of ['Android 13; Mobile','iPhone','iPod']){
   vm.runInNewContext(boot,{navigator:{userAgent:ua}}); // A phone must never access the capture DOM or append scripts.
 }
 vm.runInNewContext(boot,{navigator:{userAgent:'',userAgentData:{mobile:true}}});
 for(const ua of ['iPad','Android tablet','Macintosh','Windows NT']){
   const loaded=[],assets=[...html.matchAll(/<script src="([^"]+)"/g)].map(match=>({src:match[1]}));
   const document={getElementById:id=>id==='scanUnavailable'?{replaceWith:()=>loaded.push('workspace')}:{content:{cloneNode:()=>({}),querySelectorAll:()=>assets}},createElement:()=>({}),head:{append:s=>{assert.equal(s.async,false);loaded.push(s.src);}}};
   vm.runInNewContext(boot,{navigator:{userAgent:ua},document});
   assert.deepEqual(loaded,['workspace',...assets.map(s=>s.src)]);assert.ok(loaded.some(s=>s.includes('receipt-scanner202.js')));
 }
 console.log('PASS phone notice, in-place draft preservation, direct-link gating, tablet and desktop scanner dependency order');
 let resolveMedia,stops=0,drawn=false;const listeners={},w={};
 const camera={window:w,document:{hidden:false,createElement:()=>({getContext:()=>({drawImage(){drawn=true}}),toDataURL:()=> 'data:image/jpeg;base64,photo'})},navigator:{mediaDevices:{getUserMedia:()=>new Promise(r=>resolveMedia=r)}},Error};w.addEventListener=(k,fn)=>listeners[k]=fn;
 vm.createContext(camera);vm.runInContext(read('src/documents/scanner/camera209.js'),camera);const C=w.ReceiptCamera209;
 const stream=()=>({getTracks:()=>[{stop(){stops++}}]}),video=()=>({play:async()=>{},videoWidth:2560,videoHeight:1920,srcObject:null});
 const start=C.start(video());C.stop();resolveMedia(stream());assert.equal(await start,false);assert.equal(stops,1,'late camera permission must release hardware');
 const v=video(),active=C.start(v);resolveMedia(stream());assert.equal(await active,true);assert.equal(C.capture(),'data:image/jpeg;base64,photo');assert.equal(drawn,true);listeners.pagehide();assert.equal(C.active,false);assert.equal(v.srcObject,null);assert.equal(stops,2);
 assert.throws(()=>C.capture(),/still opening/);
 let rejectOldPlay,enteredPlay;
 const playStarted=new Promise(r=>enteredPlay=r),slowVideo={...video(),play:()=>{enteredPlay();return new Promise((_,reject)=>rejectOldPlay=reject)}};
 const oldStart=C.start(slowVideo);resolveMedia(stream());await playStarted;
 const latest=C.start(video());resolveMedia(stream());await latest;rejectOldPlay(Error('Old playback cancelled'));assert.equal(await oldStart,false);assert.equal(C.active,true,'old play rejection must not stop the newer camera');C.stop();
 const hidden=C.start(video());camera.document.hidden=true;resolveMedia(stream());assert.equal(await hidden,false);assert.equal(stops,5);
 console.log('PASS camera full-resolution capture, delayed permission cancellation, background release, no stale camera capture');
 assert.match(read('phone.html'),/data-action="scan" aria-label="Scan receipts"/);
})().catch(e=>{console.error(e);process.exitCode=1});
