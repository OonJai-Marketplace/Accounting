/* Focused v142.2 presentation and post-reset browser-cache repair. */
(function(){'use strict';
window.readQuoteStyle1422=function(f){const n=(key,min,max,fallback)=>{const value=Number(f.elements[key]?.value);return Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback};return {quoteFont:f.elements.quoteFont117.value,quoteColor:f.elements.quoteColor117.value,quoteAngle:n('quoteAngle117',-30,30,-12),quoteX:n('quoteX117',0,90,68),quoteY:n('quoteY117',0,85,52),quoteSize:n('quoteSize1422',12,44,27),quoteOutlineColor:f.elements.quoteOutlineColor1422.value,quoteOutlineWidth:n('quoteOutlineWidth1422',0,3,0),quoteShadowColor:f.elements.quoteShadowColor1422.value,quoteShadowBlur:n('quoteShadowBlur1422',0,12,0),quoteShadowOffset:n('quoteShadowOffset1422',0,6,0)};};
function stamp(value){const s=String(value||'');if(/^\d{4}-\d{2}-\d{2}/.test(s))return Date.parse(s);const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m)return Date.parse(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);return Date.parse(s);}
let checking=null;
async function cleanResetCache(){
 if(!ojmDb||liveProfile?.role!=='admin')return;if(checking)return checking;
 checking=(async()=>{const user=liveProfile.id;const response=await ojmDb.from('backup_audit113').select('created_at').eq('kind','operational_reset142').order('created_at',{ascending:false}).limit(1);if(response.error||liveProfile?.id!==user)return;const reset=stamp(response.data?.[0]?.created_at);if(!Number.isFinite(reset))return;
 const old=record=>{const time=stamp(record.timestamp||record.createdAt||record.created_at);return !Number.isFinite(time)||time<=reset;};
 JournalModule.voidedEntries=(JournalModule.voidedEntries||[]).filter(r=>!old(r));
 try{const saved=JSON.parse(localStorage.getItem('ojm_period_review_v1')||'{}');if(Array.isArray(saved.findings)){saved.findings=saved.findings.filter(r=>!old(r));localStorage.setItem('ojm_period_review_v1',JSON.stringify(saved));}PeriodReview.findings=(PeriodReview.findings||[]).filter(r=>!old(r));}catch(_){}
 })().finally(()=>{checking=null});return checking;
}
const previous=window.loadTransactionAudit;
window.loadTransactionAudit=async function(...args){await cleanResetCache();return previous.apply(this,args)};
})();
