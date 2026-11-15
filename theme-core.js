/* =========================================================
   theme-core.js: the small part of the theme system that every page loads
   (about 2 KB compressed). It only does three things:
   1. draws the "Themes" button and the light/dark icon in the sidebar
   2. handles light/dark
   3. loads themes/engine.js, but ONLY if a theme is active, someone
      clicks Themes, or they scroll to the theme previews on the Design page.
   Visitors who never touch themes never download the rest.
   ========================================================= */
(() => {
  'use strict';
  const html = document.documentElement;
  const BASE = new URL('.', document.currentScript.src).href;   // the site's root folder

  // ---------- light / dark ----------
  // data-mode = the visitor's own choice (kept). data-scheme = what's showing.
  // Clicking back to whatever the computer uses clears the choice ("auto" again).
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const systemScheme = () => (darkQuery.matches ? 'dark' : 'light');
  let forced = null;            // a theme that's always dark or always light sets this
  let onSchemeChange = null;    // the engine listens here

  function applyScheme() {
    const scheme = forced || html.dataset.mode || systemScheme();
    if (html.dataset.scheme !== scheme) {
      html.dataset.scheme = scheme;
      onSchemeChange?.(scheme);
    }
    // set it on <html> directly too, so nothing outside the site (like a page
    // that embeds it) can pin the colours to light
    html.style.colorScheme = scheme;
    modeButton.hidden = Boolean(forced);
    modeButton.setAttribute('aria-label', scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    modeButton.title = modeButton.getAttribute('aria-label');
  }

  function toggleScheme() {
    if (forced) return;
    const next = html.dataset.scheme === 'dark' ? 'light' : 'dark';
    try {
      if (next === systemScheme()) { delete html.dataset.mode; localStorage.removeItem('mode'); }
      else { html.dataset.mode = next; localStorage.setItem('mode', next); }
    } catch (e) {}
    applyScheme();
  }

  // ---------- the buttons ----------
  const controls = document.createElement('div');
  controls.className = 'theme-controls';
  controls.innerHTML = `
    <button type="button" class="tc-btn tc-themes" aria-haspopup="dialog">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.8 1.7-1.6 0-.5-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5C21 6.5 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="14.5" cy="7" r="1.2"/><circle cx="17" cy="11" r="1.2"/></svg>
      <span>Themes</span>
    </button>
    <button type="button" class="tc-btn tc-original" title="Back to the original site">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
      <span>Original</span>
    </button>
    <button type="button" class="tc-btn tc-mode">
      <svg class="tc-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      <svg class="tc-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>
    </button>`;
  const modeButton = controls.querySelector('.tc-mode');
  modeButton.addEventListener('click', toggleScheme);

  // ---------- loading the engine (only when needed) ----------
  let engine = null;
  function loadEngine() {
    engine ??= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${BASE}themes/engine.js`;
      script.onload = () => resolve(window.SiteThemes);
      script.onerror = () => { html.classList.remove('theme-loading'); reject(new Error('Could not load themes/engine.js')); };
      document.head.append(script);
    });
    return engine;
  }

  const themesButton = controls.querySelector('.tc-themes');
  themesButton.addEventListener('click', () => loadEngine().then((e) => e.openPicker(themesButton)));

  // any link to "#themes" opens the picker (themes use these for "change theme" links)
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href="#themes"]');
    if (!link || engine) return;            // once loaded, the engine handles these itself
    event.preventDefault();
    loadEngine().then((e) => e.openPicker(link));
  });
  controls.querySelector('.tc-original').addEventListener('click', () => loadEngine().then((e) => e.setTheme('original')));

  // ---------- shared with themes/engine.js ----------
  window.SiteThemesCore = {
    BASE,
    controls,
    applyScheme,
    toggleScheme,
    setForced(scheme) { forced = scheme; applyScheme(); },
    onScheme(fn) { onSchemeChange = fn; },
  };

  // ---------- start ----------
  document.getElementById('theme-controls-slot')?.append(controls);
  applyScheme();
  darkQuery.addEventListener('change', applyScheme);
  addEventListener('storage', (event) => {
    if (event.key !== 'mode') return;
    if (event.newValue) html.dataset.mode = event.newValue;
    else delete html.dataset.mode;
    applyScheme();
  });

  // The <head> script sets data-pending-theme when a theme should show.
  if (html.dataset.pendingTheme) loadEngine();

  // The theme previews at the bottom of the Design page need the engine too,
  // but only once someone scrolls near them.
  const themesUI = document.querySelector('[data-themes-ui]');
  if (themesUI && !engine) {
    if ('IntersectionObserver' in window) {
      const watcher = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { watcher.disconnect(); loadEngine(); }
      }, { rootMargin: '300px' });
      watcher.observe(themesUI);
    } else loadEngine();
  }
})();
