/* Approved phone presentation, backed by the parent application's single runtime. */
(()=>{'use strict';
const A=parent.PhoneApp132,$=id=>document.getElementById(id);if(!A){document.body.textContent='Open Oon Jai from the main website.';return}
const S={module:'subusers',page:'home',user:null,search:'',month:A.previewMonth||new Date().toISOString().slice(0,7),review:'submitted',journalForm:false,editingStaff:false,editingJournal:false};let actions=[],last='',busy=false;
let lastDraft14237='';let draftOwner1427='',phoneSession14225='',phoneDrafts1427={staff:{}};
function draftKey1427(id){return 'ojm_phone_draft1427:'+String(parent.OJM_SUPABASE_URL||location.origin)+':'+id}
function ensurePhoneOwner1427(){
 const me=A.profile(),id=me?.id,session=A.session();if(!id||!A.ready())return false;if(id===draftOwner1427&&phoneSession14225===session)return true;
 draftOwner1427=id;phoneSession14225=session;document.documentElement.dataset.phoneOwner14288=session;document.documentElement.dataset.phoneReady14288='false';last='';lastDraft14237='';document.querySelectorAll('main.screen').forEach(n=>n.replaceChildren());
 try{phoneDrafts1427=JSON.parse(localStorage.getItem(draftKey1427(id)))||{staff:{}}}catch{phoneDrafts1427={staff:{}}}
 if(!phoneDrafts1427||typeof phoneDrafts1427!=='object'||Array.isArray(phoneDrafts1427))phoneDrafts1427={staff:{}};
 const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);for(const name of ['staff','ui'])if(!object(phoneDrafts1427[name]))phoneDrafts1427[name]={};for(const name of ['positions','accounts'])if(!object(phoneDrafts1427.ui[name]))phoneDrafts1427.ui[name]={};if(!object(phoneDrafts1427.location))delete phoneDrafts1427.location;if(!object(phoneDrafts1427.journal)||!object(phoneDrafts1427.journal.data))delete phoneDrafts1427.journal;for(const [id,entry]of Object.entries(phoneDrafts1427.staff))if(!object(entry)||!object(entry.data))delete phoneDrafts1427.staff[id];
 Object.assign(S,{module:'subusers',page:'home',user:me.role==='admin'||(!A.allowed('sub-users-workspace')&&A.teamHomeAllowed())?null:id,search:'',staffDraft:null,journalDraft:null,editingStaff:false,editingJournal:false,journalForm:false,pendingStaff:null,accountType14253:'',ledgerAccount14248:null,ledger14248:null});
 const saved=phoneDrafts1427.location,landing=A.landing?.();if(saved?.page==='totals')saved.page='history';if(saved?.module==='settings'&&saved.page==='access')saved.page='users';
 if(saved&&!(me.role!=='admin'&&landing?.id===id&&landing.fresh)){const before={module:S.module,page:S.page,user:S.user};for(const key of ['module','page','user','month','search','accountType14253','entryMonth14237','entryView14248','ledgerAccount14248','ledgerMode14248','ledgerMonth14248','ledgerYear14248','ledgerQuarter14248'])if(Object.hasOwn(saved,key))S[key]=saved[key];if(!pageAllowed1441())Object.assign(S,before);}
 // A restored draft can never select an owner outside the current access list.
 if(S.module==='subusers'&&S.user&&!A.users().some(u=>String(u.id)===String(S.user)))S.user=A.allowed('sub-users-workspace')?id:null;
 if(S.module==='subusers'&&me.role!=='admin'&&!S.user&&!A.teamHomeAllowed())S.user=id;
 const staff=phoneDrafts1427.staff[S.user];if(staff){S.staffDraft=staff.data;S.editingStaff=staff.editing}
 if(phoneDrafts1427.journal&&A.allowed('journal')){S.journalDraft=phoneDrafts1427.journal.data;S.editingJournal=phoneDrafts1427.journal.editing}
 return true;
}
function persistPhoneDraft1427(){if(!ensurePhoneOwner1427())return;rememberPhonePosition14285();if(S.user){if(S.staffDraft)phoneDrafts1427.staff[S.user]={data:S.staffDraft,editing:S.editingStaff};else delete phoneDrafts1427.staff[S.user]}phoneDrafts1427.journal=S.journalDraft?{data:S.journalDraft,editing:S.editingJournal}:null;phoneDrafts1427.location=Object.fromEntries(['module','page','user','month','search','accountType14253','entryMonth14237','entryView14248','ledgerAccount14248','ledgerMode14248','ledgerMonth14248','ledgerYear14248','ledgerQuarter14248'].map(k=>[k,S[k]]));try{const value=JSON.stringify(phoneDrafts1427);if(value!==lastDraft14237){localStorage.setItem(draftKey1427(draftOwner1427),value);lastDraft14237=value;}}catch{parent.showCenterStatus('Phone draft storage is unavailable. Save the entry before leaving.',true)}}
function capturePhoneDraft1427(event){
 // Staff input/change events are captured by the staff editor's own handler.
 if(['input','change'].includes(event?.type)&&event.target?.closest('#post')&&$('staffMemo'))return;
 if(draftOwner1427!==A.profile()?.id||phoneSession14225!==A.session()){ensurePhoneOwner1427();return;}if(!ensurePhoneOwner1427())return;
 const visible=n=>n&&!n.closest('main')?.classList.contains('hidden');
 if(!busy&&samePhoneLocation14285()&&visible($('staffMemo'))&&document.querySelector('#post [data-staff-single],#post [data-staff-double]'))S.staffDraft=staffData();
 if(samePhoneLocation14285()&&visible($('jLines')))S.journalDraft={date:$('jDate').value,memo:$('jMemo').value,lines:[...$('jLines').children].map(n=>({account:n.querySelector('select').value,memo:n.querySelector('[data-memo]').value,debit:n.querySelector('[data-debit]').value,credit:n.querySelector('[data-credit]').value}))};
 persistPhoneDraft1427();
}
document.addEventListener('input',capturePhoneDraft1427);document.addEventListener('change',capturePhoneDraft1427);document.addEventListener('click',capturePhoneDraft1427,true);window.addEventListener('pagehide',capturePhoneDraft1427);document.addEventListener('visibilitychange',()=>{if(document.hidden)capturePhoneDraft1427()});

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const num=x=>parent.formatAppNumber?parent.formatAppNumber(Number(x)||0):Number(x||0).toLocaleString('en-US',{maximumFractionDigits:2});const money=(x,c='LAK')=>(c==='LAK'?'₭':c==='USD'?'$':c+' ')+num(x);
const paths={home:'M3 11l9-8 9 8M5 10v11h14V10M10 21v-7h4v7',book:'M12 5C8 2 3 3 3 3v17s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2v17',wallet:'M3 5h17v16H3zM3 5V3h14v2M15 11h6v5h-6z',calendar:'M4 5h16v16H4zM4 9h16M8 2v6M16 2v6M8 13h3M8 17h6',review:'M5 4h14v17H5zM9 2h6v4H9zM8 12l3 3 5-6',shield:'M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 12l3 3 5-6',people:'M8 10a4 4 0 100-8 4 4 0 000 8M2 22v-4a6 6 0 0112 0v4M17 5a4 4 0 010 8M18 16a5 5 0 014 5',chart:'M5 21V11M12 21V3M19 21V7',plus:'M12 3v18M3 12h18',file:'M5 2h9l5 5v15H5zM14 2v5h5M8 12h8M8 16h6',box:'M3 7l9-4 9 4v11l-9 4-9-4zM3 7l9 5 9-5M12 12v10',utensils:'M5 2v8h6V2M8 2v20M19 2c-4 3-4 7-4 11h4v9V2',history:'M3 11a9 9 0 119 10M3 4v7h7M12 7v6l4 2',close:'M5 10h14v11H5zM8 10V6a4 4 0 018 0v4'};
const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[k]||paths.book}"/></svg>`;
const action=fn=>{actions.push(fn);return `data-act="${actions.length-1}"`};
const button=(text,fn,primary=false,disabled=false)=>`<button type="button" class="btn ${primary?'primary':''} ${/^←?\s*Back\b/.test(text)?'phone-back14288':''}" ${action(fn)} ${disabled?'disabled':''}>${esc(text)}</button>`;
const head=(title,description='')=>`<h1>${title}</h1><p>${description}</p>`;
const empty=text=>`<div class="card empty132">${esc(text)}</div>`;
const row=(title,subtitle,value,fn,k='wallet')=>`<button class="list phone-list132" ${action(fn)}><span class="round ${k==='utensils'?'orange':''}">${icon(k)}</span><span class="desc"><b>${esc(title)}</b><small>${esc(subtitle)}</small></span><span class="right money">${esc(value)}</span><span>›</span></button>`;
const field=(label,id,type='text',value='')=>`<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value)}"></div>`;
const options=(accounts,value)=>accounts.filter(a=>a.isPosting!==false).map(a=>`<option value="${esc(a.id||a.code)}" ${String(a.id||a.code)===String(value)?'selected':''}>${esc(a.code+' · '+a.name+' ('+a.currency+')')}</option>`).join('');
const select=(label,id,html)=>`<div class="field"><label for="${id}">${label}</label><select id="${id}">${html}</select></div>`;
