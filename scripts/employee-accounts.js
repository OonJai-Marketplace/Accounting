const names={enabled:'Enabled',disabled:'Disabled',active:'Active',suspended:'Suspended',inactive:'Inactive',
  probationary:'Probationary',on_leave:'On approved leave',resigned:'Resigned',terminated:'Terminated',resignation_pending:'Resignation scheduled'};
const auditLabels={account_created:'Account created',email_changed:'Email changed',password_reset:'Password reset',password_assigned:'Password assigned',
  access_revoked:'Access revoked',access_enabled:'Access enabled',account_suspended:'Account suspended',account_reactivated:'Account reactivated',
  employment_access_revoked:'Access revoked by employment status',separation_scheduled:'Separation scheduled'};
const css=`
:host{display:block;color:#213b30;font:14px system-ui,sans-serif}*{box-sizing:border-box}
header,.tools,footer{display:flex;align-items:center;gap:10px;flex-wrap:wrap}header{justify-content:space-between;margin-bottom:12px}
h3{font-size:19px;margin:0}.tools{margin-bottom:10px}.frame{overflow:auto}button,input,select{font:inherit}
button,input,select{min-height:32px;padding:4px 8px;border:1px solid #a0b4a8;border-radius:5px;background:white;color:inherit}
button{cursor:pointer}button:disabled{opacity:.6}.primary{color:white;background:#176548}table{border-collapse:collapse;width:100%;font-size:13px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #dbe5df}th{background:#eff5f1}td:last-child{white-space:nowrap}td button+button{margin-left:4px}
dialog{width:min(430px,96%);max-height:86vh;overflow:auto;border:1px solid #9bb4a6;border-radius:8px;padding:18px;color:inherit}
dialog::backdrop{background:#14322666}form{display:grid;gap:9px;margin-top:12px}label{display:grid;gap:4px}.inline{display:flex;align-items:center}
input[type=checkbox]{min-height:auto}footer{justify-content:flex-end}[role=alert]{color:#8d291d}p:empty{display:none}li{margin-bottom:8px}`;
function el(tag,text,attrs={}){const n=document.createElement(tag);if(text!=null)n.textContent=text;
  for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;}
function button(label,fn){const b=el('button',label,{type:'button'});b.onclick=fn;return b;}
function select(entries,label){const s=el('select',null,{'aria-label':label});for(const [v,t] of entries)s.add(new Option(t,v));return s;}
export function openAccounts(panel){
  const actor=liveProfile.id,db=ojmDb,abort=new AbortController(),host=el('div'),root=host.attachShadow({mode:'open'});
  let active=true,rows=[],loadId=0,subscription;
  const current=()=>active&&liveProfile?.id===actor&&liveProfile?.role==='admin'&&liveProfile?.status==='active'&&db===ojmDb&&panel.classList.contains('active');
  function close(){active=false;abort.abort();rows=[];root.querySelector('dialog')?.close();root.replaceChildren();host.remove();subscription?.unsubscribe();}
  panel.replaceChildren(host);subscription=db.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'||(session&&session.user.id!==actor))close();
  }).data.subscription;
  async function request(body){
    if(!current())throw Error('Reopen Employee Accounts.');
    const {data,error}=await db.auth.getSession();if(error||!current()||data.session?.user?.id!==actor)throw Error('Sign in again.');
    const r=await fetch(OJM_SUPABASE_URL+'/functions/v1/employee-hr',{method:'POST',credentials:'omit',cache:'no-store',
      headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:abort.signal});
    const result=await r.json();if(!current())throw Error('Reopen Employee Accounts.');if(!r.ok)throw Error(result.error||'Request failed.');return result;
  }
  const heading=el('header'),tools=el('div',null,{class:'tools'}),status=el('p','',{role:'status'}),tableArea=el('div',null,{class:'frame'});
  const search=el('input',null,{type:'search','aria-label':'Search employees',placeholder:'Search name, ID, position or email'});
  const filter=select([['','All employment statuses'],...['active','probationary','on_leave','suspended','resignation_pending','resigned','inactive','terminated'].map(k=>[k,names[k]])],'Employment status');
  const refresh=button('Refresh',()=>load());heading.append(el('h3','Employee Accounts'),refresh);tools.append(search,filter);
  root.append(el('style',css),heading,tools,status,tableArea);
  function render(){
    if(!current())return;const term=search.value.trim().toLowerCase(),table=el('table'),head=table.createTHead().insertRow(),body=table.createTBody();
    for(const h of ['Employee name','Employee ID','Position','Email address','Password status','Employment status','Account status','Actions'])head.append(el('th',h,{scope:'col'}));
    for(const r of rows){
      if(filter.value&&r.employment!==filter.value||![r.name,r.code,r.id,r.position,r.email].some(v=>String(v||'').toLowerCase().includes(term)))continue;
      const tr=body.insertRow();for(const v of [r.name,r.code||r.id,r.position,r.email,r.revision?'Password Configured':'Not configured',
        (names[r.employment]||r.employment)+(r.employment==='resignation_pending'?' · '+formatAppDate(r.separationDate):''),names[r.access]||'No account'])tr.insertCell().textContent=v||'—';
      tr.cells[1].title=r.id;const actions=tr.insertCell();actions.append(button(r.revision?'Manage':'Create account',()=>edit(r)));
      if(r.revision)actions.append(button('History',()=>history(r)));
    }
    tableArea.replaceChildren(body.rows.length?table:el('p','No matching employees.'));
  }
  async function load(message=''){
    const id=++loadId;refresh.disabled=true;status.textContent='Loading employee accounts…';
    try{const result=await request({action:'list'});if(!current()||id!==loadId)return;rows=result;render();status.textContent=message;}
    catch(e){if(current()&&id===loadId){rows=[];tableArea.replaceChildren();status.textContent=e.message;}}
    finally{if(current()&&id===loadId)refresh.disabled=false;}
  }
  function dialog(title){const box=el('dialog',null,{'aria-label':title});box.append(el('h3',title));
    box.addEventListener('close',()=>box.remove(),{once:true});root.append(box);box.showModal();return box;}
  function edit(r){
    const box=dialog(r.revision?'Manage employee account':'Create employee account');
    // Keep credentials outside the Accounting draft recovery and report DOM.
    const form=el('form',null,{autocomplete:'off'}),error=el('p','',{role:'alert'});
    function field(name,input){const label=el('label',name);label.append(input);form.append(label);return input;}
    field('Employee',el('input',null,{value:r.name||r.code,readonly:''}));
    const mail=field('Email address',el('input',null,{type:'email',maxlength:254,required:'',autocomplete:'off'}));mail.value=r.email||'';
    const pw=field(r.revision?'New password (leave blank to keep current)':'Password',el('input',null,{type:'password',minlength:8,maxlength:256,placeholder:'At least 8 characters',autocomplete:'new-password'}));
    const confirm=field('Confirm password',el('input',null,{type:'password',maxlength:256,autocomplete:'new-password'}));if(!r.revision)pw.required=confirm.required=true;
    const show=el('input',null,{type:'checkbox'}),label=el('label','Show passwords',{class:'inline'});label.prepend(show);form.append(label);
    show.onchange=()=>{pw.type=confirm.type=show.checked?'text':'password';};
    const access=field('Account access status',select(['enabled','disabled','suspended'].map(k=>[k,names[k]]),'Account access status'));access.value=r.access||'enabled';
    const footer=el('footer'),save=el('button','Save',{type:'submit',class:'primary'});footer.append(button('Cancel',()=>box.close()),save);form.append(error,footer);box.append(form);
    box.addEventListener('close',()=>{pw.value=confirm.value='';},{once:true});
    form.onsubmit=async event=>{event.preventDefault();if(save.disabled)return;
      if(pw.value!==confirm.value){error.textContent='The passwords do not match.';confirm.focus();return;}
      save.disabled=true;error.textContent='';
      try{await request({action:'save',id:r.id,email:mail.value.trim(),access:access.value,revision:r.revision,...(pw.value?{password:pw.value}:{})});
        box.close();await load('Employee account saved.');}catch(e){if(current())error.textContent=e.message;}finally{save.disabled=false;}};
  }
  async function history(r){
    const box=dialog('Account history · '+r.name),info=el('p','Loading…');box.append(info,button('Close',()=>box.close()));
    try{const events=await request({action:'history',id:r.id});if(!current()||!box.open)return;const list=el('ol');
      for(const ev of events)list.append(el('li',(auditLabels[ev.action]||ev.action)+' · '+
        new Intl.DateTimeFormat(undefined,{timeZone:'Asia/Vientiane',dateStyle:'medium',timeStyle:'short'}).format(new Date(ev.at))+
        ' (Laos) · '+(ev.full_name||ev.administrator||'Employment record update')));
      if(events.length)info.replaceWith(list);else info.textContent='No recorded actions.';}catch(e){if(current())info.textContent=e.message;}
  }
  search.oninput=filter.onchange=render;void load();return close;
}
