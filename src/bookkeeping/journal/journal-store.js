// ==============================================================================


// ==============================================================================
// JS 2: TRANSACTIONS STATE & INITIAL DATA CLUSTERS
// Master record ledger for Journal Entry, New Transactions, and Archives.
// ==============================================================================
const JournalModule = {
  entries: [
    { id: "OJM-0001", date: "2026-09-18", account: "Cash on Hand", currency: "USD", memo: "Daily register cash closeout", debit: 1000.00, credit: 0, editReason: "", archived: false },
    { id: "OJM-0001", date: "2026-09-18", account: "Food Sales — Dine-in", currency: "USD", memo: "Dine-in USD allocation", debit: 0, credit: 1000.00, editReason: "", archived: false },
    { id: "OJM-0002", date: "2026-09-18", account: "Cost of Goods Sold — Food", currency: "LAK", memo: "Morning fresh vegetable procurement", debit: 8500000.00, credit: 0, editReason: "", archived: false },
    { id: "OJM-0002", date: "2026-09-18", account: "Operating Bank Account", currency: "LAK", memo: "Direct commercial wire for market goods", debit: 0, credit: 8500000.00, editReason: "", archived: false },
    { id: "OJM-0003", date: "2026-08-28", account: "Utilities (Power, Gas, Water)", currency: "LAK", memo: "Archived August utilities sample", debit: 505000.00, credit: 0, editReason: "", archived: true, archivedAt: "2026-09-01" },
    { id: "OJM-0003", date: "2026-08-28", account: "Operating Bank Account", currency: "LAK", memo: "Archived August utilities sample", debit: 0, credit: 505000.00, editReason: "", archived: true, archivedAt: "2026-09-01" }
  ],
  voidedEntries: [], // Live audit only; no built-in sample.
  sequence: 4,
  editingEntryId: null,   // Tracks active transaction loaded into the post form for editing
  pendingLines: null      // Temporarily holds lines awaiting reason modal submission
};
