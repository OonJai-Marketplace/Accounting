// IDs retain the posting sequence; the transaction date supplies the year.
function entryIdYear143114(date){return String(date||appLocalDate()).slice(2,4)}
function formatEntryId143114(prefix,number,date,digits=4){return String(prefix||'OJM').toUpperCase().replace(/[^A-Z0-9]/g,'')+entryIdYear143114(date)+String(number).padStart(digits,'0')}
function generateEntryId(){return formatEntryId143114(ApplicationSettings.accounting?.journalPrefix||'OJM',JournalModule.sequence,document.getElementById('jeTransDate')?.value,Number(ApplicationSettings.accounting?.journalDigits)||4)}
function syncEntrySequence(){
 const prefix=String(ApplicationSettings.accounting?.journalPrefix||'OJM').toUpperCase().replace(/[^A-Z0-9]/g,''),year=entryIdYear143114(document.getElementById('jeTransDate')?.value),pattern=new RegExp('^'+prefix+year+'([0-9]+)$');
 const max=JournalModule.entries.reduce((value,row)=>{const match=String(row.id||'').match(pattern);return match?Math.max(value,Number(match[1])):value},0);
 JournalModule.sequence=Math.max(JournalModule.sequence||1,max+1);
}
