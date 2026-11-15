/* SaaS: a startup landing page.
   Centred hero with an announcement pill and gradient headline, a product shot in a
   browser frame with floating cards, a "built with" row, a bento grid of items and a
   gradient call-to-action card. */
(() => {
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  function render(root, site, api) {
    const e = api.esc;
    const isHome = site.page === 'home' || !site.items.length;
    const tiles = isHome
      ? site.nav.map((n) => ({ title: cap(n.label), text: `Everything in ${n.label.toLowerCase()}.`, href: n.href, tags: [] }))
      : site.items;
    const title = site.title || site.name;
    const hero = site.items.find((i) => i.image)?.image || site.sampleImage;
    const page = site.nav.find((n) => n.active)?.label.toLowerCase() || '';

    root.innerHTML = `
      <div class="sa">
        <div class="sa-glow" aria-hidden="true"></div>
        <header class="sa-head">
          <a class="sa-logo" href="${e(site.homeHref)}"><span class="sa-dot"></span>${e(site.name.split(' ')[0].toLowerCase())}</a>
          <nav class="sa-nav" aria-label="Main">
            ${site.nav.map((n) => `<a href="${e(n.href)}" class="${n.active ? 'is-active' : ''}">${e(cap(n.label))}</a>`).join('')}
          </nav>
          <div class="sa-right">
            <span data-theme-controls></span>
            ${site.email ? `<a class="sa-btn sa-btn-grad" href="${e(site.email)}">Get in touch</a>` : ''}
          </div>
        </header>

        <section class="sa-hero">
          <a class="sa-pill" href="#themes"><b>New</b>${api.themes.length} site themes <span aria-hidden="true">→</span></a>
          <h1 class="${title.length > 70 ? 'is-long' : ''}">${e(title)}</h1>
          <p class="sa-lead">${e(site.description || site.intro)}</p>
          <div class="sa-cta">
            <a class="sa-btn sa-btn-dark sa-btn-lg" href="#sa-bento">${isHome ? 'Explore' : 'See everything'}</a>
            ${site.github ? `<a class="sa-btn sa-btn-line sa-btn-lg" href="${e(site.github)}" target="_blank" rel="noopener">View on GitHub</a>` : ''}
          </div>

          <div class="sa-shot">
            <div class="sa-browser">
              <div class="sa-browser-bar"><i></i><i></i><i></i><span>/${e(page)}</span></div>
              <img src="${e(hero)}" alt="">
            </div>
            <div class="sa-float sa-float-a"><span class="sa-float-icon">✦</span><span><b>${site.items.length || site.nav.length}</b> ${site.items.length ? 'items' : 'sections'}</span></div>
            ${site.tags.length ? `<div class="sa-float sa-float-b"><span class="sa-float-label">Stack</span>${site.tags.slice(0, 3).map((t) => `<em>${e(t)}</em>`).join('')}</div>` : ''}
          </div>
        </section>

        ${site.tags.length ? `
        <section class="sa-logos">
          <p>Built with</p>
          <div>${site.tags.map((t) => `<span>${e(t)}</span>`).join('')}</div>
        </section>` : ''}

        <section class="sa-bento" id="sa-bento">
          <p class="sa-kicker">${e(site.label || 'Explore')}</p>
          <h2>${isHome ? 'Everything in one place' : 'Everything I\'ve shipped'}</h2>
          <div class="sa-grid ${tiles.length <= 3 ? 'is-few' : ''}">
            ${tiles.map((t, i) => `
              <${t.href ? `a href="${e(t.href)}"` : 'div'} class="sa-tile ${i === 0 ? 'is-big' : i % 5 === 3 ? 'is-wide' : ''}">
                ${i === 0 ? `<img src="${e(t.image || hero)}" alt="">` : `<span class="sa-tile-num">${String(i + 1).padStart(2, '0')}</span>`}
                <span class="sa-tile-body">
                  <b>${e(t.title)}</b>
                  <span>${e(t.text)}</span>
                  ${t.tags?.length ? `<span class="sa-tile-tags">${t.tags.map((x) => `<em>${e(x)}</em>`).join('')}</span>` : ''}
                </span>
              </${t.href ? 'a' : 'div'}>`).join('')}
          </div>
        </section>

        <section class="sa-final">
          <div class="sa-final-card">
            <h2>Let's build something.</h2>
            <p>${e(site.intro)}</p>
            ${site.email ? `<a class="sa-btn sa-btn-white sa-btn-lg" href="${e(site.email)}">Email me</a>` : ''}
          </div>
        </section>

        <footer class="sa-foot">
          <a class="sa-logo" href="${e(site.homeHref)}"><span class="sa-dot"></span>${e(site.name.split(' ')[0].toLowerCase())}</a>
          <nav>${[...site.nav.map((n) => `<a href="${e(n.href)}">${e(cap(n.label))}</a>`), ...site.links.map((l) => `<a href="${e(l.href)}" target="_blank" rel="noopener">${e(cap(l.label))}</a>`)].join('')}</nav>
          <span>© ${new Date().getFullYear()} ${e(site.name)}</span>
        </footer>
      </div>`;
  }

  Theme.register('saas', {
    modes: ['light', 'dark'],
    fonts: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    mount: render,
  });
})();
