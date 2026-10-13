function handleTableSearch(term) {
  const query = term.toLowerCase().trim();
  document.querySelectorAll('#coaTableBody tr, #subAccountTableBody tr').forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(query) ? '' : 'none';
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {modal.classList.add('active');if(['modalAccount','modalSubAccount','modalUserAccess','modalAccessPicker'].includes(id))window.dialogs1440?.attach(modal,{close:()=>id==='modalAccessPicker'?closeAccessPicker():closeModal(id)});}
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {modal.classList.remove('active');window.dialogs1440?.detach(modal);}
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
