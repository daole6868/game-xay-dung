/* Làng: dân làng & việc làm, nông trại, chăn cừu, xưởng, lương thực, lòng dân. */
(function (root) {
  'use strict';
  const G = root.G;
  const T = G.TILE;

  const NAMES = ['Tí', 'Tèo', 'Bờm', 'Cuội', 'Mận', 'Đào', 'Lý', 'Sen', 'Cốm', 'Na', 'Bống', 'Mít', 'Ổi', 'Thóc', 'Gạo', 'Nếp', 'Tôm', 'Hến', 'Sáo', 'Khoai', 'Bắp', 'Su', 'Bông', 'Gấc', 'Chanh', 'Quýt', 'Lựu', 'Me', 'Sim', 'Trúc'];

  const Village = {
    randomName() { return G.pick(NAMES) + ' ' + G.pick(['Lam', 'Thạch', 'Hà', 'Mộc', 'Sơn', 'Hải', 'Phong', 'Vân']); },

    villagers() { return G.S.units.filter((u) => u.villager && !u.dead); },

    addVillagers(n) {
      const c = G.byId(G.S.castleId);
      const base = c ? G.Build.center(c) : { x: 20 * T, y: 36 * T };
      for (let i = 0; i < n; i++) {
        const spot = G.World.findFreeTile(Math.floor(base.x / T), Math.floor(base.y / T) + 2, 1, 4) || { x: Math.floor(base.x / T), y: Math.floor(base.y / T) + 3 };
        G.Units.spawnVillager((spot.x + 0.5) * T, (spot.y + 0.5) * T);
      }
      this.autoAssign();
    },

    addMorale(v, reason) {
      const S = G.S;
      S.morale = G.clamp(S.morale + v, 0, 100);
      if (reason && Math.abs(v) >= 3) G.UI.log(`${reason}: lòng dân ${v > 0 ? '+' : ''}${Math.round(v)}`, v > 0 ? 'good' : 'bad');
    },

    /** Hệ số tốc độ làm việc theo lòng dân. */
    workMult() {
      let m = 0.7 + (G.S.morale / 100) * 0.5;
      return m;
    },

    // ---------------- Phân công việc ----------------
    jobCounts() {
      const c = { idle: 0 };
      for (const k of G.JOB_ORDER) c[k] = 0;
      for (const u of this.villagers()) c[u.job] = (c[u.job] || 0) + 1;
      return c;
    },

    /** Đặt số người muốn cho một nghề; lấy người từ nhóm "rảnh" hoặc trả người về. */
    setJob(job, want) {
      const vs = this.villagers();
      const cur = vs.filter((u) => u.job === job);
      if (want > cur.length) {
        let need = want - cur.length;
        for (const u of vs) { if (need <= 0) break; if (u.job === 'idle') { this.changeJob(u, job); need--; } }
      } else if (want < cur.length) {
        for (let i = 0; i < cur.length - want; i++) this.changeJob(cur[cur.length - 1 - i], 'idle');
      }
      G.S.jobWant[job] = Math.max(0, want);
    },

    changeJob(u, job) {
      this.dropTask(u);
      u.job = job;
    },

    dropTask(u) {
      const t = u.task;
      if (t) {
        const o = G.byId(t.id);
        if (o && t.type === 'build' && t.counted) o.builders = Math.max(0, (o.builders || 1) - 1);
        if (o && t.type === 'farm' && o.claimBy === u.id) o.claimBy = 0;
        if (o && t.type === 'shear' && o.claimed === u.id) o.claimed = 0;
        if (t.type === 'gather') this.releaseNode(u);
      }
      if (u.workplace) {
        const b = G.byId(u.workplace);
        if (b) b.workers = b.workers.filter((id) => id !== u.id);
        u.workplace = 0;
      }
      if (u.hidden && !u.sheltered) { u.hidden = false; }
      if (u.route) { const r = G.S.routes.find((rr) => rr.id === u.route); if (r) r.trader = 0; u.route = 0; }
      u.task = null;
      u.path = null;
      u.state = 'idle';
    },

    /** Tự giao việc cho người rảnh theo mong muốn đã đặt. */
    autoAssign() {
      const S = G.S;
      const counts = this.jobCounts();
      for (const job of G.JOB_ORDER) {
        const want = S.jobWant[job] || 0;
        if (counts[job] < want) {
          for (const u of this.villagers()) {
            if (counts[job] >= want) break;
            if (u.job === 'idle') { this.changeJob(u, job); counts[job]++; counts.idle--; }
          }
        }
      }
    },

    // ---------------- Cập nhật dân làng ----------------
    update(dt) {
      const night = G.Time.isNight();
      for (const u of G.S.units) {
        if (!u.villager || u.dead) continue;
        if (u.act) { u.actT += dt; if (u.actT >= u.actDur) u.act = null; }
        u.moving = false;
        this.think(u, dt, night);
      }
      this.updatePlots(dt);
      this.updateWorkshops(dt);
      this.updateSheep(dt);
    },

    think(u, dt, night) {
      const S = G.S;
      // Có giặc gần: chạy về trú ẩn
      const danger = G.Units.nearest(u.x, u.y, 260, (e) => e.team === 1);
      if (danger && !(u.job === 'crafter' && u.hidden)) {
        if (u.state !== 'flee') { this.dropTask(u); u.state = 'flee'; this.goShelter(u); u.fleeT = 6; }
      }
      if (u.state === 'flee') {
        u.fleeT -= dt;
        if (this.walk(u, dt)) this.enterShelter(u);
        if (u.fleeT <= 0 && !danger) u.state = 'idle';
        return;
      }
      if (u.sheltered) {
        // ra khỏi nơi trú ẩn khi trời sáng và hết giặc
        if (!night && !G.Military.raidActive() && G.chance(dt * 0.8)) { u.sheltered = false; u.hidden = false; u.state = 'idle'; u.y += 6; }
        return;
      }
      if (night && !(u.job === 'crafter' && u.workplace) && u.job !== 'trader') {
        if (u.state !== 'home') { this.dropTask(u); u.state = 'home'; this.goShelter(u); }
        if (this.walk(u, dt)) this.enterShelter(u);
        return;
      }
      if (u.state === 'home') u.state = 'idle';

      switch (u.job) {
        case 'woodcutter': case 'quarry': case 'miner': case 'forager': return this.gatherAI(u, dt);
        case 'farmer': return this.farmerAI(u, dt);
        case 'shepherd': return this.shepherdAI(u, dt);
        case 'builder': return this.builderAI(u, dt);
        case 'crafter': return this.crafterAI(u, dt);
        case 'trader': return G.Economy.traderAI(u, dt);
        default: return this.idleAI(u, dt);
      }
    },

    walk(u, dt) { return G.Units.followPath(u, dt); },

    goShelter(u) {
      let best = null, bd = Infinity;
      for (const b of G.S.buildings) {
        if (b.team !== 0 || !b.built) continue;
        const d = G.BUILDINGS[b.type];
        if (!d.house && b.type !== 'castle') continue;
        const c = G.Build.center(b);
        const dd = G.dist2(u.x, u.y, c.x, c.y);
        if (dd < bd) { bd = dd; best = b; }
      }
      u.shelter = best ? best.id : 0;
      if (best) G.Units.moveToRect(u, best); else u.path = null;
    },
    enterShelter(u) {
      const b = G.byId(u.shelter);
      if (!b) return;
      const c = G.Build.center(b);
      if (G.dist(u.x, u.y, c.x, c.y) < Math.max(b.w, b.h) * T * 0.9) {
        u.hidden = true; u.sheltered = true; u.x = c.x; u.y = (b.ty + b.h) * T + 6; u.path = null;
      } else if (!u.path) this.goShelter(u);
    },

    carryCap() { return G.S.techs.wheel ? 4 : 2; },

    deliverAI(u, dt) {
      // mang hàng về kho gần nhất
      if (!u.task || u.task.type !== 'deliver') {
        const d = G.Build.nearestDropoff(u.x, u.y);
        if (!d) { G.Economy.addItem(u.carry.item, u.carry.n); u.carry = null; return; }
        u.task = { type: 'deliver', id: d.id };
        G.Units.moveToRect(u, d);
      }
      if (this.walk(u, dt)) {
        const d = G.byId(u.task.id);
        if (!d) { u.task = null; return; }
        G.Economy.addItem(u.carry.item, u.carry.n, u);
        u.carry = null;
        u.task = null;
      }
    },

    gatherAI(u, dt) {
      if (u.carry) return this.deliverAI(u, dt);
      const type = { woodcutter: 'tree', quarry: 'rock', miner: 'gold', forager: 'bush' }[u.job];
      const def = G.NODE_DEF[type];
      let n = u.task && u.task.type === 'gather' ? G.byId(u.task.id) : null;
      if (!n || n.amount <= 0 || n.removed) {
        n = this.findNode(u, type);
        if (!n) { this.idleAI(u, dt); return; }
        u.task = { type: 'gather', id: n.id, t: 0 };
        n.claims = (n.claims || 0) + 1;
        G.Units.moveTo(u, n.x, n.y, { near: true });
        u.state = 'walk';
      }
      if (u.state === 'walk') {
        if (this.walk(u, dt)) {
          if (G.dist(u.x, u.y, n.x, n.y) > T * 1.6) { this.releaseNode(u); u.task = null; return; }
          u.state = 'work';
        }
        return;
      }
      // làm việc
      u.facing = n.x > u.x ? 1 : -1;
      if (!u.act) G.Units.act(u, def.anim, 0.75);
      let speed = this.workMult() * (G.S.techs.axe && type !== 'bush' ? 1.3 : 1);
      u.task.t += dt * speed;
      if (u.task.t >= def.work) {
        const got = G.Nodes.take(n, Math.min(def.per * (G.S.techs.wheel ? 2 : 1), this.carryCap()));
        G.Audio.playAt(type === 'tree' ? 'chop' : type === 'bush' ? 'pick' : 'mine', u.x, u.y);
        this.releaseNode(u);
        u.task = null;
        u.state = 'idle';
        if (got > 0) u.carry = { item: def.item, n: got };
      }
    },
    releaseNode(u) {
      if (u.task && u.task.type === 'gather') { const n = G.byId(u.task.id); if (n) n.claims = Math.max(0, (n.claims || 1) - 1); }
    },

    findNode(u, type) {
      let best = null, bd = Infinity;
      const base = G.Build.nearestDropoff(u.x, u.y);
      const bx = base ? base.x : u.x, by = base ? base.y : u.y;
      for (const n of G.S.nodes) {
        if (n.type !== type || n.amount <= 0 || (n.claims || 0) >= 2 || n.unsafeT > G.S.day * 1000 + G.S.time * 1000) continue;
        const ax = n.x - u.x, ay = n.y - u.y, cx = n.x - bx, cy = n.y - by;
        const d = (ax * ax + ay * ay) * 0.5 + cx * cx + cy * cy;
        if (d < bd) { bd = d; best = n; }
      }
      if (best && bd > (40 * T) ** 2) return null;
      if (best && G.Military.dangerAt(best.x, best.y)) { best.unsafeT = G.S.day * 1000 + G.S.time * 1000 + 30; return null; }
      return best;
    },

    // ---------------- Nông trại ----------------
    updatePlots(dt) {
      const S = G.S;
      const season = G.Time.season().id;
      for (const b of S.buildings) {
        if (b.type !== 'plot' || !b.built || b.stage < 0 || b.withered) continue;
        const crop = G.CROPS[b.crop];
        if (b.stage < 3) {
          let m = G.Time.growMult(b);
          if (!crop.seasons.includes(season) && season !== 'winter') m *= 0.5;
          b.growth += dt * m / (crop.days * G.DAY_LEN);
          b.stage = Math.min(3, Math.floor(b.growth * 3.999));
          if (b.growth >= 1) { b.stage = 3; b.ripeT = 0; }
        } else {
          b.ripeT += dt;
          if (b.ripeT > G.DAY_LEN * 2.5) { b.withered = true; }
        }
      }
    },

    /** Ruộng cần việc: gieo (trống) hoặc gặt (chín) hoặc dọn (héo). */
    plotNeed(b) {
      if (!b.built || b.claimBy) return null;
      if (b.withered) return 'clear';
      if (b.stage === 3) return 'harvest';
      if (b.stage < 0 && b.crop) {
        const crop = G.CROPS[b.crop];
        const season = G.Time.season().id;
        if (season === 'winter' && !G.S.techs.greenhouse) return null;
        if (crop.locked && !G.S.flags.pumpkinUnlocked) return null;
        return 'plant';
      }
      return null;
    },

    farmerAI(u, dt) {
      if (u.carry) return this.deliverAI(u, dt);
      let b = u.task && u.task.type === 'farm' ? G.byId(u.task.id) : null;
      if (!b) {
        let best = null, bd = Infinity;
        for (const p of G.S.buildings) {
          if (p.type !== 'plot' || p.team !== 0) continue;
          const need = this.plotNeed(p);
          if (!need) continue;
          const d = G.dist2(u.x, u.y, p.x, p.y) - (need === 'harvest' ? 40000 : 0);
          if (d < bd) { bd = d; best = p; }
        }
        if (!best) return this.idleAI(u, dt);
        b = best;
        b.claimBy = u.id;
        u.task = { type: 'farm', id: b.id, t: 0, need: this.plotNeed({ ...b, claimBy: 0 }) };
        G.Units.moveTo(u, (b.tx + 0.5) * T, (b.ty + 0.5) * T);
        u.state = 'walk';
      }
      if (u.state === 'walk') {
        if (this.walk(u, dt)) u.state = 'work';
        return;
      }
      if (!u.act) G.Units.act(u, u.task.need === 'harvest' ? 'knife' : 'hammer', 0.7);
      u.task.t += dt * this.workMult();
      if (u.task.t >= 2.2) {
        const res = this.doPlot(b, u.task.need);
        b.claimBy = 0;
        u.task = null;
        u.state = 'idle';
        if (res) u.carry = res;
      }
    },

    /** Thực hiện việc trên ruộng; trả về hàng thu được (nếu gặt). */
    doPlot(b, need) {
      if (need === 'plant' && b.stage < 0) {
        b.stage = 0; b.growth = 0; b.withered = false;
        G.Audio.playAt('plant', b.x, b.y);
        return null;
      }
      if (need === 'clear' && b.withered) {
        b.stage = -1; b.growth = 0; b.withered = false;
        return null;
      }
      if (need === 'harvest' && b.stage === 3) {
        const crop = G.CROPS[b.crop];
        let n = crop.yield + (G.S.techs.hoe ? 1 : 0) + (b.crop === 'wheat' && G.S.flags.goldwheat ? 2 : 0);
        b.stage = -1; b.growth = 0;
        G.S.stats.harvested = (G.S.stats.harvested || 0) + n;
        G.Audio.playAt('pick', b.x, b.y);
        G.FX.text(b.x, b.y - 30, `+${n} ${crop.name}`, '#ffe08a', 13);
        return { item: crop.item, n };
      }
      return null;
    },

    // ---------------- Thợ xây ----------------
    builderAI(u, dt) {
      let b = u.task && u.task.type === 'build' ? G.byId(u.task.id) : null;
      if (b && b.built && b.hp >= b.maxHp && !b.fire) b = null;
      if (!b) {
        u.task = null;
        let best = null, bd = Infinity;
        for (const s of G.S.buildings) {
          if (s.team !== 0) continue;
          const needs = !s.built || s.hp < s.maxHp * 0.98 || s.fire > 0;
          if (!needs || (s.builders || 0) >= Math.max(2, s.w * s.h)) continue;
          if (G.Military.dangerAt(s.x, s.y)) continue;
          const d = G.dist2(u.x, u.y, s.x, s.y) - (s.fire > 0 ? 1e7 : 0) - (G.BUILDINGS[s.type].drag ? 0 : 5e5);
          if (d < bd) { bd = d; best = s; }
        }
        if (!best) return this.idleAI(u, dt);
        b = best;
        u.task = { type: 'build', id: b.id };
        G.Units.moveToRect(u, b);
        u.state = 'walk';
      }
      if (u.state === 'walk') {
        if (this.walk(u, dt)) {
          const c = G.Build.center(b);
          if (Math.abs(u.x - c.x) > (b.w / 2 + 1.3) * T || Math.abs(u.y - c.y) > (b.h / 2 + 1.3) * T) { u.task = null; return; }
          u.state = 'work';
          b.builders = (b.builders || 0) + 1;
          u.task.counted = true;
        }
        return;
      }
      u.facing = b.x > u.x ? 1 : -1;
      if (!u.act) G.Units.act(u, 'hammer', 0.6);
      const rate = dt * this.workMult();
      if (b.fire > 0) {
        b.fire = Math.max(0, b.fire - rate * 3);
      } else if (!b.built) {
        G.Build.work(b, rate * 1.0);
        if (Math.random() < dt * 1.5) G.Audio.playAt('hammer', u.x, u.y);
      } else if (b.hp < b.maxHp) {
        if (G.S.stock.wood > 0 || Math.random() < 0.5) {
          b.hp = Math.min(b.maxHp, b.hp + rate * b.maxHp / 40);
          if (Math.random() < dt * 0.2) G.S.stock.wood = Math.max(0, G.S.stock.wood - 1);
          if (Math.random() < dt * 1.2) G.Audio.playAt('hammer', u.x, u.y);
        }
      }
      if (b.built && b.hp >= b.maxHp && !b.fire) {
        if (u.task.counted) b.builders = Math.max(0, (b.builders || 1) - 1);
        u.task = null; u.state = 'idle';
      }
    },

    // ---------------- Thợ xưởng ----------------
    crafterAI(u, dt) {
      let b = u.workplace ? G.byId(u.workplace) : null;
      if (!b) {
        u.workplace = 0;
        // xưởng còn chỗ, ưu tiên xưởng ít người
        let best = null, bw = 99;
        for (const s of G.S.buildings) {
          const d = G.BUILDINGS[s.type];
          if (s.team !== 0 || !s.built || !d.slots || s.paused) continue;
          if (s.workers.length >= d.slots) continue;
          if (s.workers.length < bw) { bw = s.workers.length; best = s; }
        }
        if (!best) return this.idleAI(u, dt);
        b = best;
        b.workers.push(u.id);
        u.workplace = b.id;
        u.hidden = false;
        G.Units.moveToRect(u, b);
        u.state = 'walk';
      }
      if (u.state === 'walk') {
        if (this.walk(u, dt)) { u.state = 'inside'; u.hidden = true; }
      }
    },

    updateWorkshops(dt) {
      const S = G.S;
      for (const b of S.buildings) {
        const d = G.BUILDINGS[b.type];
        if (!d.recipes || !b.built || b.team !== 0) continue;
        const workers = b.workers.filter((id) => { const w = G.byId(id); return w && w.hidden && w.state === 'inside'; }).length;
        b.activeWorkers = workers;
        if (!workers || b.paused) { b.running = false; continue; }
        const r = d.recipes[b.recipe || 0];
        if (!b.running) {
          if (!G.Economy.has(r.in)) { b.starved = true; continue; }
          G.Economy.take(r.in);
          b.running = true; b.prog = 0; b.starved = false;
        }
        const speed = workers * this.workMult() * (S.flags.artisan ? 1.2 : 1);
        b.prog += dt * speed / r.t;
        if (b.prog >= 1) {
          b.running = false;
          for (const k in r.out) G.Economy.addItem(k, r.out[k]);
          const k0 = Object.keys(r.out)[0];
          G.FX.text(b.x, b.y - b.h * T, `+${r.out[k0]} ${G.ITEMS[k0].name}`, '#bfe8ff', 13);
          S.stats['made_' + k0] = (S.stats['made_' + k0] || 0) + r.out[k0];
        }
      }
    },

    // ---------------- Chăn cừu ----------------
    pens() { return G.S.buildings.filter((b) => b.type === 'pen' && b.team === 0 && b.built); },
    sheepIn(pen) { return G.S.units.filter((u) => u.sheep && u.pen === pen.id); },
    penWithRoom() { return this.pens().find((p) => this.sheepIn(p).length < G.BUILDINGS.pen.sheepCap); },

    updateSheep(dt) {
      const woolRate = (G.S.techs.husbandry ? 1.5 : 1) / (G.DAY_LEN * 1.2);
      for (const u of G.S.units) {
        if (!u.sheep) continue;
        if (u.act) { u.actT += dt; if (u.actT >= u.actDur) u.act = null; }
        u.moving = false;
        if (u.pen) {
          const p = G.byId(u.pen);
          if (!p) { u.pen = 0; u.team = 3; continue; }
          if (G.Time.season().id !== 'winter') u.wool = Math.min(1, u.wool + dt * woolRate);
          this.wander(u, dt, (p.tx + 0.6) * T, (p.ty + 0.8) * T, (p.tx + p.w - 0.6) * T, (p.ty + p.h - 0.4) * T);
        } else if (u.follow) {
          const h = G.byId(u.follow);
          if (!h) { u.follow = 0; continue; }
          const pen = this.penWithRoom();
          if (pen && G.dist(u.x, u.y, (pen.tx + 1.5) * T, (pen.ty + 1.5) * T) < T * 2.2) {
            u.follow = 0; u.pen = pen.id; u.team = 0;
            G.UI.toast('Cừu đã vào chuồng!', 'good');
            G.Audio.play('sheep');
            continue;
          }
          if (G.dist(u.x, u.y, h.x, h.y) > 60) G.Units.stepToward(u, h.x - h.facing * 30, h.y + 10, dt * 2.6);
        } else {
          this.wander(u, dt, u.x - 3 * T, u.y - 3 * T, u.x + 3 * T, u.y + 3 * T, true);
        }
      }
    },

    wander(u, dt, x0, y0, x1, y1, free) {
      if (!u.wx || u.timer <= 0 || (free && u.wx === undefined)) {
        u.timer = 2 + Math.random() * 5;
        if (Math.random() < 0.45) { u.wx = null; u.grazing = Math.random() < 0.6; }
        else { u.wx = G.rnd(x0, x1); u.wy = G.rnd(y0, y1); u.grazing = false; }
      }
      u.timer -= dt;
      if (u.wx != null) {
        if (G.dist(u.x, u.y, u.wx, u.wy) < 4) u.wx = null;
        else {
          const ox = u.x, oy = u.y;
          G.Units.stepToward(u, u.wx, u.wy, dt);
          if (ox === u.x && oy === u.y) u.wx = null;
        }
      }
    },

    shepherdAI(u, dt) {
      if (u.carry) return this.deliverAI(u, dt);
      let s = u.task && u.task.type === 'shear' ? G.byId(u.task.id) : null;
      if (!s) {
        s = G.S.units.find((v) => v.sheep && v.pen && v.wool >= 1 && !v.claimed);
        if (!s) {
          const p = this.pens()[0];
          if (!p) return this.idleAI(u, dt);
          if (!u.path && G.dist(u.x, u.y, (p.tx + 1.5) * T, (p.ty + 3.4) * T) > T * 2) G.Units.moveTo(u, (p.tx + 1.5) * T, (p.ty + 3.4) * T);
          this.walk(u, dt);
          return;
        }
        s.claimed = u.id;
        u.task = { type: 'shear', id: s.id, t: 0 };
        u.state = 'walk';
      }
      if (u.state === 'walk') {
        if (G.dist(u.x, u.y, s.x, s.y) > 40) { G.Units.stepToward(u, s.x, s.y, dt); return; }
        u.state = 'work';
      }
      if (!u.act) G.Units.act(u, 'knife', 0.6);
      u.task.t += dt * this.workMult();
      if (u.task.t > 2.5) {
        s.wool = 0; s.claimed = 0;
        const n = G.S.techs.husbandry ? 3 : 2;
        u.carry = { item: 'wool', n };
        u.task = null; u.state = 'idle';
        G.Audio.playAt('sheep', s.x, s.y);
      }
    },

    breedSheep() {
      const season = G.Time.season().id;
      if (season === 'winter' || (season !== 'spring' && !G.S.techs.husbandry)) return;
      for (const p of this.pens()) {
        const n = this.sheepIn(p).length;
        if (n >= 2 && n < G.BUILDINGS.pen.sheepCap && Math.random() < 0.5) {
          G.Units.spawnSheep((p.tx + 1.5) * T, (p.ty + 1.5) * T, 0, p.id);
          G.UI.log('Một chú cừu non vừa chào đời.', 'good');
        }
      }
    },

    slaughter(pen) {
      const list = this.sheepIn(pen);
      if (!list.length) return;
      const s = list[list.length - 1];
      G.Units.remove(s);
      G.Economy.addItem('meat', 4);
      G.FX.text(s.x, s.y - 20, '+4 Thịt', '#ffb3a7', 13);
    },

    addSheepToPens(n) {
      let added = 0;
      for (let i = 0; i < n; i++) {
        const p = this.penWithRoom();
        if (!p) break;
        G.Units.spawnSheep((p.tx + 1.5) * T, (p.ty + 1.5) * T, 0, p.id);
        added++;
      }
      return added;
    },

    loseSheep(n) {
      const list = G.S.units.filter((u) => u.sheep && u.team === 0);
      for (let i = 0; i < n && list.length; i++) G.Units.remove(list.pop());
      G.UI.log(`Mất ${n} cừu vì dịch bệnh.`, 'bad');
    },

    // ---------------- Thảm hoạ ----------------
    stormDamage() {
      const bs = G.S.buildings.filter((b) => b.team === 0 && b.built && !G.BUILDINGS[b.type].road);
      for (let i = 0; i < 3 && bs.length; i++) {
        const b = bs[Math.floor(Math.random() * bs.length)];
        b.hp = Math.max(1, b.hp - b.maxHp * 0.3);
      }
      for (const p of G.S.buildings) if (p.type === 'plot' && p.stage >= 0 && Math.random() < 0.25) { p.stage = -1; p.growth = 0; }
      G.Economy.addItem('wood', 15);
    },

    randomFire() {
      const bs = G.S.buildings.filter((b) => b.team === 0 && b.built && G.BUILDINGS[b.type].house && b.type !== 'castle');
      if (!bs.length) return;
      const b = G.pick(bs);
      this.ignite(b);
      G.UI.ping(b.x, b.y - 30, 'Cháy!');
    },

    ignite(b) {
      if (G.BUILDINGS[b.type].road || G.BUILDINGS[b.type].ground) return;
      const nearWell = G.S.buildings.some((w) => w.type === 'well' && w.built && G.dist(w.x, w.y, b.x, b.y) < 6 * T);
      b.fire = nearWell ? 6 : 16;
    },

    updateFires(dt) {
      for (const b of G.S.buildings) {
        if (!(b.fire > 0)) continue;
        b.fire -= dt;
        G.Build.damage(b, dt * b.maxHp * 0.035, null);
        if (Math.random() < dt * 3) G.FX.particle(b.x + G.rnd(-b.w, b.w) * 20, b.y - b.h * T * 0.6, { key: 'p.smoke', dur: 1.4, vy: -35, vx: G.rnd(-8, 8), scale: 1.2 });
      }
    },

    // ---------------- Rảnh rỗi ----------------
    idleAI(u, dt) {
      if (u.carry) return this.deliverAI(u, dt);
      const c = G.byId(G.S.castleId);
      if (!c) return;
      if (!u.path) {
        u.timer -= dt;
        if (u.timer <= 0) {
          u.timer = 3 + Math.random() * 6;
          const spot = G.World.findFreeTile(c.tx + 2, c.ty + 4, 1, 4);
          if (spot) G.Units.moveTo(u, (spot.x + 0.5) * T, (spot.y + 0.5) * T);
        }
      } else this.walk(u, dt);
    },

    // ---------------- Hằng ngày ----------------
    /** Gọi lúc bình minh: ăn uống, lòng dân, dân mới. Trả về báo cáo. */
    daily() {
      const S = G.S;
      const rep = { morale: [], foodNeed: 0, foodEaten: 0, types: 0 };
      const vs = this.villagers();
      const soldiers = S.units.filter((u) => u.team === 0 && u.soldier);
      let need = vs.length * 2;
      for (const s of soldiers) need += G.UNITS[s.type].eat || 0;
      const eaten = G.Economy.eat(need);
      rep.foodNeed = need; rep.foodEaten = eaten.points; rep.types = eaten.types;
      let dm = 0;
      if (eaten.points < need) {
        const lack = need - eaten.points;
        dm -= Math.min(25, 6 + lack * 0.8);
        rep.morale.push(['Thiếu ăn', -Math.min(25, 6 + lack * 0.8)]);
        // người bỏ đi
        const leave = Math.min(vs.length - 1, Math.floor(lack / 8), Math.max(1, Math.ceil(vs.length * 0.1)));
        for (let i = 0; i < leave; i++) {
          const v = vs.pop();
          this.dropTask(v);
          G.Units.remove(v);
        }
        if (leave > 0) G.UI.log(`${leave} người dân bỏ làng vì đói!`, 'bad');
        const desert = soldiers.filter((s) => !s.merc).slice(0, Math.floor(lack / 12));
        for (const s of desert) G.Units.remove(s);
        if (desert.length) G.UI.log(`${desert.length} binh sĩ đào ngũ vì đói!`, 'bad');
      } else if (eaten.types > 1) {
        const v = Math.min(8, (eaten.types - 1) * 2);
        dm += v; rep.morale.push([`Ăn đa dạng (${eaten.types} món)`, v]);
      }
      const tax = G.TAX[S.tax];
      if (tax.morale) { dm += tax.morale; rep.morale.push(['Thuế ' + tax.name, tax.morale]); }
      let deco = 0;
      for (const b of S.buildings) if (b.team === 0 && b.built && G.BUILDINGS[b.type].morale) deco += G.BUILDINGS[b.type].morale;
      deco = Math.min(10, deco);
      if (deco) { dm += deco; rep.morale.push(['Công trình', deco]); }
      if (G.Time.season().id === 'winter') {
        const fires = S.buildings.filter((b) => b.team === 0 && b.built && b.type === 'campfire').length;
        const woodNeed = Math.ceil(vs.length / 3);
        if (S.stock.wood >= woodNeed) { S.stock.wood -= woodNeed; rep.morale.push([`Sưởi ấm (-${woodNeed} gỗ)`, 0]); }
        else { dm -= 6; rep.morale.push(['Rét mướt (thiếu gỗ sưởi)', -6]); }
        if (fires) { dm += Math.min(3, fires); rep.morale.push(['Lửa trại', Math.min(3, fires)]); }
      }
      // kéo dần về mức cân bằng 50
      const drift = (50 - S.morale) * 0.08;
      dm += drift;
      S.morale = G.clamp(S.morale + dm, 0, 100);
      rep.moraleDelta = dm;

      // dân mới
      const cap = G.Build.houseCap();
      const pop = this.villagers().length;
      let arrivals = 0;
      if (pop < cap && eaten.points >= need && G.Economy.foodPoints() >= pop * 2 && S.morale >= 35) {
        arrivals = Math.min(cap - pop, S.morale >= 75 ? 3 : S.morale >= 55 ? 2 : 1);
        this.addVillagers(arrivals);
        G.UI.log(`${arrivals} người mới đến làng.`, 'good');
      }
      rep.arrivals = arrivals;
      if (S.morale < 15 && pop > 3 && Math.random() < 0.5) {
        const v = this.villagers().pop();
        if (v) { this.dropTask(v); G.Units.remove(v); G.UI.log('Một gia đình bỏ đi vì bất mãn.', 'bad'); }
      }
      this.breedSheep();
      return rep;
    },
  };
  G.Village = Village;
})(typeof window !== 'undefined' ? window : globalThis);
