/* Corporate: the classic company website.
   White header with a Contact button, split hero with an image, a technology band,
   service cards with icons, a blue call-to-action band and a four-column footer. */
(() => {
  const ICONS = [
    '<path d="M4 7h16v10H4z"/><path d="M8 21h8M12 17v4"/>',                         // monitor
    '<path d="M8 9 4 12l4 3M16 9l4 3-4 3M14 5l-4 14"/>',                           // code
    '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',                                 // chart
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>', // gear-ish
    '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/>',     // layers
    '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/>',                       // shield
  ];
  const icon = (i) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[i % ICONS.length]}</svg>`;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  function render(root, site, api) {
    const e = api.esc;
    const isHome = site.page === 'home' || !site.items.length;
    const cards = isHome
      ? site.nav.map((n) => ({ title: cap(n.label), text: `Browse my ${n.label.toLowerCase()}.`, href: n.href, tags: [] }))
      : site.items;
    const title = site.title || site.name;
    const year = new Date().getFullYear();

    root.innerHTML = `
      <div class="co">
        <header class="co-head">
          <div class="co-wrap co-head-row">
            <a class="co-logo" href="${e(site.homeHref)}"><span class="co-mark">${e(site.name.split(/\s+/).map((w) => w[0]).join(''))}</span>${e(site.name)}</a>
            <nav class="co-nav" aria-label="Main">
              ${site.nav.map((n) => `<a href="${e(n.href)}" class="${n.active ? 'is-active' : ''}">${e(cap(n.label))}</a>`).join('')}
            </nav>
            <div class="co-actions">
              <span data-theme-controls></span>
              ${site.email ? `<a class="co-btn co-btn-primary" href="${e(site.email)}">Contact</a>` : ''}
            </div>
            <button type="button" class="co-burger" aria-expanded="false" aria-label="Menu"><i></i><i></i><i></i></button>
          </div>
        </header>

        <section class="co-hero">
          <div class="co-wrap co-hero-grid">
            <div class="co-hero-copy">
              <p class="co-eyebrow">${e(site.label || 'Software developer')}</p>
              <h1 class="${title.length > 70 ? 'is-long' : ''}">${e(title)}</h1>
              <p class="co-lead">${e(site.description || site.intro)}</p>
              <div class="co-cta">
                <a class="co-btn co-btn-primary co-btn-lg" href="#co-services">${isHome ? 'Explore' : 'See the work'}</a>
                ${site.email ? `<a class="co-btn co-btn-ghost co-btn-lg" href="${e(site.email)}">Get in touch</a>` : ''}
              </div>
            </div>
            <figure class="co-hero-media">
              <img src="${e(site.items.find((i) => i.image)?.image || site.sampleImage)}" alt="">
              <figcaption class="co-floatcard">
                <b>${site.items.length || site.nav.length}</b>
                <span>${site.items.length ? 'items on this page' : 'sections to explore'}</span>
              </figcaption>
            </figure>
          </div>
        </section>

        ${site.tags.length ? `
        <section class="co-band" aria-label="Technologies">
          <div class="co-wrap co-band-row">
            <span class="co-band-label">Technologies</span>
            ${site.tags.map((t) => `<span class="co-tech">${e(t)}</span>`).join('')}
          </div>
        </section>` : ''}

        <section class="co-services" id="co-services">
          <div class="co-wrap">
            <div class="co-section-head">
              <p class="co-eyebrow">${isHome ? 'Explore' : e(site.label || 'Work')}</p>
              <h2>${isHome ? 'What you\'ll find here' : 'What I\'ve built'}</h2>
            </div>
            <div class="co-cards">
              ${cards.map((c, i) => `
                <article class="co-card">
                  <span class="co-icon">${icon(i)}</span>
                  <h3>${e(c.title)}</h3>
                  <p>${e(c.text)}</p>
                  ${c.tags?.length ? `<p class="co-tags">${c.tags.map(e).join(' · ')}</p>` : ''}
                  ${c.href ? `<a class="co-link" href="${e(c.href)}">${c.theme ? 'Use this theme' : 'Learn more'} <span aria-hidden="true">→</span></a>` : ''}
                </article>`).join('')}
            </div>
          </div>
        </section>

        <section class="co-ctaband">
          <div class="co-wrap co-ctaband-row">
            <div>
              <h2>Have a project in mind?</h2>
              <p>${e(site.intro)}</p>
            </div>
            ${site.email ? `<a class="co-btn co-btn-white co-btn-lg" href="${e(site.email)}">Email me</a>` : ''}
          </div>
        </section>

        <footer class="co-foot">
          <div class="co-wrap co-foot-grid">
            <div>
              <a class="co-logo" href="${e(site.homeHref)}"><span class="co-mark">${e(site.name.split(/\s+/).map((w) => w[0]).join(''))}</span>${e(site.name)}</a>
              <p>${e(site.intro)}</p>
            </div>
            <div><h4>Pages</h4>${site.nav.map((n) => `<a href="${e(n.href)}">${e(cap(n.label))}</a>`).join('')}</div>
            <div><h4>Contact</h4>${site.links.map((l) => `<a href="${e(l.href)}" target="_blank" rel="noopener">${e(cap(l.label))}</a>`).join('')}</div>
            <div><h4>This site</h4><a href="#themes">Site themes</a><a href="#use-theme-original">Original theme</a></div>
          </div>
          <div class="co-wrap co-legal">© ${year} ${e(site.name)}</div>
        </footer>
      </div>`;

    // mobile menu
    const burger = root.querySelector('.co-burger');
    burger.addEventListener('click', () => {
      const open = root.querySelector('.co-head').classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });
  }

  Theme.register('corporate', {
    modes: ['light', 'dark'],
    fonts: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;800&display=swap',
    mount: render,
  });
})();
