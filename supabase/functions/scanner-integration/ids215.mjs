export function idRequest(value){
 const groups=value.groups;if(!Array.isArray(groups)||!groups.length||groups.length>100)throw Error('Check 1–100 document IDs at a time.');
 const seen=new Set();return groups.map(g=>{const type=g.type,label=String(g.label||'').trim();
  if(!['journal','hr','support'].includes(type)||!label||label.length>120||/[\x00-\x1f]/.test(label)||seen.has(label))throw Error('Use distinct document IDs in this batch.');
  if(type!=='support'&&!/\d$/.test(label))throw Error('An entry ID must end in a number.');seen.add(label);return {type,label};
 });
}
export function idResults(groups,journals,lines,documents,scan){
 return groups.map(g=>{
  const entries=journals.filter(j=>j.entry_no===g.label&&!/void|deleted/i.test(j.status||''));
  const staff=lines.filter(l=>l.workspace_entry_no===g.label),staffSets=new Set(staff.map(l=>l.staff_journal_id));
  const targets=g.type!=='journal'?{journal_ids:[],staff_line_ids:[]}:entries.length===1?{journal_ids:[entries[0].id],staff_line_ids:[]}:!entries.length&&staffSets.size===1?{journal_ids:[],staff_line_ids:staff.map(l=>l.id).sort()}:{journal_ids:[],staff_line_ids:[]};
  const exists=g.type!=='journal'||targets.journal_ids.length+targets.staff_line_ids.length>0;
  const used=documents.some(d=>d.scan_id!==scan&&(d.entry_label===g.label||d.journal_ids?.some(id=>targets.journal_ids.includes(id))||d.staff_line_ids?.some(id=>targets.staff_line_ids.includes(id))));
  return {...g,...targets,available:exists&&!used,reason:used?'Already used by another scan batch':!exists?(entries.length>1||staffSets.size>1?'More than one entry matches this ID':'No matching journal entry in your permitted workspace'):''};
 });
}
export function requireAvailable(rows){const bad=rows.find(r=>!r.available);if(bad)throw Error(bad.label+': '+bad.reason);return rows;}
export function sameTargets(a,b){return ['journal_ids','staff_line_ids'].every(key=>JSON.stringify([...(a?.[key]||[])].sort())===JSON.stringify([...(b?.[key]||[])].sort()));}
