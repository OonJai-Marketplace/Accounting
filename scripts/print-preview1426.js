/* Every application print request opens an editable copy; only the editor invokes native printing. */
(()=>{'use strict';
window.print=async function(){
 if(document.getElementById('document-editor105')?.classList.contains('active'))return documentWorkspace105.preview();
 const source=document.querySelector('.print-selected-section')||document.querySelector('.tab-content.active');if(!source)return;
 const clone=source.cloneNode(true);const originals=[source,...source.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];originals.forEach((n,i)=>{if(n.hidden||n.style.display==='none')copies[i]?.remove()});
 const title=source.querySelector('h1,h2,h3')?.textContent?.trim()||'Report';
 const settings={};if(document.body.classList.contains('configured-print')){settings.applyHeader=!!document.getElementById('printUseHeader')?.checked;settings.applyFooter=!!document.getElementById('printUseFooter')?.checked}
 const html=documentWorkspace105.copySource(clone);
 document.body.classList.remove('configured-print');if(typeof restorePrintDateFilter==='function')restorePrintDateFilter();if(typeof clearSelectedPrintSection==='function')clearSelectedPrintSection();
 return openDocumentEditor105({title,category:'Reports',printPreview:true,source:source.id,html,settings});
};
window.openPrintDialog=function(){const active=document.querySelector('.tab-content.active')?.id||'';if(active.startsWith('settings-')||active==='user-entry-review'){showCenterStatus('Printing is not available in this module.',true);return}return window.print()};
document.addEventListener('keydown',e=>{if(!e.defaultPrevented&&!e.altKey&&!e.shiftKey&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='p'&&!document.getElementById('document-editor105')?.classList.contains('active')){e.preventDefault();window.print()}});
})();
