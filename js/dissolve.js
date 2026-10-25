/* Dissolving teaser — the home page's "next article" card is not faded out and
   it does not shed dust: its own lower edge is torn, and the material below the
   tear breaks into hard, lit-edged shards that keep separating and sinking
   away. Every shard is a piece of the card's surface, coloured from the card's
   own background + glow, with a lit cut face — never a glowing dot.

   The tear is a real silhouette: a jagged polygon cut out of the card by a
   canvas mask, so what is left looks broken rather than airbrushed.

   Everything here is progressive: if canvas / mask-image is unavailable the
   CSS-only fallback still shows a readable card. */

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
const POINTER_RADIUS = 84;

/* ---------- small helpers ---------- */

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** deterministic PRNG so the tear is stable across reloads */
function rand32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** mix two hex colours and return an "r,g,b" triplet */
function mixHex(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',');
}

/** smooth 1D value noise, used for the tear line */
function noise1d(seed, step) {
  const rand = rand32(seed);
  const n = 512;
  const grid = new Float32Array(n);
  for (let i = 0; i < n; i++) grid[i] = rand();
  const fade = (t) => t * t * (3 - 2 * t);
  return (x) => {
    const g = Math.max(0, x / step);
    const i = g | 0;
    const f = fade(g - i);
    const a = grid[i % n];
    const b = grid[(i + 1) % n];
    return a + (b - a) * f;
  };
}

/* ---------- material ---------- */

/** the shards are cut from the card itself: its surface, lifted by its own
    bottom glow, with a lit cut edge */
function materials() {
  const cs = getComputedStyle(document.documentElement);
  const elev = (cs.getPropertyValue('--bg-elev') || '').trim() || '#101a2e';
  const accent = (cs.getPropertyValue('--accent-2') || '').trim() || '#60a5fa';
  const ink = (cs.getPropertyValue('--text') || '').trim() || '#e6edf7';
  const dark = document.documentElement.dataset.theme === 'dark';
  return dark
    ? {
        /* deeper into the card → darker material */
        deep: mixHex(elev, accent, 0.06),
        mid: mixHex(elev, accent, 0.24),
        edge: mixHex(elev, accent, 0.44),
        /* the freshly cut face catches the light */
        cut: mixHex(accent, '#ffffff', 0.34),
      }
    : {
        /* on white the chips need to be tinted down or they vanish */
        deep: mixHex(elev, ink, 0.14),
        mid: mixHex(elev, accent, 0.34),
        edge: mixHex(elev, accent, 0.56),
        cut: mixHex(accent, '#ffffff', 0.1),
      };
}

/* ---------- torn mask ---------- */

/**
 * Cut the card along a jagged line: everything above the tear stays solid,
 * everything below is gone. `line` is the tear (x → y), built once per layout so
 * the shards can be born exactly on it.
 */
function buildTornMask(w, h, line) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w));
  cv.height = Math.max(1, Math.round(h));
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  for (let i = line.length - 1; i >= 0; i--) ctx.lineTo(line[i].x, line[i].y);
  ctx.closePath();
  ctx.fill();
  return { url: cv.toDataURL('image/png') };
}

/* ---------- mount ---------- */

export function mountDissolve(wrap) {
  if (!wrap || typeof wrap.getBoundingClientRect !== 'function') return;
  const card = wrap.querySelector('.dissolve-card');
  const canvas = wrap.querySelector('.dissolve-motes');
  if (!card || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduced = window.matchMedia?.(REDUCED_QUERY).matches === true;

  let W = 0;
  let H = 0;
  let line = []; // tear polyline, left → right
  let shards = [];
  let mat = materials();
  let raf = 0;
  let last = 0;
  let visible = true;
  let boost = 1;
  let boostTarget = 1;
  const pointer = { x: 0, y: 0, on: false };

  const tearAt = (x) => {
    if (line.length < 2) return H;
    const i = Math.max(0, Math.min(line.length - 2, Math.round((x / W) * (line.length - 1))));
    const a = line[i];
    const b = line[i + 1] || a;
    const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
    return a.y + (b.y - a.y) * clamp01(t);
  };

  /* --- geometry + mask --- */
  function layout() {
    const rect = wrap.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === W && h === H) return;

    /* .dissolve-card is stretched to the whole wrap, so the material's real
       height comes from the card itself */
    const pc = card.querySelector('.post-card');
    const cardH = (pc && pc.offsetHeight) || Math.round(h * 0.78);
    /* the tear runs through the card's own lower margin: every line of type
       stays whole, and the material under it is what breaks off */
    const base = cardH - 30;
    const wob = noise1d(0x7a1c3, 41);
    const fine = noise1d(0x51bb9, 12);
    const bite = noise1d(0x2c93f, 74);

    line = [];
    const step = 8;
    for (let x = 0; x <= w; x += step) {
      const y =
        base +
        (wob(x) - 0.5) * 9 +
        (fine(x) - 0.5) * 4 +
        /* a couple of deep gashes: the edge of a torn sheet is mostly straight
           with the occasional chunk missing, not a range of peaks */
        Math.pow(Math.max(0, bite(x) - 0.66) / 0.34, 2.2) * 26;
      line.push({ x, y });
    }

    W = w;
    H = h;
    try {
      const mask = buildTornMask(w, h, line);
      const url = `url("${mask.url}")`;
      card.style.webkitMaskImage = url;
      card.style.maskImage = url;
      card.style.webkitMaskSize = `${w}px ${h}px`;
      card.style.maskSize = `${w}px ${h}px`;
      card.style.webkitMaskRepeat = 'no-repeat';
      card.style.maskRepeat = 'no-repeat';
    } catch {
      card.style.maskImage = '';
      card.style.webkitMaskImage = '';
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    seedShards();
    if (reduced) draw(0);
  }

  /* --- shard field --- */
  function seedShards() {
    /* fewer, bigger pieces read as a broken object; dust reads as a filter */
    const target = Math.min(190, Math.max(60, Math.round((W * H) / 900)));
    shards = [];
    for (let i = 0; i < target; i++) {
      const s = { x: 0, y: 0, w: 4, h: 3, vx: 0, vy: 0, rot: 0, spin: 0, life: 1, age: 0, a: 1, fill: mat.mid, cut: 1 };
      respawn(s, true);
      shards.push(s);
    }
  }

  function respawn(s, initial) {
    /* born on the tear itself, so it always looks like it just came off it */
    const x = Math.random() * W;
    s.x = x;
    s.y = tearAt(x) + Math.random() * 6;
    /* a piece of the card, not a grain of sand: mostly chips of 4–15px, with
       the occasional big fragment that is unmistakably part of the surface */
    s.w = Math.random() < 0.14 ? 16 + Math.random() * 18 : 4 + Math.pow(Math.random(), 2) * 11;
    s.h = Math.max(2.5, s.w * (0.32 + Math.random() * 0.5));
    s.rot = Math.random() * Math.PI;
    s.spin = (Math.random() - 0.5) * 1.6;
    /* it falls away from the card, slowly, and is gone before the CTA */
    s.vx = (Math.random() - 0.5) * 10;
    s.vy = 5 + Math.random() * 11;
    s.life = 1.5 + Math.random() * 1.9;
    s.a = 0.5 + Math.random() * 0.5;
    s.cut = 0.55 + Math.random() * 0.45;
    const r = Math.random();
    s.fill = r < 0.3 ? mat.deep : r < 0.72 ? mat.mid : mat.edge;
    s.age = 0;
    if (initial) {
      /* already mid-fall on first paint */
      s.age = Math.random() * s.life * 0.55;
      s.y += s.vy * s.age * 0.85;
      s.rot += s.spin * s.age;
    }
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    boost += (boostTarget - boost) * Math.min(1, dt * 5);

    const px = pointer.x;
    const py = pointer.y;
    const orbiting = pointer.on && !reduced;
    const R = POINTER_RADIUS;

    for (const s of shards) {
      if (orbiting) {
        const dx = s.x - px;
        const dy = s.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 0.001;
          const f = 1 - d / R;
          const g = f * f;
          /* tangential push + a light inward pull: the shards swing around the
             pointer like debris in a current */
          s.vx += ((-dy / d) * 230 - (dx / d) * 40) * g * dt;
          s.vy += ((dx / d) * 230 - (dy / d) * 40) * g * dt;
          s.spin += (Math.random() - 0.5) * 6 * g * dt;
        }
      }

      s.age += dt;
      s.x += s.vx * dt * boost;
      s.y += s.vy * dt * boost;
      s.rot += s.spin * dt * boost;

      if (s.age > s.life || s.y > H + 24 || s.x < -30 || s.x > W + 30) {
        respawn(s, false);
        continue;
      }

      const t = s.age / s.life;
      const fade = (t < 0.12 ? t / 0.12 : 1) * Math.pow(1 - t, 1.25);
      const alpha = s.a * fade;
      if (alpha <= 0.01) continue;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = Math.min(1, alpha);

      /* the chip: a slightly skewed quad, so no two read as identical — and it
         keeps shrinking as it goes, so a piece dissolves instead of just
         switching off */
      const shrink = 1 - t * 0.42;
      const hw = (s.w * shrink) / 2;
      const hh = (s.h * shrink) / 2;
      ctx.beginPath();
      ctx.moveTo(-hw, -hh);
      ctx.lineTo(hw, -hh + s.h * 0.18);
      ctx.lineTo(hw - s.w * 0.08, hh);
      ctx.lineTo(-hw + s.w * 0.06, hh - s.h * 0.12);
      ctx.closePath();
      ctx.fillStyle = `rgb(${s.fill})`;
      ctx.fill();

      /* the freshly cut edge catches the light — this is what makes the piece
         read as solid material rather than a speck */
      ctx.globalAlpha = Math.min(1, alpha * 0.5 * s.cut);
      ctx.strokeStyle = `rgb(${mat.cut})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-hw, -hh);
      ctx.lineTo(hw, -hh + s.h * 0.18);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* --- rAF loop, self-terminating when the node is gone --- */
  function frame(now) {
    if (!wrap.isConnected) {
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden || document.documentElement.classList.contains('splash-pending')) {
      last = now;
      return;
    }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    draw(dt);
  }

  function start() {
    if (reduced || raf) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  /* --- reactions --- */
  const onPalette = () => {
    if (!wrap.isConnected) {
      window.removeEventListener('theme-change', onPalette);
      window.removeEventListener('future-change', onPalette);
      return;
    }
    mat = materials();
    const tones = [mat.deep, mat.mid, mat.edge];
    for (const s of shards) s.fill = tones[(Math.random() * tones.length) | 0];
    if (reduced) draw(0);
  };

  wrap.addEventListener('pointermove', (e) => {
    const r = wrap.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.on = true;
    boostTarget = 1.2;
  });
  wrap.addEventListener('pointerleave', () => {
    pointer.on = false;
    boostTarget = 1;
  });

  window.addEventListener('theme-change', onPalette);
  window.addEventListener('future-change', onPalette);

  if (typeof ResizeObserver === 'function') {
    let t = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(layout, 140);
    });
    ro.observe(wrap);
  } else {
    window.addEventListener('resize', layout);
  }

  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
      },
      { rootMargin: '120px' }
    ).observe(wrap);
  }

  layout();
  start();
}
