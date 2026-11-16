/* Frutiger 7: a Windows 7 style desktop in the Frutiger Aero look.
   Every page is its own app with its own taskbar button:
     Home     -> a 2008 web browser showing a Web 2.0 homepage
     Code     -> a file explorer (large icons, details pane, search)
     Hardware -> a control panel (categories + properties dialogs)
     Design   -> a photo gallery (viewer, slide show, "Edit in Paint")
     Paint    -> its own app: draw on a picture from the gallery, or a blank page
     Themes   -> Personalization (the Themes button opens it too)
   The start orb opens the user menu: the sidebar's intro + links, Themes, and
   "Shut down", which goes back to the original site.
   Background music is generated live (Web Audio), so there are no audio files.
   spa: true keeps windows open and the music playing between pages.
   App icons: Oxygen icon theme (KDE, LGPL), see themes/aero/icons/README.txt. */
(() => {
  let w = null;   // everything for the current mount

  // ======================= MUSIC =======================
  // Soft pads, a glassy bell arpeggio, round bass, a quiet shaker and the odd
  // bubble. Starts on the first click (browsers need one), pauses in background tabs.
  class AeroMusic {
    constructor() { this.ctx = null; this.playing = false; this.step = 0; this.timer = null; }

    build() {
      const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(ctx.createDynamicsCompressor()).connect(ctx.destination);

      // reverb from a generated impulse (decaying noise = a big glassy room)
      this.reverb = ctx.createConvolver();
      const len = ctx.sampleRate * 2.8;
      const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
      }
      this.reverb.buffer = impulse;
      const wet = ctx.createGain();
      wet.gain.value = 0.45;
      this.reverb.connect(wet).connect(this.master);

      this.delay = ctx.createDelay();
      this.delay.delayTime.value = 0.375;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.32;
      this.delay.connect(feedback).connect(this.delay);
      this.delay.connect(this.master);
      this.delay.connect(this.reverb);

      this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
      const n = this.noise.getChannelData(0);
      for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
    }

    hz(note) { return 440 * 2 ** ((note - 69) / 12); }

    out(node, dry = 0.6, verb = 0.5) {
      const d = this.ctx.createGain(); d.gain.value = dry;
      const v = this.ctx.createGain(); v.gain.value = verb;
      node.connect(d).connect(this.master);
      node.connect(v).connect(this.reverb);
    }

    pad(notes, time, length) {
      const ctx = this.ctx;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1500;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(0.05, time + 1.2);
      env.gain.setValueAtTime(0.05, time + length - 0.8);
      env.gain.linearRampToValueAtTime(0, time + length + 1.2);
      filter.connect(env);
      this.out(env, 0.5, 0.8);
      notes.forEach((note) => [-6, 6].forEach((detune) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = this.hz(note);
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(time);
        osc.stop(time + length + 1.4);
      }));
    }

    bell(note, time, volume = 0.07) {
      const ctx = this.ctx;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(volume, time + 0.005);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 1.1);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) { pan.pan.value = Math.random() * 0.8 - 0.4; env.connect(pan); }
      const node = pan || env;
      node.connect(this.delay);
      this.out(node, 0.5, 0.4);
      [[1, 1], [3.01, 0.18], [5.4, 0.05]].forEach(([ratio, gain]) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.value = this.hz(note) * ratio;
        g.gain.value = gain;
        osc.connect(g).connect(env);
        osc.start(time);
        osc.stop(time + 1.2);
      });
    }

    bass(note, time) {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.frequency.value = this.hz(note);
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(0.16, time + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);
      osc.connect(env);
      this.out(env, 0.9, 0.1);
      osc.start(time);
      osc.stop(time + 1.3);
    }

    shaker(time, volume) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7000;
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(volume, time);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
      src.connect(hp).connect(env);
      this.out(env, 0.7, 0.2);
      src.start(time);
      src.stop(time + 0.1);
    }

    bubble(time, volume = 0.05) {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      const start = 300 + Math.random() * 300;
      osc.frequency.setValueAtTime(start, time);
      osc.frequency.exponentialRampToValueAtTime(start * 3.2, time + 0.12);
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(volume, time + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
      osc.connect(env);
      this.out(env, 0.4, 0.7);
      osc.start(time);
      osc.stop(time + 0.2);
    }

    // Cmaj9 -> Am9 -> Fmaj9 -> G6/9: bright and optimistic
    static CHORDS = [
      { bass: 36, pad: [60, 64, 67, 71], arp: [72, 76, 79, 83, 74, 79] },
      { bass: 33, pad: [57, 60, 64, 67], arp: [69, 72, 76, 79, 71, 76] },
      { bass: 29, pad: [53, 57, 60, 64], arp: [69, 72, 76, 77, 79, 72] },
      { bass: 31, pad: [55, 59, 62, 64], arp: [67, 71, 74, 76, 79, 74] },
    ];
    static PATTERN = [0, 2, 1, 3, 2, 4, 3, 5];

    schedule() {
      const eighth = 60 / 96 / 2;
      while (this.nextTime < this.ctx.currentTime + 0.3) {
        const chord = AeroMusic.CHORDS[Math.floor(this.step / 8) % AeroMusic.CHORDS.length];
        const pos = this.step % 8;
        const time = this.nextTime;
        if (pos === 0) { this.pad(chord.pad, time, eighth * 8); this.bass(chord.bass, time); }
        if (pos === 5) this.bass(chord.bass + 12, time);
        if (Math.random() > 0.18) this.bell(chord.arp[AeroMusic.PATTERN[pos]], time, pos % 2 ? 0.045 : 0.07);
        this.shaker(time, pos % 2 ? 0.02 : 0.008);
        if (Math.random() < 0.05) this.bubble(time + eighth / 2);
        this.nextTime += eighth;
        this.step += 1;
      }
    }

    async start() {
      if (!this.ctx) this.build();
      await this.ctx.resume();
      if (this.playing) return;
      this.playing = true;
      this.nextTime = this.ctx.currentTime + 0.1;
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 2);
      this.timer = setInterval(() => this.schedule(), 100);
    }

    stop() {
      if (!this.ctx || !this.playing) return;
      this.playing = false;
      clearInterval(this.timer);
      this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    }

    blip(high = false) { if (this.playing) this.bell(high ? 96 : 91, this.ctx.currentTime, 0.025); }

    destroy() { this.stop(); this.ctx?.close(); this.ctx = null; }
  }

  // ======================= WALLPAPER =======================
  // A painted landscape on a canvas: sky, clouds, hills, a lake that reflects
  // them, and a grassy bank in front. Day: sun, light rays, glints on the water.
  // Night: moon, stars and an aurora. Clouds drift, the water ripples and the
  // grass sways; it all holds still for reduced motion and in previews.
  // Layout uses a fixed seed, so the scene looks the same on every visit.
  function startScene(canvas, api) {
    const ctx = canvas.getContext('2d');
    const html = document.documentElement;
    const still = api.reducedMotion() || api.preview;
    const PI = Math.PI;
    const seeded = (s) => () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const layer = (w, h) => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w * dpr));
      c.height = Math.max(1, Math.ceil(h * dpr));
      const x = c.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      return [c, x];
    };
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

    let W = 0, H = 0, dpr = 1, night = false;
    let hz = 0;            // horizon: where the lake starts
    let sun = { x: 0, y: 0 };
    let L = {};            // pre-drawn layers
    let clouds = [], stars = [], blades = [], glints = [];
    let frame = 0, last = 0, t = 0;

    // ---- shapes (u = 0..1 across the screen) ----
    const bankRidge = (u) => H * (0.775 + 0.155 * smooth(0, 0.9, u) - 0.03 * Math.max(0, (u - 0.85) / 0.15) ** 2 + 0.006 * Math.sin(u * 9 + 0.5));
    const ridgePath = (c, fn, bottom) => {
      c.beginPath();
      c.moveTo(-2, bottom);
      for (let x = -2; x <= W + 2; x += 4) c.lineTo(x, fn(x / W));
      c.lineTo(W + 2, bottom);
      c.closePath();
    };
    const ridgeLine = (c, fn, dy = 0) => {
      c.beginPath();
      for (let x = -2; x <= W + 2; x += 4) c[x === -2 ? 'moveTo' : 'lineTo'](x, fn(x / W) + dy);
    };

    // ---- value noise (seeded) ----
    function makeNoise(rnd) {
      const perm = new Uint8Array(512);
      for (let i = 0; i < 256; i++) perm[i] = i;
      for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
      for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
      const hash = (x, y) => perm[(perm[x & 255] + (y & 255)) & 511] / 255;
      const noise = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
      };
      const fbm = (x, y, oct = 5) => { let s = 0, a = 0.5, n = 0; for (let o = 0; o < oct; o++) { s += a * noise(x, y); n += a; x *= 2.03; y *= 2.03; a *= 0.5; } return s / n; };
      return { noise, fbm };
    }

    // Multiply the colour of every drawn pixel in a rectangle by fn(x, y) (CSS px).
    function texture(c, x0, y0, w, h, fn) {
      const X = Math.max(0, Math.floor(x0 * dpr)), Y = Math.max(0, Math.floor(y0 * dpr));
      const cw = Math.min(c.canvas.width - X, Math.ceil(w * dpr)), ch = Math.min(c.canvas.height - Y, Math.ceil(h * dpr));
      if (cw <= 0 || ch <= 0) return;
      const img = c.getImageData(X, Y, cw, ch), d = img.data;
      for (let py = 0; py < ch; py++) {
        const y = (Y + py) / dpr;
        for (let px = 0; px < cw; px++) {
          const i = (py * cw + px) * 4;
          if (d[i + 3] === 0) continue;
          const f = fn((X + px) / dpr, y);
          if (f === 1) continue;
          d[i] = Math.min(255, d[i] * f); d[i + 1] = Math.min(255, d[i + 1] * f); d[i + 2] = Math.min(255, d[i + 2] * f);
        }
      }
      c.putImageData(img, X, Y);
    }

    // ---- one cumulus cloud, from layered noise ----
    // A few soft blobs give the overall shape (domed top, flat base); noise breaks
    // up the edge; lighting compares density toward the light with density here.
    function makeCloud(w, h, rnd) {
      const res = 0.7;                                     // drawn a bit smaller than shown; it's soft anyway
      const cw = Math.max(8, Math.round(w * res)), ch = Math.max(8, Math.round(h * res));
      const { fbm } = makeNoise(rnd);
      const blobs = [];
      const n = 4 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const u = 0.2 + 0.6 * (n === 1 ? 0.5 : i / (n - 1)) + (rnd() - 0.5) * 0.08;
        const r = 0.16 + 0.2 * Math.sin(PI * u) ** 2 + rnd() * 0.06;
        blobs.push({ x: u, y: 0.76 - r * (0.75 + rnd() * 0.25), r });
      }
      const aspect = w / h;
      const density = (px, py) => {          // px, py in 0..1
        let d = 0;
        for (const b of blobs) {
          const dx = (px - b.x) * aspect * 0.62, dy = py - b.y;
          d = Math.max(d, 1 - Math.sqrt(dx * dx + dy * dy) / b.r);
        }
        d += (fbm(px * aspect * 2.2, py * 2.6) - 0.56) * 0.6;
        d = Math.min(d, (0.8 - py) * 4);       // flat base
        return d * smooth(0, 0.12, px) * smooth(1, 0.88, px) * smooth(0, 0.14, py);   // never touch the edges
      };
      const img = new ImageData(cw, ch);
      const hi = night ? [150, 172, 205] : [255, 255, 255];
      const lo = night ? [30, 44, 74] : [150, 176, 210];
      const opacity = night ? 0.55 : 1;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const px = x / cw, py = y / ch;
          const d = density(px, py);
          if (d <= 0) continue;
          const toward = density(px + 0.035, py - 0.07);      // sun is up and to the right
          let lit = 1 - Math.max(0, toward - d * 0.6) * 1.6;
          lit -= smooth(0.35, 0.8, py) * 0.35;                // shaded underside
          lit = Math.min(1, Math.max(0, lit));
          const a = smooth(0, 0.22, d) * opacity;
          const i = (y * cw + x) * 4;
          img.data[i] = lo[0] + (hi[0] - lo[0]) * lit;
          img.data[i + 1] = lo[1] + (hi[1] - lo[1]) * lit;
          img.data[i + 2] = lo[2] + (hi[2] - lo[2]) * lit;
          img.data[i + 3] = a * 255;
        }
      }
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      c.getContext('2d').putImageData(img, 0, 0);
      return c;
    }

    // ---- everything that only changes on resize or day/night ----
    function build() {
      dpr = Math.min(1.5, devicePixelRatio || 1);
      W = canvas.clientWidth || innerWidth;
      H = canvas.clientHeight || innerHeight;
      canvas.width = Math.ceil(W * dpr);
      canvas.height = Math.ceil(H * dpr);
      night = html.dataset.scheme === 'dark';
      hz = Math.round(H * 0.66);
      sun = { x: W * 0.74, y: H * 0.16 };
      const rnd = seeded(night ? 11 : 7);
      const k = Math.min(1.4, Math.max(0.6, Math.min(W, H) / 800));   // detail scale
      const N = makeNoise(seeded(night ? 23 : 19));

      // sky
      const [sky, s] = layer(W, hz);
      let g = s.createLinearGradient(0, 0, 0, hz);
      if (night) {
        g.addColorStop(0, '#02060f'); g.addColorStop(0.45, '#061a33'); g.addColorStop(0.8, '#0a3452'); g.addColorStop(1, '#0f4a60');
      } else {
        g.addColorStop(0, '#0b67c9'); g.addColorStop(0.3, '#2a92e3'); g.addColorStop(0.62, '#79c6f3'); g.addColorStop(0.9, '#c6ecfd'); g.addColorStop(1, '#e4f7ff');
      }
      s.fillStyle = g;
      s.fillRect(0, 0, W, hz);
      // uneven haze and high wispy cirrus, so the sky isn't one clean fade
      {
        const q = 4, qw = Math.ceil(W / q), qh = Math.ceil(hz / q);
        const qc = document.createElement('canvas');
        qc.width = qw; qc.height = qh;
        const qx = qc.getContext('2d');
        const img = qx.createImageData(qw, qh), d = img.data;
        const wisp = night ? [150, 172, 215] : [255, 255, 255];
        for (let py = 0; py < qh; py++) {
          const y = py * q, v = y / hz;
          const band = smooth(0.03, 0.2, v) * (1 - smooth(0.5, 0.85, v));
          for (let px = 0; px < qw; px++) {
            const x = px * q;
            const i = (py * qw + px) * 4;
            const haze = N.fbm(x / 520, y / 260, 3) - 0.5;
            const ty = y + x * 0.07;                                        // a slight diagonal sweep
            const wx = x + (N.fbm(x / 260, ty / 90, 3) - 0.5) * 260;         // curl the streaks
            const c = N.fbm(wx / 420 + 30, ty / 26, 5);
            const a = smooth(0.5, 0.76, c) * band * (night ? 0.12 : 0.42);
            if (haze > 0 || a > 0) {
              const ha = Math.max(0, haze) * (night ? 0.05 : 0.22);
              const al = a + ha * (1 - a);
              d[i] = wisp[0]; d[i + 1] = wisp[1]; d[i + 2] = wisp[2]; d[i + 3] = al * 255;
            } else {
              d[i] = night ? 0 : 0; d[i + 1] = night ? 6 : 50; d[i + 2] = night ? 20 : 150; d[i + 3] = -haze * (night ? 0.25 : 0.16) * 255;
            }
          }
        }
        qx.putImageData(img, 0, 0);
        s.imageSmoothingQuality = 'high';
        s.drawImage(qc, 0, 0, qw * q, qh * q);
      }
      const R = Math.max(W, H);
      if (night) {
        const mr = 10 + 0.022 * Math.min(W, H);
        g = s.createRadialGradient(sun.x, sun.y, mr, sun.x, sun.y, mr * 9);
        g.addColorStop(0, 'rgba(170,205,255,0.22)'); g.addColorStop(1, 'rgba(170,205,255,0)');
        s.fillStyle = g; s.fillRect(0, 0, W, hz);
        g = s.createRadialGradient(sun.x + mr * 0.3, sun.y - mr * 0.3, mr * 0.1, sun.x, sun.y, mr);
        g.addColorStop(0, '#fbfdff'); g.addColorStop(0.7, '#e2eaf3'); g.addColorStop(1, '#c3d0de');
        s.fillStyle = g; s.beginPath(); s.arc(sun.x, sun.y, mr, 0, PI * 2); s.fill();
        s.fillStyle = 'rgba(140,155,178,0.32)';
        for (const [dx, dy, rr] of [[-0.3, -0.15, 0.28], [0.15, 0.25, 0.22], [0.3, -0.3, 0.14], [-0.1, 0.45, 0.12]]) {
          s.beginPath(); s.ellipse(sun.x + dx * mr, sun.y + dy * mr, rr * mr, rr * mr * 0.8, 0.4, 0, PI * 2); s.fill();
        }
      } else {
        g = s.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, R * 0.7);
        g.addColorStop(0, 'rgba(255,255,250,1)'); g.addColorStop(0.03, 'rgba(255,255,245,0.95)');
        g.addColorStop(0.08, 'rgba(255,252,235,0.45)'); g.addColorStop(0.25, 'rgba(230,246,255,0.18)'); g.addColorStop(1, 'rgba(230,246,255,0)');
        s.fillStyle = g; s.fillRect(0, 0, W, hz);
      }
      L.sky = sky;

      // light rays (day): faint, drawn small so they come out soft, turning very slowly
      if (!night) {
        const size = Math.hypot(W, H) * 1.2;
        const rc = document.createElement('canvas');
        rc.width = rc.height = 160;
        const r = rc.getContext('2d');
        r.translate(80, 80);
        g = r.createRadialGradient(0, 0, 0, 0, 0, 80);
        g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.3, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        r.fillStyle = g;
        for (let a = rnd(); a < PI * 2;) {
          const wdt = 0.05 + rnd() * 0.1;
          r.beginPath(); r.moveTo(0, 0); r.arc(0, 0, 80, a, a + wdt); r.closePath(); r.fill();
          a += wdt + 0.2 + rnd() * 0.35;
        }
        L.rays = rc; L.raySize = size;
      } else L.rays = null;

      // land above the lake: four ranges, farthest first. Each farther one is
      // smaller, bluer and hazier; haze settles between them; slopes facing the
      // sun (on the right) are lit, the others shaded. The nearest hills only
      // rise at the sides, so the lake opens into a valley.
      const ranges = [
        { r: (x) => { const q = x / H; return hz - H * (0.078 + 0.016 * Math.sin(q * 6.3 + 1.3) + 0.011 * Math.sin(q * 13.1 + 0.4) + 0.005 * Math.sin(q * 29 + 2)); },
          hmax: 0.115, day: ['#80b4d6', '#acd5ea'], nite: ['#0f2a46', '#14395a'], tex: 0.05, shade: 0.07, trees: 0, sc: 0.5 },
        { r: (x) => { const q = x / H; return hz - H * (0.05 + 0.02 * Math.sin(q * 3.7 + 2.2) + 0.012 * Math.sin(q * 8.9 + 0.7) + 0.004 * Math.sin(q * 21 + 1)); },
          hmax: 0.09, day: ['#6fae9f', '#a3d3c6'], nite: ['#0d2f3a', '#123f48'], tex: 0.1, shade: 0.12, trees: 0.06, sc: 0.7 },
        { r: (x) => { const q = x / H; return hz - H * (0.016 + 0.036 * (0.5 + 0.5 * Math.sin(q * 2.6 + 0.4)) ** 1.6 + 0.007 * Math.sin(q * 7.3 + 2)); },
          hmax: 0.06, day: ['#57ab44', '#93cd7a'], nite: ['#0c392e', '#12493d'], tex: 0.28, shade: 0.24, trees: 0.12, sc: 1 },
        { r: (x) => { const u = x / W, q = x / H; const h = 0.072 * smooth(0.42, 0, u) + 0.05 * smooth(0.8, 1.04, u); return hz + 1 - H * h * (0.86 + 0.14 * Math.sin(q * 9 + 1)); },
          hmax: 0.075, day: ['#479e37', '#7bbf60'], nite: ['#0a3326', '#0f4232'], tex: 0.34, shade: 0.3, trees: 0.16, sc: 1.3, rim: true },
      ];
      const [land, l] = layer(W, hz);
      ranges.forEach((rg, i) => {
        ridgePath(l, (u) => rg.r(u * W), hz);
        const c = night ? rg.nite : rg.day;
        g = l.createLinearGradient(0, hz - H * rg.hmax, 0, hz);
        g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
        l.fillStyle = g; l.fill();
        if (i >= 2) {                                                           // a thin sunlit edge on the near hills
          ridgeLine(l, (u) => rg.r(u * W));
          l.strokeStyle = night ? 'rgba(120,255,210,0.14)' : 'rgba(255,255,240,0.32)';
          l.lineWidth = 1; l.stroke();
        }
        if (i < ranges.length - 1) {                                            // haze between this range and the next
          g = l.createLinearGradient(0, hz - H * 0.05, 0, hz);
          g.addColorStop(0, night ? 'rgba(40,110,140,0)' : 'rgba(225,244,255,0)');
          g.addColorStop(1, night ? 'rgba(40,110,140,0.22)' : 'rgba(225,244,255,0.42)');
          l.fillStyle = g; l.fillRect(0, hz - H * 0.05, W, H * 0.05);
        }
      });
      texture(l, 0, hz - H * 0.13, W, H * 0.13, (x, y) => {
        for (let i = ranges.length - 1; i >= 0; i--) {
          const rg = ranges[i], top = rg.r(x);
          if (y < top) continue;
          const dist = y - top, slope = (rg.r(x + 3) - rg.r(x - 3)) / 6, sc = rg.sc;
          let f = 1 + Math.tanh(slope * 5) * rg.shade * Math.exp(-dist / (H * 0.03));   // lit / shaded slope
          f += (N.fbm(x / (55 * sc), y / (24 * sc), 3) - 0.5) * rg.tex;                  // meadow patches
          if (rg.trees) f *= 1 - smooth(0.6, 0.78, N.fbm(x / (8 * sc) + 50 * i, y / (6 * sc), 3)) * rg.trees;
          if (sc >= 1) f += (N.noise(x / 2.5, y / 2.5) - 0.5) * 0.04;
          return f;
        }
        return 1;
      });
      g = l.createLinearGradient(0, hz - H * 0.02, 0, hz);
      g.addColorStop(0, night ? 'rgba(60,150,170,0)' : 'rgba(235,250,255,0)');
      g.addColorStop(1, night ? 'rgba(60,150,170,0.1)' : 'rgba(235,250,255,0.16)');
      l.fillStyle = g; l.fillRect(0, hz - H * 0.02, W, H * 0.02);
      L.land = land;

      // the lake's own colour over the reflection: mirror-like far away,
      // deeper aqua close up, turquoise shallows along the shore
      const lakeH = H - hz;
      const [tint, tc] = layer(W, lakeH);
      g = tc.createLinearGradient(0, 0, 0, lakeH);
      if (night) { g.addColorStop(0, 'rgba(10,40,70,0.12)'); g.addColorStop(1, 'rgba(2,14,30,0.62)'); }
      else { g.addColorStop(0, 'rgba(150,220,245,0.08)'); g.addColorStop(0.4, 'rgba(10,150,200,0.3)'); g.addColorStop(1, 'rgba(0,92,150,0.58)'); }
      tc.fillStyle = g; tc.fillRect(0, 0, W, lakeH);
      g = tc.createLinearGradient(sun.x - W * 0.12, 0, sun.x + W * 0.12, 0);   // bright column under the sun / moon
      const col = night ? '190,215,255' : '255,255,240';
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},${night ? 0.1 : 0.2})`); g.addColorStop(1, `rgba(${col},0)`);
      tc.globalCompositeOperation = 'lighter';
      tc.fillStyle = g; tc.fillRect(0, 0, W, lakeH);
      tc.globalCompositeOperation = 'source-over';
      tc.lineJoin = 'round';
      for (const [off, wdt, a] of [[14, 30, 0.16], [5, 12, 0.22]]) {
        ridgeLine(tc, bankRidge, -hz - off);
        tc.strokeStyle = night ? `rgba(40,150,150,${a * 0.6})` : `rgba(70,225,205,${a})`;
        tc.lineWidth = wdt; tc.stroke();
      }
      tc.fillStyle = night ? 'rgba(150,220,255,0.08)' : 'rgba(255,255,255,0.14)';
      tc.fillRect(0, 0, W, 1);                                                 // the far shoreline
      L.tint = tint;

      // ripples: wavelets in perspective (wide and soft close up, fine lines far
      // away), light where they catch the sky, dark where they show deep water.
      // Three versions fade into each other so the surface keeps moving.
      L.waves = [0, 1, 2].map((v) => {
        const q = 2, ww = Math.ceil(W / q), wh = Math.ceil(lakeH / q);
        const c = document.createElement('canvas');
        c.width = ww; c.height = wh;
        const x2 = c.getContext('2d');
        const img = x2.createImageData(ww, wh), d = img.data;
        const lite = night ? [170, 200, 240] : [255, 255, 255], dark = night ? [0, 6, 16] : [0, 70, 125];
        for (let py = 0; py < wh; py++) {
          const dd = (py * q) / lakeH, z = dd + 0.04;
          const fade = smooth(0.02, 0.35, dd);
          for (let px = 0; px < ww; px++) {
            const X = (px * q - W / 2) / z, Z = 1 / z;
            const n = (N.fbm(X / 150 + v * 41, Z * 11 + v * 17, 3) - 0.5) * 2;
            const i = (py * ww + px) * 4;
            if (n > 0.12) {
              d[i] = lite[0]; d[i + 1] = lite[1]; d[i + 2] = lite[2];
              d[i + 3] = Math.min(1, (n - 0.12) * 1.1) * fade * (night ? 90 : 130);
            } else if (n < -0.08) {
              d[i] = dark[0]; d[i + 1] = dark[1]; d[i + 2] = dark[2];
              d[i + 3] = Math.min(1, (-n - 0.08) * 1.2) * fade * (night ? 120 : 95);
            }
          }
        }
        x2.putImageData(img, 0, 0);
        return c;
      });
      L.up = layer(W, hz);

      // the grassy bank in front
      const [bank, b] = layer(W, H);
      const top = H * 0.765;
      ridgePath(b, bankRidge, H + 2);
      g = b.createLinearGradient(0, top, 0, H);
      if (night) { g.addColorStop(0, '#1d5a36'); g.addColorStop(0.3, '#123f26'); g.addColorStop(1, '#051a10'); }
      else { g.addColorStop(0, '#a3ea66'); g.addColorStop(0.18, '#62c63f'); g.addColorStop(0.6, '#33952a'); g.addColorStop(1, '#1b6a1c'); }
      b.fillStyle = g; b.fill();
      b.save(); b.clip();
      // lawn texture: sunlit and shaded patches, vertical blade grain, then
      // thousands of short blades (bigger toward the bottom, which is closer)
      texture(b, 0, top - 4, W, H - top + 4, (x, y) => {
        const dd = Math.max(0, (y - top) / (H - top)), s = 1 + dd * 3;
        return 1 + (N.fbm(x / (70 * s), y / (20 * s), 3) - 0.5) * 0.5
                 + (N.noise(x / (1.4 * s), y / (6 * s)) - 0.5) * 0.24;
      });
      {
        const tones = night
          ? [['rgba(110,210,150,0.16)', 'rgba(1,10,5,0.35)']]
          : [['rgba(220,255,150,0.32)', 'rgba(15,70,10,0.3)']];
        const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];   // [light, dark] x [thin, thick]
        const count = Math.round(W * (H - top) / 9);
        for (let i = 0; i < count; i++) {
          const x = rnd() * W;
          const ry = bankRidge(x / W) + 3;
          const y = ry + rnd() ** 1.3 * (H - ry);
          const dd = (y - top) / (H - top);
          const len = (2 + rnd() * 5) * (0.5 + dd * 2.2) * k;
          const lean = (rnd() - 0.45) * len * 0.5;
          const light = N.fbm(x / 70, y / 20, 2) + (rnd() - 0.5) * 0.5 > 0.5;
          const p = paths[(light ? 0 : 2) + (dd > 0.45 ? 1 : 0)];
          p.moveTo(x, y);
          p.lineTo(x + lean, y - len);
        }
        b.lineCap = 'round';
        paths.forEach((p, i) => {
          b.strokeStyle = tones[0][i < 2 ? 0 : 1];
          b.lineWidth = (i % 2 ? 1.5 : 0.8) * k;
          b.stroke(p);
        });
      }
      g = b.createRadialGradient(W * 0.18, top + H * 0.02, 0, W * 0.18, top + H * 0.02, W * 0.45);
      g.addColorStop(0, night ? 'rgba(120,255,210,0.08)' : 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      b.fillStyle = g; b.fillRect(0, top, W, H - top);
      ridgeLine(b, bankRidge, 5);                                              // soft gloss just under the edge
      b.strokeStyle = night ? 'rgba(140,255,210,0.07)' : 'rgba(255,255,255,0.22)';
      b.lineWidth = 7; b.stroke();
      b.restore();
      ridgeLine(b, bankRidge);
      b.strokeStyle = night ? 'rgba(150,255,215,0.4)' : 'rgba(255,255,255,0.85)';
      b.lineWidth = 1.6; b.stroke();
      L.bank = bank;

      // grass along the bank's edge, thicker on the left
      const greens = night ? ['#0d3a23', '#124a2d', '#0a2e1c', '#175a37', '#1c6640'] : ['#3b9a2b', '#4fb337', '#2d8724', '#68c745', '#86d858'];
      blades = [];
      for (let x = -6; x < W + 6;) {
        const u = x / W;
        const tall = 1.25 - u * 0.55;                                          // taller on the left
        const n = 3 + Math.floor(rnd() * 7);                                   // a clump fanning out
        const lean0 = (rnd() - 0.4) * 0.5;
        for (let i = 0; i < n; i++) {
          const f = n === 1 ? 0 : i / (n - 1) - 0.5;
          const h = (5 + rnd() ** 1.6 * 24) * tall * k * (1 - Math.abs(f) * 0.5);
          const bx = x + f * 6 * k + (rnd() - 0.5) * 2;
          blades.push({ x: bx, y: bankRidge(bx / W) + 2 + rnd() * 2, h, w: (0.9 + rnd() * 1.3) * k, lean: (lean0 + f * 0.9) * h * 0.6, c: greens[Math.floor(rnd() * greens.length)], ph: rnd() * 6 });
        }
        x += (4 + rnd() * 10) * k * (1 + u * 1.5);                             // sparser to the right
      }
      blades.sort((a, b) => a.c < b.c ? -1 : 1);

      // clouds: big and high, smaller toward the horizon
      clouds = [];
      const count = night ? 3 : 6;
      for (let i = 0; i < count; i++) {
        const depth = i / (count - 1);                                         // 0 = near/high, 1 = far/low
        const w = Math.min(560, Math.max(120, W * (0.34 - depth * 0.22) * (0.8 + rnd() * 0.4)));
        const h = w * (night ? 0.36 : 0.5);
        let cx = rnd() * (W + w) - w;
        if (Math.abs(cx + w / 2 - sun.x) < w * 0.7 + 60 && depth < 0.5) cx = (cx + W * 0.45) % W - w * 0.5;
        clouds.push({
          img: makeCloud(w, h, rnd), w, h,
          x: cx,
          y: hz * (0.06 + depth * 0.6) - h * 0.5 + (rnd() - 0.5) * hz * 0.06,
          v: (7 - depth * 5) * (0.8 + rnd() * 0.4),
          a: 1 - depth * 0.2,
        });
      }
      clouds.sort((a, b) => a.w - b.w);

      // glints on the water under the sun / moon
      glints = [];
      for (let i = 0; i < (night ? 50 : 90); i++) {
        const d = rnd() ** 1.3;
        glints.push({ d, o: (rnd() - 0.5) * (0.04 + d * 0.32), w: 2 + rnd() * 6 * (0.4 + d), sp: 1.5 + rnd() * 3, ph: rnd() * 6 });
      }

      // stars and aurora (night)
      stars = [];
      if (night) {
        for (let i = 0; i < 260; i++) {
          const y = hz * 0.92 * rnd() ** 1.7;
          stars.push({ x: rnd() * W, y, s: 0.5 + rnd() ** 3 * 1.4, a: (0.25 + rnd() * 0.75) * (1 - y / hz), tw: rnd() < 0.35 ? 1 + rnd() * 2 : 0, ph: rnd() * 6 });
        }
        const sp = document.createElement('canvas');
        sp.width = 1; sp.height = 128;
        const sx = sp.getContext('2d');
        g = sx.createLinearGradient(0, 0, 0, 128);
        g.addColorStop(0, 'rgba(150,90,255,0)');
        g.addColorStop(0.35, 'rgba(140,110,255,0.25)');
        g.addColorStop(0.7, 'rgba(70,255,180,0.6)');
        g.addColorStop(0.93, 'rgba(150,255,200,1)');
        g.addColorStop(1, 'rgba(150,255,200,0)');
        sx.fillStyle = g; sx.fillRect(0, 0, 1, 128);
        L.auroraSprite = sp;
        const aw = Math.ceil(W / 4), ah = Math.ceil(hz / 4);
        L.aurora = document.createElement('canvas');
        L.aurora.width = aw; L.aurora.height = ah;
      }
    }

    function drawAurora() {
      const c = L.aurora, a = c.getContext('2d');
      const aw = c.width, ah = c.height;
      a.clearRect(0, 0, aw, ah);
      a.globalCompositeOperation = 'lighter';
      const curtains = [{ base: 0.52, hh: 0.42, p: 0, al: 0.9 }, { base: 0.38, hh: 0.3, p: 2.1, al: 0.55 }];
      for (const cu of curtains) {
        for (let x = 0; x < aw; x++) {
          const u = x / aw;
          const env = smooth(0.02, 0.3, u) * (1 - smooth(0.5, 0.85, u));
          if (env <= 0) continue;
          let i = (0.5 + 0.5 * Math.sin(u * 7 + t * 0.12 + cu.p)) * (0.55 + 0.45 * Math.sin(u * 19 - t * 0.21 + cu.p));
          i *= 0.7 + 0.3 * Math.sin(u * 95 + t * 0.5 + cu.p);                  // fine vertical rays
          i = Math.max(0, i) ** 1.3 * env * cu.al;
          const base = ah * (cu.base + 0.07 * Math.sin(u * 5 + t * 0.09 + cu.p) + 0.03 * Math.sin(u * 13 - t * 0.17));
          const h = ah * cu.hh * (0.65 + 0.35 * Math.sin(u * 3.3 + t * 0.07 + cu.p));
          a.globalAlpha = i;
          a.drawImage(L.auroraSprite, x, base - h, 1, h);
        }
      }
      a.globalAlpha = 1;
      a.globalCompositeOperation = 'source-over';
    }

    function draw() {
      const [up, u] = L.up;
      // 1. everything above the lake, into its own layer (the lake reflects it)
      u.globalCompositeOperation = 'source-over';
      u.drawImage(L.sky, 0, 0, W, hz);
      if (night) {
        u.fillStyle = '#fff';
        for (const s of stars) {
          u.globalAlpha = s.tw ? s.a * (0.55 + 0.45 * Math.sin(t * s.tw + s.ph)) : s.a;
          u.fillRect(s.x, s.y, s.s, s.s);
        }
        u.globalAlpha = 1;
        drawAurora();
        u.globalCompositeOperation = 'lighter';
        u.drawImage(L.aurora, 0, 0, W, hz);
        u.globalCompositeOperation = 'source-over';
      } else if (L.rays) {
        u.save();
        u.globalCompositeOperation = 'lighter';
        u.globalAlpha = 0.32 + 0.08 * Math.sin(t * 0.25);
        u.translate(sun.x, sun.y);
        u.rotate(t * 0.006);
        u.drawImage(L.rays, -L.raySize / 2, -L.raySize / 2, L.raySize, L.raySize);
        u.restore();
      }
      for (const c of clouds) {
        u.globalAlpha = c.a;
        u.drawImage(c.img, c.x, c.y, c.w, c.h);
      }
      u.globalAlpha = 1;
      u.drawImage(L.land, 0, 0, W, hz);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(up, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 2. the lake: the scene above, mirrored row by row with a ripple
      const lakeH = H - hz;
      const row = 1;
      for (let y = hz; y < H; y += row) {
        const d = y - hz;
        const depth = d / lakeH;
        const wave = Math.sin(d * 0.21 - t * 1.3) * 0.5 + Math.sin(d * 0.067 + t * 0.6) * 0.3 + Math.sin(d * 0.53 - t * 2.1) * 0.2;
        const xo = wave * (0.3 + depth * 3.2);
        const sy = Math.max(0, hz - d - 1 + Math.sin(d * 0.37 + t * 1.7) * depth * 1.5);
        ctx.drawImage(up, 0, sy * dpr, up.width, row * dpr, xo - 6, y, W + 12, row + 0.5);
      }
      ctx.drawImage(L.tint, 0, hz, W, lakeH);
      {
        const ws = L.waves.map((_, i) => (0.5 + 0.5 * Math.cos(t * 0.45 - i * PI * 2 / 3)) ** 2);
        const sum = ws.reduce((a, b) => a + b, 0);
        L.waves.forEach((c, i) => {
          const a = ws[i] / sum;
          if (a < 0.02) return;
          ctx.globalAlpha = Math.min(1, a * 1.6);
          ctx.drawImage(c, 0, hz, W, lakeH);
        });
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = night ? 'rgb(200,225,255)' : '#fff';
      for (const g of glints) {
        const a = Math.max(0, Math.sin(t * g.sp + g.ph)) ** 6 * (still ? 0.6 : 1);
        if (a < 0.02) continue;
        ctx.globalAlpha = a * (night ? 0.55 : 0.9);
        const y = hz + 2 + g.d * lakeH * 0.95;
        ctx.fillRect(sun.x + g.o * W - g.w / 2, y, g.w, 1 + g.d);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // 3. the bank and its grass
      ctx.drawImage(L.bank, 0, 0, W, H);
      let color = null;
      for (const b of blades) {
        const sway = Math.sin(t * 1.1 + b.x * 0.012 + b.ph * 0.3) * b.h * 0.12;
        const tx = b.x + b.lean + sway, ty = b.y - b.h;
        if (b.c !== color) { ctx.fillStyle = color = b.c; }
        ctx.beginPath();
        ctx.moveTo(b.x - b.w, b.y);
        ctx.quadraticCurveTo(b.x - b.w * 0.2 + (b.lean + sway) * 0.4, b.y - b.h * 0.55, tx, ty);
        ctx.quadraticCurveTo(b.x + b.w * 0.4 + (b.lean + sway) * 0.4, b.y - b.h * 0.55, b.x + b.w, b.y);
        ctx.fill();
      }
    }

    function tick(now) {
      frame = requestAnimationFrame(tick);
      if (document.hidden) { last = now; return; }
      const dt = Math.min(0.1, (now - (last || now)) / 1000);
      if (now - last < 33) return;                                             // ~30 fps is plenty for this
      last = now;
      t += dt;
      for (const c of clouds) { c.x += c.v * dt; if (c.x > W) c.x = -c.w; }
      draw();
    }

    const rebuild = () => { build(); draw(); };
    let pending = 0;
    const ro = new ResizeObserver(() => {
      if (canvas.clientWidth === W && canvas.clientHeight === H) return;     // the first call, right after build
      clearTimeout(pending);
      pending = setTimeout(rebuild, 120);
    });
    ro.observe(canvas);
    const mo = new MutationObserver(() => { if ((html.dataset.scheme === 'dark') !== night) rebuild(); });
    mo.observe(html, { attributes: true, attributeFilter: ['data-scheme'] });
    t = 40;                                                                    // start mid-motion, not on a frozen pose
    rebuild();
    if (!still) frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); clearTimeout(pending); ro.disconnect(); mo.disconnect(); };
  }

  // ======================= BUBBLES =======================
  function startBubbles(canvas, api) {
    const ctx = canvas.getContext('2d');
    const bubbles = [];
    let frame = 0;
    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = (anywhere) => ({
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 40,
      r: 6 + Math.random() ** 2 * 38,
      speed: 0.25 + Math.random() * 0.6,
      wobble: Math.random() * Math.PI * 2,
    });
    resize();
    for (let i = 0; i < (api.preview ? 14 : 26); i++) bubbles.push(spawn(true));
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const b of bubbles) {
        const g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
        g.addColorStop(0, 'rgba(255,255,255,0.75)');
        g.addColorStop(0.35, 'rgba(255,255,255,0.12)');
        g.addColorStop(0.85, 'rgba(160,230,255,0.12)');
        g.addColorStop(1, 'rgba(255,255,255,0.55)');
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
    };
    const tick = () => {
      if (!document.hidden) {
        for (const b of bubbles) {
          b.y -= b.speed;
          b.wobble += 0.02;
          b.x += Math.sin(b.wobble) * 0.3;
          if (b.y < -60) Object.assign(b, spawn(false));
        }
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    addEventListener('resize', resize);
    if (api.reducedMotion() || api.preview) draw();
    else frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); removeEventListener('resize', resize); };
  }

  // ======================= ICONS =======================
  // App icons are from the Oxygen icon theme (KDE, LGPL): see themes/aero/icons/README.txt.
  // Only the tiny arrows and the network bars are drawn here.
  const DIR = new URL('.', document.currentScript.src).href;
  const IMG = (name) => `<img class="w7-ico" src="${DIR}icons/${name}.webp" alt="" draggable="false">`;
  const ICON = {
    home: IMG('home'),
    folder: IMG('folder'),
    tools: IMG('tools'),
    gallery: IMG('gallery'),
    paint: IMG('paint'),
    personalize: IMG('personalize'),
    browser: IMG('internet'),
    original: IMG('shutdown'),
    dev: IMG('dev'),
    terminal: IMG('terminal'),
    calculator: IMG('calculator'),
    monitor: IMG('monitor'),
    configure: IMG('configure'),
    speakerOn: IMG('speaker-on'),
    speakerOff: IMG('speaker-off'),
    network: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="15" width="3" height="5" fill="currentColor"/><rect x="8" y="11" width="3" height="9" fill="currentColor"/><rect x="13" y="7" width="3" height="13" fill="currentColor"/><rect x="18" y="3" width="3" height="17" fill="currentColor"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6l-6 6 6 6" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" stroke="currentColor" stroke-width="2" fill="none"/><path d="m15 15 6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  };
  const ITEM_ICONS = ['dev', 'terminal', 'calculator', 'monitor', 'configure'];

  // ======================= APPS =======================
  // Which app shows which page, plus its taskbar name and icon.
  const APPS = {
    browser:     { name: 'Internet',       icon: 'home' },
    explorer:    { name: 'Code',           icon: 'folder' },
    control:     { name: 'Control Panel',  icon: 'tools' },
    gallery:     { name: 'Photo Gallery',  icon: 'gallery' },
    paint:       { name: 'Paint',          icon: 'paint' },
    personalize: { name: 'Personalization', icon: 'personalize' },
  };
  const appForPage = (page) => ({ home: 'browser', code: 'explorer', hardware: 'control', design: 'gallery', themes: 'personalize', paint: 'paint' }[page] || 'explorer');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // pinned apps on the taskbar / desktop / start menu: home + every nav page
  function pinned(site) {
    return [
      { key: 'home', label: 'Home', href: site.homeHref, app: 'browser' },
      ...site.nav.map((n) => ({ key: slug(n.label), label: cap(n.label), href: n.href, app: appForPage(slug(n.label)) })),
    ];
  }

  function shell(site, api) {
    const e = api.esc;
    const initials = site.name.split(/\s+/).map((x) => x[0]).join('').slice(0, 2);
    const apps = pinned(site);
    return `
      <div class="w7">
        <div class="w7-wall" aria-hidden="true"><canvas class="w7-scene"></canvas></div>
        <canvas class="w7-bubbles" aria-hidden="true"></canvas>

        <nav class="w7-desktop" aria-label="Desktop">
          ${apps.map((a) => `<button type="button" class="w7-dicon" data-launch="${a.key}">${ICON[APPS[a.app].icon]}<span>${e(a.label)}</span></button>`).join('')}
          <button type="button" class="w7-dicon" data-launch="paint">${ICON.paint}<span>Paint</span></button>
          <button type="button" class="w7-dicon" data-launch="themes">${ICON.personalize}<span>Themes</span></button>
          <button type="button" class="w7-dicon" data-theme-choice="original" title="Back to the original site">${ICON.original}<span>Original site</span></button>
        </nav>

        <div class="w7-windows"></div>

        <div class="w7-start" hidden>
          <div class="sm-left">
            <div class="sm-programs">
              ${apps.map((a) => `<button type="button" class="sm-prog" data-launch="${a.key}">${ICON[APPS[a.app].icon]}<span>${e(a.label)}<small>${e(a.app === 'browser' ? 'Internet' : APPS[a.app].name === a.label ? '' : APPS[a.app].name)}</small></span></button>`).join('')}
              <button type="button" class="sm-prog" data-launch="paint">${ICON.paint}<span>Paint<small>Draw something</small></span></button>
              <button type="button" class="sm-prog" data-launch="themes">${ICON.personalize}<span>Personalization<small>Site themes</small></span></button>
            </div>
            <div class="sm-search">${ICON.search}<input type="search" placeholder="Search programs and files" aria-label="Search programs"></div>
          </div>
          <div class="sm-right">
            <div class="sm-pic"><span>${e(initials)}</span></div>
            <p class="sm-name">${e(site.name)}</p>
            ${site.intro ? `<p class="sm-bio">${e(site.intro)}</p>` : ''}
            ${site.links.map((l) => `<a class="sm-link" href="${e(l.href)}" target="_blank" rel="noopener">${e(cap(l.label))}</a>`).join('')}
            <button type="button" class="sm-link" data-act="picker">Themes…</button>
            <div class="sm-shutdown">
              <button type="button" class="sm-off" data-theme-choice="original">Shut down</button>
              <small>Back to the original site</small>
            </div>
          </div>
        </div>

        <footer class="w7-taskbar">
          <button type="button" class="w7-orb" aria-label="Start" aria-expanded="false"><i>
            <svg viewBox="0 0 40 40" aria-hidden="true"><g transform="translate(20 20)">
              <path d="M0 0C-1-6 1-11 6-12 9-9 8-3 0 0Z" fill="#7ed957"/>
              <path d="M0 0C6-1 11 1 12 6 9 9 3 8 0 0Z" fill="#2aa5ec"/>
              <path d="M0 0C1 6-1 11-6 12-9 9-8 3 0 0Z" fill="#ffd23f"/>
              <path d="M0 0C-6 1-11-1-12-6-9-9-3-8 0 0Z" fill="#ff7a45"/>
              <circle r="2.2" fill="#fff"/></g></svg></i></button>
          <div class="w7-apps"></div>
          <div class="w7-tray">
            <span class="w7-tray-controls" data-theme-controls></span>
            <span class="w7-tray-ico" title="Internet access">${ICON.network}</span>
            <button type="button" class="w7-tray-ico w7-music"></button>
            <div class="w7-clock" title=""><time></time><small></small></div>
            <button type="button" class="w7-peek" aria-label="Show desktop" title="Show desktop"></button>
          </div>
        </footer>
        <div class="w7-balloon" hidden><b>♪ Music</b>Click anywhere to start it. Mute it with the speaker.</div>
      </div>`;
  }

  // ---------- app contents ----------
  function addressBar(crumbs, searchLabel, e) {
    return `
      <div class="w7-navrow">
        <button type="button" class="w7-navorb back" data-act="back" aria-label="Back">${ICON.back}</button>
        <button type="button" class="w7-navorb fwd" data-act="fwd" aria-label="Forward">${ICON.back}</button>
        <div class="w7-crumbs">${crumbs.map((c) => `<span class="sep">▸</span>${c.href ? `<a href="${e(c.href)}">${e(c.label)}</a>` : `<span>${e(c.label)}</span>`}`).join('')}</div>
        <label class="w7-search"><input type="search" placeholder="${e(searchLabel)}" aria-label="${e(searchLabel)}">${ICON.search}</label>
      </div>`;
  }

  const RENDER = {
    // ---------- Home: a browser showing a Web 2.0 homepage ----------
    browser(site, api) {
      const e = api.esc;
      const url = location.href.split('#')[0];
      const first = site.name.split(' ')[0];
      const rest = site.name.split(' ').slice(1).join(' ');
      return {
        title: `${site.name} - Internet`,
        chrome: `
          <div class="ie-nav">
            <button type="button" class="ie-orb" data-act="back" aria-label="Back">${ICON.back}</button>
            <button type="button" class="ie-orb fwd" data-act="fwd" aria-label="Forward">${ICON.back}</button>
            <div class="ie-address"><span class="ie-favicon">${ICON.browser}</span><span class="ie-url">${e(url)}</span><button type="button" class="ie-refresh" data-act="refresh" aria-label="Refresh">⟳</button></div>
            <label class="w7-search ie-searchbox"><input type="search" placeholder="Search the web" aria-label="Search">${ICON.search}</label>
          </div>
          <div class="ie-band">
            <div class="ie-tabs">
              <span class="ie-favbtn">★ Favorites</span>
              ${site.links.map((l) => `<a class="ie-favlink" href="${e(l.href)}" target="_blank" rel="noopener">${ICON.browser}${e(cap(l.label))}</a>`).join('')}
            </div>
            <div class="ie-tabrow">
              <span class="ie-tab is-on">${ICON.browser}<span>${e(site.name)}</span></span><span class="ie-newtab" aria-hidden="true"></span>
              <span class="ie-cmds" aria-hidden="true"><span>Page ▾</span><span>Safety ▾</span><span>Tools ▾</span></span>
            </div>
          </div>`,
        client: `
          <div class="web">
            <header class="web-top">
              <a class="web-logo" href="${e(site.homeHref)}"><b>${e(first.toLowerCase())}</b><span>${e(rest.toLowerCase())}</span><em>beta</em></a>
            </header>
            <section class="web-hero">
              <div>
                <h1>Welcome to my homepage!</h1>
                <p>${e(site.title || site.description)}</p>
                <a class="web-bigbtn" href="${e(site.nav[0]?.href || '#')}">Explore my ${e((site.nav[0]?.label || 'work').toLowerCase())} »</a>
              </div>
              <a class="web-burst" href="#themes"><span>NEW!</span>${api.themes.length} themes</a>
            </section>
            <div class="web-cols">
              <main>
                <div class="web-box"><h2>About me</h2><p>${e(site.intro)}</p></div>
              </main>
              <aside>
                <div class="web-box"><h2>Links</h2>
                  ${site.links.map((l) => `<a class="web-pill" href="${e(l.href)}" target="_blank" rel="noopener">${e(cap(l.label))}</a>`).join('')}
                </div>
                <div class="web-badges" aria-hidden="true"><span>HTML</span><span>CSS</span><span>Web 2.0</span></div>
              </aside>
            </div>
            <footer class="web-foot">© ${new Date().getFullYear()} ${e(site.name)} · Best viewed at 1024×768</footer>
          </div>`,
        status: `<span>Done</span><span class="ie-zone">${ICON.browser} Internet | Protected Mode: On</span><span>100%</span>`,
      };
    },

    // ---------- Code: file explorer ----------
    explorer(site, api) {
      const e = api.esc;
      const name = cap(site.nav.find((n) => n.active)?.label || site.title || 'Folder');
      return {
        title: name,
        chrome: `
          ${addressBar([{ label: site.name.split(' ')[0], href: site.homeHref }, { label: name }], `Search ${name}`, e)}
          <div class="w7-cmdbar">
            <span class="cmd">Organize ▾</span>
            <a class="cmd cmd-open" data-act="open" aria-disabled="true">Open</a>
            <span class="cmd">Share with ▾</span>
            <span class="cmd-spacer"></span>
            <button type="button" class="cmd" data-act="view" title="Change your view">Views ▾</button>
          </div>`,
        client: `
          <div class="ex">
            <nav class="ex-pane" aria-label="Folders and tags">
              <button type="button" class="ex-folder" data-view="fav">${ICON.folder}Favourites <span>${site.items.filter((i) => i.favourite).length}</span></button>
              <button type="button" class="ex-folder is-on" data-view="all">${ICON.folder}All ${e(name.toLowerCase())} <span>${site.items.length}</span></button>
              ${site.tags.length ? `<p>Tags</p>${site.tags.map((t) => `<button type="button" class="ex-folder sub" data-view="tag:${e(t.toLowerCase())}">🏷 ${e(t)}</button>`).join('')}` : ''}
            </nav>
            <div class="ex-files">
              <div class="ex-grid" role="listbox" aria-label="${e(name)}">
                ${site.items.map((item, i) => `
                  <button type="button" class="ex-file" role="option" data-i="${i}" data-fav="${item.favourite ? 1 : 0}" data-tags="${e(item.tags.join('|').toLowerCase())}" data-search="${e((item.title + ' ' + item.text + ' ' + item.tags.join(' ')).toLowerCase())}">
                    <span class="ex-thumb">${item.image ? `<img src="${e(item.image)}" alt="">` : ICON.folder}</span>
                    <span class="ex-name">${e(item.title)}</span>
                    <span class="ex-col">${e(item.tags.join(', '))}</span>
                    <span class="ex-col">${item.theme ? 'Theme' : 'Project'}</span>
                  </button>`).join('')}
              </div>
              <p class="ex-empty" ${site.items.length ? 'hidden' : ''}>This folder is empty.</p>
              <p class="ex-empty ex-nofav" hidden>No favourites yet.</p>
            </div>
          </div>
          <div class="ex-details"></div>`,
        status: '',
      };
    },

    // ---------- Hardware: control panel ----------
    control(site, api) {
      const e = api.esc;
      return {
        title: 'Control Panel',
        chrome: addressBar([{ label: 'Control Panel' }, { label: cap(site.title || 'Hardware') }], 'Search Control Panel', e),
        client: `
          <div class="cp">
            <header class="cp-head">
              <div><h1>${e(site.title || 'Control Panel')}</h1><p>${e(site.description)}</p></div>
              <span class="cp-view">View by: <b>Category ▾</b></span>
            </header>
            <div class="cp-grid">
              ${site.items.map((item, i) => `
                <div class="cp-cat" data-search="${e((item.title + ' ' + item.text + ' ' + item.tags.join(' ')).toLowerCase())}">
                  <span class="cp-ico">${item.image ? `<img src="${e(item.image)}" alt="">` : ICON[ITEM_ICONS[i % ITEM_ICONS.length]]}</span>
                  <div>
                    <button type="button" class="cp-title" data-props="${i}">${e(item.title)}</button>
                    <p>${e(item.text)}</p>
                    <p class="cp-subs">${item.tags.map((t) => `<span>${e(t)}</span>`).join('')}${item.href ? `<a href="${e(item.href)}">Open</a>` : ''}</p>
                  </div>
                </div>`).join('')}
            </div>
          </div>`,
        status: '',
      };
    },

    // ---------- Design: photo gallery ----------
    gallery(site, api) {
      const e = api.esc;
      const name = cap(site.nav.find((n) => n.active)?.label || site.title || 'Pictures');
      return {
        title: `${name} - Photo Gallery`,
        chrome: `
          ${addressBar([{ label: 'Pictures' }, { label: name }], `Search ${name}`, e)}
          <div class="w7-cmdbar">
            <span class="cmd">File ▾</span>
            <span class="cmd">Fix</span>
            <span class="cmd">Info</span>
            <a class="cmd cmd-open" data-act="open" aria-disabled="true">Open</a>
            <button type="button" class="cmd" data-act="edit-paint">Edit in Paint</button>
            <button type="button" class="cmd" data-act="slideshow">▶ Slide show</button>
          </div>`,
        client: `
          <div class="pg">
            <nav class="pg-tree" aria-label="Folders and tags">
              <p>All photos and videos</p>
              <span class="pg-node">${ICON.gallery}Pictures</span>
              <button type="button" class="pg-node sub is-on" data-tag="">${ICON.folder}${e(name)}</button>
              ${site.tags.length ? `<p>Tags</p>${site.tags.map((t) => `<button type="button" class="pg-node sub" data-tag="${e(t.toLowerCase())}">🏷 ${e(t)}</button>`).join('')}` : ''}
            </nav>
            <div class="pg-main">
              <div class="pg-head"><b>${e(name)}</b><span class="pg-count">${site.items.length} items</span></div>
              ${site.description ? `<p class="pg-desc">${e(site.description)}</p>` : ''}
              <div class="pg-grid">
                ${site.items.map((item, i) => `
                  <button type="button" class="pg-thumb" data-i="${i}" data-tags="${e(item.tags.join('|').toLowerCase())}" data-search="${e((item.title + ' ' + item.text + ' ' + item.tags.join(' ')).toLowerCase())}">
                    <span class="pg-img"><img src="${e(item.image || site.sampleImage)}" alt=""></span>
                    <span class="pg-cap">${e(item.title)}</span>
                  </button>`).join('')}
              </div>
            </div>
            <aside class="pg-info"></aside>
          </div>
          <div class="pg-viewer" hidden>
            <div class="pv-stage"><img alt=""></div>
            <div class="pv-bar">
              <span class="pv-title"></span>
              <span class="pv-controls">
                <button type="button" class="pv-btn" data-act="pv-prev" aria-label="Previous">◀</button>
                <button type="button" class="pv-btn big" data-act="pv-play" aria-label="Play slide show">▶</button>
                <button type="button" class="pv-btn" data-act="pv-next" aria-label="Next">▶</button>
              </span>
              <span class="pv-right">
                <button type="button" class="w7-btn" data-act="edit-paint">Edit in Paint</button>
                <button type="button" class="w7-btn" data-act="pv-close">Close</button>
              </span>
            </div>
          </div>`,
        status: '<span class="pg-status">Select a picture to see its details</span><span class="pg-zoom" aria-hidden="true">− ━━━●━━ +</span>',
      };
    },

    // ---------- Paint: its own app, opened from the gallery or the desktop ----------
    paint(item, api) {
      const e = api.esc;
      const colors = ['#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
        '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7'];
      return {
        title: `${item ? item.title : 'Untitled'}.png - Paint`,
        chrome: `
          <div class="pt-tabs"><span class="pt-menu">▤ ▾</span><span class="is-on">Home</span><span>View</span></div>
          <div class="pt-ribbon">
            <div class="pt-group"><div class="pt-tools">
              <button type="button" class="pt-tool is-on" data-tool="pencil" title="Pencil">✎</button>
              <button type="button" class="pt-tool" data-tool="brush" title="Brush">🖌</button>
              <button type="button" class="pt-tool" data-tool="eraser" title="Eraser">▱</button>
            </div><span>Tools</span></div>
            <div class="pt-group"><div class="pt-sizes">
              ${[2, 4, 8, 14].map((s, i) => `<button type="button" class="pt-size ${i === 1 ? 'is-on' : ''}" data-size="${s}" title="${s}px"><i style="height:${Math.max(1, s / 2)}px"></i></button>`).join('')}
            </div><span>Size</span></div>
            <div class="pt-group pt-colors-group"><div class="pt-colors">
              <span class="pt-current" title="Colour 1"><i style="background:#000"></i></span>
              <div class="pt-palette">${colors.map((c) => `<button type="button" style="background:${c}" data-color="${c}" aria-label="Colour ${c}"></button>`).join('')}</div>
            </div><span>Colors</span></div>
            <div class="pt-group"><div class="pt-tools"><button type="button" class="pt-tool wide" data-act="clear">${item ? 'Start over' : 'Clear'}</button></div><span>Image</span></div>
          </div>`,
        client: `
          <div class="pt-work">
            <div class="pt-doc">
              <canvas class="pt-canvas"></canvas>
              <i class="pt-handle r"></i><i class="pt-handle b"></i><i class="pt-handle rb"></i>
            </div>
          </div>`,
        status: `<span class="pt-pos">⌖</span><span>▭ 800 × 500px</span><span>100%</span>`,
      };
    },

    // ---------- Themes page: Personalization ----------
    personalize(_, api) {
      const e = api.esc;
      const items = api.themes.map((t) => ({ title: t.name, text: t.desc, href: `#use-theme-${t.id}`, image: api.thumb(t.id), theme: t.id }));
      return {
        title: 'Personalization',
        chrome: addressBar([{ label: 'Control Panel' }, { label: 'Appearance and Personalization' }, { label: 'Personalization' }], 'Search Control Panel', e),
        client: `
          <div class="pz">
            <nav class="pz-pane">
              <span>Control Panel Home</span>
              <span>Change desktop icons</span>
              <span>Change mouse pointers</span>
              <p>See also</p>
              <span>Display</span><span>Taskbar and Start Menu</span>
            </nav>
            <div class="pz-main">
              <h1>Change the visuals and sounds on your computer</h1>
              <p>Click a theme to change the whole site at once.</p>
              <div class="pz-box">
                <p class="pz-sec">Site themes (${items.length})</p>
                <div class="pz-grid">
                  ${items.map((item) => `
                    <a class="pz-theme ${item.theme === 'aero' ? 'is-on' : ''}" href="${e(item.href)}" title="${e(item.text)}">
                      <span class="pz-shot">${item.image ? `<img src="${e(item.image)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>
                      <span>${e(item.title)}</span>
                    </a>`).join('')}
                </div>
              </div>
              <div class="pz-strip">
                <span class="pz-opt"><i class="pz-wall"></i><b>Desktop Background</b>Bubbles</span>
                <span class="pz-opt"><i class="pz-color"></i><b>Window Color</b>Sky</span>
                <button type="button" class="pz-opt" data-act="music">${ICON.speakerOn}<b>Sounds</b><span class="pz-sound">Frutiger loop</span></button>
                <span class="pz-opt"><i class="pz-saver"></i><b>Screen Saver</b>None</span>
              </div>
            </div>
          </div>`,
        status: '',
      };
    },
  };

  // ======================= WINDOWS =======================
  function openWindow(key, site) {
    const appKey = appForPage(key);
    showWindow(key, appKey, RENDER[appKey](site, w.api), site);
  }

  // Paint isn't a page: it opens with a picture from the gallery (or blank)
  function openPaint(item) {
    const win = w.wins.paint;
    if (win && !item) { win.minimized = false; win.el.classList.remove('is-min'); focusWindow('paint'); return; }
    showWindow('paint', 'paint', RENDER.paint(item, w.api), w.site, item);
  }

  function showWindow(key, appKey, view, site, extra) {
    const e = w.api.esc;
    let win = w.wins[key];

    if (!win) {
      const el = document.createElement('section');
      el.className = `w7-win app-${appKey}`;
      el.dataset.key = key;
      el.setAttribute('role', 'dialog');
      const n = Object.keys(w.wins).length;
      const width = Math.min(1040, innerWidth - 120);
      const height = Math.min(660, innerHeight - 110);
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.left = `${Math.max(90, (innerWidth - width) / 2 + n * 26 - 30)}px`;
      el.style.top = `${Math.max(12, (innerHeight - 40 - height) / 2 + n * 22 - 20)}px`;
      w.root.querySelector('.w7-windows').append(el);
      win = w.wins[key] = { el, key, site, minimized: false };
    }

    win.site = site;
    win.el.setAttribute('aria-label', view.title);
    win.el.innerHTML = `
      <header class="w7-titlebar">
        <span class="w7-title">${ICON[APPS[appKey].icon]}<span>${e(view.title)}</span></span>
        <span class="w7-caps">
          <button type="button" class="cap cap-min" data-act="min" aria-label="Minimize"><i></i></button>
          <button type="button" class="cap cap-max" data-act="max" aria-label="Maximize"><i></i></button>
          <button type="button" class="cap cap-close" data-act="close" aria-label="Close"><i></i></button>
        </span>
      </header>
      <div class="w7-chrome">${view.chrome}</div>
      <div class="w7-client">${view.client}</div>
      ${view.status ? `<footer class="w7-status">${view.status}</footer>` : ''}`;

    if (appKey === 'explorer') wireExplorer(win);
    if (appKey === 'gallery') wireGallery(win);
    if (appKey === 'paint') wirePaint(win, extra);
    wireSearch(win);
    win.minimized = false;
    win.el.classList.remove('is-min');
    focusWindow(key);
    renderTaskbar();
  }

  function focusWindow(key) {
    const win = w.wins[key];
    if (!win) return;
    w.z += 1;
    win.el.style.zIndex = w.z;
    Object.values(w.wins).forEach((x) => x.el.classList.toggle('is-active', x === win));
    w.active = key;
    renderTaskbar();
  }

  function minimize(key) {
    const win = w.wins[key];
    win.minimized = true;
    win.el.classList.add('is-min');
    win.el.classList.remove('is-active');
    w.active = Object.values(w.wins).filter((x) => !x.minimized).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0]?.key;
    if (w.active) focusWindow(w.active); else renderTaskbar();
  }

  function closeWindow(key) {
    w.wins[key]?.cleanup?.();
    w.wins[key]?.el.remove();
    delete w.wins[key];
    if (w.active === key) w.active = null;
    renderTaskbar();
  }

  // Taskbar: pinned apps (always there) + any other open window
  function renderTaskbar() {
    const e = w.api.esc;
    const apps = pinned(w.site);
    const extra = Object.keys(w.wins).filter((k) => !apps.some((a) => a.key === k)).map((k) => ({ key: k, app: appForPage(k), label: APPS[appForPage(k)].name }));
    w.root.querySelector('.w7-apps').innerHTML = [...apps, ...extra].map((a) => {
      const win = w.wins[a.key];
      const state = win ? (w.active === a.key && !win.minimized ? 'is-open is-active' : 'is-open') : '';
      const name = a.app === 'browser' ? 'Home' : APPS[a.app].name === 'Code' ? a.label : APPS[a.app].name;
      return `<button type="button" class="w7-app ${state}" data-launch="${a.key}" title="${e(name)}" aria-label="${e(name)}">${ICON[APPS[a.app].icon]}</button>`;
    }).join('');
  }

  // Taskbar / desktop / start menu click on an app
  function launch(key) {
    if (key === 'themes') {
      closeStart();
      const win = w.wins.themes;
      if (win && !win.minimized && w.active === 'themes') minimize('themes');
      else showWindow('themes', 'personalize', RENDER.personalize(null, w.api), w.site);
      return;
    }
    if (key === 'paint') {
      closeStart();
      const win = w.wins.paint;
      if (win && !win.minimized && w.active === 'paint') minimize('paint');
      else openPaint(null);
      return;
    }
    const target = pinned(w.site).find((a) => a.key === key);
    if (!target) return;
    const win = w.wins[key];
    closeStart();
    if (win) {
      if (!win.minimized && w.active === key) { minimize(key); return; }
      win.minimized = false;
      win.el.classList.remove('is-min');
      focusWindow(key);
      if (key !== w.site.page) w.api.navigate(target.href);   // keeps the address bar honest
      return;
    }
    if (key === w.site.page) openWindow(key, w.site);
    else w.api.navigate(target.href);
  }

  // ---------- explorer ----------
  function wireExplorer(win) {
    const el = win.el;
    const details = el.querySelector('.ex-details');
    const openBtn = el.querySelector('.cmd-open');
    const e = w.api.esc;
    const showDetails = (i) => {
      const item = win.site.items[i];
      el.querySelectorAll('.ex-file').forEach((f) => f.classList.toggle('is-sel', Number(f.dataset.i) === i));
      if (!item) {
        details.innerHTML = `<span class="exd-ico">${ICON.folder}</span><div><b>${win.site.items.length} items</b></div>`;
        openBtn.removeAttribute('href');
        openBtn.setAttribute('aria-disabled', 'true');
        return;
      }
      details.innerHTML = `
        <span class="exd-ico">${item.image ? `<img src="${e(item.image)}" alt="">` : ICON.folder}</span>
        <div class="exd-main"><b>${e(item.title)}</b><span>${item.theme ? 'Theme' : 'Project'}</span></div>
        <dl><dt>Tags:</dt><dd>${e(item.tags.join('; ') || 'Add a tag')}</dd><dt>Description:</dt><dd>${e(item.text)}</dd></dl>`;
      if (item.href) { openBtn.setAttribute('href', item.href); openBtn.removeAttribute('aria-disabled'); }
      else { openBtn.removeAttribute('href'); openBtn.setAttribute('aria-disabled', 'true'); }
    };
    showDetails(-1);
    el.querySelector('.ex-grid').addEventListener('click', (ev) => {
      const f = ev.target.closest('.ex-file');
      if (f) { showDetails(Number(f.dataset.i)); w.music.blip(); }
    });
    // Favourites / All / a tag
    el.querySelector('.ex-pane').addEventListener('click', (ev) => {
      const folder = ev.target.closest('[data-view]');
      if (!folder) return;
      const view = folder.dataset.view;
      el.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('is-on', b === folder));
      let shown = 0;
      el.querySelectorAll('.ex-file').forEach((file) => {
        const hit = view === 'all' || (view === 'fav' ? file.dataset.fav === '1' : file.dataset.tags.split('|').includes(view.slice(4)));
        file.hidden = !hit;
        shown += hit;
      });
      el.querySelector('.ex-nofav').hidden = !(view === 'fav' && !shown);
      showDetails(-1);
    });
    el.querySelector('.ex-grid').addEventListener('dblclick', (ev) => {
      const f = ev.target.closest('.ex-file');
      const href = f && win.site.items[f.dataset.i].href;
      if (href) openBtn.click();
    });
  }

  // ---------- photo gallery ----------
  function wireGallery(win) {
    const el = win.el;
    const e = w.api.esc;
    const info = el.querySelector('.pg-info');
    const viewer = el.querySelector('.pg-viewer');
    const openBtn = el.querySelector('.cmd-open');
    let selected = -1;
    let slideshow = null;

    const select = (i) => {
      selected = i;
      const item = win.site.items[i];
      el.querySelectorAll('.pg-thumb').forEach((t) => t.classList.toggle('is-sel', Number(t.dataset.i) === i));
      if (!item) {
        info.innerHTML = `<div class="pgi-empty">${ICON.gallery}<p>${win.site.items.length} items</p><small>Select a picture to see its details.</small></div>`;
        el.querySelector('.pg-status').textContent = 'Select a picture to see its details';
        openBtn.removeAttribute('href');
        openBtn.setAttribute('aria-disabled', 'true');
        return;
      }
      info.innerHTML = `
        <img class="pgi-img" src="${e(item.image || win.site.sampleImage)}" alt="">
        <p class="pgi-title">${e(item.title)}</p>
        <p class="pgi-text">${e(item.text)}</p>
        <dl><dt>Tags</dt><dd>${e(item.tags.join(', ') || 'Add tags')}</dd><dt>Type</dt><dd>${item.theme ? 'Theme' : 'Picture'}</dd></dl>
        <div class="pgi-btns">
          ${item.href ? `<a class="w7-btn is-default" href="${e(item.href)}">Open</a>` : ''}
          <button type="button" class="w7-btn ${item.href ? '' : 'is-default'}" data-act="edit-paint">Edit in Paint</button>
        </div>`;
      el.querySelector('.pg-status').textContent = `${i + 1} of ${win.site.items.length}: ${item.title}`;
      if (item.href) { openBtn.setAttribute('href', item.href); openBtn.removeAttribute('aria-disabled'); }
      else { openBtn.removeAttribute('href'); openBtn.setAttribute('aria-disabled', 'true'); }
    };

    const show = (i) => {
      const n = win.site.items.length;
      if (!n) return;
      select(((i % n) + n) % n);
      const item = win.site.items[selected];
      viewer.querySelector('.pv-stage img').src = item.image || win.site.sampleImage;
      viewer.querySelector('.pv-title').textContent = item.title;
      viewer.hidden = false;
    };
    const stopShow = () => { clearInterval(slideshow); slideshow = null; viewer.querySelector('[data-act="pv-play"]').textContent = '▶'; };
    const startShow = () => {
      show(selected < 0 ? 0 : selected);
      viewer.querySelector('[data-act="pv-play"]').textContent = '❚❚';
      slideshow = setInterval(() => show(selected + 1), 3000);
    };

    select(-1);
    el.addEventListener('click', (ev) => {
      const thumb = ev.target.closest('.pg-thumb');
      if (thumb) { select(Number(thumb.dataset.i)); w.music.blip(); return; }
      const tag = ev.target.closest('[data-tag]');
      if (tag) {
        el.querySelectorAll('[data-tag]').forEach((t) => t.classList.toggle('is-on', t === tag));
        el.querySelectorAll('.pg-thumb').forEach((t) => { t.hidden = tag.dataset.tag && !t.dataset.tags.split('|').includes(tag.dataset.tag); });
        return;
      }
      const act = ev.target.closest('[data-act]')?.dataset.act;
      if (act === 'view') show(selected);
      if (act === 'slideshow' || act === 'pv-play') { slideshow ? stopShow() : startShow(); }
      if (act === 'pv-prev') { stopShow(); show(selected - 1); }
      if (act === 'pv-next') { stopShow(); show(selected + 1); }
      if (act === 'pv-close') { stopShow(); viewer.hidden = true; }
      if (act === 'edit-paint') { stopShow(); viewer.hidden = true; openPaint(win.site.items[selected < 0 ? 0 : selected] || null); }
    });
    el.addEventListener('dblclick', (ev) => { const t = ev.target.closest('.pg-thumb'); if (t) show(Number(t.dataset.i)); });
    win.cleanup = stopShow;
  }

  // ---------- paint ----------
  function wirePaint(win, item) {
    const el = win.el;
    const canvas = el.querySelector('.pt-canvas');
    const ctx = canvas.getContext('2d');
    const W = 800;
    const H = 500;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const state = { tool: 'pencil', size: 4, color: '#000000', drawing: false };
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // the picture you opened, scaled to fill the canvas (or a blank white page)
    const base = new Image();
    const reset = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
      if (base.complete && base.naturalWidth) {
        const scale = Math.max(W / base.naturalWidth, H / base.naturalHeight);
        const dw = base.naturalWidth * scale;
        const dh = base.naturalHeight * scale;
        ctx.drawImage(base, (W - dw) / 2, (H - dh) / 2, dw, dh);
      }
    };
    reset();
    if (item) { base.onload = reset; base.src = item.image || win.site.sampleImage; }

    const point = (ev) => {
      const r = canvas.getBoundingClientRect();
      return [(ev.clientX - r.left) * (W / r.width), (ev.clientY - r.top) * (H / r.height)];
    };

    el.querySelector('.pt-ribbon').addEventListener('click', (ev) => {
      const tool = ev.target.closest('[data-tool]');
      const size = ev.target.closest('[data-size]');
      const color = ev.target.closest('[data-color]');
      if (tool) { state.tool = tool.dataset.tool; el.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('is-on', b === tool)); }
      if (size) { state.size = Number(size.dataset.size); el.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('is-on', b === size)); }
      if (color) {
        state.color = color.dataset.color;
        el.querySelector('.pt-current i').style.background = state.color;
        if (state.tool === 'eraser') el.querySelector('[data-tool="pencil"]').click();
      }
      if (ev.target.closest('[data-act="clear"]')) reset();
    });

    canvas.addEventListener('pointerdown', (ev) => {
      state.drawing = true;
      canvas.setPointerCapture(ev.pointerId);
      ctx.beginPath();
      ctx.moveTo(...point(ev));
    });
    canvas.addEventListener('pointermove', (ev) => {
      const [x, y] = point(ev);
      el.querySelector('.pt-pos').textContent = `⌖ ${Math.round(x)}, ${Math.round(y)}px`;
      if (!state.drawing) return;
      ctx.strokeStyle = state.tool === 'eraser' ? '#ffffff' : state.color;
      ctx.lineWidth = state.tool === 'pencil' ? Math.max(1, state.size / 3) : state.tool === 'eraser' ? state.size * 3 : state.size;
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    });
    const stop = () => { state.drawing = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
  }

  // ---------- search boxes filter what's in the window ----------
  function wireSearch(win) {
    const input = win.el.querySelector('.w7-client .w7-search input, .w7-chrome .w7-search input');
    if (!input || win.el.classList.contains('app-browser')) return;
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      win.el.querySelectorAll('[data-search]').forEach((x) => { x.hidden = q && !x.dataset.search.includes(q); });
    });
  }

  // ---------- properties dialog (control panel + paint) ----------
  function properties(win, i) {
    const item = win.site.items[i];
    const e = w.api.esc;
    const icon = item.image ? `<img src="${e(item.image)}" alt="">` : ICON[ITEM_ICONS[i % ITEM_ICONS.length]];
    const box = document.createElement('div');
    box.className = 'w7-modal';
    box.innerHTML = `
      <div class="w7-dialog" role="dialog" aria-label="${e(item.title)} Properties">
        <header class="w7-titlebar small"><span class="w7-title"><span>${e(item.title)} Properties</span></span>
          <span class="w7-caps"><button type="button" class="cap cap-close" data-act="dlg-close" aria-label="Close"><i></i></button></span></header>
        <div class="dlg-tabs"><span class="is-on">General</span><span>Details</span></div>
        <div class="dlg-body">
          <div class="dlg-row"><span class="dlg-ico">${icon}</span><span class="dlg-field">${e(item.title)}</span></div>
          <hr>
          <dl><dt>Type:</dt><dd>${item.theme ? 'Theme' : 'Project'}</dd><dt>Tags:</dt><dd>${e(item.tags.join(', ') || '—')}</dd><dt>Description:</dt><dd>${e(item.text)}</dd></dl>
        </div>
        <div class="dlg-btns">
          ${item.href ? `<a class="w7-btn is-default" href="${e(item.href)}">Open</a>` : ''}
          <button type="button" class="w7-btn" data-act="dlg-close">OK</button>
          <button type="button" class="w7-btn" data-act="dlg-close">Cancel</button>
        </div>
      </div>`;
    win.el.append(box);
    box.querySelector('.w7-btn').focus();
    w.music.blip(true);
  }

  // ======================= START MENU, CLOCK, MUSIC =======================
  function closeStart() {
    const menu = w.root.querySelector('.w7-start');
    menu.hidden = true;
    w.root.querySelector('.w7-orb').setAttribute('aria-expanded', 'false');
  }

  function tickClock() {
    if (!w) return;
    const now = new Date();
    w.root.querySelector('.w7-clock time').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    w.root.querySelector('.w7-clock small').textContent = now.toLocaleDateString();
    w.root.querySelector('.w7-clock').title = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  function setMusicButton() {
    const btn = w.root.querySelector('.w7-music');
    btn.innerHTML = w.musicWanted ? ICON.speakerOn : ICON.speakerOff;
    btn.setAttribute('aria-label', w.musicWanted ? 'Mute music' : 'Play music');
    btn.title = btn.getAttribute('aria-label');
    w.root.querySelectorAll('.pz-sound').forEach((s) => { s.textContent = w.musicWanted ? 'Frutiger loop' : 'Muted'; });
  }

  function toggleMusic() {
    w.musicWanted = !w.musicWanted;
    try { localStorage.setItem('aero-music', w.musicWanted ? 'on' : 'off'); } catch (e) {}
    if (w.musicWanted) w.music.start(); else w.music.stop();
    setMusicButton();
  }

  // ======================= THE THEME =======================
  Theme.register('aero', {
    modes: ['light', 'dark'],   // light = sunny day, dark = night with aurora
    spa: true,                  // windows stay open and the music keeps playing between pages

    mount(root, site, api) {
      root.innerHTML = shell(site, api);
      let musicPref = 'on';
      try { musicPref = localStorage.getItem('aero-music') || 'on'; } catch (e) {}
      w = {
        root, site, api, wins: {}, z: 10, active: null,
        music: new AeroMusic(),
        musicWanted: !api.preview && musicPref !== 'off',
        stopScene: startScene(root.querySelector('.w7-scene'), api),
        stopBubbles: startBubbles(root.querySelector('.w7-bubbles'), api),
        clock: setInterval(tickClock, 15000),
      };
      tickClock();
      setMusicButton();
      openWindow(site.page, site);

      // Music plays unless muted. Browsers only allow sound after a click on the page,
      // so: try now (works if they just clicked to pick this theme), and if it's still
      // blocked, start on their next click or key press.
      w.unlock = () => {
        if (!w?.musicWanted) return;
        w.music.start().then(() => {
          if (w?.music.ctx?.state === 'running') {
            document.removeEventListener('pointerdown', w.unlock);
            document.removeEventListener('keydown', w.unlock);
          }
        }).catch(() => {});
      };
      if (w.musicWanted) w.unlock();
      document.addEventListener('pointerdown', w.unlock);
      document.addEventListener('keydown', w.unlock);
      w.onHide = () => {
        if (!w) return;
        if (document.hidden) w.music.stop();
        else if (w.musicWanted && w.music.ctx) w.music.start();
      };
      document.addEventListener('visibilitychange', w.onHide);

      if (w.musicWanted && !sessionStorage.getItem('aero-balloon') && !(navigator.userActivation?.hasBeenActive)) {
        const balloon = root.querySelector('.w7-balloon');
        balloon.hidden = false;
        sessionStorage.setItem('aero-balloon', '1');
        setTimeout(() => { balloon.hidden = true; }, 7000);
      }

      root.addEventListener('click', (ev) => {
        const t = ev.target;
        const winEl = t.closest('.w7-win');
        const win = winEl && w.wins[winEl.dataset.key];
        const act = t.closest('[data-act]')?.dataset.act;

        if (t.closest('.w7-orb')) {
          const menu = root.querySelector('.w7-start');
          menu.hidden = !menu.hidden;
          root.querySelector('.w7-orb').setAttribute('aria-expanded', String(!menu.hidden));
          w.music.blip();
          return;
        }
        if (!t.closest('.w7-start')) closeStart();

        const launcher = t.closest('[data-launch]');
        if (launcher) { launch(launcher.dataset.launch); w.music.blip(); return; }

        if (act === 'picker') { closeStart(); api.openPicker(); return; }
        if (act === 'music' || t.closest('.w7-music')) { toggleMusic(); return; }
        if (t.closest('.w7-peek')) { Object.keys(w.wins).forEach((k) => !w.wins[k].minimized && minimize(k)); return; }
        if (t.closest('.w7-balloon')) { t.closest('.w7-balloon').hidden = true; return; }

        if (win) {
          if (act === 'min') { minimize(win.key); return; }
          if (act === 'max') { winEl.classList.toggle('is-max'); return; }
          if (act === 'close') { closeWindow(win.key); return; }
          if (act === 'back') { history.back(); return; }
          if (act === 'fwd') { history.forward(); return; }
          if (act === 'refresh') { api.navigate(location.href); return; }
          if (act === 'view') { winEl.querySelector('.ex')?.classList.toggle('is-details'); return; }
          if (act === 'dlg-close') { t.closest('.w7-modal').remove(); return; }
          if (act === 'open' && t.closest('[aria-disabled]')) { ev.preventDefault(); return; }
          const props = t.closest('[data-props]');
          if (props) { properties(win, Number(props.dataset.props)); return; }
          // (windows come to the front on pointerdown, below)
        }
      });

      // drag windows by the title bar, double-click to maximize
      root.addEventListener('pointerdown', (ev) => {
        const winEl = ev.target.closest('.w7-win');
        if (winEl) focusWindow(winEl.dataset.key);
        const bar = ev.target.closest('.w7-win > .w7-titlebar');
        if (!bar || ev.target.closest('button') || winEl.classList.contains('is-max') || innerWidth < 760) return;
        const startX = ev.clientX - winEl.offsetLeft;
        const startY = ev.clientY - winEl.offsetTop;
        const move = (m) => {
          winEl.style.left = `${Math.min(innerWidth - 120, Math.max(-winEl.offsetWidth + 120, m.clientX - startX))}px`;
          winEl.style.top = `${Math.min(innerHeight - 90, Math.max(0, m.clientY - startY))}px`;
        };
        const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
        addEventListener('pointermove', move);
        addEventListener('pointerup', up);
      });
      root.addEventListener('dblclick', (ev) => {
        const bar = ev.target.closest('.w7-win > .w7-titlebar');
        if (bar && !ev.target.closest('button')) bar.parentElement.classList.toggle('is-max');
      });

      root.addEventListener('pointerover', (ev) => {
        const el = ev.target.closest('.w7-app, .w7-dicon, .sm-prog, .cap, .ex-file, .pz-theme');
        if (el && !el.contains(ev.relatedTarget)) w.music.blip();
      });

      root.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') { closeStart(); root.querySelector('.w7-modal')?.remove(); }
        if (ev.key === 'Enter' && ev.target.closest('.ex-file')) ev.target.closest('.w7-win').querySelector('.cmd-open:not([aria-disabled])')?.click();
      });

      // start menu search filters the program list
      root.querySelector('.sm-search input').addEventListener('input', (ev) => {
        const q = ev.target.value.trim().toLowerCase();
        root.querySelectorAll('.sm-prog').forEach((p) => { p.hidden = q && !p.textContent.toLowerCase().includes(q); });
      });
    },

    // the Themes button opens Personalization instead of the standard popup
    picker() { launch('themes'); },

    // a link loaded a new page: open (or refresh) that page's app
    update(root, site) {
      w.site = site;
      closeStart();
      openWindow(site.page, site);
    },

    unmount() {
      if (!w) return;
      w.music.destroy();
      w.stopScene();
      w.stopBubbles();
      clearInterval(w.clock);
      document.removeEventListener('pointerdown', w.unlock);
      document.removeEventListener('keydown', w.unlock);
      document.removeEventListener('visibilitychange', w.onHide);
      w = null;
    },
  });
})();
