/* PF-01: based on yeezy.com. Almost nothing on the page: big objects floating on white,
   a tiny product code under each, no boxes, no headings. Click one to look closer
   (it sways a little, like fabric in wind). Home is a near-empty "coming soon" page.
   Add a real screenshot to a project (<img> inside .thumb) and it shows up here. */
(() => {
  let y = null;

  // earthy tones for items that don't have an image yet
  const TONES = ['#d8d2c6', '#b9b2a6', '#8f8a7f', '#cfc6b8', '#a59a88', '#e3ded4', '#7d7a70'];
  const SHAPES = [
    '46% 54% 50% 50% / 52% 44% 56% 48%',
    '30% 30% 46% 46% / 22% 22% 60% 60%',
    '50%',
    '18% 18% 42% 42% / 14% 14% 52% 52%',
  ];

  function codeFor(site) {
    const word = (site.nav.find((n) => n.active)?.label || site.label || site.page).replace(/[^a-z]/gi, '');
    return (word.slice(0, 2) || 'TF').toUpperCase();
  }

  function object(item, i, site, api) {
    if (item.image) return `<img class="yz-photo" src="${api.esc(item.image)}" alt="">`;
    return `<span class="yz-object" style="--tone:${TONES[i % TONES.length]};--shape:${SHAPES[i % SHAPES.length]}"></span>`;
  }

  function render(root, site, api) {
    const e = api.esc;
    const code = codeFor(site);
    const initials = site.name.split(/\s+/).map((w) => w[0]).join('');
    const label = (item) => `${code}-${String(item.index).padStart(2, '0')}`;

    const header = `
      <header class="yz-head">
        <a class="yz-logo" href="${e(site.homeHref)}">${e(initials)}</a>
        <nav class="yz-nav">
          ${site.nav.map((n) => `<a href="${e(n.href)}" class="${n.active ? 'is-on' : ''}">${e(n.label)}</a>`).join('')}
        </nav>
        <span class="yz-tools" data-theme-controls></span>
        <span class="yz-count">${site.items.length ? `(${site.items.length})` : ''}</span>
      </header>`;

    const footer = `
      <footer class="yz-foot">
        ${site.links.map((l) => `<a href="${e(l.href)}" target="_blank" rel="noopener">${e(l.label)}</a>`).join('')}
      </footer>`;

    if (!site.items.length) {
      root.innerHTML = `
        <div class="yz">
          ${header}
          <main class="yz-home">
            <p>${e(site.title || site.description)}</p>
          </main>
          ${footer}
        </div>`;
      return;
    }

    root.innerHTML = `
      <div class="yz">
        ${header}
        <main class="yz-grid">
          ${site.items.map((item, i) => `
            <button type="button" class="yz-item" data-i="${i}" aria-label="${e(item.title)}">
              <span class="yz-stage">${object(item, i, site, api)}</span>
              <span class="yz-code">${label(item)}</span>
              <span class="yz-name">${e(item.title)}</span>
            </button>`).join('')}
        </main>
        ${footer}
        <div class="yz-view" hidden role="dialog" aria-modal="true">
          <button type="button" class="yz-close" aria-label="Close">CLOSE</button>
          <div class="yz-view-stage"></div>
          <div class="yz-view-info"></div>
          <div class="yz-view-nav">
            <button type="button" class="yz-prev" aria-label="Previous">←</button>
            <span class="yz-pos"></span>
            <button type="button" class="yz-next" aria-label="Next">→</button>
          </div>
        </div>
      </div>`;

    y.label = label;
  }

  function open(i) {
    const { site, api, root } = y;
    const e = api.esc;
    const items = site.items;
    y.current = (i + items.length) % items.length;
    const item = items[y.current];
    const view = root.querySelector('.yz-view');
    view.querySelector('.yz-view-stage').innerHTML = `<span class="yz-sway">${object(item, y.current, site, api)}</span>`;
    view.querySelector('.yz-view-info').innerHTML = `
      <p class="yz-code">${y.label(item)}</p>
      <p class="yz-title">${e(item.title)}</p>
      ${item.text ? `<p class="yz-text">${e(item.text)}</p>` : ''}
      ${item.tags.length ? `<p class="yz-text">${e(item.tags.join(' / '))}</p>` : ''}
      ${item.href ? `<a class="yz-buy" href="${e(item.href)}">${item.theme ? 'USE' : 'VIEW'}</a>` : ''}`;
    view.querySelector('.yz-pos').textContent = `${y.current + 1} / ${items.length}`;
    view.hidden = false;
    view.querySelector('.yz-close').focus();
  }

  function close() {
    const view = y?.root.querySelector('.yz-view');
    if (view) view.hidden = true;
  }

  Theme.register('pf-01', {
    modes: ['light', 'dark'],

    mount(root, site, api) {
      y = { root, site, api, current: 0 };
      render(root, site, api);

      root.addEventListener('click', (ev) => {
        const item = ev.target.closest('.yz-item');
        if (item) { open(Number(item.dataset.i)); return; }
        if (ev.target.closest('.yz-close')) close();
        if (ev.target.closest('.yz-prev')) open(y.current - 1);
        if (ev.target.closest('.yz-next')) open(y.current + 1);
      });

      y.keys = (ev) => {
        if (ev.key === 'Escape') root.querySelector('.yz-themes')?.remove();
        const view = root.querySelector('.yz-view');
        if (!view || view.hidden) return;
        if (ev.key === 'Escape') close();
        if (ev.key === 'ArrowLeft') open(y.current - 1);
        if (ev.key === 'ArrowRight') open(y.current + 1);
      };
      document.addEventListener('keydown', y.keys);
    },

    // The Themes button opens PF-01's own list instead of the standard popup:
    // the same empty white page, screenshots as "products", coded PF-01, PF-02...
    // (PF-01 itself first). Hover shows the real name.
    picker(root, api) {
      const e = api.esc;
      root.querySelector('.yz-themes')?.remove();
      const current = document.documentElement.dataset.siteTheme || 'original';
      const box = document.createElement('div');
      box.className = 'yz-themes';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Themes');
      box.innerHTML = `
        <header class="yz-head">
          <span class="yz-logo">THEMES</span>
          <span class="yz-count">(${api.themes.length})</span>
          <button type="button" class="yz-close" data-act="close-themes">CLOSE</button>
        </header>
        <div class="yz-theme-grid">
          ${[...api.themes.filter((t) => t.id === 'pf-01'), ...api.themes.filter((t) => t.id !== 'pf-01')].map((t, i) => `
            <button type="button" class="yz-theme ${t.id === current ? 'is-on' : ''}" data-theme-choice="${t.id}">
              <span class="yz-theme-shot"><img src="${e(api.thumb(t.id))}" alt="" loading="lazy" onerror="this.remove()"></span>
              <span class="yz-code">PF-${String(i + 1).padStart(2, '0')}${t.id === current ? ' ●' : ''}</span>
              <span class="yz-name">${e(t.name)}</span>
            </button>`).join('')}
        </div>`;
      root.append(box);
      box.querySelector('.yz-close').focus();
      box.addEventListener('click', (ev) => { if (ev.target.closest('[data-act="close-themes"]')) box.remove(); });
    },

    unmount() {
      document.removeEventListener('keydown', y.keys);
      y = null;
    },
  });
})();
