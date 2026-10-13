// Unified centered confirmation dialog, visually consistent with accounting warnings.
function showAppConfirm(title, message, confirmText, onConfirm, danger = true) {
  document.getElementById('activeAppConfirm')?.remove();if(showAppConfirm.keyHandler)document.removeEventListener('keydown',showAppConfirm.keyHandler,true);
  const overlay=document.createElement('div');overlay.id='activeAppConfirm';overlay.className='custom-alert-overlay';
  overlay.innerHTML=`<div class="custom-alert-box" style="border-top-color:${danger?'#dc2626':'#059669'}!important"><h3 style="margin:0 0 8px;color:${danger?'#991b1b':'#065f46'};font-size:16px">${title}</h3><p style="color:#475569;font-size:13px;line-height:1.5;margin:0 0 16px">${message}</p><div style="display:flex;justify-content:flex-end;gap:8px"><button class="je-btn je-btn-secondary" data-cancel>Cancel</button><button class="je-btn ${danger?'je-btn-danger':'je-btn-emerald'}" data-confirm>${confirmText}</button></div></div>`;
  let handled=false;const close=()=>{overlay.remove();document.removeEventListener('keydown',keyHandler,true);showAppConfirm.keyHandler=null};const confirm=()=>{if(handled)return;handled=true;close();onConfirm()};const cancel=()=>{if(handled)return;handled=true;close()};const keyHandler=event=>{if(event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();confirm()}else if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancel()}};
  overlay.querySelector('[data-cancel]').onclick=cancel;overlay.querySelector('[data-confirm]').onclick=confirm;overlay.addEventListener('pointerdown',event=>{if(event.target===overlay)cancel()});
  document.body.appendChild(overlay);showAppConfirm.keyHandler=keyHandler;document.addEventListener('keydown',keyHandler,true);
}

