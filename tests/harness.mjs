// Nạp mã mô phỏng của game vào Node (không cần trình duyệt) để kiểm thử.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const SIM_SCRIPTS = [
  'js/core/util.js', 'js/data/defs.js', 'js/data/story.js', 'js/data/events.js',
  'js/game/path.js', 'js/game/world.js', 'js/game/entities.js', 'js/game/time.js',
  'js/game/village.js', 'js/game/military.js', 'js/game/economy.js', 'js/game/hero.js',
  'js/game/quests.js', 'js/game/game.js',
];

export function loadGame(seed = 12345) {
  // Math.random có seed để kiểm thử lặp lại được
  const math = Object.create(Math);
  let a = seed >>> 0;
  math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ctx = { console, Math: math, JSON, Date, setTimeout: (fn) => fn(), localStorage: memoryStorage() };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of SIM_SCRIPTS) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  const G = ctx.G;
  const log = [];
  G.UI = {
    toast: (m) => log.push(m), log: (m) => log.push(m), ping() {}, chapter() {}, banner() {}, refresh() {},
    dialog: (lines, cb) => { if (cb) cb(); }, choice: (t, opts) => { opts[0].fn(); },
    event: (title, text, p, opts) => { const o = opts.find((x) => !x.disabled); if (o) o.fn(); },
    modalOpen: () => false, selectBuilding() {}, openTrade() {}, endScreen() {},
  };
  G.Audio = { play() {}, playAt() {} };
  G.Render = { shake() {}, snapCamera() {} };
  G.Input = { down: () => false, joy: null };
  return { G, log };
}

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

/** Chạy mô phỏng `seconds` giây (thời gian game, tốc độ 1x). */
export function run(G, seconds, dt = 0.05) {
  for (let t = 0; t < seconds; t += dt) G.Game.step(dt);
}
