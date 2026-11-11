/* Company-owned archive. Destructive operations require a fresh server comparison. */
(()=>{'use strict';
let busy=false,flowBusy=false;
const admin=()=>typeof liveProfile!=='undefined'&&liveProfile?.role==='admin'&&window.access113?.can('settings-data14231');
async function call(body){if(!admin())throw Error('Administrator access required.');const owner=liveProfile.id,db=ojmDb,{data,error}=await db.functions.invoke('accounting-sheet-archive',{body});if(owner!==liveProfile?.id||db!==ojmDb||!admin())throw Error('Account changed.');if(error)throw Error(data?.error||await error.context?.json?.().then(x=>x.error).catch(()=>null)||error.message);if(data?.error)throw Error(data.error);return data;}
function renderComparison(r){const node=document.getElementById('historyComparison194');if(!node)return;node.replaceChildren();const title=document.createElement('p');title.textContent=r.match?'MATCH — every selected record matches the saved copy.':'DELETION BLOCKED — '+r.differences.length+' differences found.';node.append(title);const pre=document.createElement('pre');pre.style.whiteSpace='pre-wrap';pre.textContent=r.counts.map(x=>x.table+': database '+x.database+' / sheet '+x.sheet).join('\n')+(r.differences.length?'\n\n'+r.differences.map(x=>[x.kind,x.table,x.id,x.field,'Database: '+JSON.stringify(x.database),'Google Sheet: '+JSON.stringify(x.sheet)].join('\n')).join('\n\n'):'');node.append(pre);}
let confirmation={};
document.addEventListener('input',e=>{if(e.target.id==='historyConfirm194')confirmation.phrase=e.target.value;if(e.target.id==='historyPassword194')confirmation.password=e.target.value;});
document.addEventListener('change',e=>{if(e.target.id==='historySaved194')confirmation.saved=e.target.checked;});
async function flow(mode,pack=null){
 if(flowBusy)throw Error('A cleanup review is already in progress.');flowBusy=true;const owner=liveProfile?.id,client=ojmDb;const check=()=>{if(!admin()||liveProfile?.id!==owner||ojmDb!==client)throw Error('Account changed. Start a fresh comparison.');};
 try{check();
 const year=Number(document.getElementById('historyYear194')?.value),args=mode==='year'?{mode,year}:{mode,scopes:pack.scopes,pack};
 const result=await call({action:mode==='year'?'verify-year':'verify-reset',...args});renderComparison(result);
 if(!result.match)throw Error('Google Sheets does not match. See Cleanup Comparison. Nothing was deleted.');
 const backup=await call({action:'prepare-excel',...args});check();renderComparison(backup);if(!backup.match)throw Error('Records changed before backup preparation. Nothing was deleted.');
 const blob=await archiveXlsx129.create({format:'oonjai-readable-194',views:backup.views}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=backup.filename;
 // This safety backup must be downloaded, not only opened as an editor preview.
 try{
 document.body.append(a);try{check();a.click();}finally{a.remove();}
 check();confirmation={};const phrase=mode==='year'?'DELETE VERIFIED YEAR '+year:'DELETE VERIFIED DATABASE RECORDS';
 const approved=await ui108.modal('Excel backup and final deletion confirmation','<p>Excel backup: <a href="'+url+'" download="'+escapeHtml(backup.filename)+'">Download again</a> — '+escapeHtml(backup.filename)+'</p><p>The Excel data came directly from Supabase. Google Sheets History will remain unchanged.</p><label><input type="checkbox" id="historySaved194"> I have saved the readable Excel backup.</label><label>Type '+phrase+'<input id="historyConfirm194" autocomplete="off"></label>',[{label:'Cancel',value:false},{label:'Permanently delete verified records',value:true,danger:true}]);
 check();if(!approved)throw Error('Deletion cancelled.');if(!confirmation.saved||confirmation.phrase!==phrase)throw Error('Confirm the saved Excel file and enter the exact phrase. Nothing was deleted.');
 const deleted=await call({action:mode==='year'?'confirm-year':'confirm-reset',...args,digest:backup.digest,backupToken:backup.backupToken,backupSaved:true,confirmation:phrase});
 if(deleted.match===false){renderComparison(deleted);throw Error('Records changed during confirmation. Deletion was blocked.');}return deleted;
 }finally{setTimeout(()=>URL.revokeObjectURL(url),60000);}
 }finally{flowBusy=false;confirmation={};}
}
async function confirmReset(pack){return flow('reset',pack);}
async function status(){if(!admin()||busy)return;busy=true;try{const s=await call({action:'status'}),n=document.getElementById('historyStatus194');if(s.config?.annual231){const year=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Vientiane',year:'numeric'}).format(new Date())),row=s.annualYears231?.find(r=>r.year===year);s.config.sheet=row?.sheet||'';}const link=document.getElementById('historyWorkbook230');if(link)link.hidden=true;if(link&&/^[\w-]{20,160}$/.test(s.config?.sheet||'')){link.href='https://docs.google.com/spreadsheets/d/'+s.config.sheet+'/edit';link.hidden=false;}if(n)n.textContent=s.config?.last_error?'Saving needs attention: '+s.config.last_error:s.pending?s.pending+' changes saved in Accounting, waiting for the next month-close copy or Save pending changes.':s.config?.last_saved?'Saved to company Google Sheets: '+(typeof formatAppDate==='function'?formatAppDate(s.config.last_saved,true):s.config.last_saved):'First archive save is pending.';}catch(e){const n=document.getElementById('historyStatus194');if(n)n.textContent=e.message;}finally{busy=false;}}
function install(){
 const host=document.querySelector('#portable328 .portable-legacy');if(!host||document.getElementById('googleHistory194'))return;
 const s=document.createElement('div');s.id='googleHistory194';s.innerHTML='<div class="portable-actions"><a id="historyWorkbook230" hidden target="_blank" rel="noopener">Open current archive workbook</a><button type="button" id="historySave194">Save pending changes</button><button type="button" id="historyCheck194">Check archive status</button></div><p id="historyStatus194" role="status"></p>';host.append(s);
 document.getElementById('historyCheck194').onclick=status;document.getElementById('historySave194').onclick=async()=>{const n=document.getElementById('historyStatus194');n.textContent='Saving and checking Google Sheets…';try{const r=await call({action:'sync'});n.textContent=r.busy?'Another save is running. Check status shortly.':r.continuing?'Copy in progress. Check archive status shortly.':'Copy processed. Check archive status to confirm all pending changes are saved.';}catch(e){n.textContent=e.message;}};}
window.AccountingHistory194={confirmReset,call};window.addEventListener('page113',()=>{install();const panel=document.getElementById('googleHistory194');if(panel?.closest('.tab-content.active')&&panel.offsetParent)void status();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
