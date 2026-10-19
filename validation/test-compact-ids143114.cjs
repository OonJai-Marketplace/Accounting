const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
(async()=>{
 const date={value:'2026-01-01'},host={innerHTML:''},status={textContent:'',append(){}},button={disabled:false,isConnected:true};
 const user={id:'user-a',full_name:'Anna Able',user_permissions:{entry_prefix:'S',entry_initials:'AA'}};
 const row={dataset:{user89:user.id},querySelectorAll:()=>[{value:'S'},{value:'AA'}]};
 const calls=[];const db={async rpc(name,data){calls.push({name,data});return {data:true,error:null}}};
 const a={journalPrefix:'OJM',automatedPrefix:'AUTO',schedulePrefix:'SCH',adjustmentPrefix:'ADJ',subUserPrefix:'S',journalDigits:'4',decimalPlaces:'2'};
 const ctx={appLocalDate:()=> '2026-10-19',ApplicationSettings:{accounting:a},JournalModule:{sequence:1,entries:[]},liveProfile:{id:'admin',role:'admin'},liveProfiles:[user],ojmDb:db,
  document:{readyState:'loading',body:{},addEventListener(){},querySelector:()=>null,querySelectorAll:sel=>sel.includes('data-user89')?[row]:[],getElementById:id=>id==='prefixUsers89'?host:id==='prefixStatus89'?status:id==='jeTransDate'?date:null},
  escapeHtml:s=>String(s),subUserName:u=>u.full_name,workspaceUserInitials:()=> 'AA',loadProfilesFromSupabase:async()=>{},openUserAccessEditor(){},saveUserAccess(){},loadAccountingIdSettingsFromDatabase(){},saveSettingsGroup(){},renderTransactionReviewTable(){},MutationObserver:class{observe(){}},
  showCenterStatus:(m,error)=>{if(error)throw Error(m)},collectSettingsForm:()=>({...a}),APP_SETTINGS_KEY:'test',localStorage:{setItem(){}},setSettingsFormValues(){},updateNextEntryIdDisplay(){},ui117:{confirm:async()=>true},showAppConfirm(){throw Error('Unexpected confirm')}
 };ctx.window=ctx;vm.createContext(ctx);vm.runInContext(read('src/bookkeeping/journal/entry-sequence.js'),ctx);
 assert.equal(ctx.generateEntryId(),'OJM260001');assert.equal(ctx.formatEntryId143114('SAA',1,'2026-01-01'),'SAA260001');assert.equal(ctx.formatEntryId143114('OJM',10000,'2027-01-01'),'OJM2710000');
 ctx.JournalModule.sequence=8;ctx.syncEntrySequence();assert.equal(ctx.JournalModule.sequence,8,'empty views never reset a counter');
 vm.runInContext(read('src/shared/formatting/prefixes-badges-v89.js'),ctx);
 await ctx.loadProfilesFromSupabase();assert(!host.innerHTML.includes('onclick="savePrefixUser89'));assert(!host.innerHTML.includes('<button'));assert(host.innerHTML.includes('value="AA"'));
 assert(!read('src/shared/formatting/prefixes-badges-v89.js').includes('<th>Action</th>'));
 ctx.reloadPrefixes89=async()=>{};
 const form={dataset:{settingsGroup:'accounting'},reportValidity:()=>true,querySelector:()=>button};
 const saved=await ctx.saveSettingsGroup({currentTarget:form,preventDefault(){}});assert.equal(saved,true);
 assert.equal(calls[0].name,'save_accounting_prefixes143114');assert.equal(calls[0].data.p_settings.journal_prefix,'OJM');assert.equal(calls[0].data.p_users[0].entry_initials,'AA');assert.equal(button.disabled,false);
 // Date-sensitive preview sends the selected transaction year, not today's year.
 ctx.document.getElementById=id=>id==='jeTransDate'?date:null;ctx.document.addEventListener=()=>{};
 ctx.ojmDb.rpc=async(name,data)=>{calls.push({name,data});return {data:1,error:null}};
 vm.runInContext(read('src/bookkeeping/journal/entry-number14257.js'),ctx);
 date.value='2025-12-31';await ctx.entryNumber14257.refresh(true);assert.equal(calls.at(-1).data.p_date,'2025-12-31');assert.equal(calls.at(-1).name,'preview_journal_number143114');
 console.log('PASS compact IDs, selected year, overflow, no implicit reset, four-column sub-user form, shared atomic save, date-aware preview');
})().catch(e=>{console.error(e);process.exit(1)});
