export function canonicalID218(label){return String(label||'').trim().replace(/^OJM[\s-]*(\d{2})[\s-]*(\d{4})(-\d+)?$/i,(_,year,number,suffix)=>'OJM'+year+number+(suffix||''));}
export function aliases218(label){const canonical=canonicalID218(label);return [...new Set([label,canonical,canonical.replace(/^(OJM\d{2})(\d{4})(-\d+)?$/,'$1-$2$3')])];}
export function idRequest(value){
 const groups=value.groups;if(!Array.isArray(groups)||!groups.length||groups.length>100)throw Error('Check 1–100 document IDs at a time.');
 const seen=new Set();return groups.map(g=>{const type=g.type,label=String(g.label||'').trim();
  if(!['journal','hr','support'].includes(type)||!label||label.length>120||/[\x00-\x1f]/.test(label)||seen.has(label))throw Error('Use distinct document IDs in this batch.');
  if(type!=='support'&&!/\d$/.test(label))throw Error('An entry ID must end in a number.');seen.add(label);return {type,label};
 });
}
export function idResults(groups,journals,lines,documents,scan){
 return groups.map(g=>{
  const entries=journals.filter(j=>canonicalID218(j.entry_no)===canonicalID218(g.label)&&!/void|deleted/i.test(j.status||''));
  const staff=lines.filter(l=>canonicalID218(l.workspace_entry_no)===canonicalID218(g.label)),staffSets=new Set(staff.map(l=>l.staff_journal_id));
  const targets=g.type!=='journal'?{journal_ids:[],staff_line_ids:[]}:entries.length===1?{journal_ids:[entries[0].id],staff_line_ids:[]}:!entries.length&&staffSets.size===1?{journal_ids:[],staff_line_ids:staff.map(l=>l.id).sort()}:{journal_ids:[],staff_line_ids:[]};
  const exists=g.type!=='journal'||targets.journal_ids.length+targets.staff_line_ids.length>0;
  const latest=new Map();for(const d of [...documents].sort((a,b)=>(b.revision||0)-(a.revision||0))){const key=[d.owner_id,d.scan_id,d.group_id].join(':');if(!latest.has(key))latest.set(key,d);}
  const receipts=[...latest.values()].filter(d=>!d.superseded_by218&&d.scan_id!==scan&&(canonicalID218(d.entry_label)===canonicalID218(g.label)||d.journal_ids?.some(id=>targets.journal_ids.includes(id))||d.staff_line_ids?.some(id=>targets.staff_line_ids.includes(id)))).map(d=>({id:d.id,title:d.title,pages:Array.isArray(d.pages)?d.pages.length:0}));
  return {...g,label:entries.length===1?entries[0].entry_no:staffSets.size===1?staff[0].workspace_entry_no:g.label,...targets,available:exists,receipts,receiptCount:receipts.length,requiresChoice:exists&&receipts.length>0,reason:!exists?(entries.length>1||staffSets.size>1?'More than one entry matches this ID':'No matching journal entry in your permitted workspace'):''};
 });
}
export function requireAvailable(rows){const bad=rows.find(r=>!r.available);if(bad)throw Error(bad.label+': '+bad.reason);return rows;}
export function sameTargets(a,b){return ['journal_ids','staff_line_ids'].every(key=>JSON.stringify([...(a?.[key]||[])].sort())===JSON.stringify([...(b?.[key]||[])].sort()));}

export function suggestionRequest217(b){
 const type=b.type,label=String(b.label||'').trim();
 if(!['journal','hr','support'].includes(type)||!label||label.length>120||/[\x00-\x1f%_\\]/.test(label))throw Error('Enter an ID or name to find available documents.');
 if(!Array.isArray(b.exclude||[])||(b.exclude||[]).length>2000||(b.exclude||[]).some(x=>typeof x!=='string'||x.length>120))throw Error('Too many device document IDs.');
 // Earlier scanner defaults inserted a hyphen that the Accounting sequence does not use.
 const seed=type==='journal'?canonicalID218(label):label;
 const match=seed.match(/^(.*?)(\d{4,})$/),prefix=match?match[1]+match[2].slice(0,-4):seed;
 return {type,label,seed,prefix,exclude:new Set(b.exclude||[])};
}
export function nextDocumentID217(label){const m=label.match(/^(.*?)(\d+)$/);if(!m)return label+' 2';const n=Number(m[2])+1;if(!Number.isSafeInteger(n))throw Error('ID number is too large.');return m[1]+String(n).padStart(m[2].length,'0');}
