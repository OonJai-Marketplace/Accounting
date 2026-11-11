/** @OnlyCurrentDoc */
function onOpen() {
  PropertiesService.getUserProperties().deleteProperty('DIRECT_DB_SESSION');
  SpreadsheetApp.getUi().createMenu('Accounting')
    .addItem('Upload Excel or JSON', 'openArchiveUpload').addToUi();
}

function openArchiveUpload() {
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutputFromFile('ArchiveUpload')
    .setTitle('Upload accounting records'));
}

function readAccountingFile_(file) {
  const name = file.getName();
  let text;
  if (/\.xlsx$/i.test(name)) {
    const part = Utilities.unzip(file.copyBlob().setContentType('application/zip'))
      .find(blob => blob.getName() === 'customXml/item1.xml');
    if (!part) throw Error('Choose the original Raw Excel file downloaded from Backup & Recovery.');
    const root = XmlService.parse(part.getDataAsString()).getRootElement();
    if (root.getNamespace().getURI() !== 'urn:oonjai:portable:328') throw Error('Unrecognized Excel backup.');
    text = root.getText();
  } else if (/\.json$/i.test(name)) {
    text = file.getDataAsString();
  } else throw Error('Choose an accounting .xlsx or .json file.');
  const pack = JSON.parse(JSON.parse(text).payload);
  if (pack.format !== 'oonjai-portable-328' || !pack.tables || !pack.keys) throw Error('Unrecognized accounting file.');
  return pack;
}

function archiveRows_(pack) {
  const tables = Object.assign({}, pack.reference, pack.tables);
  const days = [];
  for (const block of pack.attendance || []) for (const item of block.items) {
    days.push(JSON.stringify({run_id:block.id, employee_id:item.employee, source:item.bucket, date:item.day.date, day:item.day}));
  }
  if (days.length) tables.attendance_days = days;
  const output = [], now = new Date().toISOString();
  for (const [table, records] of Object.entries(tables)) {
    for (const raw of records) {
      const row = JSON.parse(raw);
      const fields = table === 'attendance_days' ? ['run_id','employee_id','source','date'] : pack.keys[table];
      const keys = fields.map(field => row[field]);
      const id = keys.length === 1 ? String(keys[0]) : JSON.stringify(keys);
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, table+'\n'+raw, Utilities.Charset.UTF_8)
        .map(b => (b & 255).toString(16).padStart(2,'0')).join('');
      let start = 0, part = 1;
      while (start < raw.length) {
        let end = Math.min(start + 28000, raw.length);
        if (end < raw.length && /[\uD800-\uDBFF]/.test(raw[end-1])) end--;
        output.push(['portable-'+digest+':'+part, table, 'BACKUP', now, id, String(part), raw.slice(start,end)]);
        start = end;
        part++;
      }
    }
  }
  return output;
}

function uploadAccountingFile(form) {
  const rows = archiveRows_(readAccountingFile_(form.archive));
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName('Source Records');
    const header = ['Revision part','Table','Operation','Captured UTC','Record ID','Part','Original JSON'];
    if (!sheet || JSON.stringify(sheet.getRange(1,1,1,7).getDisplayValues()[0]) !== JSON.stringify(header)) {
      throw Error('The Source Records header has changed. The archive was left intact.');
    }
    let last = sheet.getLastRow();
    const known = new Set(last > 1 ? sheet.getRange(2,1,last-1,1).getDisplayValues().map(row=>row[0]) : []);
    const missing = rows.filter(row => {
      if (known.has(row[0])) return false;
      known.add(row[0]);
      return true;
    });
    // Reserve space at the bottom. Write plain text so Sheets never evaluates a file as a formula.
    if (last + missing.length > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(),last+missing.length-sheet.getMaxRows());
    for (let start = 0; start < missing.length;) {
      const batch = [];
      let size = 0;
      while (start < missing.length && size < 500000 && batch.length < 400) {
        const row = missing[start++];
        batch.push(row.map(text => SpreadsheetApp.newRichTextValue().setText(text).build()));
        size += row.join('').length;
      }
      sheet.getRange(last+1,1,batch.length,7).setRichTextValues(batch);
      last += batch.length;
    }
    SpreadsheetApp.flush();
    return missing.length+' archive rows added. '+(rows.length-missing.length)+' already present.';
  } finally { lock.releaseLock(); }
}
