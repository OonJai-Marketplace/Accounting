/* Journal presentation and monthly audit review. Existing posting rules remain authoritative. */
(function () {
  'use strict';
  const esc = value => escapeHtml(String(value ?? ''));
  const byId = id => document.getElementById(id);
  const auditOpen = new Set();
  const severity = action => /DELETE|REMOVE|PURGE|CANCEL/.test(action) ? 'destructive' : /VOID/.test(action) ? 'void' : /UPDATE|MODIFY|EDIT|ADJUST/.test(action) ? 'edit' : 'info';

