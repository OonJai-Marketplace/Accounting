/* Unposted submissions may be deferred. Closed books retain original source dates. */
(()=>{'use strict';
const esc=v=>escapeHtml(String(v??''));
async function rpc(name,args){const r=await ojmDb.rpc(name,args);if(r.error)throw Error(r.error.code==='PGRST202'?'Install INSTALL-DEFERRED-SUBMISSIONS-v143.17.sql before using closing acknowledgments.':r.error.message);return r.data}
async function acknowledge(month,status='closed'){
 const actor=liveProfile?.id;if(!actor)throw Error('Sign in before closing a period.');
 const check=await rpc('period_pending14317',{p_month:month+'-01'});if(liveProfile?.id!==actor)throw Error('Your sign-in changed.');
 if(!check||typeof check.revision!=='string'||!Array.isArray(check.items))throw Error('Pending submissions could not be verified. Retry before closing.');
 if(check.items.length){
  const html=`<p><strong>${check.items.length} report(s) contain unposted entries dated in ${esc(monthLabel(month))}.</strong></p><p>These entries are excluded from this closing. You can review and post them later in an open month. Original transaction dates and source references stay in the report.</p><div class="data-table82"><table><thead><tr><th>Submitter</th><th>Status</th><th>Original dates</th><th>Entries</th></tr></thead><tbody>${check.items.map(r=>`<tr><td>${esc(r.owner_name||r.owner_id)}</td><td>${esc(r.status)}</td><td>${esc(r.from)} to ${esc(r.to)}</td><td>${esc(r.count)}</td></tr>`).join('')}</tbody></table></div><label class="period-ack14317"><input type="checkbox" id="pendingAck14317"> I acknowledge that these entries are excluded from this period and may be posted later.</label>`;
  const pending=ui108.modal('Pending submissions — '+month,html,[{label:'Cancel',value:false},{label:status==='locked'?'Acknowledge & Lock':'Acknowledge & Continue',value:true,primary:true}],true);
  const overlay=document.querySelector('.ui-overlay108:last-child'),button=overlay.querySelector('footer button:last-child'),box=overlay.querySelector('#pendingAck14317');button.disabled=true;box.onchange=()=>button.disabled=!box.checked;
  if(!await pending)return null;if(!box.checked)throw Error('Acknowledge pending submissions before continuing.');if(liveProfile?.id!==actor)throw Error('Your sign-in changed.');
 }
 return {revision:check.revision,acknowledged:check.items.length>0,actor};
}
async function setStatus(month,status){if(!['closed','locked'].includes(status))return ojmDb.rpc('set_accounting_period_status',{p_month:month+'-01',p_status:status});try{if(!window.maintenance14324)throw Error('Maintenance closing module did not load. Reload before closing.');const done=await maintenance14324.finish({kind:'period',month,status});return done?{data:{month,status},error:null}:{error:{message:'Period closing cancelled.'}}}catch(e){return {error:{message:e.message}}}}
function nextOpenDate(month){let [y,m]=month.split('-').map(Number);for(let i=0;i<240;i++){m++;if(m>12){y++;m=1}const key=y+'-'+String(m).padStart(2,'0');if(PeriodReview.status(key)==='open')return key+'-01'}throw Error('No later open period is available.')}
async function finishSession(session,month,cancel){if(cancel){await rpc('finish_book_session136',{p_session:session,p_cancel:true});return true}if(!window.maintenance14324)throw Error('Maintenance closing module did not load. Reload before closing.');return maintenance14324.finish({kind:'session',session,month})}
async function closeYear(year,confirmation,fingerprint){if(!window.maintenance14324)throw Error('Maintenance closing module did not load. Reload before closing.');return maintenance14324.finish({kind:'year',year,confirmation,fingerprint,month:year+'-12'})}
window.periodClosing14317={acknowledge,setStatus,nextOpenDate,finishSession,closeYear};
})();
