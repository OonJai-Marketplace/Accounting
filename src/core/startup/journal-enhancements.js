// V6 initialization hooks.
function initializeV6Enhancements(){
  syncCoaDatalist();
  setupJournalColumns();
  document.querySelectorAll('.je-line-acc').forEach(updateJournalAccountBadge);
  toggleMultipleDates(false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeV6Enhancements,{once:true});else initializeV6Enhancements();

