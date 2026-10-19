/* Owner-authorized operational reset on 2026-10-19. No effect on other installations. */
(()=>{'use strict';
const enabled=()=>{try{return new URL(window.OJM_SUPABASE_URL).hostname==='nhjsesfhapnjtwlxvirm.supabase.co'}catch{return false}};
const suffix=()=>enabled()?':reset-20261019':'';
const cutoff=Date.parse('2026-10-19T05:15:27.267Z');
function keepJob(j){return !enabled()||j.kind!=='runs'||Date.parse(j.created||j.row?.created_at||'')>cutoff}
function drafts(data){
 if(!enabled()||data.reset143108==='20261019')return data;
 for(const name of ['run','journal','workspace','payrollUI'])delete data[name];
 for(const [key,form] of Object.entries(data.forms||{}))if(/^(journal|payroll-entries|payroll-deductions|hr-attendance|sub-users-workspace|tax-)/.test(form.panel||key))delete data.forms[key];
 data.reset143108='20261019';return data;
}
window.accountingReset143108={enabled,suffix,keepJob,drafts};
})();
