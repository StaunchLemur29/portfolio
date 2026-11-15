# Making your own theme

Every theme is a folder in `themes/` with two files and a screenshot. The site's content
stays in the normal HTML pages; a theme reads that content and builds its own layout from it.

Everything lives in this folder. The only other file is `theme-core.js` in the site root
(the 2 KB part every page loads), plus a few lines in each page's `<head>`.

```
themes/
  README.md                    ← this guide
  engine.js                    ← the theme engine (only loads when a theme is used)
  sample.svg                   ← placeholder for projects without a screenshot
  screenshot_themes.py         ← makes preview.webp for each theme
  terminal/   theme.css  theme.js  preview.webp
  aero/       theme.css  theme.js  preview.webp
  _template/  theme.css  theme.js               ← copy this one
  _example/   index.html                        ← the example site screenshots are taken of
```

## Make one in 5 steps

1. Copy `themes/_template` to `themes/<name>` (lowercase, no spaces, e.g. `themes/vapor`).
2. In `theme.js`, change `Theme.register('template', ...)` to `Theme.register('vapor', ...)`.
   In `theme.css`, replace `template` with `vapor` (in the selectors and `data-site-theme`).
3. Add one line to the `THEMES` list at the top of `themes/engine.js`:
   ```js
   { id: 'vapor', group: 'Creative', name: 'Vaporwave', swatch: ['#ff71ce', '#01cdfe', '#05ffa1'],
     short: 'Pink, teal, 1995.', desc: 'A longer sentence about the theme.' },
   ```
4. While you work, open any page with `#preview-vapor` on the end, e.g. `projects.html#preview-vapor`.
   It shows your theme without saving it. (Close and reopen the tab to see changes, since a
   change to just the `#...` part doesn't reload.)
5. Make its thumbnail: `python themes/screenshot_themes.py vapor` (see below).

It now appears in the Themes popup and in the theme list at the bottom of the Design page.
Until it has a `preview.webp`, those show its three swatch colours instead.

## What `mount(root, site, api)` gets

`root` is an empty `<div id="theme-root">` that covers the page. Put your HTML in it.

`site` is the page's content:

| Field | What it is |
|---|---|
| `site.page` | `home`, `code`, `hardware` or `design` (from `<body data-page>`) |
| `site.name` | "Thomas Fitzgerald" (the logo text) |
| `site.homeHref` | link to the home page |
| `site.nav` | `[{ label, href, active }]` from the top nav |
| `site.label` | the small label above the heading, e.g. "projects / 03" |
| `site.title` | the page's `<h1>` |
| `site.description` | the paragraph under the heading |
| `site.items` | `[{ index, title, text, tags, href, image, theme, favourite }]`, one per project card |
| `site.tags` | every tag on the page, no repeats |
| `site.intro` | the sidebar intro text |
| `site.links` | `[{ label, href }]` from the sidebar (GitHub, Email) |
| `site.email`, `site.github` | those two links on their own |
| `site.sampleImage` | placeholder image for items with no screenshot |

`api` is what you can do:

| | |
|---|---|
| `api.esc(text)` | makes text safe to put in HTML. Use it on all content. |
| `api.navigate(href)` | go to another page (without a reload if `spa: true`) |
| `api.setTheme(id)` | switch theme, e.g. `api.setTheme('original')` |
| `api.openPicker()` | open the Themes picker (yours, if you wrote `picker()`) |
| `api.toggleScheme()` | flip light/dark |
| `api.scheme` | `'light'` or `'dark'` right now |
| `api.preview` | `true` in a preview/screenshot, so skip sound and intros |
| `api.chosen` | `true` while mounting a theme the visitor just picked (e.g. the terminal then starts at home) |
| `api.reducedMotion()` | `true` if the visitor asked for less animation |
| `api.themes` | the `THEMES` list |
| `api.thumb(id)` | the screenshot URL for a theme |

## Options on `Theme.register`

| Option | |
|---|---|
| `modes: ['light', 'dark']` | which colour modes you support. Give one to lock it. |
| `fonts: 'https://fonts.googleapis.com/...'` | loaded only when your theme is picked |
| `spa: true` | links swap the content in place instead of reloading. Needs `update()`. Use it for music or anything that should keep running. |
| `update(root, site, api)` | called with the new page's content after a link (spa only) |
| `unmount(root, api)` | clean up timers, audio, and listeners you added to `document` or `window` |
| `onScheme(scheme, root, api)` | runs when light/dark changes |
| `picker(root, api)` | your own theme picker for the Themes button. Leave it out to use the standard popup. |

## Rules of thumb

- Put `<span data-theme-controls></span>` somewhere in your layout. The Themes button, the
  Original button (back to the normal site) and the light/dark icon move there. Leave it out
  and they float in the bottom-right corner. Every theme needs a way back, so keep it visible.
- Start every CSS rule with `.theme-<name>` so nothing leaks into other themes.
- Use `html[data-site-theme="<name>"] body { background: ... }` for the page background.
- Use `:root[data-scheme="dark"] .theme-<name> { ... }` for dark mode.
- Adding a screenshot to a project (an `<img>` inside its `.thumb`) makes it show up in
  every theme automatically.
- Mark a project as a favourite with `<article class="project" data-favourite>`. Themes get
  `item.favourite` (Frutiger 7 shows these in its Favourites folder).
- A link to `#themes` (`<a href="#themes">`) opens the Themes picker from anywhere.

## Screenshots

`themes/screenshot_themes.py` opens the example site (`themes/_example/index.html`) in each
theme and saves `themes/<id>/preview.webp` (960×600, about 15–25 KB each).

```
pip install playwright pillow
```
```
playwright install chromium
```
```
python themes/screenshot_themes.py
```

## How long a choice lasts

A theme follows the visitor from page to page (it's kept in `sessionStorage`). Reloading the
page, closing the tab or coming back later goes back to Original: the small script in each
page's `<head>` clears it on a reload. Light/dark is kept for good, because that's a preference
people expect a site to remember.

## Performance

Visitors who never touch themes only load `theme-core.js` (about 2 KB compressed).
`themes/engine.js` and a theme's own files only download when someone picks a theme, opens the
Themes popup, or scrolls down to the theme list on the Design page.
