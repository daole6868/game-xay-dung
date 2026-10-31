import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, run } from './harness.mjs';
import { playDays } from './bot.mjs';

const T = 64;

test('bản đồ: cùng seed cho cùng địa hình, mọi địa danh đi tới được từ lâu đài', () => {
  const a = loadGame().G;
  a.Game.newGame({ seed: 2026 });
  const b = loadGame().G;
  b.Game.newGame({ seed: 2026 });
  assert.deepEqual(Array.from(a.World.ground), Array.from(b.World.ground));
  assert.equal(a.S.nodes.length, b.S.nodes.length);
  const c = a.World.PLACES.castle;
  for (const k of ['yellow', 'purple', 'black', 'A', 'B', 'C', 'F']) {
    const p = a.World.PLACES[k];
    const path = a.Path.find(c.tx + 2, c.ty + 3, p.tx, p.ty + 3, { team: 0, near: true, maxIter: 40000 });
    assert.ok(path, `không có đường tới ${k}`);
  }
});

test('khởi đầu: có Hiệp sĩ, 3 dân, quân sư, tàn tích lâu đài và nhiệm vụ đầu', () => {
  const { G } = loadGame();
  G.Game.newGame({ seed: 1 });
  assert.ok(G.Hero.unit());
  assert.equal(G.Village.villagers().length, 3);
  assert.ok(G.S.units.find((u) => u.role === 'advisor'));
  assert.ok(G.byId(G.S.castleId).ruined);
  assert.deepEqual([...G.S.quests.active], ['q_advisor']);
  assert.equal(Object.keys(G.S.camps).length, 4);
});

test('kinh tế: bán dồn làm giá tụt, giá hồi lại theo ngày, mua luôn đắt hơn bán', () => {
  const { G } = loadGame();
  G.Game.newGame({ seed: 5 });
  const E = G.Economy;
  G.S.stock.bread = 100;
  const before = E.sellPrice('bread', 'market');
  assert.ok(E.buyPrice('bread', 'market') > before);
  const g = E.sell('bread', 40, 'market');
  assert.ok(g > 0);
  const after = E.sellPrice('bread', 'market');
  assert.ok(after < before * 0.6, `giá phải tụt: ${before} → ${after}`);
  G.S.demand = null;
  for (let i = 0; i < 6; i++) E.daily();
  G.S.demand = null;
  assert.ok(E.sellPrice('bread', 'market') > after * 1.4, 'giá phải hồi lại');
  // không thể mua rồi bán lại cùng chỗ để lời
  G.S.gold = 1000;
  const gold0 = G.S.gold;
  E.buy('stone', 10, 'market');
  E.sell('stone', 10, 'market');
  assert.ok(G.S.gold < gold0);
});

test('kinh tế: mỗi thế lực chỉ mua món họ cần; uy tín làm giá tốt hơn', () => {
  const { G } = loadGame();
  G.Game.newGame({ seed: 5 });
  const E = G.Economy;
  assert.equal(E.sellPrice('stone', 'purple'), null);
  assert.ok(E.sellPrice('bread', 'purple') > E.sellPrice('bread', 'market'));
  const p0 = E.sellPrice('meat', 'black');
  G.S.rep.black = 80;
  assert.ok(E.sellPrice('meat', 'black') > p0);
});

test('nông trại: ruộng được gieo, lớn và gặt ra nông sản', () => {
  const { G } = loadGame();
  G.Game.newGame({ seed: 9 });
  const c = G.byId(G.S.castleId);
  let plot = null;
  for (let dx = 0; dx < 10 && !plot; dx++) plot = G.Build.place('plot', c.tx + dx, c.ty + 8, true);
  assert.ok(plot);
  plot.progress = 1; G.Build.work(plot, 1);
  G.Village.setJob('forager', 0);
  G.Village.setJob('farmer', 1);
  run(G, G.DAY_LEN * 2.2);
  assert.ok((G.S.stats.harvested || 0) > 0, 'phải gặt được ít nhất một lần');
});

test('quân sự: tháp canh bắn hạ quân cướp tới gần', () => {
  const { G } = loadGame();
  G.Game.newGame({ seed: 3 });
  const c = G.byId(G.S.castleId);
  G.S.stock.wood = 500; G.S.stock.stone = 500; G.S.tier = 2;
  let tower = null;
  for (let dx = 6; dx < 14 && !tower; dx++) tower = G.Build.place('tower', c.tx + dx, c.ty - 3, true);
  assert.ok(tower);
  tower.progress = 1; G.Build.work(tower, 1);
  const e = G.Units.create('raider', tower.x + 3 * T, tower.y + T, 1, { raid: true, homeX: tower.x + 3 * T, homeY: tower.y });
  run(G, 25);
  assert.ok(e.dead, 'quân cướp phải bị hạ');
});

test('lưu và tải: trạng thái giữ nguyên và chơi tiếp được', () => {
  const { G } = loadGame();
  G.Game.newGame({ seed: 77 });
  run(G, 60);
  G.S.gold = 1234;
  const units = G.S.units.length, nodes = G.S.nodes.length, buildings = G.S.buildings.length;
  assert.ok(G.Game.save('1'));
  G.Game.newGame({ seed: 99 });
  assert.ok(G.Game.load('1'));
  assert.equal(G.S.gold, 1234);
  assert.equal(G.S.units.length, units);
  assert.equal(G.S.nodes.length, nodes);
  assert.equal(G.S.buildings.length, buildings);
  assert.ok(G.World.bmap[G.byId(G.S.castleId).ty * G.World.W + G.byId(G.S.castleId).tx]);
  run(G, 30);
});

test('đánh trại: quân ta phá được Tiền đồn Đông', () => {
  const { G } = loadGame();
  G.Game.newGame({ seed: 11 });
  const p = G.World.PLACES.A;
  for (let i = 0; i < 14; i++) G.Units.spawnSoldier(i % 3 === 2 ? 'archer' : 'warrior', (p.tx - 10) * T, (p.ty + 1 + (i % 4)) * T, { squad: 'B', rank: 2 });
  G.Military.refreshAllBuffs();
  for (const u of G.S.units) if (u.soldier) u.hp = u.maxHp;
  G.Military.orderAttack((p.tx + 0.5) * T, (p.ty + 0.5) * T);
  run(G, 200);
  assert.ok(G.campDead('A'), 'trại A phải bị phá');
});

test('chơi tự động 8 ngày không lỗi, làng phát triển', () => {
  const { G } = loadGame();
  G.Game.newGame({ seed: 4242 });
  playDays(G, 8);
  assert.equal(G.Game.over, false);
  assert.ok(G.S.day >= 9);
  assert.ok(G.S.villagers > 5, 'dân phải tăng');
  assert.ok(G.S.flags.castleRepaired, 'lâu đài phải được phục dựng');
  assert.ok(G.S.quests.done.q_fire, 'phải xong nhiệm vụ lửa trại');
});

test('tuyến buôn: thương lái chở hàng đi bán và mang tiền về', () => {
  const { G } = loadGame();
  G.Game.newGame({ seed: 21 });
  const S = G.S;
  S.flags.met_purple = true;
  S.stock.bread = 200;
  G.Economy.addRoute('purple', 'bread', 10, 'potion', 3);
  G.Village.setJob('forager', 0);
  G.Village.setJob('trader', 1);
  const gold0 = S.gold;
  run(G, 200);
  assert.ok(S.stats.trips >= 1, 'phải chạy xong ít nhất một chuyến');
  assert.ok(S.stock.bread < 200);
  assert.ok(S.gold > gold0 || S.stock.potion > 0);
});

test('mọi nhiệm vụ tính tiến độ được; trận cuối: hạ Bạo chúa là thắng', () => {
  const { G } = loadGame();
  G.Game.newGame({ seed: 31 });
  for (const id in G.QUESTS) {
    const [cur, max] = G.QUESTS[id].progress();
    assert.ok(Number.isFinite(cur) && max > 0, id);
  }
  let won = false;
  G.UI.endScreen = (w) => { won = w; };
  const p = G.World.PLACES.F;
  for (let i = 0; i < 30; i++) G.Units.spawnSoldier(['warrior', 'archer', 'lancer', 'monk', 'warrior'][i % 5], (p.tx - 12) * T, (p.ty - 2 + (i % 6)) * T, { squad: 'B', rank: 3 });
  G.Military.refreshAllBuffs();
  for (const u of G.S.units) if (u.soldier) u.hp = u.maxHp;
  G.S.quests.active = ['q_final'];
  G.Military.orderAttack((p.tx + 0.5) * T, (p.ty + 0.5) * T);
  for (let t = 0; t < 900 && !G.S.flags.bossDead; t += 10) {
    run(G, 10);
    // tiếp viện cho đủ sức
    if (G.S.units.filter((u) => u.soldier).length < 12) for (let i = 0; i < 6; i++) G.Units.spawnSoldier('lancer', (p.tx - 8) * T, (p.ty + i - 2) * T, { squad: 'B', rank: 3 });
  }
  assert.ok(G.S.flags.bossDead, 'Bạo chúa phải bị hạ');
  run(G, 2);
  assert.ok(won, 'phải hiện màn hình chiến thắng');
});

test('dời công trình: giữ tiến độ, người và cừu đi theo, không dời được lâu đài', () => {
  const { G } = loadGame();
  G.Game.newGame({ seed: 8 });
  const S = G.S, W = G.World;
  const c = G.byId(S.castleId);
  S.stock.wood = 500; S.stock.stone = 500;
  const find = (type) => { for (let dy = 5; dy < 12; dy++) for (let dx = -8; dx < 14; dx++) if (!G.Build.canPlace(type, c.tx + dx, c.ty + dy) && !G.Build.canPlace(type, c.tx + dx + 3, c.ty + dy)) return { x: c.tx + dx, y: c.ty + dy }; };
  const p = find('pen');
  const pen = G.Build.place('pen', p.x, p.y, true);
  pen.progress = 1; G.Build.work(pen, 1);
  G.Village.addSheepToPens(2);
  const sheep = S.units.filter((u) => u.sheep && u.pen === pen.id);
  const sx = sheep[0].x;
  // chồng lên một phần chỗ cũ của chính nó vẫn được
  assert.equal(G.Build.canPlace('pen', p.x + 1, p.y, pen.id), '');
  assert.equal(G.Build.move(pen, p.x + 3, p.y), '');
  assert.equal(pen.tx, p.x + 3);
  assert.equal(W.bmap[p.y * W.W + p.x], 0, 'chỗ cũ phải trống');
  assert.equal(W.bmap[p.y * W.W + p.x + 3], pen.id);
  assert.equal(Math.round(sheep[0].x - sx), 3 * T, 'cừu đi theo chuồng');
  assert.ok(G.Build.move(c, c.tx + 1, c.ty), 'lâu đài không dời được');
  run(G, 20);
});
