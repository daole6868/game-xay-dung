/* Thực thể: đơn vị (người, cừu), nút tài nguyên, công trình. */
(function (root) {
  'use strict';
  const G = root.G;
  const T = G.TILE;

  G.ents = new Map();
  G.byId = (id) => G.ents.get(id);

  // ================= ĐƠN VỊ =================
  const Units = {
    create(type, x, y, team, extra = {}) {
      const def = G.UNITS[type] || {};
      const u = Object.assign({
        id: G.newId(), type, kind: def.kind || type, team, color: team === 1 ? 'red' : 'blue',
        x, y, hp: def.hp || 30, maxHp: def.hp || 30, dmg: def.dmg || 0, armor: def.armor || 0,
        range: def.range || 40, cd: def.cd || 1, speed: def.speed || 120,
        facing: 1, anim: 'idle', animT: Math.random() * 3, act: null, actT: 0, actDur: 0,
        path: null, pathI: 0, state: 'idle', timer: 0, atkT: Math.random(), target: 0, hitT: 0, rethink: 0,
      }, extra);
      if (def.boss) u.scale = def.scale;
      G.S.units.push(u);
      G.ents.set(u.id, u);
      return u;
    },

    spawnHero(x, y) {
      const u = this.create('hero', x, y, 0, { hero: true, name: G.S.heroName });
      G.S.heroId = u.id;
      G.Hero.applyStats(u);
      u.hp = u.maxHp;
      return u;
    },

    spawnVillager(x, y) {
      const u = this.create('pawn', x, y, 0, { villager: true, job: 'idle', carry: null, task: null, name: G.Village.randomName() });
      return u;
    },

    spawnSoldier(type, x, y, extra = {}) {
      const u = this.create(type, x, y, 0, Object.assign({ soldier: true, squad: 'A', xp: 0, rank: 0 }, extra));
      G.Military.applyBuffs(u);
      u.hp = u.maxHp;
      return u;
    },

    spawnSheep(x, y, team, pen = 0) {
      return this.create('sheep', x, y, team, { kind: 'sheep', hp: 30, maxHp: 30, speed: 60, sheep: true, pen, wool: Math.random() * 0.5, color: 'none' });
    },

    /** NPC: vai trò cố định (thương nhân, sư cô, tộc trưởng, dân phố, lính gác, con tin...). */
    spawnNpc(role, color, tx, ty) {
      const kinds = { merchant: 'pawn', abbess: 'monk', chief: 'warrior', townsfolk: 'pawn', guard: 'warrior', hostage: 'pawn', advisor: 'monk' };
      const names = { merchant: 'Kim Bảo', abbess: 'Sư cô Tịnh Nguyệt', chief: 'Tộc trưởng Hắc Sơn', hostage: 'Hắc Lang', advisor: 'Quân sư Mạc Tùng' };
      const u = this.create('npc', tx * T, ty * T, 2, {
        kind: kinds[role] || 'pawn', color, role, npc: true, name: names[role] || '', speed: 60, hp: 999, maxHp: 999,
        homeX: tx * T, homeY: ty * T, invuln: true, faction: color === 'blue' ? null : color,
      });
      return u;
    },

    spawnGarrison(campId, type) {
      const p = G.World.PLACES[campId];
      const spot = G.World.findFreeTile(p.tx, p.ty, 1, campId === 'F' ? 6 : 4) || { x: p.tx, y: p.ty + 3 };
      if (type !== 'boss') type = G.Eras.enemyType(type);
      const u = this.create(type, (spot.x + 0.5) * T, (spot.y + 0.5) * T, 1, { camp: campId, homeX: (spot.x + 0.5) * T, homeY: (spot.y + 0.5) * T });
      G.Military.applyEnemyScaling(u);
      if (type === 'boss') { u.name = 'Xích Hoả'; u.boss = true; }
      G.S.camps[campId].garrison.push(u.id);
      return u;
    },

    remove(u) {
      u.dead = true;
      const i = G.S.units.indexOf(u);
      if (i >= 0) G.S.units.splice(i, 1);
      G.ents.delete(u.id);
    },

    tile(u) { return { x: Math.floor(u.x / T), y: Math.floor(u.y / T) }; },

    /** Đặt đường đi tới điểm (px). opts như Path.find. Trả về true nếu có đường. */
    moveTo(u, px, py, opts = {}) {
      const s = this.tile(u);
      const tx = Math.floor(px / T), ty = Math.floor(py / T);
      const path = G.Path.find(s.x, s.y, tx, ty, Object.assign({ team: u.team === 1 ? 1 : 0, partial: true }, opts));
      if (!path) { u.path = null; return false; }
      u.path = path;
      u.pathI = 0;
      u.goalX = px; u.goalY = py;
      if (!opts.near && !opts.rect && path.length) {
        const last = path[path.length - 1];
        if (last.x === tx && last.y === ty) u.exact = true; else u.exact = false;
      } else u.exact = false;
      return true;
    },

    moveToRect(u, b) {
      return this.moveTo(u, (b.tx + b.w / 2) * T, (b.ty + b.h / 2) * T, { rect: { x: b.tx, y: b.ty, w: b.w, h: b.h } });
    },

    /** Đi theo đường đã tính. Trả về true khi tới nơi. */
    followPath(u, dt) {
      if (!u.path) return true;
      if (u.pathI >= u.path.length) {
        if (u.exact && u.goalX != null) {
          const d = G.dist(u.x, u.y, u.goalX, u.goalY);
          if (d > 4) { this.stepToward(u, u.goalX, u.goalY, dt); return false; }
        }
        u.path = null;
        return true;
      }
      const wp = u.path[u.pathI];
      const wx = wp.x * T + T / 2, wy = wp.y * T + T / 2;
      const d = G.dist(u.x, u.y, wx, wy);
      if (d < 8) { u.pathI++; return false; }
      // tường/công trình chặn (giặc): đập phá
      if (u.team === 1) {
        const b = G.World.buildingAt(wp.x, wp.y);
        if (b && b.team === 0 && b.built && !G.BUILDINGS[b.type].ground && d < T * 0.95) {
          u.blockedBy = b.id;
          return false;
        }
      }
      this.stepToward(u, wx, wy, dt);
      return false;
    },

    speedOf(u) {
      let sp = u.speed;
      const tx = Math.floor(u.x / T), ty = Math.floor(u.y / T);
      if (G.World.isRoad(tx, ty)) sp *= 1.35;
      if (u.slowT > 0) sp *= 0.6;
      if (u.buffT > 0) sp *= 1.15;
      return sp;
    },

    stepToward(u, tx, ty, dt) {
      const dx = tx - u.x, dy = ty - u.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.5) return;
      const sp = Math.min(d, this.speedOf(u) * dt);
      this.tryMove(u, (dx / d) * sp, (dy / d) * sp);
      if (Math.abs(dx) > 2) u.facing = dx > 0 ? 1 : -1;
      u.moving = true;
    },

    /** Di chuyển có va chạm với ô không đi được (trượt theo trục). */
    tryMove(u, mx, my) {
      const team = u.team === 1 ? 1 : 0;
      const Wd = G.World;
      const free = (x, y) => {
        const tx = Math.floor(x / T), ty = Math.floor(y / T);
        if (tx >= 0 && ty >= 0 && tx < Wd.W && ty < Wd.H) {
          const i = ty * Wd.W + tx;
          if (Wd.ground[i] === 1 && !Wd.nmap[i] && !Wd.bmap[i]) return true;
        }
        if (Wd.passable(tx, ty, team)) return true;
        // đang đứng trong ô bị chặn (vd: công trình mới dựng): cho phép thoát ra
        const cx = Math.floor(u.x / T), cy = Math.floor(u.y / T);
        return tx === cx && ty === cy;
      };
      const r = 10;
      const ok = (x, y) => free(x + (mx > 0 ? r : mx < 0 ? -r : 0), y) && free(x, y + (my > 0 ? r * 0.6 : my < 0 ? -r * 0.6 : 0)) && free(x, y);
      if (ok(u.x + mx, u.y + my)) { u.x += mx; u.y += my; return true; }
      if (mx && ok(u.x + mx, u.y)) { u.x += mx; return true; }
      if (my && ok(u.x, u.y + my)) { u.y += my; return true; }
      return false;
    },

    /** Lưới không gian để tìm đơn vị gần (dựng lại mỗi khung hình). */
    grid: new Map(),
    buildGrid() {
      const grid = this.grid;
      grid.clear();
      for (const u of G.S.units) {
        if (u.hidden || u.dead) continue;
        const k = ((u.x / 128) | 0) * 1024 + ((u.y / 128) | 0);
        let cell = grid.get(k);
        if (!cell) grid.set(k, (cell = []));
        cell.push(u);
      }
    },
    near(x, y, r, filter) {
      const out = [];
      const x0 = ((x - r) / 128) | 0, x1 = ((x + r) / 128) | 0, y0 = ((y - r) / 128) | 0, y1 = ((y + r) / 128) | 0;
      const r2 = r * r;
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const cell = this.grid.get(cx * 1024 + cy);
        if (!cell) continue;
        for (const u of cell) {
          const dx = u.x - x, dy = u.y - y;
          if (dx * dx + dy * dy <= r2 && (!filter || filter(u))) out.push(u);
        }
      }
      return out;
    },
    nearest(x, y, r, filter) {
      let best = null, bd = r * r;
      const x0 = ((x - r) / 128) | 0, x1 = ((x + r) / 128) | 0, y0 = ((y - r) / 128) | 0, y1 = ((y + r) / 128) | 0;
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const cell = this.grid.get(cx * 1024 + cy);
        if (!cell) continue;
        for (const u of cell) {
          const dx = u.x - x, dy = u.y - y, d = dx * dx + dy * dy;
          if (d <= bd && (!filter || filter(u))) { bd = d; best = u; }
        }
      }
      return best;
    },

    /** Đẩy nhẹ các đơn vị chồng lên nhau. */
    separate(dt) {
      for (const cell of this.grid.values()) {
        for (let i = 0; i < cell.length; i++) {
          const a = cell[i];
          if (a.sheep && a.pen) continue;
          for (let j = i + 1; j < cell.length; j++) {
            const b = cell[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > 0.01 && d2 < 22 * 22) {
              const d = Math.sqrt(d2), push = (22 - d) * 0.5 * Math.min(1, dt * 8);
              const nx = dx / d, ny = dy / d;
              if (!a.hero || b.hero) this.tryMove(a, -nx * push, -ny * push);
              if (!b.hero || a.hero) this.tryMove(b, nx * push, ny * push);
            }
          }
        }
      }
    },

    /** Bắt đầu một động tác (chém, chặt...) kéo dài dur giây. */
    act(u, anim, dur) { u.act = anim; u.actT = 0; u.actDur = dur; },
  };
  G.Units = Units;

  // ================= NÚT TÀI NGUYÊN =================
  const NODE_DEF = {
    tree: { amount: 10, item: 'wood', work: 4.5, per: 2, anim: 'axe', regrow: 3, block: true, job: 'woodcutter', name: 'Cây' },
    rock: { amount: 24, item: 'stone', work: 5.5, per: 2, anim: 'pickaxe', block: true, job: 'quarry', name: 'Đá' },
    gold: { amount: 16, item: 'ore', work: 6.5, per: 1, anim: 'pickaxe', block: true, job: 'miner', name: 'Mỏ vàng' },
    bush: { amount: 6, item: 'berry', work: 3, per: 2, anim: 'knife', regrow: 2, block: false, job: 'forager', name: 'Bụi quả mọng' },
  };
  G.NODE_DEF = NODE_DEF;

  const Nodes = {
    create(type, tx, ty, extra = {}) {
      const def = NODE_DEF[type];
      const n = Object.assign({
        id: G.newId(), node: true, type, tx, ty, x: (tx + 0.5) * T, y: (ty + 0.5) * T,
        amount: def.amount, max: def.amount, v: 1 + Math.floor(G.hash2(tx, ty, 7) * (type === 'gold' ? 6 : 4)),
        regrowDay: 0, hitT: 0, phase: Math.random() * 10,
      }, extra);
      G.S.nodes.push(n);
      G.ents.set(n.id, n);
      if (def.block && n.amount > 0) G.World.nmap[ty * G.World.W + tx] = n.id;
      return n;
    },
    /** Lấy tài nguyên. Trả về số lượng thật sự lấy được. */
    hit: [],
    take(n, k) {
      const got = Math.min(k, n.amount);
      n.amount -= got;
      if (!(n.hitT > 0)) this.hit.push(n);
      n.hitT = 0.25;
      if (n.amount <= 0) this.deplete(n);
      return got;
    },
    deplete(n) {
      const def = NODE_DEF[n.type];
      G.World.nmap[n.ty * G.World.W + n.tx] = 0;
      if (def.regrow) {
        n.regrowDay = G.S.day + def.regrow;
        n.stump = n.type === 'tree';
      } else {
        this.remove(n);
        if (G.FX) G.FX.sprite('fx.dust', n.x, n.y, 0.5);
      }
    },
    remove(n) {
      G.World.nmap[n.ty * G.World.W + n.tx] = 0;
      const i = G.S.nodes.indexOf(n);
      if (i >= 0) G.S.nodes.splice(i, 1);
      G.ents.delete(n.id);
      n.removed = true;
    },
    dailyRegrow() {
      for (const n of G.S.nodes) {
        if (n.amount <= 0 && n.regrowDay && G.S.day >= n.regrowDay) {
          if (NODE_DEF[n.type].block && (G.World.bmap[n.ty * G.World.W + n.tx] || G.Units.near(n.x, n.y, 30).length)) continue;
          n.amount = n.max; n.stump = false; n.regrowDay = 0;
          if (NODE_DEF[n.type].block) G.World.nmap[n.ty * G.World.W + n.tx] = n.id;
        }
      }
    },
  };
  G.Nodes = Nodes;

  // ================= CÔNG TRÌNH =================
  const Build = {
    create(type, tx, ty, team, opts = {}) {
      const def = G.BUILDINGS[type];
      let maxHp = def.hp;
      if (team === 0 && G.S.techs && G.S.techs.masonry) maxHp = Math.round(maxHp * 1.4);
      if (team === 0 && G.Modes.eraMode()) maxHp = Math.round(maxHp * (1 + G.S.era * (type === 'castle' ? 0.45 : 0.25)));
      const b = Object.assign({
        id: G.newId(), building: true, type, tx, ty, w: def.w, h: def.h, team,
        hp: maxHp, maxHp, built: false, progress: 0, level: 1, workers: [], fire: 0, hitT: 0, atkT: 0,
        x: (tx + def.w / 2) * T, y: (ty + def.h) * T,
      }, opts);
      if (def.variants) b.sprite = def.variants[Math.floor(Math.random() * def.variants.length)];
      if (b.built) b.progress = 1; else b.hp = Math.max(1, Math.round(maxHp * 0.1));
      if (type === 'plot') { b.crop = b.crop || 'wheat'; b.stage = -1; b.growth = 0; b.ripeT = 0; }
      if (def.recipes) { b.recipe = 0; b.prog = 0; b.running = false; }
      if (def.trains) b.queue = [];
      for (let y = ty; y < ty + def.h; y++) for (let x = tx; x < tx + def.w; x++) {
        if (G.World.inside(x, y)) {
          G.World.bmap[y * G.World.W + x] = b.id;
          if (!def.road && !def.ground) G.World.road[y * G.World.W + x] = 0;
        }
      }
      if (def.road && b.built) G.World.road[ty * G.World.W + tx] = 1;
      G.S.buildings.push(b);
      G.ents.set(b.id, b);
      return b;
    },

    remove(b) {
      const def = G.BUILDINGS[b.type];
      for (let y = b.ty; y < b.ty + b.h; y++) for (let x = b.tx; x < b.tx + b.w; x++) {
        if (G.World.inside(x, y) && G.World.bmap[y * G.World.W + x] === b.id) G.World.bmap[y * G.World.W + x] = 0;
      }
      if (def.road) G.World.road[b.ty * G.World.W + b.tx] = 0;
      const i = G.S.buildings.indexOf(b);
      if (i >= 0) G.S.buildings.splice(i, 1);
      G.ents.delete(b.id);
      b.removed = true;
      // thả dân đang làm trong xưởng
      for (const wid of b.workers || []) {
        const w = G.byId(wid);
        if (w) { w.hidden = false; w.task = null; w.workplace = 0; w.x = b.x; w.y = b.y + 8; }
      }
      // cừu trong chuồng thành cừu hoang
      if (b.type === 'pen') for (const u of G.S.units) if (u.sheep && u.pen === b.id) { u.pen = 0; u.team = 3; }
    },

    center(b) { return { x: (b.tx + b.w / 2) * T, y: (b.ty + b.h / 2) * T }; },

    /** Kiểm tra có đặt được công trình ở (tx,ty) không. Trả về chuỗi lỗi hoặc ''. */
    /** ignoreId: id công trình đang được dời (được phép chồng lên chỗ cũ của chính nó). */
    canPlace(type, tx, ty, ignoreId) {
      const def = G.BUILDINGS[type];
      const W = G.World;
      for (let y = ty; y < ty + def.h; y++) for (let x = tx; x < tx + def.w; x++) {
        if (!W.isLand(x, y)) return 'Phải đặt trên đất liền';
        if (W.nmap[y * W.W + x]) return 'Vướng cây/đá';
        const own = ignoreId && W.bmap[y * W.W + x] === ignoreId;
        if (W.bmap[y * W.W + x] && !own) return 'Vướng công trình khác';
        if (def.road && W.road[y * W.W + x] && !own) return 'Đã có đường';
      }
      if (!def.ground) {
        for (const u of G.S.units) {
          if (u.hidden || u.npc) continue;
          const ux = Math.floor(u.x / T), uy = Math.floor(u.y / T);
          if (u.hero && ux >= tx && ux < tx + def.w && uy >= ty && uy < ty + def.h) return 'Hiệp sĩ đang đứng ở đó';
        }
      }
      const cx = tx + def.w / 2, cy = ty + def.h / 2;
      for (const k in G.S.camps) {
        const c = G.S.camps[k];
        if (!c.dead && G.dist(cx, cy, c.tx, c.ty) < 10) return 'Quá gần trại giặc';
      }
      for (const f of ['yellow', 'purple', 'black']) {
        const p = W.PLACES[f];
        if (G.dist(cx, cy, p.tx, p.ty) < 8) return 'Đất của ' + G.FACTIONS[f].town;
      }
      if (def.coastal) {
        let wet = false;
        for (let y = ty - 1; y <= ty + def.h; y++) for (let x = tx - 1; x <= tx + def.w; x++) if (W.inside(x, y) && !W.isLand(x, y)) wet = true;
        if (!wet) return 'Phải đặt sát bờ nước';
      }
      return '';
    },

    canAfford(cost) {
      if (!cost) return true;
      for (const k in cost) {
        if (k === 'gold') { if (G.S.gold < cost[k]) return false; } else if ((G.S.stock[k] || 0) < cost[k]) return false;
      }
      return true;
    },
    pay(cost) {
      for (const k in cost) { if (k === 'gold') G.S.gold -= cost[k]; else G.S.stock[k] -= cost[k]; }
    },
    refund(cost, frac) {
      for (const k in cost) {
        const v = Math.floor(cost[k] * frac);
        if (k === 'gold') G.S.gold += v; else G.S.stock[k] = (G.S.stock[k] || 0) + v;
      }
    },

    /** Người chơi đặt công trình. */
    place(type, tx, ty, silent) {
      const def = G.BUILDINGS[type];
      const lock = G.Modes.locked(def);
      if (lock) { if (!silent) G.UI.toast(lock, 'bad'); return null; }
      const err = this.canPlace(type, tx, ty);
      if (err) { if (!silent) G.UI.toast(err, 'bad'); return null; }
      if (!this.canAfford(def.cost)) { if (!silent) G.UI.toast('Không đủ tài nguyên', 'bad'); return null; }
      this.pay(def.cost);
      const b = this.create(type, tx, ty, 0, { built: false });
      G.Audio.play('place');
      G.emit('placed', b);
      return b;
    },

    /** Góp công xây. Trả về true nếu vừa xây xong. */
    work(b, amount) {
      if (b.built) return false;
      const def = G.BUILDINGS[b.type];
      b.progress = Math.min(1, b.progress + amount / def.work);
      b.hp = Math.max(b.hp, Math.round(b.maxHp * (0.1 + 0.9 * b.progress)));
      b.hitT = 0.15;
      if (b.progress >= 1) {
        b.built = true;
        b.hp = b.maxHp;
        if (def.road) G.World.road[b.ty * G.World.W + b.tx] = 1;
        G.S.stats.built = (G.S.stats.built || 0) + 1;
        if (!def.drag) {
          G.FX.sprite('fx.dust', b.x, b.y - 8, 0.7);
          G.UI.toast(`Đã xây xong ${def.name}`, 'good');
        }
        G.Audio.play(def.drag ? 'tick' : 'built');
        if (b.type !== 'road' && b.type !== 'plot') G.Hero.gainXp(def.drag ? 1 : 8);
        G.emit('built', b);
        return true;
      }
      return false;
    },

    /** Kiểu nối của tường/rào/cổng: bit 1=Bắc, 2=Đông, 4=Nam, 8=Tây (ô kề là tường hoặc cổng cùng phe). */
    wallMask(b) {
      const W = G.World, self = G.BUILDINGS[b.type];
      const joins = (x, y) => {
        const o = W.buildingAt(x, y);
        if (!o || o.team !== b.team) return false;
        const d = G.BUILDINGS[o.type];
        if (self.barbed || d.barbed) return !!(self.barbed && d.barbed);
        return !!(d.wall || d.gate);
      };
      return (joins(b.tx, b.ty - 1) ? 1 : 0) | (joins(b.tx + 1, b.ty) ? 2 : 0) | (joins(b.tx, b.ty + 1) ? 4 : 0) | (joins(b.tx - 1, b.ty) ? 8 : 0);
    },

    canMove(b) {
      const def = G.BUILDINGS[b.type];
      return b.team === 0 && !def.unique;
    },

    /** Dời công trình sang ô (tx,ty), giữ nguyên tiến độ, máu, cây trồng, người & cừu bên trong. Trả về lỗi hoặc ''. */
    move(b, tx, ty) {
      if (!this.canMove(b)) return 'Không dời được công trình này';
      if (tx === b.tx && ty === b.ty) return '';
      const err = this.canPlace(b.type, tx, ty, b.id);
      if (err) return err;
      const def = G.BUILDINGS[b.type];
      const W = G.World;
      const dx = (tx - b.tx) * T, dy = (ty - b.ty) * T;
      G.FX.sprite('fx.dust', b.x, b.y - 10, 0.7);
      for (let y = b.ty; y < b.ty + b.h; y++) for (let x = b.tx; x < b.tx + b.w; x++) {
        if (W.inside(x, y) && W.bmap[y * W.W + x] === b.id) W.bmap[y * W.W + x] = 0;
      }
      if (def.road) W.road[b.ty * W.W + b.tx] = 0;
      b.tx = tx; b.ty = ty;
      b.x = (tx + def.w / 2) * T; b.y = (ty + def.h) * T;
      for (let y = ty; y < ty + def.h; y++) for (let x = tx; x < tx + def.w; x++) {
        W.bmap[y * W.W + x] = b.id;
        if (!def.road && !def.ground) W.road[y * W.W + x] = 0;
      }
      if (def.road && b.built) W.road[ty * W.W + tx] = 1;
      // người trong xưởng/nhà và cừu trong chuồng đi theo công trình
      for (const u of G.S.units) {
        if ((u.hidden && (u.workplace === b.id || u.shelter === b.id)) || (u.sheep && u.pen === b.id)) { u.x += dx; u.y += dy; u.wx = null; }
        else if (u.villager && u.task && u.task.id === b.id && !u.hidden) G.Village.dropTask(u);
      }
      b.builders = 0;
      b.claimBy = 0;
      if (G.S.hero.work && G.S.hero.work.id === b.id) G.S.hero.work = null;
      G.FX.sprite('fx.dust', b.x, b.y - 10, 0.7);
      G.Audio.play('place');
      G.emit('moved', b);
      return '';
    },

    demolish(b) {
      const def = G.BUILDINGS[b.type];
      if (def.unique || b.team !== 0) return;
      if (def.cost) this.refund(def.cost, b.built ? 0.4 : 0.9);
      this.remove(b);
      G.FX.sprite('fx.dust', b.x, b.y - 10, 0.7);
      G.Audio.play('demolish');
    },

    /** Gây sát thương lên công trình. */
    damage(b, amount, src) {
      const def = G.BUILDINGS[b.type];
      if (b.team === 2 || def.road) return;
      b.hp -= amount;
      b.hitT = 0.15;
      if (b.team === 0 && b.built) G.Military.alarm(b.x, b.y);
      if (b.hp <= 0) this.destroyed(b, src);
    },

    destroyed(b, src) {
      const def = G.BUILDINGS[b.type];
      G.FX.sprite('fx.explosion', b.x, b.y - b.h * T * 0.35, 1 + b.w * 0.2);
      G.Audio.play('collapse');
      if (b.type === 'castle') { this.remove(b); G.Game.defeat(); return; }
      this.remove(b);
      if (b.team === 0) {
        G.UI.toast(`${def.name} đã bị phá huỷ!`, 'bad');
        G.Village.addMorale(def.drag ? -0.5 : -4, 'Mất công trình');
        G.S.stats.lostBuildings = (G.S.stats.lostBuildings || 0) + 1;
      } else if (b.team === 1) {
        G.Hero.gainXp(def.hp > 800 ? 60 : 25);
        const gold = Math.round(def.hp / 12);
        G.S.drops.push({ id: G.newId(), x: b.x, y: b.y - 10, chest: true, gold, items: b.camp === 'F' ? { weapons: 6 } : { weapons: 1 + Math.floor(Math.random() * 3) } });
        if (b.camp) G.Military.checkCamp(b.camp);
      }
    },

    houseCap() {
      let cap = 0;
      for (const b of G.S.buildings) {
        if (b.team !== 0 || !b.built) continue;
        const d = G.BUILDINGS[b.type];
        if (d.house) cap += b.type === 'castle' ? (b.ruined ? 3 : d.house + (G.S.tier - 1) * 2) : G.Modes.houseCap(b);
      }
      return cap;
    },

    dropoffs() { return G.S.buildings.filter((b) => b.team === 0 && b.built && G.BUILDINGS[b.type].dropoff); },
    nearestDropoff(x, y) {
      let best = null, bd = Infinity;
      for (const b of this.dropoffs()) {
        const c = this.center(b);
        const d = G.dist2(x, y, c.x, c.y);
        if (d < bd) { bd = d; best = b; }
      }
      return best;
    },
  };
  G.Build = Build;
})(typeof window !== 'undefined' ? window : globalThis);
