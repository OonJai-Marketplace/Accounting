const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{const {page,login}=await f.open();await login();const result=await page.evaluate(async()=>{
 const settle=()=>new Promise(r=>setTimeout(r,100));
 const oldFormat=ApplicationSettings.system.dateFormat;
 const formats={'DD/MM/YYYY':'14/10/2026','MM/DD/YYYY':'10/14/2026','YYYY-MM-DD':'2026-10-14','DD MMM YYYY':'14 Oct 2026','MMM DD, YYYY':'Oct 14, 2026','DD MMMM YYYY':'14 October 2026','MMMM DD, YYYY':'October 14, 2026','DD MMM YY':'14 Oct 26','MMM DD, YY':'Oct 14, 26'};
 const dates=Object.entries(formats).map(([format,expected])=>{ApplicationSettings.system.dateFormat=format;return {format,expected,actual:formatAppDate('2026-10-14')}});
 switchTab('settings-business');const host=document.querySelector('.tab-content.active');const panel=document.createElement('section');panel.style.borderTop='3px solid orange';panel.innerHTML='<h4>Performance fixture</h4><input type="date" value="2026-10-14">';host.append(panel);await settle();const input=panel.querySelector('input');
 ApplicationSettings.system.dateFormat='YYYY-MM-DD';input.dispatchEvent(new Event('change',{bubbles:true}));await settle();const first=panel.querySelector('.oj-date-label104').textContent;
 ApplicationSettings.system.dateFormat='DD MMMM YYYY';input.dispatchEvent(new Event('change',{bubbles:true}));await settle();const changed=panel.querySelector('.oj-date-label104').textContent;
 const button=panel.querySelector('button');button.click();const popup=!!document.querySelector('.oj-date-popup104');document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 const border=panel.classList.contains('orange-module14231');switchTab('journal');switchTab('settings-business');await settle();const retained=panel.isConnected&&panel.querySelector('input')===input&&panel.classList.contains('orange-module14231');
 window.dispatchEvent(new Event('resize'));await settle();const resized=panel.classList.contains('orange-module14231');panel.remove();ApplicationSettings.system.dateFormat=oldFormat;
 return {dates,first,changed,popup,border,retained,resized,invalid:formatAppDate('not-a-date'),empty:formatAppDate('')};
 });for(const d of result.dates)assert.equal(d.actual,d.expected,d.format);assert.equal(result.first,'2026-10-14');assert.equal(result.changed,'14 October 2026');for(const k of ['popup','border','retained','resized'])assert(result[k],k);assert.equal(result.invalid,'not-a-date');assert.equal(result.empty,'—');console.log('PASS nine date formats, live format changes, calendar opening, dynamic panel styling, retained controls, resize, invalid and blank dates');}finally{await f.close()}})().catch(e=>{console.error(e);process.exit(1)});
