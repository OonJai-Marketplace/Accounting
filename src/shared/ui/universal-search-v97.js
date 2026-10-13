  function installUniversalSearch() {
    const dashboard = document.getElementById('nav-module-dashboard');
    if (!dashboard || document.getElementById('universalSearch97')) return;
    const box = document.createElement('div');
    box.className = 'universal-search97';
    box.innerHTML = '<label for="universalSearch97">Search app areas</label><input id="universalSearch97" type="search" placeholder="Find a module or section" autocomplete="off"><div class="universal-search-results97" hidden></div>';
    dashboard.before(box);
    const input = box.querySelector('input'), results = box.querySelector('.universal-search-results97');
    function entries(query) {
      const found = new Map();
      document.querySelectorAll('#appSidebar .nav-header,#appSidebar .tab-btn').forEach(button => {
        const label = button.textContent.trim().replace(/\s+/g, ' ');
        const call = button.getAttribute('onclick') || '';
        const target = call.match(/(?:switchTab|activateCategory)\('([^']+)'/)?.[1];
        if (target && label.toLowerCase().includes(query)) found.set(`${target}:${label}`, { target, label });
      });
      document.querySelectorAll('.tab-content h2,.tab-content h3,.tab-content h4').forEach(heading => {
        if (heading.closest('table,.modal-backdrop,[hidden]')) return;
        const label = heading.textContent.trim().replace(/\s+/g, ' ');
        const target = heading.closest('.tab-content')?.id;
        if (target && label.toLowerCase().includes(query)) found.set(`${target}:${label}`, { target, label });
      });
      return [...found.values()].slice(0, 12);
    }
    function draw() {
      const query = input.value.trim().toLowerCase();
      if (!query) { results.hidden = true; results.replaceChildren(); return; }
      const matches = entries(query);
      results.innerHTML = matches.length ? matches.map((item, index) => `<button type="button" data-search-target97="${escape(item.target)}" data-search-index97="${index}">${escape(item.label)}</button>`).join('') : '<p>No app areas match that search.</p>';
      results.hidden = false;
      results.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
        const target = button.dataset.searchTarget97;
        results.hidden = true;
        input.value = '';
        if (target.startsWith('sec-')) window.scrollToAccountModule?.(target);
        else window.switchTab(target);
      }));
    }
    input.addEventListener('input', draw);
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') { input.value = ''; results.hidden = true; }
      if (event.key === 'Enter') results.querySelector('button')?.click();
    });
    document.addEventListener('click', event => { if (!box.contains(event.target)) results.hidden = true; });
  }

