/* Prepared journals: every occurrence waits for an explicit Post action. */
(()=>{'use strict';
const $=id=>document.getElementById(id),M=window.JournalPlanModel280,G=window.JournalCompletion258,esc=v=>escapeHtml(String(v??''));
const chart=()=>AccountingStore.accounts||[],actor=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'',admin=()=>typeof liveProfile!=='undefined'&&liveProfile?.role==='admin'&&liveProfile.status==='active';
const number=v=>typeof v==='number'?v:parseAppNumber(String(v||0)),money=n=>formatAppNumber(n),day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let state={owner:'',client:null,rows:[],loaded:false,error:''},flight=null,saving=false,posting=false,dialog=null;
const key=()=> 'ojm_prepared_plan280:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+actor();
const saveKey=()=> 'ojm_plan_save280:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+actor();
function context(){const owner=actor(),client=ojmDb;return {owner,client,check(){if(!owner||owner!==actor()||client!==ojmDb||!admin()||window.deviceVault14334&&!deviceVault14334.unlocked)throw Error('Account changed or locked. Reopen Upcoming.');}};}
function allowed(action='edit'){if(!admin()||!window.access113?.can('transactions-recurring',action))throw Error('Administrator access to Upcoming is required.');if(window.personalJournal1437?.active||window.workspaceRequest138?.target)throw Error('Open the main company journal first.');}
function pending(){if(!actor())return null;return JSON.parse(localStorage.getItem(key())||'null');}
function remember(value){if(!actor())throw Error('Sign in again.');if(value===null)localStorage.removeItem(key());else{const raw=JSON.stringify(value);localStorage.setItem(key(),raw);if(localStorage.getItem(key())!==raw)throw Error('The preparation could not be retained.');}}
async function rpc(name,args,c=context()){c.check();if(navigator.onLine===false||window.offline14239?.offline())throw Error('Reconnect to save or post this plan. Your draft remains.');const r=await c.client.rpc(name,args);c.check();if(r.error)throw r.error;return r.data;}
function fail(e){showCenterStatus(e.message||String(e),true);}
function capture(){return {memo:$('jeGeneralMemo')?.value.trim()||'',date:$('jeTransDate')?.value||day(),lines:[...document.querySelectorAll('#jeLinesBody tr')].map(r=>{const text=r.querySelector('.je-line-acc')?.value||'',a=getSelectedAccountInfo(text),c=a&&G.currency(a);return {account_id:a?.id||'',account_text:text,description:r.querySelector('.je-line-memo')?.value||'',currency_code:c||'',debit:number(r.querySelector('.je-line-dr')?.value),credit:number(r.querySelector('.je-line-cr')?.value),fx_rate_lak:c==='LAK'?1:number(r.dataset.fxRate14383||window.JournalFX14383?.lineRate(r,c)),book_rate_lak:c==='LAK'?1:number(r.dataset.bookRate14383||r.dataset.fxRate14383||window.JournalFX14383?.lineRate(r,c))};}).filter(l=>l.account_id||l.account_text||l.debit||l.credit||l.description)};}
function lineTable(lines){return '<div class="plan-scroll280"><table><thead><tr><th>Account</th><th>Line memo</th><th>Currency</th><th>Debit</th><th>Credit</th><th>Book rate</th></tr></thead><tbody>'+lines.map(l=>{const a=chart().find(a=>a.id===l.account_id);return '<tr><td>'+esc(a?a.code+' — '+a.name:'Missing account')+'</td><td>'+esc(l.description||l.line_memo)+'</td><td>'+esc(l.currency_code||G.currency(a))+'</td><td>'+esc(l.debit?money(l.debit):'—')+'</td><td>'+esc(l.credit?money(l.credit):'—')+'</td><td>'+esc(l.currency_code==='LAK'?'—':money(l.book_rate_lak))+'</td></tr>';}).join('')+'</tbody></table></div>';}
function close(){if(saving)return;dialog?.close();dialog?.remove();dialog=null;}
function modal(title,content){close();const d=document.createElement('dialog');d.className='plan-dialog280';d.innerHTML='<header><h3>'+esc(title)+'</h3><button type="button" class="je-btn je-btn-secondary" data-close>Close</button></header>'+content;document.body.append(d);dialog=d;d.querySelector('[data-close]').onclick=close;d.addEventListener('cancel',e=>{e.preventDefault();close();});d.showModal();return d;}
function showSaveAs(){try{allowed();const d=modal('Save as','<div class="plan-choices280"><button type="button" class="je-btn je-btn-secondary" data-kind="template">Template</button><button type="button" class="je-btn je-btn-secondary" data-kind="recurring">Recurring transaction</button><button type="button" class="je-btn je-btn-secondary" data-kind="amortization">Amortization</button></div>');d.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{const kind=b.dataset.kind;close();if(kind==='template')createTemplateFromCurrent();else openSave(kind);});}catch(e){fail(e);}}
function options(filter=()=>true){return '<option value="">Choose account</option>'+chart().filter(a=>G.available(a)&&filter(a)).map(a=>'<option value="'+esc(a.id)+'">'+esc(a.code+' — '+a.name+' · '+G.currency(a))+'</option>').join('');}
function fieldsMissing(snapshot){const lines=snapshot.lines.length?snapshot.lines:[{},{}];if(lines.length===1)lines.push({});snapshot.lines=lines;
 return lines.map((l,i)=>{const a=chart().find(a=>a.id===l.account_id),missing=[];
  if(!a)missing.push('<label>Account · line '+(i+1)+'<select data-line="'+i+'" data-field="account_id" required>'+options()+'</select></label>');
  if(!l.debit&&!l.credit)missing.push('<label>Side · line '+(i+1)+'<select data-line="'+i+'" data-field="side"><option value="debit">Debit</option><option value="credit" '+(i===1?'selected':'')+'>Credit</option></select></label><label>Amount · line '+(i+1)+'<input inputmode="decimal" data-line="'+i+'" data-field="amount" required></label>');
  if(!a||G.currency(a)!=='LAK'&&!(l.book_rate_lak>0))missing.push('<label data-rate-line="'+i+'" '+(a&&G.currency(a)==='LAK'?'hidden':'')+'>Book rate · line '+(i+1)+'<input inputmode="decimal" data-line="'+i+'" data-field="book_rate_lak" placeholder="LAK per 1 foreign unit"></label>');
  return missing.join('');
 }).join('');
}
function openSave(kind){try{
 allowed();if(pending())throw Error('Finish or close the prepared plan journal first.');
 if(window.DriveDrafts143128?.preparedCount||window.DriveDrafts143128?.editing||pendingWorkspacePostJournalId||pendingWorkspacePostOwnerId)throw Error('Finish the prepared submissions first.');
 const c=context(),snapshot=capture(),rawBefore=JSON.stringify(snapshot),uuid=crypto.randomUUID();
 const prepaid=snapshot.lines.filter(l=>l.debit>0&&chart().some(a=>a.id===l.account_id&&/^13\d\d$/.test(String(a.code))&&G.type(a)==='ASSET'));
 const purchase=kind==='amortization'&&prepaid.length===1&&!snapshot.lines.some(l=>l.credit>0&&chart().some(a=>a.id===l.account_id&&/^13\d\d$/.test(String(a.code))));
 const source=purchase?prepaid[0]:null,sourceAccount=source&&chart().find(a=>a.id===source.account_id);
 const missing=fieldsMissing(snapshot),start=JournalModule.editingEntryId?M.step(kind==='amortization'?M.month(snapshot.date):snapshot.date,'monthly',1):kind==='amortization'?M.month(snapshot.date):snapshot.date,end=M.last(M.step(start,'monthly',11));
 const d=modal('Save as '+(kind==='amortization'?'amortization':'recurring transaction'),'<form><div class="plan-fields280"><label>Plan name<input name="title" required maxlength="200" value="'+esc(snapshot.memo.slice(0,200))+'"></label>'+(snapshot.memo?'':'<label>General description<input name="memo" required maxlength="4000"></label>')+missing+
 (purchase?'<label>Expense account<select name="expense" required>'+options(a=>G.currency(a)===G.currency(sourceAccount)&&(G.currency(a)==='LAK'?G.type(a)==='EXPENSE'&&!G.technical(a):G.type(G.registry(chart()).maps.get(a.id)?.actual)==='EXPENSE'))+'</select></label>':'')+
 '<label>'+(kind==='amortization'?'Coverage starts':'First occurrence')+'<input type="date" name="start" required value="'+start+'"></label><label>'+(kind==='amortization'?'Coverage ends (inclusive)':'Last occurrence on or before')+'<input type="date" name="end" required value="'+end+'"></label>'+
 (kind==='amortization'?'<label>Entered amounts represent<select name="basis"><option value="monthly" '+(!purchase?'selected':'')+'>One monthly release</option><option value="total" '+(purchase?'selected':'')+'>Total remaining prepaid balance</option></select></label><label>Allocation<select name="allocation"><option value="equal">Equal monthly amounts</option><option value="daily">Daily proration of total balance</option></select></label><label>Journal date<select name="posting"><option value="first">First day · after prior month closes</option></select></label><label>Posting<select name="mode"><option value="review">Wait for me to post each month</option></select></label>':'<label>Frequency<select name="frequency"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option><option value="once">Once</option></select></label>')+
 '<label>Reminder days before<input type="number" name="reminder" value="3" min="0" max="90" required></label></div><p class="plan-note280">'+(purchase?'The prepaid amount is already filled. Choose its expense account. Saving this plan does not post the original payment.':missing?'Complete the missing journal fields above. Your entered fields are retained.':snapshot.lines.length+' journal lines copied, including their accounts, memos and recorded rates.')+'</p>'+
 '<div data-preview></div><p role="status" data-status></p><footer><button type="button" class="je-btn je-btn-secondary" data-preview-button>Preview schedule</button><button type="submit" class="je-btn je-btn-emerald" disabled data-save>Save plan</button></footer></form>');
 const f=d.querySelector('form'),v=name=>f.elements[name]?.value;let reviewed=null;
 d.querySelectorAll('[data-line]').forEach(n=>n.addEventListener('change',()=>{if(n.dataset.field==='account_id'){const a=chart().find(a=>a.id===n.value),r=d.querySelector('[data-rate-line="'+n.dataset.line+'"]');if(r)r.hidden=G.currency(a)==='LAK';}}));
 const build=()=>{c.check();const definition={kind,title:v('title').trim(),memo:snapshot.memo||v('memo').trim(),start:v('start'),end:v('end'),reminder_days:Number(v('reminder')),source_entry_id:JournalModule.editingEntryId||null};let lines=snapshot.lines.map(l=>({...l}));
  for(const n of d.querySelectorAll('[data-line][data-field]')){const l=lines[Number(n.dataset.line)],field=n.dataset.field;if(field==='amount')continue;l[field]=field==='book_rate_lak'?number(n.value):n.value;}
  for(const [i,l] of lines.entries()){const a=chart().find(a=>a.id===l.account_id);if(!a)throw Error('Choose account on line '+(i+1)+'.');l.currency_code=G.currency(a);const amount=d.querySelector('[data-line="'+i+'"][data-field="amount"]');if(amount){l.debit=l.side==='credit'?0:number(amount.value);l.credit=l.side==='credit'?number(amount.value):0;}if(l.currency_code==='LAK')l.book_rate_lak=l.fx_rate_lak=1;else if(!(l.fx_rate_lak>0))l.fx_rate_lak=l.book_rate_lak;}
  if(purchase){const p=lines.find(l=>l.account_id===source.account_id),a=chart().find(a=>a.id===v('expense'));if(!a)throw Error('Choose the prepaid expense account.');const generated=G.complete({chart:chart(),rows:[{account_id:a.id,debit:p.debit,credit:0,line_memo:p.description,book_rate_lak:p.book_rate_lak,fx_rate_lak:p.book_rate_lak},{account_id:p.account_id,debit:0,credit:p.debit,line_memo:p.description,book_rate_lak:p.book_rate_lak,fx_rate_lak:p.book_rate_lak}],rates:{[p.currency_code]:p.book_rate_lak}});if(generated.errors.length)throw Error(generated.errors[0].message);lines=generated.rows;}
  definition.lines=M.prepare(lines,chart(),kind);
  if(kind==='amortization')Object.assign(definition,{amount_basis:v('basis'),allocation:v('allocation'),posting_day:v('posting'),auto_post:false});else Object.assign(definition,{frequency:v('frequency'),auto_post:false});
  if(definition.allocation==='daily'&&definition.amount_basis!=='total')throw Error('Daily proration requires the total remaining balance.');return definition;
 };
 f.addEventListener('input',()=>{reviewed=null;d.querySelector('[data-save]').disabled=true;d.querySelector('[data-preview]').replaceChildren();});
 d.querySelector('[data-preview-button]').onclick=()=>{try{if(!f.reportValidity())return;const definition=build(),items=M.preview(definition,definition.lines,chart());reviewed={definition,items};
   const primary=items[0].lines.find(l=>l.credit>0&&chart().some(a=>a.id===l.account_id&&/^13\d\d$/.test(String(a.code))))||items[0].lines.find(l=>l.debit>0),id=primary.account_id,total=M.round(items.reduce((n,o)=>n+Number(o.lines.find(l=>l.account_id===id).credit||o.lines.find(l=>l.account_id===id).debit),0));let remaining=total;
   d.querySelector('[data-preview]').innerHTML='<details><summary>Prepared journal · accounts and line memos</summary>'+lineTable(items[0].lines)+'</details><div class="plan-scroll280 plan-preview280"><table><thead><tr><th>Journal date</th><th>'+esc(primary.currency_code)+'</th>'+(kind==='amortization'?'<th>Remaining in this plan</th>':'')+'</tr></thead><tbody>'+items.map(o=>{const l=o.lines.find(l=>l.account_id===id),amount=l.credit||l.debit;remaining=M.round(remaining-amount);return '<tr><td>'+esc(formatAppDate(o.date))+'</td><td>'+esc(money(amount))+'</td>'+(kind==='amortization'?'<td>'+esc(money(remaining))+'</td>':'')+'</tr>';}).join('')+'</tbody></table></div><p class="plan-note280">'+items.length+' occurrences'+(kind==='amortization'?' · '+money(total)+' '+esc(primary.currency_code)+' to release. Posting checks the recorded prepaid balance; unused value carries into the next year.':' · Each journal requires your approval.')+'</p>';
   d.querySelector('[data-save]').disabled=false;d.querySelector('[data-status]').textContent='Review the dates and amounts before saving.';
  }catch(e){d.querySelector('[data-status]').textContent=e.message;}};
 f.onsubmit=async e=>{e.preventDefault();if(saving||!reviewed)return;const definition=build();if(JSON.stringify(definition)!==JSON.stringify(reviewed.definition))return;const existing=JSON.parse(localStorage.getItem(saveKey())||'null');if(existing&&(existing.id!==uuid||JSON.stringify(existing.definition)!==JSON.stringify(definition))){d.querySelector('[data-status]').textContent='A previous plan save is unconfirmed. Check its recovery notice in Upcoming before creating another.';return;}
  saving=true;const end=window.actionFeedback14296?.begin(d.querySelector('[data-save]'),'Saving plan…');const controls=[...f.querySelectorAll('input,select,button')].map(n=>[n,n.disabled]);controls.forEach(([n])=>n.disabled=true);let confirmed=false;
  try{c.check();const job={id:uuid,definition,owner:c.owner};localStorage.setItem(saveKey(),JSON.stringify(job));if(localStorage.getItem(saveKey())!==JSON.stringify(job))throw Error('The save request could not be retained.');const result=await rpc('save_journal_plan280',{p_id:uuid,p_definition:definition},c);if(!result?.saved||result.id!==uuid)throw Error('Save confirmation was incomplete. Retry uses the same reference.');confirmed=true;localStorage.removeItem(saveKey());if(!purchase&&!JournalModule.editingEntryId&&JSON.stringify(capture())===rawBefore){clearJournalEntry();window.drafts1427?.flush();}saving=false;close();await load(true);switchTab('transactions-recurring');window.workspace14337?.showSection(kind);showCenterStatus('Plan saved · '+reviewed.items.length+' prepared occurrences.');
  }catch(error){if(!confirmed&&c.owner===actor()&&typeof error.code==='string'&&/^(22|23|42|P0001|PGRST20[024])/.test(error.code))localStorage.removeItem(saveKey());if(c.owner===actor())d.querySelector('[data-status]').textContent=(confirmed?'Plan saved; refresh Upcoming. ':'Plan save unconfirmed. Your request is retained; retry safely. ')+error.message;}
  finally{saving=false;controls.forEach(([n,disabled])=>{if(n.isConnected)n.disabled=disabled;});end?.();}
 };
 window.dropdown1434?.enhance(f);
 }catch(e){fail(e);}}
function canViewPlans(){return admin()&&!!window.access113?.can('transactions-recurring')&&!window.workspaceRequest138?.target;}
function host(kind){const id=kind==='amortization'?'amortizationPlans280':'recurringPlans280';let h=$(id);if(!h){h=document.createElement('section');h.id=id;h.className='je-card plan-list280';$('transactions-recurring')?.append(h);}return h;}
function next(p){return p.occurrences.find(o=>o.status==='pending');}
function actionButton(label,action,extra=''){return '<button type="button" class="je-btn je-btn-secondary" data-plan-action="'+action+'" '+extra+'>'+label+'</button>';}
function render(){for(const kind of ['recurring','amortization']){const h=host(kind);h.hidden=!canViewPlans();if(h.hidden)continue;const rows=state.owner===actor()&&state.client===ojmDb?state.rows.filter(p=>p.kind===kind).sort((a,b)=>a.title.localeCompare(b.title)):[];
 const opened=new Set([...h.querySelectorAll('details[open][data-plan]')].map(n=>n.dataset.plan));
 const priorSchedules=kind==='amortization'?$('legacyAmortization280'):null;
 h.innerHTML='<div class="je-card-header"><div><h3>'+(kind==='amortization'?'Amortization':'Recurring journals')+'</h3><p>'+(kind==='amortization'?rows.length+' plans · First day of each month · AMO journal numbers':'Scheduled journals · REC journal numbers')+'</p></div><div>'+actionButton('Refresh','refresh')+actionButton('From Post Entry','new','data-kind="'+kind+'"')+'</div></div>'+(state.error?'<p role="alert">'+esc(state.error)+'</p>':'')+(!state.loaded&&!state.error?'<p>Open Upcoming to load your plans.</p>':'')+rows.map(p=>{const due=next(p),posted=p.occurrences.filter(o=>o.status==='posted').length,errors=p.occurrences.some(o=>o.status==='posted'&&o.entry_status!=='posted');return '<details class="plan-item306" data-plan="'+esc(p.id)+'" '+(opened.has(p.id)?'open':'')+'><summary><strong>'+esc(p.title)+'</strong><span>'+esc(p.status)+(due&&p.status==='active'?' · Awaiting your posting':'')+'</span><span>'+(due?esc(formatAppDate(due.due_date)):'Ended')+'</span><span>'+posted+'/'+p.occurrences.length+' posted</span></summary><div class="plan-content280"><p>'+esc(p.memo)+'</p>'+(p.blocking_reason||p.last_error?'<p role="status">'+esc(p.blocking_reason||p.last_error)+'</p>':'')+(errors?'<p role="alert">A linked posting was voided. It will not be automatically posted again; review the remaining balance.</p>':'')+(due?lineTable(due.lines):'')+'<div class="plan-actions280">'+(due&&p.status==='active'?actionButton('Open prepared journal','prepare')+(kind==='amortization'&&window.access113?.can('transactions-recurring','post')&&window.access113?.can('journal','post')?actionButton('Post to Active Journal','post', 'data-occurrence="'+esc(due.occurrence_no)+'" data-date="'+esc(due.due_date)+'" '+(posting||p.blocking_reason||due.due_date>day()||errors?'disabled':'')):''):'')+(!['complete','stopped'].includes(p.status)?actionButton(p.status==='paused'?'Resume':'Pause',p.status==='paused'?'resume':'pause')+actionButton('Stop future entries','stop'):'')+(due&&p.kind==='recurring'?actionButton('Reschedule next','reschedule')+actionButton('Skip next','skip'):'')+'</div><details><summary>All dates and posting history</summary><div class="plan-scroll280"><table><thead><tr><th>Journal date</th><th>Status</th><th>Entry ID</th></tr></thead><tbody>'+p.occurrences.map(o=>'<tr><td>'+esc(formatAppDate(o.due_date))+'</td><td>'+esc(o.entry_status&&o.entry_status!=='posted'?o.entry_status:o.status)+'</td><td>'+(o.entry_no?actionButton(esc(o.entry_no),'view','data-entry="'+esc(o.entry_no)+'"'):'—')+'</td></tr>').join('')+'</tbody></table></div></details></div></details>';}).join('')+(state.loaded&&!rows.length?'<p class="plan-empty298">No '+(kind==='amortization'?'amortization plans':'recurring journals')+' yet. Prepare the accounts in Post Entry, then choose Save as.</p>':'');
 if(priorSchedules)h.append(priorSchedules);
 h.onclick=e=>{const b=e.target.closest('[data-plan-action]');if(!b)return;const action=b.dataset.planAction,p=state.rows.find(p=>p.id===b.closest('[data-plan]')?.dataset.plan);if(action==='refresh'){void load(true);if(kind==='amortization')void window.loadSchedules91?.(true);}else if(action==='new'){switchTab('journal');showJournalEntry98();showCenterStatus('Prepare the journal or use Generate, then choose Save as → '+(kind==='amortization'?'Amortization':'Recurring transaction')+'.');}else if(action==='view'){switchTab('journal');loadEntryForEdit(b.dataset.entry);}else if(action==='post')void postAmortization(p,b);else if(action==='prepare')void prepare(p);else void act(p,action);};
 }recovery();window.workspace14337?.upcomingTabs();window.refreshNotices1443?.();}
async function load(force=false){
 if(!ojmDb||!canViewPlans())return false;
 const c=context();
 if(state.owner!==c.owner||state.client!==c.client)state={owner:c.owner,client:c.client,rows:[],loaded:false,error:''};
 if(state.loaded&&!force)return true;
 if(flight?.owner===c.owner&&flight.client===c.client)return flight.promise;
 const task={owner:c.owner,client:c.client};
 flight=task;
 task.promise=(async()=>{
  try{
   c.check();
   // This read can use the signed-in administrator's encrypted device copy.
   // Plan changes and posting still go through the online-only rpc helper.
   const result=await c.client.rpc('list_journal_plans280',{});
   c.check();
   if(!canViewPlans())return false;
   if(result.error)throw result.error;
   if(!Array.isArray(result.data))throw Error('Plan list was incomplete.');
   state.rows=result.data;state.loaded=true;state.error='';
   return true;
  }catch(e){
   if(actor()===c.owner&&ojmDb===c.client)state.error='Plans could not load: '+e.message;
   return false;
  }finally{
   if(flight===task)flight=null;
   if(actor()===c.owner&&ojmDb===c.client){render();window.renderSchedules14364?.();}
  }
 })();
 return task.promise;
}
function recovery(){let n=$('planSaveRecovery280');const value=actor()&&localStorage.getItem(saveKey());if(!value){n?.remove();return;}if(!n){n=document.createElement('section');n.id='planSaveRecovery280';n.className='je-card';$('transactions-recurring')?.prepend(n);}n.replaceChildren();const p=document.createElement('p');p.textContent='A plan save needs confirmation. The original save reference and prepared journal are retained.';n.append(p);const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';b.textContent='Check / retry saved plan';b.onclick=async()=>{try{allowed();const job=JSON.parse(value),c=context();if(job.owner!==c.owner)throw Error('This request belongs to another account.');b.disabled=true;const r=await rpc('save_journal_plan280',{p_id:job.id,p_definition:job.definition},c);if(!r?.saved||r.id!==job.id)throw Error('Incomplete save confirmation.');localStorage.removeItem(saveKey());await load(true);showCenterStatus('Plan save confirmed.');}catch(e){fail(e);}finally{b.disabled=false;}};n.append(b);}
async function act(p,action){try{allowed();if(!p)throw Error('Refresh Upcoming first.');const c=context(),o=next(p);let date=null;if(action==='reschedule'){const d=modal('Reschedule next occurrence','<form><label>Journal date<input type="date" name="date" required value="'+esc(o.due_date)+'"></label><p role="status"></p><footer><button class="je-btn je-btn-emerald" type="submit">Save new date</button></footer></form>');d.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=d.querySelector('[type=submit]');b.disabled=true;try{await rpc('journal_plan_action280',{p_id:p.id,p_version:p.version,p_action:action,p_occurrence:o.occurrence_no,p_date:d.querySelector('input').value},c);close();await load(true);}catch(e){d.querySelector('[role=status]').textContent=e.message;}finally{b.disabled=false;}};return;}
 if(['stop','skip'].includes(action)&&!await ui117.confirm(action==='stop'?'Stop all future entries for “'+p.title+'”? Posted journals remain.':'Skip this occurrence? No journal will be posted for it.'))return;c.check();await rpc('journal_plan_action280',{p_id:p.id,p_version:p.version,p_action:action,p_occurrence:o?.occurrence_no||null,p_date:date},c);await load(true);
 }catch(e){fail(e);}}
function fill(value){window.entry1430?.setMode('double');$('jeLinesBody').replaceChildren();if($('jeMultipleDates')?.checked)setJournalDateMode(false,true);$('jeTransDate').value=value.date;$('jeGeneralMemo').value=value.memo;
 for(const l of value.lines){const a=chart().find(a=>a.id===l.account_id);if(!a)throw Error('A prepared account is missing. Refresh accounts first.');addJournalLineRow(a.code+' — '+a.name,l.description,l.debit?String(l.debit):'',{[l.currency_code]:l.credit?String(l.credit):''});const r=$('jeLinesBody').lastElementChild;r.dataset.fxRate14383=l.fx_rate_lak;r.dataset.bookRate14383=l.book_rate_lak;const date=r.querySelector('.je-line-date');if(date)date.value=value.date;}
 JournalFX14383.restore(Object.fromEntries(value.lines.map(l=>[l.currency_code,l.fx_rate_lak])));calculateJournalBalance();$('jeGeneralMemo').dispatchEvent(new Event('input',{bubbles:true}));window.dispatchEvent(new Event('save-state14234'));window.drafts1427?.flush();}
async function prepare(plan){try{allowed();const c=context();
 // Opening an editor is a local read. Use the plan the user selected and
 // join an explicit refresh already in progress. Posting validates the occurrence on the server.
 if(!await (flight?.owner===c.owner&&flight.client===c.client?flight.promise:load()))throw Error(state.error||'Refresh Upcoming before opening the journal.');
 c.check();const p=state.rows.find(x=>x.id===plan.id),o=p&&next(p);if(!o||p.status!=='active')throw Error('No active occurrence is ready.');
 if(JournalModule.editingEntryId||window.DriveDrafts143128?.preparedCount||window.DriveDrafts143128?.editing||pendingWorkspacePostJournalId||pendingWorkspacePostOwnerId)throw Error('Finish the open journal or submitted entries first.');const old=pending();if(old&&old.id!==p.id||!old&&capture().lines.some(l=>l.account_id||l.debit||l.credit))throw Error('Finish or reset your current Post Entry draft before opening this prepared journal.');
 const value={id:p.id,occurrence:o.occurrence_no,date:o.due_date,memo:p.memo,kind:p.kind,title:p.title,lines:o.lines,owner:c.owner};remember(value);fill(value);switchTab('journal');showJournalEntry98();banner();
 }catch(e){fail(e);}}
function banner(){const old=$('preparedPlan280');let p;try{p=pending();}catch(e){fail(e);return;}if(!p||p.owner!==actor()){old?.remove();return;}let n=old;if(!n){n=document.createElement('div');n.id='preparedPlan280';n.className='plan-prepared280';$('jeLinesBody')?.closest('.table-container')?.before(n);}n.replaceChildren();const s=document.createElement('span');s.textContent=p.title+' · '+formatAppDate(p.date)+' · '+(p.kind==='amortization'?'Awaiting your posting':'Review this occurrence before posting');n.append(s);
 const restore=document.createElement('button');restore.type='button';restore.className='je-btn je-btn-secondary';restore.textContent='Restore prepared fields';restore.onclick=async()=>{if(await ui117.confirm('Restore this occurrence’s prepared accounts, amounts and memos?')){try{allowed();fill(p);}catch(e){fail(e);}}};n.append(restore);
 const cancel=document.createElement('button');cancel.type='button';cancel.className='je-btn je-btn-secondary';cancel.textContent='Close preparation';cancel.onclick=async()=>{if(posting)return;if(await ui117.confirm('Close this prepared journal? Its schedule remains in Upcoming.')){clearJournalEntry();remember(null);banner();}};n.append(cancel);}
async function postOccurrence(id,occurrence,date,lines,memo,c){
 const r=await rpc('post_journal_plan280',{p_id:id,p_occurrence:occurrence,p_expected_date:date,p_lines:lines,p_memo:memo},c);
 if(!r?.entry_id||!r.entry_no)throw Error('Posting confirmation was incomplete. Retry uses the same occurrence.');
 return r;
}
async function postAmortization(plan,button){
 if(posting||button.disabled)return;
 const c=context(),o=next(plan);
 if(plan.kind!=='amortization'||plan.status!=='active'||!o||String(o.occurrence_no)!==button.dataset.occurrence||o.due_date!==button.dataset.date)return;
 let receipt;
 try{
  allowed('post');c.check();posting=true;button.disabled=true;button.textContent='Posting…';
  receipt=await postOccurrence(plan.id,o.occurrence_no,o.due_date,null,null,c);
  Object.assign(o,{status:'posted',entry_status:'posted',entry_no:receipt.entry_no,journal_entry_id:receipt.entry_id});
  if(flight)await flight.promise;
  c.check();
  const refresh=()=>Promise.all([load(true),loadJournalFromSupabase()]);
  const [loaded]=await (window.offline14239?.freshReads?offline14239.freshReads(refresh):refresh());c.check();
  if(!loaded)throw Error('Plan list refresh failed.');
  showCenterStatus('Posted '+receipt.entry_no+' · '+plan.title+' · '+formatAppDate(o.due_date));
 }catch(error){if(actor()===c.owner&&ojmDb===c.client)fail(receipt?Error('Posted '+receipt.entry_no+'. Refresh Upcoming to see the latest list.'):error);}
 finally{posting=false;if(actor()===c.owner&&ojmDb===c.client)render();}
}
async function submitPrepared(){if(posting)return;const p=pending();if(!p)return;let end;try{allowed('post');const c=context();if(p.owner!==actor()||JournalModule.editingEntryId||window.personalJournal1437?.active||pendingWorkspacePostJournalId||pendingWorkspacePostOwnerId)throw Error('Reopen the prepared journal in the company workspace.');const entered=capture();if(!entered.memo)throw Error('Enter the general description.');if(entered.date!==p.date||$('jeMultipleDates')?.checked)throw Error('Use the prepared journal date. Reschedule recurring entries in Upcoming.');const lines=M.prepare(entered.lines,chart(),p.kind);if(p.kind==='amortization'&&(JSON.stringify(lines)!==JSON.stringify(M.prepare(p.lines,chart(),p.kind))||entered.memo!==p.memo))throw Error('The approved amortization was changed. Use Restore prepared fields, or stop the plan and save a reviewed replacement.');
 posting=true;if(p.kind==='recurring')await window.AccountRates143186?.checkReview(entered.lines.map(l=>({...l,currency:l.currency_code,posting_date:p.date})),chart(),null);if(JSON.stringify(capture())!==JSON.stringify(entered))throw Error('The journal changed during its rate check. Review it again.');end=window.actionFeedback14296?.begin($('btnPostJournal'),'Posting prepared journal…');const fingerprint=JSON.stringify(entered);const result=await postOccurrence(p.id,p.occurrence,p.date,p.kind==='amortization'?null:lines,p.kind==='amortization'?null:entered.memo,c);
 if(JSON.stringify(capture())===fingerprint){clearJournalEntry();remember(null);banner();}else throw Error('Posted '+result.entry_no+'. Your draft changed while posting; close the preparation after reviewing it. The same occurrence cannot post twice.');
 await load(true);await loadJournalFromSupabase();showCenterStatus('Posted '+result.entry_no+' · '+formatAppDate(p.date));
 }catch(e){fail(e);}finally{posting=false;end?.();}}
function notices(){
 if(!canViewPlans()||state.owner!==actor()||state.client!==ojmDb)return [];
 return state.rows.flatMap(p=>{const o=next(p);if(!o||p.status!=='active')return [];
  const limit=new Date(day()+'T12:00:00Z');limit.setUTCDate(limit.getUTCDate()+Number(p.definition.reminder_days||0));
  if(o.due_date>limit.toISOString().slice(0,10)&&!p.last_error)return [];
  const warning=p.blocking_reason||p.last_error;
  return [{noticeId:'plan280:'+p.id+':'+o.occurrence_no+':'+p.version,planId280:p.id,groupKey:'plan280:'+p.id,type:p.kind==='amortization'?'Amortization · awaiting posting':'Recurring journal',title:p.title,detail:formatAppDate(o.due_date)+' · '+(warning||'Review and post when ready'),critical:!!warning&&!warning.startsWith('Waiting for'),target:'transactions-recurring'}];
 });
}
async function open(id){
 const c=context();c.check();
 // Show the destination immediately, and navigate only once. Cached reads do not rebuild it.
 switchTab('transactions-recurring');
 if(!await load()){fail(Error(state.error||'Plans could not load.'));return false;}
 c.check();const p=state.rows.find(p=>p.id===id);if(!p){fail(Error('Plan unavailable. Refresh Upcoming.'));return false;}
 if(!$('transactions-recurring')?.classList.contains('active'))return false;
 window.workspace14337?.showSection(p.kind);
 const node=[...document.querySelectorAll('[data-plan]')].find(n=>n.dataset.plan===id);
 if(node){node.open=true;node.scrollIntoView({block:'center'});return true;}return false;
}
function ready(){
 const create=[...document.querySelectorAll('#journalEntry98 .je-header-actions button')].find(b=>b.getAttribute('onclick')==='createTemplateFromCurrent()');if(create){create.textContent='Save as';create.removeAttribute('onclick');create.onclick=showSaveAs;}
 const submit=window.submitJournalEntry;window.submitJournalEntry=function(...args){try{if(pending())return submitPrepared();}catch(e){fail(e);return;}return submit.apply(this,args);};
 const switching=window.switchTab;window.switchTab=function(id,...args){const value=switching.call(this,id,...args);if(id==='transactions-recurring')void load();if(id==='journal')banner();return value;};
 const status=()=>{if(state.owner&&state.owner!==actor()){state={owner:'',client:null,rows:[],loaded:false,error:''};close();render();}if(!actor()||window.deviceVault14334&&!deviceVault14334.unlocked){close();$('preparedPlan280')?.remove();}else banner();};
 for(const event of ['session-online14333','page113'])window.addEventListener(event,()=>{status();if(admin()&&($('transactions-recurring')?.classList.contains('active')||event==='session-online14333'))void load();});
 if($('loginGate'))new MutationObserver(status).observe($('loginGate'),{attributes:true,attributeFilter:['class']});
 window.addEventListener('period-finished280',()=>{if(admin())void (async()=>{const c=context();await load(true);c.check();await loadJournalFromSupabase();})().catch(fail);});
 render();banner();if(admin())void load();
}
window.UpcomingPlans280={replacesSchedule:no=>state.owner===actor()&&state.client===ojmDb&&state.rows.some(p=>(p.definition.replaces_schedules||[]).includes(no)),saveAs:showSaveAs,openSave,load,open,prepare,notices,capture,render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(ready,0),{once:true});else setTimeout(ready,0);
})();
