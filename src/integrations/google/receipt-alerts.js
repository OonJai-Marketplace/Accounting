/* Folder checks publish a small summary only when the problems change. */
(()=>{
 'use strict';
 let session=null,dialog=null;
 const pageSize=12;
 const tabletId='tabletReceiptNotice';
 const allowed=()=>typeof liveProfile!=='undefined' && liveProfile?.role==='admin' &&
   window.access113?.can('settings-accounting','view')===true;
 const current=s=>session===s && allowed() && liveProfile.id===s.actor && ojmDb===s.db;
 function close(){if(dialog){dialog.close();dialog.remove();dialog=null;}}
 function tabletNotice(count){
   let button=document.getElementById(tabletId);
   if(!count||document.documentElement.dataset.device132!=='tablet'){button?.remove();return;}
   if(!button){
     const rail=document.getElementById('appSidebar'),icon=document.querySelector('#upcomingBell101 svg');
     if(!rail||!icon)return;
     button=document.createElement('button');button.type='button';button.id=tabletId;
     button.className='je-btn';button.style.cssText='flex:none;align-self:center;width:38px;height:38px;padding:7px;color:#981b28;background:#fff1f2;border:1px solid #b72e40;border-radius:6px';
     const copy=icon.cloneNode(true);copy.setAttribute('width','21');copy.setAttribute('height','21');copy.setAttribute('aria-hidden','true');button.append(copy);
     button.onclick=open;const brand=rail.querySelector('.sidebar-brand');if(brand)brand.after(button);else rail.prepend(button);
   }
   button.title='Review '+count+(count===1?' receipt problem':' receipt problems');button.setAttribute('aria-label',button.title);
 }
 function stop(){
   const old=session;session=null;close();tabletNotice(0);
   if(old?.channel)void old.db.removeChannel(old.channel);
   if(old?.summary)window.refreshNotices1443?.();
 }
 function accept(s,row){
   if(!current(s)||!row||Number(row.revision)<=Number(s.summary?.revision||0))return;
   s.summary=row;tabletNotice(row.issue_count);window.refreshNotices1443?.();
   if(dialog)void showPage(s,dialog,0);
 }
 function fresh(fn){return window.offline14239?.freshReads?offline14239.freshReads(fn):fn();}
 async function load(s){
   if(!current(s)||s.pending)return;
   s.pending=true;const previous=s.summary;
   try{
     const r=await fresh(()=>s.db.from('receipt_drive_notice').select('revision,issue_count,first_issue').eq('id',true).maybeSingle());
     if(!current(s))return;
     if(r.error){if(['42501','PGRST301','PGRST302'].includes(r.error.code))stop();return;}
     if(!r.data && s.summary && s.summary===previous){s.summary=null;close();tabletNotice(0);window.refreshNotices1443?.();}
     else accept(s,r.data);
   }catch{/* An interrupted read leaves the last confirmed result available. */}
   finally{s.pending=false;}
 }
 function pause(){
   if(session?.channel){const channel=session.channel;session.channel=null;void session.db.removeChannel(channel);}
 }
 function start(refresh=false){
   if(!allowed()){stop();return;}
   if(session&&(session.actor!==liveProfile.id||session.db!==ojmDb))stop();
   const s=session||(session={actor:liveProfile.id,db:ojmDb,summary:null,pending:false,channel:null});
   if(document.hidden||!navigator.onLine){pause();return;}
   if(!s.channel && s.db.channel){
     const channel=s.db.channel('drive-receipt-notice:'+s.actor);s.channel=channel;
     channel.on('postgres_changes',{event:'*',schema:'public',table:'receipt_drive_notice'},event=>{
       if(s.channel===channel)accept(s,event.new);
     }).subscribe(status=>{
       if(!current(s)||s.channel!==channel)return;
       if(status==='SUBSCRIBED')void load(s);
       else if(status==='CLOSED'){pause();void load(s);}
       else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){void load(s);}
     });
   }
   if(refresh||!s.summary)void load(s);
 }
 function notices(){
   const s=session,row=s?.summary,i=row?.first_issue;
   if(!s||!current(s)||!row?.issue_count||!i)return [];
   return [{type:'Drive receipts',noticeId:'receipt-check-'+row.revision,groupKey:'drive-receipt-problems',
     title:i.title,detail:i.detail+' '+i.fix,target:'receipt-drive-problems',critical:true,persistent:true,
     priority:6,actionLabel:row.issue_count===1?'Review receipt problem':'Review '+row.issue_count+' receipt problems'}];
 }
 function item(row){
   const li=document.createElement('li'),title=document.createElement('strong'),detail=document.createElement('p'),fix=document.createElement('p');
   title.textContent=row.title;detail.textContent=row.detail;fix.textContent=row.fix;
   li.append(title,detail,fix);return li;
 }
 async function showPage(s,box,offset){
   if(!current(s)||dialog!==box)return false;
   const generation=box._generation=(box._generation||0)+1;
   const stillOpen=()=>current(s)&&dialog===box&&box._generation===generation;
   const status=box.querySelector('[role=status]'),list=box.querySelector('ol'),
     prev=box.querySelector('[data-prev]'),next=box.querySelector('[data-next]'),retry=box.querySelector('[data-retry]');
   prev.disabled=next.disabled=true;retry.hidden=true;list.replaceChildren();
   status.textContent='Loading receipt problems…';
   try{
     const r=await fresh(()=>s.db.from('receipt_drive_issues').select('title,detail,fix').order('issue_key').range(offset,offset+pageSize));
     if(!stillOpen())return false;
     if(r.error)throw r.error;
     if(!r.data.length&&offset)return showPage(s,box,0);
     list.start=offset+1;list.replaceChildren(...r.data.slice(0,pageSize).map(item));
     status.textContent=!r.data.length?'The latest folder check found no receipt problems.':r.data.length>pageSize||offset?'Showing receipt problems '+(offset+1)+'–'+(offset+Math.min(pageSize,r.data.length))+'.':'';
     prev.hidden=!offset;next.hidden=r.data.length<=pageSize;prev.disabled=next.disabled=false;
     prev.onclick=()=>showPage(s,box,Math.max(0,offset-pageSize));next.onclick=()=>showPage(s,box,offset+pageSize);
     return true;
   }catch{
     if(stillOpen()){
       status.textContent='Accounting could not load the list. Check your internet connection and try again.';
       prev.hidden=next.hidden=true;retry.hidden=false;retry.onclick=()=>showPage(s,box,offset);
     }
     return false;
   }
 }
 async function open(){
   const s=session;if(!s||!current(s))return false;
   close();const box=document.createElement('dialog');dialog=box;
   box.className='hr-dialog14306';box.setAttribute('aria-labelledby','receiptProblemsTitle');
   box.innerHTML='<header><h3 id="receiptProblemsTitle">Drive receipt problems</h3><button type="button" aria-label="Close">×</button></header><div class="hr-dialog-body14306"><p role="status"></p><ol style="padding-inline-start:1.6rem;overflow-wrap:anywhere"></ol></div><footer><button type="button" class="je-btn" data-prev hidden>Previous</button><button type="button" class="je-btn" data-next hidden>Next</button><button type="button" class="je-btn" data-retry hidden>Try again</button><button type="button" class="je-btn" data-settings>Open receipt settings</button></footer>';
   box.querySelector('[aria-label=Close]').onclick=close;
   box.addEventListener('close',()=>{if(dialog===box)dialog=null;box.remove();},{once:true});
   box.querySelector('[data-settings]').onclick=()=>{
     if(!current(s))return;close();switchTab('settings-accounting');window.settingsGroups14332?.chooseAccounting('google');
   };
   document.body.append(box);box.showModal();return showPage(s,box,0);
 }
 window.driveReceiptAlerts={start,stop,notices,open};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else if(session)start(true);});
 window.addEventListener('offline',pause);window.addEventListener('online',()=>{if(session)start(true);});
 window.addEventListener('pagehide',stop);window.addEventListener('pageshow',e=>{if(e.persisted)start(true);});
 window.addEventListener('page113',()=>{if(session&&!current(session))stop();});
})();
