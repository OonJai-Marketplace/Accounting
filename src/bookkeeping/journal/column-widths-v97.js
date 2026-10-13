  function syncJournalColumnWidths() {
    if (window.innerWidth < 900) return;
    const header = document.getElementById('jeHeaderRow');
    const body = document.getElementById('jeLinesBody');
    if (!header || !body) return;
    header.closest('table')?.classList.add('journal-fixed-widths97');
    const cells = [...header.cells];
    cells.forEach(cell => {
      const label = cell.textContent.trim().toUpperCase();
      let fixed = '';
      if (cell.classList.contains('action-col') || label === 'ACTION') fixed = '1.7cm';
      else if (label === 'DR' || label === 'DEBIT' || label.startsWith('DR ')) fixed = '180px';
      else if (/^CR[\s:-]*/.test(label)) {
        const currency = label.replace(/^CR[\s:-]*/, '').trim();
        fixed = '180px';
      }
      if (fixed) for (const property of ['width', 'min-width', 'max-width']) cell.style.setProperty(property, fixed, 'important');
      else if (/MEMO|DESCRIPTION/.test(label)) cell.style.width = 'auto';
      if (fixed) { cell.style.setProperty('text-align', 'left', 'important'); cell.style.setProperty('font-weight', '700', 'important'); }
    });
    body.querySelectorAll('.je-line-dr').forEach(input => { input.closest('td').style.setProperty('width', '180px', 'important'); input.style.setProperty('text-align', 'right', 'important'); });
    body.querySelectorAll('.je-line-cr').forEach(input => { input.closest('td').style.setProperty('width', '180px', 'important'); input.style.setProperty('text-align', 'right', 'important'); });
    body.querySelectorAll('.action-col').forEach(cell => { cell.style.setProperty('width', '1.7cm', 'important'); cell.style.setProperty('text-align', 'right', 'important'); });
  }

