/* Vòng đời ván chơi: tạo mới, cập nhật mỗi khung, sang ngày, nâng bậc, nghiên cứu, lưu/tải, thắng/thua. */
(function (root) {
  'use strict';
  const G = root.G;
  const T = G.TILE;
  const SAVE_KEY = 'guomlua_save_';

  function freshState(opts) {
    const diff = G.DIFFICULTY[opts.difficulty] || G.DIFFICULTY.normal;
    const stock = {};
    for (const k of G.ITEM_ORDER) stock[k] = 0;
    Object.assign(stock, { wood: Math.round(15 * diff.start), stone: Math.round(12 * diff.start), berry: Math.round(24 * diff.start), wheat: 10, carrot: 6 });
    const mode = opts.mode || 'campaign';
    const md = G.MODES[mode];
    if (md.peaceful && mode === 'sandbox') { for (const k of ['wood', 'stone']) stock[k] *= 6; stock.berry += 40; }
    return {
      v: 2, mode, mapId: md.fixedMap || opts.mapId || 'binhminh', era: md.eras ? (opts.era != null ? opts.era : md.startEra || 0) : 3, ai: null,
      seed: opts.seed, difficulty: opts.difficulty, heroName: opts.heroName || 'Lam Phong',
      day: 1, time: 0.04, speed: 1, weather: 'clear',
      gold: Math.round((mode === 'sandbox' ? 500 : 80) * diff.start), stock, ration: {}, tax: 2, morale: 60,
      units: [], buildings: [], nodes: [], drops: [],
      heroId: 0, castleId: 0,
      hero: { lvl: 1, xp: 0, hunger: 100, gear: {}, cds: {}, potionCd: 0, order: null, work: null, respawnT: 0 },
      jobWant: { woodcutter: 1, forager: 1, builder: 1 },
      tier: 1, techs: {}, research: null,
      markets: {}, rep: { yellow: 0, purple: 0, black: 0 }, contracts: [], routes: [], demand: null, rare: null,
      army: { mode: 'guard', rally: null, defaultSquad: 'A' },
      camps: {}, raid: null, alarm: null,
      quests: { chapter: 1, active: [], done: {} },
      flags: {}, stats: {}, settings: { autoEat: true }, villagers: 0,
    };
  }

  const Game = {
    running: false,
    over: false,
    stepN: 0,

    newGame(opts) {
      G.ents.clear();
      G.setNextId(1);
      G.S = freshState(Object.assign({ seed: (Math.random() * 1e9) | 0, difficulty: 'normal' }, opts));
      const S = G.S;
      G.Military.projectiles = [];
      G.FX.clear();
      G.World.setup(S.mapId, S.seed);
      if (G.Render.buildTiles) { G.Render.buildTiles(); G.Render.minimapBase = null; }
      G.World.generate(S.seed);
      const c = G.byId(S.castleId);
      const fx = (c.tx + 2.5) * T, fy = (c.ty + c.h + 1.2) * T;
      if (G.Modes.eraMode()) {
        // các chế độ thời đại: trung tâm vương quốc đã dựng sẵn, bắt đầu ở thời đại đã chọn
        c.ruined = false; c.hp = c.maxHp; S.flags.castleRepaired = true;
        G.Modes.setEra(S.era);
        c.hp = c.maxHp;
        if (S.era >= 2) { S.stock.wood += 40 * S.era; S.stock.stone += 30 * S.era; S.gold += 80 * S.era; }
        if (S.era >= 4) { S.stock.tools += 10; S.stock.weapons += 6; S.stock.gunpowder += 6; }
        if (S.era >= 6) { S.stock.steel += 10; S.stock.fuel += 6; }
        if (S.era >= 1 && !G.MODES[S.mode].peaceful) {
          const best = G.BUILDINGS.barracks.trains.filter((k) => !G.Modes.unitLocked(G.UNITS[k])).pop();
          for (let i = 0; i < 2 + Math.floor(S.era / 2); i++) G.Units.spawnSoldier(best, fx + 40 + i * 34, fy + 30, { squad: 'B' });
        }
      }
      if (S.mode === 'skirmish') G.Modes.aiInit();
      G.Units.spawnHero(fx, fy);
      for (let i = 0; i < 3; i++) G.Units.spawnVillager(fx - 80 + i * 60, fy + 60);
      G.Units.spawnNpc('advisor', 'blue', c.tx - 1.2, c.ty + c.h + 0.8);
      G.Village.autoAssign();
      S.villagers = 3;
      G.Economy.shipArrives();
      S.rare = null;
      this.over = false;
      this.running = true;
      G.Modes.startQuests();
      if (S.mode === 'pvp' && G.PvP) G.PvP.onGameStart();
      G.Render.snapCamera();
    },

    update(dt) {
      const S = G.S;
      if (!this.running || this.over) return;
      if (G.UI.modalOpen() || S.paused) { G.FX.update(dt * 0.3); return; }
      const total = Math.min(dt, 0.1) * S.speed;
      const steps = Math.ceil(total / 0.05);
      const sdt = total / steps;
      for (let i = 0; i < steps; i++) {
        this.step(sdt);
        if (G.UI.modalOpen() || this.over) break;
      }
    },

    step(dt) {
      const S = G.S;
      G.Units.buildGrid();
      G.Time.update(dt);
      if (G.UI.modalOpen()) return;
      G.Hero.update(dt);
      G.Hero.autoPickup();
      G.Village.update(dt);
      G.Military.updateArmy(dt);
      G.Military.updateEnemies(dt);
      G.Military.updateTowers(dt);
      G.Military.updateAuras(dt);
      G.Military.updateProjectiles(dt);
      G.Military.updateTraining(dt);
      G.Military.updateRaid();
      G.Village.updateFires(dt);
      this.updateNpcs(dt);
      this.updateResearch(dt);
      G.Quests.update(dt);
      this.sepT = (this.sepT || 0) + dt;
      if (++this.stepN % 3 === 0) { G.Units.separate(this.sepT); this.sepT = 0; }
      G.FX.update(dt);
      for (const u of S.units) if (u.hitT > 0) u.hitT -= dt;
      for (const b of S.buildings) if (b.hitT > 0) b.hitT -= dt;
      if (G.Nodes.hit.length) { for (const n of G.Nodes.hit) n.hitT -= dt; G.Nodes.hit = G.Nodes.hit.filter((n) => n.hitT > 0); }
      S.villagers = 0;
      for (const u of S.units) if (u.villager) S.villagers++;
    },

    updateNpcs(dt) {
      for (const u of G.S.units) {
        if (!u.npc) continue;
        u.moving = false;
        if (u.role === 'hostage') continue;
        const far = G.dist(u.x, u.y, u.homeX, u.homeY);
        if (u.role === 'freed') {
          if (far > 20) G.Units.stepToward(u, u.homeX, u.homeY, dt * 2); else u.role = 'townsfolk';
          continue;
        }
        const roam = u.role === 'townsfolk' || u.role === 'guard' ? 110 : 30;
        u.timer -= dt;
        if (u.timer <= 0) {
          u.timer = 3 + Math.random() * 6;
          u.wx = Math.random() < 0.5 ? null : u.homeX + G.rnd(-roam, roam);
          u.wy = u.homeY + G.rnd(-roam * 0.5, roam * 0.5);
        }
        if (u.wx != null && G.dist(u.x, u.y, u.wx, u.wy) > 6) G.Units.stepToward(u, u.wx, u.wy, dt);
        const h = G.Hero.unit();
        if (h && G.dist(h.x, h.y, u.x, u.y) < 140 && !u.moving) u.facing = h.x > u.x ? 1 : -1;
      }
    },

    newDay() {
      const S = G.S;
      const vr = G.Village.daily();
      const er = G.Economy.daily();
      G.Modes.aiDaily();
      if (S.mode === 'survival') { try { const best = +localStorage.getItem('guomlua_best_survival') || 0; if (S.day - 1 > best) localStorage.setItem('guomlua_best_survival', S.day - 1); } catch (e) { /* bỏ qua */ } }
      G.Nodes.dailyRegrow();
      G.Military.respawnCamps();
      S.weather = G.Time.season().id === 'winter' ? 'snow' : 'clear';
      if (G.Time.dayOfSeason() === 1) {
        const s = G.Time.season();
        const notes = { spring: 'Cừu sinh sản, ruộng lại xanh.', summer: 'Bí ngô ưa nắng. Coi chừng hạn hán.', autumn: 'Mùa gặt! Hãy tích trữ cho mùa đông.', winter: 'Ruộng ngừng lớn, dân cần gỗ sưởi. Giá lương thực tăng vọt.' };
        G.UI.banner(`Mùa ${s.name} — Năm ${G.Time.year()}`, notes[s.id]);
      }
      if (G.Time.seasonIndex(S.day + 1) === 3 && G.Time.seasonIndex(S.day) === 2) {
        const need = Math.max(1, S.villagers * 2 + S.units.filter((u) => u.team === 0 && u.soldier).length * 3);
        const days = G.Economy.foodPoints() / need;
        if (days < G.SEASON_DAYS + 1) G.UI.dialog([['advisor', `Mai là mùa đông! Kho lương chỉ đủ ăn khoảng ${days.toFixed(1)} ngày, mà đông kéo dài ${G.SEASON_DAYS} ngày. Hãy mua lương thực, mở Bến cá, giết thịt cừu hoặc tạm ngừng ăn món đắt.`]]);
      }
      G.UI.log(`☀ Ngày ${S.day}: thuế +${er.tax}, lương lính -${er.upkeep}, ăn ${vr.foodEaten}/${vr.foodNeed} điểm no (${vr.types} món), lòng dân ${vr.moraleDelta >= 0 ? '+' : ''}${vr.moraleDelta.toFixed(1)}`, vr.foodEaten < vr.foodNeed ? 'bad' : 'info');
      S.lastReport = { day: S.day, ...vr, ...er };
      G.Quests.rollEvent();
      this.save('auto');
    },

    // ---------------- Lâu đài ----------------
    repairCastle() {
      const S = G.S;
      const cost = { wood: 40, stone: 20 };
      if (!G.Economy.has(cost)) { G.UI.toast('Cần 40 gỗ và 20 đá', 'bad'); return; }
      G.Economy.take(cost);
      const c = G.byId(S.castleId);
      c.ruined = false;
      c.hp = Math.max(c.hp, c.maxHp * 0.6);
      S.flags.castleRepaired = true;
      G.FX.sprite('fx.dust', c.x, c.y - 40, 2);
      G.Audio.play('built');
      G.UI.refresh();
    },

    upgradeTier() {
      const S = G.S;
      if (G.Modes.eraMode()) { G.Modes.advanceEra(); return; }
      const next = G.TIERS[S.tier + 1];
      if (!next) return;
      if (!S.flags.castleRepaired) { G.UI.toast('Hãy phục dựng lâu đài trước', 'bad'); return; }
      if (S.villagers < next.pop) { G.UI.toast(`Cần ${next.pop} dân`, 'bad'); return; }
      if (!G.Economy.has(next.cost)) { G.UI.toast('Không đủ tài nguyên', 'bad'); return; }
      G.Economy.take(next.cost);
      S.tier++;
      const c = G.byId(S.castleId);
      if (c) { c.maxHp += 600; c.hp += 600; }
      G.Audio.play('victory');
      G.UI.banner(`Vương quốc lên bậc ${next.name}!`, 'Công trình và kỹ thuật mới đã mở khoá.');
      G.Village.addMorale(8, 'Vương quốc lớn mạnh');
      G.UI.refresh();
    },

    // ---------------- Nghiên cứu ----------------
    research(id) {
      const S = G.S, t = G.TECHS[id];
      if (S.research) { G.UI.toast('Đang nghiên cứu kỹ thuật khác', 'bad'); return; }
      const tl = G.Modes.techLocked(t);
      if (tl) { G.UI.toast(tl, 'bad'); return; }
      if (t.req && !S.techs[t.req]) { G.UI.toast(`Cần nghiên cứu ${G.TECHS[t.req].name} trước`, 'bad'); return; }
      if (!G.Economy.has(t.cost)) { G.UI.toast('Không đủ tài nguyên', 'bad'); return; }
      G.Economy.take(t.cost);
      S.research = { id, t: 0 };
      G.Audio.play('click');
      G.UI.refresh();
    },
    updateResearch(dt) {
      const S = G.S;
      if (!S.research) return;
      S.research.t += dt;
      const t = G.TECHS[S.research.id];
      if (S.research.t >= t.time) {
        S.techs[S.research.id] = true;
        S.research = null;
        G.Military.refreshAllBuffs();
        if (S.research === null && t === G.TECHS.masonry) for (const b of S.buildings) if (b.team === 0) { b.maxHp = Math.round(b.maxHp * 1.4); b.hp = Math.round(b.hp * 1.4); }
        G.UI.toast(`Nghiên cứu xong: ${t.name}`, 'good', 4);
        G.Audio.play('quest');
      }
    },

    // ---------------- Kết thúc ----------------
    victory() {
      G.S.flags.won = true;
      G.UI.endScreen(true);
    },
    defeat() {
      this.over = true;
      if (G.S.mode === 'pvp' && G.PvP) G.PvP.onDefeat();
      G.UI.endScreen(false);
    },

    // ---------------- Lưu / tải ----------------
    serialize() {
      const S = G.S;
      const clean = (o) => { const c = Object.assign({}, o); delete c.path; delete c.pending; return c; };
      const data = Object.assign({}, S, {
        units: S.units.map(clean),
        world: G.World.serialize(),
        nextId: G.newId(),
      });
      return JSON.stringify(data);
    },
    save(slot) {
      if (!this.running || this.over) return false;
      try {
        localStorage.setItem(SAVE_KEY + slot, this.serialize());
        localStorage.setItem(SAVE_KEY + slot + '_meta', JSON.stringify({ day: G.S.day, tier: G.S.tier, hero: G.S.heroName, at: Date.now(), ch: G.S.quests.chapter, diff: G.S.difficulty, mode: G.S.mode, map: G.S.mapId, era: G.S.era }));
        if (slot !== 'auto') G.UI.toast('Đã lưu game', 'good');
        return true;
      } catch (e) {
        G.UI.toast('Không lưu được: ' + e.message, 'bad');
        return false;
      }
    },
    slotMeta(slot) {
      try { return JSON.parse(localStorage.getItem(SAVE_KEY + slot + '_meta') || 'null'); } catch (e) { return null; }
    },
    load(slot) {
      const raw = localStorage.getItem(SAVE_KEY + slot);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.loadData(data);
      return true;
    },
    loadData(data) {
      G.ents.clear();
      const world = data.world;
      delete data.world;
      data.mode = data.mode || 'campaign';
      if (data.era == null) data.era = 3;
      data.mapId = data.mapId || 'binhminh';
      G.S = data;
      G.World.setup(data.mapId, data.seed);
      if (G.Render.buildTiles) { G.Render.buildTiles(); G.Render.minimapBase = null; }
      G.World.genTerrain(data.seed);
      for (const i of world.roads) G.World.road[i] = 1;
      G.World.decor = world.decor || [];
      for (const u of data.units) { G.ents.set(u.id, u); u.path = null; }
      for (const n of data.nodes) {
        G.ents.set(n.id, n);
        if (G.NODE_DEF[n.type].block && n.amount > 0) G.World.nmap[n.ty * G.World.W + n.tx] = n.id;
      }
      for (const b of data.buildings) {
        G.ents.set(b.id, b);
        for (let y = b.ty; y < b.ty + b.h; y++) for (let x = b.tx; x < b.tx + b.w; x++) G.World.bmap[y * G.World.W + x] = b.id;
      }
      G.setNextId(data.nextId || 1);
      G.Military.projectiles = [];
      G.FX.clear();
      this.over = false;
      this.running = true;
      G.Render.snapCamera();
    },
    hasSave(slot) { return !!localStorage.getItem(SAVE_KEY + slot); },
  };
  G.Game = Game;

  G.on('dusk', () => G.Military.planRaid());
  G.on('night', () => G.Military.spawnRaid());
  G.on('morning', () => G.Military.morningRetreat());
})(typeof window !== 'undefined' ? window : globalThis);
