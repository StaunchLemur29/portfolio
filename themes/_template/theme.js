/* =========================================================
   Your theme. Copy this folder, rename it (e.g. themes/vapor/),
   change 'template' below to the same name, then add one line to
   the THEMES list at the top of themes/engine.js. Full guide: themes/README.md

   You get complete control: mount() builds whatever HTML you want
   inside `root`. The page's real content arrives in `site`.
   ========================================================= */
(() => {
  Theme.register('template', {

    // Which colour modes it supports. One value = locked (the light/dark icon hides).
    modes: ['light', 'dark'],

    // Optional: a Google Fonts URL. Loaded only when this theme is picked.
    fonts: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap',

    // Optional: true = links don't reload the page (keeps music/animations going).
    // If you turn this on, also write update() below.
    spa: false,

    // Build your layout. Runs when the theme is picked and on every page load.
    mount(root, site, api) {
      const e = api.esc;   // ALWAYS wrap content in e(...) when putting it in HTML

      root.innerHTML = `
        <div class="tp">
          <header class="tp-head">
            <a href="${e(site.homeHref)}">${e(site.name)}</a>
            <nav>
              ${site.nav.map((n) => `<a href="${e(n.href)}" class="${n.active ? 'is-on' : ''}">${e(n.label)}</a>`).join('')}
            </nav>
            <!-- the Themes, Original and light/dark buttons go wherever you put this -->
            <span data-theme-controls></span>
          </header>

          <main class="tp-main">
            <p>${e(site.label)}</p>
            <h1>${e(site.title)}</h1>
            <p>${e(site.description)}</p>

            <div class="tp-grid">
              ${site.items.map((item) => `
                <article>
                  <img src="${e(item.image || site.sampleImage)}" alt="">
                  <h2>${e(item.title)}</h2>
                  <p>${e(item.text)}</p>
                  <p>${item.tags.map(e).join(' · ')}</p>
                  ${item.href ? `<a href="${e(item.href)}">Open</a>` : ''}
                </article>`).join('')}
            </div>
          </main>

          <footer class="tp-foot">
            ${site.links.map((l) => `<a href="${e(l.href)}">${e(l.label)}</a>`).join('')}
          </footer>
        </div>`;

      // Add any interactivity here (root.addEventListener('click', ...), timers, canvas...)
    },

    // Only needed with spa: true. Called after a link loads the next page's content.
    // update(root, site, api) { ... },

    // Optional: clean up timers, sound, listeners on document/window.
    unmount(root, api) {},

    // Optional: react when light/dark changes (most themes just use CSS for this).
    // onScheme(scheme, root, api) {},
  });
})();
