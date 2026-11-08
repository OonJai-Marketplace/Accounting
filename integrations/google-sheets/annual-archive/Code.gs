/** @OnlyCurrentDoc */
function onOpen() {
  if (SpreadsheetApp.getActive().getSheetByName('Archive Input')) {
    SpreadsheetApp.getUi().createMenu('Annual archive').addItem('Import raw backup…','openArchiveImport').addToUi();
  }
}
function openArchiveImport() {
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('Importer').setWidth(630).setHeight(530),'Import accounting backup');
}
function archiveJob_(key) {
  if(!/^job-[a-f0-9-]+$/.test(key))throw Error('Invalid import reference.');
  const props=PropertiesService.getUserProperties(),state=props.getProperty(key);
  if(!state)throw Error('Open a new import in this workbook.');
  const job=JSON.parse(state),book=SpreadsheetApp.getActive();
  if(job.book!==book.getId())throw Error('Wrong workbook.');
  const sheet=book.getSheets().find(s=>s.getSheetId()===job.sheet);
  if(!sheet)throw Error('The staged import was removed.');
  return {props,job,book,sheet};
}
function startArchiveImport(count) {
  const book=SpreadsheetApp.getActive(),home=book.getSheetByName('Review Home');
  if(!home||!book.getSheetByName('Archive Input')||!Number.isSafeInteger(count)||count<1||count>300000)throw Error('Use the Annual Archive Template and a valid backup.');
  const key='job-'+Utilities.getUuid(),sheet=book.insertSheet('Data '+new Date().toISOString().slice(0,10)+' '+key.slice(4,12));
  if(count>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),count-sheet.getMaxRows());
  const job={book:book.getId(),sheet:sheet.getSheetId(),count,offset:0,old:home.getRange('B8').getDisplayValue()};
  PropertiesService.getUserProperties().setProperty(key,JSON.stringify(job));return key;
}
function stageArchiveRows(key,offset,rows) {
  const lock=LockService.getDocumentLock();lock.waitLock(20000);
  try{const {job,sheet,props}=archiveJob_(key);
    if(offset!==job.offset||!Array.isArray(rows)||!rows.length||rows.length>250||offset+rows.length>job.count||rows.some(r=>!Array.isArray(r)||r.length>26))throw Error('Invalid stage or interrupted upload. Start a fresh import.');
    const expected=rows.map(r=>Array.from({length:26},(_,i)=>String(r[i]??'')));
    const range=sheet.getRange(offset+1,1,rows.length,26);range.setNumberFormat('@');
    range.setValues(expected.map(r=>r.map(v=>v===''?'':"'"+v)));SpreadsheetApp.flush();
    if(JSON.stringify(range.getDisplayValues())!==JSON.stringify(expected)||range.getFormulas().some(r=>r.some(Boolean)))throw Error('Staged data did not verify.');
    job.offset+=rows.length;props.setProperty(key,JSON.stringify(job));
  }finally{lock.releaseLock();}
}
function activateArchiveImport(key) {
  const lock=LockService.getDocumentLock();lock.waitLock(20000);
  try{const {props,job,book,sheet}=archiveJob_(key),home=book.getSheetByName('Review Home'),pointer=home.getRange('B8');
    if(job.offset!==job.count||pointer.getDisplayValue()!==job.old||sheet.getRange('A1').getDisplayValue()!=='OONJAI-ARCHIVE-1'||Number(sheet.getRange('D1').getDisplayValue())!==job.count-1)throw Error('Incomplete import or the active snapshot changed. Prior data retained.');
    pointer.setValue(sheet.getName());SpreadsheetApp.flush();props.deleteProperty(key);
  }finally{lock.releaseLock();}
}
