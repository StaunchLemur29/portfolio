/* Consultancy: an advisory / law-firm site. Editorial and quiet.
   Centred serif wordmark, a small-caps nav between hairlines, a big serif statement,
   a sticky "Selected work" label beside a numbered index, a pull quote and a
   correspondence-style footer. */
(() => {
  const roman = (n) => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'][n - 1] || String(n);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  function render(root, site, api) {
    const e = api.esc;
    const isHome = site.page === 'home' || !site.items.length;
    const rows = isHome
      ? site.nav.map((n, i) => ({ index: i + 1, title: cap(n.label), text: '', tags: [], href: n.href }))
      : site.items;
    const year = new Date().getFullYear();
    const statement = site.title || site.name;

    root.innerHTML = `
      <div class="cs">
        <header class="cs-head">
          <div class="cs-topline">
            <span>${e(site.label || 'Portfolio')}</span>
            <span data-theme-controls></span>
          </div>
          <a class="cs-wordmark" href="${e(site.homeHref)}">${e(site.name)}</a>
          <nav class="cs-nav" aria-label="Main">
            ${site.nav.map((n) => `<a href="${e(n.href)}" class="${n.active ? 'is-active' : ''}">${e(n.label)}</a>`).join('')}
          </nav>
        </header>

        <section class="cs-hero">
          <h1 class="${statement.length > 90 ? 'is-long' : ''}">${e(statement)}</h1>
          ${site.description ? `<p class="cs-standfirst">${e(site.description)}</p>` : ''}
        </section>

        <section class="cs-index">
          <aside class="cs-aside">
            <h2>${isHome ? 'Sections' : 'Selected work'}</h2>
            <p>${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}</p>
          </aside>
          <ol class="cs-list">
            ${rows.map((r) => `
              <li>
                <${r.href ? `a href="${e(r.href)}"` : 'div'} class="cs-row">
                  <span class="cs-num">${roman(r.index)}</span>
                  <span class="cs-main">
                    <span class="cs-title">${e(r.title)}</span>
                    ${r.text ? `<span class="cs-text">${e(r.text)}</span>` : ''}
                  </span>
                  <span class="cs-tags">${r.tags.map(e).join(', ')}</span>
                  <span class="cs-arrow" aria-hidden="true">${r.href ? '→' : ''}</span>
                </${r.href ? 'a' : 'div'}>
              </li>`).join('')}
          </ol>
        </section>

        ${site.intro ? `
        <figure class="cs-quote">
          <blockquote>${e(site.intro)}</blockquote>
          <figcaption>${e(site.name)}</figcaption>
        </figure>` : ''}

        <footer class="cs-foot">
          <div class="cs-foot-grid">
            <div>
              <h3>Correspondence</h3>
              ${site.email ? `<a href="${e(site.email)}">${e(site.email.replace('mailto:', ''))}</a>` : ''}
            </div>
            <div>
              <h3>Elsewhere</h3>
              ${site.links.filter((l) => !l.href.startsWith('mailto:')).map((l) => `<a href="${e(l.href)}" target="_blank" rel="noopener">${e(cap(l.label))}</a>`).join('')}
            </div>
            <div>
              <h3>Index</h3>
              ${site.nav.map((n) => `<a href="${e(n.href)}">${e(cap(n.label))}</a>`).join('')}
              <a href="#themes">Site themes</a>
            </div>
          </div>
          <p class="cs-legal"><span>© ${year} ${e(site.name)}</span><span>All rights reserved</span></p>
        </footer>
      </div>`;
  }

  Theme.register('consulting', {
    modes: ['light', 'dark'],
    fonts: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Libre+Franklin:wght@400;500;600&display=swap',
    mount: render,
  });
})();
