/* Oon Jai Accounting v49
 * Responsive sub-user workspace + transaction-owned review queue.
 * This layer deliberately reuses the existing Supabase/RPC journal backbone.
 */
(function () {
  'use strict';

  const mobile = window.matchMedia('(max-width: 767px)');
  const views = Object.create(null);
  let editing = null;
  let adjustmentRequests = [];

  const icon = name => {
    const paths={
      home:'<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',accounts:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M7 9h10M7 13h6"/>',post:'<path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/>',entries:'<path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4"/>',records:'<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',fund:'<path d="M4 7h16v12H4z"/><path d="M7 7V5h10v2M8 11h8M8 15h5"/>',ready:'<path d="M5 4h14v16H5zM8 9l2 2 5-5M8 15h8"/>',review:'<path d="M4 5h10v14H4zM7 9h4M7 13h4"/><circle cx="17" cy="15" r="4"/><path d="m20 18 2 2"/>',alert:'<path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5M12 17h.01"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.home}</svg>`;
  };
  const number = value => formatAppNumber(value);
  const money = value => `${number(value)} LAK`;
  const monthLabel = value => {
    const date = new Date(`${String(value || '').slice(0, 7)}-01T00:00:00`);
    return Number.isNaN(date.valueOf()) ? 'Current period' : date.toLocaleDateString('en-US', {month:'long', year:'numeric'});
  };
  const currentUser = id => availableSubUsers().find(user => String(user.id) === String(id)) || (String(liveProfile?.id) === String(id) ? liveProfile : null);
  const isStaff = () => Boolean(liveProfile && liveProfile.role !== 'admin' && !livePermission?.can_approve);
  const journalRows = userId => (reviewStaffJournals || []).filter(row => String(row.owner_id) === String(userId));
  const draftJournal = userId => journalRows(userId).find(row => ['draft','returned'].includes(row.status) && row.lines?.length) || journalRows(userId).find(row => ['draft','returned'].includes(row.status));
  const draftLines = userId => draftJournal(userId)?.lines || [];
  const getView = userId => views[userId] || 'home';

