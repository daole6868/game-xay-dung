/*
 * Danh mục sprite của game.
 *
 * Mỗi khoá (key) là một "tấm sprite" (sprite sheet) mà game dùng. Với các khoá lấy từ
 * bộ Tiny Swords (Pixel Frog, bản Free Pack 2025), danh mục mô tả cách tìm file trong
 * thư mục/zip bạn tải về:
 *   dir   : các chữ phải có trong đường dẫn thư mục (đã chuẩn hoá: chữ thường, bỏ dấu cách/_/-)
 *   base  : các tên file chấp nhận được (đã chuẩn hoá, không đuôi .png)
 *   fw    : gợi ý độ rộng một khung hình (dùng khi khung không vuông, ví dụ cây)
 *   still : true = ảnh tĩnh một khung
 *   size  : kích thước hiển thị một khung trong thế giới game (px) — đồ hoạ dự phòng vẽ theo cỡ này
 *   ax,ay : điểm neo (chân nhân vật / chân công trình) tính theo tỉ lệ khung hình
 *
 * Các khoá bắt đầu bằng "p." (vật thể tự vẽ) và "i." (biểu tượng) luôn do đồ hoạ dự phòng vẽ.
 *
 * Nếu bộ ảnh của bạn đặt tên khác, chỉ cần thêm tên vào mảng base tương ứng.
 */
(function (root) {
  'use strict';

  const COLORS = ['blue', 'red', 'yellow', 'purple', 'black'];
  const entries = {};

  function add(key, def) { entries[key] = def; }

  // ---------- Lính & dân (Units) ----------
  // anim: [tên file chấp nhận, số khung gợi ý cho đồ hoạ dự phòng]
  const UNIT_ANIMS = {
    pawn: {
      idle: [['pawnidle'], 8], run: [['pawnrun'], 6],
      axe: [['pawninteractaxe', 'pawnaxe'], 6],
      pickaxe: [['pawninteractpickaxe', 'pawnpickaxe'], 6],
      hammer: [['pawninteracthammer', 'pawnhammer'], 6],
      knife: [['pawninteractknife', 'pawnknife'], 4],
      idle_wood: [['pawnidlewood'], 8], run_wood: [['pawnrunwood'], 6],
      idle_gold: [['pawnidlegold'], 8], run_gold: [['pawnrungold'], 6],
      idle_meat: [['pawnidlemeat'], 8], run_meat: [['pawnrunmeat'], 6],
    },
    warrior: {
      idle: [['warrioridle'], 8], run: [['warriorrun'], 6],
      attack1: [['warriorattack1'], 4], attack2: [['warriorattack2'], 4],
      guard: [['warriorguard'], 6],
    },
    archer: {
      idle: [['archeridle'], 6], run: [['archerrun'], 4],
      shoot: [['archershoot'], 8],
    },
    lancer: {
      idle: [['lanceridle'], 12], run: [['lancerrun'], 6],
      attack: [['lancerrightattack', 'lancerattack', 'lancerattackright'], 3],
    },
    monk: {
      idle: [['idle', 'monkidle'], 6], run: [['run', 'monkrun'], 4],
      heal: [['heal', 'monkheal'], 11],
    },
  };
  const UNIT_FRAME = { pawn: 192, warrior: 192, archer: 192, lancer: 320, monk: 192 };
  const UNIT_AY = { pawn: 0.67, warrior: 0.67, archer: 0.67, lancer: 0.6, monk: 0.67 };

  for (const c of COLORS) {
    for (const kind in UNIT_ANIMS) {
      const fs = UNIT_FRAME[kind];
      for (const anim in UNIT_ANIMS[kind]) {
        const [base, frames] = UNIT_ANIMS[kind][anim];
        add(`u.${c}.${kind}.${anim}`, {
          dir: [c, kind], base, size: [fs, fs], frames, ax: 0.5, ay: UNIT_AY[kind],
        });
      }
    }
    add(`u.${c}.archer.arrow`, { dir: [c, 'archer'], base: ['arrow'], size: [64, 64], frames: 1, ax: 0.5, ay: 0.5, still: true });
    add(`u.${c}.monk.heal_fx`, { dir: [c, 'monk'], base: ['healeffect', 'monkhealeffect'], size: [192, 192], frames: 11, ax: 0.5, ay: 0.67 });
  }

  // ---------- Công trình (Buildings) ----------
  const BUILDINGS = {
    castle: [320, 256], house1: [128, 192], house2: [128, 192], house3: [128, 192],
    tower: [128, 256], barracks: [192, 256], archery: [192, 256], monastery: [192, 320],
  };
  for (const c of COLORS) {
    for (const b in BUILDINGS) {
      add(`b.${c}.${b}`, { dir: [c, 'building'], base: [b], size: BUILDINGS[b], frames: 1, ax: 0.5, ay: 0.95, still: true });
    }
  }

  // ---------- Thiên nhiên & tài nguyên ----------
  for (let i = 1; i <= 4; i++) {
    const big = i <= 2;
    add(`n.tree${i}`, { dir: [], base: [`tree${i}`], fw: 192, size: big ? [192, 256] : [192, 192], frames: 8, ax: 0.5, ay: big ? 0.9 : 0.86 });
    add(`n.stump${i}`, { dir: [], base: [`stump${i}`], size: [192, 256], frames: 1, ax: 0.5, ay: 0.9, still: true });
    add(`n.bush${i}`, { dir: [], base: [`bushe${i}`, `bush${i}`], size: [128, 128], frames: 8, ax: 0.5, ay: 0.72 });
    add(`n.rock${i}`, { dir: [], base: [`rock${i}`], size: [64, 64], frames: 1, ax: 0.5, ay: 0.82, still: true });
    add(`n.waterrock${i}`, { dir: [], base: [`waterrocks0${i}`, `waterrock${i}`], size: [128, 128], frames: 8, ax: 0.5, ay: 0.6 });
  }
  for (let i = 1; i <= 6; i++) {
    add(`n.goldstone${i}`, { dir: [], base: [`goldstone${i}`], size: [128, 128], frames: 1, ax: 0.5, ay: 0.78, still: true });
  }
  add('n.sheep.idle', { dir: [], base: ['sheepidle'], size: [128, 128], frames: 6, ax: 0.5, ay: 0.66 });
  add('n.sheep.move', { dir: [], base: ['sheepmove', 'sheeprun'], size: [128, 128], frames: 4, ax: 0.5, ay: 0.66 });
  add('n.sheep.grass', { dir: [], base: ['sheepgrass'], size: [128, 128], frames: 12, ax: 0.5, ay: 0.66 });
  for (let i = 1; i <= 3; i++) {
    add(`n.cloud${i}`, { dir: [], base: [`clouds0${i}`, `cloud${i}`, `clouds${i}`], size: [576, 256], frames: 1, ax: 0.5, ay: 0.5, still: true });
  }
  add('r.wood', { dir: [], base: ['woodresource'], size: [64, 64], frames: 1, ax: 0.5, ay: 0.7 });
  add('r.gold', { dir: [], base: ['goldresource'], size: [64, 64], frames: 1, ax: 0.5, ay: 0.7 });
  add('r.meat', { dir: [], base: ['meatresource'], size: [64, 64], frames: 1, ax: 0.5, ay: 0.7 });

  // ---------- Hiệu ứng ----------
  add('fx.dust', { dir: [], base: ['dust01', 'dust1'], size: [64, 64], frames: 8, ax: 0.5, ay: 0.7 });
  add('fx.explosion', { dir: [], base: ['explosion01', 'explosion1'], size: [192, 192], frames: 8, ax: 0.5, ay: 0.6 });
  add('fx.fire', { dir: [], base: ['fire01', 'fire1'], size: [64, 64], frames: 8, ax: 0.5, ay: 0.85 });
  add('fx.splash', { dir: [], base: ['watersplash'], size: [192, 192], frames: 8, ax: 0.5, ay: 0.5 });

  // ---------- Địa hình ----------
  add('t.foam', { dir: [], base: ['waterfoam', 'foam'], size: [192, 192], frames: 16, ax: 0.5, ay: 0.5 });

  // ---------- Vật thể tự vẽ (không có trong bộ Free Pack) ----------
  const P = {
    'p.plot': [64, 64, 0.5, 0.5], 'p.well': [64, 96, 0.5, 0.92], 'p.fence': [64, 64, 0.5, 0.8],
    'p.wall': [64, 96, 0.5, 0.85], 'p.gate': [64, 96, 0.5, 0.85], 'p.campfire': [64, 64, 0.5, 0.75],
    'p.dock': [128, 128, 0.5, 0.75], 'p.stall': [192, 160, 0.5, 0.93], 'p.mill': [128, 192, 0.5, 0.95],
    'p.mill.blades': [160, 160, 0.5, 0.5], 'p.storage': [128, 128, 0.5, 0.92], 'p.pen': [192, 192, 0.5, 0.9],
    'p.statue': [128, 192, 0.5, 0.95], 'p.ruins': [320, 256, 0.5, 0.95], 'p.tent.red': [128, 128, 0.5, 0.92],
    'p.cart': [96, 64, 0.5, 0.85], 'p.boat': [192, 128, 0.5, 0.7], 'p.signpost': [64, 96, 0.5, 0.95],
    'p.chest': [48, 48, 0.5, 0.8], 'p.scaffold': [128, 128, 0.5, 0.95], 'p.flag': [32, 96, 0.5, 0.97],
    'p.smoke': [32, 32, 0.5, 0.5], 'p.shadow': [64, 24, 0.5, 0.5], 'p.selring': [80, 32, 0.5, 0.5],
    'p.berries': [64, 64, 0.5, 0.72], 'p.road': [64, 64, 0.5, 0.5], 'p.stone.pile': [64, 64, 0.5, 0.75],
  };
  for (const k in P) { const [w, h, ax, ay] = P[k]; add(k, { proc: true, size: [w, h], frames: 1, ax, ay, still: true }); }
  for (const c of COLORS) add(`p.banner.${c}`, { proc: true, size: [32, 96], frames: 4, ax: 0.5, ay: 0.97 });
  add('p.campfire.anim', { proc: true, size: [64, 64], frames: 6, ax: 0.5, ay: 0.75 });
  for (const crop of ['wheat', 'carrot', 'pumpkin']) {
    for (let s = 0; s <= 3; s++) add(`p.crop.${crop}.${s}`, { proc: true, size: [64, 64], frames: 1, ax: 0.5, ay: 0.75, still: true });
  }
  add('p.crop.withered', { proc: true, size: [64, 64], frames: 1, ax: 0.5, ay: 0.75, still: true });
  for (const who of ['hero', 'advisor', 'merchant', 'abbess', 'chief', 'warlord', 'villager', 'scout', 'stranger']) {
    add(`p.portrait.${who}`, { proc: true, size: [96, 96], frames: 1, ax: 0.5, ay: 0.5, still: true });
  }

  // ---------- Biểu tượng (32x32) ----------
  const ICONS = ['wood', 'stone', 'ore', 'gold', 'berry', 'wheat', 'carrot', 'pumpkin', 'meat', 'fish', 'wool',
    'flour', 'bread', 'cloth', 'tools', 'weapons', 'potion', 'stew', 'sheep', 'pop', 'morale', 'food', 'sword',
    'shield', 'bow', 'lance', 'heart', 'star', 'hammer', 'scroll', 'crown', 'clock', 'moon', 'sun', 'coin',
    'house', 'castle', 'trade', 'book', 'skull', 'fire', 'seed', 'flag', 'map', 'gear', 'chest'];
  for (const n of ICONS) add(`i.${n}`, { proc: true, size: [32, 32], frames: 1, ax: 0.5, ay: 0.5, still: true });

  // ---------- Chuẩn hoá & so khớp ----------
  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9/]/g, '');
  }

  /** Tách đường dẫn thành {dir, base} đã chuẩn hoá. */
  function splitPath(path) {
    const p = String(path).replace(/\\/g, '/');
    const slash = p.lastIndexOf('/');
    const dir = slash >= 0 ? p.slice(0, slash) : '';
    let file = slash >= 0 ? p.slice(slash + 1) : p;
    const dot = file.lastIndexOf('.');
    const ext = dot >= 0 ? file.slice(dot + 1).toLowerCase() : '';
    if (dot >= 0) file = file.slice(0, dot);
    return { dir: norm(dir), base: norm(file), ext };
  }

  /**
   * Từ danh sách đường dẫn file (trong zip / thư mục), tìm file ứng với từng khoá.
   * Trả về { key: path }.
   */
  function matchFiles(paths) {
    const files = [];
    for (const p of paths) {
      const s = splitPath(p);
      if (s.ext !== 'png') continue;
      // bỏ file rác của macOS (__MACOSX/._Ten.png)
      if (/(^|\/)(__macosx|\._)/i.test(String(p).replace(/\\/g, '/'))) continue;
      files.push({ path: p, dir: s.dir, base: s.base });
    }
    const out = {};
    for (const key in entries) {
      const e = entries[key];
      if (e.proc) continue;
      let best = null;
      for (const b of e.base) {
        for (const f of files) {
          if (f.base !== b) continue;
          if (!e.dir.every((t) => f.dir.includes(t))) continue;
          if (!best || f.path.length < best.path.length) best = f;
        }
        if (best) break;
      }
      if (best) out[key] = best.path;
    }
    return out;
  }

  /** Suy ra số khung hình từ kích thước ảnh thật. */
  function inferFrames(key, w, h) {
    const e = entries[key];
    if (!e || e.still) return { n: 1, fw: w, fh: h };
    if (e.fw && w % e.fw === 0 && w > e.fw) return { n: w / e.fw, fw: e.fw, fh: h };
    if (h > 0 && w % h === 0) return { n: w / h, fw: h, fh: h };
    return { n: 1, fw: w, fh: h };
  }

  root.TS_CATALOG = { COLORS, UNIT_ANIMS, entries, norm, splitPath, matchFiles, inferFrames };
})(typeof window !== 'undefined' ? window : globalThis);
