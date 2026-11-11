/* Message preparation is entirely local. Totals retain each item's currency. */
(()=>{'use strict';
function texts(d){
 const groups=new Map(),totals=new Map();
 for(const line of d.lines){
  const group=groups.get(line.category)||{items:[],totals:new Map()};
  group.items.push(line);
  for(const sums of [group.totals,totals])sums.set(line.currency,(sums.get(line.currency)||0)+Math.round(Number(line.amount)*100));
  groups.set(line.category,group);
 }
 const amounts=sums=>[...sums].map(([currency,cents])=>currency+' '+formatAppNumber(cents/100)).join(' + ');
 const period=BudgetReport290.period(d),total=amounts(totals),recipient=d.recipient||'Administrators';
 const subject='Budget Request for '+period;
 const purpose=(d.purpose||'').trim();
 // A saved purpose can be a copy of the monthly heading.
 const heading=purpose.toLowerCase().replace(/[.,:!?]+$/,'').replace(/\s+/g,' ').trim();
 const periodLabel=period.toLowerCase();
 const [month,year]=periodLabel.split(' ');
 const repeatsHeading=heading==='budget request'||[periodLabel,month,year].some(label=>
  heading===label||heading==='budget request for '+label||heading==='budget request '+label||heading===label+' budget request');
 const purposeLine=purpose&&!repeatsHeading?'Purpose: '+purpose:'';
 const notes=(d.notes||'').trim();
 const noteBlock=notes?'Note:\n'+notes:'';
 const breakdown=[...groups].map(([category,g])=>[category,...g.items.map(l=>'• '+l.description+' — '+l.currency+' '+formatAppNumber(l.amount)),'Subtotal: '+amounts(g.totals)].join('\n')).join('\n\n');
 const totalLine='Total requested: '+total;
 const detail=['Dear '+recipient+',','Please review our budget request for '+period+'.',purposeLine,breakdown,totalLine,noteBlock,'Please let us know when the funds can be made available.','Thank you,\n'+(d.preparedBy||liveProfile.full_name||'Oon Jai')].filter(Boolean).join('\n\n');
 const categoryLines=[...groups].map(([category,group])=>'• '+category+' — '+amounts(group.totals));
 const summary=['Hello '+recipient+',','Here is our budget request for '+period+'.',purposeLine,'Breakdown by category\n'+categoryLines.join('\n'),totalLine,noteBlock,'Thank you!'].filter(Boolean).join('\n\n');
 return {subject,detail,summary};
}
function render(host,d){
 const doc=host.ownerDocument;host.replaceChildren();
 if(!d.lines.length){host.textContent='Add a budget item to prepare the messages.';return}
 const message=texts(d);
 for(const [label,value,rows] of [['Email subject',message.subject,1],['Email message',message.detail,9],['WhatsApp message',message.summary,9]]){
  const block=doc.createElement('section'),field=doc.createElement('textarea'),button=doc.createElement('button'),heading=doc.createElement('h4'),status=doc.createElement('span');
  heading.textContent=label;field.readOnly=true;field.rows=rows;field.value=value;field.setAttribute('aria-label',label);
  button.type='button';button.textContent='Copy '+label.toLowerCase();status.setAttribute('role','status');
  button.onclick=async()=>{try{await navigator.clipboard.writeText(field.value);status.textContent='Copied.'}catch{
   field.focus();field.select();let copied=false;try{copied=doc.execCommand('copy')}catch{}status.textContent=copied?'Copied.':'Text selected. Use Copy on your device.';
  }};
  block.append(heading,field,button,status);host.append(block);
 }
}
window.budgetMessages14314={texts,render};
})();
