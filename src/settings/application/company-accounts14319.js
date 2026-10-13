/* Shared administrator defaults; changing an address does not grant account access. */
(()=>{'use strict';
function guard(area,owner=liveProfile?.id){if(!owner||liveProfile?.id!==owner||liveProfile.role!=='admin'||liveProfile.status!=='active'||!window.access113?.can(area))throw Error('Administrator access changed. Reopen these settings.');return owner}
function email(value,label='Email'){value=String(value||'').trim();if(!value)return '';const list=budgetGmail14314.recipients(value);if(list.length!==1)throw Error('Enter one '+label.toLowerCase()+' address.');return list[0]}
async function load(area){const owner=guard(area),r=await ojmDb.from('budget_settings14313').select('*').eq('id',true).maybeSingle();guard(area,owner);if(r.error)throw r.error;return r.data}
async function saveChatGPT(value,record,owner){const area='local-events-account';guard(area,owner);const data={...(record?.data||{}),chatgptAccountEmail:email(value,'ChatGPT account')};const payload={id:true,data,version:record?record.version+1:1,updated_at:new Date().toISOString(),updated_by:owner};const q=record?ojmDb.from('budget_settings14313').update(payload).eq('id',true).eq('version',record.version):ojmDb.from('budget_settings14313').insert(payload);const r=await q.select('*');guard(area,owner);if(r.error)throw r.error;if(!r.data?.length)throw Error('Company settings changed elsewhere. Reopen this page before saving.');return r.data[0]}
window.companyAccounts14319={guard,email,load,saveChatGPT};
})();
