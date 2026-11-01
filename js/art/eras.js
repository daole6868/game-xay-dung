/*
 * Đồ hoạ thời đại (đồ đá -> hiện đại): vỏ công trình e.<a|g|m>.<loại>, công trình mới e.<tên>, tường tự nối w.*,
 * thiên nhiên theo vùng n.*, lính mới u.<màu>.<loại>.<hoạt ảnh>, đạn x.*, biểu tượng i.*.
 * Nạp SAU js/art/fallback.js; đăng ký qua Fallback.extend. Vẽ nửa độ phân giải (scale 2), riêng i.* 32x32 (scale 1).
 * Toạ độ vẽ: gốc (0,0) = điểm neo (chân lính / giữa đáy công trình); i.* vẽ tuyệt đối 0..31.
 */
(function (root) {
  'use strict';
  const F = root.Fallback;
  if (!F || !F.extend || !F.lib) return;
  const L = F.lib;
  const { OL, TAU, SKIN, STEEL, WOOD, LEATH, GOLD, TAN, STONE, ROCK, LEAF, RED, GREEN, ORANGE, CLOTH, BONE, BOOT } = L;
  const { mix, lt, dk, al, tri, pal, RNG, h2, org, getOrg, px, rect, fillFn, ell, ring, poly, line, pline, rp, rpoly, rline } = L;
  const { ball, lump, sbox, sparkle, part, shadowE, legs, body, head, arm, slash, glow } = L;
  const { bricks, tiles, roofTri, roofTrap, cone, win, door, pennon, hang, target, rockP, tier, flame, fireAt, crate, barrel, coin, star } = L;

  // ================= Bảng màu =================
  const BRICK = tri('#c35b41', '#8c3b2e', '#e2835f', { v: '#b24f39', k: '#6a2d2a' });
  const SLATE = { m: '#5f6a7f', d: '#454e61', l: '#8592a8', s: '#525c70', dd: '#353c4c' };
  const GST = tri('#b9bcc4', '#878b97', '#dcdee4', { k: '#686c7a', v: '#a9adb7' });
  const CONC = tri('#bfc2c9', '#8d919c', '#dfe1e6', { k: '#787c88', v: '#b0b3bb' });
  const WHITE = tri('#eef0f4', '#c3c7d2', '#ffffff', { k: '#a9aebb' });
  const IRON = tri('#5b6070', '#3c404c', '#828a9c');
  const THATCH = tri('#d9b45a', '#a9812f', '#f2d98c', { k: '#7e5d26', s: '#c29a45' });
  const HIDE = tri('#c79e72', '#94694a', '#e4c49a', { k: '#6e4a32' });
  const MUD = tri('#b08a5f', '#7f5f3e', '#cfa77a');
  const OLV = tri('#6e7b46', '#4b5531', '#93a062', { k: '#3a4226' });
  const SAND = tri('#d8c08a', '#a88e5a', '#efdfb0', { k: '#82693f' });
  const GLS = tri('#5a8bd0', '#365b94', '#b4dcf6');
  const BRONZE = tri('#d39a4a', '#99652a', '#f2c67e');
  const DARK = tri('#454856', '#2c2e38', '#6a6e80');
  const KHAKI = tri('#b39a62', '#85703f', '#d3bd88');
  const HAZ = ['#f2c230', '#2b2b33'];
  const FIRE = '#ffb02e';
  const PB = pal('blue');
  const md = (a, m) => ((a % m) + m) % m;

  // ================= Tiện ích chung =================
  /** Tô hộp bằng hàm toạ độ cục bộ fn(i,j) -> màu. */
  const box = (x, y, w, h, fn) => fillFn(x, y, x + w - 1, y + h - 1, (X, Y) => fn(X - x, Y - y));
  /** Mép tối phải/dưới, sáng trái: tô màu nền c cho một khối. */
  const edge = (i, j, w, h, p, c) => (i >= w - 2 || j >= h - 1 ? p.d : i === 0 ? p.l : c);
  const brickW = (x, y, w, h, o) => bricks(x, y, w, h, Object.assign({ s: BRICK, bw: 6, bh: 3 }, o));
  const stoneW = (x, y, w, h, o) => bricks(x, y, w, h, Object.assign({ s: GST, bw: 7, bh: 4 }, o));
  /** Bê tông: tấm lớn có mạch, vệt bẩn. */
  function conc(x, y, w, h, o) {
    o = o || {}; const p = o.p || CONC, sv = o.sv || 12, sh = o.sh || 10;
    box(x, y, w, h, (i, j) => {
      if (i >= w - 2 || j >= h - 1) return p.d;
      if (i === 0 || j === 0) return p.l;
      if (i % sv === sv - 1 || j % sh === sh - 1) return p.k;
      return h2(md(i, 32) + x, j >> 2) < 0.1 ? p.v : p.m;
    });
  }
  /** Ván gỗ dọc (hoặc ngang). */
  function plank(x, y, w, h, p, horiz) {
    p = p || WOOD;
    box(x, y, w, h, (i, j) => {
      const a = horiz ? j : i, b = horiz ? i : j;
      if (i >= w - 1 || j >= h - 1) return p.d;
      return a % 4 === 3 ? p.d : h2(a >> 2, b + x) < 0.07 ? p.d : a % 4 === 0 ? p.l : p.m;
    });
  }
  /** Tường gỗ súc nằm ngang. */
  function logs(x, y, w, h) {
    box(x, y, w, h, (i, j) => {
      const r = j % 4;
      if (i === 0 || i === w - 1) return r === 3 ? WOOD.d : TAN.l;
      return r === 3 ? WOOD.d : r === 0 ? WOOD.l : i >= w - 3 ? WOOD.d : (i * 7 + (j >> 2) * 5) % 11 === 0 ? WOOD.d : WOOD.m;
    });
  }
  /** Mái rạ: hàm màu theo đỉnh (xa, ya). */
  const thatchFn = (ya, xa) => (x, y) => {
    const j = y - ya, r = Math.floor(j / 3), q = j - r * 3, n = h2(x + r * 5, r), sh = x >= xa;
    if (q === 2 && n < 0.55) return sh ? THATCH.k : THATCH.d;
    if (n < 0.12) return sh ? THATCH.k : THATCH.d;
    return sh ? (n > 0.8 ? THATCH.s : THATCH.d) : n > 0.86 ? THATCH.l : n > 0.5 ? THATCH.m : THATCH.s;
  };
  function thatch(pts, ya, xa) { polyFn(pts, thatchFn(ya, xa)); }
  const polyFn = poly;
  /** Tua rạ lởm chởm ở mép mái. */
  function fringe(x0, x1, y) { for (let x = x0; x <= x1; x++) { const n = h2(x, 91); rect(x, y, 1, 1 + (n * 3 | 0), n > 0.5 ? THATCH.d : THATCH.s); } }
  /** Cửa sổ kính hiện đại (vệt phản chiếu chéo). */
  function winG(x, y, w, h, fr) {
    box(x, y, w, h, (i, j) => {
      if (i === 0 || j === 0 || i === w - 1 || j === h - 1) return fr || '#2c3148';
      const d = md(i - j, 9);
      return d < 2 ? GLS.l : j > h - 3 || i > w - 3 ? GLS.d : GLS.m;
    });
  }
  /** Cửa sổ khung trắng chia ô (thời thuốc súng). */
  function winW(x, y, w, h) {
    win(x, y, w, h);
    rect(x + 1, y + (h >> 1), w - 2, 1, '#e8e2d4'); rect(x + (w >> 1), y + 1, 1, h - 2, '#e8e2d4');
  }
  /** Lưới cửa sổ. */
  function winGrid(x, y, cols, rows, w, h, gx, gy, fn) { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) (fn || winG)(x + c * (w + gx), y + r * (h + gy), w, h); }
  /** Ống khói gạch + khói. */
  function chimney(x, y, w, h, sm) {
    part(() => { brickW(x, y, w, h, { bw: 4 }); rect(x - 1, y - 2, w + 2, 3, DARK.m); rect(x - 1, y - 2, w + 2, 1, DARK.l); });
    if (sm) smoke(x + w / 2, y - 4, sm);
  }
  function smoke(x, y, k) {
    const S = tri('#d9dae0', '#a6a8b5', '#f4f4f7');
    for (let i = 0; i < (k | 0 || 3); i++) part(() => ball(x + i * 3, y - i * 6, 2.5 + i * 1.3, 2.3 + i * 1.1, S), null, 0.85 - i * 0.18);
  }
  /** Cờ chữ nhật trên cột thép. */
  function flagR(x, y, len, P) {
    part(() => {
      rect(x, y - len, 1, len, STEEL.d); ball(x + 0.5, y - len - 1, 1.3, 1.3, GOLD);
      box(x + 1, y - len + 1, 10, 7, (i, j) => (j === 2 || j === 3) && i > 1 ? P.l : md(i + (j > 3 ? 1 : 0), 10) > 7 ? P.d : P.m);
    });
  }
  function antenna(x, y, h) {
    part(() => { rect(x, y - h, 1, h, STEEL.d); for (let k = 4; k < h - 2; k += 5) rect(x - 2, y - k, 5, 1, STEEL.m); });
    ell(x + 0.5, y - h - 0.5, 1.5, 1.5, '#ff4a3a'); px(x, y - h - 1, '#ffd0c8');
  }
  function bag(cx, cy, rx, ry) { part(() => { ball(cx, cy, rx, ry, SAND); px(cx - rx + 1.5, cy, SAND.k); px(cx + rx - 1.5, cy, SAND.k); }); }
  /** Bao cát xếp hàng ngang: n hàng, đáy yb. */
  function bags(x0, x1, yb, rows) {
    for (let r = 0; r < rows; r++) for (let x = x0 + (r & 1) * 4; x <= x1; x += 8) bag(x, yb - 2 - r * 3, 4.5, 2.6);
  }
  const hazFn = (i, j) => HAZ[md(i + j, 6) < 3 ? 0 : 1];
  function camo(x, y, w, h, p) {
    p = p || OLV;
    box(x, y, w, h, (i, j) => {
      if (i >= w - 2 || j >= h - 1) return p.k;
      const n = h2((i + x) >> 2, (j + y) >> 2) * 0.6 + h2((i + x + 2) >> 3, (j + y + 1) >> 3) * 0.4;
      return n < 0.28 ? '#8a7448' : n > 0.72 ? p.d : i === 0 ? p.l : p.m;
    });
  }
  /** Tôn sóng dọc. */
  function corr(x, y, w, h, p) { box(x, y, w, h, (i, j) => (i >= w - 1 || j >= h - 1 ? p.d : j === 0 ? p.l : i % 3 === 2 ? p.d : i % 3 === 0 ? p.l : p.m)); }
  /** Mái bằng nhìn từ trên (mặt sân thượng + lan can sáng). */
  function flatTop(x, y, w, d, p) { box(x, y, w, d, (i, j) => (j === 0 || i === 0 || i === w - 1 ? p.l : j === d - 1 ? p.d : (i + j * 3) % 13 === 0 ? p.k || p.d : p.m)); }
  function trim(x, y, w, P) { rect(x, y, w, 2, P.m); rect(x, y, w, 1, P.l); }

  // chữ 3x5
  const GL = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', E: '111100110100111', H: '101101111101101', I: '111010010010111',
    K: '101101110101101', M: '101111111101101', N: '110101101101101', O: '010101101101010', R: '110101110101101', S: '011100010001110',
    T: '111010010010010', V: '101101101101010', X: '101101010101101', '!': '010010010000010', '+': '000010111010000',
  };
  function text(x, y, s, c) { for (let i = 0; i < s.length; i++) { const g = GL[s[i]]; if (g) for (let k = 0; k < 15; k++) if (g[k] === '1') px(x + i * 4 + k % 3, y + (k / 3 | 0), c); } }
  function redCross(cx, cy, r) { rect(cx - r, cy - 1, 2 * r + 1, 3, '#e23a3a'); rect(cx - 1, cy - r, 3, 2 * r + 1, '#e23a3a'); }

  // ================= Tường tự nối =================
  // Khung 32x48 nửa độ phân giải, gốc = giữa cạnh đáy; ô: x∈[-16,16), y∈[-32,0); tâm ô (0,-16).
  // Hoa văn lặp chu kỳ chia hết 32 nên các ô ghép liền mạch; mặt cắt dọc (N–S) không viền ở hai đầu.
  function blk(p, bw, bh, x, y) {
    const r = Math.floor(y / bh), xx = x + (r & 1) * (bw >> 1), k = md(xx, bw), j = md(y, bh);
    if (j === bh - 1 || k === bw - 1) return p.k;
    if (j === 0 && k < bw - 2) return p.l;
    return h2(md(Math.floor(xx / bw), 32 / bw), md(r, 8)) < 0.25 ? p.v : p.m;
  }
  /** Tường đặc: o = { H, ht, p, face(x,y), cap(x,j), capv(x,y), mer (lỗ châu mai), post(yb) }. */
  function solid(o) {
    const { H, ht, p } = o, yb = -16 + ht, yt = yb - H, yc = yt - 2 * ht;
    return {
      H, ht,
      ew(x0, x1) {
        rect(x0, yb, x1 - x0, 2, al(OL, 0.2));
        part(() => fillFn(x0, yc, x1 - 1, yb - 1, (x, y) => {
          if (y >= yb - 1) return p.d;
          if (o.mer && y >= yt - 4 && y < yt) { // răng cưa: khối 4 / khe 4
            const k = md(x, 8);
            if (k < 4) return y === yt - 4 ? OL : y === yt - 3 ? p.l : o.face(x, y);
            if (k === 4 || k === 7) return y > yt - 4 ? OL : o.cap(x, y - yc);
            return p.d;
          }
          return y < yt ? o.cap(x, y - yc) : o.face(x, y);
        }));
      },
      ns(y0, y1) {
        fillFn(-ht - 1, y0 - H, ht, y1 - H - 1, (x, y) => x === -ht - 1 || x === ht ? OL : o.capv(x, y));
      },
      post() { o.post(yb, H); },
    };
  }
  /** Khối trụ: mặt trên + mặt trước, kèm hàm tô. */
  function pillar(x0, x1, yf, yback, h, p, face, top) {
    rect(x0, yf, x1 - x0, 2, al(OL, 0.22));
    part(() => fillFn(x0, yback - h, x1 - 1, yf - 1, (x, y) => {
      const i = x - x0, w = x1 - x0;
      if (y < yf - h) return top ? top(i, y - (yback - h), w) : p.l;
      if (i >= w - 2 || y >= yf - 1) return p.d;
      return i === 0 ? p.l : face(x, y);
    }));
  }
  const WALL = {};
  WALL.stone = solid({
    H: 14, ht: 4, p: GST, mer: 1,
    face: (x, y) => blk(GST, 8, 4, x, y),
    cap: (x, j) => (j === 0 ? '#eceef2' : md(x, 8) === 7 ? GST.v : GST.l),
    capv: (x, y) => {
      const e = x < -1 || x > 0, k = md(y, 8);
      if (x === 3) return GST.d;
      if (e) return k === 0 ? OL : k < 3 ? '#eceef2' : k < 5 ? GST.m : k === 5 ? OL : GST.d;
      return md(y, 8) === 7 ? GST.v : GST.l;
    },
    post(yb, H) {
      pillar(-6, 6, -10, -21, H + 4, GST, (x, y) => blk(GST, 8, 4, x, y), (i, j, w) => {
        const c = (i < 3 || i >= w - 3);
        return j === 0 ? OL : c && j < 3 ? '#eceef2' : c && j < 5 ? GST.m : j === 5 && c ? OL : GST.d;
      });
    },
  });
  WALL.brick = solid({
    H: 13, ht: 3, p: BRICK,
    face: (x, y) => (y === -29 ? STONE.d : blk(BRICK, 8, 3, x, y)),
    cap: (x, j) => (j === 0 ? STONE.l : j === 5 ? STONE.d : md(x, 16) === 15 ? STONE.d : STONE.m),
    capv: (x, y) => (x === -3 ? BRICK.m : x === 2 ? BRICK.d : x === -2 ? STONE.l : md(y, 16) === 15 ? STONE.d : STONE.m),
    post() {
      pillar(-5, 5, -11, -20, 17, BRICK, (x, y) => (y >= -28 && y < -26 ? STONE.m : blk(BRICK, 8, 3, x, y)), (i, j, w) => (j === 0 || i === 0 ? STONE.l : i >= w - 1 ? STONE.d : STONE.m));
      part(() => poly([-4, -37, 4, -37, 0, -42], (x) => (x >= 0 ? STONE.d : STONE.l)));
    },
  });
  WALL.concrete = solid({
    H: 14, ht: 3, p: CONC,
    face: (x, y) => (y < -27 ? CONC.l : y >= -15 ? CONC.d : md(x, 16) === 15 ? CONC.k : h2(md(x, 32), 3) < 0.2 && y < -22 ? CONC.v : CONC.m),
    cap: (x, j) => (j === 0 ? CONC.l : md(x, 16) === 15 ? CONC.k : '#d0d3d9'),
    capv: (x, y) => (x === -3 ? CONC.l : x === 2 ? CONC.d : md(y, 16) === 15 ? CONC.k : '#d0d3d9'),
    post() {
      pillar(-6, 6, -10, -21, 18, CONC, (x, y) => (y >= -16 && y < -12 ? hazFn(x, y) : y < -26 ? CONC.l : CONC.m), (i, j, w) => (j === 0 || i === 0 ? CONC.l : i >= w - 1 || j === 10 ? CONC.d : '#d0d3d9'));
      ell(0, -33, 2, 1.5, '#ffe27a'); px(0, -34, '#ffffff');
    },
  });
  /** Cọc gỗ vót nhọn. */
  function stake(x, yb, h, w) {
    part(() => {
      box(x, yb - h, w, h, (i, j) => (i === 0 ? WOOD.l : i === w - 1 ? WOOD.d : (j * 3 + i + x) % 7 === 0 ? WOOD.d : WOOD.m));
      poly([x, yb - h, x + w, yb - h, x + w / 2, yb - h - 4], (X) => (X >= x + w / 2 ? TAN.d : TAN.l));
    });
  }
  const PH = [0, 2, 1, 3];
  WALL.palisade = {
    H: 15,
    ew(x0, x1) {
      rect(x0, -14, x1 - x0, 2, al(OL, 0.2));
      for (let x = x0; x < x1; x += 4) stake(x, -14, 15 - PH[md(x >> 2, 4)], 4);
      part(() => box(x0, -22, x1 - x0, 2, (i, j) => (md(i + x0, 4) === 1 ? TAN.l : j ? LEATH.d : LEATH.m)), null);
    },
    ns(y0, y1) { for (let y = y0 + 2; y < y1; y += 4) stake(-2, y, md(y >> 2, 2) ? 15 : 11, 5); },
    post() { rect(-4, -12, 9, 2, al(OL, 0.22)); stake(-4, -12, 20, 8); part(() => { rect(-4, -24, 8, 2, LEATH.m); rect(-4, -19, 8, 1, LEATH.d); }); },
  };
  function fpost(x, yb, h, w) { part(() => { box(x, yb - h, w, h, (i, j) => (j === 0 ? WOOD.l : i === w - 1 ? WOOD.d : i === 0 ? WOOD.l : WOOD.m)); }); }
  WALL.fence = {
    H: 10,
    ew(x0, x1) {
      rect(x0, -15, x1 - x0, 1, al(OL, 0.18));
      part(() => { box(x0, -24, x1 - x0, 2, (i, j) => (j ? WOOD.m : WOOD.l)); box(x0, -20, x1 - x0, 2, (i, j) => (j ? WOOD.d : WOOD.m)); });
      for (const x of [-8, 8]) if (x >= x0 && x < x1) fpost(x - 1, -15, 11, 3);
    },
    ns(y0, y1) {
      fillFn(-2, y0 - 8, 1, y1 - 3, (x) => (x === -2 || x === 1 ? OL : x === -1 ? WOOD.l : WOOD.d));
      for (const y of [-24, -8]) if (y >= y0 && y < y1) fpost(-1, y + 1, 11, 3);
    },
    post() { rect(-3, -15, 6, 2, al(OL, 0.2)); part(() => { box(-2, -27, 4, 13, (i, j) => (i === 3 ? WOOD.d : i === 0 ? WOOD.l : WOOD.m)); poly([-2, -27, 2, -27, 0, -29.5], WOOD.l); }); },
  };
  WALL.sandbag = {
    H: 8,
    ew(x0, x1) {
      const lo = x0 === -16 ? -20 : x0, hi = x1 === 16 ? 20 : x1;
      rect(x0, -12, x1 - x0, 2, al(OL, 0.2));
      for (let r = 0; r < 3; r++) for (let x = lo; x <= hi; x++) if (md(x, 8) === (r === 1 ? 0 : 4)) bag(x, -14 - r * 3, 4.5, 2.6);
    },
    ns(y0, y1) {
      const B = [];
      for (let y = y0; y < y1; y++) { if (md(y, 8) === 4) B.push([y, 0], [y, 2]); if (md(y, 8) === 0) B.push([y, 1]); }
      B.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      for (const [y, c] of B) bag(0, y - 2 - c * 3, 3.2, 3.6);
    },
    post() { rect(-8, -11, 16, 2, al(OL, 0.2)); bag(-4, -13, 4.5, 2.6); bag(4, -13, 4.5, 2.6); bag(0, -16, 4.5, 2.6); bag(-3, -19, 4, 2.4); bag(3, -19, 4, 2.4); bag(0, -22, 4, 2.4); },
  };
  const WIRE = '#4e5464', WIRE2 = '#b8bfcc';
  function picket(x, yb, h) { part(() => { rect(x, yb - h, 2, h, IRON.m); rect(x, yb - h, 1, h, IRON.l); rect(x - 1, yb - h, 4, 1, IRON.d); }); }
  WALL.barbed = {
    H: 8,
    ew(x0, x1) {
      const lo = x0 === -16 ? -18 : x0 + 2, hi = x1 === 16 ? 18 : x1 - 2;
      for (const x of [-8, 8]) if (x >= x0 && x < x1) { rect(x - 1, -15, 4, 1, al(OL, 0.2)); picket(x, -15, 11); }
      line(x0, -24, x1, -24, WIRE, 1);
      for (let x = lo; x <= hi; x++) if (md(x, 4) === 2) { ring(x, -19, 3.6, 4.6, 1, WIRE); px(x - 1, -23, WIRE2); px(x + 2, -17, WIRE2); }
      for (let x = x0; x < x1; x++) if (md(x, 6) === 3) { px(x, -25, WIRE); px(x, -23, WIRE); }
    },
    ns(y0, y1) {
      for (let y = y0; y < y1; y++) if (md(y, 4) === 2) { ring(0, y - 4, 4.6, 2.6, 1, WIRE); px(-3, y - 6, WIRE2); }
      for (const y of [-24, -8]) if (y >= y0 && y < y1) picket(-1, y + 1, 11);
    },
    post() { rect(-3, -15, 7, 1, al(OL, 0.2)); picket(-1, -15, 13); ring(0, -20, 4.6, 3, 1, WIRE); ring(0, -24, 4, 2.6, 1, WIRE); px(-3, -22, WIRE2); },
  };
  function wallTile(S, mask) {
    const n = mask & 1, e = mask & 2, s = mask & 4, w = mask & 8;
    if (mask === 5) { S.ns(-32, 0); return; }
    if (n) S.ns(-32, -16);
    if (e || w) S.ew(w ? -16 : 0, e ? 16 : 0);
    if (mask !== 10) { if (s) S.ns(-16, 0); S.post(); }
  }

  // ---------- Cổng ----------
  // h: cổng nhìn thẳng (tường chạy Đông–Tây), trụ sát mép khung để nối mọi kiểu tường.
  // v: tường chạy Bắc–Nam: trụ Bắc + trụ Nam, hai cánh mở quay về phía Đông (nhìn thẳng mặt).
  const GATE = {
    wood: {
      post(x0, x1, yf, yb, h) {
        rect(x0, yf, x1 - x0, 2, al(OL, 0.22)); stake(x0, yf, h, x1 - x0);
        part(() => { rect(x0, yf - h + 3, x1 - x0, 2, LEATH.m); rect(x0, yf - 7, x1 - x0, 2, LEATH.m); });
      },
      leaf(x, y, w, h) {
        part(() => {
          box(x, y, w, h, (i, j) => (j === 2 || j === h - 3 ? IRON.m : i === w - 1 ? WOOD.d : i % 3 === 2 ? WOOD.d : WOOD.m));
          line(x + 1, y + h - 4, x + w - 2, y + 3, WOOD.d, 1); px(x + w - 2, y + (h >> 1), GOLD.m);
        });
      },
      top(P) {
        part(() => { box(-13, -34, 26, 4, (i, j) => (j === 0 ? WOOD.l : j === 3 ? WOOD.d : WOOD.m)); ell(-13, -32, 1.5, 2, TAN.l); ell(12, -32, 1.5, 2, TAN.l); });
        hang(-3, -31, 6, 9, P);
      },
    },
    iron: {
      post(x0, x1, yf, yb, h) {
        pillar(x0, x1, yf, yb, h, GST, (x, y) => blk(GST, 8, 4, x, y), (i, j, w) => (j === 0 || i === 0 ? '#eceef2' : i >= w - 1 ? GST.d : GST.l));
        part(() => ball((x0 + x1) / 2, yb - h - 1, 2.2, 2, GST));
      },
      leaf(x, y, w, h) {
        part(() => {
          for (let i = 0; i < w; i += 3) { rect(x + i, y + 1, 1, h - 1, IRON.d); px(x + i, y, IRON.l); }
          rect(x, y + 3, w, 1, IRON.m); rect(x, y + h - 3, w, 1, IRON.m);
        }, OL, 0.85);
      },
      top(P) {
        part(() => { polyFn([-10, -30, 10, -30, 10, -33, 4, -36, -4, -36, -10, -33], (x, y) => (y < -34 ? GST.l : GST.m)); rect(-10, -31, 20, 1, GST.d); });
        part(() => { poly([-3, -40, 3, -40, 3, -35, 0, -32, -3, -35], (x) => (x < 0 ? P.m : P.s)); rect(-1, -39, 2, 5, P.l); px(0, -38, GOLD.l); });
      },
    },
    steel: {
      post(x0, x1, yf, yb, h) {
        pillar(x0, x1, yf, yb, h, CONC, (x, y) => (y >= yf - 6 && y < yf - 3 ? hazFn(x, y) : CONC.m), (i, j, w) => (j === 0 || i === 0 ? CONC.l : i >= w - 1 ? CONC.d : '#d0d3d9'));
        const cx = (x0 + x1) / 2; part(() => { rect(cx - 1, yb - h - 3, 3, 3, DARK.m); ell(cx + 0.5, yb - h - 4, 1.6, 1.4, '#ff9a2e'); }); px(cx, yb - h - 5, '#fff1a3');
      },
      leaf(x, y, w, h, P) {
        part(() => {
          box(x, y, w, h, (i, j) => (j === 0 ? STEEL.l : j >= h - 3 ? (md(i + j, 4) < 2 ? HAZ[0] : HAZ[1]) : i % 3 === 2 ? STEEL.d : STEEL.m));
          rect(x, y + 3, w, 2, P.m); rect(x, y + 3, w, 1, P.l);
        });
      },
      top(P) { part(() => { box(-10, -33, 20, 3, (i, j) => (j === 0 ? STEEL.l : md(i, 4) < 2 ? HAZ[0] : HAZ[1])); }); },
    },
  };
  function gate(st, dir) {
    const G = GATE[st], P = PB;
    if (dir === 'h') {
      rect(-9, -12, 18, 2, al(OL, 0.15));
      G.leaf(-9, -29, 9, 17, P); G.leaf(0, -29, 9, 17, P);
      G.top(P);
      G.post(-16, -9, -10, -20, 22); G.post(9, 16, -10, -20, 22);
      rect(-16, -32, 1, 22, al(OL, 0.55)); rect(15, -32, 1, 22, al(OL, 0.55));
    } else {
      ell(0, -16, 6, 10, al('#7a5a3a', 0.2));
      G.post(-5, 5, -26, -32, 15);
      G.leaf(5, -41, 9, 15, P);
      G.post(-5, 5, -1, -6, 14);
      G.leaf(5, -20, 9, 15, P);
    }
  }

  // ================= Đăng ký khoá =================
  const SPEC = {};
  function def(key, w, h, n, ax, ay, fn) { SPEC[key] = { size: [w, h], frames: n, ax, ay, still: n === 1, fn }; }
  const WSTY = ['fence', 'palisade', 'stone', 'brick', 'concrete', 'sandbag', 'barbed'];
  for (const s of WSTY) for (let m = 0; m < 16; m++) def(`w.${s}.${m}`, 64, 96, 1, 0.5, 1.0, () => wallTile(WALL[s], m));
  for (const s of ['wood', 'iron', 'steel']) for (const d of ['h', 'v']) def(`w.gate.${s}.${d}`, 64, 96, 1, 0.5, 1.0, () => gate(s, d));

  F.extend({
    entry: (key) => SPEC[key] || null,
    drawer: (key) => (SPEC[key] ? SPEC[key].fn : null),
    keys: () => Object.keys(SPEC),
  });
  root.ERAS_ART = { WALL_STYLES: WSTY, GATES: ['wood', 'iron', 'steel'] };
})(typeof window !== 'undefined' ? window : globalThis);
