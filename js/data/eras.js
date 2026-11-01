/* Thời đại (Đồ đá → Hiện đại): mẫu công trình theo thời đại, công trình & quân mới, quân giặc theo thời đại. */
(function (root) {
  'use strict';
  const G = root.G;

  // skin: a = cổ đại, med = trung cổ (Tiny Swords), g = thuốc súng/công nghiệp, m = hiện đại
  G.ERAS = [
    { id: 'stone', name: 'Thời Đồ Đá', short: 'Đồ đá', skin: 'a', wall: 'palisade', gate: 'wood', road: 'dirt', tower: 0.8, house: 3, color: '#c9a36a' },
    { id: 'bronze', name: 'Thời Đồ Đồng', short: 'Đồ đồng', skin: 'a', wall: 'palisade', gate: 'wood', road: 'dirt', tower: 0.9, house: 3, color: '#d8954a', cost: { wood: 80, stone: 40, gold: 60 }, pop: 6 },
    { id: 'iron', name: 'Thời Đồ Sắt', short: 'Đồ sắt', skin: 'med', wall: 'stone', gate: 'wood', road: 'dirt', tower: 1, house: 4, color: '#9aa7b8', cost: { wood: 150, stone: 100, gold: 200, tools: 10 }, pop: 12 },
    { id: 'medieval', name: 'Thời Trung Cổ', short: 'Trung cổ', skin: 'med', wall: 'stone', gate: 'wood', road: 'dirt', tower: 1.15, house: 4, color: '#5ad1ff', cost: { stone: 200, gold: 400, tools: 20, cloth: 10 }, pop: 18 },
    { id: 'gunpowder', name: 'Thời Thuốc Súng', short: 'Thuốc súng', skin: 'g', wall: 'brick', gate: 'iron', road: 'cobble', tower: 1.5, house: 5, color: '#e07a4a', proj: 'bullet', cost: { gold: 700, tools: 30, weapons: 20, cloth: 20 }, pop: 24 },
    { id: 'industrial', name: 'Thời Công Nghiệp', short: 'Công nghiệp', skin: 'g', wall: 'brick', gate: 'iron', road: 'cobble', tower: 1.9, house: 5, color: '#c2c2c2', proj: 'bullet', cost: { gold: 1200, gunpowder: 30, tools: 40, stone: 300 }, pop: 30 },
    { id: 'modern', name: 'Thời Hiện Đại', short: 'Hiện đại', skin: 'm', wall: 'concrete', gate: 'steel', road: 'asphalt', tower: 2.5, house: 6, color: '#7cf0a8', proj: 'bullet', cost: { gold: 2500, steel: 60, fuel: 30, tools: 60 }, pop: 38 },
  ];

  // Tên công trình quen thuộc đổi theo thời đại
  G.ERA_NAMES = {
    castle: ['Nhà lớn bộ lạc', 'Nhà lớn bộ lạc', 'Thành trì', 'Lâu đài', 'Pháo đài', 'Toà thị chính', 'Sở chỉ huy'],
    house: ['Lều tranh', 'Lều tranh', 'Nhà dân', 'Nhà dân', 'Nhà gạch', 'Nhà gạch', 'Chung cư'],
    storage: ['Hầm chứa', 'Hầm chứa', 'Nhà kho', 'Nhà kho', 'Nhà kho gạch', 'Nhà kho gạch', 'Bãi container'],
    tower: ['Chòi canh', 'Chòi canh', 'Tháp canh', 'Tháp canh', 'Tháp súng', 'Tháp súng', 'Tháp gác thép'],
    barracks: ['Nhà chiến binh', 'Nhà chiến binh', 'Doanh trại', 'Doanh trại', 'Trại lính', 'Trại lính', 'Căn cứ quân sự'],
    archery: ['Bãi tập lao', 'Bãi tập lao', 'Trường bắn', 'Trường bắn', 'Trường bắn súng', 'Trường bắn súng', 'Trường bắn'],
    monastery: ['Đền đá', 'Đền đá', 'Tu viện', 'Tu viện', 'Nhà thờ', 'Nhà thờ', 'Nhà thờ'],
    market: ['Bãi đổi hàng', 'Bãi đổi hàng', 'Chợ', 'Chợ', 'Chợ có mái', 'Chợ có mái', 'Siêu thị'],
    mill: ['Cối đá', 'Cối đá', 'Cối xay gió', 'Cối xay gió', 'Nhà máy xay', 'Nhà máy xay', 'Tháp silo'],
    wall: ['Tường cọc', 'Tường cọc', 'Tường đá', 'Tường đá', 'Tường gạch', 'Tường gạch', 'Tường bê tông'],
  };

  // Thời đại tối thiểu của các công trình cũ khi chơi chế độ thời đại
  const ERA_OF = {
    house: 0, plot: 0, campfire: 0, well: 0, storage: 0, pen: 0, road: 0, fence: 0, gate: 0, dock: 0, barracks: 0, tower: 0, archery: 0, wall: 0,
    mill: 1, bakery: 1, smithy: 1, weaver: 1, market: 1, monastery: 1, kitchen: 2, statue: 2,
  };
  for (const k in ERA_OF) G.BUILDINGS[k].era = ERA_OF[k];
  G.BUILDINGS.archery.trains = ['hunter', 'archer', 'musketeer', 'rifleman'];
  G.BUILDINGS.barracks.trains = ['caveman', 'spearman', 'warrior', 'lancer', 'musketeer', 'cannon', 'rifleman', 'soldier'];
  G.BUILDINGS.monastery.trains = ['monk'];

  // ---------- Công trình mới ----------
  Object.assign(G.BUILDINGS, {
    hunter: { name: 'Lều thợ săn', w: 2, h: 2, hp: 260, cost: { wood: 25 }, work: 25, tier: 1, era: 0, sprite: 'e.hunter', slots: 2, recipes: [{ in: {}, out: { meat: 1 }, t: 18 }], desc: 'Thợ săn mang thịt về (không cần nguyên liệu).' },
    totem: { name: 'Cột vật tổ', w: 1, h: 1, hp: 200, cost: { wood: 20, stone: 10 }, work: 12, tier: 1, era: 0, sprite: 'e.totem', morale: 2, desc: '+2 lòng dân mỗi ngày.' },
    powdermill: { name: 'Xưởng thuốc súng', w: 2, h: 2, hp: 380, cost: { wood: 60, stone: 60, gold: 80 }, work: 45, tier: 4, era: 4, sprite: 'e.powdermill', slots: 2, recipes: [{ in: { wood: 1, stone: 1 }, out: { gunpowder: 1 }, t: 11 }], desc: '1 gỗ + 1 đá → 1 thuốc súng.' },
    cannontower: { name: 'Tháp pháo', w: 2, h: 2, hp: 900, cost: { stone: 120, gold: 120, gunpowder: 10 }, work: 60, tier: 4, era: 4, sprite: 'e.cannontower', shoot: { range: 8, dmg: 34, cd: 2.6, aoe: 1.3, proj: 'shell' }, light: 4, desc: 'Bắn đạn pháo nổ lan, tầm 8 ô.' },
    sandbag: { name: 'Bao cát', w: 1, h: 1, hp: 420, cost: { wood: 1, stone: 2 }, work: 2, tier: 4, era: 4, drag: true, wall: true, wallStyle: 'sandbag', noLabel: true, desc: 'Ụ bao cát rẻ, dựng nhanh.' },
    blastfurnace: { name: 'Lò cao', w: 2, h: 2, hp: 500, cost: { stone: 150, gold: 200, tools: 10 }, work: 60, tier: 4, era: 5, sprite: 'e.blastfurnace', smoke: true, slots: 2, recipes: [{ in: { ore: 2, wood: 2 }, out: { steel: 1 }, t: 13 }], desc: '2 quặng + 2 gỗ → 1 thép.' },
    factory: { name: 'Nhà máy', w: 3, h: 2, hp: 700, cost: { stone: 200, steel: 10, gold: 300 }, work: 70, tier: 4, era: 5, sprite: 'e.factory', smoke: true, slots: 3, recipes: [{ id: 'weapons', in: { ore: 2, wood: 1 }, out: { weapons: 2 }, t: 12 }, { id: 'tools', in: { ore: 1, wood: 2 }, out: { tools: 2 }, t: 10 }, { id: 'cloth', in: { wool: 2 }, out: { cloth: 2 }, t: 10 }], desc: 'Sản xuất hàng loạt: vũ khí, công cụ, vải gấp đôi.' },
    bank: { name: 'Ngân hàng', w: 2, h: 2, hp: 500, cost: { stone: 150, gold: 500 }, work: 50, tier: 4, era: 5, sprite: 'e.bank', income: 35, desc: '+35 vàng mỗi sáng, thuế +20%.' },
    oilwell: { name: 'Giếng dầu', w: 2, h: 2, hp: 400, cost: { steel: 8, gold: 200 }, work: 45, tier: 4, era: 5, sprite: 'e.oilwell', anim: true, slots: 1, recipes: [{ in: {}, out: { fuel: 1 }, t: 16 }], desc: 'Bơm xăng dầu cho xe tăng và quân hiện đại.' },
    barbed: { name: 'Rào thép gai', w: 1, h: 1, hp: 260, cost: { steel: 1 }, work: 2, tier: 4, era: 5, drag: true, ground: true, barbed: true, wallStyle: 'barbed', noLabel: true, desc: 'Giặc đi qua bị chậm và bị thương. Quân ta đi qua được.' },
    hospital: { name: 'Bệnh viện', w: 3, h: 2, hp: 700, cost: { stone: 200, steel: 10, gold: 400 }, work: 60, tier: 4, era: 5, sprite: 'e.m.monastery', trains: ['medic'], heal: { range: 9, hp: 6 }, morale: 2, desc: 'Hồi máu quân ta trong 9 ô, luyện Quân y, +2 lòng dân.' },
    bunker: { name: 'Ụ súng máy', w: 2, h: 2, hp: 1200, cost: { stone: 120, steel: 15, gold: 200 }, work: 50, tier: 4, era: 6, sprite: 'e.bunker', shoot: { range: 6.5, dmg: 10, cd: 0.22, proj: 'bullet' }, desc: 'Bắn liên thanh tầm gần.' },
    artillery: { name: 'Trận địa pháo', w: 2, h: 2, hp: 900, cost: { stone: 100, steel: 25, gold: 350 }, work: 60, tier: 4, era: 6, sprite: 'e.artillery', shoot: { range: 11, dmg: 60, cd: 4, aoe: 1.7, proj: 'shell' }, desc: 'Pháo tầm xa 11 ô, nổ lan.' },
    missile: { name: 'Bệ tên lửa', w: 2, h: 2, hp: 1000, cost: { steel: 40, fuel: 20, gold: 700 }, work: 80, tier: 4, era: 6, sprite: 'e.missile', shoot: { range: 15, dmg: 150, cd: 9, aoe: 2.4, proj: 'missile' }, desc: 'Tên lửa tầm 15 ô, sức nổ cực lớn.' },
    radar: { name: 'Trạm radar', w: 2, h: 2, hp: 600, cost: { steel: 20, gold: 400 }, work: 50, tier: 4, era: 6, sprite: 'e.radar', anim: true, radar: 9, desc: 'Báo trước quân số giặc; tháp trong 9 ô bắn xa hơn 20%.' },
    powerplant: { name: 'Nhà máy điện', w: 3, h: 2, hp: 900, cost: { stone: 250, steel: 30, gold: 600 }, work: 80, tier: 4, era: 6, sprite: 'e.powerplant', smoke: true, power: 11, desc: 'Xưởng sản xuất trong 11 ô chạy nhanh hơn 40%.' },
    tankfactory: { name: 'Xưởng xe tăng', w: 3, h: 2, hp: 1100, cost: { stone: 250, steel: 40, gold: 800 }, work: 90, tier: 4, era: 6, sprite: 'e.tankfactory', trains: ['tank', 'artillery_u'], desc: 'Sản xuất xe tăng và pháo tự hành.' },
  });
  G.BUILD_MENU[0].items.push('hunter', 'totem');
  G.BUILD_MENU[1].items.push('powdermill', 'blastfurnace', 'factory', 'oilwell', 'bank');
  G.BUILD_MENU[2].items.push('cannontower', 'bunker', 'artillery', 'missile', 'radar', 'hospital', 'tankfactory', 'powerplant', 'sandbag', 'barbed');

  // ---------- Vật phẩm mới ----------
  Object.assign(G.ITEMS, {
    gunpowder: { name: 'Thuốc súng', price: 14, icon: 'i.gunpowder', cat: 'goods' },
    steel: { name: 'Thép', price: 30, icon: 'i.steel', cat: 'goods' },
    fuel: { name: 'Xăng dầu', price: 24, icon: 'i.fuel', cat: 'goods' },
  });
  G.ITEM_ORDER = Object.keys(G.ITEMS);
  for (const f of ['yellow', 'black']) {
    G.FACTIONS[f].buy.gunpowder = 0.9; G.FACTIONS[f].buy.steel = 0.9; G.FACTIONS[f].buy.fuel = 0.9;
  }
  G.FACTIONS.yellow.sell.gunpowder = 1.3; G.FACTIONS.black.sell.steel = 1.1;

  // ---------- Quân mới (era: có từ thời đại, eraMax: lỗi thời sau thời đại) ----------
  Object.assign(G.UNITS, {
    caveman: { name: 'Chiến binh chuỳ', kind: 'caveman', anim: 'attack', hp: 95, dmg: 10, range: 52, cd: 1.1, speed: 140, armor: 1, cost: { gold: 12, wood: 4 }, train: 12, upkeep: 1, eat: 2, era: 0, eraMax: 1 },
    hunter: { name: 'Thợ săn ném lao', kind: 'hunter', anim: 'throw', hp: 60, dmg: 9, range: 260, cd: 1.6, speed: 140, armor: 0, cost: { gold: 15, wood: 6 }, train: 14, upkeep: 1, eat: 2, ranged: true, proj: 'javelin', era: 0, eraMax: 1 },
    spearman: { name: 'Lính giáo', kind: 'spearman', anim: 'attack', hp: 130, dmg: 13, range: 66, cd: 1.0, speed: 140, armor: 2, cost: { gold: 25, weapons: 1 }, train: 15, upkeep: 2, eat: 2, era: 1, eraMax: 2, bonus: { lancer: 1.6 } },
    musketeer: { name: 'Lính hoả mai', kind: 'musketeer', anim: 'shoot', hp: 115, dmg: 26, range: 330, cd: 2.2, speed: 140, armor: 2, cost: { gold: 45, weapons: 2, gunpowder: 2 }, train: 20, upkeep: 3, eat: 3, ranged: true, proj: 'bullet', era: 4, eraMax: 5 },
    cannon: { name: 'Pháo thần công', kind: 'cannon', anim: 'shoot', hp: 230, dmg: 45, range: 420, cd: 4, speed: 90, armor: 4, cost: { gold: 90, weapons: 3, gunpowder: 4 }, train: 30, upkeep: 4, eat: 2, ranged: true, aoe: 1.3, proj: 'shell', siege: true, era: 4, eraMax: 5, vehicle: true },
    rifleman: { name: 'Lính súng trường', kind: 'rifleman', anim: 'shoot', hp: 145, dmg: 30, range: 360, cd: 1.4, speed: 150, armor: 3, cost: { gold: 60, weapons: 2, gunpowder: 2 }, train: 20, upkeep: 3, eat: 3, ranged: true, proj: 'bullet', era: 5, eraMax: 6 },
    soldier: { name: 'Lính đặc nhiệm', kind: 'soldier', anim: 'shoot', hp: 190, dmg: 24, range: 380, cd: 0.7, speed: 165, armor: 5, cost: { gold: 90, weapons: 2, fuel: 1 }, train: 22, upkeep: 4, eat: 3, ranged: true, proj: 'bullet', era: 6 },
    medic: { name: 'Quân y', kind: 'medic', anim: 'heal', hp: 120, dmg: 0, heal: 30, range: 260, cd: 1.6, speed: 160, armor: 2, cost: { gold: 70, potion: 2 }, train: 20, upkeep: 3, eat: 3, healer: true, era: 5 },
    tank: { name: 'Xe tăng', kind: 'tank', anim: 'shoot', hp: 950, dmg: 70, range: 420, cd: 2.4, speed: 120, armor: 18, cost: { gold: 260, steel: 8, fuel: 4 }, train: 40, upkeep: 6, eat: 0, ranged: true, aoe: 1.2, proj: 'shell', siege: true, era: 6, vehicle: true },
    artillery_u: { name: 'Pháo tự hành', kind: 'artillery', anim: 'shoot', hp: 320, dmg: 90, range: 620, cd: 5, speed: 95, armor: 5, cost: { gold: 220, steel: 5, fuel: 3, gunpowder: 4 }, train: 36, upkeep: 5, eat: 0, ranged: true, aoe: 1.8, proj: 'missile', siege: true, era: 6, vehicle: true },
  });
  G.UNITS.warrior.era = 2; G.UNITS.warrior.eraMax = 4;
  G.UNITS.archer.era = 1; G.UNITS.archer.eraMax = 4;
  G.UNITS.lancer.era = 3; G.UNITS.lancer.eraMax = 5;
  G.UNITS.monk.era = 2; G.UNITS.monk.eraMax = 4;

  // Bản quân giặc của các đơn vị mới
  for (const k of ['caveman', 'hunter', 'spearman', 'musketeer', 'cannon', 'rifleman', 'soldier', 'medic', 'tank', 'artillery_u']) {
    const d = G.UNITS[k];
    const e = Object.assign({}, d, { name: d.name + ' giặc', loot: Math.round(d.hp / 9) + 3 });
    delete e.cost; delete e.upkeep; delete e.eat;
    G.UNITS['red_' + k] = e;
    G.RAID_COST['red_' + k] = Math.max(1, Math.round(d.hp / 70 * 10) / 10);
  }

  // Quân giặc đổi theo thời đại: vai trò → loại quân
  const ENEMY = [
    { raider: 'red_caveman', torch: 'torch', redwarrior: 'red_caveman', redarcher: 'red_hunter', redlancer: 'red_caveman', redmonk: 'red_hunter' },
    { raider: 'raider', torch: 'torch', redwarrior: 'red_spearman', redarcher: 'redarcher', redlancer: 'red_spearman', redmonk: 'redarcher' },
    null, null,
    { raider: 'raider', torch: 'torch', redwarrior: 'redwarrior', redarcher: 'red_musketeer', redlancer: 'redlancer', redmonk: 'red_cannon' },
    { raider: 'red_rifleman', torch: 'torch', redwarrior: 'red_rifleman', redarcher: 'red_rifleman', redlancer: 'red_cannon', redmonk: 'red_medic' },
    { raider: 'red_soldier', torch: 'red_soldier', redwarrior: 'red_soldier', redarcher: 'red_soldier', redlancer: 'red_tank', redmonk: 'red_medic' },
  ];
  G.Eras = {
    era() { return G.S && G.S.era != null ? G.S.era : 3; },
    def(e) { return G.ERAS[e == null ? this.era() : e]; },
    skin() { return this.def().skin; },
    /** Loại quân giặc tương ứng thời đại (giặc không bao giờ đi trước người chơi quá một thời đại). */
    enemyType(type, era) {
      const m = ENEMY[era == null ? this.enemyEra() : era];
      return (m && m[type]) || type;
    },
    enemyEra() {
      const S = G.S;
      if (!S) return 3;
      if (S.ai && S.ai.era != null) return S.ai.era;
      return S.era != null ? S.era : 3;
    },
    /** Tên công trình theo thời đại. */
    bname(type) {
      const n = G.ERA_NAMES[type];
      return n && G.Modes && G.Modes.eraMode() ? n[this.era()] : G.BUILDINGS[type].name;
    },
    /** Sprite công trình theo thời đại (mẫu cổ đại / thuốc súng / hiện đại). */
    sprite(b) {
      const d = G.BUILDINGS[b.type];
      if (b.team !== 0 || !G.Modes || !G.Modes.eraMode()) return null;
      const skin = this.skin();
      if (skin === 'med') return null;
      const SK = { castle: 'castle', house: 'house', storage: 'storage', tower: 'tower', barracks: 'barracks', archery: 'archery', mill: 'mill', market: 'market', monastery: 'monastery', smithy: 'workshop', bakery: 'workshop', weaver: 'workshop', kitchen: 'workshop' };
      const t = SK[b.type];
      if (!t) return null;
      void d;
      return `e.${skin}.${t}`;
    },
    wallStyle(b) {
      const d = G.BUILDINGS[b.type];
      if (d.wallStyle) return d.wallStyle;
      if (b.type === 'fence') return 'fence';
      if (b.type === 'wall') return G.Modes && G.Modes.eraMode() ? this.def().wall : 'stone';
      return null;
    },
    gateStyle() { return G.Modes && G.Modes.eraMode() ? this.def().gate : 'wood'; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
