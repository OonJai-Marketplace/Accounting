import {canonical,parts,key} from './core.mjs';
export const formulaValue=v=>v&&typeof v==='object'&&v.formula?v.formula:v;
export const formulaExpected=v=>v&&typeof v==='object'&&v.formula?v.cache:v;
const f=(formula,cache)=>({formula:'='+formula,cache:cache??''});
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const q=s=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)?s:"'"+s.replaceAll("'","''")+"'";
const n=v=>Number(v)||0;
const value=v=>v??'';
// Large source text is split losslessly into adjacent continuation columns.
export function safeViews(views){const out={};for(const [title,rows]of Object.entries(views)){const extra=new Map();for(const row of rows.slice(1))row.forEach((v,c)=>{if(typeof v==='string'&&v.length>28000)extra.set(c,Math.max(extra.get(c)||1,parts(v).length));});if(!extra.size){out[title]=rows.map(r=>r.slice());continue;}const heads=rows[0].slice(),offsets=new Map();for(const [c,count]of extra){offsets.set(c,heads.length);for(let i=1;i<count;i++)heads.push(rows[0][c]+' · part '+(i+1));}out[title]=[heads,...rows.slice(1).map(row=>{const r=Array.from({length:heads.length},(_,i)=>row[i]??'');for(const [c,count]of extra){const a=parts(String(row[c]??''));r[c]=a[0]||'';for(let i=1;i<count;i++)r[offsets.get(c)+i-1]=a[i]||'';}return r;})];}return out;}
function ruleCode(c){const d=c.description||'';if(!d.startsWith('Hourly percentage bands after five-minute grace:'))return 'saved';if(c.penaltyWaived)return 'time-only';if(d.includes('Employee-specific penalty lookup'))return 'time+special';if(d.includes('Also add deductible minutes'))return 'time+band20';return d.includes('30/40/60/80/90/100%')?'band30':'band20';}
function band(m,h,code){if(!m)return 0;if(code==='time+special')return h*(m>60?Math.ceil(m/60)*1.1:m<=5?.2:m<=10?.4:m<=20?.5:m<=30?.7:m<=40?.8:m<=50?.9:1.1);return h*(m>60?m/60:code==='band30'?(m<=5?.3:m<=10?.4:m<=20?.6:m<=30?.8:m<=40?.9:1):(m<=5?.2:m<=10?.3:m<=20?.5:m<=30?.7:m<=40?.8:1));}
function hrViews(t,out){
 const staff=new Map((t.payroll_employees||[]).map(e=>[e.id,e])),runs=new Map((t.payroll_runs||[]).map(r=>[r.id,r]));
 const attendance=[['Run UUID','Month','Employee UUID','Employee','Date','Mark','Late minutes','Deductible minutes','Time deduction LAK','Penalty LAK','Fixed deduction LAK','Manual deduction LAK','Total deduction LAK','Leave type','Leave linked','Days lost','Days paid','Notes','Source','Absence deduction LAK','Hourly rate LAK','Calculation rule','Calculated time LAK','Calculated penalty LAK','Time difference LAK','Penalty difference LAK']];
 const rules=[['Run UUID','Month','Employee UUID','Employee','Source','Rule description','Hourly rate LAK','Saved attendance total LAK','Saved internal total LAK','Source hourly formula','Source deduction formula','Saved period settings']];
 for(const run of runs.values()){const d=run.data||{},inputs=new Map((d.rows||[]).map(r=>[r.employeeId,r]));for(const x of d.results||[]){const emp=staff.get(x.employeeId),h=emp?.data?.historicalPayroll200?.find(h=>h.month===d.month&&h.calculation?.source===d.historicalImport199?.file),valid=h&&Math.abs(n(h.calculation.internalTotal)-(n(x.late)+n(x.absence)+n(x.penalty)+n(x.other)))<=.01;
  const overrides=new Map((valid?h.attendanceOverrides||[]:[]).map(a=>[a.date,a]));const days=valid&&h.attendance?h.attendance:(x.attendance95||inputs.get(x.employeeId)?.input?.attendance||[]).map(a=>valid?{...a,time:0,penalty:0,fixed:0,lostDays:0,manual:null,amount:0,note:a.note||a.sourceNote||'',...overrides.get(a.date)}:a);
  const name=x.employee?.name||emp?.data?.name||inputs.get(x.employeeId)?.employee?.name||'';
  for(const a of days){const amounts=[n(a.time),n(a.penalty),n(a.fixed),n(a.manual)];attendance.push([run.id,d.month||run.period_start?.slice(0,7),x.employeeId,name,a.date,a.mark??a.mark95??'',n(a.minutes??a.late),n(a.deductible),...amounts,amounts.reduce((s,x)=>s+x,0),a.leaveType||'',!!a.linked,n(a.lostDays),n(a.paidDays),a.note||a.sourceNote||'',d.historicalImport199?.file||'Saved payroll',valid?n(a.lostDays)*n(h.calculation.hourlyRate)*n(d.config?.hours||8):n(a.lostDays)*n(x.daily),valid?h.calculation.hourlyRate:x.hourly??'',valid?ruleCode(h.calculation):'saved']);}
  const c=valid?h.calculation:{};rules.push([run.id,d.month||'',x.employeeId,name,d.historicalImport199?.file||'Saved payroll',c.description||'Saved payroll period settings',c.hourlyRate??x.hourly??'',c.dailyTotal??'',c.internalTotal??(n(x.late)+n(x.absence)+n(x.penalty)+n(x.other)),c.hourlyFormula||'',c.bandFormula||'',canonical(d.config||{})]);
 }}
 out.Attendance=attendance;out['Payroll Rules']=rules;
 const leave=[['Leave UUID','Employee UUID','From','To','Type','Status','Days','Notes','Employee','Source','History only','Payment treatment']],seen=new Set();
 const add=(id,d,emp,historical)=>{const k=emp?.id+'|'+id;if(seen.has(k))return;seen.add(k);leave.push([id,d.employeeId||emp?.id||'',d.from||'',d.to||'',d.type||'',d.status||'',d.days??'',d.notes||'',emp?.data?.name||'',historical?(d.sources||[]).map(s=>s.file+' '+s.range).join('; '):d.reference||'',historical,d.paid||'']);};
 for(const r of t.payroll_leave_records||[])add(r.id,r.data||{},staff.get(r.data?.employeeId),false);
 for(const e of staff.values())for(const d of e.data?.leaveHistory200?.records||[])add(d.id,d,e,true);
 out.Leave=leave;
 const balance=[['Employee UUID','Employee','Source month','Entitlement start','Confirmed end','Leave type','Allowance','Used','Remaining allowance','Source available vacation','Source','Source range','Period status']];
 for(const e of staff.values()){const d=e.data||{},h=d.leaveHistory200||{};for(const s of [...h.snapshots||[],...h.closedPeriods||[]])for(const type of ['vacation','sick','personal','bereavement'])balance.push([e.id,d.name,s.sourceMonth||'',s.sourcePeriodDate||'',s.endConfirmed?s.end||'':'',type,s.allowance?.[type]??'',s.used?.[type]??'',s.allowance?.[type]!=null&&s.used?.[type]!=null?n(s.allowance[type])-n(s.used[type]):'',type==='vacation'?s.cachedVacationAvailable??'':'',s.source||'',s.sourceRange||'',s.endConfirmed?'Closed':'Historical snapshot']);}
 out['Leave Balances']=balance;
 out['HR Events']=[['Table','Record ID','Part','Saved record'],...['hr_calendar_events14306','hr_calendar_history14306','hr_calendar_settings14306'].flatMap(table=>(t[table]||[]).flatMap(r=>parts(canonical(r)).map((p,i)=>[table,key(r,table),i+1,p])))];
 out.Payroll[0].push('Month','Employer SSO LAK','Employer PIT LAK','Reimbursement LAK','Advance recovery LAK','Saved adjusted net LAK','Calculated net LAK','Net difference LAK','Calculated adjusted net LAK','Adjusted difference LAK');
 for(const r of out.Payroll.slice(1)){const run=runs.get(r[0]),x=run?.data?.results?.find(x=>x.employeeId===r[1])||{},net=x.gross!=null&&x.employeeSso!=null&&x.employeePit!=null?n(x.gross)-n(x.employeeSso)-n(x.employeePit):'',adjusted=x.net!=null?n(x.net)+n(x.reimbursement)-n(x.advance):'';r.push(run?.data?.month||run?.period_start?.slice(0,7)||'',x.employerSso??'',x.employerPit??'',x.reimbursement??'',x.advance??'',x.adjusted??'',net,net!==''&&x.net!=null?net-n(x.net):'',adjusted,adjusted!==''&&x.adjusted!=null?adjusted-n(x.adjusted):'');}
 out['Payroll Tax Summary']=[['Run UUID','Month','Employee SSO LAK','Employer SSO LAK','Total SSO LAK','Employee PIT LAK','Employer PIT LAK','Total PIT LAK'],...[...runs.values()].map(run=>{const a=run.data?.results||[],sum=k=>a.reduce((s,x)=>s+n(x[k]),0),es=sum('employeeSso'),os=sum('employerSso'),ep=sum('employeePit'),op=sum('employerPit');return[run.id,run.data?.month||'',es,os,es+os,ep,op,ep+op];})];
}
export function formulaViews(t,out){
 hrViews(t,out);out=safeViews(out);
 const entries=new Map((t.journal_entries||[]).map(e=>[e.id,e]));
 out.Journal=out.Journal.map((r,i)=>i?[...r,entries.get(r[18])?.source==='system'&&(/^YEAR-CLOSE-/.test(entries.get(r[18])?.reference||'')||/^Year-end closing /.test(entries.get(r[18])?.memo||'')),...r.slice(9,13).map(v=>v==null?'':Math.round(n(v)*100)/100),r[1].slice(0,7)]:[...r,'Year closing','Debit rounded','Credit rounded','Debit LAK rounded','Credit LAK rounded','Month']);
 const end=Math.max(2,out.Journal.length),jr=c=>`Journal!$${c}$2:$${c}$${end}`;
 for(let i=1;i<out.Journal.length;i++){const r=out.Journal[i],row=i+1;for(let c=23;c<=26;c++)r[c]=f(`IF(ISBLANK(${col(c-14)}${row}),"",ROUND(${col(c-14)}${row},2))`,r[c]);r[27]=f(`LEFT(B${row},7)`,r[27]);}
 const link=(source,row,c,cache)=>f(`IF(ISBLANK(${q(source)}!${col(c)}${row}),"",${q(source)}!${col(c)}${row})`,formulaExpected(cache));
 const journalRows=new Map(out.Journal.slice(1).map((r,i)=>[r[17],i+2]));
 for(const name of ['All Journals','Current Year Journal','Open Years Journal','General Ledger'])out[name]=out[name].map((r,i)=>i?r.map((v,c)=>link('Journal',journalRows.get(r[17]),c,v)):r);
 // Running ledger balances retain separate years and original currencies.
 const running=new Map();out['General Ledger'][0].push('Running balance currency','Running balance LAK');
 for(let i=1;i<out['General Ledger'].length;i++){const r=out['General Ledger'][i],row=i+1,k=JSON.stringify([value(formulaExpected(r[0])),value(formulaExpected(r[19])),value(formulaExpected(r[8]))]),prior=running.get(k)||{original:0,base:0,missing:false};prior.original+=n(formulaExpected(r[9]))-n(formulaExpected(r[10]));const dr=formulaExpected(r[11]),cr=formulaExpected(r[12]);if(dr===''||cr==='')prior.missing=true;else prior.base+=n(dr)-n(cr);running.set(k,prior);const criteria=`$A$2:A${row},A${row},$T$2:T${row},T${row},$I$2:I${row},I${row}`;r.push(f(`SUMIFS($J$2:J${row},${criteria})-SUMIFS($K$2:K${row},${criteria})`,prior.original),f(`IF(COUNTIFS(${criteria},$L$2:L${row},"")+COUNTIFS(${criteria},$M$2:M${row},"")>0,"",SUMIFS($L$2:L${row},${criteria})-SUMIFS($M$2:M${row},${criteria}))`,prior.missing?'':prior.base));}
 const match=(r,operating=false)=>`${jr('A')},A${r},${jr('F')},B${r},${jr('I')},E${r},${jr('D')},"posted"${operating?`,${jr('W')},FALSE`:''}`;
 const sum=(column,criteria)=>`SUMIFS(${jr(column)},${criteria})`;
 const missing=criteria=>`(COUNTIFS(${criteria},${jr('L')},"")+COUNTIFS(${criteria},${jr('M')},""))>0`;
 for(let i=1;i<out['Trial Balance'].length;i++){const r=out['Trial Balance'][i],row=i+1,criteria=match(row);for(const [c,j]of [[5,'X'],[6,'Y'],[9,'Z'],[10,'AA']])r[c]=f(c>=9?`IF(M${row},"",${sum(j,criteria)})`:sum(j,criteria),r[c]);r[7]=f(`MAX(0,ROUND(F${row}-G${row},2))`,r[7]);r[8]=f(`MAX(0,ROUND(G${row}-F${row},2))`,r[8]);r[12]=f(missing(criteria),r[12]);}
 for(let i=1;i<out['Income Statement'].length;i++){const r=out['Income Statement'][i],row=i+1,criteria=match(row,true),sign=r[3]==='REVENUE'?['Y','X','AA','Z']:['X','Y','Z','AA'];r[5]=f(`ROUND(${sum(sign[0],criteria)}-${sum(sign[1],criteria)},2)`,r[5]);r[6]=f(`IF(${missing(criteria)},"",ROUND(${sum(sign[2],criteria)}-${sum(sign[3],criteria)},2))`,r[6]);r[7]=f(`IF(${missing(criteria)},"Missing saved LAK valuation","Saved LAK valuation")`,r[7]);}
 const tb=out['Trial Balance'],tbEnd=Math.max(2,tb.length),tr=c=>`'Trial Balance'!$${c}$2:$${c}$${tbEnd}`;
 for(let i=1;i<out['Balance Sheet'].length;i++){const r=out['Balance Sheet'][i],row=i+1,index=tb.findIndex((x,j)=>j&&x[0]===r[0]&&x[1]===r[1]&&x[4]===r[4]);if(index>0){out['Balance Sheet'][i]=r.map((v,c)=>link('Trial Balance',index+1,c,v));continue;}const total=c=>`SUMIFS(${tr(c)},${tr('A')},A${row},${tr('E')},E${row},${tr('L')},FALSE,${tr('D')},"REVENUE")+SUMIFS(${tr(c)},${tr('A')},A${row},${tr('E')},E${row},${tr('L')},FALSE,${tr('D')},"EXPENSE")`,net=`(${total('G')})-(${total('F')})`,base=`(${total('K')})-(${total('J')})`;for(const c of [5,6,7,8])r[c]=f(`MAX(0,ROUND(${c%2===1?'-( '+net+' )':net},2))`,r[c]);for(const c of [9,10])r[c]=f(`IF(M${row},"",MAX(0,ROUND(${c===9?'-( '+base+' )':base},2)))`,r[c]);r[12]=f(`COUNTIFS(${tr('A')},A${row},${tr('E')},E${row},${tr('L')},FALSE,${tr('M')},TRUE,${tr('D')},"REVENUE")+COUNTIFS(${tr('A')},A${row},${tr('E')},E${row},${tr('L')},FALSE,${tr('M')},TRUE,${tr('D')},"EXPENSE")>0`,r[12]);}
 for(let i=1;i<out['Monthly Results'].length;i++){const r=out['Monthly Results'][i],row=i+1,criteria=`${jr('AB')},A${row},${jr('I')},B${row},${jr('D')},"posted",${jr('V')},FALSE,${jr('W')},FALSE`,typ=t=>criteria+`,${jr('H')},"${t}"`;for(const [c,a,b,type]of [[2,'Y','X','REVENUE'],[3,'X','Y','EXPENSE'],[4,'AA','Z','REVENUE'],[5,'Z','AA','EXPENSE']]){let calc=`ROUND(${sum(a,typ(type))}-${sum(b,typ(type))},2)`;if(c>=4)calc=`IF(G${row},"",${calc})`;r[c]=f(calc,r[c]);}r[6]=f(`OR(${missing(typ('REVENUE'))},${missing(typ('EXPENSE'))})`,r[6]);}
 for(let i=1;i<out.Payroll.length;i++){const r=out.Payroll[i],row=i+1;for(const [c,formula]of [[10,`IF(I${row}="","",I${row}+J${row})`],[14,`IF(OR(N${row}="",M${row}=""),"",ROUND(N${row}+J${row}/M${row},2))`],[21,`IF(OR(F${row}="",G${row}="",H${row}=""),"",F${row}-G${row}-H${row})`],[22,`IF(OR(V${row}="",I${row}=""),"",V${row}-I${row})`],[23,`IF(I${row}="","",I${row}+S${row}-T${row})`],[24,`IF(OR(X${row}="",U${row}=""),"",X${row}-U${row})`]])r[c]=f(formula,r[c]);}
 const pe=Math.max(2,out.Payroll.length),pr=c=>`Payroll!$${c}$2:$${c}$${pe}`;
 for(let i=1;i<out['Payroll Summary'].length;i++){const r=out['Payroll Summary'][i],row=i+1,criteria=`${pr('A')},A${row},${pr('D')},F${row}`;r[4]=f(`COUNTIFS(${criteria})`,r[4]);for(const [c,p]of [[6,'I'],[7,'J'],[8,'K'],[9,'N'],[10,'O']])r[c]=f(`IF(COUNTIFS(${criteria},${pr(p)},"")>0,"${c<9?'Not calculated':'Unavailable'}",SUMIFS(${pr(p)},${criteria}))`,r[c]);}
 for(let i=1;i<out['Payroll Tax Summary'].length;i++){const r=out['Payroll Tax Summary'][i],row=i+1;for(const [c,p]of [[2,'G'],[3,'Q'],[5,'H'],[6,'R']])r[c]=f(`SUMIF(${pr('A')},A${row},${pr(p)})`,r[c]);r[4]=f(`C${row}+D${row}`,r[4]);r[7]=f(`F${row}+G${row}`,r[7]);}
 for(let i=1;i<out.Attendance.length;i++){const r=out.Attendance[i],row=i+1;r[12]=f(`SUM(I${row}:L${row})+T${row}`,n(r[12])+n(r[19]));
 const m=n(r[7]),h=n(r[20]),code=r[21],b=band(m,h,code),time=code==='saved'?n(r[8]):code.startsWith('band')?b:m*h/60,penalty=code==='saved'?n(r[9]):code==='time+band20'||code==='time+special'?b:0;
 const base=`IF(H${row}=0,0,IF(H${row}>60,H${row}/60,IF(H${row}<=5,IF(V${row}="band30",0.3,0.2),IF(H${row}<=10,IF(V${row}="band30",0.4,0.3),IF(H${row}<=20,IF(V${row}="band30",0.6,0.5),IF(H${row}<=30,IF(V${row}="band30",0.8,0.7),IF(H${row}<=40,IF(V${row}="band30",0.9,0.8),1)))))))*U${row}`;
 const special=`IF(H${row}=0,0,IF(H${row}>60,ROUNDUP(H${row}/60,0)*1.1,LOOKUP(H${row},{1,6,11,21,31,41,51},{0.2,0.4,0.5,0.7,0.8,0.9,1.1})))*U${row}`;
 r[22]=f(`IF(V${row}="saved",I${row},IF(LEFT(V${row},4)="band",${base},H${row}*U${row}/60))`,time);
 r[23]=f(`IF(V${row}="saved",J${row},IF(V${row}="time+special",${special},IF(V${row}="time+band20",${base},0)))`,penalty);
 r[24]=f(`W${row}-I${row}`,time-n(r[8]));r[25]=f(`X${row}-J${row}`,penalty-n(r[9]));}
 for(let i=1;i<out['Leave Balances'].length;i++){const r=out['Leave Balances'][i],row=i+1;r[8]=f(`IF(OR(G${row}="",H${row}=""),"",G${row}-H${row})`,r[8]);}

 const ae=Math.max(2,out.Attendance.length),ar=c=>`Attendance!$${c}$2:$${c}$${ae}`;
 out['Payroll Rules'][0].push('Attendance total LAK','Attendance difference LAK');
 for(let i=1;i<out['Payroll Rules'].length;i++){const r=out['Payroll Rules'][i],row=i+1,total=out.Attendance.slice(1).filter(a=>a[0]===r[0]&&a[2]===r[2]).reduce((s,a)=>s+n(formulaExpected(a[12])),0);r.push(f(`SUMIFS(${ar('M')},${ar('A')},A${row},${ar('C')},C${row})`,total),f(`IF(H${row}="","",M${row}-H${row})`,r[7]===''?'':total-n(r[7])));}
 const se=Math.max(2,out['Sub-user Activity'].length),sr=c=>`'Sub-user Activity'!$${c}$2:$${c}$${se}`;
 for(let i=1;i<out['Sub-user Activity'].length;i++){const r=out['Sub-user Activity'][i],row=i+1;r[8]=f(`IF(LOWER(G${row})="in",H${row},-H${row})`,r[8]);}
 for(let i=1;i<out['Fund Summary'].length;i++){const r=out['Fund Summary'][i],row=i+1;for(const [c,dir]of [[4,'in'],[5,'out']])r[c]=f(`SUMIFS(${sr('H')},${sr('C')},A${row},${sr('E')},C${row},${sr('F')},D${row},${sr('G')},"${dir}")`,r[c]);r[6]=f(`E${row}-F${row}`,r[6]);}
 // Generated print views follow their corresponding reports instead of freezing copied totals.
 for(const [name,source]of [['Print Journal','Journal'],['Print Ledger','General Ledger'],['Print Trial Balance','Trial Balance'],['Print Profit and Loss','Income Statement'],['Print Balance Sheet','Balance Sheet'],['Print Payroll','Payroll'],['Print Tax and SSO','Tax and SSO']])out[name]=out[source].map((r,i)=>r.map((v,c)=>i?link(source,i+1,c,v):v));
 return out;
}

// Spill shared views instead of writing hundreds of thousands of duplicate references.
export function spillPlan(title,values,views){
 let source,formula,width=values[0].length;
 const printSources={'Print Journal':'Journal','Print Ledger':'General Ledger','Print Trial Balance':'Trial Balance','Print Profit and Loss':'Income Statement','Print Balance Sheet':'Balance Sheet','Print Payroll':'Payroll','Print Tax and SSO':'Tax and SSO'};
 if(title in printSources)source=printSources[title];
 if(['All Journals','Open Years Journal'].includes(title))source='Journal';
 if(values.length<2)return null;
 if(source){const range=`${q(source)}!A2:${col(width-1)}${views[source].length}`;formula=`=ARRAYFORMULA(IF(ISBLANK(${range}),"",${range}))`;}
 if(title==='Current Year Journal'){const end=views.Journal.length,range=`Journal!A2:V${end}`,year=formulaExpected(values[1][0]);formula=`=FILTER(ARRAYFORMULA(IF(ISBLANK(${range}),"",${range})),Journal!A2:A${end}=${year})`;}
 if(title==='General Ledger'){const end=views.Journal.length,range=`Journal!A2:V${end}`;width=22;formula=`=SORT(FILTER(ARRAYFORMULA(IF(ISBLANK(${range}),"",${range})),Journal!D2:D${end}="posted"),6,TRUE,2,TRUE,3,TRUE,18,TRUE)`;}
 if(!formula)return null;
 const input=values.map((r,i)=>i?r.map((v,c)=>c<width?null:v):r.slice()),readback=values.map((r,i)=>i?r.map((v,c)=>c<width?'':formulaValue(v)):r.slice());
 input[1][0]={formula,cache:formulaExpected(values[1][0])};readback[1][0]=formula;
 return {input,readback};
}
