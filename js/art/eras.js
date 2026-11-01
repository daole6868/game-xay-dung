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
  const { OL, TAU, SKIN, STEEL, WOOD, LEATH, GOLD, TAN, STONE, ROCK, LEAF, RED, GREEN, ORANGE, CLOTH, BONE, BOOT, GLASS, GLASS2 } = L;
  const { mix, lt, dk, al, tri, pal, RNG, h2, org, getOrg, px, rect, fillFn, ell, ring, poly, line, pline, rp, rpoly, rline } = L;
  const { ball, lump, sbox, sparkle, part, shadowE, legs, body, head, arm, slash, glow } = L;
  const { bricks, crenel, tiles, roofTri, roofTrap, cone, win, door, pennon, hang, rockP, flame, fireAt, crate, barrel, coin, sword, star } = L;

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
  function text(s, x, y, c) { for (let i = 0; i < s.length; i++) { const g = GL[s[i]]; if (g) for (let k = 0; k < 15; k++) if (g[k] === '1') px(x + i * 4 + k % 3, y + (k / 3 | 0), c); } }
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

  // ================= Chi tiết dùng chung cho công trình =================
  const POT = tri('#c96a3f', '#8f4228', '#e9946a');
  function pot(x, yb, r) { part(() => { ball(x, yb - r, r, r * 1.1, POT); rect(x - r * 0.45, yb - r * 2.2, r * 0.9 + 1, 2, POT.d); rect(x - r * 0.6, yb - r * 2.4, r * 1.2 + 1, 1, POT.l); rect(x - r + 1, yb - r, 2 * r - 1, 1, '#f2d7b0'); }); }
  function basket(x, yb, w, h, fill) {
    part(() => {
      if (fill) ball(x + w / 2 - 0.5, yb - h, w / 2 - 1, 2.5, fill);
      box(x, yb - h, w, h, (i, j) => (j === 0 ? TAN.l : (i + j) % 3 === 0 ? TAN.d : (i - j + 30) % 3 === 0 ? TAN.l : TAN.m));
    });
  }
  /** Cột vật tổ: mặt chồng nhau, cánh trên đỉnh. */
  function totemPole(x, yb, h, P, wide) {
    const hw = wide ? 6 : 4, C = [P.m, RED.m, GOLD.m];
    part(() => {
      box(x - hw, yb - h, 2 * hw + 1, h, (i, j) => (i === 0 ? WOOD.l : i >= 2 * hw - 1 ? WOOD.d : WOOD.m));
      for (let y = yb - h + 7, k = 0; y < yb - 8; y += wide ? 13 : 11, k++) {
        rect(x - hw, y, 2 * hw + 1, 2, C[k % 3]); rect(x - hw, y, 2 * hw + 1, 1, lt(C[k % 3], 0.3));
        rect(x - hw + 1, y + 3, hw - 1, 2, '#f5f0e0'); rect(x + 2, y + 3, hw - 1, 2, '#f5f0e0'); px(x - 2, y + 4, OL); px(x + hw - 1, y + 4, OL);
        rect(x, y + 3, 1, 4, WOOD.d); rect(x - hw + 2, y + 7, 2 * hw - 3, 2, k % 2 ? OL : '#7a2a2a'); rect(x - hw + 3, y + 7, 2 * hw - 5, 1, '#f5f0e0');
      }
    });
    part(() => {
      poly([x - hw, yb - h + 6, x - hw - 9, yb - h - 3, x - hw - 7, yb - h + 3, x - hw, yb - h + 9], (X, Y) => (Y < yb - h + 2 ? P.l : P.m));
      poly([x + hw + 1, yb - h + 6, x + hw + 10, yb - h - 3, x + hw + 8, yb - h + 3, x + hw + 1, yb - h + 9], (X, Y) => (Y < yb - h + 2 ? P.m : P.d));
      ball(x, yb - h - 1, hw, 3.5, WOOD); poly([x + 1, yb - h - 2, x + hw + 4, yb - h, x + 1, yb - h + 1], GOLD.m); px(x + 1, yb - h - 3, OL);
    });
  }
  function hut(cx, yb, rw, rh, P) { // nhà tròn mái rạ
    part(() => {
      fillFn(cx - rw, yb - rh, cx + rw - 1, yb - 1, (x, y) => {
        const u = (x + 0.5 - cx) / rw; if (y > yb - 4 + 3 * Math.sqrt(Math.max(0, 1 - u * u))) return 0;
        const j = y - yb + rh; if (u > 0.62) return MUD.d; if (u < -0.75) return MUD.l;
        return j % 5 === 4 || ((x + (j / 5 | 0) * 3) % 6 === 0 && j % 5 === 2) ? MUD.d : MUD.m;
      });
      fillFn(cx - 5, yb - rh + 8, cx + 4, yb - 2, (x, y) => { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - (yb - rh + 13)); return y < yb - rh + 13 && d > 5 ? 0 : x < cx - 1 ? HIDE.m : '#2a2230'; });
      line(cx - 1, yb - rh + 10, cx - 4, yb - 3, HIDE.d, 1);
    });
    const ya = yb - rh - rw * 1.6;
    part(() => {
      thatch([cx - rw - 7, yb - rh + 3, cx - rw + 1, yb - rh - rw * 0.7, cx - 8, ya + 4, cx, ya, cx + 8, ya + 4, cx + rw - 1, yb - rh - rw * 0.7, cx + rw + 7, yb - rh + 3], ya, cx + 3);
      fringe(cx - rw - 6, cx + rw + 6, yb - rh + 3);
    });
    part(() => { poly([cx - 3, ya + 1, cx + 3, ya + 1, cx, ya - 7], THATCH.m); rect(cx - 3, ya - 2, 6, 2, P.m); });
  }
  function hideRack(x, yb, P) {
    part(() => { rect(x, yb - 26, 2, 26, WOOD.d); rect(x + 16, yb - 26, 2, 26, WOOD.d); rect(x - 1, yb - 27, 20, 2, WOOD.m); });
    part(() => { poly([x + 3, yb - 24, x + 15, yb - 24, x + 16, yb - 15, x + 13, yb - 6, x + 5, yb - 6, x + 2, yb - 15], (X, Y) => (X > x + 12 ? HIDE.d : HIDE.m)); for (let k = 0; k < 4; k++) px(x + 6 + k * 2, yb - 18 + (k % 2) * 4, HIDE.k); });
    part(() => rect(x + 2, yb - 26, 14, 2, P.m));
  }
  function antlers(x, y) { part(() => { pline([x - 1, y, x - 5, y - 4, x - 8, y - 5], BONE, 1); line(x - 5, y - 4, x - 5, y - 8, BONE, 1); pline([x + 1, y, x + 5, y - 4, x + 8, y - 5], BONE, 1); line(x + 5, y - 4, x + 5, y - 8, BONE, 1); ball(x, y + 1, 2.2, 1.8, tri(BONE, '#c9bfa6', '#ffffff')); }); }
  function spearRack(x, yb) {
    part(() => { line(x, yb, x + 4, yb - 18, WOOD.d, 2); line(x + 9, yb, x + 5, yb - 18, WOOD.d, 2); rect(x - 1, yb - 9, 12, 2, WOOD.m); });
    for (let k = 0; k < 3; k++) part(() => { line(x + 1 + k * 3, yb - 1, x + 3 + k * 2, yb - 26, WOOD.l, 1); poly([x + 1.5 + k * 2, yb - 26, x + 4.5 + k * 2, yb - 26, x + 3 + k * 2, yb - 31], ROCK.m); });
  }
  function strawTarget(cx, cy, r, P) {
    part(() => { rect(cx - 1, cy, 2, -cy, WOOD.d); });
    part(() => { ball(cx, cy, r, r, THATCH); ring(cx, cy, r - 2, r - 2, 1, THATCH.d); ell(cx, cy, r * 0.45, r * 0.45, P.m); ell(cx, cy, r * 0.2 + 0.4, r * 0.2 + 0.4, '#f6efe0'); });
  }
  function javStuck(x, y, a, len) { part(() => { const t = rp(x, y, a); const B = t(-len, 0); line(B[0], B[1], x, y, WOOD.l, 1); rect(B[0] - 1, B[1] - 1, 2, 2, LEATH.d); }); }
  function bullseye(cx, cy, r, P) {
    part(() => { rect(cx - 5, cy + 2, 2, r + 4, WOOD.d); rect(cx + 3, cy + 2, 2, r + 4, WOOD.d); });
    part(() => { ell(cx, cy, r, r, '#f6efe0'); ring(cx, cy, r * 0.75, r * 0.75, 1.3, RED.m); ell(cx, cy, r * 0.4, r * 0.4, P.m); px(cx, cy, '#ffffff'); px(cx - 2, cy + 1, OL); px(cx + 2, cy - 3, OL); });
  }
  function cannonTop(x, y, a) { // nòng pháo nhìn ngang
    part(() => { rpoly(x, y, a, [-3, -3.5, 16, -2.5, 16, 2.5, -3, 3.5], (u, v) => (v < -1 ? IRON.l : v > 1.5 ? IRON.d : IRON.m)); rpoly(x, y, a, [15, -3.5, 18, -3.5, 18, 3.5, 15, 3.5], IRON.d); ball(x - 3, y, 3, 3, IRON); });
  }
  function keg(x, y) { part(() => { box(x, y, 8, 10, (i, j) => (j === 2 || j === 7 ? IRON.d : i >= 6 ? dk(WOOD.d, 0.2) : i === 0 ? WOOD.m : WOOD.d)); ell(x + 4, y, 4, 1.5, TAN.m); rect(x + 2, y + 4, 4, 2, OL); }); }
  function warnSign(x, yb, h) {
    part(() => rect(x - 1, yb - h, 2, h, WOOD.d));
    part(() => { poly([x - 6, yb - h + 1, x + 6, yb - h + 1, x, yb - h - 10], '#f2c230'); rect(x, yb - h - 6, 1, 3, OL); px(x, yb - h - 2, OL); });
  }
  function container(x, y, w, h, p) {
    part(() => {
      box(x, y - 4, w, 4, (i, j) => (j === 0 ? lt(p.l, 0.3) : i === 0 || i === w - 1 ? p.d : p.l));
      box(x, y, w, h, (i, j) => (i < 2 || i >= w - 2 || j === 0 || j >= h - 2 ? p.d : i % 3 === 0 ? p.d : i % 3 === 1 ? p.l : p.m));
      for (const dx of [w - 6, w - 4]) rect(x + dx, y + 2, 1, h - 4, '#c9ccd4');
    });
  }
  function cylinder(cx, yb, r, h, p, band) { // trụ tôn (silo), mái nón
    part(() => {
      fillFn(cx - r, yb - h, cx + r - 1, yb - 1, (x, y) => {
        const u = (x + 0.5 - cx) / r; if (y > yb - 3 + 2 * Math.sqrt(Math.max(0, 1 - u * u))) return 0;
        const rib = (y - yb) % 3 === 0;
        if (band && y >= yb - h + band && y < yb - h + band + 3) return u > 0.5 ? band === 0 ? 0 : PB.d : PB.m;
        return u > 0.55 ? (rib ? p.k || p.d : p.d) : u < -0.6 ? p.l : rib ? p.d : p.m;
      });
      poly([cx - r - 1, yb - h + 1, cx - 3, yb - h - r * 0.55, cx + 3, yb - h - r * 0.55, cx + r + 1, yb - h + 1], (x) => (x > cx + 2 ? p.d : x < cx - r * 0.5 ? p.l : p.m));
      rect(cx - 2, yb - h - r * 0.55 - 2, 4, 2, p.d);
    });
  }
  /** Lưới thép (chân tháp): hai cột + giằng chéo. */
  function lattice(x0, x1, yb, yt, p) {
    p = p || STEEL;
    part(() => {
      rect(x0, yt, 2, yb - yt, p.d); rect(x1 - 2, yt, 2, yb - yt, p.d);
      for (let y = yt; y < yb - 4; y += 10) { line(x0 + 1, y, x1 - 2, y + 10, p.m, 1); line(x1 - 2, y, x0 + 1, y + 10, p.m, 1); rect(x0, y, x1 - x0, 1, p.d); }
    });
  }
  function dirtFire(x, yb) {
    for (const [dx, dy] of [[-6, 0], [-3, -2], [2, -2], [5, 0], [0, 1]]) part(() => ball(x + dx, yb + dy, 2.2, 1.8, ROCK));
    fireAt(x, yb - 1, 0.6, 2, 8);
  }
  const APT = tri('#e8ddca', '#b9ab92', '#f7f0e3', { k: '#a3967e', v: '#ddd2bf' });

  // ================= Vỏ công trình theo thời đại =================
  const SK = {};
  // ---------- a: đồ đá / đồng ----------
  SK.a = {
    castle(P) {
      shadowE(0, -3, 76, 6);
      totemPole(-68, -2, 60, P); totemPole(68, -2, 60, P);
      part(() => {
        logs(-54, -40, 108, 39);
        fillFn(-9, -30, 8, -1, (x, y) => { const d = Math.hypot(x + 0.5, y + 0.5 + 21); return y < -21 && d > 9 ? 0 : y < -21 && d > 8 ? OL : x < -2 ? HIDE.m : x < -1 ? HIDE.d : '#2a2230'; });
      });
      hang(-40, -38, 8, 15, P); hang(32, -38, 8, 15, P);
      part(() => { thatch([-66, -34, -50, -84, 50, -84, 66, -34], -84, 48); fringe(-64, 64, -34); rect(-50, -86, 100, 3, THATCH.d); rect(-50, -86, 100, 1, THATCH.m); });
      for (const x of [-30, 0, 30]) part(() => { rect(x - 1, -86, 3, 2, P.m); polyFn([x - 1, -84, x + 2, -84, x + 2, -74, x + 0.5, -76, x - 1, -74], P.m); });
      for (const x of [-50, 50]) part(() => { line(x, -84, x - 6, -97, WOOD.d, 2); line(x, -84, x + 6, -97, WOOD.d, 2); });
      antlers(0, -33);
      dirtFire(-30, -3); smoke(18, -94, 2);
    },
    house(P) { shadowE(0, -3, 26, 4); hut(0, -1, 20, 30, P); part(() => { rect(-26, -14, 2, 13, WOOD.d); }); pot(23, -1, 3); basket(-30, -1, 7, 5, tri('#e8c35a', '#b68a2e', '#fff1a3')); },
    storage(P) {
      shadowE(0, -3, 28, 4);
      part(() => { for (const x of [-13, -4, 5, 12]) rect(x, -26, 2, 25, WOOD.d); });
      part(() => box(-15, -38, 30, 13, (i, j) => (i === 0 ? MUD.l : i >= 28 ? MUD.d : j % 4 === 3 ? MUD.d : MUD.m)));
      part(() => { thatch([-20, -36, -2, -55, 2, -55, 20, -36], -55, 1); fringe(-19, 19, -36); rect(-2, -57, 4, 3, P.m); });
      part(() => { ell(-10, -8, 12, 5, GST.d); ell(-10, -9, 11, 4, GST.m); ell(-10, -9, 9, 3, '#e8c35a'); for (let k = 0; k < 7; k++) px(-17 + k * 2, -9 + (k % 3) - 1, '#b68a2e'); });
      pot(14, -1, 4); pot(22, -2, 3); basket(-28, -1, 8, 6, tri('#c94a3a', '#8f2a26', '#ee8a6e'));
    },
    tower(P) {
      shadowE(0, -3, 22, 4);
      part(() => { for (const x of [-17, 14]) box(x, -84, 4, 83, (i) => (i === 0 ? WOOD.l : i === 3 ? WOOD.d : WOOD.m)); });
      part(() => { for (let y = -78; y < -10; y += 22) { line(-14, y, 14, y + 20, WOOD.d, 2); line(14, y, -14, y + 20, WOOD.d, 2); } });
      part(() => { rect(-5, -82, 1, 81, WOOD.d); rect(3, -82, 1, 81, WOOD.d); for (let y = -78; y < 0; y += 5) rect(-5, y, 9, 1, WOOD.m); });
      part(() => { for (let x = -21; x <= 19; x += 4) rect(x, -96, 2, 12, WOOD.m); rect(-22, -97, 44, 2, WOOD.l); rect(-21, -98, 2, 14, WOOD.d); rect(19, -98, 2, 14, WOOD.d); });
      part(() => plank(-23, -86, 46, 5, WOOD, 1));
      hang(-19, -82, 7, 14, P);
      part(() => { thatch([-26, -96, -3, -114, 3, -114, 26, -96], -114, 2); fringe(-25, 25, -96); });
      pennon(-1, -113, 6, P);
    },
    barracks(P) {
      shadowE(0, -3, 44, 5);
      spearRack(-46, -1); spearRack(36, -1);
      part(() => { logs(-32, -42, 64, 41); fillFn(-8, -28, 7, -1, (x, y) => (y === -28 || x === -8 || x === 7 ? OL : x < -1 ? HIDE.m : '#2a2230')); });
      part(() => { thatch([-42, -36, -4, -98, 4, -98, 42, -36], -98, 0); fringe(-41, 41, -36); });
      part(() => { poly([-20, -40, 0, -76, 20, -40], (x, y) => (md(y, 4) === 3 ? WOOD.d : x > 6 ? WOOD.d : WOOD.m)); });
      part(() => { ball(0, -54, 6, 6, P); ball(0, -54, 3, 3, BRONZE); });
      for (const x of [-22, 22]) part(() => { ball(x, -22, 6, 6, WOOD); ell(x, -22, 4, 4, P.m); ell(x - 1, -23, 1.5, 1.5, P.l); px(x, -22, BRONZE.m); });
      part(() => { pline([-1, -96, -6, -102, -9, -110], BONE, 2); pline([1, -96, 6, -102, 9, -110], BONE, 2); });
    },
    archery(P) {
      shadowE(-22, -3, 22, 4, 0.22);
      part(() => box(-38, -40, 32, 39, (i, j) => (j < 3 ? '#3a2e2a' : '#4b3b31')), null);
      part(() => { line(-34, -2, -26, -22, WOOD.d, 2); line(-18, -2, -26, -22, WOOD.d, 2); rect(-34, -12, 17, 2, WOOD.m); });
      for (let k = 0; k < 3; k++) part(() => { line(-33 + k * 6, -2, -27 + k * 6, -32, WOOD.l, 1); poly([-28.5 + k * 6, -32, -25.5 + k * 6, -32, -26.5 + k * 6, -36], ROCK.l); });
      part(() => { rect(-42, -44, 3, 43, WOOD.d); rect(-6, -44, 3, 43, WOOD.d); });
      part(() => thatch([-42, -54, -6, -54, -3, -40, -45, -40], -54, 99)); fringe(-44, -4, -40);
      hang(-28, -40, 7, 9, P);
      strawTarget(12, -24, 9, P); strawTarget(36, -18, 7, P);
      javStuck(11, -25, 0.25, 13); javStuck(35, -17, 0.15, 11); javStuck(25, -2, 1.1, 13); javStuck(45, -3, 0.9, 11);
      pennon(22, -2, 40, P);
    },
    workshop(P) {
      shadowE(0, -3, 28, 4);
      part(() => logs(-24, -46, 48, 45));
      part(() => box(-22, -34, 44, 33, (i, j) => (j < 3 ? '#3a2e2a' : '#4b3b31')), null);
      part(() => { rect(-26, -40, 3, 39, WOOD.d); rect(23, -40, 3, 39, WOOD.d); });
      part(() => thatch([-29, -52, 29, -52, 31, -38, -31, -38], -52, 99)); fringe(-30, 30, -38);
      hang(-6, -38, 8, 9, P);
      part(() => { plank(-16, -14, 30, 4, WOOD, 1); rect(-14, -10, 2, 9, WOOD.d); rect(10, -10, 2, 9, WOOD.d); });
      part(() => { rockP(-9, -17, 4, 3, ROCK, 3); rockP(-2, -16, 3, 2, ROCK, 4); line(4, -16, 10, -19, WOOD.m, 1); poly([9, -21, 12, -19, 10, -17], GST.m); });
      part(() => { lump(18, -3, 3, ROCK); lump(22, -3, 2.5, GST); lump(20, -6, 2.5, ROCK); });
    },
    mill(P) {
      shadowE(0, -3, 26, 4);
      part(() => { line(-24, -1, -2, -62, WOOD.d, 3); line(24, -1, 2, -62, WOOD.d, 3); rect(-15, -34, 30, 3, WOOD.m); });
      part(() => { thatch([-22, -48, -2, -70, 2, -70, 22, -48], -70, 1); fringe(-21, 21, -48); rect(-2, -72, 4, 3, P.m); });
      part(() => { ell(0, -9, 17, 5.5, GST.d); box(-17, -9, 34, 5, (i) => (i < 3 ? GST.l : i > 30 ? GST.d : GST.m)); ell(0, -10, 16, 4.5, GST.l); ell(0, -10, 14, 3.5, '#f3ecd9'); });
      part(() => { ell(0, -15, 11, 4, GST.d); box(-11, -15, 22, 4, (i) => (i < 2 ? GST.l : i > 19 ? GST.d : GST.m)); ell(0, -16, 10, 3.2, GST.l); ell(0, -16, 2, 1, OL); });
      part(() => { rect(-1, -30, 2, 14, WOOD.m); line(0, -24, 26, -28, WOOD.l, 2); });
      part(() => { ball(-22, -6, 5, 5, CLOTH); rect(-24, -12, 4, 2, TAN.d); });
      for (let k = 0; k < 6; k++) px(-12 + k * 5, -5 + (k % 2), '#ffffff');
    },
    market(P) {
      shadowE(0, -3, 44, 4, 0.18);
      part(() => { rect(-42, -44, 2, 43, WOOD.d); rect(-6, -44, 2, 43, WOOD.d); });
      part(() => poly([-46, -46, -2, -46, 0, -36, -48, -36], (x, y) => (y > -39 ? HIDE.d : (x + y) % 9 === 0 ? HIDE.k : HIDE.m)));
      part(() => box(-38, -16, 34, 14, (i, j) => (j === 0 || j === 13 ? P.d : md(i, 6) < 3 ? P.m : (j % 4 === 1 ? '#f2e6c8' : P.l))));
      part(() => box(4, -18, 40, 15, (i, j) => (j === 0 || j === 14 ? '#8a4a2a' : md(i + j, 8) < 4 ? '#c46a3e' : '#e2a45e')));
      pot(-32, -8, 4); pot(-24, -9, 3); pot(-17, -8, 4);
      basket(-12, -6, 7, 5, tri('#c94a3a', '#8f2a26', '#ee8a6e'));
      part(() => { poly([8, -14, 18, -15, 21, -9, 17, -5, 9, -6, 6, -10], (x) => (x > 15 ? HIDE.d : HIDE.m)); for (let k = 0; k < 3; k++) px(11 + k * 3, -10, HIDE.k); });
      part(() => { ball(30, -10, 6, 4, tri('#7a5a44', '#54392a', '#9c7a5e')); ball(38, -8, 4, 3, tri('#d8d2c4', '#a8a090', '#f4f0e8')); });
      part(() => { lump(26, -15, 2.5, tri('#e9c35a', '#b68a2e', '#fff1a3')); lump(30, -16, 2.5, tri('#e9c35a', '#b68a2e', '#fff1a3')); });
      pennon(40, -24, 22, P);
    },
    monastery(P) {
      shadowE(0, -4, 46, 8, 0.2);
      ell(0, -16, 40, 11, al('#7a5a3a', 0.25));
      const S = tri('#a7abb8', '#767b8c', '#cdd1da', { k: '#5f6475' });
      const stone = (x, yb, w, h, paint) => part(() => {
        polyFn([x - w, yb, x - w + 1, yb - h + 3, x - w + 3, yb - h, x + w - 3, yb - h, x + w, yb - h + 4, x + w, yb], (X, Y) => (X >= x + w - 2 ? S.d : X <= x - w + 1 ? S.l : h2(X, Y >> 1) < 0.08 ? S.k : S.m));
        if (paint) { pline([x - 2, yb - h * 0.6, x, yb - h * 0.7, x + 1, yb - h * 0.55, x - 1, yb - h * 0.5], P.l, 1); }
        px(x - w + 2, yb - 3, GREEN.d); px(x - w + 3, yb - 2, GREEN.m);
      });
      for (const [a, h] of [[3.5, 30], [4.1, 34], [5.3, 34], [5.9, 30]]) stone(Math.round(Math.cos(a) * 38), Math.round(-18 + Math.sin(a) * 11), 4, h, 1);
      part(() => { polyFn([-16, -26, -8, -26, -8, -84, -16, -84], (x) => (x >= -10 ? S.d : x === -16 ? S.l : S.m)); polyFn([8, -26, 16, -26, 16, -84, 8, -84], (x) => (x >= 14 ? S.d : x === 8 ? S.l : S.m)); });
      part(() => { box(-20, -92, 40, 9, (i, j) => (j === 0 ? S.l : j >= 7 ? S.d : S.m)); pline([-8, -88, -4, -89, 0, -87, 4, -89, 8, -88], P.l, 1); });
      part(() => { box(-10, -14, 20, 5, (i, j) => (j === 0 ? S.l : j === 4 ? S.d : S.m)); rect(-8, -9, 4, 7, S.d); rect(4, -9, 4, 7, S.d); });
      part(() => { flame(0, -15, 4, 12, 1, P.m); flame(0, -15, 2.5, 8, 2, P.l); }, P.dd);
      ell(0, -20, 9, 7, al(P.l, 0.18));
      for (const [a, h] of [[0.3, 28], [0.95, 32], [2.2, 32], [2.85, 28]]) stone(Math.round(Math.cos(a) * 40), Math.round(-16 + Math.sin(a) * 12), 5, h, 0);
    },
  };

  // ---------- g: thuốc súng / công nghiệp ----------
  SK.g = {
    castle(P) {
      shadowE(0, -3, 78, 6);
      part(() => { brickW(-12, -100, 24, 32); ell(0, -88, 5, 5, OL); ell(0, -88, 4, 4, '#f6f2e6'); line(0, -88, 0, -91, OL, 1); line(0, -88, 2, -87, OL, 1); });
      part(() => poly([-15, -98, 0, -112, 14, -98], tiles(SLATE, -112, 0)));
      flagR(0, -111, 9, P);
      part(() => { brickW(-46, -70, 92, 40); for (const x of [-38, -26, 18, 30]) winW(x, -64, 7, 10); for (const x of [-38, -26, -4, 18, 30]) winW(x, -46, 7, 9); });
      part(() => roofTrap(-50, 49, -68, -84, 10, SLATE));
      for (const x of [-30, 30]) part(() => { win(x - 3, -80, 6, 7); rect(x - 4, -81, 8, 1, SLATE.d); });
      rect(-50, -70, 100, 2, P.m);
      part(() => { brickW(-62, -32, 124, 31); box(-64, -36, 128, 5, (i, j) => (j === 0 ? STONE.l : j === 4 ? STONE.d : STONE.m)); });
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? -78 : 50;
        part(() => { polyFn([x0, -1, x0 + 28, -1, x0 + 26, -40, x0 + 2, -40], (x, y) => (h2(x >> 1, y) < 0.02 ? BRICK.v : blk(BRICK, 6, 3, x, y))); box(x0, -44, 28, 5, (i, j) => (j === 0 ? STONE.l : j === 4 ? STONE.d : STONE.m)); });
        cannonTop(x0 + 14, -48, s < 0 ? -2.9 : -0.25);
        part(() => { rect(x0 + 6, -52, 3, 4, IRON.d); rect(x0 + 19, -52, 3, 4, IRON.d); });
      }
      for (const x of [-36, 28]) part(() => { rect(x, -24, 8, 7, OL); rect(x + 1, -23, 6, 5, '#2a2a3d'); ball(x + 4, -20, 2, 2, IRON); }, null);
      part(() => { fillFn(-11, -28, 10, -1, (x, y) => { const d = Math.hypot(x + 0.5, y + 0.5 + 17); return y < -17 && d > 11 ? 0 : (y < -17 && d > 10) || x === -11 || x === 10 ? OL : x === 0 || x === -1 ? P.d : (x + 11) % 4 === 0 ? P.d : P.m; }); });
      hang(-22, -30, 7, 13, P); hang(15, -30, 7, 13, P);
    },
    house(P) {
      shadowE(0, -3, 24, 4);
      chimney(9, -78, 6, 16, 2);
      part(() => {
        brickW(-20, -58, 40, 57); rect(-20, -40, 40, 2, STONE.l);
        door(-5, -19, 10, 18, { m: P.m, d: P.d }); rect(-7, -2, 14, 2, STONE.m); rect(-6, -21, 12, 2, STONE.l);
        for (const [x, y] of [[-15, -52], [8, -52], [-15, -34], [8, -34]]) { winW(x, y, 7, 10); rect(x - 2, y, 2, 10, P.m); rect(x + 7, y, 2, 10, P.m); }
      });
      part(() => roofTri(-24, 23, -56, 0, -84, SLATE));
      part(() => { box(-4, -73, 8, 9, (i, j) => (j === 0 ? SLATE.l : i === 0 || i === 7 ? SLATE.d : j > 1 ? 0 : SLATE.m)); win(-3, -71, 6, 7); });
      rect(-24, -57, 48, 2, P.m);
    },
    storage(P) {
      shadowE(0, -3, 30, 4);
      part(() => {
        brickW(-28, -38, 56, 37); rect(-28, -26, 56, 1, STONE.d);
        box(-10, -27, 20, 26, (i, j) => (i === 0 || i === 19 || j === 0 ? OL : i === 10 ? P.d : Math.abs((i % 10) - j * 10 / 26 * 1) < 1 || Math.abs((i % 10) - (10 - j * 10 / 26)) < 1 ? P.d : i % 3 === 2 ? P.d : P.m));
        winW(-23, -32, 7, 7); winW(16, -32, 7, 7);
      });
      part(() => roofTri(-32, 31, -36, 0, -56, SLATE));
      part(() => { win(-3, -49, 6, 8); rect(-1, -56, 2, 5, WOOD.d); rect(-1, -56, 8, 2, WOOD.d); line(6, -54, 6, -44, '#d9c7a0', 1); });
      crate(-31, -11, 9); barrel(22, -11); crate(21, -19, 8);
    },
    tower(P) {
      shadowE(0, -3, 22, 5);
      part(() => {
        brickW(-17, -94, 34, 93);
        for (let y = -94; y < -2; y += 6) { const w = (y / 6) & 1 ? 4 : 6; rect(-17, y, w, 3, STONE.l); rect(17 - w, y, w, 3, STONE.m); }
        for (const [x, y] of [[-1, -78], [-9, -56], [7, -56], [-1, -38]]) { rect(x, y, 2, 8, OL); rect(x - 1, y + 3, 4, 2, OL); }
        door(-5, -18, 10, 17);
      });
      part(() => { brickW(-21, -104, 42, 10); for (let x = -19; x < 20; x += 6) poly([x, -94, x + 4, -94, x + 2, -91], STONE.d); crenel(-21, -110, 42, GST); });
      flagR(0, -110, 10, P);
      hang(-12, -91, 7, 13, P);
    },
    barracks(P) {
      shadowE(0, -3, 46, 5);
      for (const x of [-30, 26]) part(() => brickW(x, -82, 6, 14, { bw: 4 }));
      part(() => {
        brickW(-42, -60, 84, 59); rect(-42, -32, 84, 2, STONE.l);
        for (const x of [-37, -26, 19, 30]) { winW(x, -54, 7, 10); winW(x, -26, 7, 10); }
        winW(-4, -54, 8, 10); door(-8, -22, 16, 21, { m: P.m, d: P.d }); rect(-10, -2, 20, 2, STONE.m);
      });
      part(() => roofTrap(-46, 45, -58, -78, 10, SLATE));
      part(() => { poly([-12, -24, 0, -32, 12, -24], (x, y) => (y > -26 ? STONE.d : STONE.l)); ball(0, -27, 2, 2, P); });
      part(() => { for (let k = 0; k < 3; k++) line(-18 + k * 2, -2, -16, -17, WOOD.d, 1); line(-15, -17, -16, -22, STEEL.l, 1); line(-17, -17, -18, -22, STEEL.l, 1); });
      flagR(-1, -76, 34, P);
    },
    archery(P) {
      shadowE(-22, -3, 26, 4, 0.22);
      part(() => { brickW(-46, -40, 6, 39, { bw: 4 }); brickW(-10, -40, 6, 39, { bw: 4 }); box(-40, -38, 30, 37, (i, j) => (j < 3 ? '#2c2a3a' : '#3d394a')); });
      part(() => { plank(-40, -14, 30, 3, WOOD, 1); rect(-38, -11, 2, 10, WOOD.d); rect(-14, -11, 2, 10, WOOD.d); });
      part(() => roofTrap(-50, -1, -38, -54, 6, SLATE)); rect(-50, -39, 49, 2, P.m);
      for (let x = 2; x < 47; x += 8) bag(x, -3, 4.5, 2.6);
      bullseye(16, -28, 7, P); bullseye(36, -24, 6, P);
      flagR(-26, -53, 10, P);
    },
    workshop(P) {
      shadowE(0, -3, 28, 4);
      chimney(12, -80, 7, 24, 2);
      part(() => {
        brickW(-24, -50, 48, 49);
        fillFn(-19, -42, -4, -22, (x, y) => { const d = Math.hypot(x + 11.5, y + 0.5 + 34); if (y < -34 && d > 8) return 0; if ((y < -34 && d > 7) || x === -19 || x === -4 || y === -22) return OL; return x === -12 || y === -30 ? '#e8e2d4' : (x + y) % 5 === 0 ? GLASS2 : GLASS; });
        rect(-20, -21, 17, 1, STONE.l); door(4, -24, 14, 23, { m: P.m, d: P.d });
      });
      part(() => roofTri(-28, 27, -48, 0, -74, SLATE));
      part(() => { ball(11, -33, 5, 5, P); ell(11, -33, 2, 2, P.l); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; rect(11 + Math.cos(a) * 5.5 - 1, -33 + Math.sin(a) * 5.5 - 1, 2, 2, P.m); } });
      part(() => { poly([-32, -9, -20, -9, -22, -6, -28, -6], IRON.m); rect(-27, -6, 4, 5, IRON.d); rect(-30, -2, 10, 1, IRON.d); });
    },
    mill(P) {
      shadowE(2, -3, 26, 4);
      chimney(-27, -80, 5, 34, 2);
      part(() => { brickW(-20, -56, 42, 55); for (const x of [-15, 8]) winW(x, -48, 7, 10); door(-5, -20, 10, 19, { m: P.m, d: P.d }); winW(8, -30, 7, 9); });
      part(() => roofTri(-24, 25, -54, 1, -76, SLATE)); rect(-24, -55, 49, 2, P.m);
      part(() => { ring(20, -18, 11, 11, 2, IRON.d); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; line(20, -18, 20 + Math.cos(a) * 9, -18 + Math.sin(a) * 9, IRON.m, 1); } ball(20, -18, 2.5, 2.5, IRON); });
      line(9, -30, 20, -29, '#3a3030', 1);
      part(() => { ball(-22, -5, 5, 4, CLOTH); ball(-14, -4, 4, 3.5, CLOTH); rect(-24, -10, 4, 2, TAN.d); });
    },
    market(P) {
      shadowE(0, -3, 46, 4);
      part(() => {
        brickW(-44, -40, 88, 39);
        for (const x of [-38, -17, 4, 25]) fillFn(x, -34, x + 13, -1, (X, Y) => { const d = Math.hypot(X + 0.5 - x - 7, Y + 0.5 + 27); return Y < -27 && d > 7 ? 0 : Y < -27 && d > 6 ? OL : X === x || X === x + 13 ? OL : Y > -9 ? '#4a3a30' : '#2c2a3a'; });
      });
      for (const [x, c] of [[-31, RED], [-10, GREEN], [11, ORANGE], [32, tri('#e9c35a', '#b68a2e', '#fff1a3')]]) part(() => { sbox(x - 6, -10, 12, 6, WOOD); lump(x - 3, -11, 2.5, c); lump(x + 2, -11, 2.5, c); lump(x, -13, 2.5, c); });
      part(() => roofTrap(-48, 47, -38, -62, 12, SLATE));
      part(() => fillFn(-46, -40, 45, -35, (x, y) => { const k = md(x + 46, 8), c = Math.floor((x + 46) / 8) % 2 ? '#f6efe0' : P.m; return y - -40 <= 3 - Math.abs(k - 3.5) * 0.5 + 1 ? c : 0; }));
      part(() => { box(-5, -69, 10, 9, (i, j) => (i === 0 ? STONE.l : i >= 8 ? STONE.d : j % 4 === 3 ? OL : STONE.m)); poly([-7, -68, 0, -75, 6, -68], tiles(SLATE, -75, 0)); });
    },
    monastery(P) {
      shadowE(0, -3, 44, 5);
      part(() => { brickW(-40, -62, 80, 61); for (const x of [-34, -24, 18, 28]) { win(x, -50, 6, 16); rect(x + 1, -42, 4, 1, '#e8e2d4'); } });
      part(() => roofTrap(-44, 43, -60, -84, 12, SLATE));
      part(() => {
        brickW(-14, -114, 28, 113); rect(-14, -86, 28, 2, STONE.l); rect(-14, -60, 28, 2, STONE.l);
        door(-6, -27, 12, 26, { m: P.m, d: P.d }); ell(0, -46, 6, 6, OL); ell(0, -46, 5, 5, P.m); ell(0, -46, 2, 2, GOLD.m); rect(-5, -47, 10, 1, P.d); rect(-1, -51, 1, 10, P.d);
        fillFn(-7, -106, 6, -90, (x, y) => { const d = Math.hypot(x + 0.5, y + 0.5 + 99); return y < -99 && d > 7 ? 0 : x === -7 || x === 6 || (y < -99 && d > 6) ? OL : '#2a2a3d'; });
      });
      part(() => { ball(0, -95, 4.5, 4.5, GOLD); rect(-1, -101, 2, 3, GOLD.d); rect(-5, -92, 10, 1, GOLD.d); });
      part(() => cone(-17, 17, -112, 0, -144, SLATE));
      part(() => { rect(-1, -152, 2, 9, GOLD.d); rect(-3, -149, 6, 2, GOLD.d); });
      ell(0, -76, 4, 4, OL); ell(0, -76, 3, 3, '#f6f2e6'); line(0, -76, 0, -78, OL, 1); px(1, -76, OL);
    },
  };

  // ---------- m: hiện đại ----------
  const ROOF = tri('#9a9ea8', '#6f737e', '#c3c6ce', { k: '#7d818c' });
  SK.m = {
    castle(P) {
      shadowE(0, -3, 78, 6);
      part(() => { conc(-76, -44, 52, 43); for (let x = -72; x < -28; x += 10) { winG(x, -38, 8, 7); winG(x, -24, 8, 7); } });
      part(() => flatTop(-78, -60, 56, 16, ROOF));
      part(() => { ell(-50, -52, 13, 6, '#4f535f'); ring(-50, -52, 11, 5, 1, '#f2c230'); text('H', -51, -54, '#ffffff'); }, null);
      part(() => { conc(24, -52, 52, 51); for (let x = 28; x < 72; x += 10) for (const y of [-46, -32, -18]) winG(x, y, 8, 7); });
      part(() => flatTop(22, -62, 56, 10, ROOF));
      part(() => { sbox(30, -66, 9, 6, STEEL); sbox(44, -66, 9, 6, STEEL); rect(32, -64, 5, 1, STEEL.d); rect(46, -64, 5, 1, STEEL.d); });
      part(() => {
        conc(-26, -94, 52, 93);
        box(-21, -88, 42, 66, (i, j) => (i % 7 === 6 || j % 9 === 8 ? '#2c3148' : md(i - j, 11) < 2 ? GLS.l : i > 36 ? GLS.d : GLS.m));
        box(-9, -18, 18, 17, (i, j) => (i === 0 || i === 17 || j === 0 || i === 9 ? '#2c3148' : md(i - j, 7) < 2 ? GLS.l : GLS.m));
        trim(-26, -97, 52, P);
      });
      part(() => { box(-15, -22, 30, 4, (i, j) => (j === 0 ? P.l : j === 3 ? P.d : P.m)); rect(-13, -18, 2, 4, STEEL.d); rect(11, -18, 2, 4, STEEL.d); });
      part(() => flatTop(-28, -104, 56, 8, ROOF));
      part(() => { ball(-14, -108, 5, 3, WHITE); rect(-15, -106, 2, 3, STEEL.d); line(-14, -108, -10, -112, STEEL.d, 1); });
      antenna(14, -104, 18);
      flagR(-36, -2, 30, P);
      rect(-78, -45, 54, 2, P.m); rect(22, -53, 56, 2, P.m);
    },
    house(P) {
      shadowE(0, -3, 26, 4);
      part(() => {
        conc(-22, -76, 44, 75, { p: APT, sv: 44, sh: 16 });
        for (let r = 0; r < 4; r++) for (const x of [-17, -4, 9]) { winG(x, -70 + r * 16, 8, 8); if (r < 3) { rect(x - 1, -61 + r * 16, 10, 1, P.d); rect(x - 1, -62 + r * 16, 10, 1, P.m); } }
        box(-5, -14, 10, 13, (i, j) => (i === 0 || i === 9 || j === 0 ? '#2c3148' : i === 5 ? '#2c3148' : md(i - j, 6) < 2 ? GLS.l : GLS.m));
      });
      part(() => { box(-8, -17, 16, 3, (i, j) => (j === 0 ? P.l : P.m)); });
      part(() => flatTop(-24, -86, 48, 10, ROOF));
      part(() => { cylinder(12, -82, 4, 6, WHITE); sbox(-14, -88, 8, 6, STEEL); });
    },
    storage(P) {
      shadowE(0, -3, 30, 4);
      container(-29, -17, 28, 16, P);
      container(1, -17, 28, 16, tri('#c8543c', '#8f3328', '#e8805e'));
      container(-21, -37, 40, 16, tri('#5e9a8a', '#3d6b60', '#86c0ae'));
      part(() => { sbox(22, -42, 7, 5, WOOD); }, OL);
    },
    tower(P) {
      shadowE(0, -3, 22, 4);
      part(() => { line(-18, -1, -12, -72, STEEL.d, 2); line(17, -1, 11, -72, STEEL.d, 2); });
      part(() => { for (let y = -70; y < -6; y += 16) { const w0 = 12 + (y + 72) / 72 * 6; line(-w0, y, w0, y + 16, STEEL.m, 1); line(w0, y, -w0, y + 16, STEEL.m, 1); rect(-w0, y, 2 * w0, 1, STEEL.d); } });
      part(() => { rect(-2, -74, 1, 73, STEEL.d); rect(2, -74, 1, 73, STEEL.d); for (let y = -70; y < 0; y += 4) rect(-2, y, 5, 1, STEEL.m); });
      part(() => { box(-17, -94, 34, 22, (i, j) => (j >= 18 ? DARK.m : i === 0 ? CONC.l : i >= 32 ? CONC.d : CONC.m)); winG(-14, -90, 13, 8); winG(1, -90, 13, 8); rect(-17, -78, 34, 2, P.m); rect(-17, -78, 34, 1, P.l); });
      part(() => flatTop(-20, -100, 40, 6, ROOF));
      part(() => { box(3, -107, 8, 7, (i, j) => (i === 7 ? DARK.d : j === 0 ? DARK.l : DARK.m)); rect(5, -100, 4, 2, DARK.d); ell(11, -103.5, 1.5, 2.5, '#fff7c0'); });
      poly([12, -106, 31, -112, 31, -94, 12, -101], al('#fff7c0', 0.28));
      antenna(-13, -100, 16);
    },
    barracks(P) {
      shadowE(0, -3, 46, 5);
      const arch = (cy, ry, rx, fn) => fillFn(-rx, cy - ry, rx - 1, cy - 1, (x, y) => (((x + 0.5) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 ? fn(x, y) : 0));
      part(() => arch(-14, 66, 42, (x, y) => (md(x, 6) === 0 ? OLV.k : OLV.d)));
      part(() => {
        arch(-1, 58, 44, (x, y) => { const n = h2(x >> 2, y >> 2) * 0.6 + h2((x + 2) >> 3, (y + 1) >> 3) * 0.4; return n < 0.28 ? '#8a7448' : n > 0.72 ? OLV.d : x < -36 ? OLV.l : x > 36 ? OLV.d : OLV.m; });
        box(-24, -42, 48, 41, (i, j) => (i < 2 || i >= 46 || j < 2 ? hazFn(i, j) : j % 5 === 4 ? STEEL.d : i > 40 ? STEEL.d : STEEL.m));
      });
      part(() => { box(-10, -56, 20, 7, (i, j) => (j === 0 ? P.l : P.m)); text('BASE', -7, -55, '#ffffff'); });
      for (const s of [-1, 1]) for (let r = 0; r < 2; r++) for (let k = 0; k < 2; k++) bag(s * (34 + k * 8 - r * 4), -3 - r * 3, 4.5, 2.6);
      flagR(40, -2, 44, P);
    },
    archery(P) {
      shadowE(0, -3, 46, 5, 0.2);
      part(() => { conc(-44, -50, 88, 26); flatTop(-44, -54, 88, 4, ROOF); });
      for (const x of [-30, -10, 10, 30]) part(() => { rect(x - 1, -30, 2, 6, DARK.d); ball(x, -39, 4.5, 4.5, DARK); rect(x - 5, -36, 10, 8, DARK.m); ring(x, -35, 3, 3, 1, '#ffffff'); px(x, -35, '#ff4a3a'); });
      for (let x = -44; x <= 44; x += 8) bag(x, -22, 4.5, 2.6);
      part(() => { conc(-42, -12, 84, 11); for (let x = -30; x < 40; x += 20) rect(x, -20, 3, 9, CONC.d); rect(-42, -13, 84, 2, P.m); });
      flagR(-46, -12, 28, P);
    },
    workshop(P) {
      shadowE(0, -3, 28, 4);
      part(() => {
        corr(-26, -52, 52, 51, tri('#c3c8d0', '#8d939e', '#e3e7ec'));
        trim(-26, -52, 52, P);
        box(-14, -32, 22, 31, (i, j) => (i < 2 || i >= 20 ? hazFn(i, j) : j % 3 === 2 ? STEEL.d : STEEL.m));
        box(13, -22, 8, 21, (i, j) => (i === 0 || i === 7 || j === 0 ? '#2c3148' : STEEL.m)); winG(13, -36, 9, 7);
      });
      part(() => flatTop(-28, -60, 56, 8, ROOF));
      for (const x of [-18, -6]) part(() => { rect(x - 2, -64, 5, 4, STEEL.d); ball(x + 0.5, -65, 3.5, 2.5, STEEL); for (let k = -2; k <= 2; k += 2) px(x + k, -65, STEEL.d); });
      part(() => { rect(14, -76, 6, 18, STEEL.m); rect(14, -76, 1, 18, STEEL.l); rect(13, -77, 8, 2, DARK.m); });
      smoke(17, -80, 2);
    },
    mill(P) {
      shadowE(0, -3, 28, 4);
      lattice(20, 28, -1, -82);
      part(() => { box(17, -89, 14, 7, (i, j) => (j === 0 ? STEEL.l : i >= 12 ? STEEL.d : STEEL.m)); line(17, -88, 2, -72, STEEL.d, 2); line(17, -86, -14, -66, STEEL.d, 2); });
      cylinder(-14, -1, 12, 54, tri('#cfd3da', '#959ba6', '#eef0f3'), 10);
      cylinder(9, -1, 10, 46, tri('#cfd3da', '#959ba6', '#eef0f3'), 8);
      part(() => { box(-30, -9, 10, 8, (i, j) => (j === 0 ? STEEL.l : STEEL.m)); });
    },
    market(P) {
      shadowE(0, -3, 46, 4);
      part(() => {
        box(-44, -44, 88, 43, (i, j) => (i >= 86 || j >= 42 ? APT.d : i === 0 ? APT.l : j === 0 ? APT.l : APT.m));
        box(-34, -32, 68, 31, (i, j) => (i % 11 === 0 || j === 0 || j === 30 ? '#2c3148' : md(i - j, 13) < 2 ? GLS.l : GLS.m));
        box(-6, -22, 12, 21, (i, j) => (i === 0 || i === 11 || i === 6 || j === 0 ? '#5c6070' : md(i - j, 7) < 2 ? GLS.l : '#7aa6dc'));
      });
      part(() => fillFn(-36, -36, 35, -33, (x, y) => (Math.floor((x + 36) / 6) % 2 ? '#f6efe0' : P.m)));
      part(() => flatTop(-46, -52, 92, 8, ROOF));
      part(() => { box(-26, -64, 52, 12, (i, j) => (j === 0 ? P.l : j >= 10 ? P.d : P.m)); text('MARKET', -11, -61, '#ffffff'); rect(-20, -52, 2, 2, STEEL.d); rect(18, -52, 2, 2, STEEL.d); });
      part(() => { pline([38, -12, 40, -4, 46, -4, 47, -11, 38, -11], STEEL.m, 1); px(40, -2, OL); px(45, -2, OL); }, OL);
    },
    monastery(P) {
      shadowE(0, -3, 46, 5);
      part(() => { conc(-46, -54, 34, 53, { p: WHITE, sv: 34, sh: 14 }); for (let r = 0; r < 3; r++) for (const x of [-42, -31, -22]) winG(x, -48 + r * 14, 7, 7); });
      part(() => flatTop(-48, -62, 38, 8, ROOF));
      part(() => {
        conc(-14, -122, 58, 121, { p: WHITE, sv: 58, sh: 14 });
        for (let r = 0; r < 6; r++) for (const x of [-9, 3, 15, 27]) winG(x, -94 + r * 14, 8, 8);
        box(4, -16, 22, 15, (i, j) => (i === 0 || i === 21 || j === 0 || i === 11 ? '#2c3148' : md(i - j, 7) < 2 ? GLS.l : GLS.m));
      });
      part(() => flatTop(-16, -130, 62, 8, ROOF));
      part(() => { ell(15, -110, 9, 9, '#ffffff'); ring(15, -110, 9, 9, 1, '#e23a3a'); redCross(15, -110, 6); });
      part(() => { box(0, -21, 30, 5, (i, j) => (j === 0 ? P.l : j === 4 ? P.d : P.m)); redCross(15, -19, 1); rect(1, -16, 2, 6, STEEL.d); rect(27, -16, 2, 6, STEEL.d); });
      rect(-14, -101, 58, 2, P.m);
    },
  };

  // ================= Công trình mới (e.<tên>) =================
  const UB = {
    hunter(P) {
      shadowE(0, -3, 28, 4);
      hideRack(-30, -1, P);
      part(() => { logs(-10, -36, 38, 35); box(4, -24, 10, 23, (i, j) => (i === 0 || i === 9 || j === 0 ? OL : i < 5 ? HIDE.m : '#2a2230')); });
      part(() => { thatch([-15, -33, 7, -60, 33, -33], -60, 8); fringe(-14, 31, -33); });
      antlers(9, -30);
      part(() => { ball(-4, -8, 4, 3, tri('#7a5a44', '#54392a', '#9c7a5e')); px(-6, -9, '#9c7a5e'); });
      part(() => { rect(20, -24, 2, 10, LEATH.d); ball(21, -12, 3, 4, tri('#b0805a', '#7a5638', '#d4a47c')); });
    },
    totem(P) { shadowE(0, -2, 9, 2.5); totemPole(0, -1, 48, P, 1); },
    powdermill(P) {
      shadowE(0, -3, 28, 4);
      part(() => { stoneW(-24, -44, 48, 43); door(-6, -22, 12, 21, { m: P.m, d: P.d }); rect(-17, -34, 6, 5, OL); for (let k = 0; k < 3; k++) rect(-16 + k * 2, -34, 1, 5, IRON.m); });
      part(() => roofTrap(-28, 27, -42, -60, 8, tri('#8a6a4a', '#5e4430', '#ad8a64', { s: '#755a3e', dd: '#4a3424' })));
      part(() => { rect(-2, -58, 4, 8, SLATE.d); });
      keg(12, -11); keg(20, -11); keg(16, -20);
      warnSign(-22, -1, 14);
      flagR(-1, -60, 10, P);
    },
    cannontower(P) {
      shadowE(0, -3, 24, 5);
      part(() => { bricks(-20, -62, 40, 61, { s: BRICK, round: 1, bw: 6, bh: 3 }); door(-5, -18, 10, 17); for (const y of [-48, -32]) { rect(-1, y, 2, 7, OL); rect(-2, y + 3, 4, 1, OL); } });
      part(() => { box(-23, -68, 46, 7, (i, j) => (j === 0 ? STONE.l : j === 6 ? STONE.d : STONE.m)); });
      part(() => { rect(-12, -74, 4, 6, WOOD.d); ball(-4, -72, 4, 4, WOOD); ell(-4, -72, 1.5, 1.5, WOOD.d); });
      cannonTop(-2, -76, -0.2);
      part(() => { for (const x of [-23, 13]) box(x, -73, 10, 5, (i, j) => (j === 0 ? STONE.l : STONE.m)); });
      flagR(-17, -73, 16, P);
    },
    blastfurnace(P) {
      shadowE(0, -3, 30, 5);
      part(() => { line(-30, -1, -10, -82, IRON.d, 2); line(-24, -1, -6, -78, IRON.d, 1); for (let k = 1; k < 8; k++) { const t = k / 8; line(-30 + 20 * t, -1 - 81 * t, -24 + 18 * t, -1 - 77 * t, IRON.m, 1); } });
      part(() => { cylinder(24, -1, 6, 62, tri('#9a6a5a', '#6a443a', '#be8a76')); });
      part(() => {
        polyFn([-18, -1, 17, -1, 12, -80, -13, -80], (x, y) => { const e = 17 - (y + 1) / -79 * 5; if (md(y, 14) < 2) return y % 2 ? IRON.d : IRON.m; return x > e - 4 ? BRICK.d : x < -e + 3 ? BRICK.l : blk(BRICK, 6, 3, x, y); });
        box(-14, -88, 28, 9, (i, j) => (j === 0 ? IRON.l : i >= 26 ? IRON.d : IRON.m));
        fillFn(-8, -22, 7, -2, (x, y) => { const d = Math.hypot(x + 0.5, y + 0.5 + 14); return y < -14 && d > 8 ? 0 : (y < -14 && d > 7) || x === -8 || x === 7 ? OL : y > -6 ? '#fff3a0' : d < 4 ? '#ffd84a' : FIRE; });
      });
      ell(0, -10, 14, 10, al(FIRE, 0.22));
      part(() => { rect(-2, -2, 18, 2, '#ff8a2e'); rect(-1, -2, 16, 1, '#fff3a0'); }, '#7a2a1a');
      for (let k = 0; k < 6; k++) px(-6 + k * 3, -90 - (k % 3) * 2, k % 2 ? '#ffd84a' : FIRE);
      smoke(2, -93, 2);
      rect(-13, -60, 26, 2, P.m);
      flagR(-12, -88, 10, P);
    },
    factory(P) {
      shadowE(0, -3, 46, 5);
      chimney(-34, -88, 8, 36, 2); chimney(22, -84, 8, 32, 2);
      part(() => {
        brickW(-44, -52, 88, 51);
        for (let x = -40; x < 40; x += 10) { if (x > -10 && x < 0) continue; win(x, -44, 7, 14); rect(x + 1, -38, 5, 1, '#e8e2d4'); }
        door(-8, -24, 16, 23, { m: P.m, d: P.d }); rect(-44, -28, 88, 2, STONE.l);
      });
      for (let k = 0; k < 4; k++) {
        const x = -46 + k * 23;
        part(() => { poly([x, -52, x, -69, x + 23, -52], tiles(SLATE, -69, 999)); box(x, -68, 4, 16, (i, j) => (i === 3 ? SLATE.d : md(j - i, 5) === 0 ? GLS.l : GLS.m)); });
      }
      part(() => { box(-12, -55, 24, 9, (i, j) => (j === 0 ? P.l : j === 8 ? P.d : P.m)); text('IRON', -7, -53, '#ffffff'); });
    },
    bank(P) {
      shadowE(0, -3, 28, 4);
      part(() => { for (let k = 0; k < 3; k++) box(-28 + k * 2, -6 + k * 2 - 1, 56 - k * 4, 2, (i, j) => (j === 0 ? STONE.l : STONE.d)); });
      part(() => { bricks(-24, -50, 48, 44, { s: STONE, bw: 12, bh: 6 }); box(-5, -26, 10, 20, (i, j) => (i === 0 || i === 9 || j === 0 ? OL : i === 5 ? P.d : P.m)); });
      for (const x of [-22, -12, 7, 17]) part(() => { box(x, -50, 5, 44, (i, j) => (j < 2 || j >= 42 ? STONE.l : i === 0 ? '#fffaf0' : i === 4 ? STONE.d : i === 2 ? STONE.v : STONE.m)); });
      part(() => { box(-27, -57, 54, 7, (i, j) => (j === 0 ? '#fffaf0' : j === 6 ? STONE.d : STONE.m)); text('BANK', -8, -56, OL); });
      part(() => { poly([-28, -57, 0, -74, 27, -57], (x, y) => (y > -59 ? STONE.d : x > 4 ? STONE.v : STONE.l)); });
      coin(0, -63, 4);
      hang(-11, -48, 6, 12, P); hang(6, -48, 6, 12, P);
    },
    oilwell(P, f, n) {
      const ph = f / n * TAU, a = 0.22 * Math.sin(ph);
      shadowE(0, -3, 30, 4);
      part(() => { box(-30, -7, 60, 6, (i, j) => (j === 0 ? CONC.l : j >= 4 ? CONC.d : CONC.m)); });
      cylinder(-22, -6, 7, 18, WHITE, 6);
      part(() => { rect(18, -18, 4, 12, STEEL.d); rect(16, -14, 8, 2, RED.m); rect(17, -20, 6, 2, STEEL.m); });
      part(() => { line(-6, -7, 0, -40, IRON.d, 2); line(6, -7, 0, -40, IRON.d, 2); rect(-4, -24, 8, 1, IRON.d); });
      const cx = -14, cy = -15, ca = ph, cw = [cx + Math.cos(ca) * 6, cy + Math.sin(ca) * 6];
      part(() => { box(-18, -20, 8, 13, (i, j) => (i === 0 ? STEEL.l : i >= 6 ? STEEL.d : STEEL.m)); });
      const T = rp(0, -42, a), B0 = T(-19, 0);
      part(() => { line(cw[0], cw[1], B0[0], B0[1], DARK.m, 2); });
      part(() => { rpoly(cx, cy, ca, [-2, -2.5, 8, -3.5, 8, 3.5, -2, 2.5], DARK.m); ball(cw[0], cw[1], 3.5, 3.5, DARK); });
      part(() => {
        rpoly(0, -42, a, [-21, -2, 19, -2, 19, 2, -21, 2], (u, v) => (v < -0.5 ? P.l : P.m));
        rpoly(0, -42, a, [17, -4, 22, -5, 25, -1, 24, 9, 21, 9, 21, 1, 17, 2], (u, v) => (u > 22 ? P.d : P.m));
        ball(0, -42, 2.2, 2.2, STEEL);
      });
      const H = T(22.5, 9); line(H[0], H[1], 20, -20, '#3a3030', 1);
    },
    bunker(P) {
      shadowE(0, -3, 30, 4);
      part(() => { poly([-28, -24, -22, -34, 22, -34, 28, -24], (x, y) => (y < -32 ? CONC.l : x > 18 ? CONC.d : '#cfd2d8')); conc(-28, -24, 56, 23, { sv: 14, sh: 30 }); rect(-16, -18, 32, 4, OL); rect(-15, -17, 30, 2, '#16161f'); });
      part(() => { rect(6, -17, 12, 2, DARK.m); rect(16, -18, 3, 4, DARK.d); });
      for (let r = 0; r < 2; r++) for (let x = -28 + r * 4; x <= 28; x += 8) if (Math.abs(x) > 6 || r) bag(x, -3 - r * 3, 4.5, 2.6);
      flagR(18, -34, 12, P);
      part(() => { line(-14, -34, -18, -46, DARK.m, 1); }, null);
    },
    artillery(P) {
      shadowE(0, -3, 30, 5, 0.22);
      for (let k = 0; k <= 8; k++) { const a = Math.PI + k / 8 * Math.PI; bag(Math.round(Math.cos(a) * 24), Math.round(-14 + Math.sin(a) * 10), 4.5, 2.6); }
      part(() => { sbox(-20, -16, 8, 6, OLV); sbox(-20, -22, 8, 6, OLV); rect(-18, -19, 4, 1, GOLD.m); });
      part(() => { line(-2, -10, -14, -3, OLV.d, 2); line(2, -10, -8, -2, OLV.d, 2); });
      part(() => { rpoly(2, -18, -0.5, [-6, -2.5, 26, -1.8, 26, 1.8, -6, 2.5], (u, v) => (v < -0.5 ? OLV.l : OLV.m)); rpoly(2, -18, -0.5, [24, -2.6, 29, -2.6, 29, 2.6, 24, 2.6], OLV.d); rpoly(2, -18, -0.5, [14, -2, 16, -2, 16, 2, 14, 2], P.m); });
      part(() => { box(-5, -26, 11, 13, (i, j) => (i === 0 ? OLV.l : i >= 9 ? OLV.d : OLV.m)); });
      part(() => { ell(0, -8, 5, 5, DARK.d); ell(0, -8, 3, 3, DARK.l); px(0, -8, DARK.d); });
      for (let k = 1; k < 8; k++) { const a = k / 8 * Math.PI; bag(Math.round(Math.cos(a) * 26), Math.round(-12 + Math.sin(a) * 10), 4.5, 2.6); }
    },
    missile(P) {
      shadowE(0, -3, 28, 4);
      part(() => { flatTop(-28, -14, 56, 8, ROOF); box(-28, -6, 56, 5, (i, j) => (j < 2 ? hazFn(i, j) : CONC.d)); });
      part(() => { lattice(-12, -4, -10, -76, IRON); });
      const A = -Math.PI / 2 + 0.12;
      part(() => {
        rpoly(2, -12, A, [0, -4, 60, -4, 60, 4, 0, 4], (u, v) => (v > 2 ? WHITE.d : v < -2 ? WHITE.l : WHITE.m));
        rpoly(2, -12, A, [60, -4, 70, 0, 60, 4], (u, v) => (v > 1 ? RED.d : RED.m));
        rpoly(2, -12, A, [38, -4, 44, -4, 44, 4, 38, 4], (u, v) => (v > 2 ? P.d : P.m));
        rpoly(2, -12, A, [0, -8, 10, -4, 10, 4, 0, 8], (u, v) => (v > 0 ? DARK.d : DARK.m));
      });
      part(() => { rect(-8, -50, 8, 2, IRON.d); rect(-8, -30, 8, 2, IRON.d); });
      part(() => { sbox(16, -24, 10, 10, OLV); ell(21, -21, 1.5, 1.5, '#7dff6a'); });
    },
    radar(P, f, n) {
      const th = f / n * TAU, c = Math.cos(th), s = Math.sin(th);
      shadowE(0, -3, 28, 4);
      part(() => { conc(-28, -26, 34, 25); box(-22, -16, 8, 15, (i, j) => (i === 0 || i === 7 || j === 0 ? '#2c3148' : STEEL.m)); winG(-11, -20, 12, 6); rect(-28, -26, 34, 2, P.m); });
      part(() => flatTop(-30, -34, 38, 8, ROOF));
      part(() => antenna(-22, -34, 12));
      lattice(10, 22, -1, -60);
      part(() => { rect(13, -66, 6, 6, DARK.m); }, OL);
      const cx = 16, cy = -74, rx = 1.5 + 12 * Math.abs(c), F = [cx + s * 9, cy + 1];
      const feed = () => part(() => { line(cx, cy - 8, F[0], F[1], DARK.l, 1); line(cx, cy + 8, F[0], F[1], DARK.l, 1); ball(F[0], F[1], 1.8, 1.8, DARK); });
      if (c <= 0) feed();
      part(() => {
        rect(cx - 1, cy + 9, 3, 4, DARK.m);
        fillFn(cx - rx - 1, cy - 10, cx + rx, cy + 10, (x, y) => {
          const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / 9.5, d = u * u + v * v; if (d > 1) return 0;
          if (c >= 0) return d > 0.78 ? WHITE.d : d < 0.12 ? WHITE.d : (u + 0.25) ** 2 + (v + 0.3) ** 2 < 0.2 ? WHITE.l : WHITE.m;
          return (Math.abs(v) < 0.08 || Math.abs(u) < 0.1) ? STEEL.d : v > 0.3 ? STEEL.d : STEEL.m;
        });
      });
      if (c > 0) feed();
      ell(cx, cy - 13, 1.2, 1.2, '#ff4a3a');
    },
    powerplant(P) {
      shadowE(0, -3, 46, 6);
      const CT = tri('#d4d6dc', '#9fa3ad', '#eceef2', { k: '#8a8e98' });
      part(() => fillFn(-48, -84, 4, -1, (x, y) => {
        const t = (-y) / 84, w = 24 - 38 * t + 30 * t * t, u = (x + 0.5 + 22) / w; if (Math.abs(u) > 1) return 0;
        if (y < -81) return u > 0.4 ? CT.d : CT.l;
        if (md(y, 12) === 0) return CT.k;
        return u > 0.55 ? CT.d : u < -0.65 ? CT.l : CT.m;
      }));
      part(() => { ell(-22, -83, 14.5, 3, '#4f535f'); ring(-22, -83, 15, 3.5, 1, CT.l); });
      const STM = tri('#ffffff', '#d2d8e2', '#ffffff');
      part(() => { lump(-26, -94, 9, STM); lump(-16, -98, 8, STM); lump(-22, -106, 9, STM); lump(-12, -112, 7, STM); }, '#9aa3b2', 0.92);
      part(() => { box(36, -102, 7, 101, (i, j) => (md(j, 20) < 10 ? (i >= 5 ? RED.d : RED.m) : i >= 5 ? WHITE.d : WHITE.m)); });
      part(() => { conc(2, -50, 44, 49); for (let x = 6; x < 40; x += 9) winG(x, -42, 7, 9); rect(2, -50, 44, 2, P.m); box(14, -22, 12, 21, (i, j) => (j % 3 === 2 ? STEEL.d : STEEL.m)); });
      part(() => flatTop(0, -58, 48, 8, ROOF));
      part(() => { sbox(-46, -12, 14, 11, tri('#7d8594', '#565d6b', '#a4abb8')); for (let k = 0; k < 4; k++) rect(-45 + k * 3, -10, 1, 7, '#565d6b'); for (let k = 0; k < 3; k++) { rect(-44 + k * 4, -16, 2, 4, '#e8e2d4'); px(-44 + k * 4, -14, '#a07a52'); } });
      smoke(39, -106, 2);
    },
    tankfactory(P) {
      shadowE(0, -3, 46, 5);
      part(() => brickW(30, -96, 8, 40, { bw: 4 }));
      part(() => {
        corr(-46, -66, 92, 65, tri('#9aa38a', '#6e7660', '#bec6ad'));
        box(-30, -52, 60, 51, (i, j) => (i < 2 || i >= 58 || j < 2 ? hazFn(i, j) : j < 22 ? (j % 3 === 2 ? STEEL.d : STEEL.m) : '#262833'));
        trim(-46, -66, 92, P);
      });
      part(() => {
        box(-22, -14, 44, 10, (i, j) => (md(i + j, 4) < 2 ? DARK.m : DARK.d));
        poly([-20, -14, -16, -20, 14, -20, 22, -14], (x, y) => (y < -18 ? OLV.l : OLV.m)); rect(-14, -18, 24, 2, P.m);
        poly([-8, -20, -6, -26, 6, -26, 9, -20], OLV.m); rect(-3, -3, 1, 1, OL);
      });
      part(() => { rect(8, -25, 6, 2, OLV.d); });
      part(() => flatTop(-48, -76, 96, 10, ROOF));
      part(() => { rect(-40, -82, 2, 6, STEEL.d); rect(38, -82, 2, 6, STEEL.d); rect(-40, -84, 80, 3, '#f2c230'); for (let x = -40; x < 40; x += 4) px(x, -83, HAZ[1]); });
      part(() => { box(-14, -76, 28, 9, (i, j) => (j === 0 ? P.l : P.m)); text('TANK', -7, -74, '#ffffff'); });
      smoke(34, -99, 1);
    },
  };

  // ================= Thiên nhiên theo vùng =================
  const CACT = tri('#5fa04a', '#3b6d35', '#8bc766', { k: '#2c552c' });
  const LEAF2 = tri('#56b04c', '#2f7a3c', '#8ad46c', { k: '#245a32' });
  const PINE = tri('#2f7a5e', '#1f5548', '#4f9f74', { k: '#173f3b' });
  const SNOW = tri('#f2f7fb', '#c6d6e6', '#ffffff', { k: '#9fb3c8' });
  const DEAD = tri('#8b7a69', '#5d5045', '#ae9c88');
  const SANDST = tri('#d9a066', '#a86f3f', '#f0c58e', { k: '#8a5530' });
  /** Thân trụ bo tròn (xương rồng): đoạn thẳng đứng/ngang bán kính r, có gân dọc. */
  function capsule(x0, y0, x1, y1, r, p) {
    fillFn(Math.min(x0, x1) - r - 1, Math.min(y0, y1) - r - 1, Math.max(x0, x1) + r, Math.max(y0, y1) + r, (x, y) => {
      const X = x + 0.5, Y = y + 0.5, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((X - x0) * dx + (Y - y0) * dy) / L2)), ex = X - (x0 + dx * t), ey = Y - (y0 + dy * t);
      if (ex * ex + ey * ey > r * r) return 0;
      const u = (dy === 0 ? ey : ex) / r;
      return u > 0.45 ? p.d : u < -0.55 ? p.l : Math.round(u * r * 1.2) % 3 === 0 ? p.d : p.m;
    });
  }
  function spines(x0, x1, y0, y1, k) { const r = RNG(k); for (let i = 0; i < 9; i++) px(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), '#f6f2d8'); }
  function cactus(i) {
    shadowE(0, -2, i === 1 ? 14 : 18, 3, 0.25);
    if (i === 1) {
      part(() => {
        capsule(0, -66, 0, -6, 6, CACT);
        capsule(-6, -30, -13, -30, 4, CACT); capsule(-13, -30, -13, -50, 4, CACT);
        capsule(6, -40, 12, -40, 4, CACT); capsule(12, -40, 12, -60, 4, CACT);
        spines(-5, 5, -70, -6, 3); spines(-16, -10, -52, -28, 4); spines(9, 15, -62, -38, 5);
      });
      part(() => { ball(-1, -73, 3, 2.2, tri('#f27aa8', '#c2457a', '#ffc0d8')); px(-1, -74, '#fff1a3'); });
    } else {
      const pad = (x, y, rx, ry) => { ball(x, y, rx, ry, CACT); for (let k = 0; k < 4; k++) px(x - rx * 0.5 + k * rx * 0.35, y - ry * 0.3 + (k % 2) * ry * 0.5, '#f6f2d8'); };
      part(() => { pad(-3, -12, 9, 11); pad(-11, -28, 6, 8); pad(5, -30, 7, 9); pad(-4, -42, 5, 7); });
      for (const [x, y] of [[-14, -36], [9, -40], [-4, -50]]) part(() => { ball(x, y, 2.2, 2, tri('#e0485a', '#a42a3a', '#ff8a9a')); });
      part(() => { ball(15, -8, 7, 7, CACT); for (let k = -2; k <= 2; k++) line(15 + k * 2, -14, 15 + k * 2.6, -3, CACT.d, 1); });
      part(() => ball(15, -15, 2.5, 1.6, tri('#ffd34d', '#e0a526', '#fff1a3')));
    }
  }
  function frond(x0, y0, ang, L, droop, sw) {
    const lo = [], hi = [], N = 9, c = Math.cos(ang), s = Math.sin(ang);
    for (let k = 0; k <= N; k++) {
      const t = k / N, x = x0 + c * L * t + sw * t * t, y = y0 + s * L * t + droop * L * t * t;
      const tx = c * L, ty = s * L + 2 * droop * L * t, m = Math.hypot(tx, ty) || 1, w = 4.2 * Math.sin(Math.PI * Math.pow(t, 0.75)) + 0.4;
      lo.push(x - ty / m * w, y + tx / m * w); hi.push(x + ty / m * w, y - tx / m * w);
    }
    const mid = []; for (let k = 0; k < lo.length; k += 2) mid.push((lo[k] + hi[k]) / 2, (lo[k + 1] + hi[k + 1]) / 2);
    const A = [], B = [];
    for (let k = 0; k < lo.length; k += 2) { A.push(lo[k], lo[k + 1]); B.push(hi[k], hi[k + 1]); }
    const ra = [], rb = []; for (let k = mid.length - 2; k >= 0; k -= 2) { ra.push(mid[k], mid[k + 1]); rb.push(mid[k], mid[k + 1]); }
    const mi = (N >> 1) * 2 + 1, downA = lo[mi] > hi[mi];
    poly(A.concat(ra), (x, y) => (h2(x, y) < 0.12 ? LEAF2.k : downA ? LEAF2.d : LEAF2.m));
    poly(B.concat(rb), (x, y) => (h2(x, y) < 0.12 ? LEAF2.k : downA ? LEAF2.m : LEAF2.d));
    pline(mid, LEAF2.l, 1);
  }
  function palm(i, f, n) {
    const s = Math.sin(f / n * TAU), H = i === 1 ? 86 : 74, bend = i === 1 ? 12 : -10, sw = s * 2;
    shadowE(bend * 0.5, -3, 26, 5, 0.22);
    const cx = (t) => bend * t * t + sw * t * t * t;
    part(() => {
      const L = [], R = [];
      for (let k = 0; k <= 12; k++) { const t = k / 12, w = 4.5 - 1.6 * t; L.push(cx(t) - w, -1 - H * t); R.unshift(cx(t) + w, -1 - H * t); }
      poly(L.concat(R), (x, y) => { const t = (-1 - y) / H, u = (x + 0.5 - cx(t)) / (4.5 - 1.6 * t); return md(y + Math.round(t * 3), 4) === 0 ? (u > 0.2 ? '#6e5236' : '#8a6a46') : u > 0.35 ? '#8a6a46' : u < -0.5 ? '#c9a274' : '#a9845a'; });
      rect(-6, -3, 3, 2, '#8a6a46'); rect(3, -3, 3, 2, '#6e5236');
    });
    const tx = cx(1), ty = -1 - H, sw2 = s * 3;
    part(() => { for (const [a, L, d] of [[-2.75, 30, 0.5], [-0.4, 30, 0.5], [-2.2, 26, 0.35], [-0.95, 26, 0.35]]) frond(tx, ty, a, L, d, sw2); });
    part(() => { for (const [x, y] of [[-3, 3], [2, 4], [0, 1]]) ball(tx + x, ty + y, 2.6, 2.6, tri('#7a5a3a', '#54392a', '#a07a52')); });
    part(() => { for (const [a, L, d] of [[-3.05, 32, 0.6], [-0.1, 32, 0.6], [-1.75, 20, 0.2], [-1.3, 22, 0.25]]) frond(tx, ty - 1, a, L, d, sw2); });
  }
  const PT = { 1: [[-16, 30, 28], [-35, 25, 28], [-54, 20, 26], [-72, 14, 24], [-88, 9, 18]], 2: [[-12, 26, 22], [-29, 21, 24], [-46, 16, 22], [-62, 11, 20], [-76, 7, 15]] };
  function snowTier(cx, yb, w, h) {
    const pts = [cx - w * 0.52, yb - h * 0.5, cx - w * 0.2, yb - h * 0.82, cx, yb - h - 0.5, cx + w * 0.22, yb - h * 0.8, cx + w * 0.5, yb - h * 0.5];
    for (let k = 1; k < 6; k++) { const t = k / 6; pts.push(cx + w * (0.5 - t), yb - h * (0.48 - (k % 2 ? 0.1 : 0))); }
    poly(pts, (x, y) => (y < yb - h * 0.78 ? SNOW.l : x > cx + 1 ? SNOW.d : SNOW.m));
    for (const dx of [-w + 3, w - 4]) ball(cx + dx, yb - 2, 2.6, 1.6, SNOW);
  }
  function snowpine(i, f, n) {
    const s = Math.sin(f / n * TAU);
    shadowE(0, -3, i === 1 ? 26 : 22, 5, 0.22);
    part(() => { poly([-4, -1, 4, -1, 2.5, -24, -2.5, -24], (x) => (x >= 1 ? WOOD.d : x <= -3 ? WOOD.l : WOOD.m)); rect(-7, -3, 3, 2, WOOD.d); rect(4, -3, 3, 2, WOOD.d); });
    part(() => { for (const [yb, w, h] of PT[i]) { const cx = Math.round(s * (-yb) / 45); L.tier(cx, yb, w, h, PINE); snowTier(cx, yb, w, h); } });
    part(() => { for (const [x, y] of [[-20, -2], [16, -1], [-8, 0]]) ball(x, y, 4, 1.8, SNOW); });
  }
  function deadtree(i) {
    const r = RNG(i * 977 + 13), lean = i === 1 ? 4 : -6, moss = [];
    shadowE(0, -3, 22, 4, 0.22);
    part(() => {
      poly([-9, -1, -4, -6, -3, -44, lean + 2, -60, 4, -44, 4, -6, 10, -1], (x, y) => (x > lean * (-y / 60) + 1 ? DEAD.d : x < lean * (-y / 60) - 2 ? DEAD.l : DEAD.m));
      const br = (x, y, a, len, w, d) => {
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        line(x, y, x2, y2, w > 2 ? DEAD.m : DEAD.d, Math.max(1, Math.round(w)));
        if (d <= 0) { if (r() < 0.5) moss.push([x2, y2]); return; }
        const k = 1 + (r() < 0.55 ? 1 : 0);
        for (let j = 0; j <= k; j++) br(x2, y2, a + (j - k / 2) * 0.75 + (r() - 0.5) * 0.4, len * (0.6 + r() * 0.15), w * 0.6, d - 1);
      };
      br(lean, -56, -Math.PI / 2 - 0.5, 22, 4, 3); br(lean + 1, -56, -Math.PI / 2 + 0.55, 20, 3.6, 3);
      br(-2, -36, -Math.PI + 0.5, 14, 2.6, 2); if (i === 1) br(3, -30, -0.4, 13, 2.4, 2);
      if (i === 2) { poly([lean - 3, -60, lean + 2, -60, lean + 1, -66, lean - 1, -63], DEAD.l); }
      px(-1, -40, DEAD.d); rect(-2, -30, 2, 3, '#3a3030');
    });
    part(() => { for (const [x, y] of moss) { const L = 4 + (h2(x | 0, y | 0) * 6 | 0); line(x, y, x + 0.5, y + L, '#7d8a5a', 1); px(x, y + L, '#9aa86e'); } }, null, 0.9);
  }
  function rockPts(cx, cy, rx, ry, seed) { const r = RNG(seed), pts = [], yb = cy + ry * 0.6; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, k = 0.84 + r() * 0.2; pts.push(cx + Math.cos(a) * rx * k, Math.min(yb, cy + Math.sin(a) * ry * k)); } return pts; }
  function biomeRock(snow) {
    shadowE(0, -2, 13, 3, 0.25);
    const cx = 0, cy = -6, rx = 11, ry = 9, p = snow ? ROCK : SANDST;
    part(() => poly(rockPts(cx, cy, rx, ry, snow ? 41 : 43), (x, y) => {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
      if (snow && v < -0.38 + 0.12 * Math.sin(u * 6) - 0.25 * u) return v < -0.6 ? SNOW.l : u > 0.35 ? SNOW.d : SNOW.m;
      if (!snow && md(y, 4) === 0 && v > -0.75) return p.k;
      return v > 0.3 - 0.25 * u ? p.d : v < -0.25 - 0.4 * u && v < 0.1 ? p.l : p.m;
    }));
    if (!snow) part(() => poly(rockPts(9, -3, 4, 3, 5), (x, y) => (y > -3 ? SANDST.d : SANDST.m)));
    else part(() => { ball(9, -2, 3.5, 1.5, SNOW); });
  }
  function reeds(f, n) {
    const s = Math.sin(f / n * TAU), r = RNG(31);
    ell(0, -1, 10, 2.5, al('#2c5a5a', 0.3));
    const tips = [];
    part(() => {
      for (let k = 0; k < 10; k++) {
        const x0 = -8 + k * 1.8 + (r() - 0.5), h = 11 + r() * 11, lean = (r() - 0.5) * 6, tx = x0 + lean + s * h / 9, ty = -1 - h;
        const c = k % 3 === 0 ? '#c9b85a' : k % 3 === 1 ? '#6fa84a' : '#4f8a3c';
        pline([x0, -1, x0 + lean * 0.3 + s * h / 40, -1 - h * 0.5, tx, ty], c, 1);
        if (k % 3 === 1) tips.push([x0 + lean * 0.6 + s * h / 14, -1 - h * 0.8]);
      }
    }, '#2a4a32', 0.7);
    for (const [x, y] of tips) part(() => { box(Math.round(x) - 1, Math.round(y) - 3, 3, 6, (i, j) => (i === 0 ? '#9a6a44' : '#6e4a30')); px(Math.round(x), Math.round(y) - 5, '#c9b85a'); });
  }

  // ================= Lính mới =================
  const FUR = tri('#9a6a44', '#6b4529', '#c08d5e', { k: '#4f321f' });
  const HAIR = tri('#5a3a28', '#3a241a', '#7a5238');
  /** Tư thế chung: nhún khi đứng, bước chân khi chạy. */
  function pose0(anim, f, n) {
    const ph = f / n * TAU, s = Math.sin(ph), c = Math.cos(ph), p = { b: 0, L: 0, lg: [0, 0, 0, 0], hf: [7, -9], hb: [-7, -9] };
    if (anim === 'run' || anim === 'move') {
      const k = Math.round(2 * s);
      p.lg = [-k, -Math.round(Math.max(0, -c) * 1.6), k, -Math.round(Math.max(0, c) * 1.6)];
      p.b = Math.abs(s) < 0.5 ? -1 : 0; p.L = 1; p.run = 1;
    } else if (anim === 'idle') p.b = s > 0.3 ? 1 : 0;
    return p;
  }
  /** Ghép người: lưng -> tay sau -> chân -> thân -> đầu -> vật phía trước -> tay trước -> hiệu ứng. */
  function man(K, P, p) {
    const [ox, oy] = getOrg(), up = () => org(ox + (p.L | 0), oy + (p.b | 0)), sl = K.sl(P);
    up();
    if (K.back) K.back(P, p);
    if (p.tb && p.item) p.item();
    if (!p.hbF && !K.noBack) arm(-4, -12, p.hb, sl, K.hd, 3);
    org(ox, oy); part(() => legs(p, K.pants));
    up(); part(() => K.torso(P, p)); part(() => K.head(P, p));
    if (K.front) K.front(P, p);
    if (!p.tb && p.item) p.item();
    arm(3, -12, p.hf, sl, K.hd, 3);
    if (p.hbF) arm(-3, -12, p.hb, sl, K.hd, 3);
    if (p.fx) p.fx();
    org(ox, oy);
  }
  function club(x, y, a) { part(() => { rline(x, y, a, -3, 10, WOOD.d, 2); const t = rp(x, y, a)(12, 0); ball(t[0], t[1], 3.6, 3, ROCK); px(t[0] - 1, t[1] - 1, ROCK.l); const b = rp(x, y, a)(9, 0); px(b[0], b[1], LEATH.l); }); }
  function jav(x, y, a) { part(() => { rline(x, y, a, -13, 16, WOOD.l, 1); rpoly(x, y, a, [15, -1.6, 21, 0, 15, 1.6], ROCK.l); const b = rp(x, y, a)(14, 0); px(b[0], b[1], LEATH.d); }); }
  function spear(x, y, a) { part(() => { rline(x, y, a, -14, 30, WOOD.m, 2); rpoly(x, y, a, [29, -2.2, 37, 0, 29, 2.2], (u, v) => (v < 0 ? BRONZE.l : BRONZE.m)); }); }
  function kit(x, y) { part(() => { sbox(x - 3, y - 1, 8, 6, WHITE); redCross(x + 1, y + 2, 1); rect(x - 1, y - 2, 4, 1, DARK.m); }); }
  const GUN = {
    musket: { L: 27, my: -2, fe: 14, draw(x, y, a) { rpoly(x, y, a, [-7, -0.5, 0, -1.5, 19, -1.5, 19, 1, 1, 1.5, -7, 3.5], (u, v) => (v > 1 ? WOOD.d : WOOD.m)); rpoly(x, y, a, [0, -2.8, 27, -2.8, 27, -1.3, 0, -1.3], STEEL.m); const t = rp(x, y, a)(1, -2); px(t[0], t[1], GOLD.m); } },
    rifle: { L: 23, my: -2, fe: 12, draw(x, y, a) { rpoly(x, y, a, [-7, -0.5, 0, -1.5, 15, -1.5, 15, 1, 3, 1.5, 0, 3.5, -7, 3.5], (u, v) => (v > 1 ? WOOD.d : WOOD.m)); rpoly(x, y, a, [2, -2.7, 23, -2.7, 23, -1.3, 2, -1.3], DARK.l); const t = rp(x, y, a)(3, -3.5); px(t[0], t[1], STEEL.l); } },
    ar: { L: 19, my: -1, fe: 11, draw(x, y, a) { rpoly(x, y, a, [-7, -1.5, -1, -1.5, -1, 1.5, -7, 3], DARK.m); rpoly(x, y, a, [-1, -2.5, 11, -2.5, 11, 1.2, -1, 1.2], (u, v) => (v < -1.5 ? DARK.l : DARK.m)); rpoly(x, y, a, [3, 1, 6, 1, 7.5, 5.5, 4.5, 5.5], DARK.d); rpoly(x, y, a, [11, -1.6, 19, -1.6, 19, -0.4, 11, -0.4], DARK.l); rpoly(x, y, a, [2, -4, 5, -4, 5, -2.5, 2, -2.5], DARK.d); } },
  };
  function flash(x, y, a, s) {
    part(() => { rpoly(x, y, a, [0, -3 * s, 4 * s, -1.2 * s, 9 * s, 0, 4 * s, 1.2 * s, 0, 3 * s, 1.5 * s, 0], '#ffd84a'); rpoly(x, y, a, [0, -1.4 * s, 5 * s, 0, 0, 1.4 * s], '#fff7d0'); }, '#d0601f');
  }
  const GSMK = tri('#e6e7ec', '#aeb0bc', '#ffffff');
  function puffs(x, y, t, k) {
    if (t <= 0 || t >= 1) return;
    part(() => { for (let i = 0; i < k; i++) ball(x + i * 3 + t * 5, y - i * 2 - t * 6, 2 + t * 3 + i * 0.6, 1.8 + t * 2.4 + i * 0.5, GSMK); }, null, Math.max(0.15, 0.95 - t * 0.85));
  }
  // chuỗi khung bắn: a ngắm, F loé lớn, f loé nhỏ, r giật, s khói, l hạ súng, b kéo khoá nòng
  const SHOT = { musket: 'aFrsla', rifle: 'aFrba', ar: 'aFfFs' };
  function gunPose(K, anim, f, n, P) {
    const p = pose0(anim, f, n), G = GUN[K.gun];
    let g, a;
    if (anim === 'shoot') {
      const seq = SHOT[K.gun], st = seq[f % seq.length], fi = seq.indexOf('F');
      g = [2, -15]; a = st === 'l' ? -0.5 : st === 'r' ? -0.1 : 0;
      if (st === 'r') p.L = -1;
      p.hf = st === 'b' ? [1, -17] : [4, -13]; p.hb = rp(g[0], g[1], a)(G.fe, 1.5); p.hbF = 1; p.b = 0;
      const M = rp(g[0] + p.L, g[1], a)(G.L, G.my), t = f > fi ? (f - fi) / (seq.length - fi) : 0;
      p.fx = () => { org(getOrg()[0] - p.L, getOrg()[1]); if (st === 'F' || st === 'f') flash(M[0], M[1], a, st === 'F' ? 1 : 0.6); if (st === 'f' || (st === 'F' && f > fi)) px(g[0] + 4, g[1] - 4 - f, GOLD.l); puffs(M[0] + 2, M[1] - 1, t, K.gun === 'musket' ? 3 : 2); };
    } else {
      g = [1, -8]; a = p.run ? -0.8 : -0.95;
      p.hf = [2, -8]; p.hb = rp(g[0], g[1], a)(G.fe - 2, 1); p.hbF = 1;
    }
    p.item = () => part(() => G.draw(g[0], g[1], a, P));
    return p;
  }
  const HUM = {
    caveman: {
      anims: { idle: 6, run: 6, attack: 4 }, sl: () => SKIN.m, hd: SKIN, pants: SKIN.d,
      torso(P) { body(FUR, null, P.m); for (const [x, y] of [[-4, -12], [1, -9], [-2, -5], [3, -13], [-3, -8]]) px(x, y, FUR.k); line(-5, -14, 3, -5, P.l, 1); },
      head(P) {
        head((u, v) => (v < -0.35 + 0.2 * u || u < -0.55 ? HAIR : SKIN));
        ball(-6, -27, 3.5, 3.5, HAIR); ball(-1, -31, 4, 2.6, HAIR); ball(-7, -21, 2.6, 3.5, HAIR);
        rect(-7, -27, 13, 2, P.m); rect(1, -17, 6, 2, HAIR.d); px(4, -19, HAIR.d);
      },
      pose(anim, f, n) {
        const p = pose0(anim, f, n); let h = [7, -10], a = -1.65, tb = 0;
        if (p.run) { h = [6, -12]; a = -1.25; tb = 0; }
        if (anim === 'attack') {
          const r = [[-2, -21, -2.7, -1, 1], [7, -18, -1.0, 1, 0], [10, -9, 0.55, 2, 0], [7, -10, -0.5, 0, 0]][f % 4];
          h = [r[0], r[1]]; a = r[2]; p.L = r[3]; tb = r[4]; p.b = 0;
          if (f % 4 === 1) p.fx = () => slash(2, -14, 20, 20, -2.3, -0.5, 6); else if (f % 4 === 2) p.fx = () => slash(2, -13, 20, 20, -1.5, 1.0, 4);
        }
        p.hf = h; p.hb = [h[0] - 9, h[1] + 2]; p.tb = tb; p.item = () => club(h[0], h[1], a);
        return p;
      },
    },
    hunter: {
      anims: { idle: 6, run: 6, throw: 5 }, sl: () => LEATH.m, hd: SKIN, pants: LEATH.d,
      back() { part(() => { line(-8, -4, -5, -22, LEATH.d, 3); for (let k = 0; k < 3; k++) { line(-8 + k, -10, -6 + k * 2, -27, WOOD.l, 1); px(-6 + k * 2, -28, ROCK.l); } }); },
      torso(P) { body(P, FUR.m, LEATH.d); line(-5, -14, 3, -6, LEATH.d, 1); },
      head(P) { head((u, v) => (v < -0.42 + 0.15 * u || u < -0.6 ? HAIR : SKIN)); rect(-7, -27, 14, 2, P.d); line(-6, -28, -10, -36, '#f4f0e0', 2); px(-10, -37, RED.m); },
      pose(anim, f, n) {
        const p = pose0(anim, f, n); let h = [7, -10], a = -1.5, j = 1;
        if (p.run) { h = [5, -15]; a = -0.2; }
        if (anim === 'throw') {
          const r = [[-6, -19, -0.15, -1, 1], [-9, -20, -0.12, -2, 1], [5, -21, -0.25, 1, 1], [11, -12, 0, 2, 0], [8, -10, 0, 0, 0]][f % 5];
          h = [r[0], r[1]]; a = r[2]; p.L = r[3]; j = r[4]; p.b = 0;
          if (f % 5 === 3) p.fx = () => { jav(24, -26, -0.12); for (const y of [-27, -24]) line(4, y, 12, y, '#ffffffbb', 1); };
        }
        p.hf = h; p.hb = anim === 'throw' ? (f % 5 < 2 ? [8, -14] : [-6, -9]) : [h[0] - 12, h[1] + 3];
        if (j) p.item = () => jav(h[0], h[1], a);
        return p;
      },
    },
    spearman: {
      anims: { idle: 6, run: 6, attack: 4 }, sl: (P) => P.d, hd: SKIN, pants: BRONZE.d, noBack: 1,
      torso(P) { body(P, BRONZE.m, LEATH.d); rect(-5, -14, 9, 1, BRONZE.l); },
      head(P) {
        ball(-3, -32, 6, 2.6, P); for (let k = 0; k < 4; k++) px(-8 + k * 3, -34, P.l);
        head((u, v) => (u > -0.1 && v > -0.3 && v < 0.6 ? SKIN : BRONZE), 1); rect(3, -26, 1, 5, BRONZE.d);
      },
      front(P) { part(() => { ball(-1, -12, 7.5, 8, BRONZE); ell(-1, -12, 5.5, 6, P.m); ell(-3, -14, 2, 2, P.l); ball(-1, -12, 1.6, 1.6, BRONZE); }); },
      pose(anim, f, n) {
        const p = pose0(anim, f, n); let h = [7, -12], a = -1.45;
        if (p.run) { h = [6, -13]; a = -0.3; }
        if (anim === 'attack') {
          const r = [[0, -13, -0.1, -1], [12, -13, -0.03, 3], [13, -13, -0.03, 3], [7, -12, -0.2, 1]][f % 4];
          h = [r[0], r[1]]; a = r[2]; p.L = r[3]; p.b = 0;
          if (f % 4 === 1 || f % 4 === 2) p.fx = () => { for (const y of [-17, -13, -9]) line(-16, y, -6, y, '#ffffffbb', 1); };
        }
        p.hf = h; p.item = () => spear(h[0], h[1], a);
        return p;
      },
    },
    musketeer: {
      anims: { idle: 6, run: 6, shoot: 6 }, sl: (P) => P.m, hd: SKIN, pants: '#e8e2d4', gun: 'musket',
      torso(P) { body(P, P.d, '#f2ede0'); line(-5, -14, 3, -5, '#f2ede0', 1); px(1, -11, GOLD.m); px(1, -8, GOLD.m); },
      head(P) {
        head((u, v) => (u < -0.55 && v > -0.3 ? '#e8e2d4' : SKIN));
        poly([-10, -25, 10, -25, 6, -30, 0, -33, -6, -30], (x, y) => (y > -27 ? '#2b2c38' : '#3d3f50')); rect(-9, -26, 18, 1, GOLD.m); px(5, -29, P.l);
      },
      pose(anim, f, n, P) { return gunPose(this, anim, f, n, P); },
    },
    rifleman: {
      anims: { idle: 6, run: 6, shoot: 5 }, sl: (P) => P.m, hd: SKIN, pants: KHAKI.d, gun: 'rifle',
      torso(P) { body(P, null, LEATH.d); rect(-5, -9, 3, 2, LEATH.m); rect(0, -9, 3, 2, LEATH.m); line(-5, -14, 3, -6, LEATH.m, 1); },
      head() { head(() => SKIN); ball(-0.5, -28, 6.5, 4, OLV); ell(0, -26, 10, 1.6, OLV.d); },
      pose(anim, f, n, P) { return gunPose(this, anim, f, n, P); },
    },
    soldier: {
      anims: { idle: 6, run: 6, shoot: 5 }, sl: () => OLV.m, hd: DARK, pants: OLV.d, gun: 'ar',
      torso(P) { body(OLV, null, DARK.m); box(-5, -15, 10, 10, (i, j) => (i >= 8 ? P.d : j === 0 ? P.l : j === 5 && i % 4 !== 3 ? P.d : P.m)); },
      head() { head(() => SKIN); ball(-0.5, -27, 8.5, 5, OLV); rect(-9, -25, 15, 2, OLV.d); rect(1, -27, 6, 2, DARK.m); px(5, -27, '#7fd0ff'); line(5, -22, 4, -17, DARK.m, 1); },
      pose(anim, f, n, P) { return gunPose(this, anim, f, n, P); },
    },
    medic: {
      anims: { idle: 6, run: 6, heal: 8 }, sl: (P) => P.m, hd: SKIN, pants: OLV.d,
      back() { part(() => { sbox(-12, -18, 7, 10, WHITE); redCross(-9, -13, 2); }); },
      torso(P) { body(P, null, DARK.m); rect(-6, -14, 3, 3, '#ffffff'); px(-5, -13, '#e23a3a'); },
      head() { head(() => SKIN); ball(-0.5, -27, 8.5, 5, WHITE); rect(-9, -25, 15, 2, WHITE.d); redCross(-2, -29, 1); },
      pose(anim, f, n) {
        const p = pose0(anim, f, n); let h = p.run ? [6, -9] : [7, -8];
        if (anim === 'heal') {
          const g = [0, 0.4, 0.8, 1, 1, 1, 0.7, 0.3][f % 8]; h = [10, -13 - Math.round(g * 2)]; p.b = 2; p.hb = [6, -12];
          p.fx = () => {
            glow(16, -15, g);
            for (let k = 0; k < 3; k++) { const t = ((f / 8) + k / 3) % 1, x = 12 + k * 4, y = -16 - t * 18; if (t < 0.9) { rect(x - 1, y, 3, 1, al('#7dff6a', 1 - t)); rect(x, y - 1, 1, 3, al('#7dff6a', 1 - t)); } }
          };
        }
        p.hf = h; p.item = () => kit(h[0], h[1]);
        return p;
      },
    },
  };
  // xe & pháo
  const TRK = DARK;
  function wheel(x, y, r, a, p) { part(() => { ball(x, y, r, r, p || DARK); ell(x, y, r - 1.6, r - 1.6, STEEL.d); for (let k = 0; k < 3; k++) { const t = rp(x, y, a + k * Math.PI / 3); const A = t(-(r - 1.6), 0), B = t(r - 1.6, 0); line(A[0], A[1], B[0], B[1], STEEL.m, 1); } ball(x, y, 1.2, 1.2, STEEL); }); }
  function cannonUnit(anim, P, f, n) {
    const mv = anim === 'move', sh = anim === 'shoot', rec = sh ? [0, 3, 2, 1, 1, 0][f % 6] : 0, wa = mv ? f * Math.PI / 4 : 0;
    const [ox, oy] = getOrg();
    shadowE(0, -2, 26, 3, 0.25);
    const K = HUM.musketeer, p = pose0(mv ? 'run' : 'idle', f, n);
    p.hf = [13, -8]; p.hb = [10, -7];
    if (sh) { p.b = 0; if (f % 6 === 0) { p.hf = [15, -15]; p.item = () => part(() => { line(11, -12, 16, -18, WOOD.d, 1); px(16, -19, '#ff8a2e'); }); } else { p.L = -1; p.hf = [6, -19]; p.hb = [4, -18]; } }
    org(ox - 21, oy); man({ sl: K.sl, hd: K.hd, pants: K.pants, torso: K.torso, head: K.head }, P, p);
    org(ox - rec, oy);
    part(() => { poly([-12, -3, -9, -6, 6, -12, 8, -9, -9, -1], (x, y) => (y < -9 ? WOOD.l : WOOD.m)); });
    part(() => { rpoly(-2, -14, -0.12, [-6, -4, 22, -3, 22, 3, -6, 4], (u, v) => (v < -1.5 ? IRON.l : v > 2 ? IRON.d : IRON.m)); rpoly(-2, -14, -0.12, [20, -4, 24, -4, 24, 4, 20, 4], IRON.d); ball(-8, -14, 3, 3, IRON); rpoly(-2, -14, -0.12, [6, -4.5, 8, -4.5, 8, 4.5, 6, 4.5], P.m); });
    wheel(2, -6, 6.5, wa, WOOD);
    org(ox, oy);
    if (sh) {
      const M = rp(-2 - rec, -14, -0.12)(25, 0), t = f % 6;
      if (t === 1) flash(M[0], M[1], -0.12, 1.3);
      if (t >= 1) part(() => { for (let k = 0; k < 3; k++) ball(M[0] + 2 + k * 4 + t * 2, M[1] - k * 2 - t * 2, 3 + t * 1.2, 2.6 + t, GSMK); }, null, Math.max(0.2, 1 - t * 0.16));
    }
  }
  function tankUnit(anim, P, f, n) {
    const mv = anim === 'move', sh = anim === 'shoot', rec = sh ? [0, 4, 3, 1, 0][f % 5] : 0, rock = sh && f % 5 === 1 ? -1 : 0;
    const b = sh ? 0 : f % 2 ? -1 : 0, sft = mv ? f : 0;
    const [ox, oy] = getOrg();
    shadowE(2, -2, 30, 3.5, 0.3);
    org(ox + rock, oy + b);
    part(() => { poly([-26, -10, -23, -18, 13, -18, 27, -12, 25, -9, -26, -9], (x, y) => (y < -16 ? OLV.l : x > 21 ? OLV.d : OLV.m)); rect(-21, -16, 32, 2, P.m); rect(-21, -16, 32, 1, P.l); });
    part(() => { poly([-13, -18, -10, -25, 5, -26, 11, -22, 11, -18], (x, y) => (y < -24 ? OLV.l : x > 8 ? OLV.d : OLV.m)); rect(-10, -22, 19, 2, P.m); ball(-4, -26, 3.5, 2, OLV); });
    part(() => { rect(11 - rec, -23, 22, 2, OLV.d); rect(11 - rec, -23, 22, 1, OLV.l); rect(30 - rec, -24, 4, 4, DARK.m); rect(9, -24, 4, 5, OLV.d); });
    line(-9, -25, -13, -38, DARK.m, 1); px(-13, -39, '#ff4a3a');
    org(ox, oy);
    part(() => fillFn(-25, -12, 24, -1, (x, y) => {
      const X = x + 0.5, Y = y + 0.5, cx = Math.max(-19, Math.min(19, X)), d = Math.hypot(X - cx, Y + 6.5);
      if (d > 5.6) return 0;
      if (d > 4.2) return md(x + (y < -6 ? -sft : sft), 3) === 0 ? '#22232b' : TRK.m;
      return TRK.d;
    }));
    for (const x of [-15, -7, 1, 9, 17]) part(() => { ball(x, -5, 3.3, 3.3, STEEL); ball(x, -5, 1.2, 1.2, STEEL.d); const t = rp(x, -5, sft * 0.8)(2.2, 0); px(t[0], t[1], STEEL.d); }, OL);
    part(() => { ball(-21, -7, 3, 3, STEEL); ball(21, -7, 3, 3, STEEL); px(21, -7, OL); px(-21, -7, OL); });
    if (anim === 'idle' || mv) puffs(-28, -14, ((f / n) + 0.2) % 1, 1);
    if (sh) {
      const t = f % 5;
      if (t === 1) flash(35 - rec + rock, -22, 0, 1.5);
      if (t >= 1) part(() => { for (let k = 0; k < 3; k++) ball(36 + k * 4 + t * 2, -22 - k * 2 - t * 2, 3 + t * 1.4, 2.6 + t, GSMK); }, null, Math.max(0.2, 1 - t * 0.2));
    }
  }
  function rocketUnit(anim, P, f, n) {
    const mv = anim === 'move', sh = anim === 'shoot', b = mv ? (f % 2 ? -1 : 0) : 0, wa = mv ? f * Math.PI / 4 : 0, A = -0.42, PX = -14, PY = -18;
    const [ox, oy] = getOrg();
    shadowE(0, -2, 30, 3.5, 0.3);
    org(ox, oy + b);
    part(() => { rect(-27, -12, 50, 3, DARK.m); box(-27, -17, 33, 5, (i, j) => (j === 0 ? OLV.l : i >= 31 ? OLV.d : OLV.m)); rect(-25, -15, 29, 1, P.m); });
    part(() => { line(-4, -16, PX + 14, PY - 6, OLV.d, 2); });
    const T = rp(PX, PY, A), fired = sh ? [0, 1, 2, 3, 3, 3][f % 6] : 0;
    part(() => {
      rpoly(PX, PY, A, [-5, -7, 28, -7, 28, 2, -5, 2], (u, v) => (v < -5.5 ? OLV.l : v > 0 ? OLV.d : OLV.m));
      rpoly(PX, PY, A, [4, -7, 7, -7, 7, 2, 4, 2], P.m);
      for (let k = 0; k < 3; k++) { if (k < fired) continue; rpoly(PX, PY, A, [28, -6 + k * 2.6, 32, -5 + k * 2.6, 28, -3.8 + k * 2.6], k % 2 ? '#ffffff' : RED.m); }
    });
    part(() => { poly([6, -24, 17, -24, 23, -16, 25, -9, 6, -9], (x, y) => (y < -22 ? OLV.l : x > 21 ? OLV.d : OLV.m)); poly([9, -22, 16, -22, 20, -16, 9, -16], GLS.m); line(12, -21, 16, -17, GLS.l, 1); rect(8, -14, 13, 2, P.m); px(24, -12, '#fff1a3'); rect(23, -10, 3, 1, DARK.m); });
    org(ox, oy);
    for (const x of [-19, -9, 16]) wheel(x, -5, 5, wa);
    if (sh) {
      const t = f % 6;
      for (let k = 0; k < 3; k++) {
        const age = t - (k + 1); if (age < 0 || age > 1) continue;
        const u = 34 + age * 14, R = rp(PX, PY, A);
        part(() => { rpoly(PX, PY, A, [u, -6 + k * 2.6, u + 8, -6 + k * 2.6, u + 10, -4.7 + k * 2.6, u + 8, -3.4 + k * 2.6, u, -3.4 + k * 2.6], WHITE.m); rpoly(PX, PY, A, [u + 8, -6 + k * 2.6, u + 11, -4.7 + k * 2.6, u + 8, -3.4 + k * 2.6], RED.m); });
        part(() => { rpoly(PX, PY, A, [u - 6, -4.7 + k * 2.6, u, -6.5 + k * 2.6, u, -2.9 + k * 2.6], '#ffd84a'); }, '#d0601f');
        const BB = R(-7, -2); part(() => ball(BB[0] - age * 4, BB[1] + 2, 3 + age * 3, 2.5 + age * 2, GSMK), null, 0.8);
      }
      if (t >= 3) { const BB = T(-8, -2); part(() => { ball(BB[0] - 4 - t, BB[1] + 3, 4 + t, 3 + t * 0.6, GSMK); ball(BB[0] + 2, BB[1] - t, 3 + t * 0.7, 2.5 + t * 0.5, GSMK); }, null, Math.max(0.2, 1 - (t - 3) * 0.3)); }
    }
  }
  const VEH = { cannon: { anims: { idle: 4, move: 4, shoot: 6 }, draw: cannonUnit }, tank: { anims: { idle: 4, move: 4, shoot: 5 }, draw: tankUnit }, artillery: { anims: { idle: 4, move: 4, shoot: 6 }, draw: rocketUnit } };
  /** Tra hoạt ảnh (có bí danh run<->move, attack<->đòn riêng). */
  function unitAnim(kind, anim) {
    const K = HUM[kind] || VEH[kind]; if (!K) return null;
    if (K.anims[anim]) return anim;
    if (anim === 'run' && K.anims.move) return 'move';
    if (anim === 'move' && K.anims.run) return 'run';
    if (/^(attack|shoot|throw|heal)$/.test(anim)) return Object.keys(K.anims).find((a) => !/^(idle|run|move)$/.test(a));
    return null;
  }
  function unitDrawer(kind, anim, P) {
    if (VEH[kind]) return (f, n) => VEH[kind].draw(anim, P, f, n);
    const K = HUM[kind];
    return (f, n) => man(K, P, K.pose(anim, f, n, P));
  }

  // ================= Đạn =================
  const SHOTS = {
    javelin() { part(() => { rline(0, 0, 0, -15, 9, WOOD.l, 1); rpoly(0, 0, 0, [9, -1.6, 15, 0, 9, 1.6], ROCK.l); px(8, 0, LEATH.d); px(-14, -1, '#f4f0e0'); px(-14, 1, '#f4f0e0'); }); },
    bullet() { rect(-4, -1, 2, 2, al('#ff9a2e', 0.55)); rect(-2, -1, 3, 2, '#ffd84a'); rect(1, -1, 3, 2, '#fff7d0'); rect(-2, -2, 6, 1, al('#ffd84a', 0.35)); rect(-2, 1, 6, 1, al('#ffd84a', 0.35)); },
    shell() { px(-6, 0, al('#ff9a2e', 0.4)); part(() => { ball(0, 0, 3.6, 3.6, DARK); px(-1, -2, '#ffffff'); }); },
    missile() {
      part(() => { poly([-10, -1.6, -17, 0, -10, 1.6], '#ff9a2e'); poly([-10, -1, -14, 0, -10, 1], '#fff3a0'); }, '#d0601f');
      part(() => {
        box(-10, -2, 20, 4, (i, j) => (j === 0 ? WHITE.l : j === 3 ? WHITE.d : WHITE.m)); rect(2, -2, 2, 4, PB.m);
        poly([10, -2, 15, 0, 10, 2], RED.m); poly([-10, -2, -13, -5, -6, -2], DARK.m); poly([-10, 2, -13, 5, -6, 2], DARK.m);
      });
    },
  };

  // ================= Biểu tượng 32x32 =================
  const o = part;
  const ICON = {
    gunpowder() {
      o(() => { line(15, 8, 19, 3, '#5a4a3a', 1); }); sparkle(20, 2, 2, '#ffd84a');
      o(() => fillFn(5, 8, 22, 28, (x, y) => { const u = (x + 0.5 - 13.5) / (8.5 + 1.5 * Math.sin((y - 8) / 20 * Math.PI)); if (Math.abs(u) > 1) return 0; return y === 11 || y === 25 ? IRON.d : u > 0.5 ? dk(WOOD.d, 0.2) : u < -0.6 ? WOOD.m : WOOD.d; }));
      o(() => { ell(13.5, 8.5, 7, 2, TAN.m); rect(10, 15, 8, 6, '#2b2c38'); px(13, 17, '#ffffff'); px(14, 17, '#ffffff'); px(13, 19, '#ffffff'); });
      o(() => { lump(24, 26, 5, DARK); lump(19, 28, 3, DARK); });
    },
    steel() {
      const I = (x, y, p) => { rect(x, y, 20, 4, p.l); rect(x + 7, y + 4, 6, 10, p.m); rect(x, y + 14, 20, 4, p.d); };
      o(() => I(10, 4, tri('#9aa1b0', '#6a7180', '#b8bfcc')));
      o(() => { I(4, 10, STEEL); rect(4, 13, 20, 1, STEEL.d); rect(4, 10, 20, 1, '#ffffff'); });
    },
    fuel() {
      o(() => { rect(7, 3, 5, 6, DARK.m); rect(6, 2, 7, 2, DARK.l); });
      o(() => { sbox(6, 7, 20, 22, RED, 3); line(9, 11, 22, 25, RED.l, 1); line(22, 11, 9, 25, RED.l, 1); rect(15, 4, 10, 3, RED.d); rect(17, 5, 2, 2, OL); rect(21, 5, 2, 2, OL); });
    },
    era() {
      o(() => { rect(6, 3, 20, 3, WOOD.m); rect(6, 26, 20, 3, WOOD.m); rect(6, 3, 20, 1, WOOD.l); rect(7, 6, 2, 20, WOOD.d); rect(23, 6, 2, 20, WOOD.d); });
      o(() => { poly([10, 6, 22, 6, 17, 15.5, 15, 15.5], '#cfe8f0'); poly([15, 16.5, 17, 16.5, 22, 26, 10, 26], '#cfe8f0'); poly([12, 10, 20, 10, 17, 15, 15, 15], GOLD.m); poly([11, 26, 21, 26, 16, 21], GOLD.m); rect(15.5, 15, 1, 8, GOLD.l); px(12, 8, '#ffffff'); });
    },
    radar() {
      o(() => { rect(14, 18, 4, 9, STEEL.d); rect(9, 26, 14, 3, STEEL.m); });
      o(() => { rpoly(13, 14, -0.6, [-10, -3, 10, -3, 7, 3, -7, 3], (u, v) => (v < 0 ? WHITE.l : WHITE.d)); line(13, 14, 19, 19, DARK.m, 1); });
      for (let k = 0; k < 3; k++) pline([20 + k * 3, 4 - k, 24 + k * 3, 6 + k, 26 + k * 3, 11 + k * 2], k === 1 ? '#7dff6a' : '#b8ffb0', 1);
    },
    tank() {
      const P = PB;
      o(() => { poly([3, 20, 6, 15, 22, 15, 28, 19, 27, 21, 3, 21], OLV.m); rect(5, 16, 18, 2, P.m); });
      o(() => { poly([9, 15, 11, 10, 19, 10, 22, 15], (x, y) => (y < 12 ? OLV.l : OLV.m)); rect(21, 11, 10, 2, OLV.d); });
      o(() => { fillFn(3, 21, 28, 28, (x, y) => { const d = Math.hypot(x + 0.5 - Math.max(7, Math.min(24, x + 0.5)), y + 0.5 - 24.5); return d > 4 ? 0 : d > 2.8 ? (x % 2 ? DARK.m : '#22232b') : DARK.d; }); for (const x of [8, 13, 18, 23]) ball(x, 24.5, 1.8, 1.8, STEEL); });
    },
    gun() { o(() => GUN.rifle.draw(6, 24, -0.72, PB)); o(() => { rpoly(6, 24, -0.72, [8, 1.5, 11, 1.5, 11, 5, 8, 5], WOOD.d); }); },
    cannon() {
      o(() => { poly([4, 27, 7, 23, 20, 17, 22, 20, 8, 28], WOOD.m); });
      o(() => { rpoly(10, 16, -0.4, [-6, -5, 18, -3.5, 18, 3.5, -6, 5], (u, v) => (v < -1.5 ? IRON.l : v > 2.5 ? IRON.d : IRON.m)); ball(5, 18, 4, 4, IRON); rpoly(10, 16, -0.4, [16, -4.5, 20, -4.5, 20, 4.5, 16, 4.5], IRON.d); });
      o(() => { ball(13, 23, 6, 6, WOOD); ell(13, 23, 3.5, 3.5, WOOD.d); ball(13, 23, 1.5, 1.5, STEEL); });
    },
    factory() {
      o(() => { brickW(21, 4, 6, 14, { bw: 4 }); });
      part(() => { ball(25, 2, 3, 2.5, GSMK); }, null, 0.8);
      o(() => { brickW(3, 16, 26, 13, { bw: 5 }); for (let k = 0; k < 3; k++) poly([3 + k * 9, 16, 3 + k * 9, 9, 12 + k * 9, 16], tiles(SLATE, 9, 999)); for (let k = 0; k < 3; k++) rect(6 + k * 8, 21, 4, 4, GLASS); });
    },
    pvp() {
      o(() => sword(5, 26, -0.78, 26)); o(() => sword(27, 26, -2.36, 26));
      o(() => { sbox(8, 18, 16, 10, RED, 2); }); text('VS', 12, 21, '#ffffff');
    },
    robot() {
      o(() => { rect(15, 2, 2, 5, STEEL.d); ball(16, 2, 2, 2, RED); });
      o(() => { sbox(5, 7, 22, 19, STEEL, 3); rect(3, 13, 3, 7, STEEL.d); rect(26, 13, 3, 7, STEEL.d); });
      o(() => { rect(9, 11, 14, 7, '#1d2433'); rect(10, 13, 4, 3, '#4ff0ff'); rect(18, 13, 4, 3, '#4ff0ff'); px(10, 13, '#ffffff'); px(18, 13, '#ffffff'); for (let k = 0; k < 4; k++) rect(10 + k * 3, 21, 2, 2, STEEL.d); }, null);
    },
    trophy() {
      o(() => { ring(7, 11, 4, 4, 1.6, GOLD.m); ring(25, 11, 4, 4, 1.6, GOLD.m); });
      o(() => { polyFn([7, 4, 25, 4, 23, 14, 19, 19, 13, 19, 9, 14], (x) => (x > 19 ? GOLD.d : x < 11 ? GOLD.l : GOLD.m)); rect(14, 19, 4, 4, GOLD.d); rect(9, 23, 14, 3, WOOD.m); rect(8, 26, 16, 3, WOOD.d); });
      star(16, 11, 4, tri('#fff1a3', '#f3c63f', '#ffffff'));
    },
    globe() {
      o(() => fillFn(3, 3, 28, 28, (x, y) => {
        const u = (x + 0.5 - 16) / 13, v = (y + 0.5 - 16) / 13, d = u * u + v * v; if (d > 1) return 0;
        const land = Math.sin(u * 5 + 1) + Math.cos(v * 4 - u * 2) > 0.9 || (u > 0.1 && v > 0.1 && Math.sin(u * 7) * Math.cos(v * 6) > 0.2);
        const sh = (u + 0.3) ** 2 + (v + 0.35) ** 2 > 1.05;
        if (md(Math.round(u * 13), 6) === 0 || md(Math.round(v * 13), 6) === 0) return land ? GREEN.d : '#2f63b8';
        return land ? (sh ? GREEN.d : GREEN.m) : sh ? '#2f63b8' : '#4a88e0';
      }));
      px(10, 9, '#ffffff'); px(11, 8, '#ffffff');
    },
    wall() { o(() => { stoneW(3, 13, 26, 16, { bw: 6 }); crenel(2, 7, 28, GST); }); },
    bolt() { o(() => polyFn([19, 2, 7, 18, 15, 18, 11, 30, 25, 12, 17, 12, 22, 2], (x, y) => (x + y > 32 ? '#e0a526' : x < 12 && y < 18 ? '#fff1a3' : '#ffd34d'))); },
  };

  // ================= Đăng ký khoá =================
  const SPEC = {};
  function def(key, w, h, n, ax, ay, fn) { SPEC[key] = { size: [w, h], frames: n, ax, ay, still: n === 1, fn }; }
  const WSTY = ['fence', 'palisade', 'stone', 'brick', 'concrete', 'sandbag', 'barbed'];
  for (const s of WSTY) for (let m = 0; m < 16; m++) def(`w.${s}.${m}`, 64, 96, 1, 0.5, 1.0, () => wallTile(WALL[s], m));
  for (const s of ['wood', 'iron', 'steel']) for (const d of ['h', 'v']) def(`w.gate.${s}.${d}`, 64, 96, 1, 0.5, 1.0, () => gate(s, d));
  const BSZ = { castle: [320, 256], house: [128, 192], storage: [128, 128], tower: [128, 256], barracks: [192, 256], archery: [192, 256], workshop: [128, 192], mill: [128, 192], market: [192, 160], monastery: [192, 320] };
  for (const sk of ['a', 'g', 'm']) for (const t in BSZ) def(`e.${sk}.${t}`, BSZ[t][0], BSZ[t][1], 1, 0.5, 0.95, () => SK[sk][t](PB));
  const USZ = { hunter: [128, 160], totem: [64, 128], powdermill: [128, 192], cannontower: [128, 192], blastfurnace: [128, 224], factory: [192, 224], bank: [128, 192], oilwell: [128, 160, 6], bunker: [128, 112], artillery: [128, 128], missile: [128, 192], radar: [128, 192, 8], powerplant: [192, 256], tankfactory: [192, 224] };
  for (const t in USZ) def(`e.${t}`, USZ[t][0], USZ[t][1], USZ[t][2] || 1, 0.5, 0.95, (f, n) => UB[t](PB, f, n));

  for (let i = 1; i <= 2; i++) {
    def(`n.cactus${i}`, 128, 192, 1, 0.5, 0.92, () => cactus(i));
    def(`n.palm${i}`, 192, 256, 8, 0.5, 0.9, (f, n) => palm(i, f, n));
    def(`n.snowpine${i}`, 192, 256, 8, 0.5, 0.9, (f, n) => snowpine(i, f, n));
    def(`n.deadtree${i}`, 192, 256, 1, 0.5, 0.9, () => deadtree(i));
  }
  def('n.reeds', 64, 64, 4, 0.5, 0.8, reeds);
  def('n.snowrock1', 64, 64, 1, 0.5, 0.82, () => biomeRock(1));
  def('n.sandrock1', 64, 64, 1, 0.5, 0.82, () => biomeRock(0));
  def('x.javelin', 64, 16, 1, 0.5, 0.5, SHOTS.javelin); def('x.bullet', 16, 8, 1, 0.5, 0.5, SHOTS.bullet);
  def('x.shell', 24, 24, 1, 0.5, 0.5, SHOTS.shell); def('x.missile', 64, 24, 1, 0.5, 0.5, SHOTS.missile);
  for (const k in ICON) def(`i.${k}`, 32, 32, 1, 0.5, 0.5, () => { org(0, 0); ICON[k](); });
  /** u.<màu>.<loại>.<hoạt ảnh>: màu tuỳ ý như lính gốc. */
  function unitSpec(key) {
    const p = key.split('.'); if (p[0] !== 'u' || p.length !== 4 || !p[1]) return null;
    const an = unitAnim(p[2], p[3]); if (!an) return null;
    const K = HUM[p[2]] || VEH[p[2]];
    return { size: [192, 192], frames: K.anims[an], ax: 0.5, ay: 0.67, still: false, fn: unitDrawer(p[2], an, pal(p[1])) };
  }
  const UNIT_KINDS = Object.keys(HUM).concat(Object.keys(VEH));
  function keys() {
    const out = Object.keys(SPEC);
    for (const c of ['blue', 'red']) for (const k of UNIT_KINDS) for (const a in (HUM[k] || VEH[k]).anims) out.push(`u.${c}.${k}.${a}`);
    return out;
  }

  F.extend({
    entry: (key) => SPEC[key] || unitSpec(key),
    drawer: (key) => { const s = SPEC[key] || unitSpec(key); return s ? s.fn : null; },
    keys,
  });
  root.ERAS_ART = { WALL_STYLES: WSTY, GATES: ['wood', 'iron', 'steel'], UNIT_KINDS };
})(typeof window !== 'undefined' ? window : globalThis);
