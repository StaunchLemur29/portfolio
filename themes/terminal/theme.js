/* Terminal: the whole site is a working terminal.
   Commands: help, ls, cd, cat, open, whoami, links, theme, clear, history, exit...
   spa: true keeps the terminal (and its scrollback) alive when you cd between pages. */
(() => {
  const USER = 'visitor@portfolio';
  let t = null;   // everything for the current mount lives here

  // ---------- small helpers ----------
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pad = (s, n) => (s.length >= n ? s.slice(0, n - 1) + '…' : s + ' '.repeat(n - s.length));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function dirs() {
    // every nav page is a folder (themes live behind the [themes] button / `theme` command)
    return t.site.nav.map((n) => ({ name: slug(n.label), href: n.href }));
  }
  const files = () => t.site.items.map((item) => ({ ...item, file: `${String(item.index).padStart(2, '0')}-${slug(item.title)}.md` }));
  const path = () => (t.site.page === 'home' ? '~' : `~/${t.site.page}`);

  function findItem(arg) {
    if (!arg) return null;
    const list = files();
    const n = parseInt(arg, 10);
    return list.find((f) => f.index === n) || list.find((f) => f.file === arg || f.file.startsWith(arg) || slug(f.title) === slug(arg));
  }

  // ---------- output ----------
  function print(htmlString = '', cls = '') {
    const row = document.createElement('div');
    row.className = `term-row ${cls}`;
    row.innerHTML = htmlString;
    t.out.append(row);
    t.screen.scrollTop = t.screen.scrollHeight;
    return row;
  }
  const e = (s) => t.api.esc(s);
  const cmdLink = (cmd, label = cmd) => `<button type="button" class="term-cmd" data-cmd="${e(cmd)}">${e(label)}</button>`;
  const promptHTML = () => `<span class="u">${USER}</span><span class="d">:</span><span class="p">${e(path())}</span><span class="d">$</span>`;

  // ---------- commands ----------
  const COMMANDS = {
    help: { about: 'show this list', run() {
      print('<span class="h">Commands</span>');
      Object.entries(COMMANDS).filter(([, c]) => c.about).forEach(([name, c]) =>
        print(`  ${cmdLink(name)}${' '.repeat(Math.max(1, 10 - name.length))}<span class="dim">${e(c.about)}</span>`));
      print('<span class="dim">Tip: press Tab to complete, ↑ ↓ for history. Everything underlined can be clicked.</span>');
    } },

    ls: { about: 'list this folder', run(args) {
      const long = args.includes('-l') || args.includes('-la');
      const folderRow = (d) => long
        ? `<span class="dim">drwxr-xr-x  visitor </span>${pad('', 22)}${cmdLink(`cd ${d.name}`, d.name + '/')}`
        : cmdLink(`cd ${d.name}`, d.name + '/');
      if (t.site.page === 'home') {
        print(dirs().map(folderRow).join(long ? '<br>' : '   '));
        print(long ? `<span class="dim">-rw-r--r--  visitor </span>${pad('', 22)}${cmdLink('cat README.md', 'README.md')}` : cmdLink('cat README.md', 'README.md'));
        return;
      }
      const list = files();
      if (!list.length) { print('<span class="dim">(empty)</span>'); return; }
      if (!long) { print(list.map((f) => cmdLink(`cat ${f.index}`, f.file)).join('   ')); return; }
      print(`<span class="dim">total ${list.length}</span>`);
      list.forEach((f) => print(
        `<span class="dim">-rw-r--r--  visitor </span><span class="y">${e(pad(f.tags.join(',').toLowerCase() || '-', 22))}</span>${cmdLink(`cat ${f.index}`, f.file)}`));
    } },

    cd: { about: 'go to a folder (cd projects, cd ..)', async run(args) {
      const target = (args[0] || '~').replace(/\/$/, '');
      if (['~', '..', '/', 'home'].includes(target)) return go(t.site.homeHref, '~');
      if (target === 'themes') { COMMANDS.theme.run([]); return; }
      const dir = dirs().find((d) => d.name === target || d.name.startsWith(target));
      if (!dir) { print(`cd: no such file or directory: ${e(target)}`, 'err'); return; }
      return go(dir.href, dir.name);
    } },

    cat: { about: 'read a file (cat 1)', run(args) {
      if (args[0] === 'README.md' || (!args[0] && t.site.page === 'home')) return readme();
      const item = findItem(args.join(' '));
      if (!item) { print(`cat: ${e(args.join(' ') || '?')}: No such file. Try ${cmdLink('ls')}`, 'err'); return; }
      print(`<span class="h"># ${e(item.title)}</span>`);
      if (item.text) print(e(item.text));
      if (item.tags.length) print(`<span class="dim">tags:</span> <span class="y">${e(item.tags.join(', '))}</span>`);
      if (item.href) print(`<span class="dim">link:</span> ${cmdLink(`open ${item.index}`, item.theme ? `use the ${item.title} theme` : item.href)}`);
    } },

    open: { about: 'open a file\'s link (open 1)', run(args) {
      const item = findItem(args.join(' '));
      if (!item) { print(`open: ${e(args.join(' ') || '?')}: No such file`, 'err'); return; }
      if (!item.href) { print(`open: ${e(item.file)} has no link yet`, 'err'); return; }
      followLink(item.href);
    } },

    whoami: { about: 'about me', run() { print(e(t.site.intro || t.site.name)); } },

    links: { about: 'github + email', run() {
      t.site.links.forEach((l) => print(`${pad(l.label.toLowerCase(), 10)}<a class="term-link" href="${e(l.href)}" target="_blank" rel="noopener">${e(l.href.replace(/^mailto:/, ''))}</a>`));
    } },

    theme: { about: 'change the site theme (theme original)', run(args) {
      const want = args.join(' ').toLowerCase();
      if (!want) {
        t.api.themes.forEach((d) => print(`  ${cmdLink(`theme ${d.id}`, pad(d.id, 12))}<span class="dim">${e(d.short)}</span>`));
        print(`<span class="dim">Click one, or type</span> theme <span class="dim">&lt;name&gt;</span>`);
        return;
      }
      const d = t.api.themes.find((x) => x.id === want || x.name.toLowerCase() === want);
      if (!d) { print(`theme: unknown theme '${e(want)}'`, 'err'); return; }
      print(`<span class="dim">switching to ${e(d.name)}…</span>`);
      setTimeout(() => t.api.setTheme(d.id), 300);
    } },

    home: { about: 'back to the start (same as cd ~)', run() { return t.site.page === 'home' ? (t.out.innerHTML = '', neofetch()) : go(t.site.homeHref, '~'); } },
    neofetch: { about: 'system info', run() { neofetch(); } },
    clear: { about: 'clear the screen', run() { t.out.innerHTML = ''; } },
    history: { about: 'commands you\'ve typed', run() { t.history.forEach((h, i) => print(`<span class="dim">${String(i + 1).padStart(4)}</span>  ${e(h)}`)); } },
    pwd: { run() { print(e(path().replace('~', '/home/visitor'))); } },
    date: { run() { print(e(new Date().toString())); } },
    echo: { run(args) { print(e(args.join(' '))); } },
    sudo: { run() { print('visitor is not in the sudoers file. This incident will be reported.', 'err'); } },
    exit: { about: 'leave the terminal (back to Original)', run() { print('<span class="dim">logout</span>'); setTimeout(() => t.api.setTheme('original'), 400); } },
  };
  COMMANDS.dir = COMMANDS.ls;
  COMMANDS.design = COMMANDS.theme;
  COMMANDS.themes = COMMANDS.theme;
  COMMANDS.about = COMMANDS.whoami;
  COMMANDS.contact = COMMANDS.links;

  function readme() {
    print(`<span class="h"># ${e(t.site.title || t.site.name)}</span>`);
    if (t.site.description) print(e(t.site.description));
  }

  function neofetch() {
    const art = [
      '████████ ███████',
      '   ██    ██     ',
      '   ██    █████  ',
      '   ██    ██     ',
      '   ██    ██     ',
    ].join('\n');
    const rows = [
      `<span class="u">${USER}</span>`,
      '<span class="dim">────────────────</span>',
      `<span class="y">owner</span>   ${e(t.site.name)}`,
      `<span class="y">about</span>   ${e(t.site.intro)}`,
      `<span class="y">folders</span> ${dirs().map((d) => cmdLink(`cd ${d.name}`, d.name + '/')).join(' ')}`,
      `<span class="y">links</span>   ${t.site.links.map((l) => `<a class="term-link" href="${e(l.href)}" target="_blank" rel="noopener">${e(l.label.toLowerCase())}</a>`).join(' ')}`,
      `<span class="y">theme</span>   terminal ${cmdLink('theme', '(change)')} ${cmdLink('exit', '(back to original)')}`,
      `<span class="swatches">${['#e06c75', '#e5c07b', '#6ad48a', '#56b6c2', '#61afef', '#c678dd'].map((c) => `<i style="background:${c}"></i>`).join('')}</span>`,
    ];
    print(`<div class="neo"><pre class="neo-art">${art}</pre><div class="neo-info">${rows.map((r) => `<div>${r}</div>`).join('')}</div></div>`);
    if (t.site.title) print(`<span class="dim">bio:</span> ${e(t.site.title)}`);
  }

  // ---------- navigation ----------
  async function go(href, name) {
    if (!href) return;
    t.pendingCd = name;
    await t.api.navigate(href);     // design-core calls update() when the page is in
  }

  function followLink(href) {
    if (href.startsWith('#use-theme-')) { t.api.setTheme(href.slice(11)); return; }
    if (/^(https?:|mailto:)/.test(href) && !href.startsWith(location.origin)) {
      const a = Object.assign(document.createElement('a'), { href, target: '_blank', rel: 'noopener' });
      a.click();
      return;
    }
    t.api.navigate(href);
  }

  // ---------- running + typing ----------
  async function run(line, { echo = true } = {}) {
    line = line.trim();
    if (echo) print(`${promptHTML()} <span class="typed">${e(line)}</span>`);
    if (!line) return;
    const [name, ...args] = line.split(/\s+/);
    const cmd = COMMANDS[name.toLowerCase()];
    const before = t.out.children.length;
    if (!cmd) print(`zsh: command not found: ${e(name)}. Try ${cmdLink('help')}`, 'err');
    else await cmd.run(args);
    if (t) stream(before);
  }

  // New output types itself out, line after line, like a real terminal printing.
  function stream(from) {
    if (t.api.preview) return;
    [...t.out.children].slice(from).forEach((row, i) => {
      row.style.animationDelay = `${i * 55}ms`;
      row.classList.add('term-in');
    });
  }

  // Types a command into the prompt like a person, then runs it.
  async function typeAndRun(line) {
    if (t.api.preview) { await run(line); return; }
    t.busy = true;
    t.input.value = '';
    for (const ch of line) {
      if (!t) return;
      t.input.value += ch;
      await sleep(22 + Math.random() * 30);
    }
    await sleep(120);
    t.input.value = '';
    t.busy = false;
    await run(line);
  }

  async function showPage(first) {
    t.title.textContent = `${USER}: ${path()} — zsh — ${t.cols}×${t.rows}`;
    t.promptEl.innerHTML = promptHTML();
    const seq = ++t.seq;

    if (first && !t.api.preview && !sessionStorage.getItem('term-login')) {
      print(`<span class="dim">Last login: ${e(new Date(Date.now() - 864e5).toString().slice(0, 24))} on ttys001</span>`);
      sessionStorage.setItem('term-login', '1');
    }
    if (t.pendingCd) { t.pendingCd = null; }

    if (t.site.page === 'home') await typeAndRun('neofetch');
    else {
      await typeAndRun('cat README.md');
      if (seq !== t.seq) return;
      if (t.site.items.length) await typeAndRun('ls -l');
      if (seq === t.seq) print(`<span class="dim">↩</span> ${cmdLink('cd ~', 'cd ~')} <span class="dim">to go home</span>`);
    }
    if (seq !== t.seq) return;
    if (!sessionStorage.getItem('term-hint')) {
      print(`<span class="dim">Type</span> ${cmdLink('help')} <span class="dim">or click anything underlined.</span>`);
      sessionStorage.setItem('term-hint', '1');
    }
    if (!t.api.preview && matchMedia('(pointer: fine)').matches) t.input.focus({ preventScroll: true });
  }

  // ---------- tab completion ----------
  function complete() {
    const value = t.input.value;
    const parts = value.split(/\s+/);
    let options;
    if (parts.length <= 1) options = Object.keys(COMMANDS);
    else {
      const cmd = parts[0];
      if (cmd === 'cd') options = [...dirs().map((d) => d.name + '/'), '..'];
      else if (['cat', 'open'].includes(cmd)) options = [...files().map((f) => f.file), 'README.md'];
      else if (['design', 'theme', 'themes'].includes(cmd)) options = t.api.themes.map((d) => d.id);
      else return;
    }
    const word = parts[parts.length - 1];
    const matches = options.filter((o) => o.startsWith(word));
    if (matches.length === 1) {
      parts[parts.length - 1] = matches[0];
      t.input.value = parts.join(' ') + (parts.length === 1 ? ' ' : '');
    } else if (matches.length > 1) {
      print(`${promptHTML()} <span class="typed">${e(value)}</span>`);
      print(matches.map((m) => `<span class="p">${e(m)}</span>`).join('   '));
    }
  }

  // ---------- the theme ----------
  Theme.register('terminal', {
    modes: ['dark'],          // always dark: the light/dark button hides itself
    spa: true,                // keep the terminal alive between pages

    mount(root, site, api) {
      root.innerHTML = `
        <div class="term">
          <header class="term-bar">
            <span class="term-lights">
              <button type="button" class="term-close" data-theme-choice="original" title="Close the terminal (back to the original site)" aria-label="Close the terminal and go back to the original site"></button><i></i><i></i>
            </span>
            <span class="term-title"></span>
            <span class="term-tools" data-theme-controls></span>
          </header>
          <div class="term-screen">
            <div class="term-out" role="log" aria-live="polite"></div>
            <form class="term-line" autocomplete="off">
              <label class="term-prompt" for="term-input"></label>
              <input id="term-input" class="term-input" type="text" spellcheck="false"
                     autocapitalize="off" autocorrect="off" enterkeyhint="go" aria-label="Type a command">
            </form>
          </div>
        </div>`;

      t = {
        site, api, seq: 0, busy: false,
        out: root.querySelector('.term-out'),
        screen: root.querySelector('.term-screen'),
        input: root.querySelector('.term-input'),
        promptEl: root.querySelector('.term-prompt'),
        title: root.querySelector('.term-title'),
        history: JSON.parse(sessionStorage.getItem('term-history') || '[]'),
        hIndex: -1, cols: 120, rows: 40,
      };
      const measure = () => {
        t.cols = Math.floor(t.screen.clientWidth / 8.4);
        t.rows = Math.floor(t.screen.clientHeight / 21);
        t.title.textContent = `${USER}: ${path()} — zsh — ${t.cols}×${t.rows}`;
      };
      t.resize = new ResizeObserver(measure);
      t.resize.observe(t.screen);

      root.querySelector('.term-line').addEventListener('submit', (ev) => {
        ev.preventDefault();
        if (t.busy) return;
        const line = t.input.value;
        t.input.value = '';
        if (line.trim()) {
          t.history.push(line.trim());
          t.history = t.history.slice(-100);
          sessionStorage.setItem('term-history', JSON.stringify(t.history));
        }
        t.hIndex = -1;
        run(line);
      });

      t.input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Tab') { ev.preventDefault(); complete(); }
        else if (ev.key === 'ArrowUp' && t.history.length) {
          ev.preventDefault();
          t.hIndex = t.hIndex < 0 ? t.history.length - 1 : Math.max(0, t.hIndex - 1);
          t.input.value = t.history[t.hIndex];
        } else if (ev.key === 'ArrowDown' && t.hIndex >= 0) {
          ev.preventDefault();
          t.hIndex += 1;
          if (t.hIndex >= t.history.length) { t.hIndex = -1; t.input.value = ''; }
          else t.input.value = t.history[t.hIndex];
        } else if (ev.key === 'l' && ev.ctrlKey) { ev.preventDefault(); t.out.innerHTML = ''; }
      });

      // clicking a command runs it; clicking empty space focuses the prompt
      t.screen.addEventListener('click', (ev) => {
        const cmd = ev.target.closest('[data-cmd]');
        if (cmd) { if (!t.busy) typeAndRun(cmd.dataset.cmd); return; }
        if (!ev.target.closest('a') && !getSelection().toString()) t.input.focus({ preventScroll: true });
      });

      // Picked just now from a theme picker on another page? Start at home (neofetch).
      if (api.chosen && site.page !== 'home') { t.firstLogin = true; go(site.homeHref, '~'); }
      else showPage(true);
    },

    // The [themes] button types `theme` here instead of opening the standard popup.
    picker() {
      if (t && !t.busy) typeAndRun('theme');
    },

    // called after `cd` (or any link) when the new page has loaded
    update(root, site) {
      t.site = site;
      showPage(Boolean(t.firstLogin));
      t.firstLogin = false;
    },

    unmount() {
      t?.resize.disconnect();
      t = null;
    },
  });
})();
