  function returnedReview14348(){if(S.page!=='entries')return '';const returned=headers().filter(j=>j.status==='returned'&&!reopened14348.has(correctionKey14348(j)));return returned.length?'<section class="card"><h2>Review <span class="returned-badge14347">'+returned.length+'</span></h2>'+returned.map((j,i)=>'<article><p><strong>'+esc(j.period_start)+'</strong></p><p>'+esc(j.return_note||'Returned for correction')+'</p>'+action('reopen-correction','Reopen for correction','data-index="'+i+'"')+'</article>').join('')+'</section>':'';}
  function groupEntries() {
    const visible=S.printing14294?monthHeaders():S.page==='entries'?headers().filter(editable14348):monthHeaders().filter(j=>!['draft','returned'].includes(j.status));
    const batches=new Map(visible.map(j=>[j.id,j])),groups=new Map();
    const rows=S.page==='entries'?Object.values(S.data.months||{}).flatMap(m=>m.lines||[]):lines();
    for(const l of rows.filter(l=>batches.has(l.staff_journal_id)&&!l.voided_at&&l.status!=='voided')){const groupKey=l.staff_journal_id+':'+(l.editor_group1437||l.id);if(!groups.has(groupKey))groups.set(groupKey,{batch:batches.get(l.staff_journal_id),lines:[]});groups.get(groupKey).lines.push(l);}
    return [...groups.values()].sort((a,b)=>Number(b.batch.status==='returned')-Number(a.batch.status==='returned')||String(b.lines[0].transaction_date).localeCompare(String(a.lines[0].transaction_date)));
  }
