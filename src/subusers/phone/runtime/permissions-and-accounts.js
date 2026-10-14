  function permission(target, verb = 'view') {
    const access = S.data.access; if (!access?.profile || access.profile.id !== S.actor || access.profile.status !== 'active') return false;
    if (access.profile.role === 'admin') return true;
    const p = access.permissions || {}, matrix = p.module_actions113;
    if (matrix) return (matrix[target] || []).includes('view') && (matrix[target] || []).includes(verb);
    const parent = target.startsWith('sub-users-') ? 'sub-users' : target === 'document-editor105' ? 'transactions' : 'settings';
    const view = (p.modules || []).some(m => m === target || m === parent || m === 'all:' + parent || m.endsWith(':' + target));
    return view && (verb === 'view' || !!p[{edit:'can_manage_data', export:'can_export', void:'can_void'}[verb]]);
  }
  function rules() {
    const p = (S.owner!==S.actor?S.data.target?.permissions:S.data.access?.permissions) || {};
    return {directions:(p.allowed_directions?.length ? p.allowed_directions : ['out']).filter(x => ['in','out'].includes(x)), fundIds:(p.assigned_fund_account_ids || []).filter(Boolean), entryIds:(p.destination_account_ids?.length ? p.destination_account_ids : p.allowed_account_ids || []).filter(Boolean), counterpart:p.money_in_counterpart_account_id || '', multiple:!!p.allow_multiple_funds};
  }
  const isAdmin=()=>S.data.access?.profile?.id===S.actor&&S.data.access.profile.status==='active'&&S.data.access.profile.role==='admin';
  const targetName=()=>S.owner===S.actor?S.data.access?.profile?.full_name:S.data.target?.profile?.full_name;
  const accountIds = () => [...new Set([...rules().fundIds, ...rules().entryIds, rules().counterpart].filter(Boolean))];
  const accounts = () => {const ids=new Set(accountIds());return (S.data.accounts || []).filter(a => ids.has(a.id));};
  const funds = () => {const ids=new Set(rules().fundIds);return (S.data.funds || []).filter(f => ids.has(f.account_id));};
  const headers = () => (S.data.headers || []).filter(j => j.owner_id === S.owner);
  const monthHeaders = () => headers().filter(j => String(j.period_start).slice(0,7) === S.month);
  const lines = () => {
    const allowed = new Set(monthHeaders().map(j => j.id));
    return (S.data.months?.[S.month]?.lines || []).filter(l => allowed.has(l.staff_journal_id) && !l.voided_at && l.status !== 'voided');
  };
  const queue = () => (S.data.queue || []).filter(q => q.owner === S.owner);
  const name = id => accounts().find(a => a.id === id)?.name || funds().find(a => a.account_id === id)?.name || 'Previously assigned account';
  const currency = id => accounts().find(a => a.id === id)?.currency || funds().find(a => a.account_id === id)?.currency || '';
  function cleanName(id) { const n = name(id), c = currency(id); return c ? n.replace(new RegExp('\\s*(?:[–-]\\s*)?\\(?\\b' + c.replace(/[^A-Z]/g,'') + '\\b\\)?\\s*$','i'), '') : n; }
  const accountTitle = id => `<span class="currency">${esc(symbol(currency(id)))}</span>${esc(cleanName(id))}`;
  const deviceDelta14333=id=>queue().filter(q=>!Object.values(S.data.months||{}).some(m=>(m.lines||[]).some(l=>String(l.editor_group1437||'').startsWith(q.key+':')))).flatMap(q=>q.params.p_items||[]).filter(l=>l.fund===id).reduce((n,l)=>n+(l.direction==='in'?1:-1)*Number(l.amount||0),0);
  const balance = f => Number(f.closing || 0) + Number(f.draft_in || 0) - Number(f.draft_out || 0)+deviceDelta14333(f.account_id);
