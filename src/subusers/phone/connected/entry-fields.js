function staffDraft14225(){
 const r=A.rules(S.user),d=S.staffDraft||{},ac=A.accounts();
 const direction=r.directions.includes(d.direction)?d.direction:r.directions[0]||'out';
 if(!d.single)d.single=[{direction,source:d.fund||(r.fundIds.length===1?r.fundIds[0]:''),affected:d.account||(r.entryIds.length===1?r.entryIds[0]:''),amount:d.amount||'',memo:''}];
 d.mode||='single';if(!d.templateBlankDate14285)d.date||=new Date().toISOString().slice(0,10);d.memo||='';d.reference||='';d.requestKey||='phone-'+crypto.randomUUID();d.editIds||=[];d.lines||=[{},{}];
 if(!d.sharedDescription14249){for(const l of d.single){if(l.description&&l.description!==d.memo)l.memo=[l.description,l.memo].filter(Boolean).join(' — ');}d.sharedDescription14249=true;}S.staffDraft=d;return d;
}
function staffEntryId14289(d){return '<span class="entry-id14247 staff-entry-id14289">Entry ID: '+esc(d.entryNo||'Assigned when saved')+'</span>';}
function staffLine14225(l,i){
 const r=A.rules(S.user),ac=A.accounts(),funds=ac.filter(a=>r.fundIds.includes(String(a.id))),categories=ac.filter(a=>r.entryIds.includes(String(a.id))&&(!l.source||a.currency===ac.find(f=>String(f.id)===String(l.source))?.currency));
 const suffix=i?'_'+i:'',a=ac.find(a=>String(a.id)===String(l.source)),currency=a?.currency||'LAK',d=staffDraft14225();
 return '<section class="staff-single-line14225" data-staff-single="'+i+'"><div class="staff-line-heading14225"><b>Line '+(i+1)+'</b>'+(i?'<button type="button" class="remove-staff14225" data-remove-single="'+i+'" aria-label="Remove entry '+(i+1)+'">'+trash14225+'</button>':staffEntryId14289(d))+'</div>'+
 '<div class="grid phone-date-amount14247">'+field('Date','staffDate'+suffix,'date',l.date||d.date)+field('Amount ('+esc(currency)+')','staffAmount'+suffix,'number',l.amount||'')+'</div>'+(i===0?field('General Description','staffMemo','text',d.memo):'')+
 select('Source Account','staffFund'+suffix,'<option value="">Choose account</option>'+options(funds,l.source))+
 select('Category Account','staffCategory'+suffix,'<option value="">Choose account</option>'+options(categories,l.affected))+
 field('Line Memo / Reference','staffLineMemo'+suffix,'text',l.memo||l.reference||'')+'</section>';
}
function staffDoubleLine14225(l,i){
 const r=A.rules(S.user),ac=A.accounts().filter(a=>[...r.fundIds,...r.entryIds,r.counterpart].includes(String(a.id)));
 const a=ac.find(a=>String(a.id)===String(l.account)),c=a?.currency||'';
 return '<section class="staff-double-line14225" data-staff-double="'+i+'"><div class="staff-line-heading14225"><b>Line '+(i+1)+'</b>'+(i===0?staffEntryId14289(staffDraft14225()):'')+'</div><div class="staff-account-row14225">'+
 select('Account','staffAccount'+i,'<option value="">Choose account</option>'+options(ac,l.account))+
 '<button class="remove-staff14225" type="button" data-remove-double="'+i+'" aria-label="Remove line '+(i+1)+'">'+trash14225+'</button></div>'+
 '<div class="grid">'+field('Debit'+(c?' ('+esc(c)+')':''),'staffDebit'+i,'number',l.debit||'')+field('Credit'+(c?' ('+esc(c)+')':''),'staffCredit'+i,'number',l.credit||'')+'</div>'+
 '<input class="staff-line-memo14225" id="staffDoubleMemo'+i+'" aria-label="Line '+(i+1)+' memo" placeholder="Line memo" value="'+esc(l.memo||'')+'"></section>';
}
