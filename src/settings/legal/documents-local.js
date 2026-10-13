// Legal documents use IndexedDB because localStorage is not suitable for file bytes.
const LEGAL_DOC_DB = 'ojm_legal_documents_v1';
const LEGAL_DOC_STORE = 'documents';
function openLegalDocumentsDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGAL_DOC_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(LEGAL_DOC_STORE, { keyPath: 'id', autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function legalDocTransaction(mode, action) {
  return openLegalDocumentsDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(LEGAL_DOC_STORE, mode);
    const store = tx.objectStore(LEGAL_DOC_STORE);
    action(store, resolve, reject);
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => db.close();
  }));
}
function formatLegalDocSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
async function uploadLegalDocuments(event) {
  const files = [...(event.target.files || [])];
  const rejected = files.filter(file => file.size > 10 * 1024 * 1024);
  const accepted = files.filter(file => file.size <= 10 * 1024 * 1024);
  for (const file of accepted) {
    await legalDocTransaction('readwrite', (store, resolve, reject) => {
      const req = store.add({ name:file.name, type:file.type || 'application/octet-stream', size:file.size, uploadedAt:new Date().toISOString(), blob:file });
      req.onsuccess = () => resolve(); req.onerror = () => reject(req.error);
    });
  }
  event.target.value = '';
  await renderLegalDocuments();
  const status = document.getElementById('legalDocumentsStatus');
  if (status) {
    status.textContent = rejected.length ? `${accepted.length} document(s) uploaded. ${rejected.length} exceeded the 10 MB limit.` : `${accepted.length} legal document(s) uploaded successfully.`;
    status.classList.toggle('is-save-confirmation', accepted.length > 0);
  }
}
async function getLegalDocuments() {
  return legalDocTransaction('readonly', (store, resolve, reject) => {
    const req = store.getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error);
  });
}
async function renderLegalDocuments() {
  const host = document.getElementById('legalDocumentsList');
  if (!host || !window.indexedDB) return;
  const docs = await getLegalDocuments();
  host.innerHTML = docs.length ? docs.sort((a,b) => b.id-a.id).map(doc => `
    <div class="legal-doc-row">
      <div class="legal-doc-icon">${/pdf/i.test(doc.type) ? 'PDF' : 'FILE'}</div>
      <div class="legal-doc-meta"><strong>${escapeHtml(doc.name)}</strong><span>${formatLegalDocSize(doc.size)} • Uploaded ${formatAppDate(doc.uploadedAt,true)}</span></div>
      <div class="legal-doc-actions"><button type="button" class="je-btn je-btn-secondary" onclick="downloadLegalDocument(${doc.id})">Download</button><button type="button" class="btn-action-delete" onclick="deleteLegalDocument(${doc.id})" title="Delete document">✕</button></div>
    </div>`).join('') : '<div class="legal-doc-empty">No legal documents uploaded yet.</div>';
}
async function downloadLegalDocument(id) {
  const doc = await legalDocTransaction('readonly', (store, resolve, reject) => {
    const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
  if (!doc) return;
  const url = URL.createObjectURL(doc.blob);
  const link = document.createElement('a'); link.href = url; link.download = doc.name; (window.exportCenter14337?exportCenter14337.fromLink(link):link.click());
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function deleteLegalDocument(id) {
  if (!await ui117.confirm('Delete this legal document from this browser?')) return;
  await legalDocTransaction('readwrite', (store, resolve, reject) => {
    const req = store.delete(id); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error);
  });
  renderLegalDocuments();
}
