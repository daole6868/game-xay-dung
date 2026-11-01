/* Quân sự: chiến đấu, đạn tên, tháp, binh sĩ, quân Huyết Nha, trận cướp đêm, trại giặc. */
(function (root) {
  'use strict';
  const G = root.G;
  const T = G.TILE;

  const Military = {
    projectiles: [],

    // ---------------- Chỉ số ----------------
    applyBuffs(u) {
      const def = G.UNITS[u.type];
      const S = G.S;
      let hp = def.hp, dmg = def.dmg || 0, armor = def.armor, range = def.range;
      if (S.techs.mail) armor += 2;
      if (S.techs.discipline) hp *= 1.15;
      if (S.techs.longbow && u.type === 'archer') { range *= 1.2; dmg *= 1.2; }
      const r = 1 + (u.rank || 0) * 0.12;
      const ratio = u.maxHp ? u.hp / u.maxHp : 1;
      u.maxHp = Math.round(hp * r);
      u.hp = Math.max(1, Math.round(u.maxHp * ratio));
      u.dmg = dmg * r; u.armor = armor; u.range = range;
      u.heal = (def.heal || 0) * r;
    },
    refreshAllBuffs() {
      for (const u of G.S.units) if (u.team === 0 && u.soldier) this.applyBuffs(u);
      if (G.Hero.unit()) G.Hero.applyStats(G.Hero.unit());
    },
    applyEnemyScaling(u) {
      const S = G.S;
      const diff = G.DIFFICULTY[S.difficulty];
      const lvl = 1 + Math.min(1.5, S.day * 0.025);
      const camp = G.Modes.mode() === 'campaign';
      u.maxHp = Math.round(u.maxHp * (u.boss ? 1 + (G.Eras.enemyEra() - 3) * 0.3 : lvl) * (camp ? 1 : G.Modes.levelHp()));
      u.hp = u.maxHp;
      u.dmg *= diff.enemyDmg * (camp ? 1 : G.Modes.levelDmg()) * (u.boss ? 1 : Math.min(1.6, 1 + S.day * 0.012));
      u.heal = (G.UNITS[u.type].heal || 0);
    },

    // ---------------- Truy vấn ----------------
    isEnemy(a, b) {
      if (!b || b.dead || b.removed || b.invuln) return false;
      if (a.team === 0) return b.team === 1;
      if (a.team === 1) return b.team === 0 && !b.hidden;
      return false;
    },
    dangerAt(x, y) { return !!G.Units.nearest(x, y, 6 * T, (e) => e.team === 1); },
    raidActive() { return !!(G.S.raid && G.S.raid.active); },
    alarm(x, y) { G.S.alarm = { x, y, t: 6 }; },

    distToTarget(u, t) {
      if (t.building) {
        const x0 = t.tx * T, y0 = t.ty * T, x1 = (t.tx + t.w) * T, y1 = (t.ty + t.h) * T;
        const cx = G.clamp(u.x, x0, x1), cy = G.clamp(u.y, y0, y1);
        return G.dist(u.x, u.y, cx, cy);
      }
      return G.dist(u.x, u.y, t.x, t.y);
    },
    targetPoint(t) { return t.building ? { x: t.x, y: t.y - t.h * T * 0.4 } : { x: t.x, y: t.y - 20 }; },

    findTarget(u, radius, opts = {}) {
      let best = null, bd = Infinity;
      const list = G.Units.near(u.x, u.y, radius, (e) => this.isEnemy(u, e));
      for (const e of list) {
        let d = G.dist2(u.x, u.y, e.x, e.y);
        if (e.hero) d *= 0.85;
        if (e.villager) d *= 1.3;
        if (d < bd) { bd = d; best = e; }
      }
      if (best || !opts.buildings) return best;
      for (const b of G.S.buildings) {
        if (b.team === u.team || b.team === 2 || G.BUILDINGS[b.type].ground) continue;
        if (u.team === 0 && b.team !== 1) continue;
        if (opts.onlyBuilt && !b.built) continue;
        const d = this.distToTarget(u, b);
        if (d < radius && d * d < bd) { bd = d * d; best = b; }
      }
      return best;
    },

    // ---------------- Tấn công ----------------
    tryAttack(u, t, dt) {
      const d = this.distToTarget(u, t);
      if (d > u.range + (t.building ? 6 : 14)) return false;
      u.facing = t.x >= u.x ? 1 : -1;
      if (u.atkT > 0 || u.act) return true;
      const kind = u.kind;
      const ud = G.UNITS[u.type] || {};
      const anim = kind === 'archer' ? 'shoot' : kind === 'lancer' ? 'attack' : kind === 'monk' ? 'heal' : kind === 'pawn' ? ud.anim || 'knife' : kind === 'warrior' ? (Math.random() < 0.5 ? 'attack1' : 'attack2') : ud.anim || 'attack';
      const dur = Math.min(u.cd * 0.85, ud.ranged ? 0.7 : 0.45);
      G.Units.act(u, anim, dur);
      u.atkT = u.cd * (0.9 + Math.random() * 0.2);
      u.pending = { id: t.id, at: dur * 0.55 };
      return true;
    },

    /** Gọi mỗi khung: xử lý đòn đánh đang chờ ra tay. */
    resolvePending(u, dt) {
      if (u.atkT > 0) u.atkT -= dt;
      if (!u.pending) return;
      u.pending.at -= dt;
      if (u.pending.at > 0) return;
      const t = G.byId(u.pending.id);
      u.pending = null;
      if (!t || t.dead || t.removed) return;
      const def = G.UNITS[u.type] || {};
      if (u.heal && def.healer) return;
      if (def.ranged || u.kind === 'archer') {
        this.shoot(u.x + u.facing * (def.vehicle ? 40 : 18), u.y - (def.vehicle ? 26 : 34), t, u.dmg, u.team, u.color, u, { proj: def.proj, aoe: def.aoe, siege: def.siege });
        G.Audio.playAt(def.proj === 'bullet' ? 'shot' : def.proj === 'shell' || def.proj === 'missile' ? 'cannon' : 'bow', u.x, u.y);
        return;
      }
      if (this.distToTarget(u, t) > u.range + 28) return;
      this.hit(u, t, u.dmg);
      G.Audio.playAt(t.building ? 'hitwood' : 'sword', u.x, u.y);
      if (def.arson && t.building && Math.random() < 0.35) G.Village.ignite(t);
    },

    hit(src, t, dmg) {
      let mult = 1;
      const sdef = src && G.UNITS[src.type];
      if (sdef && sdef.bonus && t.type) {
        const tk = G.UNITS[t.type] ? G.UNITS[t.type].kind : null;
        if (tk && sdef.bonus[tk]) mult = sdef.bonus[tk];
      }
      if (src && src.buffT > 0) mult *= 1.3;
      if (t.building) {
        const siege = (sdef && sdef.siege) || (src && src.siege);
        const vsB = siege ? 1.4 : sdef && sdef.ranged ? 0.35 : 0.6;
        G.Build.damage(t, dmg * mult * (src && src.team === 1 ? vsB : siege ? 2.2 : 1), src);
        return;
      }
      this.damageUnit(t, dmg * mult, src);
    },

    damageUnit(t, dmg, src) {
      if (t.invuln || t.dead) return;
      let d = Math.max(dmg * 0.25, dmg - t.armor);
      if (t.guardT > 0) d *= 0.3;
      t.hp -= d;
      t.hitT = 0.15;
      G.FX.text(t.x + G.rnd(-8, 8), t.y - 60 * (t.scale || 1), Math.round(d), t.team === 0 ? '#ff8a80' : '#fff', 14);
      if (t.team === 0 && t.villager) G.Military.alarm(t.x, t.y);
      if (src && t.team === 1 && !t.target) t.target = src.id;
      if (t.hp <= 0) this.kill(t, src);
    },

    heal(t, amount) {
      if (t.dead || t.hp >= t.maxHp) return;
      t.hp = Math.min(t.maxHp, t.hp + amount);
      G.FX.text(t.x, t.y - 60, '+' + Math.round(amount), '#9effa1', 13);
    },

    kill(u, src) {
      if (u.dead) return;
      if (u.hero) { G.Hero.die(); return; }
      G.FX.sprite('fx.dust', u.x, u.y, 0.8);
      G.Audio.playAt('death', u.x, u.y);
      const def = G.UNITS[u.type] || {};
      if (u.team === 1) {
        G.S.stats.kills = (G.S.stats.kills || 0) + 1;
        const gold = Math.round((def.loot || 3) * (0.8 + Math.random() * 0.4));
        if (u.thief) { G.S.drops.push({ id: G.newId(), x: u.x, y: u.y, gold: u.stolen || 0, chest: true }); G.UI.toast('Đã tóm được kẻ trộm!', 'good'); }
        else if (gold) G.S.drops.push({ id: G.newId(), x: u.x + G.rnd(-6, 6), y: u.y, gold });
        G.Hero.gainXp(u.boss ? 400 : Math.round((def.hp || 50) / 8));
        if (src && src.soldier) this.gainRank(src);
        if (u.boss) this.bossDied(u);
      } else if (u.team === 0) {
        if (u.villager) { G.Village.dropTask(u); G.Village.addMorale(-4, `${u.name} đã hy sinh`); G.S.stats.lostVillagers = (G.S.stats.lostVillagers || 0) + 1; }
        if (u.soldier) { G.Village.addMorale(-2, null); G.UI.log(`${G.UNITS[u.type].name} đã ngã xuống.`, 'bad'); G.S.stats.lostSoldiers = (G.S.stats.lostSoldiers || 0) + 1; }
      }
      G.Units.remove(u);
    },

    gainRank(s) {
      s.kills = (s.kills || 0) + 1;
      const ranks = [3, 8, 16];
      const r = ranks.filter((k) => s.kills >= k).length;
      if (r > (s.rank || 0)) {
        s.rank = r;
        this.applyBuffs(s);
        G.FX.text(s.x, s.y - 70, 'Thăng cấp!', '#ffd166', 14);
      }
    },

    shoot(x, y, t, dmg, team, color, src, o = {}) {
      const p = this.targetPoint(t);
      const proj = o.proj || 'arrow';
      const speed = proj === 'bullet' ? 1300 : proj === 'shell' ? 650 : proj === 'missile' ? 520 : 560;
      this.projectiles.push({ x, y, tx: p.x, ty: p.y, tid: t.id, dmg, team, color: color || 'blue', src: src ? src.id : 0, speed, life: 3, proj, aoe: o.aoe || 0, siege: o.siege });
    },

    /** Nổ lan: gây sát thương mọi kẻ địch quanh điểm nổ. */
    splash(p, x, y) {
      const r = p.aoe * T;
      G.FX.sprite('fx.explosion', x, y, Math.min(1.6, 0.5 + p.aoe * 0.4));
      if (p.proj !== 'shell' || Math.random() < 0.5) G.Audio.playAt('boom', x, y);
      const enemyTeam = p.team === 0 ? 1 : 0;
      for (const e of G.Units.near(x, y, r, (u) => u.team === enemyTeam && !u.hidden && !u.invuln)) {
        if (e.id !== p.tid) this.damageUnit(e, p.dmg * 0.6, G.byId(p.src));
      }
      for (const b of G.S.buildings) {
        if (b.team !== enemyTeam || b.id === p.tid || G.BUILDINGS[b.type].road) continue;
        if (G.dist(b.x, b.y - b.h * T / 2, x, y) < r + b.w * T / 2) G.Build.damage(b, p.dmg * 0.5 * (p.siege ? 2 : 1), null);
      }
    },

    updateProjectiles(dt) {
      for (const p of this.projectiles) {
        const t = G.byId(p.tid);
        if (t && !t.dead && !t.removed) { const tp = this.targetPoint(t); p.tx = tp.x; p.ty = tp.y; }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        p.ang = Math.atan2(dy, dx);
        p.life -= dt;
        if (d < p.speed * dt + 4) {
          p.life = 0;
          if (t && !t.dead && !t.removed) this.hit(G.byId(p.src) || { team: p.team, siege: p.siege }, t, p.dmg);
          if (p.aoe) this.splash(p, p.tx, p.ty);
        } else { p.x += (dx / d) * p.speed * dt; p.y += (dy / d) * p.speed * dt; }
      }
      this.projectiles = this.projectiles.filter((p) => p.life > 0);
    },

    updateTowers(dt) {
      for (const b of G.S.buildings) {
        const def = G.BUILDINGS[b.type];
        const sh = def.shoot;
        if (!sh || !b.built) continue;
        if (b.type === 'castle' && (b.ruined || G.S.tier < (sh.tier || 0))) continue;
        b.atkT -= dt;
        if (b.atkT > 0) continue;
        let range = sh.range * T, dmg = sh.dmg;
        if (b.type === 'castle') dmg += (G.S.tier - 1) * 4;
        let proj = sh.proj || 'arrow';
        if (b.team === 0) {
          if (G.S.techs.longbow) { range *= 1.2; dmg *= 1.2; }
          if (G.S.techs.masonry) dmg *= 1.25;
          if (G.Modes.eraMode() && (b.type === 'tower' || b.type === 'castle')) {
            const E = G.Eras.def();
            dmg *= E.tower;
            if (E.proj) proj = E.proj;
          }
          if (this.radarNear(b)) range *= 1.2;
        } else {
          dmg *= G.DIFFICULTY[G.S.difficulty].enemyDmg * (G.Modes.mode() === 'campaign' ? 1 : G.Modes.levelDmg());
          if (G.Eras.enemyEra() >= 4 && !sh.proj) proj = 'bullet';
        }
        const cx = b.x, cy = b.y - b.h * T * 0.5;
        const enemyTeam = b.team === 0 ? 1 : 0;
        const t = G.Units.nearest(cx, cy, range, (e) => e.team === enemyTeam && !e.hidden && !e.invuln && !e.dead);
        if (!t) continue;
        b.atkT = sh.cd;
        this.shoot(cx, b.y - b.h * T * 1.1, t, dmg, b.team, b.team === 0 ? 'blue' : 'red', null, { proj, aoe: sh.aoe, siege: false });
        G.Audio.playAt(proj === 'bullet' ? 'shot' : proj === 'arrow' ? 'bow' : 'cannon', cx, cy);
      }
    },

    radarNear(b) {
      for (const r of G.S.buildings) {
        const d = G.BUILDINGS[r.type];
        if (d.radar && r.team === b.team && r.built && G.dist(r.x, r.y, b.x, b.y) < d.radar * T) return true;
      }
      return false;
    },

    /** Bệnh viện hồi máu; rào thép gai làm chậm và gây thương tích. */
    updateAuras(dt) {
      this.auraT = (this.auraT || 0) - dt;
      if (this.auraT > 0) return;
      this.auraT = 1;
      for (const b of G.S.buildings) {
        const d = G.BUILDINGS[b.type];
        if (!d.heal || !b.built || b.team !== 0) continue;
        for (const u of G.Units.near(b.x, b.y - T, d.heal.range * T, (x) => x.team === 0 && !x.npc && !x.sheep && x.hp < x.maxHp)) {
          u.hp = Math.min(u.maxHp, u.hp + d.heal.hp);
          if (Math.random() < 0.3) G.FX.particle(u.x, u.y - 40, { color: '#9effa1', dur: 0.6, vy: -30, size: 3 });
        }
      }
      for (const u of G.S.units) {
        if (u.team !== 1 || u.dead) continue;
        const bd = G.World.buildingAt(Math.floor(u.x / T), Math.floor(u.y / T));
        if (bd && G.BUILDINGS[bd.type].barbed && bd.built) { u.slowT = 1.2; this.damageUnit(u, 4, null); }
      }
    },

    // ---------------- Binh sĩ phe ta ----------------
    squadAnchor(u) {
      const S = G.S;
      const hero = G.Hero.unit();
      if (u.squad === 'A' && hero && !hero.downed) return { x: hero.x, y: hero.y, leash: 7 * T, follow: true };
      const r = S.army.rally || this.castleFront();
      return { x: r.x, y: r.y, leash: S.army.mode === 'attack' ? 9 * T : 11 * T };
    },
    castleFront() {
      const c = G.byId(G.S.castleId);
      return c ? { x: (c.tx + 2.5) * T, y: (c.ty + 4) * T } : { x: 20 * T, y: 38 * T };
    },

    soldierAI(u, dt, slot) {
      if (u.act) { u.actT += dt; if (u.actT >= u.actDur) u.act = null; }
      u.moving = false;
      this.resolvePending(u, dt);
      if (u.buffT > 0) u.buffT -= dt;
      if (u.guardT > 0) u.guardT -= dt;
      if (u.expireDay && G.S.day >= u.expireDay) { G.UI.log('Lính đánh thuê đã hết hạn hợp đồng và rời đi.', 'info'); G.Units.remove(u); return; }
      const anc = this.squadAnchor(u);
      const def = G.UNITS[u.type];

      if (def.healer) return this.healerAI(u, dt, anc, slot);

      u.rethink -= dt;
      let t = u.target ? G.byId(u.target) : null;
      if (t && (!this.isEnemy(u, t) || G.dist(t.x, t.y, anc.x, anc.y) > anc.leash + 3 * T)) t = null;
      if (!t || u.rethink <= 0) {
        u.rethink = 0.5 + Math.random() * 0.3;
        // binh đoàn phòng thủ ứng cứu báo động
        let ax = anc.x, ay = anc.y, radius = anc.leash;
        if (!anc.follow && G.S.army.mode !== 'attack' && G.S.alarm && G.S.alarm.t > 0 && G.dist(G.S.alarm.x, G.S.alarm.y, anc.x, anc.y) < 16 * T) { ax = G.S.alarm.x; ay = G.S.alarm.y; radius = 8 * T; }
        const near = this.findTarget(u, Math.max(u.range + 3 * T, 6 * T), { buildings: G.S.army.mode === 'attack' && !anc.follow, onlyBuilt: true });
        if (near && (near.building || G.dist(near.x, near.y, anc.x, anc.y) < anc.leash + 2 * T)) t = near;
        else {
          const far = G.Units.nearest(ax, ay, radius, (e) => this.isEnemy(u, e));
          t = far || (G.S.army.mode === 'attack' && !anc.follow ? this.findTarget({ x: anc.x, y: anc.y, team: 0 }, 9 * T, { buildings: true, onlyBuilt: true }) : null);
        }
        u.target = t ? t.id : 0;
      }
      if (t) {
        if (this.tryAttack(u, t, dt)) { u.path = null; return; }
        this.chase(u, t, dt);
        return;
      }
      // về vị trí đội hình
      const sp = this.slotPos(anc, slot, u);
      const d = G.dist(u.x, u.y, sp.x, sp.y);
      if (d > 26) {
        if (d > 5 * T) {
          if (!u.path || u.repath <= 0) { G.Units.moveTo(u, sp.x, sp.y); u.repath = 1.2; }
          u.repath -= dt;
          G.Units.followPath(u, dt);
        } else { u.path = null; G.Units.stepToward(u, sp.x, sp.y, dt); }
      } else if (anc.follow) u.facing = G.Hero.unit().facing;
    },

    slotPos(anc, slot, u) {
      const row = Math.floor(slot / 4), col = slot % 4;
      if (anc.follow) {
        const h = G.Hero.unit();
        const back = -h.facing;
        return { x: anc.x + back * (50 + row * 42), y: anc.y + (col - 1.5) * 34 };
      }
      return { x: anc.x + (col - 1.5) * 44, y: anc.y + row * 40 };
    },

    chase(u, t, dt) {
      const d = G.dist(u.x, u.y, t.x, t.y);
      u.repath = (u.repath || 0) - dt;
      if (d < 3 * T) {
        u.path = null;
        const ox = u.x, oy = u.y;
        G.Units.stepToward(u, t.x, t.y, dt);
        if (ox === u.x && oy === u.y && u.repath <= 0) { G.Units.moveTo(u, t.x, t.y, t.building ? { rect: { x: t.tx, y: t.ty, w: t.w, h: t.h } } : { near: true }); u.repath = 1; }
        else return;
      }
      if (!u.path || u.repath <= 0) {
        if (t.building) G.Units.moveTo(u, t.x, t.y, { rect: { x: t.tx, y: t.ty, w: t.w, h: t.h } });
        else G.Units.moveTo(u, t.x, t.y, { near: true });
        u.repath = 0.8;
      }
      G.Units.followPath(u, dt);
    },

    healerAI(u, dt, anc, slot) {
      u.rethink -= dt;
      if (u.rethink <= 0) {
        u.rethink = 0.4;
        const hurt = G.Units.near(u.x, u.y, u.range + 2 * T, (a) => a.team === u.team && !a.hidden && !a.sheep && a.hp < a.maxHp * 0.92 && !a.npc);
        hurt.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        u.target = hurt.length ? hurt[0].id : 0;
      }
      const t = u.target ? G.byId(u.target) : null;
      if (t && !t.dead) {
        const d = G.dist(u.x, u.y, t.x, t.y);
        if (d <= u.range) {
          u.facing = t.x >= u.x ? 1 : -1;
          if (u.atkT <= 0 && !u.act) {
            G.Units.act(u, 'heal', 0.8);
            u.atkT = u.cd;
            let amt = u.heal * (G.S.techs.medicine ? 1.3 : 1);
            this.heal(t, amt);
            G.FX.sprite(`u.${u.color}.monk.heal_fx`, t.x, t.y, 1, { dur: 0.8, anim: true });
            G.Audio.playAt('heal', t.x, t.y);
          }
          return;
        }
        G.Units.stepToward(u, t.x, t.y, dt);
        return;
      }
      if (u.team === 1) return this.enemyIdle(u, dt);
      const sp = this.slotPos(anc, slot + 8, u);
      if (G.dist(u.x, u.y, sp.x, sp.y) > 30) {
        if (G.dist(u.x, u.y, sp.x, sp.y) > 5 * T) { if (!u.path) G.Units.moveTo(u, sp.x, sp.y); G.Units.followPath(u, dt); }
        else G.Units.stepToward(u, sp.x, sp.y, dt);
      }
    },

    updateArmy(dt) {
      const slots = { A: 0, B: 0 };
      for (const u of G.S.units) {
        if (u.team !== 0 || !u.soldier || u.dead) continue;
        this.soldierAI(u, dt, slots[u.squad]++);
      }
      if (G.S.alarm) { G.S.alarm.t -= dt; if (G.S.alarm.t <= 0) G.S.alarm = null; }
    },

    setSquad(type, squad, n) {
      // chuyển n lính loại type sang đội squad
      const other = squad === 'A' ? 'B' : 'A';
      const list = G.S.units.filter((u) => u.team === 0 && u.soldier && u.type === type && u.squad === other);
      for (let i = 0; i < n && i < list.length; i++) { list[i].squad = squad; list[i].target = 0; list[i].path = null; }
    },
    orderAttack(x, y) {
      G.S.army.mode = 'attack';
      G.S.army.rally = { x, y };
      for (const u of G.S.units) if (u.soldier && u.team === 0 && u.squad === 'B') { u.target = 0; u.path = null; }
      G.UI.toast('Đội viễn chinh đã xuất quân!', 'info');
      G.Audio.play('horn');
    },
    orderGuard() {
      G.S.army.mode = 'guard';
      G.S.army.rally = null;
      for (const u of G.S.units) if (u.soldier && u.team === 0 && u.squad === 'B') { u.target = 0; u.path = null; }
      G.UI.toast('Đội viễn chinh rút về phòng thủ lâu đài.', 'info');
    },

    // ---------------- Huấn luyện ----------------
    canTrain(b, type) {
      const def = G.UNITS[type];
      const lock = G.Modes.unitLocked(def);
      if (lock) return lock;
      if (type === 'monk' && G.S.mode === 'campaign' && !G.S.flags.breadGiven) return 'Cần giúp Tử Nguyệt Tự (nhiệm vụ)';
      if ((b.queue || []).length >= 5) return 'Hàng chờ đã đầy';
      if (!G.Build.canAfford(def.cost)) return 'Không đủ tài nguyên';
      return '';
    },
    train(b, type) {
      const err = this.canTrain(b, type);
      if (err) { G.UI.toast(err, 'bad'); return; }
      G.Build.pay(G.UNITS[type].cost);
      b.queue.push({ type, t: 0 });
      G.Audio.play('click');
    },
    updateTraining(dt) {
      for (const b of G.S.buildings) {
        if (!b.queue || !b.queue.length || !b.built || b.team !== 0) continue;
        const q = b.queue[0];
        q.t += dt;
        if (q.t >= G.UNITS[q.type].train) {
          b.queue.shift();
          const u = G.Units.spawnSoldier(q.type, b.x + G.rnd(-20, 20), b.y + 24, { squad: G.S.army.defaultSquad || 'A' });
          G.UI.log(`${G.UNITS[q.type].name} mới đã sẵn sàng.`, 'good');
          G.Audio.play('ready');
          G.S.stats.trained = (G.S.stats.trained || 0) + 1;
          void u;
        }
      }
    },

    hireMercs() {
      const S = G.S;
      const cost = S.flags.blackAlly ? 100 : 180;
      if (S.gold < cost) { G.UI.toast('Không đủ vàng', 'bad'); return; }
      if ((S.rep.black || 0) < -10) { G.UI.toast('Hắc Thạch không muốn làm ăn với ngài', 'bad'); return; }
      G.Economy.spendGold(cost);
      const p = G.World.PLACES.black;
      for (let i = 0; i < 3; i++) {
        G.Units.spawnSoldier('merc', (p.tx + i - 1) * T, (p.ty + 4) * T, { merc: true, color: 'black', squad: 'A', expireDay: S.day + 3 });
      }
      G.UI.toast(`Đã thuê 3 lính Hắc Thạch trong 3 ngày (-${cost} vàng)`, 'good');
    },

    allyArrives() {
      const S = G.S;
      const c = this.castleFront();
      if (S.flags.blackAlly) {
        for (let i = 0; i < 4; i++) G.Units.spawnSoldier('blacklancer', c.x + i * 30, c.y + 40, { merc: true, color: 'black', squad: 'B' });
        for (let i = 0; i < 2; i++) G.Units.spawnSoldier('merc', c.x - 40 - i * 30, c.y + 40, { merc: true, color: 'black', squad: 'B' });
        G.UI.dialog([['chief', 'Hắc Thạch giữ lời. Sáu dũng sĩ của ta theo cờ ngươi tới tận thành Xích Hoả!']]);
      }
      if ((S.rep.purple || 0) >= 30) {
        for (let i = 0; i < 2; i++) G.Units.spawnSoldier('monk', c.x + 60 + i * 30, c.y + 60, { merc: true, color: 'purple', squad: 'B' });
        G.UI.log('Tử Nguyệt Tự cử 2 tu sĩ tới giúp sức.', 'good');
      }
    },

    // ---------------- Quân Huyết Nha ----------------
    enemyAI(u, dt) {
      if (u.act) { u.actT += dt; if (u.actT >= u.actDur) u.act = null; }
      u.moving = false;
      this.resolvePending(u, dt);
      if (u.slowT > 0) u.slowT -= dt;
      const def = G.UNITS[u.type];
      if (u.boss) this.bossTick(u, dt);
      if (u.thief) return this.thiefAI(u, dt);
      if (def.healer) return this.healerAI(u, dt, { x: u.homeX || u.x, y: u.homeY || u.y, leash: 8 * T }, 0);

      u.rethink -= dt;
      let t = u.target ? G.byId(u.target) : null;
      if (t && !this.isEnemy(u, t) && !(t.building && t.team === 0 && !t.removed)) t = null;
      const home = u.camp && !u.raid ? { x: u.homeX, y: u.homeY } : null;
      if (home && t && G.dist(t.x, t.y, home.x, home.y) > 13 * T) t = null;
      if (!t || u.rethink <= 0) {
        u.rethink = 0.5 + Math.random() * 0.4;
        const aggro = home ? 7 * T : 6 * T;
        const nt = this.findTarget(u, aggro, { buildings: !home && !(def.kind === 'archer' && Math.random() < 0.3) });
        if (nt && (!home || G.dist(nt.x, nt.y, home.x, home.y) < 12 * T)) t = nt;
        else if (!home) t = null;
        else t = t && G.dist(t.x, t.y, home.x, home.y) < 12 * T ? t : null;
        if (def.arson && !t) {
          const b = this.nearestPlayerBuilding(u, 9 * T);
          if (b) t = b;
        }
        u.target = t ? t.id : 0;
      }
      if (u.blockedBy) {
        const b = G.byId(u.blockedBy);
        if (b && !b.removed) t = b; else u.blockedBy = 0;
      }
      if (t) {
        if (this.tryAttack(u, t, dt)) { u.path = null; return; }
        this.chase(u, t, dt);
        return;
      }
      if (home) return this.enemyIdle(u, dt);
      // quân cướp: tiến về lâu đài
      const c = G.byId(G.S.castleId);
      if (!c) return;
      if (u.retreat) {
        if (!u.path) G.Units.moveTo(u, u.homeX, u.homeY);
        if (G.Units.followPath(u, dt) || G.dist(u.x, u.y, u.homeX, u.homeY) < 2 * T) G.Units.remove(u);
        return;
      }
      u.repath = (u.repath || 0) - dt;
      if (!u.path || u.repath <= 0) {
        G.Units.moveToRect(u, c);
        u.repath = 4;
      }
      G.Units.followPath(u, dt);
    },

    nearestPlayerBuilding(u, r) {
      let best = null, bd = r;
      for (const b of G.S.buildings) {
        if (b.team !== 0 || !b.built || G.BUILDINGS[b.type].ground || G.BUILDINGS[b.type].wall) continue;
        const d = this.distToTarget(u, b);
        if (d < bd) { bd = d; best = b; }
      }
      return best;
    },

    enemyIdle(u, dt) {
      const d = G.dist(u.x, u.y, u.homeX, u.homeY);
      if (d > 3 * T) {
        if (!u.path) G.Units.moveTo(u, u.homeX, u.homeY);
        G.Units.followPath(u, dt);
        if (u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + dt * 4);
      } else {
        u.path = null;
        if (u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + dt * 2);
        u.timer -= dt;
        if (u.timer <= 0) { u.timer = 3 + Math.random() * 5; u.wx = u.homeX + G.rnd(-60, 60); u.wy = u.homeY + G.rnd(-40, 40); }
        if (u.wx != null && G.dist(u.x, u.y, u.wx, u.wy) > 6) G.Units.stepToward(u, u.wx, u.wy, dt * 0.5);
      }
    },

    bossTick(u, dt) {
      u.slamT = (u.slamT || 7) - dt;
      if (u.slamT <= 0 && G.Units.near(u.x, u.y, 130, (e) => e.team === 0).length) {
        u.slamT = 7;
        u.slamAt = 0.35;
        G.Units.act(u, 'attack2', 0.6);
      }
      if (u.slamAt > 0) {
        u.slamAt -= dt;
        if (u.slamAt <= 0) {
          G.FX.sprite('fx.explosion', u.x, u.y, 1.2);
          G.Audio.play('boom');
          G.Render.shake(10);
          for (const e of G.Units.near(u.x, u.y, 140, (x) => x.team === 0 && !x.hidden)) this.damageUnit(e, 38, u);
        }
      }
      const ratio = u.hp / u.maxHp;
      if (ratio < 0.6 && !u.summon1) { u.summon1 = true; this.bossSummon(u); }
      if (ratio < 0.3 && !u.summon2) { u.summon2 = true; this.bossSummon(u); }
    },
    bossSummon(u) {
      G.UI.toast('Xích Hoả gầm lên gọi viện binh!', 'bad');
      for (let i = 0; i < 4; i++) {
        const e = G.Units.create(i % 2 ? 'redwarrior' : 'raider', u.x + G.rnd(-80, 80), u.y + G.rnd(-60, 60), 1, { raid: true, homeX: u.x, homeY: u.y });
        this.applyEnemyScaling(e);
      }
    },
    bossDied(u) {
      G.S.flags.bossDead = true;
      G.Render.shake(16);
      G.UI.toast('BẠO CHÚA XÍCH HOẢ ĐÃ BỊ TIÊU DIỆT!', 'good');
      for (const e of G.S.units.slice()) if (e.team === 1 && !e.raid) { e.raid = true; e.retreat = true; }
    },

    checkCamp(c) {
      const camp = G.S.camps[c];
      if (!camp || camp.dead) return;
      const left = G.S.buildings.filter((b) => b.camp === c && b.team === 1).length;
      if (left > 0) return;
      camp.dead = true;
      G.S.stats.camps = (G.S.stats.camps || 0) + 1;
      G.Village.addMorale(10, `Phá huỷ ${camp.name}`);
      G.UI.toast(`Đã phá huỷ ${camp.name}!`, 'good');
      G.Audio.play('victory');
      for (const id of camp.garrison) { const u = G.byId(id); if (u) { u.camp = null; u.raid = true; } }
      if (camp.hostage) {
        const h = G.byId(camp.hostage);
        if (h) { h.role = 'freed'; h.homeX = G.World.PLACES.black.tx * T; h.homeY = (G.World.PLACES.black.ty + 4) * T; G.FX.text(h.x, h.y - 60, 'Được tự do!', '#ffd166', 15); }
      }
      // giải phóng vùng đất: rải thêm tài nguyên
      const p = G.World.PLACES[c];
      for (let k = 0; k < 6; k++) {
        const s = G.World.findFreeTile(p.tx, p.ty, 2, 6);
        if (s) G.Nodes.create(Math.random() < 0.5 ? 'gold' : 'rock', s.x, s.y);
      }
    },

    respawnCamps() {
      for (const c in G.S.camps) {
        const camp = G.S.camps[c];
        if (camp.dead) continue;
        camp.garrison = camp.garrison.filter((id) => { const u = G.byId(id); return u && !u.dead && u.camp === c; });
        const def = G.campDef(c);
        const full = Object.values(def.garrison).reduce((a, b) => a + b, 0);
        for (let i = 0; i < def.respawn && camp.garrison.length < full; i++) {
          const types = Object.keys(def.garrison);
          G.Units.spawnGarrison(c, G.pick(types));
        }
      }
    },

    // ---------------- Trận cướp đêm ----------------
    planRaid() {
      const S = G.S;
      if (S.raid && S.raid.active) return;
      const pol = G.Modes.raidPolicy();
      if (!pol) return;
      if (G.Modes.mode() !== 'campaign') S.flags.firstRaidSent = true;
      const blood = S.day % pol.blood === 0;
      let force = false, budget = 0;
      if (S.flags.firstRaid && !S.flags.firstRaidSent) { force = true; budget = 3; S.flags.firstRaidSent = true; }
      else if (S.flags.firstRaidSent && S.day >= pol.from) {
        const chance = blood || pol.every ? 1 : Math.min(0.85, 0.3 + S.day * 0.035);
        if (S.raidSkip === S.day && !blood) return;
        if (Math.random() > chance) return;
        const deadCamps = ['A', 'B', 'C'].filter((k) => G.campDead(k)).length;
        budget = (3 + S.day * 1.25) * G.DIFFICULTY[S.difficulty].raid * (blood ? 2 : 1) * (S.raidBoost || 1) * (1 - deadCamps * 0.15);
        if (G.campDead('F')) budget *= 0.8;
        // giặc lớn dần theo sự phát triển của vương quốc
        budget *= pol.mult * (G.Modes.mode() === 'campaign' ? 1 : G.Modes.levelMult());
        const cap = (G.Modes.eraMode() ? [6, 9, 13, 18, 26, 34, 44][S.era] : [0, 5, 12, 24, 999][S.tier]) * G.DIFFICULTY[S.difficulty].raid * (blood ? 1.6 : 1) * pol.mult;
        budget = Math.min(budget, cap);
        force = true;
      }
      S.raidBoost = 1;
      if (!force) return;
      const origins = Object.keys(S.camps).filter((k) => !S.camps[k].dead);
      const home = G.World.PLACES.castle;
      const from = G.Modes.mode() === 'skirmish' && S.camps.F && !S.camps.F.dead ? 'F' : origins.length ? origins.sort((a, b) => G.dist(G.World.PLACES[a].tx, G.World.PLACES[a].ty, home.tx, home.ty) - G.dist(G.World.PLACES[b].tx, G.World.PLACES[b].ty, home.tx, home.ty))[Math.min(origins.length - 1, Math.floor(Math.random() * 2))] : null;
      const types = [];
      const avail = ['raider'];
      if (S.day >= 3) avail.push('redwarrior');
      if (S.day >= 4) avail.push('torch');
      if (S.day >= 5) avail.push('redarcher');
      if (S.day >= 10) avail.push('redlancer');
      if (S.day >= 13) avail.push('redmonk');
      let b = budget;
      if (S.day <= 2) { types.push('raider', 'raider', 'raider'); b = 0; }
      while (b > 0.9) {
        const tp = G.pick(avail);
        types.push(tp);
        b -= G.RAID_COST[tp];
      }
      // xe tăng/pháo của giặc chỉ xuất hiện từ ngày 7 để người chơi kịp dựng phòng thủ
      const mapType = (t) => { const e = G.Eras.enemyType(t); return G.UNITS[e].vehicle && S.day < 7 ? G.Eras.enemyType('raider') : e; };
      S.raid = { pending: true, active: false, blood, from, types: types.map(mapType), ids: [] };
      const dir = from ? this.dirName(G.World.PLACES[from]) : 'biển phía đông';
      G.UI.toast(blood ? `TRĂNG MÁU! Đêm nay ${types.length} quân Huyết Nha sẽ kéo tới từ ${dir}!` : `Thám báo: đêm nay ${types.length} quân Huyết Nha sẽ tới từ ${dir}.`, 'bad', 6);
      G.UI.log(`Cảnh báo: ${types.length} quân giặc, hướng ${dir}.`, 'bad');
      if (S.buildings.some((b) => b.team === 0 && b.built && G.BUILDINGS[b.type].radar)) {
        const cnt = {};
        for (const t of S.raid.types) cnt[t] = (cnt[t] || 0) + 1;
        G.UI.log('Radar: ' + Object.keys(cnt).map((k) => `${cnt[k]} ${G.UNITS[k].name}`).join(', '), 'info');
      }
      G.Audio.play('horn');
    },

    dirName(p) {
      const c = G.World.PLACES.castle;
      const a = Math.atan2(p.ty - c.ty, p.tx - c.tx) * 180 / Math.PI;
      if (a > -30 && a < 30) return 'phía đông';
      if (a >= 30 && a < 70) return 'phía đông nam';
      if (a <= -30 && a > -70) return 'phía đông bắc';
      if (a >= 70 && a < 110) return 'phía nam';
      if (a <= -70 && a > -110) return 'phía bắc';
      return 'phía tây';
    },

    spawnRaid() {
      const S = G.S;
      const R = S.raid;
      if (!R || !R.pending) return;
      R.pending = false; R.active = true;
      let sx, sy;
      if (R.from) {
        const p = G.World.PLACES[R.from];
        const c = G.World.PLACES.castle;
        const ang = Math.atan2(c.ty - p.ty, c.tx - p.tx);
        sx = p.tx + Math.cos(ang) * 6; sy = p.ty + Math.sin(ang) * 6;
      } else { sx = G.World.W - 8; sy = 36; }
      for (const tp of R.types) {
        const spot = G.World.findFreeTile(Math.round(sx), Math.round(sy), 0, 3) || { x: Math.round(sx), y: Math.round(sy) };
        const u = G.Units.create(tp, (spot.x + 0.5) * T, (spot.y + 0.5) * T, 1, { raid: true, homeX: (spot.x + 0.5) * T, homeY: (spot.y + 0.5) * T });
        this.applyEnemyScaling(u);
        R.ids.push(u.id);
      }
      G.Audio.play('drums');
    },

    /** Đối thủ máy tung một đợt quân ngay (ban ngày hoặc ban đêm). */
    sendAiWave(mult) {
      const S = G.S;
      if (G.campDead('F') || (S.raid && S.raid.active)) return;
      const n = Math.round((3 + S.day * 0.9) * mult * G.Modes.levelMult());
      const roles = ['raider', 'redwarrior', 'redarcher', 'redwarrior', 'redlancer', 'redmonk'];
      const types = [];
      for (let i = 0; i < n; i++) types.push(G.Eras.enemyType(G.pick(roles)));
      S.raid = { pending: true, active: false, blood: false, from: 'F', types, ids: [] };
      G.UI.toast(`Vương quốc máy xuất ${n} quân đánh bạn!`, 'bad', 5);
      G.Audio.play('horn');
      this.spawnRaid();
    },

    /** Quân đối thủ (online) gửi tới: xuất hiện ở phía đông bản đồ. */
    spawnIncoming(units, from) {
      const S = G.S;
      const P = G.World.PLACES.F;
      const R = S.raid && S.raid.active ? S.raid : (S.raid = { pending: false, active: true, blood: false, from: null, types: [], ids: [] });
      let n = 0;
      for (const k in units) {
        const type = G.UNITS['red_' + k] ? 'red_' + k : ({ warrior: 'redwarrior', archer: 'redarcher', lancer: 'redlancer', monk: 'redmonk', merc: 'redwarrior', blacklancer: 'redlancer' }[k] || 'raider');
        for (let i = 0; i < Math.min(40, units[k]); i++) {
          const spot = G.World.findFreeTile(P.tx, P.ty, 0, 5) || { x: P.tx, y: P.ty };
          const u = G.Units.create(type, (spot.x + 0.5) * T, (spot.y + 0.5) * T, 1, { raid: true, homeX: (spot.x + 0.5) * T, homeY: (spot.y + 0.5) * T });
          R.ids.push(u.id);
          n++;
        }
      }
      G.UI.toast(`${from} gửi ${n} quân tấn công bạn!`, 'bad', 5);
      G.Audio.play('drums');
    },

    updateRaid() {
      const R = G.S.raid;
      if (!R || !R.active) return;
      const alive = R.ids.filter((id) => { const u = G.byId(id); return u && !u.dead; });
      if (!alive.length) {
        R.active = false;
        G.S.stats.raidsBeaten = (G.S.stats.raidsBeaten || 0) + 1;
        G.Village.addMorale(R.blood ? 8 : 3, R.blood ? 'Đẩy lùi Trăng Máu' : 'Đẩy lùi giặc');
        G.UI.toast(R.blood ? 'Đã đẩy lùi đêm Trăng Máu!' : 'Đã đánh lui quân cướp!', 'good');
        if (G.S.flags.firstRaidSent && !G.S.flags.firstRaidBeaten) G.S.flags.firstRaidBeaten = true;
        G.S.raid = null;
      }
    },

    /** Trời sáng: giặc còn sót rút lui. */
    morningRetreat() {
      const R = G.S.raid;
      if (!R || !R.active) return;
      for (const id of R.ids) { const u = G.byId(id); if (u) u.retreat = true; }
      if (!G.S.flags.firstRaidBeaten && G.S.flags.firstRaidSent) G.S.flags.firstRaidBeaten = true;
      R.active = false;
      G.S.raid = null;
    },

    spawnThief() {
      const S = G.S;
      const stolen = Math.min(250, Math.floor(S.gold * 0.3));
      S.gold -= stolen;
      const c = this.castleFront();
      const u = G.Units.create('raider', c.x, c.y, 1, { thief: true, stolen, name: 'Kẻ trộm', speed: 120, escapeT: 70 });
      u.hp = u.maxHp = 60;
      const away = G.World.findFreeTile(G.toTile(c.x), G.toTile(c.y), 22, 30);
      u.fleeTo = away ? { x: (away.x + 0.5) * T, y: (away.y + 0.5) * T } : { x: c.x - 20 * T, y: c.y };
      G.UI.toast(`Kẻ trộm cuỗm ${stolen} vàng! Đuổi theo hắn!`, 'bad');
      G.UI.ping(c.x, c.y, 'Kẻ trộm');
    },
    thiefAI(u, dt) {
      u.escapeT -= dt;
      if (u.escapeT <= 0) { G.UI.toast('Kẻ trộm đã trốn thoát...', 'bad'); G.Units.remove(u); return; }
      if (!u.path) G.Units.moveTo(u, u.fleeTo.x, u.fleeTo.y);
      if (G.Units.followPath(u, dt)) { G.UI.toast('Kẻ trộm đã trốn thoát...', 'bad'); G.Units.remove(u); }
    },

    updateEnemies(dt) {
      // trại không có quân ta ở gần thì "ngủ" để đỡ tốn tính toán
      this.wakeT = (this.wakeT || 0) - dt;
      if (this.wakeT <= 0) {
        this.wakeT = 0.5;
        for (const k in G.S.camps) {
          const p = G.World.PLACES[k];
          G.S.camps[k].awake = !!G.Units.nearest((p.tx + 0.5) * T, (p.ty + 0.5) * T, 17 * T, (e) => e.team === 0 && !e.hidden);
        }
      }
      for (const u of G.S.units) {
        if (u.team !== 1 || u.dead) continue;
        if (u.camp && !u.raid && !u.target && !u.pending && G.S.camps[u.camp] && !G.S.camps[u.camp].awake) {
          if (u.act) { u.actT += dt; if (u.actT >= u.actDur) u.act = null; }
          u.moving = false;
          this.enemyIdle(u, dt);
          continue;
        }
        this.enemyAI(u, dt);
      }
    },
  };
  G.Military = Military;
})(typeof window !== 'undefined' ? window : globalThis);
