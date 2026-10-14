async function loadBusinessSettingsFromSupabase() {
  const owner=liveProfile?.id,db=ojmDb;if(!owner||!db)return;
  const {data,error}=await db.from('business_settings').select('*').eq('id',true).single(); if(error)throw error;if(liveProfile?.id!==owner||ojmDb!==db)return;
  const value={legalName:data.legal_name||'',companyName:data.display_name||'',enterpriseNo:data.enterprise_no||'',taxId:data.tax_id||'',businessLicense:data.business_license||'',industry:data.industry||'',phone:data.phone||'',email:data.email||'',website:data.website||'',address1:data.address_line||'',city:data.city||'',postalCode:data.postal_code||'',country:data.country||'Laos',timezone:data.timezone||'Asia/Vientiane'};
  BusinessSettings.current=value; AccountingStore.companyName=value.companyName;
  Object.entries(BUSINESS_FIELD_MAP).forEach(([key,id])=>{const field=document.getElementById(id);if(field)field.value=value[key]||''});
  renderBusinessIdentity(value,true);
  syncEntrySequence();updateNextEntryIdDisplay();
  const badge=document.getElementById('businessSavedBadge');if(badge){badge.textContent='Synced';badge.classList.add('is-saved')}
  const status=document.getElementById('businessSettingsStatus');if(status)status.textContent='Business profile loaded from Supabase.';
}

saveBusinessSettings = async function(event) {
  event?.preventDefault(); const form=document.getElementById('businessSettingsForm'); if(!form?.checkValidity()){form?.reportValidity();return}
  const owner=liveProfile?.id,db=ojmDb;if(!owner||!db)return false;
  const v=collectBusinessSettings();
  const payload={id:true,legal_name:v.legalName,display_name:v.companyName,enterprise_no:v.enterpriseNo,tax_id:v.taxId,business_license:v.businessLicense,industry:v.industry,phone:v.phone,email:v.email,website:v.website,address_line:v.address1,city:v.city,postal_code:v.postalCode,country:v.country,timezone:v.timezone,updated_by:liveProfile.id,updated_at:new Date().toISOString()};
  const {error}=await db.from('business_settings').upsert(payload);if(liveProfile?.id!==owner||ojmDb!==db)return false; if(error){showAppNotification('Save Failed',error.message,true);return false}
  BusinessSettings.current=v;AccountingStore.companyName=v.companyName;renderBusinessIdentity(v,true);syncEntrySequence();updateNextEntryIdDisplay();
  const status=document.getElementById('businessSettingsStatus');if(status){status.textContent=`Saved ${formatAppDate(new Date().toISOString(),true)} to Supabase.`;status.classList.add('is-save-confirmation')}
  return true;
};

