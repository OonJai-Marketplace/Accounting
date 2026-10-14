// ==============================================================================


// ==============================================================================
// JS 2: TRANSACTIONS STATE & INITIAL DATA CLUSTERS
// Master record ledger for Journal Entry, New Transactions, and Archives.
// ==============================================================================
const JournalModule = {
  // Live journals are populated only by authenticated loading or verified cache.
  entries: [],
  voidedEntries: [], // Live audit only; no built-in sample.
  sequence: 1,
  editingEntryId: null,   // Tracks active transaction loaded into the post form for editing
  pendingLines: null      // Temporarily holds lines awaiting reason modal submission
};
