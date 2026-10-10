/* Full category-grouped email and a copyable WhatsApp / Messenger summary. */
(()=>{'use strict';
const esc=v=>escapeHtml(String(v??''));
const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(n));
function texts(d,link){
 const groups=new Map(),totals=new Map();
 for(const l of d.lines||[]){const category=l.category||'Other';if(!groups.has(category))groups.set(category,{lines:[],totals:new Map()});const g=groups.get(category),amount=Number(l.amount);g.lines.push(l);g.totals.set(l.currency,(g.totals.get(l.currency)||0)+amount);totals.set(l.currency,(totals.get(l.currency)||0)+amount);}
 const amounts=m=>[...m].map(([c,n])=>c+' '+fmt(n)).join(' · ');
 const period=/^\d{4}-\d{2}-\d{2}$/.test(d.date||'')?new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(d.date+'T12:00:00Z')):d.date||'';
 const subject='Oon Jai Marketplace — Budget Request for '+period;
 const date=typeof formatAppDate==='function'?formatAppDate(d.date):d.date;
 const opening='Dear '+(d.recipient||'Administrators')+',\n\nPlease review the following budget request for Oon Jai Marketplace.\n\nPeriod: '+period+'\nRequest date: '+date+(d.purpose?'\nPurpose: '+d.purpose:'');
 const details=[...groups].map(([category,g])=>category.toUpperCase()+'\n'+g.lines.map(l=>'• '+l.description+': '+l.currency+' '+fmt(l.amount)).join('\n')+'\nSubtotal — '+category+': '+amounts(g.totals)).join('\n\n');
 const totalsText=[...totals].map(([c,n])=>c+' '+fmt(n)).join('\n');
 const detail=opening+'\n\n'+details+'\n\nTOTAL REQUESTED\n'+totalsText+(d.notes?'\n\nAdditional notes:\n'+d.notes:'')+(link?'\n\nFull budget breakdown (accounting sign-in required):\n'+link:'')+'\n\nPlease let us know once the request is approved or the funds are arranged.\n\nThank you,\n'+(d.preparedBy||'')+'\nOon Jai Marketplace';
 const summary='*Oon Jai Marketplace*\n*Budget Request — '+period+'*'+(d.purpose?'\n'+d.purpose:'')+'\n\n'+[...groups].map(([category,g])=>'*'+category+' — '+amounts(g.totals)+'*\n'+[...new Set(g.lines.map(l=>l.description).filter(Boolean))].join(', ')).join('\n\n')+'\n\n*TOTAL REQUESTED*\n'+totalsText+(d.notes?'\n\n'+d.notes:'')+(link?'\n\nFull breakdown (sign-in required):\n'+link:'')+'\n\nThank you.';
 const linesHtml=[...groups].map(([category,g])=>'<h2 style="font-size:15px;color:#145c4a;margin:24px 0 8px">'+esc(category)+'</h2><table role="presentation" style="border-collapse:collapse;width:100%;font-size:14px">'+g.lines.map(l=>'<tr><td style="border-bottom:1px solid #e1e7e4;padding:9px 4px">'+esc(l.description)+'</td><td style="border-bottom:1px solid #e1e7e4;padding:9px 4px;text-align:right;white-space:nowrap">'+esc(l.currency)+' '+fmt(l.amount)+'</td></tr>').join('')+'<tr><td style="padding:10px 4px;font-weight:bold">Subtotal — '+esc(category)+'</td><td style="padding:10px 4px;text-align:right;font-weight:bold">'+esc(amounts(g.totals))+'</td></tr></table>').join('');
 const html='<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f2f5f3;font-family:Arial,sans-serif;color:#20352e"><div style="max-width:640px;margin:0 auto;padding:28px;background:#fff"><p style="font-size:12px;color:#4b6358;margin:0 0 6px">OON JAI MARKETPLACE</p><h1 style="font-size:24px;line-height:1.3;margin:0 0 24px;color:#145c4a">Budget Request</h1><p style="white-space:pre-line;line-height:1.6;font-size:14px">'+esc(opening)+'</p>'+linesHtml+'<div style="padding:16px;margin:20px 0;background:#edf5f0;border:1px solid #c7dbcf"><strong>TOTAL REQUESTED</strong><p style="white-space:pre-line;font-size:18px;line-height:1.5;margin:8px 0 0">'+esc(totalsText)+'</p></div>'+(d.notes?'<p style="white-space:pre-line;line-height:1.6"><strong>Additional notes</strong><br>'+esc(d.notes)+'</p>':'')+(link?'<p><a style="color:#145c4a" href="'+esc(link)+'">View full budget breakdown</a><br><small>Accounting sign-in required.</small></p>':'')+'<p style="font-size:14px;line-height:1.6">Please let us know once the request is approved or the funds are arranged.</p><p style="font-size:14px;line-height:1.6">Thank you,<br>'+esc(d.preparedBy||'')+'<br>Oon Jai Marketplace</p></div></body></html>';
 return {subject,detail,summary,html};
}
async function prepare(channel,{guard,load,config,dialog}){
 const actor=guard(),saved=await window.budgetWorkflow14316.requireSaved(),d=saved.data;if(!d)return;
 if(!d.lines.length||d.lines.some(l=>!Number.isFinite(Number(l.amount))||Number(l.amount)<=0))throw Error('Each budget item needs a positive amount.');
 await load(true);guard(actor);const c=config();
 const recipients=channel==='email'?budgetGmail14314.recipients(c.emails):[];
 const r=saved;guard(actor);
 const url=new URL('desktop.html',location.href);url.search='';url.searchParams.set('budget',r.id);url.hash='';
 const text=texts(d,url.href);if(d.document14316){text.html=d.document14316.html;const body=document.createElement('div');body.innerHTML=text.html;text.detail=body.innerText||body.textContent; text.subject=d.document14316.title||text.subject;}
 if(channel!=='email'){
  const {root}=dialog('WhatsApp / Messenger summary','<p>Copy this summary and paste it into '+esc(c.groupName||'your group chat')+'.</p><textarea data-summary14314 readonly rows="16">'+esc(text.summary)+'</textarea><button type="button" data-copy14314>Copy message</button><p role="status">Ready to copy. No message has been sent.</p>',[{label:'Close',value:false}]);
  root.querySelector('[data-copy14314]').onclick=async()=>{try{guard(actor);await window.budgetWorkflow14316.requireSaved();await navigator.clipboard.writeText(text.summary);root.querySelector('[role=status]').textContent='Copied. Paste it into WhatsApp or Messenger.'}catch(e){root.querySelector('textarea').select();root.querySelector('[role=status]').textContent='Select and copy the message above.'}};
  return;
 }
 return emailPreview(text,c,recipients,{actor,guard,dialog,beforeSend:()=>window.budgetWorkflow14316.requireSaved(),title:'Send budget request by Gmail'});
}
async function trial({guard,load,config,dialog,templates}){
 const actor=guard();await load(true);guard(actor);const c=config(),row=templates().find(t=>t.id===c.trialTemplateId14319);if(!row)throw Error('Choose a sample template in Budget Request Settings first.');const recipients=budgetGmail14314.recipients(c.trialEmailTo),d={...structuredClone(row.data),date:today82(),preparedBy:liveProfile.full_name||'Administrator'};if(!d.lines?.length||d.lines.some(l=>!Number.isFinite(Number(l.amount))||Number(l.amount)<=0))throw Error('Each sample template item needs a positive amount.');const text=texts(d,'');const closing='Please let us know once the request is approved or the funds are arranged.';text.detail=text.detail.replace(closing,'This is a test email. Please confirm receipt.');text.html=text.html.replace(closing,'This is a test email. Please confirm receipt.');text.subject='SAMPLE — '+text.subject;text.detail='TEST EMAIL — Sample template data only. No funds are requested.\n\n'+text.detail;text.html=text.html.replace('<h1 style=', '<p style="padding:12px;background:#fff1ce;font-weight:bold">TEST EMAIL — Sample template data only. No funds are requested.</p><h1 style=');return emailPreview(text,c,recipients,{actor,guard,dialog,beforeSend:async()=>{},title:'Send sample template test email'});
}
function emailPreview(text,c,recipients,{actor,guard,dialog,beforeSend,title}){
 const {root}=dialog(title,'<div class="budget-gmail14314"><p>Saved sender: <strong>'+esc(c.emailSender||'Choose a sender in Settings')+'</strong></p><p>From: <strong data-sender14314>Not connected</strong></p><button type="button" data-connect14314>Connect Gmail</button><button type="button" data-disconnect14314 hidden>Disconnect</button></div><label>To · separate addresses with commas<input data-to14314 value="'+esc(recipients.join(', '))+'" autocomplete="off"></label><p><strong>Subject:</strong> '+esc(text.subject)+'</p><iframe data-email-preview14314 title="Full budget email preview" sandbox=""></iframe><button type="button" data-send14314>Send Email</button><p role="status">Review the email, then send it directly from this website.</p>',[{label:'Close',value:false}]);
 root.querySelector('iframe').srcdoc=text.html;
 const connect=root.querySelector('[data-connect14314]'),disconnect=root.querySelector('[data-disconnect14314]'),send=root.querySelector('[data-send14314]'),to=root.querySelector('[data-to14314]'),status=root.querySelector('[role=status]');
 let busy=false,done=false,unknown=false;
 function refresh(){const s=budgetGmail14314.status(c.gmailClientId,c.emailSender);root.querySelector('[data-sender14314]').textContent=s.email||'Not connected';connect.textContent=s.connected?'Change Gmail':'Connect Gmail';disconnect.hidden=!s.connected;send.disabled=busy||done||unknown||!s.connected;connect.disabled=busy||done||unknown;disconnect.disabled=busy||done||unknown;to.disabled=busy||done||unknown;}
 function preload(){if(!budgetGmail14314.validClientId(c.gmailClientId)){status.textContent='Complete Gmail setup in Budget Request Settings, then reopen this preview.';connect.disabled=true;return}connect.disabled=true;budgetGmail14314.load().then(()=>{if(root.isConnected)refresh()}).catch(e=>{if(root.isConnected){status.textContent=e.message;connect.disabled=false}})}
 refresh();preload();
 connect.onclick=()=>{try{guard(actor);busy=true;refresh();status.textContent='Choose your Gmail account in the Google connection window.';budgetGmail14314.connect(c.gmailClientId,c.emailSender).then(()=>{guard(actor);status.textContent='Gmail connected. Review the sender and recipients, then click Send Email.'}).catch(e=>{status.textContent=e.message}).finally(()=>{busy=false;if(root.isConnected)refresh()})}catch(e){busy=false;status.textContent=e.message;refresh()}};
 disconnect.onclick=()=>{guard(actor);budgetGmail14314.disconnect();refresh();status.textContent='Gmail disconnected from this page.'};
 send.onclick=async()=>{
  if(busy||done||unknown)return;
  try{guard(actor);await beforeSend();const from=budgetGmail14314.status(c.gmailClientId,c.emailSender).email,addresses=budgetGmail14314.recipients(to.value);busy=true;refresh();status.textContent='Sending…';
   const result=await budgetGmail14314.send(c.gmailClientId,{from,to:addresses.join(','),...text,messageId:crypto.randomUUID()});done=true;guard(actor);status.textContent='Sent from '+result.email+' to '+addresses.join(', ')+'.';send.textContent='Sent';
  }catch(e){unknown=!!e.uncertain;status.textContent=e.message}
  finally{busy=false;if(root.isConnected)refresh()}
 };
}
window.budgetMessages14314={texts,prepare,trial};
})();
