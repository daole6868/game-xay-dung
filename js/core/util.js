/* Tiện ích dùng chung: số ngẫu nhiên có seed, nhiễu, toán, định dạng, sự kiện. */
(function (root) {
  'use strict';
  const G = (root.G = root.G || {});

  G.TILE = 64;

  // ---------- Ngẫu nhiên ----------
  G.makeRng = function (seed) {
    let a = seed >>> 0;
    const rng = function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.state = () => a;
    rng.setState = (s) => { a = s >>> 0; };
    return rng;
  };
  G.rand = Math.random;
  G.rnd = (a, b) => a + Math.random() * (b - a);
  G.randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  G.pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];
  G.chance = (p) => Math.random() < p;
  G.shuffle = function (arr, rng = Math.random) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  G.weighted = function (list, wfn, rng = Math.random) {
    let total = 0;
    for (const it of list) total += Math.max(0, wfn(it));
    if (total <= 0) return null;
    let r = rng() * total;
    for (const it of list) {
      r -= Math.max(0, wfn(it));
      if (r <= 0) return it;
    }
    return list[list.length - 1];
  };
  G.hash2 = function (x, y, s = 0) {
    let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // ---------- Nhiễu giá trị (value noise) ----------
  G.makeNoise = function (seed) {
    const rng = G.makeRng(seed);
    const perm = new Uint8Array(512);
    const vals = new Float32Array(256);
    for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = rng(); }
    G.shuffle(perm.subarray(0, 256), rng);
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
    const v = (x, y) => vals[perm[(perm[x & 255] + y) & 511]];
    const sm = (t) => t * t * (3 - 2 * t);
    function noise(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
      const u = sm(xf), w = sm(yf);
      return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
    }
    noise.fbm = function (x, y, oct = 4) {
      let s = 0, amp = 1, f = 1, norm = 0;
      for (let i = 0; i < oct; i++) { s += noise(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2; }
      return s / norm;
    };
    return noise;
  };

  // ---------- Toán ----------
  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  G.dist2 = (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  G.approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
  G.toTile = (px) => Math.floor(px / G.TILE);
  G.tileCenter = (t) => t * G.TILE + G.TILE / 2;

  // ---------- Định dạng ----------
  G.fmt = function (n) {
    n = Math.floor(n);
    const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return n < 0 ? '-' + s : s;
  };
  G.fmtShort = function (n) {
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'tr';
    if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1).replace('.0', '') + 'k';
    return G.fmt(n);
  };
  G.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Sự kiện ----------
  const handlers = {};
  G.on = function (evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); };
  G.off = function (evt, fn) { const l = handlers[evt]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } };
  G.emit = function (evt, data) {
    const l = handlers[evt];
    if (!l) return;
    for (const fn of l.slice()) {
      try { fn(data); } catch (e) { console.error(e); }
    }
  };

  // ---------- Hàng đợi ưu tiên (dùng cho A*) ----------
  G.Heap = class {
    constructor() { this.items = []; this.prio = []; }
    get size() { return this.items.length; }
    push(item, p) {
      const it = this.items, pr = this.prio;
      let i = it.length;
      it.push(item); pr.push(p);
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (pr[parent] <= p) break;
        it[i] = it[parent]; pr[i] = pr[parent];
        i = parent;
      }
      it[i] = item; pr[i] = p;
    }
    pop() {
      const it = this.items, pr = this.prio;
      const top = it[0];
      const lastI = it.pop(), lastP = pr.pop();
      const n = it.length;
      if (n > 0) {
        let i = 0;
        for (;;) {
          let c = 2 * i + 1;
          if (c >= n) break;
          if (c + 1 < n && pr[c + 1] < pr[c]) c++;
          if (pr[c] >= lastP) break;
          it[i] = it[c]; pr[i] = pr[c];
          i = c;
        }
        it[i] = lastI; pr[i] = lastP;
      }
      return top;
    }
  };

  let nextId = 1;
  G.newId = () => nextId++;
  G.setNextId = (n) => { nextId = Math.max(nextId, n); };
})(typeof window !== 'undefined' ? window : globalThis);
