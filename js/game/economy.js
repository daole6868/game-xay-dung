/* Kinh tế: kho, ăn uống, giá cả động, chợ, giao thương với các thế lực, hợp đồng, tuyến buôn, hàng hiếm. */
(function (root) {
  'use strict';
  const G = root.G;
  const T = G.TILE;

  // Hệ số giá theo mùa cho từng nhóm hàng
  const SEASON_PRICE = {
    spring: { food: 1.05, wool: 0.9 },
    summer: { food: 0.9, wool: 0.85, fish: 0.9 },
    autumn: { food: 0.8, pumpkin: 0.75 },
    winter: { food: 1.45, wood: 1.35, wool: 1.2, cloth: 1.15 },
  };

  const Economy = {
    // ---------------- Kho ----------------
    addItem(item, n, who) {
      const S = G.S;
      S.stock[item] = (S.stock[item] || 0) + n;
      S.stats['got_' + item] = (S.stats['got_' + item] || 0) + n;
      if (who) G.FX.text(who.x, who.y - 50, `+${n}`, '#ffe9a8', 12);
    },
    has(cost) {
      for (const k in cost) {
        if (k === 'gold') { if (G.S.gold < cost[k]) return false; } else if ((G.S.stock[k] || 0) < cost[k]) return false;
      }
      return true;
    },
    take(cost) { for (const k in cost) { if (k === 'gold') G.S.gold -= cost[k]; else G.S.stock[k] -= cost[k]; } },
    addGold(n) { G.S.gold += n; G.S.stats.goldEarned = (G.S.stats.goldEarned || 0) + Math.max(0, n); },
    spendGold(n) { G.S.gold = Math.max(0, G.S.gold - n); },

    foodPoints() {
      let p = 0;
      for (const k of G.FOOD_ORDER) if (G.S.ration[k] !== false) p += (G.S.stock[k] || 0) * G.ITEMS[k].food;
      return p;
    },

    /** Ăn: lấy luân phiên từng món cho đa dạng. Trả về {points, types}. */
    eat(need) {
      const S = G.S;
      const eatenTypes = new Set();
      let got = 0;
      let guard = 0;
      while (got < need && guard++ < 5000) {
        let any = false;
        for (const k of G.FOOD_ORDER) {
          if (got >= need) break;
          if (S.ration[k] === false || (S.stock[k] || 0) <= 0) continue;
          S.stock[k]--;
          got += G.ITEMS[k].food;
          eatenTypes.add(k);
          any = true;
        }
        if (!any) break;
      }
      return { points: got, types: eatenTypes.size };
    },
    consumeFood(points) { this.eat(points); },

    // ---------------- Giá cả ----------------
    /** Giá tham chiếu một món tại một nơi (market | yellow | purple | black). */
    basePrice(item, place) {
      const S = G.S;
      const it = G.ITEMS[item];
      let p = it.price;
      const sp = SEASON_PRICE[G.Time.season().id];
      if (sp) p *= sp[item] || (it.food ? sp.food || 1 : 1);
      const m = this.market(place);
      const s = m.supply[item] || 0;
      p *= G.clamp(Math.exp(-0.022 * s), 0.35, 2.6);
      if (S.demand && S.demand.item === item && (place === 'market' || place === 'yellow')) p *= S.demand.mult;
      return p;
    },
    market(place) { const M = G.S.markets; return M[place] || (M[place] = { supply: {}, hist: {} }); },
    spread() { return G.S.techs.guild ? 0.07 : 0.15; },
    repMult(place) { const r = G.S.rep[place] || 0; return r / 500; },

    /** Giá người chơi BÁN cho nơi đó (nhận vàng). null = không thu mua. */
    sellPrice(item, place) {
      let mult = 1;
      if (place !== 'market') {
        const f = G.FACTIONS[place];
        if (!f.buy[item]) return null;
        mult = f.buy[item] * (1 + this.repMult(place));
      } else mult = 1 - this.spread();
      return Math.max(1, Math.floor(this.basePrice(item, place) * mult * 10) / 10);
    },
    /** Giá người chơi MUA từ nơi đó. null = không bán. */
    buyPrice(item, place) {
      let mult = 1;
      if (place !== 'market') {
        const f = G.FACTIONS[place];
        if (!f.sell[item]) return null;
        mult = f.sell[item] * (1 - this.repMult(place));
        if (place === 'purple' && item === 'potion' && G.S.flags.breadGiven) mult *= 0.8;
        if (place === 'black' && G.S.flags.blackAlly && (item === 'weapons' || item === 'ore')) mult *= 0.85;
      } else mult = 1 + this.spread();
      return Math.max(1, Math.ceil(this.basePrice(item, place) * mult * 10) / 10);
    },

    /** Bán n món; giá giảm dần theo từng món bán ra. Trả về vàng thu được. */
    sell(item, n, place) {
      const S = G.S;
      n = Math.min(n, S.stock[item] || 0);
      if (n <= 0) return 0;
      const m = this.market(place);
      let total = 0, sold = 0;
      for (let i = 0; i < n; i++) {
        const p = this.sellPrice(item, place);
        if (p == null) break;
        total += p;
        m.supply[item] = (m.supply[item] || 0) + 1;
        sold++;
      }
      total = Math.floor(total);
      S.stock[item] -= sold;
      this.addGold(total);
      S.stats.sold_gold = (S.stats.sold_gold || 0) + total;
      if (place !== 'market') this.addRep(place, Math.min(3, total / 150));
      G.Audio.play('coin');
      return total;
    },
    buy(item, n, place) {
      const S = G.S;
      const m = this.market(place);
      let total = 0, bought = 0;
      for (let i = 0; i < n; i++) {
        const p = this.buyPrice(item, place);
        if (p == null || S.gold < total + p) break;
        total += p;
        m.supply[item] = (m.supply[item] || 0) - 1;
        bought++;
      }
      total = Math.ceil(total);
      if (!bought) return 0;
      S.gold -= total;
      this.addItem(item, bought);
      S.stats.bought_gold = (S.stats.bought_gold || 0) + total;
      if (place !== 'market') this.addRep(place, Math.min(2, total / 200));
      G.Audio.play('coin');
      return bought;
    },

    addRep(f, v) {
      const S = G.S;
      S.rep[f] = G.clamp((S.rep[f] || 0) + v, -100, 100);
    },

    canTradeAt(place) {
      if (place === 'market') return G.S.buildings.some((b) => b.type === 'market' && b.team === 0 && b.built);
      const hero = G.Hero.unit();
      if (!hero) return false;
      const p = G.World.PLACES[place];
      return G.dist(hero.x, hero.y, (p.tx + 0.5) * T, (p.ty + 1) * T) < 9 * T;
    },

    // ---------------- Hằng ngày ----------------
    daily() {
      const S = G.S;
      // phục hồi cung cầu, ghi lịch sử giá
      for (const place of ['market', 'yellow', 'purple', 'black']) {
        const m = this.market(place);
        for (const k in m.supply) { m.supply[k] *= 0.72; if (Math.abs(m.supply[k]) < 0.5) delete m.supply[k]; }
      }
      // nhu cầu nóng
      if (Math.random() < 0.6) {
        const item = G.pick(['bread', 'cloth', 'tools', 'weapons', 'meat', 'wool', 'stone', 'fish', 'pumpkin', 'potion', 'stew']);
        S.demand = { item, mult: 1.5 + Math.random() * 0.5, day: S.day };
      } else S.demand = null;
      for (const k of G.ITEM_ORDER) {
        const h = this.market('market').hist[k] || (this.market('market').hist[k] = []);
        h.push(Math.round(this.basePrice(k, 'market') * 10) / 10);
        if (h.length > 10) h.shift();
      }
      // thuế & lương lính
      const vs = G.Village.villagers().length;
      let tax = vs * G.TAX[S.tax].gold * (S.techs.treasury ? 1.5 : 1) * (0.6 + S.morale / 250);
      tax = Math.round(tax);
      let upkeep = 0;
      for (const u of S.units) if (u.team === 0 && u.soldier) upkeep += (G.UNITS[u.type].upkeep || 0);
      upkeep = Math.round(upkeep * (S.techs.discipline ? 0.7 : 1) * G.DIFFICULTY[S.difficulty].upkeep);
      this.addGold(tax);
      if (S.gold >= upkeep) S.gold -= upkeep;
      else {
        S.gold = 0;
        G.Village.addMorale(-5, 'Nợ lương lính');
      }
      // hợp đồng hết hạn
      for (const c of S.contracts) {
        if (!c.done && c.accepted && S.day > c.deadline) {
          c.failed = true;
          this.addRep(c.faction, -8);
          G.UI.log(`Hợp đồng với ${G.FACTIONS[c.faction].name} đã quá hạn. Uy tín -8.`, 'bad');
        }
      }
      S.contracts = S.contracts.filter((c) => !c.done && !c.failed && (c.accepted || S.day <= c.offerUntil));
      if (S.day % 2 === 0 || S.contracts.filter((c) => !c.accepted).length === 0) this.newContracts();
      // thương thuyền
      if (S.day % 5 === 0) this.shipArrives();
      return { tax, upkeep };
    },

    // ---------------- Hợp đồng ----------------
    newContracts() {
      const S = G.S;
      const open = S.contracts.filter((c) => !c.accepted);
      const factions = ['yellow'];
      if (S.flags.met_purple) factions.push('purple');
      if (S.flags.met_black && !S.flags.refusedChief) factions.push('black');
      for (let i = open.length; i < 3; i++) {
        const f = G.pick(factions);
        const wants = f === 'yellow' ? ['wood', 'stone', 'wheat', 'carrot', 'bread', 'cloth', 'tools', 'wool', 'fish', 'ore'] : Object.keys(G.FACTIONS[f].buy);
        const item = G.pick(wants);
        const scale = 1 + S.day * 0.08;
        const n = Math.max(4, Math.round((G.randInt(8, 22) * scale) / Math.max(1, G.ITEMS[item].price / 5)));
        const value = G.ITEMS[item].price * n;
        S.contracts.push({
          id: G.newId(), faction: f, item, n, gold: Math.round(value * (1.5 + Math.random() * 0.5) * (S.techs.guild ? 1.25 : 1)),
          rep: Math.round(5 + n / 4), days: G.randInt(3, 5), offerUntil: S.day + 2, accepted: false,
        });
      }
    },
    acceptContract(c) { c.accepted = true; c.deadline = G.S.day + c.days; G.Audio.play('click'); },
    deliverContract(c) {
      const S = G.S;
      if ((S.stock[c.item] || 0) < c.n) { G.UI.toast('Chưa đủ hàng', 'bad'); return; }
      S.stock[c.item] -= c.n;
      this.addGold(c.gold);
      this.addRep(c.faction, c.rep);
      c.done = true;
      S.stats.contracts = (S.stats.contracts || 0) + 1;
      G.UI.toast(`Hoàn thành hợp đồng: +${c.gold} vàng, uy tín +${c.rep}`, 'good');
      G.Audio.play('coin');
      G.Hero.gainXp(20);
    },

    // ---------------- Thương thuyền & hàng hiếm ----------------
    shipArrives() {
      const S = G.S;
      const pool = G.RARE_GOODS.filter((r) => !(r.once && S.flags['bought_' + r.id]));
      G.shuffle(pool);
      S.rare = { until: S.day + 2, items: pool.slice(0, 4).map((r) => r.id) };
      if (S.flags.met_yellow) {
        G.UI.toast('Thương thuyền phương xa đã cập Cảng Kim Sa! (2 ngày)', 'info', 5);
        G.UI.log('Thương thuyền mang hàng hiếm tới Cảng Kim Sa.', 'info');
      }
    },
    rareAvailable() {
      const S = G.S;
      if (!S.rare || S.day > S.rare.until) return [];
      return S.rare.items.map((id) => G.RARE_GOODS.find((r) => r.id === id)).filter((r) => r && !(r.once && S.flags['bought_' + r.id]));
    },
    buyRare(id) {
      const S = G.S;
      const r = G.RARE_GOODS.find((x) => x.id === id);
      const price = Math.round(r.price * (1 - this.repMult('yellow')));
      if (S.gold < price) { G.UI.toast('Không đủ vàng', 'bad'); return; }
      if (id === 'sheep2' && !G.Village.penWithRoom()) { G.UI.toast('Cần chuồng cừu còn chỗ', 'bad'); return; }
      if (id === 'refugees' && G.Build.houseCap() - G.Village.villagers().length < 3) { G.UI.toast('Cần thêm 3 chỗ ở', 'bad'); return; }
      S.gold -= price;
      if (r.once) S.flags['bought_' + id] = true;
      switch (id) {
        case 'pumpkinseed': S.flags.pumpkinUnlocked = true; break;
        case 'sheep2': G.Village.addSheepToPens(2); break;
        case 'goldwheat': S.flags.goldwheat = true; break;
        case 'horn': S.flags.horn = true; break;
        case 'potions': this.addItem('potion', 5); break;
        case 'refugees': G.Village.addVillagers(3); break;
        default: break;
      }
      if (id === 'sword' || id === 'armor') { S.hero.gear[id] = true; G.Hero.applyStats(G.Hero.unit()); }
      G.UI.toast(`Đã mua ${r.name}`, 'good');
      G.Audio.play('coin');
      this.addRep('yellow', 3);
    },

    // ---------------- Tuyến thương mại ----------------
    routeRisk(town) {
      const c = G.World.PLACES.castle, p = G.World.PLACES[town];
      let risk = 0;
      for (const k in G.S.camps) {
        const camp = G.S.camps[k];
        if (camp.dead) continue;
        // khoảng cách từ trại tới đoạn thẳng lâu đài–thị trấn
        const ax = c.tx, ay = c.ty, bx = p.tx, by = p.ty;
        const t = G.clamp(((camp.tx - ax) * (bx - ax) + (camp.ty - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2), 0, 1);
        const d = G.dist(camp.tx, camp.ty, ax + t * (bx - ax), ay + t * (by - ay));
        if (d < 16) risk += (16 - d) * 0.025;
      }
      const towers = G.S.buildings.filter((b) => b.type === 'tower' && b.team === 0 && b.built).length;
      return G.clamp(risk - towers * 0.02, 0, 0.6);
    },
    addRoute(town, exportItem, exportN, importItem, importN) {
      G.S.routes.push({ id: G.newId(), town, exportItem, exportN, importItem: importItem || null, importN: importN || 0, trader: 0, trips: 0, profit: 0, active: true });
      G.UI.toast('Đã mở tuyến buôn. Giao nghề Thương lái cho dân để chạy tuyến.', 'info', 5);
    },
    removeRoute(r) {
      const u = G.byId(r.trader);
      if (u) { u.route = 0; u.task = null; u.cart = null; }
      G.S.routes = G.S.routes.filter((x) => x !== r);
    },

    traderAI(u, dt) {
      const S = G.S;
      let r = u.route ? S.routes.find((x) => x.id === u.route) : null;
      if (!r) {
        u.route = 0;
        r = S.routes.find((x) => x.active && !G.byId(x.trader));
        if (!r) return G.Village.idleAI(u, dt);
        r.trader = u.id;
        u.route = r.id;
        u.task = { type: 'route', phase: 'load' };
      }
      const t = u.task || (u.task = { type: 'route', phase: 'load' });
      const castle = G.byId(S.castleId);
      if (!castle) return;
      if (t.phase === 'load') {
        if (!u.path && G.dist(u.x, u.y, castle.x, castle.y) > 3 * T) G.Units.moveToRect(u, castle);
        if (G.Units.followPath(u, dt) || G.dist(u.x, u.y, castle.x, castle.y) < 3 * T) {
          const n = Math.min(r.exportN, S.stock[r.exportItem] || 0);
          if (n <= 0) { t.wait = (t.wait || 0) + dt; if (t.wait > 5) { t.wait = 0; } return; }
          S.stock[r.exportItem] -= n;
          u.cart = { item: r.exportItem, n };
          t.phase = 'go';
          const p = G.World.PLACES[r.town];
          G.Units.moveTo(u, (p.tx + 0.5) * T, (p.ty + 3.5) * T);
          t.risk = this.routeRisk(r.town);
          t.ambushAt = Math.random() < t.risk ? 0.3 + Math.random() * 0.4 : -1;
          t.total = u.path ? u.path.length : 1;
        }
        return;
      }
      if (t.phase === 'go' || t.phase === 'back') {
        const sp = S.techs.wheel ? 1.5 : 1;
        const done = G.Units.followPath(u, dt * sp);
        if (t.phase === 'go' && t.ambushAt > 0 && u.path && u.pathI / Math.max(1, t.total) > t.ambushAt) {
          t.ambushAt = -1;
          G.UI.toast(`Đoàn buôn tới ${G.FACTIONS[r.town].town} bị cướp chặn đường! Mất hàng.`, 'bad', 5);
          G.UI.log('Đoàn buôn bị phục kích. Phá các trại giặc gần tuyến đường để an toàn hơn.', 'bad');
          G.FX.text(u.x, u.y - 60, 'Bị cướp!', '#ff8a80', 15);
          u.cart = null;
          u.hp = Math.max(5, u.hp - 20);
          t.phase = 'back';
          G.Units.moveToRect(u, castle);
          return;
        }
        if (done) {
          if (t.phase === 'go') {
            // tới nơi: bán hàng, mua hàng
            let earned = 0;
            if (u.cart) {
              const n = u.cart.n;
              S.stock[u.cart.item] = (S.stock[u.cart.item] || 0) + n;
              earned = this.sell(u.cart.item, n, r.town);
              u.cart = null;
            }
            let bought = 0;
            if (r.importItem && this.buyPrice(r.importItem, r.town) != null) {
              const before = S.gold;
              const want = r.importN || 10;
              const got = this.buyCargo(r.importItem, want, r.town, earned);
              bought = before - S.gold;
              if (got) { S.stock[r.importItem] -= got; u.cart = { item: r.importItem, n: got }; }
            }
            r.profit += earned - bought;
            t.phase = 'back';
            G.Units.moveToRect(u, castle);
          } else {
            if (u.cart) { this.addItem(u.cart.item, u.cart.n); u.cart = null; }
            r.trips++;
            S.stats.trips = (S.stats.trips || 0) + 1;
            t.phase = 'load';
          }
        }
      }
    },
    /** Mua hàng nhập khẩu với ngân sách = tiền vừa bán được. */
    buyCargo(item, want, place, budget) {
      const S = G.S;
      const m = this.market(place);
      let total = 0, got = 0;
      for (let i = 0; i < want; i++) {
        const p = this.buyPrice(item, place);
        if (p == null || total + p > budget || S.gold < total + p) break;
        total += p; got++;
        m.supply[item] = (m.supply[item] || 0) - 1;
      }
      S.gold -= Math.ceil(total);
      S.stock[item] = (S.stock[item] || 0) + got;
      return got;
    },
  };
  G.Economy = Economy;
})(typeof window !== 'undefined' ? window : globalThis);
