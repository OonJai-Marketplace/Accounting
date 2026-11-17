  const returnedReports=()=>headers().filter(j=>j.status==='returned'&&!reopened14348.has(correctionKey14348(j))).sort(StaffJournalView.newestReport);
  function returnedReview14348(){if(S.page!=='entries')return '';const returned=returnedReports();return returned.length?'<section class="card"><h2>Review <span class="returned-badge14347">'+returned.length+'</span></h2>'+returned.map((j,i)=>'<article><p><strong>'+esc(j.period_start)+'</strong></p><p>'+esc(j.return_note||'Returned for correction')+'</p>'+action('reopen-correction','Reopen for correction','data-index="'+i+'"')+'</article>').join('')+'</section>':'';}
  function groupEntries() {
    const visible=S.printing14294?monthHeaders():S.page==='entries'?headers().filter(editable14348):monthHeaders().filter(j=>!['draft','returned'].includes(j.status));
    const batches=new Map(visible.map(j=>[j.id,j]));
    const active=S.page==='entries'&&!S.printing14294;
    const all=active?Object.values(S.data.months||{}).flatMap(m=>m.lines||[]):lines();
    const rows=all.filter(l=>batches.has(l.staff_journal_id)&&!l.voided_at&&l.status!=='voided');
    if(!active){
      const groups=new Map();
      for(const l of rows){
        const key=JSON.stringify([l.staff_journal_id,l.editor_group1437||l.id]);
        if(!groups.has(key))groups.set(key,{batch:batches.get(l.staff_journal_id),lines:[]});
        groups.get(key).lines.push(l);
      }
      return [...groups.values()].sort((a,b)=>StaffJournalView.newestLine(a.lines[0],b.lines[0]));
    }
    let result=StaffJournalView.activeGroups(rows,S.entryAscending).map(lines=>({batch:batches.get(lines[0].staff_journal_id),lines}));
    if(rules().entryMode==='cashbook'&&S.page==='entries'){
      const ids=rules().fundIds;
      if(!ids.includes(S.cashbookFund240))S.cashbookFund240=ids[0]||'';
      result=result.filter(g=>g.lines.some(l=>l.fund_account_id===S.cashbookFund240||l.account_id===S.cashbookFund240));
    }
    return result;
  }
