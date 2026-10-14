/* All application data exports are reviewed in the editor before delivery. */
(()=>{'use strict';
const esc=v=>escapeHtml(String(v??''));
const encode=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});
async function open(blob,filename,source){
 const actor=liveProfile?.id,client=ojmDb;if(!actor||!access113.can('document-editor105','export'))throw Error('Document Editor view and Export / Print access are required.');
 const title=filename.replace(/\.[^.]+$/,''),extension=filename.split('.').pop().toLowerCase();
 let html='<h1>'+esc(title)+'</h1>';
 if(/^(json|csv|txt|js|sql)$/.test(extension)){
  const text=await blob.text();html+='<p>Original '+esc(extension.toUpperCase())+' export · '+esc(filename)+'</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:9pt">'+esc(text.slice(0,120000))+'</pre>'+(text.length>120000?'<p>Preview shortened. The Original file download retains all data.</p>':'');
 }else if(source)html+=documentWorkspace105.copySource(source);
 else html+='<p>'+esc(filename)+' · '+formatAppNumber(blob.size)+' bytes</p>';
 html+='<p>Use Original file to retain the exact data, formulas or restore structure. PDF, Word and other document formats include your editor changes.</p>';
 const data=await encode(blob);if(actor!==liveProfile?.id||client!==ojmDb)throw Error('Your account changed. Reopen the export.');
 const opened=await openDocumentEditor105({title,category:'Reports',html,printPreview:true,source:source?.id||'',exportPayload14337:{name:filename,extension,type:blob.type,data,owner:actor}});return opened!==false;
}
function fromLink(link){
 // Begin reading immediately, before legacy handlers revoke their object URL.
 const actor=liveProfile?.id,client=ojmDb,filename=link.download||'Export',source=document.querySelector('.tab-content.active'),pending=fetch(link.href).then(r=>{if(!r.ok)throw Error('The export file could not be prepared.');return r.blob()});
 return pending.then(blob=>{if(actor!==liveProfile?.id||client!==ojmDb)throw Error('Your account changed. Reopen the export.');return open(blob,filename,source)}).catch(e=>{if(actor===liveProfile?.id&&client===ojmDb)showCenterStatus(e.message,true);return false});
}
const outputLabel=b=>(b.getAttribute('aria-label')||b.textContent).trim();
function combine(root=document.querySelector('.tab-content.active')){
 if(!root||root.id==='document-editor105')return;
 const groups=new Set([...root.querySelectorAll('button')].filter(b=>!b.dataset.outputOriginal14337&&/^(export|print|download)(\b|\s|\/)/i.test(outputLabel(b))&&!/voucher|attachment|guide|schedule copy/i.test(outputLabel(b))).map(b=>b.parentElement));
 for(const group of groups){if(group.querySelector(':scope>[data-output-button14337]'))continue;const candidates=[...group.children].filter(b=>b.tagName==='BUTTON'&&!b.dataset.outputOriginal14337&&/^(export|print|download)(\b|\s|\/)/i.test(outputLabel(b))&&!/voucher|attachment|guide|schedule copy/i.test(outputLabel(b)));if(candidates.length<2)continue;
  const b=document.createElement('button');b.type='button';b.className=candidates[0].className;b.dataset.outputButton14337='';b.textContent='Export / Print';candidates[0].before(b);candidates.forEach(n=>{n.dataset.outputOriginal14337='true';n.hidden=true});
  b.onclick=async()=>{const actor=liveProfile?.id,client=ojmDb;const available=candidates.filter(n=>!n.disabled),choice=available.length===1?0:await ui108.modal('Export / Print','<p>Choose the report or data file to review in the Document Editor.</p>',[{label:'Cancel',value:false},...available.map((n,i)=>({label:outputLabel(n),value:String(i),primary:i===0}))]);if(choice===false||choice===null||choice===undefined)return;if(liveProfile?.id===actor&&ojmDb===client&&b.isConnected&&!available[Number(choice)]?.disabled)available[Number(choice)]?.click()};
 }
}
window.exportCenter14337={open,fromLink,combine};
function ready(){let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;combine()})};new MutationObserver(records=>{const active=document.querySelector('.tab-content.active');if(active&&records.some(r=>active.contains(r.target)&&r.type==='childList'&&[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches('[data-output-button14337]'))))schedule()}).observe(document.getElementById('printableDocArea')||document.body,{childList:true,subtree:true});window.addEventListener('page113',schedule);schedule();}
window.addEventListener('DOMContentLoaded',ready,{once:true});
})();
