/*
 * Đồ hoạ dự phòng: vẽ thủ tục (Canvas 2D) mọi khoá sprite của TS_CATALOG theo phong cách pixel kiểu Tiny Swords.
 *   Fallback.get(key)     -> { img, fw, fh, n, ax, ay, scale } | null  (tạo lười, có bộ nhớ đệm)
 *   Fallback.iconURL(key) -> data URL PNG của khung đầu (kích thước hiển thị) | null
 *   Fallback.has(key)     -> boolean
 * Mỗi khung được vẽ vào bộ đệm điểm ảnh riêng (không khử răng cưa), từng "mảnh" có viền tối tự động.
 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;

  // ================= Màu =================
  const OL = '#1d1f33';
  const _rgb = new Map(), _u = new Map(), _pal = {};
  function rgb(h) {
    let v = _rgb.get(h);
    if (!v) { const n = parseInt(h.slice(1, 7), 16); v = [n >> 16 & 255, n >> 8 & 255, n & 255]; _rgb.set(h, v); }
    return v;
  }
  const c8 = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const hex = (r, g, b) => '#' + ((1 << 24) | c8(r) << 16 | c8(g) << 8 | c8(b)).toString(16).slice(1);
  function mix(a, b, t) { const A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  const lt = (c, t) => mix(c, '#ffffff', t), dk = (c, t) => mix(c, OL, t);
  const al = (c, a) => c.slice(0, 7) + c8(a * 255).toString(16).padStart(2, '0');
  function U(c) {
    if (typeof c === 'number') return c;
    let v = _u.get(c);
    if (v === undefined) {
      const n = parseInt(c.slice(1, 7), 16), a = c.length > 7 ? parseInt(c.slice(7, 9), 16) : 255;
      v = ((a << 24) | (n & 255) << 16 | (n & 0xff00) | (n >> 16 & 255)) >>> 0; _u.set(c, v);
    }
    return v;
  }
  const tri = (m, d, l, x) => Object.assign({ m, d, l }, x);

  const FAC = {
    blue: ['#3f7ee0', '#24479a'], red: ['#d64545', '#8f2430'], yellow: ['#e9b93a', '#a8771d'], purple: ['#9b59d6', '#5e3191'], black: ['#4b4d5e', '#25262f'],
    green: ['#4fa34a', '#2c6b2f'], orange: ['#e8823a', '#a14f1c'], white: ['#e6e7ee', '#a3a6b8'], pink: ['#e573b0', '#9c3a72'],
    cyan: ['#3fc1c9', '#22777f'], brown: ['#9a6a44', '#5e3b26'], gray: ['#8d93a3', '#5a6070'], grey: ['#8d93a3', '#5a6070'],
  };
  function hsl(h, s, l) {
    const a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
    return hex(f(0), f(8), f(4));
  }
  /** Bảng màu phe: m chính, d tối, l sáng, s nửa tối, dd rất tối. Màu lạ -> suy từ mã hex hoặc băm tên. */
  function pal(c) {
    if (_pal[c]) return _pal[c];
    let mm = FAC[c];
    if (!mm) { const h = hashS(c) % 360; mm = /^[0-9a-f]{6}$/i.test(c) ? ['#' + c, dk('#' + c, 0.45)] : [hsl(h, 0.6, 0.55), hsl(h, 0.55, 0.32)]; }
    const [m, d] = mm;
    return (_pal[c] = { m, d, l: lt(m, 0.38), s: mix(m, d, 0.45), dd: dk(d, 0.3) });
  }

  const SKIN = tri('#f5caa0', '#d69a72', '#ffe4c8');
  const STEEL = tri('#c4c9d6', '#858ca1', '#eef1f7');
  const WOOD = tri('#b0733f', '#76482b', '#d59a5e');
  const LEATH = tri('#94643f', '#654128', '#bb875a');
  const GOLD = tri('#f3c63f', '#c2841c', '#fff1a3', { k: '#93600f' });
  const TAN = tri('#cc9c63', '#9a6a3c', '#e9c18a');
  const STONE = tri('#e0d5bd', '#b6a689', '#f4eddd', { v: '#d3c6aa', k: '#a39275' });
  const RUIN = tri('#cfc7b4', '#9f957f', '#e4ddcc', { v: '#c0b7a2', k: '#8d836e' });
  const ROCK = tri('#a3a9b7', '#6f768a', '#ced3dd', { k: '#555b6f' });
  const LEAF = tri('#3f9b70', '#2c7059', '#6cc488', { k: '#215550' });
  const BUSH = tri('#4fa66b', '#317656', '#80cf8b', { k: '#245a4c' });
  const WOOL = tri('#f7f6f0', '#c8ccd8', '#ffffff', { k: '#a9afc0' });
  const RED = tri('#d0473d', '#922b2e', '#ee7a62', { s: '#b13a36', dd: '#5c2224' });
  const MEAT = tri('#c9573f', '#8f3226', '#ef8f6e');
  const GREEN = tri('#5cae45', '#367a33', '#8ed468');
  const ORANGE = tri('#ec8a2e', '#b4531c', '#ffbc5c');
  const CLOTH = tri('#efe6cc', '#c9b892', '#fffaf0');
  const BONE = '#f3ecd9', GLASS = '#323858', GLASS2 = '#5a6898', STR = '#f4ecd8';

  // ================= Ngẫu nhiên có hạt giống =================
  function hashS(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function RNG(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function h2(a, b) { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  // ================= Bộ đệm điểm ảnh & hình cơ bản =================
  function Buf(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); this.reset(); }
  Buf.prototype.reset = function () { this.x0 = this.y0 = 1e9; this.x1 = this.y1 = -1; };
  let T = null, M = null, Q = null, OX = 0, OY = 0;
  const org = (x, y) => { OX = x; OY = y; };

  function over(d, s) {
    const sa = (s >>> 24) / 255, da = (d >>> 24) / 255, k = da * (1 - sa), oa = sa + k;
    if (oa <= 0) return 0;
    const ch = (sh) => Math.round((((s >>> sh) & 255) * sa + ((d >>> sh) & 255) * k) / oa);
    return ((Math.round(oa * 255) << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)) >>> 0;
  }
  function pu(x, y, u) {
    x = Math.floor(x) + OX; y = Math.floor(y) + OY;
    const t = T;
    if (x < 0 || y < 0 || x >= t.w || y >= t.h) return;
    const i = y * t.w + x, a = u >>> 24;
    if (a === 255) t.d[i] = u; else if (a) t.d[i] = over(t.d[i], u); else return;
    if (x < t.x0) t.x0 = x; if (x > t.x1) t.x1 = x; if (y < t.y0) t.y0 = y; if (y > t.y1) t.y1 = y;
  }
  const px = (x, y, c) => pu(x, y, U(c));
  function rect(x, y, w, h, c) { const u = U(c); x = Math.round(x); y = Math.round(y); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pu(x + i, y + j, u); }
  function cutE(cx, cy, rx, ry) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) erase(x, y, 1, 1); }
  function erase(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const X = i + OX, Y = j + OY; if (X >= 0 && Y >= 0 && X < T.w && Y < T.h) T.d[Y * T.w + X] = 0; } }
  /** Tô vùng chữ nhật bằng hàm màu fn(x,y) (toạ độ nguyên). */
  function fillFn(x0, y0, x1, y1, fn) {
    x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = fn(x, y); if (c) pu(x, y, U(c)); }
  }
  const ell = (cx, cy, rx, ry, c) => fillFn(cx - rx - 1, cy - ry - 1, cx + rx, cy + ry, (x, y) => { const u = (x + .5 - cx) / rx, v = (y + .5 - cy) / ry; return u * u + v * v <= 1 ? c : 0; });
  const ring = (cx, cy, rx, ry, t, c) => fillFn(cx - rx - 1, cy - ry - 1, cx + rx, cy + ry, (x, y) => {
    const X = x + .5 - cx, Y = y + .5 - cy; return (X / rx) ** 2 + (Y / ry) ** 2 <= 1 && (X / (rx - t)) ** 2 + (Y / (ry - t)) ** 2 > 1 ? c : 0;
  });
  /** Đa giác (mảng phẳng [x0,y0,x1,y1,...]) tô theo tâm điểm ảnh; c là màu hoặc hàm (x,y). */
  function polyFn(p, c) {
    const fn = typeof c === 'function' ? c : () => c, n = p.length >> 1, xs = [];
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 1; i < p.length; i += 2) { if (p[i] < y0) y0 = p[i]; if (p[i] > y1) y1 = p[i]; }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5; xs.length = 0;
      for (let i = 0; i < n; i++) {
        const ax = p[2 * i], ay = p[2 * i + 1], j = (i + 1) % n, bx = p[2 * j], by = p[2 * j + 1];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) { const cc = fn(x, y); if (cc) pu(x, y, U(cc)); }
      }
    }
  }
  const poly = polyFn;
  function line(x0, y0, x1, y1, c, w) {
    const u = U(c), n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      if (!w || w <= 1) pu(x, y, u);
      else if (w === 2) { const X = Math.round(x - .5), Y = Math.round(y - .5); pu(X, Y, u); pu(X + 1, Y, u); pu(X, Y + 1, u); pu(X + 1, Y + 1, u); }
      else {
        const r = w / 2;
        for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
          if ((xx + .5 - x) ** 2 + (yy + .5 - y) ** 2 <= r * r) pu(xx, yy, u);
        }
      }
    }
  }
  function pline(p, c, w) { for (let i = 0; i + 3 < p.length; i += 2) line(p[i], p[i + 1], p[i + 2], p[i + 3], c, w); }
  /** Phép quay quanh (hx,hy): trả hàm đổi toạ độ cục bộ -> thế giới. */
  function rp(hx, hy, a) { const C = Math.cos(a), S = Math.sin(a); return (lx, ly) => [hx + lx * C - ly * S, hy + lx * S + ly * C]; }
  function rpoly(hx, hy, a, pts, c) {
    const C = Math.cos(a), S = Math.sin(a), q = [];
    for (let i = 0; i < pts.length; i += 2) q.push(hx + pts[i] * C - pts[i + 1] * S, hy + pts[i] * S + pts[i + 1] * C);
    polyFn(q, typeof c === 'function' ? (x, y) => { const dx = x + .5 - hx, dy = y + .5 - hy; return c(dx * C + dy * S, -dx * S + dy * C); } : c);
  }
  function rline(hx, hy, a, x0, x1, c, w) { const t = rp(hx, hy, a), A = t(x0, 0), B = t(x1, 0); line(A[0], A[1], B[0], B[1], c, w || 2); }

  /** Khối elip có bóng (dưới-phải tối, đốm sáng trên-trái). */
  function ball(cx, cy, rx, ry, p) {
    fillFn(cx - rx - 1, cy - ry - 1, cx + rx, cy + ry, (x, y) => {
      const X = x + .5 - cx, Y = y + .5 - cy;
      if ((X / rx) ** 2 + (Y / ry) ** 2 > 1) return 0;
      if (((X + rx * .2) / rx) ** 2 + ((Y + ry * .32) / ry) ** 2 > 1) return p.d;
      if (p.l && ((X + rx * .38) / (rx * .42)) ** 2 + ((Y + ry * .5) / (ry * .3)) ** 2 < 1) return p.l;
      return p.m;
    });
  }
  /** Cụm lá/len tròn: như ball nhưng mép dưới có viền tối k. */
  function lump(cx, cy, r, p) {
    fillFn(cx - r - 1, cy - r - 1, cx + r, cy + r, (x, y) => {
      const X = x + .5 - cx, Y = y + .5 - cy, d = X * X + Y * Y;
      if (d > r * r) return 0;
      if ((X + r * .22) ** 2 + (Y + r * .34) ** 2 > r * r) return p.k && Y > 0 && d > (r - 1.3) ** 2 ? p.k : p.d;
      if ((X + r * .38) ** 2 + (Y + r * .45) ** 2 < r * r * .09) return p.l;
      return p.m;
    });
  }
  /** Hộp bo góc có bóng (đáy & mép phải tối, mép trái sáng). */
  function sbox(x, y, w, h, p, sb) {
    sb = sb || 2;
    fillFn(x, y, x + w - 1, y + h - 1, (X, Y) => {
      const i = X - x, j = Y - y;
      if ((i === 0 || i === w - 1) && (j === 0 || j === h - 1)) return 0;
      if (j >= h - sb || i >= w - 2) return p.d;
      return i < 1 || j < 1 ? p.l : p.m;
    });
  }
  function sparkle(x, y, s, c) { rect(x - s, y, 2 * s + 1, 1, c); rect(x, y - s, 1, 2 * s + 1, c); px(x, y, '#ffffff'); }

  /** Vẽ một "mảnh" vào lớp tạm rồi ghép lên khung kèm viền tối (oc=null: không viền; a: độ trong). */
  function part(fn, oc, a) {
    if (T === Q) { fn(); return; }
    const prev = T; T = Q; fn(); T = prev;
    stamp(oc === undefined ? OL : oc, a === undefined ? 1 : a);
  }
  function stamp(oc, ga) {
    const S = Q; if (S.x1 < 0) return;
    const w = S.w, h = S.h, d = S.d, D = T.d, ou = oc ? U(ga < 1 ? al(oc, ga) : oc) : 0;
    const x0 = Math.max(0, S.x0 - 1), x1 = Math.min(w - 1, S.x1 + 1), y0 = Math.max(0, S.y0 - 1), y1 = Math.min(h - 1, S.y1 + 1);
    const op = (i) => d[i] >>> 24 > 127;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x, s = d[i];
        if (s >>> 24) {
          const v = ga < 1 ? ((((s >>> 24) * ga) << 24) | (s & 0xffffff)) >>> 0 : s;
          D[i] = v >>> 24 === 255 ? v : over(D[i], v);
        } else if (ou && ((x > 0 && op(i - 1)) || (x < w - 1 && op(i + 1)) || (y > 0 && op(i - w)) || (y < h - 1 && op(i + w)))) {
          D[i] = ou >>> 24 === 255 ? ou : over(D[i], ou);
        }
      }
    }
    for (let y = S.y0; y <= S.y1; y++) d.fill(0, y * w + S.x0, y * w + S.x1 + 1);
    S.reset();
  }
  const shadowE = (cx, cy, rx, ry, a) => ell(cx, cy, rx, ry, al(OL, a || 0.28));

  // ================= Lính =================
  const PANTS = '#5f4535', BOOT = '#3b2c27', GREAVE = '#7d8398';
  const TOOL = { warrior: 'sword', archer: 'bow', lancer: 'lance', monk: 'staff' };
  // [tay x, tay y, góc dụng cụ, nghiêng, vẽ sau đầu?]
  const SW = {
    axe: [[5, -10, -1.3, 0], [0, -20, -2.4, -1, 1], [-2, -21, -2.8, -1, 1], [6, -17, -1.0, 1], [9, -9, 0.45, 1], [7, -10, -0.5, 0]],
    hammer: [[5, -10, -1.5, 0], [1, -19, -2.2, -1, 1], [0, -20, -2.5, -1, 1], [6, -16, -1.1, 1], [9, -10, 0.25, 1], [7, -10, -0.6, 0]],
    knife: [[7, -10, -0.3, 0], [8, -12, -0.7, 0], [9, -8, 0.4, 1], [8, -9, 0.0, 0]],
    attack1: [[-3, -13, -2.9, -1, 1], [8, -12, -0.25, 1], [9, -9, 0.5, 2], [7, -9, -0.8, 1]],
    attack2: [[0, -25, -2.1, -1, 1], [8, -20, -0.8, 1], [10, -9, 0.95, 2], [8, -9, 0.3, 1]],
    thrust: [[1, -11, -0.15, -1], [13, -12, -0.04, 3], [7, -10, -0.25, 1]],
  };
  // vệt chém: [tâm x, tâm y, rx, ry, góc đầu, góc cuối, dày]
  const ARC = { attack1: [null, [3, -12, 21, 12, -2.2, 0.5, 6], [3, -12, 21, 12, -0.9, 1.1, 4], null], attack2: [null, [2, -14, 20, 20, -2.3, -0.5, 6], [2, -13, 20, 20, -1.5, 1.0, 4], null] };
  const PULL = [0, 1, 3, 5, 6, 6, -1, -1];
  const HEAL = [0, .5, 1, 1, 1, 1, 1, 1, 1, .6, .2], GLOW = [0, 0, .3, .7, 1, 1, 1, .8, .6, .3, 0];

  function pose(kind, anim, f, n) {
    const ph = f / n * TAU, s = Math.sin(ph), c = Math.cos(ph), fi = (len) => Math.min(len - 1, Math.floor(f * len / n));
    const p = { b: s > 0.3 ? 1 : 0, L: 0, lg: [0, 0, 0, 0], hf: [7, -8], hb: [-7, -8], a: -1.25, tool: TOOL[kind] || null, pull: -1 };
    if (anim.startsWith('run')) {
      const k = Math.round(2 * s);
      p.lg = [-k, -Math.round(Math.max(0, -c) * 1.6), k, -Math.round(Math.max(0, c) * 1.6)];
      p.b = Math.abs(s) < 0.5 ? -1 : 0; p.L = 1; p.hf = [6 - k, -8]; p.hb = [-6 + k, -8];
    }
    const sw = SW[anim === 'pickaxe' ? 'axe' : kind === 'lancer' && anim === 'attack' ? 'thrust' : anim];
    if (sw) {
      const r = sw[fi(sw.length)];
      p.hf = [r[0], r[1]]; p.a = r[2]; p.L = r[3]; p.tb = !!r[4]; p.hb = [r[0] - 3, r[1] + 1]; p.b = 0;
      if (kind === 'pawn') p.tool = anim;
    }
    if (ARC[anim] && kind === 'warrior') p.arc = ARC[anim][fi(4)];
    const ld = /_(wood|gold|meat)$/.exec(anim);
    if (ld) { p.load = ld[1]; p.up = 1; p.hf = [8, -29]; p.hb = [-9, -29]; }
    if (kind === 'warrior') {
      if (anim === 'run') p.a = -0.85;
      if (anim === 'guard') { p.shF = 1; p.hf = [1, -17]; p.a = -2.0; p.tb = 1; p.b = f % 3 ? 1 : 0; }
    } else if (kind === 'archer') {
      p.hf = [8, anim === 'run' ? -10 : -11];
      if (anim === 'shoot') { const i = fi(8); p.pull = PULL[i]; p.rel = i === 6; p.hf = [9, -12]; p.hbF = 1; p.hb = p.pull >= 0 ? [5 - p.pull, -12] : [3, -9]; p.b = 0; }
    } else if (kind === 'lancer') {
      if (!sw) { p.hf = [6, -10]; p.a = anim === 'run' ? -0.15 : -0.4; } else if (fi(3) === 1) p.lines = 1;
    } else if (kind === 'monk') {
      p.a = -Math.PI / 2; p.hf = [7, -9 + (anim === 'run' ? 1 : 0)];
      if (anim === 'heal') { const r = HEAL[fi(11)]; p.hf = [7 + Math.round(r), -9 - Math.round(8 * r)]; p.glow = GLOW[fi(11)]; p.b = 0; }
    }
    return p;
  }

  function legs(p, pants, robe) {
    for (let k = 0; k < 2; k++) {
      const x = (k ? 1 : -5) + p.lg[2 * k], y = p.lg[2 * k + 1];
      if (!robe) rect(x, y - 5, 4, 2, pants);
      rect(x, y - 3, 4, 2, BOOT); px(x + 4, y - 2, BOOT);
    }
  }
  function body(P, top, belt) {
    fillFn(-6, -15, 5, -3, (x, y) => {
      if ((x === -6 || x === 5) && (y === -15 || y === -3)) return 0;
      if (belt && y === -6) return belt;
      if (top && y <= -14) return top;
      if (y >= -4 || x >= 4) return P.d;
      return x <= -5 ? P.l : P.m;
    });
  }
  function robe(P) {
    polyFn([-6, -15, 5, -15, 8, -2, -8, -2], (x, y) => y === -8 ? TAN.d : y >= -4 || x >= 3 + (y + 15) * 0.3 ? P.d : x <= -5 - (y + 15) * 0.1 ? P.l : P.m);
  }
  /** Đầu tròn tâm (0,-23); mat(u,v) trả bảng màu hoặc màu phẳng; ex: lệch mắt (false = không mắt). */
  function head(mat, ex) {
    fillFn(-8, -31, 7, -16, (x, y) => {
      const u = (x + .5) / 8, v = (y + .5 + 23) / 7.5;
      if (u * u + v * v > 1) return 0;
      const m = mat(u, v);
      if (typeof m === 'string') return m;
      if ((u + .18) ** 2 + (v + .3) ** 2 > 1.02) return m.d;
      if (m.l && (u + .4) ** 2 * 2.2 + (v + .62) ** 2 * 5 < .22) return m.l;
      return m.m;
    });
    if (ex !== false) { rect(2 + (ex | 0), -24, 1, 2, OL); rect(5 + (ex | 0), -24, 1, 2, OL); }
  }
  function arm(sx, sy, h, sl, hd, w) { part(() => { line(sx, sy, h[0], h[1], sl, w || 3); ball(h[0], h[1], 2, 2, hd); }); }
  function shield(cx, cy, P) {
    part(() => {
      poly([cx - 5, cy - 6, cx + 5, cy - 6, cx + 5, cy + 1, cx, cy + 7, cx - 5, cy + 1], STEEL.d);
      polyFn([cx - 4, cy - 5, cx + 4, cy - 5, cx + 4, cy + 1, cx, cy + 5.5, cx - 4, cy + 1], (x) => x < cx ? P.m : P.s);
      rect(cx - 1, cy - 4, 2, 7, P.l); rect(cx - 3, cy - 2, 6, 2, P.l);
    });
  }
  function sword(x, y, a, L) {
    rline(x, y, a, -4, 0, LEATH.d, 2); rpoly(x, y, a, [0, -3.5, 2, -3.5, 2, 3.5, 0, 3.5], GOLD.m);
    rpoly(x, y, a, [2, -1.6, L - 3.5, -1.6, L, 0, L - 3.5, 1.6, 2, 1.6], (u, v) => v < 0 ? STEEL.l : STEEL.m);
  }
  function arrowShape(x0, y, x1, P) {
    line(x0, y, x1 - 3, y, WOOD.l, 1); poly([x1 - 4, y - 1.5, x1 + 1, y + .5, x1 - 4, y + 2.5], STEEL.m);
    rect(x0, y - 1, 3, 1, '#f1ede2'); rect(x0, y + 1, 3, 1, P ? P.l : '#f1ede2');
  }
  function tool(k, h, a, P, f) {
    const [hx, hy] = h;
    if (k === 'bow') return bow(hx, hy, -1, P);
    part(() => {
      if (k === 'axe') { rline(hx, hy, a, -3, 12, WOOD.m); rpoly(hx, hy, a, [8, -1, 12, -1, 13, 5, 10.5, 6, 8, 3], (u, v) => v > 3.5 ? STEEL.l : STEEL.m); }
      else if (k === 'pickaxe') { rline(hx, hy, a, -3, 11, WOOD.m); const t = rp(hx, hy, a), A = t(11, 0), B = t(8, -6), C = t(8, 6); line(B[0], B[1], A[0], A[1], STEEL.m, 2); line(A[0], A[1], C[0], C[1], STEEL.m, 2); }
      else if (k === 'hammer') { rline(hx, hy, a, -3, 9, WOOD.m); rpoly(hx, hy, a, [7, -3, 12, -3, 12, 4, 7, 4], (u, v) => v > 2 ? STEEL.d : STEEL.m); }
      else if (k === 'knife') { rline(hx, hy, a, -3, 0, LEATH.d); rpoly(hx, hy, a, [0, -1.5, 6, -1.5, 8.5, 0.5, 0, 1.5], STEEL.l); }
      else if (k === 'sword') sword(hx, hy, a, 18.5);
      else if (k === 'lance') {
        const w = f & 1;
        rline(hx, hy, a, -14, 44, WOOD.m, 2); rpoly(hx, hy, a, [43, -2.5, 53, 0, 43, 2.5], STEEL.m);
        rpoly(hx, hy, a, [32, 1, 41, 1, 27 - w, 6 + w], P.m);
        rpoly(hx, hy, a, [1, -4.5, 8, -1.3, 8, 1.3, 1, 4.5], (u, v) => v < 0 ? STEEL.l : STEEL.m);
      } else if (k === 'staff') { rline(hx, hy, a, -8, 23, WOOD.m, 2); const t = rp(hx, hy, a)(26, 0); ball(t[0], t[1], 3, 3, GOLD); px(t[0] - 1, t[1] - 2, '#ffffff'); }
    });
  }
  function bow(hx, hy, pull, P) {
    const pts = [], b = 4 + Math.max(0, pull) * 0.3;
    for (let i = -4; i <= 4; i++) { const t = i / 4; pts.push(hx + 1 - b * t * t, hy + 9 * t); }
    part(() => pline(pts, WOOD.m, 2));
    const tx = pts[0] + 0.5, sx = hx - 3 - Math.max(0, pull);
    line(tx, hy - 8, sx, hy, STR, 1); line(sx, hy, tx, hy + 8, STR, 1);
    if (pull > 0) part(() => arrowShape(sx, hy, hx + 9, P));
  }
  function load(k) {
    part(() => {
      if (k === 'wood') { log(-9, -35, 15); log(-7, -40, 13); }
      else if (k === 'gold') { ball(0, -35, 7, 5, GOLD); px(-3, -38, '#ffffff'); px(-2, -38, '#ffffff'); px(3, -36, '#ffffff'); }
      else { line(-6, -37, -10, -40, BONE, 3); ball(-11, -41, 1.6, 1.6, CLOTH); ball(-9, -42, 1.6, 1.6, CLOTH); ball(1, -35, 7.5, 5, MEAT); }
    });
  }
  function log(x, y, len) {
    fillFn(x, y, x + len - 1, y + 4, (X, Y) => Y === y ? WOOD.l : Y === y + 4 ? WOOD.d : (X + Y * 3) % 7 === 0 ? WOOD.d : WOOD.m);
    ell(x + len, y + 2.5, 2, 2.5, TAN.l); px(x + len, y + 2, TAN.d);
  }
  /** Vệt chém hình lưỡi liềm (elip), dày nhất gần đầu mũi. */
  function slash(cx, cy, rx, ry, a0, a1, th) {
    fillFn(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (x, y) => {
      const X = (x + .5 - cx) / rx, Y = (y + .5 - cy) / ry, d = Math.hypot(X, Y);
      let a = Math.atan2(Y, X) - a0; a = ((a % TAU) + TAU) % TAU;
      const t = a / (a1 - a0); if (t > 1) return 0;
      const w = th / rx * Math.sin(Math.PI * Math.pow(t, 0.6));
      if (d > 1 || d < 1 - w) return 0;
      return d > 1 - 1.6 / rx ? '#ffffff' : '#cfeaffd8';
    });
  }
  function glow(x, y, g) {
    if (g <= 0) return;
    ell(x, y, 4 + 5 * g, 4 + 5 * g, al('#fff6a8', 0.28 * g)); ell(x, y, 2 + 3 * g, 2 + 3 * g, al('#ffffff', 0.55 * g));
    for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + g * 2; sparkle(Math.round(x + Math.cos(a) * (6 + 4 * g)), Math.round(y + Math.sin(a) * (6 + 4 * g)), 1, '#b8ff8c'); }
  }

  const KIND = {
    pawn: {
      sl: () => TAN.m, hd: SKIN, pants: PANTS,
      torso: (P) => body(TAN, null, P.d),
      head: (P) => { head((u, v) => { const e = -0.05 - 0.22 * u; return v < e || u < -0.5 ? (v > e - 0.3 && u >= -0.5 ? P.d : P) : SKIN; }); ball(-5, -30, 2.5, 2.5, P); },
    },
    warrior: {
      sl: (P) => P.d, hd: STEEL, pants: GREAVE,
      back: (P, p) => { if (!p.shF) shield(-9, -12, P); },
      torso: (P) => body(P, STEEL.m, LEATH.d),
      head: (P) => { head((u, v) => u > -0.12 && v > -0.42 && v < 0.62 ? SKIN : STEEL); ball(-1, -30, 5, 2.4, P); },
    },
    archer: {
      sl: () => LEATH.m, hd: SKIN, pants: '#5a4a3a',
      back: (P) => part(() => { line(-9, -21, -6, -9, LEATH.d, 4); rect(-11, -25, 2, 3, '#f1ede2'); rect(-8, -26, 2, 3, P.l); }),
      torso: (P) => body(LEATH, P.m, LEATH.d),
      head: (P) => { poly([-2, -30, -13, -19, -4, -17], P.d); head((u, v) => ((u - 0.38) / 0.62) ** 2 + ((v - 0.15) / 0.62) ** 2 < 1 ? SKIN : P, 1); },
    },
    lancer: {
      sl: () => STEEL.m, hd: STEEL, pants: GREAVE,
      torso: (P) => { body(STEEL, null, LEATH.d); fillFn(-3, -13, 2, -4, (x, y) => y === -6 ? LEATH.d : y > -6 ? P.d : P.m); },
      head: (P, p, f) => {
        const w = Math.round(Math.sin(f * 0.9));
        ball(-2, -31, 4, 3, P); ball(-7, -30 + w, 4, 3, P); ball(-11, -27 + w, 3.5, 2.8, P); ball(-14, -23 + w, 2.8, 2.4, P);
        head(() => STEEL, false); rect(1, -24, 7, 2, OL); rect(-1, -27, 1, 8, STEEL.d);
      },
    },
    monk: {
      sl: (P) => P.m, hd: SKIN, robe: 1,
      torso: (P) => robe(P),
      head: (P) => head((u, v) => ((u - 0.3) / 0.68) ** 2 + ((v - 0.12) / 0.66) ** 2 < 1 ? SKIN : ((u - 0.3) / 0.84) ** 2 + ((v - 0.12) / 0.8) ** 2 < 1 ? P.l : P, 1),
    },
  };

  function unit(kind, anim, P, f, n) {
    const K = KIND[kind] || KIND.pawn, p = pose(kind, anim, f, n), ox = OX, oy = OY, sl = K.sl(P);
    const up = () => org(ox + p.L, oy + p.b);
    const item = () => { if (p.tool === 'bow') bow(p.hf[0], p.hf[1], p.pull, P); else if (p.tool) tool(p.tool, p.hf, p.a, P, f); };
    up();
    if (K.back) K.back(P, p);
    if (p.tb) item();
    if (!p.hbF) arm(-4, -12, p.hb, p.up ? SKIN.d : sl, K.hd, p.up ? 2 : 3);
    org(ox, oy); part(() => legs(p, K.pants, K.robe));
    up(); part(() => K.torso(P, p));
    if (p.up) arm(3, -12, p.hf, SKIN.m, K.hd, 2);
    part(() => K.head(P, p, f));
    if (!p.tb) item();
    if (!p.up) arm(3, -12, p.hf, sl, K.hd);
    if (p.hbF) arm(-3, -12, p.hb, sl, K.hd);
    if (p.shF) shield(9, -13, P);
    if (p.load) load(p.load);
    if (p.arc) slash(...p.arc);
    if (p.glow) { const t = rp(p.hf[0], p.hf[1], p.a)(26, 0); glow(t[0], t[1], p.glow); }
    if (p.lines) for (const y of [-16, -12, -7]) line(-16, y, -4, y, '#ffffffbb', 1);
    if (p.rel) { line(p.hf[0] + 5, p.hf[1], p.hf[0] + 18, p.hf[1], '#ffffffcc', 1); line(p.hf[0] + 8, p.hf[1] - 3, p.hf[0] + 14, p.hf[1] - 3, '#ffffff88', 1); }
    org(ox, oy);
  }
  function healFx(f, n) {
    const t = f / Math.max(1, n - 1), r = RNG(77);
    ell(0, -16, 15, 18, al('#d8ffb0', 0.14 * Math.sin(Math.PI * t)));
    ring(0, -2, 9 + t * 13, 3.5 + t * 4.5, 2, al('#a8ff8c', 0.9 * (1 - t)));
    for (let k = 0; k < 10; k++) {
      const x = Math.round((r() - 0.5) * 32), y0 = -2 - r() * 10, sp = 22 + r() * 26, tt = (t * 1.1 + r() * 0.45) % 1;
      if (tt > 0.92) continue;
      const a = Math.min(1, 1.6 * (1 - tt)), col = k % 3 ? '#7dff6a' : '#ffe766', y = Math.round(y0 - tt * sp);
      if (k % 2) sparkle(x, y, 2, al(col, a)); else { rect(x - 1, y - 1, 3, 3, al(col, a)); px(x, y, al('#ffffff', a)); }
    }
  }

  // ================= Công trình =================
  /** Tường gạch đá; o: { s: bảng màu, bw, bh, round (trụ tròn), seam (không bóng mép), top(i): cắt đỉnh lởm chởm }. */
  function bricks(x, y, w, h, o) {
    o = o || {};
    const s = o.s || STONE, bw = o.bw || 8, bh = o.bh || 4;
    fillFn(x, y, x + w - 1, y + h - 1, (X, Y) => {
      const i = X - x, j = Y - y;
      if (o.top && j < o.top(i)) return 0;
      const row = Math.floor(j / bh), ii = i + (row & 1) * (bw >> 1) + (o.round ? Math.round(Math.abs(i - w / 2) * 0.3) : 0), k = ii % bw, jj = j % bh;
      let c = jj === bh - 1 || k === bw - 1 ? s.k : jj === 0 && k < bw - 2 ? s.l : h2(Math.floor(ii / bw) + x * 7, row + y * 13) < 0.22 ? s.v : s.m;
      if (o.top && j === o.top(i)) c = s.l;
      if (o.round) { const t = (i + .5) / w; if (t > 0.74) c = c === s.k ? dk(s.k, 0.2) : s.d; else if (t < 0.16 && c === s.m) c = s.l; }
      else if (!o.seam && (i >= w - 2 || j >= h - 2)) c = c === s.k ? dk(s.k, 0.2) : s.d;
      return c;
    });
  }
  function crenel(x, y, w, s) {
    s = s || STONE;
    fillFn(x, y, x + w - 1, y + 6, (X, Y) => {
      const i = X - x, j = Y - y, k = i % 7;
      if (j < 3 && k >= 4) return 0;
      if (j === 6 || i >= w - 1 || (j < 3 && k === 3)) return s.d;
      return j === 0 || (j === 3 && k >= 4) ? s.l : s.m;
    });
  }
  function tiles(P, ya, xa, flat) {
    return (x, y) => {
      const j = Math.round(y - ya), row = j >> 2, r = j & 3, sh = !flat && x >= xa, k = ((x + row * 3) % 6 + 6) % 6;
      if (r === 3 || (k === 0 && r)) return sh ? P.dd : P.d;
      return sh ? P.s : r === 0 ? P.l : P.m;
    };
  }
  const roofTri = (xl, xr, yb, xa, ya, P) => polyFn([xl, yb, xa, ya, xr, yb], tiles(P, ya, xa));
  const roofTrap = (xl, xr, yb, yt, ins, P) => polyFn([xl, yb, xl + ins, yt, xr - ins, yt, xr, yb], tiles(P, yt, 0, true));
  function cone(xl, xr, yb, xa, ya, P) {
    polyFn([xl, yb, xa, ya, xr, yb], (x, y) => { const t = (x + .5 - xl) / (xr - xl), r = Math.round(y - ya) & 3; return r === 3 ? (t > .6 ? P.dd : P.d) : t < .3 ? P.l : t > .62 ? P.s : P.m; });
  }
  function win(x, y, w, h) {
    fillFn(x, y, x + w - 1, y + h - 1, (X, Y) => {
      const i = X - x, j = Y - y;
      if (j === 0 && (i === 0 || i === w - 1)) return 0;
      if (i === 0 || i === w - 1 || j === 0 || j === h - 1) return OL;
      return i === 1 || j === 1 ? GLASS2 : GLASS;
    });
    rect(x - 1, y + h, w + 2, 1, STONE.l);
  }
  function door(x, y, w, h, c) {
    const r = w / 2; c = c || WOOD;
    fillFn(x, y, x + w - 1, y + h - 1, (X, Y) => {
      const i = X + .5 - x, j = Y + .5 - y;
      if (j < r) { const d = (i - r) ** 2 + (j - r) ** 2; if (d > r * r) return 0; if (d > (r - 1.1) ** 2) return OL; }
      if (X === x || X === x + w - 1) return OL;
      return (X - x) % 3 === 0 ? c.d : c.m;
    });
    px(x + w - 3, y + h - 7, GOLD.m);
  }
  function pennon(x, y, len, P) {
    part(() => {
      rect(x, y - len, 2, len, WOOD.d);
      polyFn([x + 2, y - len + 1, x + 12, y - len + 2, x + 9, y - len + 4.5, x + 12, y - len + 7, x + 2, y - len + 7], (X, Y) => Y > y - len + 4 ? P.s : P.m);
      ball(x + 1, y - len - 1, 1.6, 1.6, GOLD);
    });
  }
  function hang(x, y, w, h, P) {
    part(() => {
      polyFn([x, y, x + w, y, x + w, y + h, x + w / 2, y + h - 3, x, y + h], (X) => X >= x + w - 2 ? P.d : P.m);
      rect(x + w / 2 - 1, y + 3, 2, h - 8, P.l); rect(x - 1, y - 1, w + 2, 2, WOOD.d);
    });
  }
  function emblemSwords(cx, cy, P) {
    part(() => ball(cx, cy, 9, 8, P));
    part(() => { sword(cx - 6, cy + 6, -0.8, 15); sword(cx + 6, cy + 6, -2.34, 15); });
  }
  function target(cx, cy, r) {
    part(() => { ell(cx, cy, r, r, RED.m); ell(cx, cy, r * .72, r * .72, '#f6efe0'); ell(cx, cy, r * .45, r * .45, RED.m); ell(cx, cy, r * .2 + .3, r * .2 + .3, GOLD.m); });
    part(() => arrowShape(cx + 1, cy - 1, cx + 9, null), OL);
  }

  const B = {
    castle(P) {
      shadowE(0, -3, 76, 6);
      part(() => { bricks(-28, -82, 56, 40); win(-3, -74, 6, 9); });
      part(() => roofTri(-33, 32, -80, 0, -108, P));
      pennon(-1, -107, 14, P);
      for (const s of [-1, 1]) {
        const cx = s * 54;
        part(() => cone(cx - 15, cx + 15, -80, cx, -112, P));
        part(() => { bricks(cx - 16, -74, 32, 73, { round: 1 }); crenel(cx - 19, -81, 39); win(cx - 3, -62, 6, 9); win(cx - 3, -38, 6, 9); });
      }
      part(() => {
        bricks(-38, -46, 76, 45); crenel(-40, -53, 81);
        fillFn(-15, -33, 14, -1, (x, y) => { const d = Math.hypot(x + .5, y + .5 + 18); return y < -18 && d > 15 ? 0 : (y < -18 && d > 12) || x < -12 || x > 11 ? STONE.l : 0; });
        fillFn(-12, -30, 11, -1, (x, y) => { const d = Math.hypot(x + .5, y + .5 + 18); if (y < -18 && d > 12) return 0; if (y < -18 && d > 11) return OL; return x === -12 || x === 11 ? OL : (x + 12) % 4 === 1 || (y + 30) % 5 === 4 ? '#5d5a72' : '#2a2a3d'; });
      });
      hang(-31, -42, 8, 14, P); hang(23, -42, 8, 14, P);
    },
    house1(P) {
      shadowE(0, -3, 26, 4);
      part(() => bricks(8, -82, 7, 22, { bw: 7, bh: 3 }));
      part(() => { bricks(-21, -44, 42, 43); door(-5, -18, 10, 17); win(-16, -32, 7, 8); win(9, -32, 7, 8); });
      part(() => { roofTri(-27, 26, -42, 0, -82, P); ell(0, -57, 4, 4, OL); ell(0, -57, 3, 3, GLASS); px(-1, -58, GLASS2); });
    },
    house2(P) {
      shadowE(0, -3, 28, 4);
      part(() => bricks(-17, -86, 7, 24, { bw: 7, bh: 3 }));
      part(() => {
        fillFn(-24, -46, 23, -1, (x, y) => (x === -24 || x === 23 || x === -1 || y === -46 || y === -24 || y === -2) ? WOOD.d : y >= -4 || x >= 21 ? CLOTH.d : CLOTH.m);
        line(-23, -25, -2, -45, WOOD.d, 1); line(0, -45, 22, -25, WOOD.d, 1);
        door(-19, -20, 10, 19); win(7, -19, 8, 9); win(-17, -40, 7, 8); win(8, -40, 7, 8);
      });
      part(() => roofTrap(-30, 29, -44, -76, 7, P));
    },
    house3(P) {
      shadowE(0, -3, 24, 4);
      part(() => { bricks(-17, -34, 34, 33); door(-4, -18, 9, 17); win(-14, -28, 6, 7); });
      part(() => {
        fillFn(-20, -62, 19, -33, (x, y) => (x === -20 || x === 19 || x === 0 || y === -62 || y === -34 || (y + x) % 9 === 0 && y > -48 && x < 0) ? WOOD.d : x >= 17 ? CLOTH.d : CLOTH.m);
        win(-14, -56, 7, 8); win(6, -56, 7, 8); rect(-16, -47, 11, 2, WOOD.m); rect(5, -47, 11, 2, WOOD.m);
      });
      part(() => { ell(-12, -47, 2, 1.5, RED.l); ell(-8, -47, 2, 1.5, '#ffd34d'); ell(9, -47, 2, 1.5, RED.l); ell(13, -47, 2, 1.5, '#f6f2ff'); }, null);
      part(() => roofTri(-25, 24, -60, 0, -90, P));
    },
    tower(P) {
      shadowE(0, -3, 24, 5);
      part(() => cone(-14, 14, -90, 0, -121, P));
      part(() => {
        bricks(-16, -86, 32, 85, { round: 1 }); crenel(-20, -93, 39);
        door(-5, -18, 10, 17); rect(-1, -66, 3, 9, OL); rect(0, -65, 1, 7, GLASS2); rect(-1, -44, 3, 9, OL); rect(0, -43, 1, 7, GLASS2);
      });
      hang(-12, -84, 7, 13, P);
    },
    barracks(P) {
      shadowE(0, -3, 44, 5);
      part(() => { bricks(-40, -54, 80, 53); door(-10, -26, 20, 25); win(-32, -40, 8, 10); win(24, -40, 8, 10); });
      part(() => roofTrap(-46, 45, -52, -92, 12, P));
      for (const s of [-1, 1]) part(() => { bricks(s * 40 - 6, -64, 12, 63, { bw: 6 }); crenel(s * 40 - 9, -71, 18); });
      emblemSwords(0, -40, P);
      pennon(-1, -91, 22, P);
    },
    archery(P) {
      shadowE(0, -3, 44, 5);
      part(() => {
        fillFn(-38, -58, 37, -1, (x, y) => y > -10 ? 0 : (x + 38) % 5 === 4 ? WOOD.d : x > 34 ? WOOD.d : y === -58 ? WOOD.l : WOOD.m);
        bricks(-40, -10, 80, 9, { bw: 6, bh: 3 }); door(-8, -28, 16, 27); win(-30, -40, 8, 9); win(22, -40, 8, 9);
      });
      part(() => roofTrap(-45, 44, -56, -94, 14, P));
      part(() => { polyFn([-16, -56, 15, -56, 0, -80], (x) => x > 6 ? WOOD.d : WOOD.m); });
      target(0, -63, 7);
      part(() => { rect(-46, -20, 2, 19, WOOD.d); rect(-41, -20, 2, 19, WOOD.d); }); target(-42, -26, 5);
    },
    monastery(P) {
      shadowE(0, -3, 44, 5);
      part(() => { bricks(-38, -60, 76, 59); win(-32, -48, 6, 14); win(26, -48, 6, 14); });
      part(() => roofTrap(-44, 43, -58, -90, 14, P));
      part(() => {
        bricks(-13, -116, 26, 115); door(-6, -24, 12, 23);
        ell(0, -44, 6, 6, OL); ell(0, -44, 5, 5, P.l); ell(0, -44, 2, 2, GOLD.m); rect(-5, -45, 10, 1, P.d); rect(-1, -49, 1, 10, P.d);
        fillFn(-7, -108, 6, -94, (x, y) => { const d = Math.hypot(x + .5, y + .5 + 101); return y < -101 && d > 7 ? 0 : x === -7 || x === 6 || (y < -101 && d > 6) ? OL : '#2a2a3d'; });
      });
      part(() => { ball(0, -98, 4, 4, GOLD); rect(-1, -104, 2, 3, GOLD.d); rect(-4, -95, 9, 1, GOLD.d); });
      part(() => cone(-16, 16, -114, 0, -150, P));
      part(() => { rect(-1, -159, 2, 10, GOLD.d); rect(-4, -156, 8, 2, GOLD.d); });
    },
  };

  // ================= Thiên nhiên =================
  function rockP(cx, cy, rx, ry, p, seed) {
    const r = RNG(seed), pts = [], yb = cy + ry * 0.6;
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, k = 0.84 + r() * 0.2; pts.push(cx + Math.cos(a) * rx * k, Math.min(yb, cy + Math.sin(a) * ry * k)); }
    polyFn(pts, (x, y) => {
      const u = (x + .5 - cx) / rx, v = (y + .5 - cy) / ry;
      return v > 0.3 - 0.25 * u ? p.d : v < -0.25 - 0.4 * u && v < 0.1 ? p.l : p.m;
    });
  }
  function tier(cx, yb, w, h, p) {
    polyFn([cx - w, yb, cx - w * .45, yb - h * .55, cx, yb - h, cx + w * .45, yb - h * .55, cx + w, yb], (x, y) => {
      const t = (yb - y) / h, dx = x + .5 - cx;
      if (y >= yb - 2) return p.d;
      if (dx > (1 - t) * w * 0.3 + 1) return p.d;
      return dx < -(1 - t) * w * 0.55 && t < 0.85 ? p.l : p.m;
    });
    const sp = { m: p.m, d: p.d, l: p.m, k: p.k };
    for (let x = -w + 3; x <= w - 3; x += 6) lump(cx + x, yb - 1, 3.4, sp);
  }
  const TREE = {
    pine: { big: [[-16, 30, 28], [-35, 25, 28], [-54, 20, 26], [-72, 14, 24], [-88, 9, 18]], small: [[-12, 24, 22], [-27, 19, 22], [-42, 14, 20], [-55, 9, 16]] },
    round: {
      big: [[0, -98, 12], [-10, -86, 15], [10, -87, 15], [-17, -62, 16], [17, -60, 16], [0, -70, 22], [-19, -42, 13], [19, -40, 13], [0, -45, 17]],
      small: [[-6, -64, 11], [7, -65, 11], [-12, -46, 12], [12, -45, 12], [0, -52, 16], [-13, -30, 10], [13, -29, 10], [0, -32, 13]],
    },
  };
  function tree(i, f, n) {
    const big = i <= 2, s = Math.sin(f / n * TAU);
    shadowE(0, -3, big ? 24 : 18, 5, 0.25);
    const th = big ? 30 : 20;
    part(() => {
      polyFn([-4, -1, 4, -1, 2.5, -th, -2.5, -th], (x) => x >= 1 ? WOOD.d : x <= -3 ? WOOD.l : WOOD.m);
      rect(-7, -3, 3, 2, WOOD.d); rect(4, -3, 3, 2, WOOD.d);
    });
    part(() => {
      if (i % 2) { for (const [yb, w, h] of TREE.pine[big ? 'big' : 'small']) tier(Math.round(s * (-yb) / 45), yb, w, h, LEAF); }
      else for (const [x, y, r] of TREE.round[big ? 'big' : 'small']) lump(x + Math.round(s * (-y) / 45), y, r, LEAF);
    });
  }
  function stump(i) {
    const h = [0, 7, 12, 5, 9][i], w = [0, 9, 8, 11, 7][i];
    shadowE(0, -3, w + 6, 3, 0.25);
    part(() => {
      ell(-w + 1, -2, 3.5, 2, WOOD.d); ell(w - 2, -2, 3.5, 2, WOOD.d);
      fillFn(-w, -h - 3, w - 1, -2, (x) => x >= w * .4 ? WOOD.d : x < -w * .5 ? WOOD.l : (x + 20) % 4 === 0 ? WOOD.d : WOOD.m);
      if (i === 2) polyFn([-w, -h - 2, -w + 3, -h - 9, -1, -h - 4, 2, -h - 11, w - 1, -h - 2], (x) => x > 1 ? WOOD.d : WOOD.m);
      else { ell(-.5, -h - 3, w, 3, TAN.l); ring(-.5, -h - 3, w - 2.5, 1.8, 1, TAN.d); px(0, -h - 4, TAN.d); }
    });
    if (i === 4) part(() => { rect(w - 2, -6, 2, 4, CLOTH.m); ell(w - 1, -7, 3, 2, RED.m); px(w - 2, -8, '#ffffff'); });
    if (i === 3) part(() => { lump(-w + 2, -h - 3, 2.5, BUSH); }, OL);
  }
  const BUSHES = [null,
    [[-10, -11, 10], [10, -11, 10], [0, -19, 12], [0, -9, 11]],
    [[-15, -9, 9], [14, -9, 9], [-6, -17, 11], [7, -18, 11], [0, -8, 11]],
    [[-6, -8, 8], [6, -9, 8], [0, -14, 9]],
    [[-12, -9, 9], [11, -10, 9], [-3, -18, 10], [1, -8, 10], [12, -19, 7]],
  ];
  function bush(i, f, n) {
    const s = Math.sin(f / n * TAU);
    shadowE(0, -2, [0, 22, 26, 15, 22][i], 4, 0.25);
    part(() => {
      for (const [x, y, r] of BUSHES[i]) lump(x + Math.round(s * (-y) / 16), y, r, BUSH);
      const rr = RNG(i * 31);
      for (let k = 0; k < 6; k++) { const x = Math.round((rr() - .5) * 26 + s * 0.6), y = Math.round(-6 - rr() * 14); px(x, y, BUSH.l); px(x + 1, y + 1, BUSH.d); }
    });
  }
  function rock(i) {
    const R = [null, [[0, 10, 8]], [[0, 13, 6]], [[-3, 9, 7], [7, 5, 4]], [[0, 7, 10]]][i];
    shadowE(0, -2, 13, 3, 0.25);
    for (const [x, rx, ry] of R) part(() => rockP(x, -1 - ry * .6, rx, ry, ROCK, i * 13 + x));
  }
  function waterrock(i, f, n) {
    const t = f / n, rx = [0, 12, 16, 10, 14][i], ry = [0, 10, 9, 12, 8][i], W = tri('#8f97a8', '#5c6377', '#c0c7d4');
    ring(0, -1, rx + 4 + t * 9, 3 + t * 3, 1.2, al('#ffffff', 0.7 * (1 - t)));
    part(() => { rockP(0, -1 - ry * .6, rx, ry, W, i * 7); if (i === 2) rockP(11, -3, 6, 5, W, 3); }, OL);
    part(() => { // dải bọt quanh chân đá
      for (let k = -rx - 3; k <= rx + 2; k++) { const yy = Math.round(Math.sin(k * 0.8 + t * TAU) * 0.9), e = Math.abs(k + .5) > rx ? 1 : 0; rect(k, -4 + yy + e, 1, 4 - yy - e, h2(k, i) < 0.2 ? '#d9f3ef' : '#ffffff'); }
    }, null, 0.92);
  }
  function goldstone(i) {
    const rx = [0, 8, 10, 12, 15, 18, 22][i], ry = rx * 0.8, r = RNG(i * 101);
    shadowE(0, -2, rx + 3, 3, 0.25);
    const cy = -1 - ry * .6;
    part(() => {
      rockP(0, cy, rx, ry, ROCK, i * 17);
      for (let k = 0; k < 2 + i; k++) {
        const x = Math.round((r() - .5) * rx * 1.3), y = Math.round(cy - r() * ry * .7 + ry * .1), s = 1.2 + r() * (i > 3 ? 2.2 : 1.4);
        line(x - s * 2, y + 1, x, y, GOLD.d, 1); ball(x, y, s, s * 0.85, GOLD); px(x - 1, y - 1, '#ffffff');
      }
    });
  }
  function sheep(anim, f, n) {
    const ph = f / n * TAU, s = Math.sin(ph);
    let b = 0, hx = 11, hy = -15, lg = [0, 0, 0, 0];
    if (anim === 'idle') b = s > 0.3 ? 1 : 0;
    else if (anim === 'move') { b = f % 2 ? -1 : 0; const k = f % 2 ? 1 : -1; lg = [k, -k, -k, k]; }
    else if (anim === 'grass') { const e = f < 2 ? f / 2 : f > 9 ? (11 - f) / 2 : 1; hx = 11 + Math.round(2 * e); hy = -15 + Math.round(9 * e) + (f > 2 && f < 10 && f % 2 ? 1 : 0); }
    const FACE = tri('#4a4d63', '#2f3144', '#6e7290');
    shadowE(0, -2, 14, 3, 0.22);
    part(() => { [-9, -5, 4, 8].forEach((x, k) => rect(x + lg[k], -6 + Math.min(0, lg[k]), 2, 5, k % 2 ? FACE.m : FACE.d)); });
    part(() => {
      ball(-1, -13 + b, 13, 8, WOOL);
      for (let k = 0; k < 7; k++) { const a = Math.PI + k / 6 * Math.PI; lump(-1 + Math.cos(a) * 10, -14 + b + Math.sin(a) * 6, 4.2, WOOL); }
      lump(-12, -10 + b, 3.6, WOOL); lump(10, -10 + b, 3.6, WOOL);
    });
    part(() => {
      ell(hx - 3, hy - 2 + b, 2.5, 1.5, FACE.d);
      ball(hx, hy + b, 4.5, 4, FACE); lump(hx - 1, hy - 4 + b, 2.6, WOOL);
      px(hx + 1, hy + b - 1, '#ffffff'); px(hx + 3, hy + b + 1, FACE.d);
    });
  }
  function cloud(i) {
    const r = RNG(i * 977), W = [0, 118, 92, 64][i], H = [0, 44, 34, 26][i], cs = [], base = H * 0.6;
    for (let k = 0; k < 11; k++) { const t = k / 10 * 2 - 1, rr = H * (0.42 + 0.5 * (1 - t * t)) * (0.8 + r() * 0.3); cs.push([t * (W - rr * 0.8), H * 0.55 - rr * 0.6 - r() * 4, rr]); }
    const x0 = Math.floor(-W - 6), y0 = Math.floor(-H * 1.6), mw = 2 * W + 14, mh = Math.ceil(base) - y0 + 14, mask = new Uint8Array(mw * mh);
    for (const [cx, cy, rr] of cs) { // mặt nạ hợp các hình tròn
      for (let y = Math.max(0, Math.floor(cy - rr - y0)); y < Math.min(mh, Math.ceil(cy + rr - y0) + 1); y++) for (let x = Math.max(0, Math.floor(cx - rr - x0)); x < Math.min(mw, Math.ceil(cx + rr - x0) + 1); x++) {
        if (y + y0 + .5 <= base && (x + x0 + .5 - cx) ** 2 + (y + y0 + .5 - cy) ** 2 <= rr * rr) mask[y * mw + x] = 1;
      }
    }
    const inC = (x, y) => { x -= x0; y -= y0; return x >= 0 && y >= 0 && x < mw && y < mh && mask[y * mw + x] === 1; };
    part(() => fillFn(-W - 4, -H * 1.5, W + 4, base, (x, y) => {
      if (!inC(x, y)) return 0;
      if (!inC(x, y + 4)) return '#d3deec';
      if (!inC(x, y + 9)) return '#e7eef6';
      return !inC(x - 1, y - 3) ? '#ffffff' : '#f4f7fb';
    }), null, 0.9);
  }

  // ================= Tài nguyên & hiệu ứng =================
  const RES = {
    wood() { shadowE(0, -2, 13, 3, 0.25); part(() => { log(-12, -6, 11); log(-1, -6, 11); log(-7, -11, 12); }); },
    gold() { shadowE(0, -2, 12, 3, 0.25); part(() => { lump(-5, -4, 4.5, GOLD); lump(5, -4, 4.5, GOLD); lump(0, -9, 5, GOLD); px(-1, -12, '#ffffff'); px(-7, -6, '#ffffff'); px(4, -7, '#ffffff'); }); },
    meat() { shadowE(0, -2, 12, 3, 0.25); part(() => { line(-7, -9, -11, -13, BONE, 3); ball(-12, -14, 1.7, 1.7, CLOTH); ball(-10, -15, 1.7, 1.7, CLOTH); ball(1, -7, 8, 6, MEAT); ell(4, -9, 2, 1.2, '#f6c2a8'); }); },
  };
  function puff(x, y, r, p) { ball(x, y, r, r, p); }
  function flame(cx, yb, w, h, ph, c) {
    const pts = [], N = 8;
    for (let i = 0; i <= N; i++) { const t = i / N, hw = w * (t < .3 ? .8 + t * .7 : (1 - t) * 1.45); pts.push(cx - hw + Math.sin(t * 7 + ph) * t * 1.2, yb - h * t); }
    for (let i = N; i >= 0; i--) { const t = i / N, hw = w * (t < .3 ? .8 + t * .7 : (1 - t) * 1.45); pts.push(cx + hw + Math.sin(t * 7 + ph) * t * 1.2, yb - h * t); }
    poly(pts, c);
  }
  function fireAt(x, yb, sc, f, n) {
    const ph = f / n * TAU;
    part(() => {
      flame(x, yb, 7 * sc, (16 + 3 * Math.sin(ph * 2)) * sc, ph, '#e8542c');
      flame(x - 4 * sc, yb, 3 * sc, (8 + 3 * Math.sin(ph * 2 + 2)) * sc, ph + 1, '#e8542c');
      flame(x + 4 * sc, yb, 3 * sc, (9 + 3 * Math.cos(ph * 2)) * sc, ph + 2, '#e8542c');
    }, '#5a1a22');
    part(() => { flame(x, yb, 5 * sc, (12 + 2 * Math.sin(ph * 2 + 1)) * sc, ph + .5, '#f79a2a'); flame(x, yb, 3 * sc, (7 + Math.sin(ph * 3)) * sc, ph + 1, '#ffd84a'); ell(x, yb - 2 * sc, 1.5 * sc, 1.5 * sc, '#fff7c8'); }, null);
  }
  const FX = {
    dust(f, n) {
      const t = f / (n - 1), D = tri('#efe4cc', '#c9b894', '#ffffff');
      part(() => { for (const a of [-2.6, -1.57, -0.5]) puff(Math.cos(a) * t * 9, -3 + Math.sin(a) * t * 6 - t * 3, (2.5 + t * 3) * (1 - t * 0.4), D); }, t < 0.6 ? '#7d6d55' : null, 1 - t * 0.75);
    },
    explosion(f, n) {
      const R = [8, 16, 22, 23, 21, 18, 14, 10][f] || 10, r = RNG(55), cy = -R * 0.65 - f * 1.5;
      const FIRE = [tri('#fff4b0', '#ffd84a', '#ffffff'), tri('#ffd84a', '#f39a2a', '#fff4b0'), tri('#f7a02c', '#de5428', '#ffd84a'), tri('#e8662c', '#b33a2a', '#f7a02c')];
      const SMOKE = tri('#8a8b96', '#5c5d69', '#b3b4bd', { k: '#45465a' });
      if (f >= 2) part(() => { for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + r(); lump(Math.cos(a) * R * .55, cy - 3 + Math.sin(a) * R * .45 - f, R * (f > 4 ? .55 : .38), SMOKE); } }, OL, f > 5 ? 1.6 - f * 0.17 : 1);
      if (f < 6) {
        const p = FIRE[Math.min(3, Math.floor(f / 1.5))];
        part(() => { for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + .3; lump(Math.cos(a) * R * .45, cy + Math.sin(a) * R * .4, R * .52, p); } ball(0, cy, R * .55, R * .5, p); });
        if (f < 3) ell(0, cy - 1, R * .35, R * .3, '#ffffffcc');
      }
      for (let k = 0; k < 8 && f > 0 && f < 6; k++) { const a = r() * TAU, d = R * (0.9 + f * 0.25); rect(Math.round(Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * .8), 2, 2, k % 2 ? '#ffd84a' : '#5c5d69'); }
    },
    fire(f, n) { fireAt(0, -1, 1, f, n); },
    splash(f, n) {
      const t = (f + 0.5) / n, r = RNG(9), WT = tri('#e8fbf8', '#9fdcd6', '#ffffff');
      ring(0, 8, 6 + t * 24, 2 + t * 6, 1.5, al('#ffffff', 0.85 * (1 - t)));
      if (f < 4) part(() => { const h = [12, 26, 30, 18][f]; polyFn([-7, 9, -4, 9 - h, 0, 5 - h, 4, 9 - h, 7, 9], (x) => x > 1 ? WT.d : WT.m); }, '#2a6f7f');
      part(() => {
        for (let k = 0; k < 10; k++) {
          const vx = (r() - .5) * 2, vy = 0.7 + r() * 0.6, tt = t * 1.1, sz = 3.2 * (1 - t * .55);
          const x = vx * tt * 36, y = 6 - (vy * tt - 0.9 * tt * tt) * 50;
          if (y < 10) ball(x, y, sz, sz, WT);
        }
      }, '#2a6f7f');
    },
  };
  let FOAM = null; // bảng tính sẵn: khoảng cách tới ô đất, cos/sin góc, nhiễu
  function foam(f, n) {
    org(0, 0);
    if (!FOAM) {
      FOAM = new Float32Array(96 * 96 * 4);
      for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
        const X = x + .5, Y = y + .5, i = (y * 96 + x) * 4, a = Math.atan2(Y - 48, X - 48) * 3;
        FOAM[i] = Math.hypot(Math.max(32 - X, 0, X - 64), Math.max(32 - Y, 0, Y - 64)); FOAM[i + 1] = Math.cos(a); FOAM[i + 2] = Math.sin(a); FOAM[i + 3] = h2(x >> 1, y >> 1);
      }
    }
    const ph = f / n * TAU, sp = Math.sin(ph), cp = Math.cos(ph), q0 = f / n % 1, q1 = (f / n + 0.5) % 1;
    const c0 = U(al('#ffffff', 0.75 * (1 - q0))), c1 = U(al('#ffffff', 0.75 * (1 - q1))), cw = U('#ffffff'), ce = U('#e2f7f3d0'), D = T.d;
    for (let j = 0; j < 96 * 96; j++) { // khung trống nên ghi thẳng
      const i = j * 4, d = FOAM[i]; if (d === 0) continue;
      const nz = FOAM[i + 3], w0 = 5 + 1.6 * (sp * FOAM[i + 1] + cp * FOAM[i + 2]) + nz * 1.5;
      D[j] = d < w0 - 1.5 ? cw : d < w0 ? ce : nz > 0.25 && Math.abs(d - 8 - q0 * 18) < 0.8 ? c0 : nz > 0.25 && Math.abs(d - 8 - q1 * 18) < 0.8 ? c1 : 0;
    }
  }

  // ================= Vật thể tự vẽ (p.*) =================
  const SOIL = tri('#8a5a3a', '#6b4229', '#a87348');
  function plant(x, y, k, s, f) { // một cây trồng tại gốc (x,y)
    const G = GREEN;
    if (s === 0) { px(x - 1, y - 1, G.m); px(x + 1, y - 1, G.m); px(x, y - 2, G.l); px(x, y - 1, G.d); return; }
    if (k === 'wheat') {
      const h = [0, 6, 10, 13][s], c = s === 3 ? '#e8c35a' : G.m, cd = s === 3 ? '#b68a2e' : G.d;
      for (const dx of [-2, 0, 2]) { line(x + dx * .4, y - 1, x + dx, y - h + 2, cd, 1); if (s >= 2) { ell(x + dx, y - h + 1, 1, 2.5, c); px(x + dx, y - h, s === 3 ? '#fff1a3' : G.l); } }
    } else if (k === 'carrot') {
      const h = [0, 4, 7, 9][s];
      if (s === 3) { ell(x, y - 1, 2.5, 2, ORANGE.m); px(x - 1, y - 2, ORANGE.l); }
      for (const dx of [-2, 0, 2]) { line(x, y - 2, x + dx, y - h, G.m, 1); px(x + dx, y - h, G.l); px(x + dx * 1.5, y - h + 1, G.d); }
    } else if (k === 'pumpkin') {
      if (s === 3) { ball(x, y - 4, 6, 4.5, ORANGE); line(x - 2, y - 8, x - 2, y - 1, ORANGE.d, 1); line(x + 2, y - 8, x + 2, y - 1, ORANGE.d, 1); rect(x - 1, y - 10, 2, 2, G.d); ell(x + 5, y - 9, 2.5, 1.5, G.m); }
      else { ell(x - 2, y - 3, 2.5 + s, 1.6 + s * .4, G.m); ell(x + 2, y - 4, 2.5 + s, 1.6 + s * .4, G.l); if (s === 2) ball(x, y - 2, 2.5, 2.2, G); }
    } else { // héo
      line(x, y - 1, x - 2, y - 7, '#8c6b3e', 1); line(x, y - 1, x + 3, y - 6, '#a0804a', 1); px(x - 3, y - 6, '#6e5232'); px(x + 4, y - 5, '#6e5232');
    }
  }
  function crop(k, s) {
    const big = k === 'pumpkin' && s === 3;
    const spots = big ? [[-6, -5], [7, -3], [0, 2]] : [[-8, -8], [0, -8], [8, -8], [-8, 0], [0, 0], [8, 0]];
    for (const [x, y] of spots) part(() => plant(x, y, k === 'withered' ? 'dead' : k, k === 'withered' ? 1 : s));
  }
  function fenceRow(x0, x1, y, step) { // hàng rào ngang: trụ + 2 thanh
    part(() => { rect(x0, y - 11, x1 - x0, 2, WOOD.m); rect(x0, y - 6, x1 - x0, 2, WOOD.d); });
    for (let x = x0 + 1; x <= x1 - 3; x += step) part(() => { rect(x, y - 14, 3, 13, WOOD.m); px(x + 2, y - 12, WOOD.d); rect(x, y - 14, 3, 1, WOOD.l); });
  }
  function crate(x, y, w) { part(() => { sbox(x, y, w, w, WOOD); line(x + 1, y + 1, x + w - 2, y + w - 2, WOOD.d, 1); line(x + w - 2, y + 1, x + 1, y + w - 2, WOOD.d, 1); }); }
  function barrel(x, y) { part(() => { fillFn(x, y, x + 7, y + 9, (X, Y) => (Y === y + 2 || Y === y + 7) ? STEEL.d : X >= x + 6 ? WOOD.d : X === x ? WOOD.l : WOOD.m); ell(x + 4, y, 4, 1.5, TAN.l); }); }
  function knight(G, s) { // tượng hiệp sĩ (đá)
    part(() => { rect(-7, -34, 5, 12, G.d); rect(2, -34, 5, 12, G.m); });
    part(() => { sbox(-10, -58, 20, 26, G); rect(-10, -42, 20, 2, G.d); });
    part(() => { ball(0, -66, 9, 8.5, G); rect(1, -68, 8, 2, dk(G.d, 0.4)); ball(-2, -75, 6, 2.6, G); });
    part(() => { rect(10, -88, 3, 34, G.l); rect(7, -56, 9, 2, G.d); rect(10, -54, 3, 5, G.d); });
    part(() => { ball(13, -50, 3, 3, G); });
    part(() => { polyFn([-19, -54, -9, -54, -9, -40, -14, -34, -19, -40], (x) => x < -14 ? G.l : G.m); });
  }
  const PROC = {
    plot() {
      org(0, 0);
      part(() => fillFn(1, 1, 30, 30, (x, y) => (x === 1 || y === 1 || x === 30 || y === 30) ? SOIL.d : (y - 2) % 4 === 3 ? SOIL.d : (y - 2) % 4 === 0 ? SOIL.l : h2(x, y) < 0.08 ? SOIL.d : SOIL.m), '#4a2f1f');
    },
    well() {
      shadowE(0, -2, 14, 3);
      part(() => { rect(-12, -34, 3, 24, WOOD.m); rect(9, -34, 3, 24, WOOD.d); rect(-12, -31, 24, 2, WOOD.d); });
      line(0, -30, 0, -22, '#d9c7a0', 1);
      part(() => { sbox(-2, -22, 5, 4, WOOD); });
      part(() => { ell(0, -15, 12.5, 3.5, STONE.l); bricks(-12, -15, 25, 14, { bw: 6, bh: 4 }); ell(0, -15, 10, 2.2, '#24324a'); });
      part(() => roofTri(-15, 15, -32, 0, -44, RED));
    },
    fence() { fenceRow(-16, 16, 0, 40); part(() => { rect(-2, -16, 4, 15, WOOD.m); rect(1, -16, 1, 15, WOOD.d); polyFn([-2, -16, 2, -16, 0, -18.5], WOOD.l); }); },
    wall() { part(() => { bricks(-16, -30, 32, 29, { seam: 1 }); fillFn(-16, -36, 15, -31, (x, y) => { const k = ((x + 16) % 8 + 8) % 8; return k < 2 || k > 5 ? (y >= -33 ? STONE.m : 0) : y === -36 ? STONE.l : STONE.m; }); rect(-16, -3, 32, 2, STONE.d); }); },
    gate() {
      part(() => { fillFn(-10, -30, 9, -1, (x, y) => (y === -30 || y === -16 || y === -4) ? STEEL.d : x === -1 || x === 0 ? OL : (x + 10) % 3 === 0 ? WOOD.d : WOOD.m); });
      part(() => { bricks(-16, -40, 6, 39, { bw: 6 }); bricks(10, -40, 6, 39, { bw: 6 }); bricks(-16, -44, 32, 8, { bw: 8 }); fillFn(-16, -47, 15, -45, (x) => (x + 16) % 8 < 4 ? STONE.l : 0); });
    },
    campfire() { campfire(-1, 6); },
    'campfire.anim'(f, n) { campfire(f, n); },
    dock() {
      shadowE(0, -2, 30, 3, 0.2);
      for (const x of [-26, -9, 8, 24]) part(() => rect(x, -12, 3, 12, WOOD.d));
      part(() => fillFn(-29, -42, 28, -9, (x, y) => y >= -12 ? WOOD.d : (x + 29) % 6 === 5 ? WOOD.d : y === -42 ? WOOD.l : h2(x, Math.floor((y + 42) / 9) + (x + 29) / 6 | 0) < 0.15 && (y + 42) % 9 === 0 ? WOOD.d : WOOD.m));
      part(() => { ball(-27, -42, 2, 2, WOOD); ball(26, -42, 2, 2, WOOD); });
    },
    stall() {
      shadowE(0, -3, 44, 4);
      part(() => { rect(-38, -62, 3, 61, WOOD.d); rect(35, -62, 3, 61, WOOD.d); });
      barrel(-46, -11);
      part(() => { fillFn(-34, -24, 33, -1, (x, y) => y === -24 ? WOOD.l : y < -21 ? WOOD.m : (x + 34) % 7 === 6 ? WOOD.d : y > -4 ? WOOD.d : '#c28650'); });
      part(() => { for (let k = 0; k < 6; k++) ball(-28 + k * 4, -26, 2.2, 2.2, k % 2 ? RED : GREEN); ball(4, -27, 6, 3.2, TAN); ball(17, -27, 6, 3.2, TAN); ball(28, -26, 3, 2.5, ORANGE); });
      crate(36, -10, 9);
      part(() => polyFn([-42, -66, 41, -66, 46, -50, -47, -50], (x, y) => y === -66 ? '#fff6dc' : Math.floor((x + 47) / 8) % 2 ? '#f6efe0' : '#e9b93a'));
      part(() => fillFn(-47, -50, 46, -46, (x, y) => { const k = (x + 47) % 8, c = Math.floor((x + 47) / 8) % 2 ? '#f6efe0' : '#e9b93a'; return y - (-50) <= 2 - Math.abs(k - 3.5) * 0.6 + 1 ? c : 0; }));
    },
    mill() {
      shadowE(0, -3, 22, 4);
      part(() => {
        polyFn([-17, -1, 16, -1, 11, -62, -12, -62], (x, y) => {
          const j = -y, edge = 16 - j * 5 / 61;
          if (y > -12) return h2(x >> 2, (y + 20) >> 2) < .3 ? STONE.v : (y + 1) % 4 === 0 ? STONE.k : STONE.m;
          return x > edge - 4 ? CLOTH.d : x < -edge + 3 ? CLOTH.l : CLOTH.m;
        });
        door(-5, -18, 10, 17); ell(0, -42, 3.5, 3.5, OL); ell(0, -42, 2.5, 2.5, GLASS);
      });
      part(() => polyFn([-16, -60, 15, -60, 9, -72, 0, -78, -10, -72], tiles(RED, -78, 0)));
      part(() => { ball(0, -66, 3.5, 3.5, WOOD); px(-1, -67, WOOD.l); });
    },
    'mill.blades'() {
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + Math.PI / 4;
        part(() => { rline(0, 0, a, 2, 38, WOOD.d, 2); rpoly(0, 0, a, [9, 1, 37, 1, 37, 10, 9, 8], (u, v) => (Math.round(u) % 7 === 0 || Math.round(v) === 5) ? TAN.d : CLOTH.m); });
      }
      part(() => { ball(0, 0, 4, 4, WOOD); px(-1, -1, WOOD.l); });
    },
    storage() {
      shadowE(0, -3, 30, 4);
      part(() => { fillFn(-26, -36, 25, -1, (x, y) => (x + 26) % 5 === 4 ? WOOD.d : x > 22 || y > -3 ? WOOD.d : WOOD.m); fillFn(-9, -24, 8, -1, (x, y) => x === -9 || x === 8 || y === -24 ? OL : x - y === 15 || x + y === -16 ? WOOD.l : '#5a3a26'); });
      part(() => roofTrap(-31, 30, -34, -56, 9, tri('#b8503a', '#7e2f2a', '#d97a5c', { s: '#9b3f33', dd: '#5c2224' })));
      crate(-32, -12, 10); barrel(-22, -11); crate(23, -12, 10); crate(25, -21, 8);
    },
    pen() {
      fenceRow(-46, 46, -66, 9);
      for (const x of [-46, 43]) part(() => { rect(x, -66, 3, 64, WOOD.d); for (let y = -60; y < -6; y += 9) rect(x, y, 3, 2, WOOD.l); });
      part(() => { rect(-44, -76, 2, 16, WOOD.d); rect(-26, -76, 2, 16, WOOD.d); });
      part(() => { lump(-38, -64, 5, tri('#e9c35a', '#b68a2e', '#fff1a3')); lump(-31, -63, 5, tri('#e9c35a', '#b68a2e', '#fff1a3')); });
      part(() => roofTri(-48, -21, -74, -35, -85, RED));
      fenceRow(-46, -8, 0, 9); fenceRow(8, 46, 0, 9);
    },
    statue() {
      shadowE(0, -3, 22, 4);
      part(() => { bricks(-14, -20, 28, 19, { bw: 7, bh: 5 }); rect(-16, -24, 32, 4, STONE.l); rect(-16, -21, 32, 1, STONE.d); });
      knight(tri('#b7bcc8', '#878d9e', '#dde1ea'));
    },
    ruins() {
      shadowE(0, -3, 74, 6, 0.22);
      const top = (seed, h) => { const r = RNG(seed), a = []; for (let i = 0; i < 60; i++) a.push(Math.floor(r() * h)); return (i) => a[i >> 2] + (i & 1); };
      part(() => bricks(-30, -70, 60, 40, { s: RUIN, top: top(3, 22) }));
      part(() => bricks(-70, -64, 32, 63, { s: RUIN, round: 1, top: top(5, 18) }));
      part(() => bricks(38, -40, 32, 39, { s: RUIN, round: 1, top: top(7, 14) }));
      part(() => { bricks(-38, -34, 76, 33, { s: RUIN, top: top(9, 16) }); fillFn(-11, -26, 10, -1, (x, y) => { const d = Math.hypot(x + .5, y + .5 + 16); return y < -16 && d > 11 ? 0 : x === -11 || x === 10 || (y < -16 && d > 10) ? OL : '#2a2a3d'; }); });
      const r = RNG(21);
      for (let k = 0; k < 9; k++) { const x = Math.round(-70 + r() * 140), rx = 3 + r() * 5; part(() => rockP(x, -1 - rx * .4, rx, rx * .7, RUIN, k)); }
      for (let k = 0; k < 14; k++) { const x = Math.round(-68 + r() * 136), y = Math.round(-6 - r() * 40); part(() => { px(x, y, BUSH.m); px(x + 1, y, BUSH.l); px(x, y + 1, BUSH.d); }, null); }
    },
    'tent.red'() {
      shadowE(0, -3, 28, 4);
      line(-23, -24, -30, -1, '#d8c79e', 1); line(22, -24, 29, -1, '#d8c79e', 1);
      part(() => { polyFn([-25, -1, 24, -1, 0, -40], (x) => Math.floor((x + 40) / 6) % 2 ? RED.m : '#e86354'); polyFn([-6, -1, 5, -1, 0, -17], '#3a1f26'); line(-1, -17, -8, -1, RED.l, 1); });
      pennon(-1, -38, 10, RED);
    },
    cart() {
      shadowE(0, -2, 20, 3);
      part(() => { line(11, -12, 22, -7, WOOD.d, 2); sbox(-17, -16, 30, 7, WOOD); });
      part(() => { ball(-8, -21, 5, 4, CLOTH); ball(1, -21, 5, 4, CLOTH); ball(-3, -26, 4.5, 3.5, TAN); });
      crate(5, -24, 8);
      part(() => { ell(-5, -6, 5.5, 5.5, WOOD.d); ell(-5, -6, 4, 4, WOOD.m); line(-9, -6, -1, -6, WOOD.d, 1); line(-5, -10, -5, -2, WOOD.d, 1); ball(-5, -6, 1.5, 1.5, STEEL); });
    },
    boat() {
      part(() => { rect(-1, -42, 2, 30, WOOD.d); polyFn([1, -43, 10, -41, 1, -38], RED.m); });
      part(() => polyFn([-18, -39, 16, -39, 20, -28, 17, -18, -18, -18, -15, -28], (x, y) => { const k = Math.floor((y + 39) / 6); return y === -39 ? '#fff4c0' : x > 12 ? '#c99024' : k % 2 ? '#f2c94c' : '#e2a92e'; }));
      part(() => polyFn([-42, -17, 46, -21, 36, 3, -34, 3], (x, y) => y < -14 ? WOOD.l : y > -1 ? WOOD.d : (y + 17) % 5 === 4 ? WOOD.d : WOOD.m));
      part(() => { rect(-40, -24, 14, 8, WOOD.m); rect(-40, -24, 14, 1, WOOD.l); win(-36, -22, 5, 5); });
    },
    signpost() {
      shadowE(0, -2, 8, 2);
      part(() => rect(-1, -38, 3, 37, WOOD.d));
      part(() => polyFn([-9, -36, 9, -36, 13, -32.5, 9, -29, -9, -29], (x, y) => y === -36 ? WOOD.l : WOOD.m));
      part(() => polyFn([-12, -24.5, -8, -28, 9, -28, 9, -21, -8, -21], (x, y) => y === -28 ? WOOD.l : WOOD.m));
      rect(-6, -33, 12, 1, WOOD.d); rect(-5, -25, 11, 1, WOOD.d);
    },
    chest() {
      shadowE(0, -2, 10, 2);
      part(() => { sbox(-9, -11, 18, 10, WOOD); polyFn([-9, -11, 9, -11, 8, -15, -8, -15], (x, y) => y === -15 ? WOOD.l : WOOD.m); rect(-9, -12, 18, 1, GOLD.d); rect(-6, -15, 2, 14, GOLD.m); rect(4, -15, 2, 14, GOLD.m); sbox(-2, -11, 4, 4, GOLD); px(0, -9, OL); });
    },
    scaffold() {
      part(() => { for (const x of [-26, -2, 22]) rect(x, -58, 3, 57, WOOD.m); });
      part(() => { line(-24, -20, 0, -40, WOOD.d, 2); line(0, -20, 24, -40, WOOD.d, 2); line(-24, -40, 0, -56, WOOD.d, 2); });
      part(() => { rect(-30, -22, 58, 3, WOOD.l); rect(-30, -42, 58, 3, WOOD.l); rect(-30, -60, 58, 3, WOOD.l); });
      part(() => { rect(8, -42, 2, 41, TAN.d); rect(14, -42, 2, 41, TAN.d); for (let y = -38; y < 0; y += 5) rect(8, y, 8, 1, TAN.m); });
    },
    flag() { flagPole(); },
    smoke() { part(() => { ball(-2, 1, 4, 4, tri('#d6d7de', '#a5a7b4', '#f2f2f6')); ball(2, -1, 4.5, 4.5, tri('#d6d7de', '#a5a7b4', '#f2f2f6')); }, null, 0.75); },
    shadow() { org(0, 0); ell(16, 6, 15.5, 5.6, al(OL, 0.35)); },
    selring() { org(0, 0); part(() => fillFn(0, 0, 39, 15, (x, y) => { const X = x + .5 - 20, Y = y + .5 - 8, o = (X / 18.5) ** 2 + (Y / 6.6) ** 2, i = (X / 15.5) ** 2 + (Y / 4.4) ** 2; return o <= 1 && i > 1 ? (Y > 1 ? '#e0a526' : Y < -3 ? '#fff1a3' : '#ffd34d') : 0; })); },
    berries() {
      for (const [x, y] of [[-8, -16], [6, -19], [-1, -9], [9, -10], [-11, -6]]) {
        part(() => { for (const [dx, dy] of [[0, 0], [3, 1], [1, 3]]) { ball(x + dx, y + dy, 1.8, 1.8, RED); px(x + dx - 1, y + dy - 1, '#ffd0c4'); } });
      }
    },
    road() {
      org(0, 0);
      rect(0, 0, 32, 32, '#d8bf86');
      const r = RNG(404);
      for (let k = 0; k < 40; k++) { const x = Math.floor(r() * 32), y = Math.floor(r() * 32); px(x, y, r() < 0.5 ? '#c9ae76' : '#e3cf9c'); }
      for (let k = 0; k < 7; k++) { const x = Math.floor(r() * 32), y = Math.floor(r() * 32); px(x, y, '#a08a64'); px((x + 1) % 32, y, '#b29a70'); px(x, (y + 1) % 32, '#c2a878'); px(x, (y + 31) % 32, '#efe0b4'); }
    },
    'stone.pile'() {
      shadowE(0, -2, 14, 3);
      for (const [x, y] of [[-12, -7], [-4, -7], [4, -7], [-8, -13], [0, -13], [-4, -19]]) part(() => { fillFn(x, y, x + 7, y + 5, (X, Y) => Y === y ? STONE.l : X === x + 7 || Y === y + 5 ? STONE.d : STONE.m); });
    },
  };
  function campfire(f, n) {
    shadowE(0, -2, 12, 3, 0.22);
    const st = [[-8, -4], [-4, -6], [1, -6], [6, -5], [9, -3], [-10, -2]];
    for (const [x, y] of st) part(() => ball(x, y, 2.6, 2.2, ROCK));
    part(() => { line(-7, -2, 6, -6, WOOD.m, 3); line(-6, -6, 7, -2, WOOD.d, 3); });
    for (const [x, y] of [[-7, 0], [-2, 1], [3, 1], [8, 0]]) part(() => ball(x, y - 1, 2.6, 2.2, ROCK));
    if (f >= 0) fireAt(0, -3, 0.8, f, n);
  }
  function flagPole() { part(() => { rect(-1, -45, 2, 44, WOOD.d); px(-1, -45, WOOD.l); ball(0, -46, 1.6, 1.6, GOLD); ell(0, -2, 4, 1.6, STONE.m); }); }
  function banner(P, f, n) {
    flagPole();
    const ph = f / n * TAU;
    part(() => {
      rect(-7, -42, 14, 2, WOOD.m);
      fillFn(-6, -40, 5, -18, (x, y) => {
        const i = x + 6, sx = Math.round(Math.sin(ph + (y + 40) * 0.25) * ((y + 40) / 22)), wv = Math.round(Math.sin(ph + i * 0.7) * 0.8);
        const xx = x - sx, bot = -21 + wv + (Math.abs(xx + .5) < 2.5 ? -3 + Math.abs(xx + .5) : 0);
        if (xx < -6 || xx > 5 || y > bot) return 0;
        return (xx === -1 || xx === 0) && y > -36 && y < -24 ? P.l : (y === -33 && xx > -4 && xx < 3) ? P.l : xx >= 4 ? P.d : P.m;
      });
      ball(-7, -41, 1.3, 1.3, GOLD); ball(6, -41, 1.3, 1.3, GOLD);
    });
  }

  // ================= Chân dung (vẽ 48x48 rồi phóng x2) =================
  function bust(P) { part(() => polyFn([4, 48, 7, 40, 15, 35, 33, 35, 41, 40, 44, 48], (x, y) => x > 31 ? P.d : x < 13 ? P.l : P.m)); }
  function faceP(cx, cy, rx, ry, mat) {
    fillFn(cx - rx - 1, cy - ry - 1, cx + rx, cy + ry, (x, y) => {
      const u = (x + .5 - cx) / rx, v = (y + .5 - cy) / ry;
      if (u * u + v * v > 1) return 0;
      const m = mat ? mat(u, v) : SKIN; if (typeof m === 'string') return m;
      return (u + .15) ** 2 + (v + .25) ** 2 > 1.05 ? m.d : (u + .45) ** 2 * 3 + (v + .55) ** 2 * 4 < .3 && m.l ? m.l : m.m;
    });
  }
  function eyesP(y, c, cl) { for (const x of [18, 28]) { rect(x, y, 2, 3, c || OL); if (cl !== false) px(x, y, '#ffffff'); } }
  const PORT = {
    hero() {
      const P = pal('blue');
      bust(P); part(() => { ball(9, 41, 7, 5, STEEL); ball(39, 41, 7, 5, STEEL); });
      part(() => { lump(24, 7, 5, P); lump(19, 9, 4, P); lump(29, 9, 4, P); });
      part(() => { faceP(24, 23, 13, 13, (u, v) => v > -0.35 && Math.abs(u) < 0.62 && v < 0.75 ? SKIN : STEEL); rect(23, 10, 2, 9, STEEL.d); });
      eyesP(23); rect(17, 21, 4, 1, '#6b4a3a'); rect(27, 21, 4, 1, '#6b4a3a'); rect(22, 30, 4, 1, '#a2564a');
    },
    advisor() {
      const P = pal('blue');
      bust(P);
      part(() => { faceP(24, 24, 11, 11); polyFn([13, 26, 35, 26, 32, 40, 24, 46, 16, 40], (x, y) => y > 40 ? '#c9ccd8' : x > 28 ? '#dfe1ea' : '#f6f6fa'); });
      part(() => { polyFn([10, 17, 38, 17, 28, 1, 24, -1, 21, 2], (x, y) => x > 27 ? P.d : y > 13 ? P.l : P.m); rect(10, 15, 28, 3, P.d); px(25, 4, GOLD.m); });
      eyesP(23, OL, false); rect(16, 21, 5, 1, '#f6f6fa'); rect(27, 21, 5, 1, '#f6f6fa'); rect(20, 28, 8, 2, '#e3e5ee'); rect(22, 30, 4, 1, '#a2564a');
    },
    merchant() {
      const P = pal('yellow');
      bust(P); part(() => { for (let y = 38; y < 47; y += 4) ball(24, y, 1.4, 1.4, GOLD); });
      part(() => faceP(24, 24, 14, 12));
      part(() => { ball(24, 12, 15, 5, GOLD); polyFn([12, 13, 36, 13, 33, 3, 15, 3], (x) => x > 30 ? GOLD.d : GOLD.m); rect(14, 9, 20, 2, RED.m); line(32, 5, 38, -1, RED.l, 2); });
      eyesP(22); rect(16, 28, 7, 2, '#6b4a3a'); rect(25, 28, 7, 2, '#6b4a3a'); rect(21, 31, 6, 1, '#a2564a'); px(20, 30, '#a2564a'); px(27, 30, '#a2564a');
      ell(15, 28, 2, 1.2, '#f0a08a'); ell(33, 28, 2, 1.2, '#f0a08a');
    },
    abbess() {
      const P = pal('purple');
      part(() => { polyFn([8, 48, 10, 22, 16, 9, 24, 6, 32, 9, 38, 22, 40, 48], (x) => x > 31 ? P.d : x < 15 ? P.l : P.m); });
      part(() => { faceP(24, 24, 11, 12, (u, v) => u * u + v * v > 0.72 ? CLOTH : SKIN); });
      for (const x of [17, 27]) { rect(x, 24, 4, 1, OL); px(x, 23, OL); px(x + 3, 23, OL); }
      rect(22, 30, 4, 1, '#b05a5a'); px(21, 29, '#b05a5a'); px(26, 29, '#b05a5a');
      part(() => { rect(23, 37, 2, 8, GOLD.m); rect(20, 39, 8, 2, GOLD.m); });
    },
    chief() {
      const P = pal('black');
      bust(P); part(() => { ball(9, 41, 7, 5, STEEL); ball(39, 41, 7, 5, STEEL); });
      part(() => { faceP(24, 24, 12, 13); polyFn([12, 18, 14, 9, 24, 7, 34, 9, 36, 18, 32, 13, 16, 13], '#2b2c38'); polyFn([14, 30, 34, 30, 30, 38, 18, 38], '#4a4b5c'); });
      eyesP(23); rect(16, 20, 5, 2, '#2b2c38'); rect(27, 20, 5, 2, '#2b2c38');
      line(15, 18, 22, 29, '#c85a5a', 1); rect(21, 32, 6, 1, '#7a3c3c');
    },
    warlord() {
      const P = pal('red');
      bust(P); part(() => { polyFn([3, 40, 10, 35, 14, 38, 8, 44], STEEL.d); polyFn([45, 40, 38, 35, 34, 38, 40, 44], STEEL.d); });
      part(() => { polyFn([10, 14, 3, 2, 6, 1, 14, 9], BONE); polyFn([38, 14, 45, 2, 42, 1, 34, 9], BONE); });
      part(() => { faceP(24, 25, 12, 13, (u, v) => v < -0.15 ? P : v > 0.45 ? tri('#4a2a2a', '#2e1a1e', '#6a3a36') : SKIN); rect(23, 13, 2, 14, P.d); });
      rect(16, 22, 6, 1, OL); rect(26, 22, 6, 1, OL); px(21, 23, OL); px(26, 23, OL);
      rect(18, 24, 2, 2, '#ffdd55'); rect(28, 24, 2, 2, '#ffdd55'); rect(21, 33, 6, 1, '#1d0f12');
    },
    villager() {
      const P = pal('blue');
      bust(TAN);
      part(() => { faceP(24, 25, 12, 12, (u, v) => v < -0.25 + 0.1 * u ? (v > -0.5 ? P.d : P) : SKIN); ball(13, 12, 3, 3, P); });
      eyesP(25); rect(22, 32, 4, 1, '#a2564a'); ell(16, 30, 2, 1.2, '#f0a08a'); ell(32, 30, 2, 1.2, '#f0a08a');
    },
    scout() {
      const P = pal('red');
      part(() => polyFn([6, 48, 9, 24, 15, 10, 24, 6, 33, 10, 39, 24, 42, 48], (x) => x > 31 ? P.d : x < 15 ? P.l : P.m));
      part(() => { faceP(24, 25, 10, 11, (u, v) => v > 0.25 ? tri('#5a2a2e', '#3c1c22', '#7a3a3e') : SKIN); });
      rect(17, 23, 4, 2, OL); rect(27, 23, 4, 2, OL); px(20, 23, '#ffffff'); px(30, 23, '#ffffff'); rect(16, 21, 5, 1, '#5a2a2e'); rect(27, 21, 5, 1, '#5a2a2e');
    },
    stranger() {
      const C = tri('#2c2d3c', '#1a1b26', '#44465a');
      part(() => polyFn([5, 48, 9, 22, 15, 8, 24, 4, 33, 8, 39, 22, 43, 48], (x) => x > 31 ? C.d : x < 15 ? C.l : C.m));
      part(() => faceP(24, 26, 10, 11, () => '#0c0d14'), null);
      rect(18, 25, 3, 2, '#7ff0ff'); rect(27, 25, 3, 2, '#7ff0ff'); px(19, 25, '#ffffff'); px(28, 25, '#ffffff');
      ell(19.5, 26, 3, 2, al('#7ff0ff', 0.25)); ell(28.5, 26, 3, 2, al('#7ff0ff', 0.25));
    },
  };
  function portrait(who) {
    org(0, 0);
    fillFn(0, 0, 47, 47, (x, y) => { const d = Math.hypot(x - 24, y - 20); return d < 18 ? '#1a2462' : d < 24 ? '#151e52' : '#101741'; });
    (PORT[who] || PORT.villager)();
    const r = 5;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const cx = Math.min(x, 47 - x), cy = Math.min(y, 47 - y);
      if (cx < r && cy < r) { const d = Math.hypot(r - cx - .5, r - cy - .5); if (d > r) T.d[y * 48 + x] = 0; else if (d > r - 1) T.d[y * 48 + x] = U('#2c3a80'); }
      else if (cx === 0 || cy === 0) T.d[y * 48 + x] = U('#2c3a80');
    }
  }

  // ================= Biểu tượng 32x32 =================
  const o = part;
  function coin(x, y, r) { o(() => { ball(x, y, r, r, GOLD); ring(x, y, r - 1.5, r - 1.5, 1, GOLD.d); px(x - 1, y - 2, '#ffffff'); }); }
  function heartAt(cx, cy, s, p) { o(() => { ball(cx - s * .5, cy - s * .25, s * .55, s * .55, p); ball(cx + s * .5, cy - s * .25, s * .55, s * .55, p); polyFn([cx - s * 1.03, cy - s * .05, cx + s * 1.03, cy - s * .05, cx, cy + s * .95], (x) => x > cx + s * .2 ? p.d : p.m); px(cx - s * .7, cy - s * .55, '#ffffff'); }); }
  function star(cx, cy, R, p) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * .45 : R; pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } o(() => polyFn(pts, (x, y) => y > cy + 2 ? p.d : x < cx - 2 && y < cy ? p.l : p.m)); }
  function sheepIcon() { o(() => { rect(9, 22, 2, 5, '#3a3d50'); rect(20, 22, 2, 5, '#3a3d50'); }); o(() => { ball(15, 17, 10, 7, WOOL); for (let k = 0; k < 6; k++) lump(7 + k * 3.4, 12 + (k % 2), 3.4, WOOL); }); o(() => { ball(25, 14, 4, 3.6, tri('#4a4d63', '#2f3144', '#6e7290')); px(26, 13, '#ffffff'); }); }
  const ICON = {
    wood() { for (const [x, y] of [[10, 21], [22, 21], [16, 11]]) o(() => { ball(x, y, 6.5, 6.5, WOOD); ell(x, y, 5, 5, TAN.l); ring(x, y, 3.2, 3.2, 1, TAN.d); px(x, y, TAN.d); }); },
    stone() { o(() => rockP(19, 20, 10, 8, ROCK, 1)); o(() => rockP(10, 24, 7, 5, ROCK, 2)); },
    ore() { o(() => { rockP(16, 19, 13, 11, ROCK, 3); for (const [x, y] of [[11, 14], [19, 12], [21, 20], [13, 22]]) { rect(x, y, 3, 2, GOLD.m); px(x, y, '#ffffff'); px(x + 2, y + 1, GOLD.d); } }); },
    gold() { o(() => { for (let k = 0; k < 4; k++) { ell(13, 25 - k * 3, 9, 3.5, GOLD.d); ell(13, 24 - k * 3, 9, 3.2, GOLD.m); } ell(13, 14, 7, 2.2, GOLD.l); }); coin(24, 22, 6); },
    berry() { o(() => { line(16, 10, 13, 4, '#5a3c2a', 1); polyFn([16, 9, 22, 4, 26, 7, 20, 11], GREEN.m); }); for (const [x, y] of [[11, 17], [20, 16], [15, 24]]) o(() => { ball(x, y, 5, 5, RED); px(x - 2, y - 2, '#ffd0c4'); }); },
    wheat() { o(() => { for (const dx of [-6, -3, 0, 3, 6]) { line(16, 28, 16 + dx, 11, '#b68a2e', 1); ell(16 + dx * 1.15, 8, 1.6, 4, '#e8c35a'); px(16 + dx * 1.15, 6, '#fff1a3'); } rect(12, 20, 9, 2, TAN.d); }); },
    carrot() { o(() => { line(9, 9, 5, 3, GREEN.m, 2); line(10, 8, 11, 2, GREEN.l, 2); line(8, 10, 3, 9, GREEN.d, 2); }); o(() => { polyFn([6, 12, 12, 6, 27, 27], (x, y) => x - y > 2 ? ORANGE.d : ORANGE.m); for (const k of [10, 15, 20]) line(k - 1, k + 1, k + 1, k - 1, ORANGE.d, 1); px(9, 11, ORANGE.l); }); },
    pumpkin() { o(() => { rect(15, 5, 3, 5, '#5f7a2e'); polyFn([18, 7, 25, 4, 23, 9], GREEN.m); }); o(() => { ball(16, 19, 13, 10, ORANGE); for (const x of [10, 16, 22]) line(x, 11, x + (x - 16) * .3, 28, ORANGE.d, 1); }); },
    meat() { o(() => { line(19, 19, 26, 26, BONE, 3); ball(27, 25, 2, 2, CLOTH); ball(25, 28, 2, 2, CLOTH); }); o(() => { ball(13, 14, 10, 9, MEAT); ell(10, 11, 3, 2, '#f6c2a8'); }); },
    fish() { const F = tri('#6fa3c7', '#3d6f96', '#a8d0ea'); o(() => { polyFn([2, 9, 8, 16, 2, 23], F.d); ball(16, 16, 11, 7, F); polyFn([12, 9, 19, 5, 21, 10], F.d); rect(13, 19, 8, 1, F.l); }); rect(22, 13, 2, 2, OL); px(22, 13, '#ffffff'); },
    wool() { o(() => { ball(16, 17, 10, 9, WOOL); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; lump(16 + Math.cos(a) * 9, 17 + Math.sin(a) * 8, 4.5, WOOL); } }); },
    flour() { o(() => { polyFn([7, 28, 6, 15, 11, 9, 21, 9, 26, 15, 25, 28], (x, y) => x > 21 ? CLOTH.d : x < 9 ? CLOTH.l : CLOTH.m); polyFn([11, 9, 9, 3, 16, 6, 23, 3, 21, 9], CLOTH.m); rect(10, 9, 12, 2, TAN.d); for (const dx of [-2, 0, 2]) { line(16, 24, 16 + dx, 17, '#c9a54e', 1); } }); },
    bread() { const BR = tri('#d99a4e', '#a9662a', '#f2c37e'); o(() => { ball(16, 19, 13, 8, BR); for (const x of [9, 15, 21]) line(x, 18, x + 4, 14, BR.l, 1); }); },
    cloth() { const C = pal('purple'); o(() => { polyFn([6, 22, 12, 22, 9, 29, 4, 29], C.d); fillFn(6, 8, 23, 23, (x, y) => (y - 8) % 5 === 2 ? C.l : x > 20 ? C.d : C.m); ell(24, 15.5, 3.5, 7.5, C.l); ring(24, 15.5, 2.2, 4.5, 1, C.d); }); },
    tools() { o(() => { rpoly(16, 16, 0.78, [-13, -2, 9, -4, 9, 4, -13, 2], (u, v) => v > 2 ? STEEL.d : STEEL.m); rpoly(16, 16, 0.78, [9, -4, 14, -4, 14, 4, 9, 4], WOOD.m); }); o(() => { rline(16, 16, -0.78, -12, 9, WOOD.m, 3); rpoly(16, 16, -0.78, [7, -5, 12, -5, 12, 6, 7, 6], (u, v) => v > 3 ? STEEL.d : STEEL.m); }); },
    weapons() { o(() => sword(7, 25, -0.78, 25)); o(() => sword(25, 25, -2.36, 25)); },
    potion() { o(() => { ball(16, 21, 9, 8.5, tri('#e04848', '#9c2a33', '#ff9a8a')); rect(13, 6, 6, 8, '#cfe8f0'); fillFn(8, 11, 24, 18, (x, y) => (x - 16) ** 2 / 81 + (y - 21) ** 2 / 72 < 1 && y < 17 ? '#cfe8f0' : 0); rect(12, 3, 8, 4, TAN.m); px(12, 18, '#ffffff'); px(13, 17, '#ffffff'); }); },
    stew() { o(() => { polyFn([3, 16, 29, 16, 25, 26, 7, 26], (x) => x > 22 ? WOOD.d : WOOD.m); ell(16, 16, 13, 3.5, '#b8622e'); px(11, 15, ORANGE.l); px(18, 16, GREEN.m); px(21, 15, ORANGE.m); px(14, 17, '#f0d0a0'); }); for (const x of [11, 16, 21]) pline([x, 11, x - 1, 8, x + 1, 5, x, 2], '#ffffffaa', 1); },
    sheep: sheepIcon,
    pop() { const P = pal('blue'); o(() => sbox(7, 17, 18, 13, P, 3)); o(() => ball(16, 11, 6.5, 6.5, SKIN)); rect(17, 11, 1, 2, OL); rect(20, 11, 1, 2, OL); },
    morale() { o(() => ball(16, 16, 12, 12, tri('#ffd34d', '#d99a1e', '#fff1a3'))); rect(11, 11, 2, 4, OL); rect(19, 11, 2, 4, OL); pline([9, 18, 12, 22, 16, 23, 20, 22, 23, 18], OL, 1); },
    food() { o(() => { ball(11, 12, 6, 6, RED); rect(10, 4, 2, 3, WOOD.d); }); o(() => ball(21, 13, 7, 5, tri('#d99a4e', '#a9662a', '#f2c37e'))); o(() => fillFn(4, 16, 27, 28, (x, y) => (x < 6 + (y - 16) * .2 || x > 25 - (y - 16) * .2) ? 0 : (x + y) % 3 === 0 ? TAN.d : y === 16 ? TAN.l : TAN.m)); },
    sword() { o(() => sword(6, 26, -0.78, 27)); },
    shield() { const P = pal('blue'); o(() => { polyFn([5, 4, 27, 4, 27, 16, 16, 29, 5, 16], STEEL.d); polyFn([7, 6, 25, 6, 25, 16, 16, 26.5, 7, 16], (x) => x < 16 ? P.m : P.s); rect(15, 7, 3, 18, GOLD.m); rect(8, 12, 17, 3, GOLD.m); }); },
    bow() { o(() => { const pts = []; for (let i = -5; i <= 5; i++) { const t = i / 5; pts.push(16 + (i * 2.4) * .7 + (1 - t * t) * 7 * .7, 16 - i * 2.4 * .7 + (1 - t * t) * 7 * .7); } pline(pts, WOOD.m, 2); }); line(8, 24, 24, 8, STR, 1); o(() => { line(6, 26, 22, 10, WOOD.l, 1); polyFn([20, 8, 26, 6, 24, 12], STEEL.m); rect(5, 25, 3, 2, '#f1ede2'); }); },
    lance() { o(() => { rline(16, 16, -0.78, -14, 10, WOOD.m, 2); rpoly(16, 16, -0.78, [9, -2.5, 18, 0, 9, 2.5], STEEL.m); rpoly(16, 16, -0.78, [2, 1, 8, 1, -2, 7], RED.m); rpoly(16, 16, -0.78, [-9, -3.5, -4, -1.2, -4, 1.2, -9, 3.5], STEEL.l); }); },
    heart() { heartAt(16, 15, 11, RED); },
    star() { star(16, 17, 14, tri('#ffd34d', '#d99a1e', '#fff1a3')); },
    hammer() { o(() => { rline(16, 16, -0.78, -13, 8, WOOD.m, 3); rpoly(16, 16, -0.78, [5, -7, 12, -7, 12, 7, 5, 7], (u, v) => v > 3 ? STEEL.d : STEEL.m); }); },
    scroll() { o(() => { fillFn(8, 7, 23, 24, (x, y) => x > 21 ? '#d9c08a' : (y - 9) % 3 === 0 && x > 10 && x < 21 && y < 22 ? '#9a8058' : '#f3e3b5'); ball(16, 6, 9, 2.6, tri('#e9d39b', '#bfa16a', '#fff4d0')); ball(16, 25, 9, 2.6, tri('#e9d39b', '#bfa16a', '#fff4d0')); }); },
    crown() { o(() => { polyFn([4, 26, 4, 10, 10, 18, 16, 6, 22, 18, 28, 10, 28, 26], (x, y) => y > 22 ? GOLD.d : x > 22 ? GOLD.d : GOLD.m); rect(5, 21, 23, 2, GOLD.l); }); px(16, 13, RED.m); ell(10, 22, 1.5, 1.5, pal('blue').m); ell(22, 22, 1.5, 1.5, GREEN.m); ell(16, 22, 1.5, 1.5, RED.m); },
    clock() { o(() => { ball(16, 16, 13, 13, tri('#c2841c', '#93600f', '#f3c63f')); ell(16, 16, 10, 10, '#f6f2e6'); }); line(16, 16, 16, 9, OL, 1); line(16, 16, 21, 18, OL, 1); for (let k = 0; k < 12; k += 3) { const a = k / 12 * TAU; px(16 + Math.cos(a) * 8.5, 16 + Math.sin(a) * 8.5, '#8a7a60'); } },
    moon() { o(() => fillFn(3, 3, 28, 28, (x, y) => { const a = (x + .5 - 15) ** 2 + (y + .5 - 16) ** 2, b = (x + .5 - 21) ** 2 + (y + .5 - 12) ** 2; return a < 144 && b > 100 ? (a > 110 ? '#d9c56a' : '#fff0a8') : 0; })); },
    sun() { const S = tri('#ffd34d', '#f39a2a', '#fff1a3'); o(() => { for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; rpoly(16, 16, a, [8, -3, 15, 0, 8, 3], S.d); } ball(16, 16, 8, 8, S); }); },
    coin() { coin(16, 16, 12); o(() => { rect(14, 10, 4, 12, GOLD.d); }, null); px(14, 10, GOLD.l); },
    house() { o(() => { sbox(7, 15, 18, 13, STONE); rect(13, 20, 6, 8, WOOD.d); }); o(() => polyFn([3, 17, 29, 17, 16, 4], tiles(pal('blue'), 4, 16))); },
    castle() { o(() => { bricks(4, 8, 8, 21, { bw: 4, bh: 3 }); bricks(20, 8, 8, 21, { bw: 4, bh: 3 }); bricks(9, 14, 14, 15, { bw: 4, bh: 3 }); fillFn(4, 5, 27, 7, (x) => x % 3 !== 2 && (x < 12 || x > 19) ? STONE.l : 0); fillFn(9, 12, 22, 13, (x) => x % 3 !== 2 ? STONE.l : 0); rect(14, 21, 4, 8, OL); }); o(() => { rect(15, 1, 1, 10, WOOD.d); polyFn([16, 1, 22, 3, 16, 5], pal('blue').m); }); },
    trade() { o(() => polyFn([4, 9, 20, 9, 20, 5, 28, 12, 20, 19, 20, 15, 4, 15], (x, y) => y > 13 ? GOLD.d : GOLD.m)); o(() => polyFn([28, 18, 12, 18, 12, 14, 4, 21, 12, 28, 12, 24, 28, 24], (x, y) => y > 22 ? pal('blue').d : pal('blue').m)); },
    book() { o(() => { fillFn(6, 5, 25, 27, (x, y) => x > 22 ? (y % 2 ? '#f6f2e6' : '#d9d2c0') : y > 25 ? '#f6f2e6' : x < 9 ? '#6e2a2a' : '#9a3a3a'); rect(12, 10, 8, 5, GOLD.m); rect(13, 11, 6, 3, GOLD.d); }); },
    skull() { o(() => { ball(16, 13, 11, 10, tri('#f2efe6', '#c3bfb2', '#ffffff')); sbox(10, 19, 12, 8, tri('#f2efe6', '#c3bfb2', '#ffffff')); }); ell(11.5, 14, 3, 3, OL); ell(20.5, 14, 3, 3, OL); polyFn([16, 17, 14, 21, 18, 21], OL); for (const x of [12, 15, 18]) rect(x, 24, 1, 3, OL); },
    fire() { org(16, 29); fireAt(0, -1, 1.35, 1, 8); org(0, 0); },
    seed() { o(() => { line(16, 18, 16, 9, GREEN.d, 1); ell(12, 9, 4, 2, GREEN.m); ell(20, 7, 4, 2, GREEN.l); }); for (const [x, y] of [[9, 23], [16, 21], [23, 24]]) o(() => { ball(x, y, 3.5, 4.5, TAN); px(x - 1, y - 2, TAN.l); }); },
    flag() { o(() => { rect(6, 3, 3, 27, WOOD.d); ball(7.5, 3, 2, 2, GOLD); }); o(() => polyFn([9, 5, 18, 7, 27, 5, 27, 18, 18, 20, 9, 18], (x, y) => y > 15 ? RED.d : RED.m)); },
    map() { o(() => polyFn([3, 7, 11, 4, 21, 8, 29, 5, 29, 26, 21, 29, 11, 25, 3, 28], (x) => x < 11 ? '#e8d4a0' : x < 21 ? '#f3e3b5' : '#dcc690')); for (const [x, y] of [[7, 22], [10, 19], [13, 17], [17, 15]]) px(x, y, '#9a3a3a'); line(20, 10, 25, 15, RED.m, 2); line(25, 10, 20, 15, RED.m, 2); },
    gear() { o(() => { for (let k = 0; k < 8; k++) rpoly(16, 16, k / 8 * TAU, [8, -3, 14, -2.4, 14, 2.4, 8, 3], STEEL.d); ball(16, 16, 10, 10, STEEL); cutE(16, 16, 3.6, 3.6); }); },
    chest() { o(() => { sbox(4, 14, 24, 14, WOOD); polyFn([4, 14, 28, 14, 26, 6, 6, 6], (x, y) => y < 8 ? WOOD.l : WOOD.m); rect(4, 13, 24, 2, GOLD.d); rect(8, 6, 3, 22, GOLD.m); rect(21, 6, 3, 22, GOLD.m); sbox(14, 13, 5, 6, GOLD); px(16, 16, OL); }); },
  };

  // ================= Danh mục & tạo tấm =================
  function catalog() { return root.TS_CATALOG && root.TS_CATALOG.entries; }
  function entry(key) {
    const E = catalog(); if (!E || typeof key !== 'string') return null;
    if (E[key]) return E[key];
    const p = key.split('.');
    if (p[0] === 'u' && p.length === 4 && p[1] && p[2] && p[3]) {
      const k = E[`u.blue.${p[2]}.${p[3]}`]; if (k) return k;
      const big = p[2] === 'lancer'; return { size: big ? [320, 320] : [192, 192], frames: 6, ax: 0.5, ay: big ? 0.6 : 0.67 };
    }
    if (p[0] === 'b' && p.length === 3 && p[1] && p[2]) return E[`b.blue.${p[2]}`] || { size: [128, 192], frames: 1, ax: 0.5, ay: 0.95, still: true };
    if (p[0] === 'p' && p[1] === 'banner' && p.length === 3 && p[2]) return E['p.banner.blue'];
    return null;
  }
  function drawer(key) {
    const p = key.split('.'), a = p[1];
    switch (p[0]) {
      case 'u': { const P = pal(a); if (p[3] === 'arrow') return () => part(() => arrowShape(-11, -1, 12, P)); if (p[3] === 'heal_fx') return healFx; return (f, n) => unit(p[2], p[3], P, f, n); }
      case 'b': { const P = pal(a); return () => (B[p[2]] || B.house1)(P); }
      case 'n': {
        const m = /^(tree|stump|bush|rock|waterrock|goldstone|cloud)(\d)$/.exec(a);
        if (m) { const fn = { tree, stump, bush, rock, waterrock, goldstone, cloud }[m[1]], i = Math.max(1, +m[2]); return (f, n) => fn(i, f, n); }
        return a === 'sheep' ? (f, n) => sheep(p[2], f, n) : null;
      }
      case 'r': return RES[a] || null;
      case 'fx': return FX[a] || null;
      case 't': return a === 'foam' ? foam : null;
      case 'i': return ICON[a] ? () => { org(0, 0); ICON[a](); } : null;
      case 'p':
        if (a === 'portrait') return () => portrait(p[2]);
        if (a === 'banner') return (f, n) => banner(pal(p[2]), f, n);
        if (a === 'crop') return () => crop(p[2], Math.max(0, Math.min(3, +p[3] || 0)));
        return PROC[key.slice(2)] || null;
    }
    return null;
  }
  function build(key, e) {
    const draw = drawer(key); if (!draw) return null;
    const sc = /^(i\.|p\.portrait\.)/.test(key) ? 1 : 2, up = key.startsWith('p.portrait.') ? 2 : 1;
    const W = Math.round(e.size[0] / sc), H = Math.round(e.size[1] / sc), n = e.still ? 1 : Math.max(1, e.frames | 0), w = W / up, h = H / up;
    const cv = document.createElement('canvas'); cv.width = W * n; cv.height = H;
    const ctx = cv.getContext('2d'), im = ctx.createImageData(W * n, H), out = new Uint32Array(im.data.buffer);
    M = new Buf(w, h); Q = new Buf(w, h);
    try {
      for (let f = 0; f < n; f++) {
        M.d.fill(0); M.reset(); T = M;
        org(Math.round(e.ax * w), Math.round(e.ay * h));
        draw(f, n);
        for (let y = 0; y < H; y++) {
          const row = ((y / up) | 0) * w, o2 = y * W * n + f * W;
          if (up === 1) out.set(M.d.subarray(row, row + w), o2); else for (let x = 0; x < W; x++) out[o2 + x] = M.d[row + ((x / up) | 0)];
        }
      }
    } finally { M = Q = T = null; }
    ctx.putImageData(im, 0, 0);
    return { img: cv, fw: W, fh: H, n, ax: e.ax * W, ay: e.ay * H, scale: sc };
  }

  const cache = new Map(), urls = new Map();
  function get(key) {
    if (cache.has(key)) return cache.get(key);
    const e = entry(key); if (!e || typeof document === 'undefined') return null;
    let s = null;
    try { s = build(key, e); } catch (err) { if (root.console) console.error('[Fallback] lỗi vẽ', key, err); }
    cache.set(key, s);
    return s;
  }
  function iconURL(key) {
    if (urls.has(key)) return urls.get(key);
    const s = get(key); if (!s) return null;
    const c = document.createElement('canvas'); c.width = s.fw * s.scale; c.height = s.fh * s.scale;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(s.img, 0, 0, s.fw, s.fh, 0, 0, c.width, c.height);
    const u = c.toDataURL('image/png'); urls.set(key, u); return u;
  }
  function has(key) { const e = entry(key); return !!(e && drawer(key)); }

  root.Fallback = { get, has, iconURL };
})(typeof window !== 'undefined' ? window : globalThis);
