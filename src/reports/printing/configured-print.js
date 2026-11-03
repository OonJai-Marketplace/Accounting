// Header/footer images use independent company records so concurrent edits do not overwrite one another.
const PrintSettings = {headerImage:localStorage.getItem('ojm_print_header')||'',footerImage:localStorage.getItem('ojm_print_footer')||''};
const printBrand252=(()=>{
 const inFlight=new Map();let identity='';
 const valid=v=>typeof v==='string'&&(!v||/^data:image\/(png|jpeg|webp);base64,/i.test(v));
 const area=kind=>'print-'+kind+'252';
 function apply(kind,image){PrintSettings[kind+'Image']=image;try{localStorage.setItem('ojm_print_'+kind,image)}catch{}renderPrintSettingPreviews();}
 function context(){const actor=liveProfile?.id,client=ojmDb;if(!actor||!client||liveProfile.role!=='admin')throw Error('Administrator access is required to save company images.');return {actor,client,check(){if(liveProfile?.id!==actor||ojmDb!==client)throw Error('Account changed. Reopen company images.')}}}
 async function save(kind,image,migrate=false){
  if(!['header','footer'].includes(kind)||!valid(image))throw Error('Choose a PNG, JPG or WebP image.');
  const c=context(),key=c.actor+':'+kind;if(inFlight.has(key)){await inFlight.get(key).catch(()=>{});c.check();return save(kind,image,migrate)}
  const job=(async()=>{const payload={area:area(kind),data:{image},updated_by:c.actor,updated_at:new Date().toISOString()};
   const q=migrate?c.client.from('presentation_settings113').insert(payload):c.client.from('presentation_settings113').upsert(payload,{onConflict:'area'});
   const result=await q.select('area,data');c.check();
   if(result.error&&!(migrate&&result.error.code==='23505'))throw Error(result.error.message);
   const confirmed=await c.client.from('presentation_settings113').select('area,data').eq('area',area(kind)).maybeSingle();c.check();
   if(confirmed.error||!confirmed.data||!valid(confirmed.data.data?.image))throw Error('The company image save could not be confirmed. Retry while connected.');
   if(!migrate&&confirmed.data.data.image!==image)throw Error('The company image changed on another device. Reload Settings before retrying.');
   if(window.shell113?.state.owner===c.actor){shell113.state.rows[area(kind)]=confirmed.data.data;}
   apply(kind,confirmed.data.data.image||'');return true;
  })();inFlight.set(key,job);try{return await job}finally{if(inFlight.get(key)===job)inFlight.delete(key)}
 }
 async function hydrate(){const state=window.shell113?.state;if(!liveProfile?.id||!state?.loaded||state.owner!==liveProfile.id)return;
  const next=liveProfile.id;if(identity&&identity!==next){PrintSettings.headerImage='';PrintSettings.footerImage=''}identity=next;
  for(const kind of ['header','footer']){const record=state.rows[area(kind)];if(record&&valid(record.image)){apply(kind,record.image||'');continue}
   const local=PrintSettings[kind+'Image'];if(liveProfile.role==='admin'&&local&&valid(local)){try{await save(kind,local,true)}catch(e){notice(kind,'Company copy not saved: '+e.message,true)}}
  }
 }
 function notice(kind,text,error=false){const preview=document.getElementById(kind==='header'?'printHeaderPreview':'printFooterPreview');if(!preview)return;let p=preview.parentElement.querySelector('[data-print-save252]');if(!p){p=document.createElement('p');p.dataset.printSave252='';preview.after(p)}p.setAttribute('role',error?'alert':'status');p.textContent=text;if(error){const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';b.textContent='Retry save';b.onclick=()=>save(kind,PrintSettings[kind+'Image']).then(()=>notice(kind,'Company image saved.')).catch(e=>notice(kind,e.message,true));p.append(' ',b)}}
 window.addEventListener('presentation-ready113',()=>{void hydrate()});
 return {save,hydrate,apply,notice};
})();
async function handlePrintImageUpload(event,type){
 const file=event.target.files?.[0];if(!file||!['header','footer'].includes(type))return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)return showAppNotification('Image Not Saved','Choose a PNG, JPG or WebP image under 8 MB.',true);
 const actor=liveProfile?.id,client=ojmDb;
 try{const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)});if(liveProfile?.id!==actor||ojmDb!==client)return;
  printBrand252.apply(type,image);printBrand252.notice(type,'Saving company image…');await printBrand252.save(type,image);printBrand252.notice(type,'Company image saved. Available on your other devices.');
 }catch(e){printBrand252.notice(type,'Image kept on this device. Company save failed: '+e.message,true)}
}
async function clearPrintImage(type){try{await printBrand252.save(type,'');printBrand252.notice(type,'Company image removed.')}catch(e){printBrand252.notice(type,e.message,true)}}
function renderPrintSettingPreviews() {
  const h = document.getElementById('printHeaderPreview');
  const f = document.getElementById('printFooterPreview');
  if (h) h.innerHTML = PrintSettings.headerImage ? `<img src="${escapeHtml(PrintSettings.headerImage)}" alt="Print header preview">` : 'No header image selected.';
  if (f) f.innerHTML = PrintSettings.footerImage ? `<img src="${escapeHtml(PrintSettings.footerImage)}" alt="Print footer preview">` : 'No footer image selected.';
}
function openPrintDialog() {
  syncPrintDatePreset();
  if (typeof openModal === 'function') openModal('modalPrintOptions');
}
function syncPrintDatePreset() {
  const preset = document.getElementById('printDatePreset')?.value || 'all';
  const from = document.getElementById('printDateFrom');
  const to = document.getElementById('printDateTo');
  if (!from || !to) return;
  const now = new Date();
  const local = d => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
  if (preset === 'all' || preset === 'custom') { if (preset === 'all') { from.value=''; to.value=''; } return; }
  let start, end;
  if (preset === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth()+1, 0); }
  if (preset === 'quarter') { const q=Math.floor(now.getMonth()/3)*3; start=new Date(now.getFullYear(),q,1); end=new Date(now.getFullYear(),q+3,0); }
  if (preset === 'year') { start=new Date(now.getFullYear(),0,1); end=new Date(now.getFullYear(),11,31); }
  if(start&&end){from.value=local(start); to.value=local(end);}
}
let printTemporarilyHiddenRows = [];
function applyPrintDateFilter() {
  printTemporarilyHiddenRows.forEach(({row, display}) => row.style.display = display);
  printTemporarilyHiddenRows = [];
  const from = document.getElementById('printDateFrom')?.value || '';
  const to = document.getElementById('printDateTo')?.value || '';
  if (!from && !to) return;
  document.querySelectorAll('.tab-content.active tbody tr').forEach(row => {
    const first = row.dataset.date || row.cells?.[0]?.textContent?.trim() || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(first)) return;
    if ((from && first < from) || (to && first > to)) {
      printTemporarilyHiddenRows.push({ row, display: row.style.display });
      row.style.display = 'none';
    }
  });
}
function restorePrintDateFilter() {
  printTemporarilyHiddenRows.forEach(({row, display}) => row.style.display = display);
  printTemporarilyHiddenRows = [];
}
function executeConfiguredPrint() {
  const useHeader = document.getElementById('printUseHeader')?.checked;
  const useFooter = document.getElementById('printUseFooter')?.checked;
  const h = document.getElementById('printHeaderOutput');
  const f = document.getElementById('printFooterOutput');
  if (h) h.innerHTML = useHeader && PrintSettings.headerImage ? `<img src="${escapeHtml(PrintSettings.headerImage)}" alt="">` : '';
  if (f) f.innerHTML = useFooter && PrintSettings.footerImage ? `<img src="${escapeHtml(PrintSettings.footerImage)}" alt="">` : '';
  applyPrintDateFilter();
  document.body.classList.add('configured-print');
  if (typeof closeModal === 'function') closeModal('modalPrintOptions');
  setTimeout(() => window.print(), 80);
}
window.addEventListener('afterprint', () => { document.body.classList.remove('configured-print'); restorePrintDateFilter(); clearSelectedPrintSection(); });


