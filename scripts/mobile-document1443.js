/* Phone document controls. Screen reflow is a view only; A4 print geometry is unchanged. */
(()=>{'use strict';
const mobile=()=>innerWidth<=700||document.documentElement.dataset.device132==='phone';
let reflow=false,fit=true,previous='sub-users-workspace';
const paths={back:'m15 18-6-6 6-6',undo:'M9 5 4 10l5 5M4 10h9a6 6 0 0 1 6 6',redo:'m15 5 5 5-5 5m5-5h-9a6 6 0 0 0-6 6',page:'M6 3h9l4 4v14H6zM14 3v5h5',print:'M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z',more:'M5 12h.01M12 12h.01M19 12h.01',done:'m5 12 4 4L19 6',fit:'M8 4H4v16h4m8-16h4v16h-4M2 12h20m-4-4 4 4-4 4M6 8l-4 4 4 4',format:'M5 4h14M12 4v16M8 20h8',paragraph:'M4 5h16M4 10h12M4 15h16M4 20h9',image:'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M15 7h.01',tools:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',keyboard:'M2 6h20v13H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h8'};
const svg=id=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[id]||paths.more}"/></svg>`;
const button=(id,label,caption=false)=>`<button type="button" data-mobile-doc1443="${id}" title="${label}" aria-label="${label}">${svg(id)}${caption?`<small>${label}</small>`:''}</button>`;
function rememberLocation(){const active=document.querySelector('.tab-content.active');if(active&&active.id!=='document-editor105')previous=active.id;}
function closeFormatting(){document.querySelector('#document-editor105')?.closeFormatting1443?.();}
function back(){
 documentWorkspace105.closeTools();closeFormatting();
 const targets=[previous,'dashboard','sub-users-home14229','sub-users-workspace',...APP_PERMISSION_TREE.flatMap(p=>p.children.map(([id])=>id))];
 const target=targets.find(id=>id!=='document-editor105'&&document.getElementById(id)&&access113.can(id));
 if(target)switchTab(target);else document.getElementById('document-editor105')?.classList.remove('active');
 window.savedReports1434?.restorePhone();
 document.getElementById('connectedPhone132')?.contentWindow?.phoneRefresh132?.();
}

function frameReady(frame){if(!mobile()||!frame?.contentDocument)return;const doc=frame.contentDocument;let style=doc.getElementById('reflowStyle1443');if(!style){style=doc.createElement('style');style.id='reflowStyle1443';style.textContent='@media screen{html.doc-reflow1443 body{padding:0!important}html.doc-reflow1443 #body105{zoom:1!important}html.doc-reflow1443 .page{width:100%!important;height:auto!important;min-height:0!important;margin:0!important;box-shadow:none!important;overflow:visible!important}html.doc-reflow1443 .page-content{position:relative!important;inset:auto!important;padding:16px!important;overflow:visible!important;font-size:18px!important;line-height:1.65!important}html.doc-reflow1443 .page-content p,html.doc-reflow1443 .page-content span,html.doc-reflow1443 .page-content div{font-size:inherit!important;max-width:100%!important}html.doc-reflow1443 .page-header,html.doc-reflow1443 .page-footer{display:none!important}html.doc-reflow1443 table{max-width:100%!important}html.doc-reflow1443 img{max-width:100%!important;height:auto!important}}';doc.head.append(style)}
 doc.documentElement.classList.toggle('doc-reflow1443',reflow);
 if(!reflow&&fit)documentWorkspace105.setZoom((frame.clientWidth-20)/(doc.querySelector('.page')?.offsetWidth||794));
 if(!doc.documentElement.dataset.mobileZoom1443){doc.documentElement.dataset.mobileZoom1443='1';let start=0,zoom=1;doc.addEventListener('touchstart',e=>{if(e.touches.length===2&&!reflow){start=Math.hypot(e.touches[1].clientX-e.touches[0].clientX,e.touches[1].clientY-e.touches[0].clientY);zoom=documentWorkspace105.zoom}},{passive:true});doc.addEventListener('touchmove',e=>{if(e.touches.length!==2||!start||reflow)return;e.preventDefault();fit=false;documentWorkspace105.setZoom(zoom*Math.hypot(e.touches[1].clientX-e.touches[0].clientX,e.touches[1].clientY-e.touches[0].clientY)/start)},{passive:false});doc.addEventListener('touchend',()=>start=0,{passive:true});}
 document.querySelector('[data-mobile-doc1443=fit]')?.setAttribute('aria-pressed',String(reflow));
}
function install(host){if(!mobile()||host.querySelector('.mobile-doc-top1443'))return;host.classList.add('mobile-editor1443');const shell=host.querySelector('.doc-shell105');const top=document.createElement('nav');top.className='mobile-doc-top1443';top.setAttribute('aria-label','Document controls');top.innerHTML=button('back','Back')+button('undo','Undo')+button('redo','Redo')+button('page','Page setup')+button('print','Print')+button('more','More options')+button('done','Done editing');shell.prepend(top);
 const bottom=document.createElement('nav');bottom.className='mobile-doc-bottom1443';bottom.setAttribute('aria-label','Document tools');bottom.innerHTML=[['fit','Fit to Screen'],['format','Format'],['paragraph','Paragraph'],['image','Image'],['tools','Tools'],['keyboard','Keyboard']].map(([id,label])=>button(id,label,true)).join('');shell.append(bottom);
 const format=document.createElement('div');format.className='mobile-doc-format1443';format.id='mobileDocFormat1443';format.hidden=true;format.setAttribute('role','toolbar');format.setAttribute('aria-label','Text formatting');shell.append(format);
 // Reuse the editor's bound controls so size, font and palettes retain the selection.
 const quick=host.querySelector('.doc-quick1426');
 for(const selector of ['[data-format=fontName]','[data-style=fontSize]','[data-doc-action=bold]','[data-doc-action=italic]','[data-doc-action=underline]','[data-format=foreColor]','[data-format=hiliteColor]','[data-format=formatBlock]']){
  const control=quick.querySelector(selector);if(control)format.append(control.closest('label')||control);
 }
 const size= format.querySelector('[data-style=fontSize]');
 for(const [label,text,delta] of [['Decrease font size','A−',-1],['Increase font size','A+',1]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.onmousedown=e=>e.preventDefault();b.onclick=()=>{size.value=Math.max(6,Math.min(96,(Number(size.value)||11)+delta));size.dispatchEvent(new Event('change',{bubbles:true}));};format.append(b);}
 const formatButton=bottom.querySelector('[data-mobile-doc1443=format]');formatButton.setAttribute('aria-controls',format.id);formatButton.setAttribute('aria-expanded','false');
 const setFormat=open=>{format.hidden=!open;formatButton.setAttribute('aria-expanded',String(open));};
 host.closeFormatting1443=()=>setFormat(false);
 shell.querySelectorAll('[data-mobile-doc1443]').forEach(b=>{
  b.onmousedown=e=>e.preventDefault();
  b.onclick=()=>{
   const id=b.dataset.mobileDoc1443,api=documentWorkspace105;
   if(id==='back')return back();
   if(id==='format'){const open=format.hidden;api.closeTools();setFormat(open);return;}
   setFormat(false);
   if(id==='paragraph'||id==='tools'||id==='more'){
    const open=b.getAttribute('aria-expanded')!=='true';api.closeTools();if(open)host.menu1426.open(id==='paragraph'?'format':id==='tools'?'insert':'file',b);return;
   }
   api.closeTools();
   if(id==='done'){document.getElementById('docFrame105')?.contentWindow.getSelection()?.removeAllRanges();document.getElementById('docFrame105')?.contentDocument?.activeElement?.blur();document.activeElement?.blur();return;}
   if(id==='fit'){reflow=!reflow;fit=!reflow;return frameReady(document.getElementById('docFrame105'));}
   if(id==='keyboard'){document.getElementById('docFrame105')?.contentDocument?.querySelector('.page-content')?.focus();return;}
   return api.action(({image:'image109',page:'page-setup'})[id]||id);
  };
 });
 top.querySelector('[data-mobile-doc1443=back]').insertAdjacentHTML('beforeend','<small>Back</small>');

}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.mobile-doc-format1443,.mobile-doc-bottom1443,.doc-palette1432'))closeFormatting();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeFormatting();});
window.mobileDocument1443={install,frameReady,rememberLocation,closeFormatting,back};window.addEventListener('resize',()=>frameReady(document.getElementById('docFrame105')));
})();
