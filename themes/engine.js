/* =========================================================
   themes/engine.js: the theme engine. Only downloaded when a theme is
   active, when someone clicks "Themes", or on pages that show themes.

   You don't edit this to MAKE a theme (see themes/README.md + themes/_template).
   You only add your theme to the THEMES list below.

   What it does:
   1. Remembers the chosen theme while the visitor clicks around
      (sessionStorage). A reload goes back to Original (see the <head> script).
   2. Loads a theme's theme.css + theme.js when it's picked.
   3. Reads the page's content into a plain object for the theme to lay out.
   4. Builds the Themes popup and the theme previews on the Design page.
   5. Lets themes keep the page alive between links (music, terminal).
   ========================================================= */
(() => {
  'use strict';

  // ---------- 1. The list of themes ----------
  // Add your own after making its folder in themes/.
  // swatch = 3 colours shown if there's no preview.webp screenshot yet.
  // only = 'Dark' / 'Light' if it has a single colour mode.
  const THEMES = [
    { id: 'original',   group: 'Creative', name: 'Original',     swatch: ['#ecebe7', '#ff4f00', '#161616'],
      short: 'Warm grey, orange, dot-matrix',
      desc: 'The site as it was built: warm grey, orange accent, dot-matrix type and a fixed sidebar.' },
    { id: 'terminal',   group: 'Creative', name: 'Terminal',     swatch: ['#1e1e1e', '#6ad48a', '#61afef'], only: 'Dark',
      short: 'The whole site as a working terminal',
      desc: 'The whole site runs inside a terminal. Type commands like ls, cd and cat, or click' },
    { id: 'aero',       group: 'Creative', name: 'Frutiger 7',   swatch: ['#5cc3f2', '#7fd35c', '#ffffff'],
      short: '2009-inspired desktop with music',
      desc: 'Windows 7 style desktop: each page as its own app on the taskbar' },
    { id: 'pf-01',      group: 'Creative', name: 'PF-01',        swatch: ['#ffffff', '#d8d2c6', '#111111'],
      short: 'Minimalist. Objects and codes',
      desc: 'Minimalist brutalist design: large objects with basic product codes' },
    { id: 'corporate',  group: 'Business', name: 'Corporate',    swatch: ['#ffffff', '#0052cc', '#0b1f3a'],
      short: 'Classic company website',
      desc: 'A classic company site: header with a contact button, split hero, services and a big footer' },
    { id: 'consulting', group: 'Business', name: 'Consultancy',  swatch: ['#f6f2ea', '#14213d', '#b5893b'],
      short: 'Editorial, serif, advisory firm',
      desc: 'An advisory or law firm: centred serif wordmark, a numbered index of work and a pull quote' },
    { id: 'finance',    group: 'Business', name: 'Finance',      swatch: ['#f2f6f3', '#0b5d3b', '#c8f169'],
      short: 'Banking app with a phone mockup',
      desc: 'Modern bank: tabbed header, working phone app mockup, stat cards and a data table' },
    { id: 'saas',       group: 'Business', name: 'SaaS',         swatch: ['#ffffff', '#6a45ff', '#e14bd0'],
      short: 'Startup landing page',
      desc: 'A startup landing page: announcement pill, gradient headline, product shot and a bento grid' },
  ];

  const core = window.SiteThemesCore;
  const html = document.documentElement;
  const BASE = core.BASE;
  const previewMatch = /^#preview-([\w-]+)/.exec(location.hash);
  const isPreview = Boolean(previewMatch);
  const thumb = (id) => `${BASE}themes/${id}/preview.webp`;
  const swatchCSS = (t) => `linear-gradient(135deg, ${t.swatch[0]} 0 40%, ${t.swatch[1]} 40% 70%, ${t.swatch[2]} 70%)`;
  const findTheme = (id) => THEMES.find((t) => t.id === id);


  // ---------- 2. Remembering (this visit only) ----------
  // sessionStorage survives clicking between pages. The <head> script on each
  // page clears it when the visitor reloads, so a reload = Original again.
  function savedTheme() {
    try { return sessionStorage.getItem('theme'); } catch (e) { return null; }
  }
  function saveTheme(id) {
    if (isPreview) return;
    try {
      if (id === 'original') sessionStorage.removeItem('theme');
      else sessionStorage.setItem('theme', id);
    } catch (e) {}
  }


  // ---------- 3. Loading a theme's files ----------
  const registry = {};
  const scriptLoads = {};
  window.Theme = { register(id, definition) { registry[id] = definition; }, themes: THEMES };

  function loadScript(id) {
    if (registry[id]) return Promise.resolve();
    scriptLoads[id] ??= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${BASE}themes/${id}/theme.js`;
      script.onload = () => (registry[id] ? resolve() : reject(new Error(`themes/${id}/theme.js never called Theme.register('${id}', ...)`)));
      script.onerror = () => reject(new Error(`Couldn't load themes/${id}/theme.js`));
      document.head.append(script);
    });
    return scriptLoads[id];
  }

  function loadStylesheet(href, themeId) {
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      if (themeId) link.dataset.theme = themeId;
      link.onload = link.onerror = () => resolve(link);
      document.head.append(link);
    });
  }

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const loadedFonts = new Set();
  function loadFonts(definition) {
    if (!definition.fonts || loadedFonts.has(definition.fonts)) return Promise.resolve();
    loadedFonts.add(definition.fonts);
    return Promise.race([loadStylesheet(definition.fonts), wait(1500)]);
  }


  // ---------- 4. Reading the page ----------
  // Turns the page's HTML into a plain object every theme can use (see themes/README.md).
  function readSite(doc = document) {
    const text = (el, selector) =>
      ((selector ? el?.querySelector(selector) : el)?.textContent || '').replace(/\s+/g, ' ').trim();
    const hrefOf = (a) => {
      const href = a?.getAttribute('href');
      return href && href !== '#' ? href : '';
    };

    const items = [...doc.querySelectorAll('main .project, main [data-item]')].map((el, i) => ({
      index: i + 1,
      title: el.dataset.title || text(el, 'h3'),
      text: el.dataset.text || text(el, 'p'),
      tags: [...el.querySelectorAll('.tag')].map((tag) => text(tag)),
      href: el.dataset.themeChoice
        ? `#use-theme-${el.dataset.themeChoice}`
        : el.dataset.href || hrefOf(el.matches('a') ? el : el.querySelector('a.more')),
      image: el.dataset.image || el.querySelector('img.thumb, .thumb img')?.getAttribute('src') || '',
      theme: el.dataset.themeChoice || '',
      icon: el.dataset.icon || '',                       // <article class="project" data-icon="kiln">
      favourite: el.hasAttribute('data-favourite'),     // <article class="project" data-favourite>
    }));

    const links = [...doc.querySelectorAll('.sidebar .links a')].map((a) => ({
      label: text(a).replace(/\s*↗\s*$/, ''),
      href: hrefOf(a),
    }));

    return {
      page: doc.body.dataset.page || 'page',
      name: text(doc, '.logo'),
      homeHref: hrefOf(doc.querySelector('.logo')) || '/',
      nav: [...doc.querySelectorAll('.nav a')].map((a) => ({
        label: text(a), href: hrefOf(a), active: a.classList.contains('active'),
      })),
      label: text(doc, '.hero .label'),
      title: text(doc, 'main h1'),
      description: text(doc, '.hero .description:not(h1)'),
      items,
      tags: [...new Set(items.flatMap((item) => item.tags))],
      intro: text(doc, '.sidebar .intro'),
      links,
      email: links.find((l) => l.href.startsWith('mailto:'))?.href || '',
      github: links.find((l) => /github/i.test(l.href))?.href || '',
      sampleImage: `${BASE}themes/sample.svg`,
    };
  }


  // ---------- 5. Switching ----------
  let current = null;              // { id, def, root, css } while a theme is active
  let queue = Promise.resolve();
  let chosenNow = false;           // true while mounting a theme the visitor just picked

  function setTheme(id, { save = true, chosen = false } = {}) {
    queue = queue.then(() => switchTo(id, save, chosen));
    return queue;
  }

  // Picking a theme from a picker starts it on the home page.
  // (Already on home? It just switches in place.)
  function chooseTheme(id) {
    const home = new URL(document.querySelector('.logo')?.getAttribute('href') || '/', location.href);
    if (isPreview || document.body.dataset.page === 'home' || !findTheme(id)) return setTheme(id, { chosen: true });
    saveTheme(id);
    location.href = home.href;
    return queue;
  }

  async function switchTo(id, save, chosen) {
    if (!findTheme(id)) id = 'original';
    if ((current?.id || 'original') === id) { if (save) saveTheme(id); return finish(); }

    unmount();
    if (id !== 'original') {
      html.dataset.siteTheme = id;
      try {
        const [, css] = await Promise.all([loadScript(id), loadStylesheet(`${BASE}themes/${id}/theme.css`, id)]);
        await loadFonts(registry[id]);
        chosenNow = chosen;
        mount(id, registry[id], css);
        chosenNow = false;
      } catch (err) {
        console.error('[themes]', err);
        document.querySelectorAll('link[data-theme]').forEach((l) => l.remove());
        unmount();
        id = 'original';
      }
    }
    if (id === 'original') delete html.dataset.siteTheme;
    if (save) saveTheme(id);
    finish();
  }

  function mount(id, def, css) {
    const root = document.createElement('div');
    root.id = 'theme-root';
    root.className = `theme-${id}`;
    document.body.append(root);
    current = { id, def, root, css };
    html.dataset.themeReady = '';        // style.css hides the original page
    core.setForced(def.modes?.length === 1 ? def.modes[0] : null);
    def.mount(root, readSite(), api);
  }

  function unmount() {
    if (!current) return;
    try { current.def.unmount?.(current.root, api); } catch (err) { console.error('[themes]', err); }
    current.root.remove();
    current.css?.remove();
    delete html.dataset.themeReady;
    current = null;
    core.setForced(null);
  }

  function finish() {
    placeControls();
    syncUI();
    delete html.dataset.pendingTheme;
    html.classList.remove('theme-loading');
  }

  core.onScheme((scheme) => {
    try { current?.def.onScheme?.(scheme, current.root, api); } catch (err) { console.error(err); }
  });


  // ---------- 6. Staying on one page between links (themes with spa: true) ----------
  async function navigate(href, { push = true } = {}) {
    const url = new URL(href, location.href);
    if (!current?.def.spa) { location.href = url.href; return; }
    try {
      const res = await fetch(url.href);
      if (!res.ok) throw new Error(res.status);
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      // swap the original page's parts too, so going back to Original shows the right page
      for (const selector of ['.navbar', 'main', '.sidebar']) {
        const fresh = doc.querySelector(selector);
        const old = document.querySelector(selector);
        if (fresh && old) old.replaceWith(document.importNode(fresh, true));
      }
      document.title = doc.title;
      document.body.dataset.page = doc.body.dataset.page || '';
      if (push) { try { history.pushState({ themed: true }, '', url.href); } catch (e) {} }
      enhancePage();
      const site = readSite();
      if (current.def.update) current.def.update(current.root, site, api);
      else { current.root.innerHTML = ''; current.def.mount(current.root, site, api); }
      placeControls();
      syncUI();
    } catch (err) {
      location.href = url.href;
    }
  }

  addEventListener('popstate', () => {
    if (current?.def.spa) navigate(location.href, { push: false });
    else if (history.state?.themed) location.reload();
  });

  function isInternalPage(a, event) {
    if (event.defaultPrevented || event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (a.target && a.target !== '_self') return false;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.hash) return false;
    return /(\.html?|\/|\/[^./]+)$/.test(url.pathname);   // /code, /code.html or /
  }


  // ---------- 7. The Themes popup ----------
  // Styled like the rest of the original site: a flat panel with a screenshot
  // of the theme under your cursor, then a plain numbered list (Creative, then
  // Business). The theme in use is shown in bold.
  // Number keys 1-8 pick a theme straight away; up/down move through the list.
  // Screenshots only load when a row is hovered or focused.
  const pad = (n) => String(n).padStart(2, '0');
  const groups = [...new Set(THEMES.map((t) => t.group))];
  const popover = document.createElement('div');
  popover.id = 'theme-popover';
  popover.className = 'theme-popover';
  popover.setAttribute('popover', '');
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Themes');
  popover.innerHTML = `
    <div class="tp-shot">
      ${THEMES.map((t) => `<img alt="" data-show="${t.id}" data-src="${thumb(t.id)}" style="background:${swatchCSS(t)}">`).join('')}
    </div>
    <p class="tp-caption"><span class="tp-capname"></span> <span class="tp-capdesc"></span></p>
    <div class="tp-list">
      ${groups.map((g) => `
        <p class="tp-group">${g}</p>
        ${THEMES.map((t, i) => (t.group !== g ? '' : `
          <button type="button" class="tp-key" data-theme-choice="${t.id}" data-show="${t.id}" aria-keyshortcuts="${i + 1}">
            <span class="tp-keynum">${pad(i + 1)}</span>
            <span class="tp-keyname">${t.name}</span>
          </button>`)).join('')}`).join('')}
    </div>`;
  document.body.append(popover);

  // show a theme's screenshot and caption
  function preview(id) {
    const t = findTheme(id);
    popover.querySelectorAll('.tp-shot img').forEach((img) => {
      const on = img.dataset.show === id;
      if (on && !img.getAttribute('src')) img.src = img.dataset.src;
      img.classList.toggle('is-on', on);
    });
    popover.querySelector('.tp-capname').textContent = t.name;
    popover.querySelector('.tp-capdesc').textContent = t.short;
  }
  const previewCurrent = () => preview(current?.id || 'original');
  const keys = () => [...popover.querySelectorAll('.tp-key')];

  popover.addEventListener('pointerover', (e) => { const k = e.target.closest('.tp-key'); if (k) preview(k.dataset.show); });
  popover.addEventListener('focusin', (e) => { const k = e.target.closest('.tp-key'); if (k) preview(k.dataset.show); });
  popover.querySelector('.tp-list').addEventListener('pointerleave', () => {
    const focused = document.activeElement?.closest?.('.tp-key');
    focused ? preview(focused.dataset.show) : previewCurrent();
  });

  // number keys pick; arrow keys move up and down the list
  popover.addEventListener('keydown', (event) => {
    if (/^[1-9]$/.test(event.key) && THEMES[event.key - 1]) {
      event.preventDefault();
      closePicker();
      chooseTheme(THEMES[event.key - 1].id);
      return;
    }
    const move = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!move) return;
    event.preventDefault();
    const list = keys();
    const at = Math.max(0, list.indexOf(document.activeElement));
    list[(at + move + list.length) % list.length].focus();
  });

  const hasPopover = Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover');
  if (!hasPopover) html.classList.add('no-popover');

  // A theme can bring its own picker (picker() in its Theme.register). The terminal
  // types `theme`, Frutiger 7 opens Personalization, PF-01 shows its own list.
  // Everything else gets this popup.
  function openPicker(anchor) {
    if (current?.def.picker) {
      try { current.def.picker(current.root, api); return; } catch (err) { console.error('[themes]', err); }
    }
    openGenericPicker(anchor);
  }

  function openGenericPicker(anchor) {
    if (hasPopover) { try { popover.showPopover(); } catch (e) {} }
    else popover.classList.add('is-open');
    previewCurrent();
    placePopover(anchor);
    (popover.querySelector('.tp-key[aria-pressed="true"]') || popover.querySelector('.tp-key'))?.focus({ preventScroll: true });
  }

  // Put the panel next to whatever opened it (above it if there's room, otherwise below).
  function placePopover(anchor) {
    popover.classList.toggle('is-anchored', Boolean(anchor?.getBoundingClientRect));
    if (!anchor?.getBoundingClientRect) return;
    const r = anchor.getBoundingClientRect();
    const w = popover.offsetWidth;
    const h = popover.offsetHeight;
    const gap = 10;
    const left = Math.min(Math.max(12, r.left), innerWidth - w - 12);
    let top = r.top - h - gap;
    if (top < 12) top = Math.min(r.bottom + gap, innerHeight - h - 12);
    popover.style.left = `${left}px`;
    popover.style.top = `${Math.max(12, top)}px`;
  }

  function closePicker() {
    if (hasPopover) { try { popover.hidePopover(); } catch (e) {} }
    else popover.classList.remove('is-open');
  }



  // ---------- 8. Where the buttons go ----------
  // An element with data-theme-controls in the active theme, the original sidebar,
  // or floating in the corner.
  function placeControls() {
    const { controls } = core;
    controls.classList.remove('theme-controls--floating');
    controls.classList.toggle('is-themed', Boolean(current));
    if (isPreview) { controls.remove(); return; }
    const spot = current
      ? current.root.querySelector('[data-theme-controls]')
      : document.getElementById('theme-controls-slot');
    if (spot) spot.append(controls);
    else {
      controls.classList.add('theme-controls--floating');
      (current ? current.root : document.body).append(controls);
    }
  }

  function syncUI() {
    const id = current?.id || 'original';
    document.querySelectorAll('[data-theme-choice]').forEach((el) => {
      const on = el.dataset.themeChoice === id;
      if (el.matches('button')) el.setAttribute('aria-pressed', String(on));
      el.toggleAttribute('data-active', on);
    });
  }


  // ---------- 9. Clicks ----------
  document.addEventListener('click', (event) => {
    const choice = event.target.closest('[data-theme-choice]');
    if (choice) {
      event.preventDefault();
      closePicker();
      chooseTheme(choice.dataset.themeChoice);
      return;
    }
    if (!hasPopover && !event.target.closest('#theme-popover, .tc-themes')) popover.classList.remove('is-open');

    const link = event.target.closest('a[href]');
    if (!link) return;
    if (link.getAttribute('href') === '#themes') { event.preventDefault(); openPicker(link); return; }
    const use = /#use-theme-([\w-]+)$/.exec(link.getAttribute('href'));
    if (use) { event.preventDefault(); chooseTheme(use[1]); return; }
    if (current?.def.spa && isInternalPage(link, event)) {
      event.preventDefault();
      navigate(link.href);
    }
  });


  // ---------- 10. Theme previews at the bottom of the Design page ----------
  // A list of themes beside a little monitor. Hover a theme to see its screenshot,
  // click to use it. Costs one small image per theme, loaded as you hover.
  function enhancePage() {
    const strip = document.querySelector('.theme-strip');
    if (strip && !strip.dataset.ready) setupStrip(strip);
  }

  function setupStrip(strip) {
    strip.dataset.ready = '1';
    const list = strip.querySelector('.strip-list');
    const screen = strip.querySelector('.strip-frame');
    const label = strip.querySelector('.strip-name');
    list.innerHTML = THEMES.map((t, i) => `
      <button type="button" class="tp-row strip-row" data-theme-choice="${t.id}" data-show="${t.id}">
        <span class="tp-num">${pad(i + 1)}</span>
        <span class="tp-text"><span class="tp-name">${t.name}</span><span class="tp-short">${t.short}</span></span>
      </button>`).join('');
    screen.innerHTML = THEMES.map((t) => `
      <img src="${thumb(t.id)}" alt="Screenshot of the ${t.name} theme" data-show="${t.id}" loading="lazy" style="background:${swatchCSS(t)}">`).join('');

    const show = (id) => {
      label.textContent = findTheme(id).name;
      screen.querySelectorAll('img').forEach((img) => {
        const on = img.dataset.show === id;
        if (on) img.loading = 'eager';
        img.classList.toggle('is-on', on);
      });
      list.querySelectorAll('[data-show]').forEach((r) => r.classList.toggle('is-showing', r.dataset.show === id));
    };
    const showCurrent = () => show(current?.id || 'original');
    showCurrent();
    list.addEventListener('pointerover', (e) => { const r = e.target.closest('[data-show]'); if (r) show(r.dataset.show); });
    list.addEventListener('focusin', (e) => { const r = e.target.closest('[data-show]'); if (r) show(r.dataset.show); });
    list.addEventListener('pointerleave', showCurrent);
    list.addEventListener('focusout', (e) => { if (!list.contains(e.relatedTarget)) showCurrent(); });
  }


  // ---------- 11. What themes can use (the `api` argument) ----------
  const api = {
    get preview() { return isPreview; },
    get scheme() { return html.dataset.scheme; },
    get chosen() { return chosenNow; },                // true if the visitor just picked this theme (vs. carried over from the last page)
    themes: THEMES,
    base: BASE,
    thumb,
    navigate,
    setTheme: (id) => chooseTheme(id),
    openPicker,
    openGenericPicker,
    toggleScheme: core.toggleScheme,
    reducedMotion: () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    esc: (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    readSite,
  };

  window.SiteThemes = { setTheme: (id) => chooseTheme(id), openPicker, themes: THEMES };


  // ---------- 12. Start ----------
  if (isPreview) {
    html.dataset.preview = '';
    addEventListener('message', (event) => {
      if (event.source === parent && event.data?.type === 'theme-preview') setTheme(event.data.id, { save: false });
    });
  }

  enhancePage();
  const startId = previewMatch?.[1] || savedTheme() || 'original';
  if (startId !== 'original') setTheme(startId, { save: !isPreview });
  else finish();
  setTimeout(() => html.classList.remove('theme-loading'), 3000);   // never stay hidden
})();
