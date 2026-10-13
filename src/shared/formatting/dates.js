function formatAppDate(value,withTime=false){
  if(!value)return'—';const raw=String(value),date=new Date(raw.length===10?`${raw}T00:00:00`:raw);if(Number.isNaN(date.getTime()))return raw;
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0'),format=ApplicationSettings.system?.dateFormat||'DD/MM/YYYY';
  const base=format==='MM/DD/YYYY'?`${m}/${d}/${y}`:format==='YYYY-MM-DD'?`${y}-${m}-${d}`:`${d}/${m}/${y}`;
  return withTime?`${base} ${date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`:base;
}

