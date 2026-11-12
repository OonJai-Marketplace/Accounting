/* Imported source references stay available to receipts and comparisons. The saved
   journal line number is stable across views, filtering and spreadsheet revisions. */
window.submissionHistoryIds = {
 entry(line) {
  const raw = line.workspace_entry_no || '';
  const match = /^HIST-(\d{4})-(0[1-9]|1[0-2])-([A-Z]+)-(?:R\d+-)?\d+$/.exec(raw);
  const sequence = Number(line.line_no);
  if (!match || !Number.isSafeInteger(sequence) || sequence < 1) return raw;
  return 'HIS' + match[1].slice(-2) + match[2] + '-' + match[3] + String(sequence).padStart(2, '0');
 },
 report(journal) {
  return (journal.seed_key || '').replace(/^HISTORY-XLSX:\d{2}(\d{2})-(0[1-9]|1[0-2]):(.+)$/, 'HIS$1$2-$3');
 }
};
