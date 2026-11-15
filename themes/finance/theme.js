/* Finance: a modern bank / fintech site.
   Pill tabs in the header, a hero with a phone showing a working app screen
   (a "balance" card, quick actions, recent activity), stat cards and a data table. */
(() => {
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const initials = (s) => s.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  };

  function render(root, site, api) {
    const e = api.esc;
    const isHome = site.page === 'home' || !site.items.length;
    const rows = isHome
      ? site.nav.map((n, i) => ({ index: i + 1, title: cap(n.label), text: `Open ${n.label.toLowerCase()}`, tags: [], href: n.href }))
      : site.items;
    const title = site.title || site.name;
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, '');

    root.innerHTML = `
      <div class="fi">
        <header class="fi-head">
          <div class="fi-wrap fi-head-row">
            <a class="fi-logo" href="${e(site.homeHref)}"><span class="fi-mark"></span>${e(site.name.split(' ')[0])}</a>
            <nav class="fi-tabs" aria-label="Main">
              ${site.nav.map((n) => `<a href="${e(n.href)}" class="${n.active ? 'is-active' : ''}">${e(cap(n.label))}</a>`).join('')}
            </nav>
            <div class="fi-right">
              <span data-theme-controls></span>
              ${site.email ? `<a class="fi-btn fi-btn-dark" href="${e(site.email)}">Get in touch</a>` : ''}
            </div>
          </div>
        </header>

        <section class="fi-hero">
          <div class="fi-wrap fi-hero-grid">
            <div class="fi-hero-copy">
              <span class="fi-chip"><i></i>${e(site.label || 'Portfolio')}</span>
              <h1 class="${title.length > 70 ? 'is-long' : ''}">${e(title)}</h1>
              <p class="fi-lead">${e(site.description || site.intro)}</p>
              <div class="fi-cta">
                <a class="fi-btn fi-btn-lime fi-btn-lg" href="#fi-table">${isHome ? 'Explore' : 'View all'}</a>
                ${site.github ? `<a class="fi-btn fi-btn-line fi-btn-lg" href="${e(site.github)}" target="_blank" rel="noopener">GitHub</a>` : ''}
              </div>
              <ul class="fi-ticks">
                <li>Hand-written HTML, CSS and JavaScript</li>
                <li>Hosted on GitHub Pages</li>
                <li>No cookies, no sign-up</li>
              </ul>
            </div>

            <div class="fi-phone" aria-hidden="true">
              <div class="fi-screen">
                <div class="fi-status"><span>${e(time)}</span><span class="fi-notch"></span><span>●●● ▮</span></div>
                <p class="fi-hello">${greeting()}</p>
                <div class="fi-balance">
                  <span>${isHome ? 'Sections' : e(cap(site.nav.find((n) => n.active)?.label || 'Items'))}</span>
                  <b>${rows.length}</b>
                  <small>${site.tags.length ? `${site.tags.length} technologies` : `${site.nav.length} pages to explore`}</small>
                </div>
                <div class="fi-actions">
                  ${site.nav.slice(0, 4).map((n) => `<span><i>${e(n.label.charAt(0))}</i>${e(cap(n.label))}</span>`).join('')}
                </div>
                <p class="fi-recent">Recent</p>
                <ul class="fi-activity">
                  ${rows.slice(0, 4).map((r) => `
                    <li><i>${e(initials(r.title))}</i><span><b>${e(r.title)}</b><small>${e(r.tags.join(' · ') || r.text)}</small></span><em>›</em></li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section class="fi-stats fi-wrap">
          <div class="fi-stat"><b>${rows.length}</b><span>${isHome ? 'Sections' : 'Items on this page'}</span></div>
          ${site.tags.length ? `<div class="fi-stat"><b>${site.tags.length}</b><span>Technologies used</span></div>` : ''}
          <div class="fi-stat"><b>${site.nav.length}</b><span>Pages on the site</span></div>
        </section>

        <section class="fi-table fi-wrap" id="fi-table">
          <div class="fi-table-head">
            <h2>${isHome ? 'Where to next' : 'All items'}</h2>
            <span>${rows.length} total</span>
          </div>
          <div class="fi-rows" role="table">
            <div class="fi-row fi-row-head" role="row">
              <span role="columnheader">Name</span><span role="columnheader">Stack</span><span role="columnheader"></span>
            </div>
            ${rows.map((r) => `
              <div class="fi-row" role="row">
                <span role="cell" class="fi-name"><i>${e(initials(r.title))}</i><span><b>${e(r.title)}</b><small>${e(r.text)}</small></span></span>
                <span role="cell" class="fi-stack">${r.tags.map((t) => `<em>${e(t)}</em>`).join('') || '<em class="none">—</em>'}</span>
                <span role="cell">${r.href ? `<a class="fi-btn fi-btn-soft" href="${e(r.href)}">${r.theme ? 'Use' : 'View'}</a>` : ''}</span>
              </div>`).join('')}
          </div>
        </section>

        <footer class="fi-foot fi-wrap">
          <div>
            <a class="fi-logo" href="${e(site.homeHref)}"><span class="fi-mark"></span>${e(site.name.split(' ')[0])}</a>
            <p>${e(site.intro)}</p>
          </div>
          <nav>${[...site.nav.map((n) => `<a href="${e(n.href)}">${e(cap(n.label))}</a>`), ...site.links.map((l) => `<a href="${e(l.href)}" target="_blank" rel="noopener">${e(cap(l.label))}</a>`), `<a href="#themes">Site themes</a>`].join('')}</nav>
          <p class="fi-small">© ${new Date().getFullYear()} ${e(site.name)}. Built by hand.</p>
        </footer>
      </div>`;
  }

  Theme.register('finance', {
    modes: ['light', 'dark'],
    fonts: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap',
    mount: render,
  });
})();
