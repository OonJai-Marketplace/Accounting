// ----- Print settings and multi-page print flow -----
const PrintSettings = {
  headerImage: localStorage.getItem('ojm_print_header') || '',
  footerImage: localStorage.getItem('ojm_print_footer') || ''
};

function handlePrintImageUpload(event, type) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    PrintSettings[type + 'Image'] = reader.result;
    localStorage.setItem(type === 'header' ? 'ojm_print_header' : 'ojm_print_footer', reader.result);
    renderPrintSettingPreviews();
  };
  reader.readAsDataURL(file);
}
function clearPrintImage(type) {
  PrintSettings[type + 'Image'] = '';
  localStorage.removeItem(type === 'header' ? 'ojm_print_header' : 'ojm_print_footer');
  renderPrintSettingPreviews();
}
function renderPrintSettingPreviews() {
  const h = document.getElementById('printHeaderPreview');
  const f = document.getElementById('printFooterPreview');
  if (h) h.innerHTML = PrintSettings.headerImage ? `<img src="${PrintSettings.headerImage}" alt="Print header preview">` : 'No header image selected.';
  if (f) f.innerHTML = PrintSettings.footerImage ? `<img src="${PrintSettings.footerImage}" alt="Print footer preview">` : 'No footer image selected.';
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
  from.value=local(start); to.value=local(end);
}
let printTemporarilyHiddenRows = [];
function applyPrintDateFilter() {
  printTemporarilyHiddenRows.forEach(({row, display}) => row.style.display = display);
  printTemporarilyHiddenRows = [];
  const from = document.getElementById('printDateFrom')?.value || '';
  const to = document.getElementById('printDateTo')?.value || '';
  if (!from && !to) return;
  document.querySelectorAll('.tab-content.active tbody tr').forEach(row => {
    const first = row.cells?.[0]?.textContent?.trim() || '';
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
  if (h) h.innerHTML = useHeader && PrintSettings.headerImage ? `<img src="${PrintSettings.headerImage}" alt="">` : '';
  if (f) f.innerHTML = useFooter && PrintSettings.footerImage ? `<img src="${PrintSettings.footerImage}" alt="">` : '';
  applyPrintDateFilter();
  document.body.classList.add('configured-print');
  if (typeof closeModal === 'function') closeModal('modalPrintOptions');
  setTimeout(() => window.print(), 80);
}
window.addEventListener('afterprint', () => { document.body.classList.remove('configured-print'); restorePrintDateFilter(); clearSelectedPrintSection(); });


