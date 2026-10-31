/* Phone-only sub-user authorization settings; loaded when the area is opened. */
(() => {
  'use strict';
  let api, actor, generation=0, saving=false, settingsUser='', settingsBase, accountRows=[];
  let settingsDrafts=Object.create(null);
  const host=()=>document.getElementById('workspace'), esc=v=>api.esc(v), canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
  const live=stamp=>api?.state().actor===actor&&generation===stamp;
  const status=(message,error=false)=>{const n=document.getElementById('toolStatus');if(n){n.textContent=message;n.setAttribute('role',error?'alert':'status');}};
  const button=(label,name,extra='')=>`<button type="button" class="btn" data-tool="${name}" ${extra}>${esc(label)}</button>`;
  const field=(name,label,value='',type='text',extra='')=>`<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const checkbox=(name,label,checked,value='1')=>`<label class="inline"><input type="checkbox" name="${name}" value="${esc(value)}" ${checked?'checked':''}>${label}</label>`;
  const select=(name,label,choices,value)=>`<label>${esc(label)}<select name="${name}">${choices.map(([id,text])=>`<option value="${esc(id)}" ${String(value)===String(id)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
  function frame(title,body){host().innerHTML=`<div class="row no-print"><h1>${esc(title)}</h1>${button('Back','back')}</div>${body}<p id="toolStatus" class="tool-status" role="status"></p>`;}
  function checkAdmin(){if(!api.state().admin)throw Error('Administrator access is required.');}
  async function authorize(){const context=api,owner=actor,stamp=generation;await context.access();if(context!==api||!live(stamp)||api.state().actor!==owner)throw Error('Your login changed. Reopen this area.');}
  async function saveSettingsDraft(){if(!api?.state().admin)return;await api.saveDevice({phoneSettingsDrafts:settingsDrafts});}
  function captureSettings(){const form=document.getElementById('phoneUserSettings');if(!form)return;
    const values=Object.create(null);for(const n of form.elements){if(!n.name||n.type==='password')continue;if(n.type==='checkbox'){values[n.name]||=[];if(n.checked)values[n.name].push(n.value);}else values[n.name]=n.value;}
    settingsDrafts[settingsUser||'new']={values,base:settingsBase};void saveSettingsDraft().catch(e=>status(e.message,true));
  }
  async function settings(){checkAdmin();const stamp=generation;const data=await api.device();if(!live(stamp))return;settingsDrafts=data.phoneSettingsDrafts||{};
    frame('Settings',(window.OJMAppUpdates217?'<div class="actions compact-actions"><button type="button" class="btn" data-native-updates217>App updates</button></div>':'')+'<p>Manage access and assigned accounts.</p><div class="actions compact-actions">'+button('Add sub-user','new-user')+button('Refresh users','refresh-users')+'</div><div id="settingsUsers"></div>');drawSettingsUsers();
  }
  function drawSettingsUsers(){const root=document.getElementById('settingsUsers');if(!root)return;root.innerHTML=api.state().directory.map(u=>`<button class="user-row" type="button" data-tool-user="${esc(u.id)}"><strong>${esc(u.full_name||u.email)}</strong><small>${esc(u.email||'')}</small><span>›</span></button>`).join('')||'<p>No downloaded sub-users. Refresh when connected.</p>';}
  async function editUser(id){checkAdmin();const stamp=++generation;captureSettings();settingsUser=id;frame(id?'Edit sub-user':'Add sub-user','<p>Opening account assignments…</p>');
    try{
      if(!navigator.onLine)throw Error('Reconnect to change sub-user access.');await authorize();checkAdmin();
      const users=api.state().directory;let profile=id?users.find(u=>u.id===id):null;if(id&&!profile)throw Error('Refresh the sub-user list first.');
      const [permissions,accounts]=await Promise.all([id?api.http('user_permissions',{user_id:'eq.'+id}):{data:[]},api.paged('accounts',{},'id,code,name,currency_code,is_active,is_posting')]);if(!live(stamp))return;
      accountRows=accounts;settingsBase=permissions.data?.[0]||profile?.user_permissions||{};
      const saved=settingsDrafts[id||'new'];if(saved){settingsBase=saved.base||settingsBase;}
      renderSettings(profile,saved?.values);
    }catch(e){if(live(stamp)){frame('Sub-user settings',button('Return to users','settings-home'));status(e.message,true);if(api.denied(e))await api.revoke(e);}}
  }
  function renderSettings(profile,saved){
    const p=settingsBase||{},m=p.module_actions113||{},admin=profile?.role==='admin';
    const value=(name,fallback)=>saved?.[name]??fallback,checked=(name,choice,fallback)=>saved?.[name]?saved[name].includes(choice):fallback;
    const choices=accountRows.map(a=>[a.id,(a.currency_code==='LAK'?'₭':a.currency_code==='USD'?'$':a.currency_code==='THB'?'฿':a.currency_code)+' '+a.code+' — '+a.name]);
    const checks=(name,selected)=>'<div class="check-list">'+accountRows.filter(a=>a.is_posting!==false).map(a=>checkbox(name,`<span>${esc((a.currency_code==='LAK'?'₭':a.currency_code==='USD'?'$':a.currency_code==='THB'?'฿':a.currency_code)+' '+a.code+' — '+a.name+(a.is_active===false?' (inactive)':''))}</span>`,checked(name,a.id,selected.includes(a.id)),a.id)).join('')+'</div>';
    const actions=(target,name,verbs)=>'<div class="check-list">'+verbs.map(([verb,label])=>checkbox(name,label,checked(name,verb,(m[target]||[]).includes(verb)),verb)).join('')+'</div>';
    frame(profile?'Edit sub-user':'Add sub-user',`<form id="phoneUserSettings" class="settings-form">${field('full_name','Name',value('full_name',profile?.full_name||''),'text','required')}${field('email','Email',value('email',profile?.email||''),'email',profile?'readonly':'required')}${profile?button('Send password reset','reset-password'):field('password','Temporary password','','password','required minlength="8" autocomplete="new-password"')}${select('user_type','Role',[['sub_user','Sub-user'],['admin','Administrator']],value('user_type',admin?'admin':'sub_user'))}${field('job_title','Job title',value('job_title',p.job_title||''))}${field('department14229','Department',value('department14229',p.department14229||''))}${select('manager_id','Reports to',[['','No manager'],...api.state().directory.filter(u=>u.id!==settingsUser).map(u=>[u.id,u.full_name||u.email])],value('manager_id',p.manager_id||''))}<details class="tool-section"><summary>Workspace access</summary>${actions('sub-users-workspace','workspace_actions',[['view','View workspace'],['edit','Gather entries and submit'],['export','Print report'],['void','Void draft entries']])}${actions('document-editor105','document_actions',[['view','Open document editor'],['edit','Edit document copy'],['export','Print documents']])}</details><details class="tool-section"><summary>Assigned funds</summary>${checkbox('multiple','Allow multiple funds',checked('multiple','1',!!p.allow_multiple_funds))}${checks('funds',p.assigned_fund_account_ids||[])}</details><details class="tool-section"><summary>Entry accounts and directions</summary>${checks('entries',p.destination_account_ids||p.allowed_account_ids||[])}<div class="check-list">${checkbox('directions','Money Out',checked('directions','out',(p.allowed_directions||['out']).includes('out')),'out')}${checkbox('directions','Money In',checked('directions','in',(p.allowed_directions||[]).includes('in')),'in')}</div></details><details class="tool-section"><summary>Entry numbering</summary>${field('entry_prefix','Prefix',value('entry_prefix',p.entry_prefix||'S'),'text','maxlength="8"')}${field('entry_initials','Initials',value('entry_initials',p.entry_initials||(profile?.full_name||'').split(/\s+/).map(w=>w[0]).join('').slice(0,8)),'text','maxlength="8"')}${field('entry_digits','Digits',value('entry_digits',p.entry_digits||4),'number','min="3" max="9"')}</details><div class="actions compact-actions"><button class="btn primary" type="submit">Save settings</button>${button('Users','settings-home')}</div></form>`);
    const form=document.getElementById('phoneUserSettings');form.addEventListener('input',captureSettings);form.addEventListener('change',captureSettings);form.onsubmit=e=>{e.preventDefault();void saveUser();};
  }
  async function saveUser(){
    if(saving)return;checkAdmin();captureSettings();const form=document.getElementById('phoneUserSettings'),values=settingsDrafts[settingsUser||'new'].values,password=form.elements.password?.value||'',stamp=generation;
    const workspace=values.workspace_actions||[],documents=values.document_actions||[],funds=values.funds||[],entries=values.entries||[],directions=values.directions||[],multiple=(values.multiple||[]).length>0;
    try{
      if(!navigator.onLine)throw Error('Reconnect to save access settings.');if(!values.full_name.trim())throw Error('Add the name.');
      if(workspace.length&&!workspace.includes('view')||documents.length&&!documents.includes('view'))throw Error('Enable View before adding other actions.');
      if(workspace.includes('edit')&&(!funds.length||!directions.length||directions.includes('out')&&!entries.length))throw Error('Assign funds, a direction and the required entry accounts.');
      if(!multiple&&funds.length>1)throw Error('Choose one fund or enable multiple funds.');
      if(workspace.includes('edit')&&directions.includes('in')&&!entries.length)throw Error('Assign category accounts for Money In.');
      const prefix=values.entry_prefix.toUpperCase(),initials=values.entry_initials.toUpperCase(),digits=Number(values.entry_digits);
      if(!/^[A-Z0-9]{1,8}$/.test(prefix)||!/^[A-Z0-9]{1,8}$/.test(initials)||!Number.isInteger(digits)||digits<3||digits>9)throw Error('Use 1–8 letters/numbers for prefix and initials, and 3–9 digits.');
      if([...funds,...entries,values.counterpart].filter(Boolean).some(id=>!accountRows.some(a=>a.id===id&&a.is_active!==false&&a.is_posting!==false)))throw Error('Assignments must use active posting accounts.');
      if(settingsUser===actor&&values.user_type!=='admin'&&!await api.confirm('Remove your administrator access?','This will end administrator access for your current login.','Save'))return;
      saving=true;for(const n of form.elements)n.disabled=true;status('Saving settings…');await authorize();checkAdmin();if(!live(stamp))return;
      let userId=settingsUser,fresh=settingsBase;
      if(userId){const result=await api.http('user_permissions',{user_id:'eq.'+userId});if(!live(stamp))return;fresh=result.data?.[0]||{};if(canonical(fresh)!==canonical(settingsBase))throw Error('These settings changed elsewhere. Reload the user before saving; your typed changes are kept.');}
      else{
        const state=await api.device(),pending=state.phonePendingNewUser;await api.refreshUsers();if(!live(stamp))return;const existing=api.state().directory.find(u=>u.email?.toLowerCase()===values.email.toLowerCase());
        if(existing){if(pending?.email!==values.email)throw Error('This email already has an account. Open that user to edit its settings.');userId=existing.id;fresh=existing.user_permissions||{};}
        else{
          if(pending?.email===values.email)throw Error('The earlier account creation is not confirmed. Refresh the users before trying again.');
          await api.saveDevice({phonePendingNewUser:{email:values.email,full_name:values.full_name,createdAt:Date.now()}});if(!live(stamp))return;
          const response=await api.request(api.scope+'/functions/v1/admin-create-user',{method:'POST',headers:{apikey:api.anon,Authorization:'Bearer '+api.session().access_token,'Content-Type':'application/json'},body:JSON.stringify({full_name:values.full_name,email:values.email,password,user_type:values.user_type,manager_id:values.manager_id||null,job_title:values.job_title,department14229:values.department14229,modules:['sub-users:sub-users-workspace'],can_manage_data:true})});
          const result=await response.json();if(!response.ok||!result?.user_id)throw Error(result?.message||'Account creation was not confirmed. Refresh users before retrying.');userId=result.user_id;if(!live(stamp))return;settingsUser=userId;await api.saveDevice({phonePendingNewUser:null});
        }
      }
      if(!live(stamp))return;const matrix={...fresh.module_actions113,'sub-users-workspace':workspace,'document-editor105':documents},modules=(fresh.modules||[]).filter(x=>!['sub-users:sub-users-workspace','transactions:document-editor105'].includes(x));if(workspace.includes('view'))modules.push('sub-users:sub-users-workspace');if(documents.includes('view'))modules.push('transactions:document-editor105');
      const has=verb=>Object.values(matrix).some(row=>row.includes(verb));
      const permissions={...fresh,user_id:userId,user_type:values.user_type,manager_id:values.manager_id||null,job_title:values.job_title,department14229:values.department14229,modules,module_actions113:matrix,can_manage_data:has('edit'),can_export:has('export'),can_void:has('void'),can_approve:has('approve'),can_post_directly:has('post'),allow_any_account:false,assigned_fund_account_ids:funds,destination_account_ids:entries,allowed_account_ids:entries,default_out_credit_account_id:funds[0]||null,default_in_debit_account_id:funds[0]||null,allowed_directions:directions,allow_multiple_funds:multiple,money_in_counterpart_account_id:values.counterpart||null,entry_prefix:prefix,entry_initials:initials,entry_digits:digits};
      const result=await api.rpc('admin_save_access1441',{p_user:userId,p_name:values.full_name,p_role:values.user_type==='admin'?'admin':'submitter',p_permissions:permissions});if(result?.user_id!==userId||result.saved!==true)throw Error('The complete access save was not confirmed. Reload the user to check it.');if(!live(stamp))return;
      delete settingsDrafts[userId];delete settingsDrafts.new;await saveSettingsDraft();await api.refreshUsers();if(!live(stamp))return;await settings();status('Sub-user settings saved.');
    }catch(e){if(live(stamp)){status(e.message,true);if(api.denied(e))await api.revoke(e);}}
    finally{saving=false;if(form.isConnected)for(const n of form.elements)n.disabled=false;}
  }
  async function handle(name,value){const stamp=generation;try{
    if(name==='back'){captureSettings();api.back();return;}
    if(name==='settings-home'){captureSettings();return await settings();}
    if(name==='new-user')return await editUser('');
    if(name==='edit-user')return await editUser(value);
    if(name==='refresh-users'){await api.refreshUsers();return await settings();}
    if(name==='reset-password'){checkAdmin();const email=api.state().directory.find(u=>u.id===settingsUser)?.email;if(!email)throw Error('Refresh this user to read its email.');if(!await api.confirm('Send password reset?','Send a recovery link to '+email+'?','Send'))return;if(!live(stamp))return;const b=host().querySelector('[data-tool=reset-password]');b.disabled=true;try{await api.resetPassword(email);status('Password-reset link requested.');}finally{if(b.isConnected)b.disabled=false;}}
  }catch(e){status(e.message,true);if(api.denied(e))await api.revoke(e);}}
  document.addEventListener('click',e=>{if(!api||!host().contains(e.target))return;const user=e.target.closest('[data-tool-user]'),action=e.target.closest('[data-tool]');if(user)void handle('edit-user',user.dataset.toolUser);else if(action)void handle(action.dataset.tool);});
  window.PhoneTools14242={async open(next,context){if(next!=='settings'||!context.state().admin)throw Error('Administrator settings only.');if(api&&actor!==context.state().actor)settingsDrafts=Object.create(null);api=context;actor=api.state().actor;generation++;await settings();},close(){if(!api)return;if(api.state().actor===actor)captureSettings();generation++;}};
})();
