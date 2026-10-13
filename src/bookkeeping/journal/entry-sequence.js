// ==============================================================================


// ==============================================================================
// JS 3: DYNAMIC GENERAL HEADERS & CURRENCY CREDIT COLUMNS ENGINE
// Dynamically constructs columns across all logs.
// ==============================================================================
function generateEntryId() {
  const prefix=String(ApplicationSettings.accounting?.journalPrefix||businessInitials()||'JRN').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)||'JRN';
  const digits=Math.max(3,Math.min(6,Number(ApplicationSettings.accounting?.journalDigits)||4));
  return `${prefix}-${String(JournalModule.sequence).padStart(digits,'0')}`;
}
function syncEntrySequence(){const prefix=String(ApplicationSettings.accounting?.journalPrefix||businessInitials()||'JRN').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)||'JRN',digits=Math.max(3,Math.min(6,Number(ApplicationSettings.accounting?.journalDigits)||4)),pattern=new RegExp(`^${prefix}-(\\d{${digits}})$`),max=JournalModule.entries.reduce((value,row)=>{const match=String(row.id||'').match(pattern);return match?Math.max(value,Number(match[1])):value},0);JournalModule.sequence=Math.max(1,max+1)}

