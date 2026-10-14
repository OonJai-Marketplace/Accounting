async function loadLegalDocumentsFromSupabase(){if(liveProfile?.role!=='admin')return;const owner=liveProfile.id,db=ojmDb;const{data,error}=await db.from('legal_documents').select('*').order('uploaded_at',{ascending:false});if(liveProfile?.id!==owner||ojmDb!==db)return;if(error)throw error;if(!error){liveLegalDocuments=data||[];renderLegalDocuments()}}
renderLegalDocuments = async function(){const host=document.getElementById('legalDocumentsList');if(!host)return;host.innerHTML=liveLegalDocuments.length?liveLegalDocuments.map(d=>`<div class="legal-doc-row"><div class="legal-doc-icon">${/pdf/i.test(d.mime_type||'')?'PDF':'FILE'}</div><div class="legal-doc-meta"><strong>${escapeHtml(d.file_name)}</strong><span>${formatLegalDocSize(Number(d.size_bytes||0))} • ${formatAppDate(d.uploaded_at,true)}</span></div><div class="legal-doc-actions"><button type="button" class="je-btn je-btn-secondary" onclick="downloadLegalDocument('${d.id}')">Download</button><button type="button" class="btn-action-delete" onclick="deleteLegalDocument('${d.id}')">✕</button></div></div>`).join(''):'<div class="legal-doc-empty">No legal documents uploaded yet.</div>'};
uploadLegalDocuments = async function(event){
 const owner=liveProfile?.id,db=ojmDb;if(!owner||liveProfile.role!=='admin')return;
 const input=event.target,files=[...(input.files||[])];
 for(const file of files){
  if(liveProfile?.id!==owner||ojmDb!==db)return;
  if(file.size>10485760){showAppNotification('File Too Large',`${file.name} exceeds 10 MB.`,true);continue}
  const path=`${owner}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const{error:uploadError}=await db.storage.from('legal-documents').upload(path,file);
  if(liveProfile?.id!==owner||ojmDb!==db)return;
  if(uploadError){showAppNotification('Upload Failed',uploadError.message,true);continue}
  const{error}=await db.from('legal_documents').insert({file_name:file.name,storage_path:path,mime_type:file.type,size_bytes:file.size,uploaded_by:owner});
  if(liveProfile?.id!==owner||ojmDb!==db)return;
  if(error)showAppNotification('Document Registration Failed',error.message,true);
 }
 input.value='';await loadLegalDocumentsFromSupabase();
};
downloadLegalDocument = async function(id){const owner=liveProfile?.id,db=ojmDb;const doc=liveLegalDocuments.find(d=>d.id===id);if(!doc)return;const{data,error}=await db.storage.from('legal-documents').createSignedUrl(doc.storage_path,60);if(liveProfile?.id!==owner||ojmDb!==db)return;if(error){showAppNotification('Download Failed',error.message,true);return}window.open(data.signedUrl,'_blank')};
deleteLegalDocument = async function(id){const owner=liveProfile?.id,db=ojmDb;if(!owner)return;if(!await ui117.confirm('Delete this legal document permanently?')||liveProfile?.id!==owner||ojmDb!==db)return;const doc=liveLegalDocuments.find(d=>d.id===id);if(!doc)return;const{error:storageError}=await db.storage.from('legal-documents').remove([doc.storage_path]);if(liveProfile?.id!==owner||ojmDb!==db)return;if(storageError){showAppNotification('Delete Failed',storageError.message,true);return}const{error}=await db.from('legal_documents').delete().eq('id',id);if(liveProfile?.id!==owner||ojmDb!==db)return;if(error){showAppNotification('Delete Failed',error.message,true);return}await loadLegalDocumentsFromSupabase()};

