// Smoke tests for the site's main actions: every page loads cleanly, the nav
// works, light/dark toggles and sticks, the Themes picker opens and applies a
// theme, and project cards link somewhere real.
const { test, expect } = require('@playwright/test');

const PAGES = [
  { path: '/index.html', page: 'home', title: /Portfolio/ },
  { path: '/code.html', page: 'code', title: /Code/ },
  { path: '/hardware.html', page: 'hardware', title: /Hardware/ },
  { path: '/design.html', page: 'design', title: /Design/ },
];

// Every theme the engine lists except Original (which is the plain site).
const THEMES = ['terminal', 'aero', 'pf-01', 'corporate', 'consulting', 'finance', 'saas'];

// Collect JS errors and broken same-site files (404 CSS, images, scripts...).
// Outside requests (Google Fonts etc.) are ignored so a flaky CDN can't fail a deploy.
function watchForProblems(page) {
  const problems = [];
  page.on('pageerror', (err) => problems.push(`JS error: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/fonts\.(googleapis|gstatic)\.com/.test(msg.text())) {
      problems.push(`console.error: ${msg.text()}`);
    }
  });
  page.on('response', (res) => {
    const url = new URL(res.url());
    if (url.hostname === '127.0.0.1' && res.status() >= 400) {
      problems.push(`${res.status()} ${url.pathname}`);
    }
  });
  return problems;
}

test.describe('pages', () => {
  for (const p of PAGES) {
    test(`${p.path} loads without errors`, async ({ page }) => {
      const problems = watchForProblems(page);
      await page.goto(p.path);
      await expect(page).toHaveTitle(p.title);
      await expect(page.locator('body')).toHaveAttribute('data-page', p.page);
      await expect(page.locator('header.navbar .logo')).toBeVisible();
      await expect(page.locator('.hero')).toBeVisible();
      await expect(page.locator('.theme-controls .tc-themes')).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(problems).toEqual([]);
    });
  }

  test('every image on every page actually loads', async ({ page }) => {
    for (const p of PAGES) {
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');
      const broken = await page.$$eval('img', (imgs) =>
        imgs.filter((i) => i.getAttribute('src') && (!i.complete || i.naturalWidth === 0)).map((i) => i.src),
      );
      expect(broken, `broken images on ${p.path}`).toEqual([]);
    }
  });
});

test.describe('navigation', () => {
  test('nav links go to each section and mark it active', async ({ page }) => {
    await page.goto('/index.html');
    for (const [label, file] of [['CODE', 'code.html'], ['HARDWARE', 'hardware.html'], ['DESIGN', 'design.html']]) {
      await page.locator('.nav a', { hasText: label }).click();
      await expect(page).toHaveURL(new RegExp(`${file}$`));
      await expect(page.locator('.nav a.active')).toHaveText(label);
    }
    await page.locator('.logo').click();
    await expect(page).toHaveURL(/index\.html$/);
  });

  test('internal links on every page point at files that exist', async ({ page, request }) => {
    const seen = new Set();
    for (const p of PAGES) {
      await page.goto(p.path);
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
      for (const href of hrefs) {
        const url = new URL(href);
        if (url.hostname !== '127.0.0.1' || url.hash || seen.has(url.pathname)) continue;
        seen.add(url.pathname);
        const res = await request.get(url.pathname);
        expect(res.status(), `${url.pathname} linked from ${p.path}`).toBeLessThan(400);
      }
    }
  });

  test('project cards with a real link have an http(s) URL', async ({ page }) => {
    for (const p of PAGES.slice(1)) {
      await page.goto(p.path);
      const links = await page.$$eval('.project .more', (as) => as.map((a) => a.getAttribute('href')));
      expect(links.length, `cards on ${p.path}`).toBeGreaterThan(0);
      for (const href of links.filter((h) => h !== '#')) {
        expect(href, `card link on ${p.path}`).toMatch(/^https?:\/\//);
      }
    }
  });
});

test.describe('light / dark', () => {
  test('toggle flips the scheme and remembers it across pages', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/index.html');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-scheme', 'light');

    const bgBefore = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.locator('.tc-mode').click();
    await expect(html).toHaveAttribute('data-scheme', 'dark');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(bgBefore);
    expect(await page.evaluate(() => localStorage.getItem('mode'))).toBe('dark');

    await page.locator('.nav a', { hasText: 'CODE' }).click();
    await expect(html).toHaveAttribute('data-scheme', 'dark');

    // clicking back to what the system uses clears the saved choice
    await page.locator('.tc-mode').click();
    await expect(html).toHaveAttribute('data-scheme', 'light');
    expect(await page.evaluate(() => localStorage.getItem('mode'))).toBeNull();
  });
});

test.describe('themes', () => {
  test('Themes button opens the picker and choosing a theme applies it', async ({ page }) => {
    const problems = watchForProblems(page);
    await page.goto('/index.html');
    await page.locator('.tc-themes').click();
    const picker = page.locator('#theme-popover');
    await expect(picker).toBeVisible();
    await expect(picker.locator('.tp-key')).toHaveCount(THEMES.length + 1);

    await picker.locator('[data-theme-choice="corporate"]').click();
    await expect(page.locator('#theme-root.theme-corporate')).toBeAttached();
    await expect(page.locator('html')).toHaveAttribute('data-site-theme', 'corporate');

    // reload goes back to the original site
    await page.reload();
    await expect(page.locator('#theme-root')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('picking a theme on another page takes you home with it on', async ({ page }) => {
    await page.goto('/code.html');
    await page.locator('.tc-themes').click();
    await page.locator('#theme-popover [data-theme-choice="saas"]').click();
    await expect(page).toHaveURL(/index\.html$/);
    await expect(page.locator('#theme-root.theme-saas')).toBeAttached();
  });

  for (const id of THEMES) {
    test(`theme "${id}" mounts without errors`, async ({ page }) => {
      const problems = watchForProblems(page);
      await page.goto(`/index.html#preview-${id}`);
      await expect(page.locator(`#theme-root.theme-${id}`)).toBeAttached();
      await expect(page.locator('html')).toHaveAttribute('data-theme-ready', '');
      await expect(page.locator('html')).not.toHaveClass(/theme-loading/);
      const text = await page.locator('#theme-root').innerText();
      expect(text.trim().length, 'theme rendered some content').toBeGreaterThan(0);
      expect(problems).toEqual([]);
    });
  }

  test('Design page theme strip loads when scrolled to', async ({ page }) => {
    await page.goto('/design.html');
    await page.locator('[data-themes-ui]').scrollIntoViewIfNeeded();
    await expect(page.locator('.strip-list .strip-row').first()).toBeVisible();
  });
});
