/* One popup for read-only report periods. Posting and payroll-run dates stay single-valued. */
(()=>{'use strict';const P=window.summaryPeriod14331;
function selection(s){if(s.selectedMonths14331?.length)return P.clean(s.selectedMonths14331);if(s.allMonths14331)return [];if(s.mode==='monthly')return [s.month];if(s.mode==='quarterly')return P.yearMonths(Number(s.year)).slice((Number(s.quarter)-1)*3,Number(s.quarter)*3);if(s.mode==='yearly')return P.yearMonths(Number(s.year));return []}
function caption(s){return s.allMonths14331?'All months':s.selectedMonths14331?.length?P.label(s.selectedMonths14331):s.mode==='custom'?formatAppDate(s.from)+' – '+formatAppDate(s.to):P.label(selection(s))}
function markup(){return '<label class="filter-period81 shared-period14331">Period<button type="button" class="oj-date-button104" aria-haspopup="dialog" aria-expanded="false" onclick="periodFilters14331.open(this)"><span aria-hidden="true">▦</span><span>'+escapeHtml(caption(Reports79))+'</span></button></label>'}
let selectionEpoch=0;
async function apply(values,meta){const epoch=++selectionEpoch,owner=liveProfile?.id,current=()=>epoch===selectionEpoch&&liveProfile?.id===owner;const list=P.clean(values),s=Reports79,previous={...s};s.selectedMonths14331=null;s.allMonths14331=false;
 if(meta.mode==='custom'){s.mode='custom';s.from=meta.from;s.to=meta.to;}
 else if(!list.length){const dates=(JournalModule.entries||[]).filter(l=>(!l.status||l.status==='posted')&&!l.voided_at).map(l=>String(l.date||'').slice(0,10)).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();s.mode='custom';s.allMonths14331=true;s.from=dates[0]||P.current()+'-01';s.to=dates.at(-1)||P.end(P.current());}
 else{s.month=list[0];s.year=Number(list[0].slice(0,4));s.quarter=Math.ceil(Number(list[0].slice(5,7))/3);s.from=list[0]+'-01';s.to=P.end(list.at(-1));s.mode=meta.mode==='quarterly'?'quarterly':meta.mode==='yearly'?'yearly':list.length===1?'monthly':'custom';if(meta.mode==='monthly'&&list.length>1)s.selectedMonths14331=list;}
 const end=window.actionFeedback14296?.begin(document.activeElement,'Loading selected period…');await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));try{if(!current())return;await window.yearWindow14333?.ensure(s.allMonths14331?'1900-01-01':s.from,s.to);if(!current())return;if(s.allMonths14331){const dates=JournalModule.entries.map(l=>l.date).sort();s.from=dates[0]||s.from;s.to=dates.at(-1)||s.to;}renderReports79()}catch(e){if(!current())return;Object.assign(s,previous);renderReports79();showCenterStatus('The requested period could not load: '+e.message,true)}finally{end?.()}
}
function open(button){const s=Reports79;P.open(button,selection(s),apply,{mode:s.selectedMonths14331?.length?'monthly':s.allMonths14331?'monthly':s.mode,from:s.from,to:s.to,custom:true})}
window.periodFilters14331={selection,caption,markup,apply,open};
// Compare selected months as complete independent periods. Never add balance snapshots.
const model=window.reportModel79;window.reportModel79=function(kind,...args){
 const selected=Reports79.selectedMonths14331,old={...Reports79};if(kind==='bs')return model.call(this,kind,...args);
 let periods;
 if(selected?.length)periods=selected.map(month=>({mode:'monthly',month,year:Number(month.slice(0,4)),from:month+'-01',to:P.end(month),label:P.monthLabel(month),prefix:'Selected month: '}));
 else{
  const first=Number(String(old.from||'').slice(0,4)),last=Number(String(old.to||'').slice(0,4));
  if(!Number.isInteger(first)||!Number.isInteger(last)||first<1900||last>9999||first>=last)return model.call(this,kind,...args);
  // The ledger resets at each accounting year's saved opening. Keep each year
  // separate so earlier activity is included without summing carryforwards twice.
  periods=Array.from({length:last-first+1},(_,i)=>{const year=first+i;return {mode:'custom',year,from:year===first?old.from:year+'-01-01',to:year===last?old.to:year+'-12-31',label:String(year),prefix:'Accounting year: '}});
  const sort=window.reportSort143153?.(kind);if(['gl','activity'].includes(kind)&&sort?.by==='date'&&sort.direction==='desc')periods.reverse();
 }
 try{return periods.flatMap(({label,prefix,...period})=>{Object.assign(Reports79,period,{selectedMonths14331:null,allMonths14331:false});return model.call(this,kind,...args).map(g=>({...g,periodLabel:label,note:prefix+label+'. '+g.note}))})}finally{Object.assign(Reports79,old)}
};
})();
