/* Payroll workflow refinements based on the v96 package. */
(function () {
  'use strict';

  const escape = value => window.escapeHtml(String(value ?? ''));
  const amount = value => window.formatAppNumber(Number(value || 0));
  const money = (value, currency = 'LAK') => `${window.currencySymbolV6?.(currency) || currency} ${amount(value)}`;
  const localDate = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const currentMonth = () => localDate().slice(0, 7);
  let overviewMonth = currentMonth();

