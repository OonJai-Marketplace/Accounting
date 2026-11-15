(function(){
'use strict';const esc=v=>escapeHtml(String(v??''));let queued=false;
const image=data=>/^data:image\/(png|jpeg|webp);base64,/i.test(data||'')?data:'';
function companyLogo(){try{return image(localStorage.getItem('ojm_company_logo101'))}catch{return ''}}
function profileSection(title,fields){
 const rows=fields.filter(([,value])=>value!=null&&String(value).trim());
 return rows.length?`<section class="identity-section"><h3>${esc(title)}</h3><dl>${rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></section>`:'';
}
function identityProfile({kind,name,subtitle,photo,sections,actions=[]}){
 if(!liveProfile)return;
 const previous=document.activeElement,actor=liveProfile.id,client=ojmDb;
 document.querySelector('#profileView105')?.close();
 const box=document.createElement('dialog');
 box.id='profileView105';box.className='identity-dialog';box.setAttribute('aria-labelledby','identityName');
 const initials=name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
 box.innerHTML=`<div class="identity-hero"><button type="button" data-close aria-label="Close profile">×</button><small>${esc(kind)}</small>
 <div class="identity-avatar">${photo?`<img src="${esc(photo)}" alt="">`:esc(initials)}</div><h2 id="identityName">${esc(name)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>
 <div class="identity-body">${sections.join('')}</div><footer>${actions.map(([label],i)=>`<button type="button" data-action="${i}">${esc(label)}</button>`).join('')}<button type="button" data-close>Close</button></footer>`;
 document.body.append(box);
 const gate=document.getElementById('loginGate');
 const check=()=>{if(actor!==liveProfile?.id||client!==ojmDb||!gate?.classList.contains('is-authenticated'))box.close()};
 const observer=new MutationObserver(check);
 if(gate)observer.observe(gate,{attributes:true,attributeFilter:['class']});
 box.addEventListener('close',()=>{observer.disconnect();box.remove();if(previous?.isConnected&&!document.querySelector('dialog[open]'))previous.focus();},{once:true});
 box.addEventListener('click',event=>{
  if(event.target.closest('[data-close]'))return box.close();
  const action=event.target.closest('[data-action]');
  if(action){box.close();if(actor===liveProfile?.id&&client===ojmDb)actions[Number(action.dataset.action)][1]();return;}
  if(event.target===box){const r=box.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)box.close();}
 });
 box.showModal();
}
window.openCompanyProfile=function(){
 if(!liveProfile)return;
 const b=BusinessSettings.current||{};
 const name=b.companyName||b.legalName||'Oon Jai Marketplace';
 identityProfile({kind:'Company profile',name,subtitle:[b.industry,b.city].filter(Boolean).join(' · '),
  photo:image(window.shell113?.state.rows.brand?.image)||companyLogo()||document.querySelector('#companyLogo101:not([hidden])')?.getAttribute('src'),
  sections:[profileSection('Business details',[['Registered name',b.legalName],['Enterprise number',b.enterpriseNo],['Business licence',b.businessLicense],['Tax ID',b.taxId]]),
   profileSection('Contact & location',[['Phone',b.phone],['Email',b.email],['Website',b.website],['Address',[b.address1,b.city,b.postalCode,b.country].filter(Boolean).join(', ')],['Time zone',b.timezone]])],
  actions:canAccessAppTarget('settings-business')?[['Business information',()=>switchTab('settings-business')]]:[]});
};
window.openProfile105=function(id,own=false){
 if(!liveProfile)return;
 const employee=Work82.employees.find(row=>row.id===id),d=employee?.data||{};
 const me=own||!employee;
 const name=d.name||(me&&liveProfile.full_name)||'User';
 const role=me?(liveProfile.role==='admin'?'Administrator':liveProfile.role):'';
 const position=d.position||(me&&livePermission?.job_title)||'';
 identityProfile({kind:me?'My profile':'Employee profile',name,subtitle:[position,role].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · '),
  photo:image(d.photoData)||(me&&image(window.shell113?.state.photo)),
  sections:[profileSection('Work details',[['Company',BusinessSettings.current.companyName||'Oon Jai Marketplace'],['Employee code',d.code],['Position',position],['Account role',role],['Status',employee?(d.active===false?'Archived':'Active'):'Signed in']]),
  profileSection('Contact details',[['Email',d.profileEmail||(me&&liveProfile.email)],['Phone',d.phone],['Address',d.address],['Emergency contact',d.emergencyContact]])],
  actions:employee&&admin82()?[['Edit employee',()=>{switchTab('payroll-employees');openEmployee82(employee.id)}],['Documents',()=>window.hrWorkspace14306?hrWorkspace14306.documents(employee.id):openDocumentEditor105({employeeId:employee.id,list:true})]]:[]});
};
function profiles(){
 const root=document.querySelector('#payroll-employees.active .work82');if(!root||root.querySelector('#employeeForm82')||root.querySelector('.profile-list105'))return;
 const logo=companyLogo(),wrap=document.createElement('div');wrap.className='profile-list105';wrap.innerHTML=orderedEmployees82().filter(e=>e.data.active!==false&&!e.data.archived).map(e=>{const photo=image(e.data.photoData)||logo;return `<button class="profile-card105" type="button" data-employee="${esc(e.id)}">${photo?`<img src="${esc(photo)}" alt="">`:''}<span><strong>${esc(e.data.name)}</strong><small>${esc(e.data.position||'Employee')}</small></span></button>`}).join('');root.querySelector('header')?.after(wrap);wrap.querySelectorAll('button').forEach(b=>b.onclick=()=>openProfile105(b.dataset.employee));
}
function polish(){queued=false;profiles();const contracts=document.querySelector('#hr-contracts.active .work82>header .actions82');if(contracts&&!contracts.querySelector('[data-documents105]')){const b=document.createElement('button');b.type='button';b.dataset.documents105='';b.textContent='Saved Documents';b.onclick=()=>openDocumentEditor105({employeeId:document.getElementById('hrEmployee99')?.value,list:true});contracts.append(b)}const menu=document.getElementById('headerAccountDropdown');if(menu&&!menu.querySelector('[data-profile105]')){const b=document.createElement('button');b.type='button';b.className='header-menu-item';b.dataset.profile105='';b.textContent='View Profile';b.onclick=()=>{menu.hidden=true;const email=String(liveProfile?.email||'').toLowerCase();const e=Work82.employees.find(e=>e.data?.userId===liveProfile.id)||Work82.employees.find(e=>email&&String(e.data.profileEmail||'').trim().toLowerCase()===email);openProfile105(e?.id,true)};menu.prepend(b)}}
function ready(){
 const hamburger=document.getElementById('mobileMenuToggle');if(hamburger)document.getElementById('transactionsHeading98')?.prepend(hamburger);
 const settings=document.getElementById('settings-system');const form=document.createElement('form');form.className='settings-section-card auth-settings105';form.innerHTML=`<h3>Password Recovery</h3><label>Published app URL<input type="url" name="url" placeholder="https://your-site.example/accounting/" value="${esc(window.OJM_PUBLIC_APP_URL||localStorage.getItem('ojm_public_app_url105')||'')}"></label><button type="submit" class="je-btn je-btn-emerald">Save recovery address</button><p role="status"></p><p><a href="setup/SETUP-GUIDE-v142.20.txt" download>Recovery setup instructions</a></p>`;settings?.append(form);form.onsubmit=e=>{e.preventDefault();const value=form.elements.url.value.trim();const status=form.querySelector('[role=status]');try{if(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error('Use the published HTTPS address.')}localStorage.setItem('ojm_public_app_url105',value);window.OJM_PUBLIC_APP_URL=value;status.textContent='Saved for this browser. Recovery return address: '+passwordRecoveryRedirectUrl()}catch(error){status.textContent=error.message}};
 polish();new MutationObserver(records=>{if(!records.some(r=>{const node=r.target.nodeType===1?r.target:r.target.parentElement;return node?.closest('#payroll-employees,#hr-contracts,#headerAccountDropdown')||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('#payroll-employees,#hr-contracts,#headerAccountDropdown')||n.querySelector('#payroll-employees,#hr-contracts,#headerAccountDropdown')))}))return;if(!queued){queued=true;requestAnimationFrame(polish)}}).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
