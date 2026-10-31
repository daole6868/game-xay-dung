/* Hiệp sĩ (nhân vật người chơi điều khiển): di chuyển, chiến đấu, kỹ năng, tương tác, đói, cấp độ. */
(function (root) {
  'use strict';
  const G = root.G;
  const T = G.TILE;

  const SKILLS = [
    { id: 'spin', name: 'Chém xoáy', key: '1', lvl: 2, cd: 8, icon: 'i.sword', desc: 'Chém mọi kẻ địch quanh mình (x1.6 sát thương).' },
    { id: 'rally', name: 'Hiệu triệu', key: '2', lvl: 4, cd: 30, icon: 'i.flag', desc: 'Quân ta gần đó +30% sát thương, +15% tốc độ trong 10 giây và hồi 20% máu.' },
    { id: 'guard', name: 'Khiên thép', key: '3', lvl: 6, cd: 14, icon: 'i.shield', desc: 'Giảm 70% sát thương nhận vào trong 4 giây.' },
  ];

  const ADVICE = [
    'Mùa đông ruộng không lớn. Hãy tích trữ lương thực từ mùa thu, và để dành gỗ sưởi ấm.',
    'Dân ăn càng nhiều món khác nhau, lòng dân càng cao. Lòng dân cao thì làm việc nhanh và người mới kéo đến.',
    'Bán dồn một món ở chợ thì giá tụt dần. Chia nhỏ ra bán ở nhiều nơi sẽ lời hơn.',
    'Tử Nguyệt Tự trả giá cao cho bánh mì, len và bí ngô. Hắc Thạch thì thèm thịt và món hầm.',
    'Mỗi trại Huyết Nha bị phá, giặc kéo tới ban đêm ít đi hẳn.',
    'Tháp canh tự bắn tên. Hàng rào và tường làm giặc phải dừng lại đập phá — lúc đó tháp sẽ bắn chúng.',
    'Thợ xây cũng dập lửa và sửa nhà. Giếng nước gần nhà giúp lửa tắt nhanh hơn.',
    'Kiếm sĩ khắc Kỵ thương, Kỵ thương khắc Cung thủ, Cung thủ khắc Kiếm sĩ.',
    'Đội cận vệ đi theo ngài. Đội viễn chinh giữ lâu đài, hoặc có thể ra lệnh tấn công một vị trí trên bản đồ.',
  ];

  const Hero = {
    SKILLS,
    unit() { return G.byId(G.S.heroId); },

    applyStats(u) {
      if (!u) return;
      const S = G.S, h = S.hero, def = G.UNITS.hero;
      const ratio = u.maxHp ? u.hp / u.maxHp : 1;
      u.maxHp = Math.round(def.hp + (h.lvl - 1) * 25 + (h.gear.armor ? 60 : 0));
      u.dmg = def.dmg + (h.lvl - 1) * 2.5 + (h.gear.sword ? 8 : 0);
      u.armor = def.armor + (h.gear.armor ? 3 : 0) + (S.techs.mail ? 2 : 0);
      u.hp = Math.max(1, Math.round(u.maxHp * ratio));
    },

    gainXp(n) {
      const h = G.S.hero;
      h.xp += n;
      let up = false;
      while (h.xp >= this.xpNext()) {
        h.xp -= this.xpNext();
        h.lvl++;
        up = true;
      }
      if (up) {
        const u = this.unit();
        this.applyStats(u);
        if (u) { u.hp = u.maxHp; G.FX.text(u.x, u.y - 80, `Cấp ${h.lvl}!`, '#ffd166', 18); }
        G.Audio.play('levelup');
        const sk = SKILLS.find((s) => s.lvl === h.lvl);
        G.UI.toast(sk ? `Hiệp sĩ lên cấp ${h.lvl}! Mở kỹ năng: ${sk.name} (phím ${sk.key})` : `Hiệp sĩ lên cấp ${h.lvl}!`, 'good', 4);
      }
    },
    xpNext() { return 60 + G.S.hero.lvl * 45; },

    // ---------------- Cập nhật ----------------
    update(dt) {
      const S = G.S, h = S.hero;
      const u = this.unit();
      if (!u) return;
      if (u.act) { u.actT += dt; if (u.actT >= u.actDur) u.act = null; }
      u.moving = false;
      for (const s of SKILLS) if (h.cds[s.id] > 0) h.cds[s.id] -= dt;
      if (h.potionCd > 0) h.potionCd -= dt;
      if (u.buffT > 0) u.buffT -= dt;
      if (u.guardT > 0) u.guardT -= dt;

      if (u.downed) {
        h.respawnT -= dt;
        if (h.respawnT <= 0) this.respawn(u);
        return;
      }
      // đói
      h.hunger = Math.max(0, h.hunger - dt * 100 / (1.6 * G.DAY_LEN));
      if (h.hunger < 30 && S.settings.autoEat) this.eat(true);
      if (h.hunger <= 0) { u.hp -= dt * 1.5; if (u.hp <= 0) { this.die(); return; } }
      // hồi máu
      h.combatT = Math.max(0, (h.combatT || 0) - dt);
      if (u.hitT > 0) h.combatT = 5;
      if (h.combatT <= 0 && h.hunger > 15 && u.hp < u.maxHp) {
        const c = G.byId(S.castleId);
        const nearHome = c && G.dist(u.x, u.y, c.x, c.y) < 6 * T;
        u.hp = Math.min(u.maxHp, u.hp + dt * (nearHome ? 8 : 2.5));
      }

      G.Military.resolvePending(u, dt);
      const inp = G.Input;
      let mx = 0, my = 0;
      if (inp.down('KeyW') || inp.down('ArrowUp')) my -= 1;
      if (inp.down('KeyS') || inp.down('ArrowDown')) my += 1;
      if (inp.down('KeyA') || inp.down('ArrowLeft')) mx -= 1;
      if (inp.down('KeyD') || inp.down('ArrowRight')) mx += 1;
      if (inp.joy && (Math.abs(inp.joy.x) > 0.15 || Math.abs(inp.joy.y) > 0.15)) { mx = inp.joy.x; my = inp.joy.y; }

      if (mx || my) {
        // điều khiển bằng phím: huỷ lệnh chuột & việc đang làm
        h.order = null; h.work = null; u.path = null;
        const l = Math.hypot(mx, my) || 1;
        const sp = G.Units.speedOf(u) * (h.hunger < 20 ? 0.85 : 1) * dt;
        G.Units.tryMove(u, (mx / l) * sp, (my / l) * sp);
        if (mx) u.facing = mx > 0 ? 1 : -1;
        u.moving = true;
        this.updateLed(u);
        return;
      }

      // lệnh bằng chuột
      const o = h.order;
      if (o) {
        if (o.type === 'move') {
          if (G.Units.followPath(u, dt)) h.order = null;
          u.moving = !!u.path;
          this.updateLed(u);
          return;
        }
        const t = G.byId(o.id);
        if (!t || t.dead || t.removed) { h.order = null; }
        else if (o.type === 'attack') {
          if (G.Military.tryAttack(u, t, dt)) { u.path = null; }
          else { G.Military.chase(u, t, dt); u.moving = true; }
          this.updateLed(u);
          return;
        } else if (o.type === 'interact') {
          const d = t.building ? G.Military.distToTarget(u, t) : G.dist(u.x, u.y, t.x, t.y);
          if (d < (t.building ? 40 : t.node ? 80 : 70)) { h.order = null; u.path = null; this.interactWith(t); }
          else {
            if (!u.path) { if (t.building) G.Units.moveToRect(u, t); else G.Units.moveTo(u, t.x, t.y, { near: !!t.node }); }
            if (G.Units.followPath(u, dt) && !u.path) {
              const d2 = t.building ? G.Military.distToTarget(u, t) : G.dist(u.x, u.y, t.x, t.y);
              if (d2 < (t.building ? 70 : 110)) this.interactWith(t);
              h.order = null;
            }
            u.moving = true;
          }
          this.updateLed(u);
          return;
        }
      }

      // việc tay chân
      if (h.work) { this.doWork(u, dt); this.updateLed(u); return; }

      // tự động đánh kẻ địch trong tầm
      const t = G.Military.findTarget(u, u.range + 24);
      if (t) G.Military.tryAttack(u, t, dt);
      this.updateLed(u);
    },

    updateLed(u) {
      // cừu đang được dắt
      void u;
    },

    // ---------------- Hành động ----------------
    attack() {
      const u = this.unit();
      if (!u || u.downed) return;
      const t = G.Military.findTarget(u, u.range + 50, { buildings: true, onlyBuilt: true });
      if (t) { G.Military.tryAttack(u, t, 0); return; }
      if (!u.act && u.atkT <= 0) { G.Units.act(u, Math.random() < 0.5 ? 'attack1' : 'attack2', 0.4); u.atkT = u.cd; G.Audio.play('swing'); }
    },

    skill(i) {
      const s = SKILLS[i];
      const S = G.S, h = S.hero, u = this.unit();
      if (!u || u.downed) return;
      if (h.lvl < s.lvl) { G.UI.toast(`Mở khoá ở cấp ${s.lvl}`, 'bad'); return; }
      if (h.cds[s.id] > 0) return;
      h.cds[s.id] = s.id === 'rally' && S.flags.horn ? s.cd / 2 : s.cd;
      if (s.id === 'spin') {
        G.Units.act(u, 'attack1', 0.45);
        G.FX.sprite('fx.dust', u.x, u.y, 1.6);
        G.Audio.play('spin');
        for (const e of G.Units.near(u.x, u.y, 130, (x) => x.team === 1)) G.Military.damageUnit(e, u.dmg * 1.6, u);
        for (const b of G.S.buildings) if (b.team === 1 && G.Military.distToTarget(u, b) < 100) G.Build.damage(b, u.dmg * 1.6, u);
      } else if (s.id === 'rally') {
        G.Audio.play('horn');
        G.FX.text(u.x, u.y - 90, 'VÌ LAM QUỐC!', '#9fd3ff', 18);
        for (const a of G.Units.near(u.x, u.y, 320, (x) => x.team === 0 && !x.sheep && !x.npc)) {
          a.buffT = 10;
          G.Military.heal(a, a.maxHp * 0.2);
        }
      } else if (s.id === 'guard') {
        u.guardT = 4;
        G.Units.act(u, 'guard', 1.2);
        G.Audio.play('shield');
      }
    },

    eat(auto) {
      const S = G.S, h = S.hero;
      if (h.hunger > 90) { if (!auto) G.UI.toast('Hiệp sĩ chưa đói', 'info'); return; }
      const order = ['stew', 'bread', 'meat', 'pumpkin', 'fish', 'carrot', 'berry', 'wheat'];
      for (const k of order) {
        if ((S.stock[k] || 0) > 0) {
          S.stock[k]--;
          h.hunger = Math.min(100, h.hunger + G.ITEMS[k].food * 12);
          if (!auto) G.UI.toast(`Hiệp sĩ ăn ${G.ITEMS[k].name}`, 'info');
          G.Audio.play('eat');
          return;
        }
      }
      if (!auto) G.UI.toast('Kho hết đồ ăn!', 'bad');
    },

    potion() {
      const S = G.S, h = S.hero, u = this.unit();
      if (!u || u.downed || h.potionCd > 0) return;
      if ((S.stock.potion || 0) <= 0) { G.UI.toast('Không còn thuốc hồi phục', 'bad'); return; }
      S.stock.potion--;
      h.potionCd = 3;
      G.Military.heal(u, u.maxHp * 0.45 * (S.techs.medicine ? 1.5 : 1));
      G.Audio.play('heal');
    },

    die() {
      const S = G.S, u = this.unit();
      if (!u || u.downed) return;
      u.downed = true; u.hidden = true; u.hp = 0;
      S.hero.respawnT = 10;
      const lost = Math.floor(S.gold * 0.1);
      S.gold -= lost;
      S.hero.order = null; S.hero.work = null;
      S.stats.heroDeaths = (S.stats.heroDeaths || 0) + 1;
      G.FX.sprite('fx.dust', u.x, u.y, 1.2);
      G.UI.toast(`Hiệp sĩ trọng thương! Hồi sinh ở lâu đài sau 10 giây (mất ${lost} vàng).`, 'bad', 5);
      G.Audio.play('death');
      for (const s of S.units) if (s.sheep && s.follow === u.id) s.follow = 0;
    },
    respawn(u) {
      const f = G.Military.castleFront();
      u.x = f.x; u.y = f.y; u.downed = false; u.hidden = false;
      u.hp = u.maxHp * 0.6;
      G.S.hero.hunger = Math.max(G.S.hero.hunger, 40);
      G.Render.snapCamera();
    },

    /** Bấm E: tìm thứ gần nhất để tương tác. */
    interactNearest() {
      const u = this.unit();
      if (!u || u.downed) return;
      const t = this.findInteractable(u.x, u.y, 95);
      if (t) this.interactWith(t);
      else G.UI.toast('Không có gì ở gần để tương tác', 'info', 1.5);
    },

    findInteractable(x, y, r) {
      let best = null, bd = r * r;
      const consider = (o, px, py, bias = 1) => {
        const d = G.dist2(x, y, px, py) * bias;
        if (d < bd) { bd = d; best = o; }
      };
      for (const v of G.S.units) {
        if (v.npc && !v.hidden) consider(v, v.x, v.y, 0.6);
        else if (v.sheep && v.team === 3 && !v.follow) consider(v, v.x, v.y, 0.8);
      }
      for (const d of G.S.drops) consider(d, d.x, d.y, 0.5);
      for (const n of G.S.nodes) if (n.amount > 0) consider(n, n.x, n.y);
      for (const b of G.S.buildings) {
        if (b.team !== 0) continue;
        const cx = G.clamp(x, b.tx * T, (b.tx + b.w) * T), cy = G.clamp(y, b.ty * T, (b.ty + b.h) * T);
        const d = G.dist2(x, y, cx, cy);
        const need = !b.built || b.fire > 0 || (b.type === 'plot' && G.Village.plotNeed({ ...b, claimBy: 0 }));
        if (need && d * 0.7 < bd) { bd = d * 0.7; best = b; }
      }
      return best;
    },

    interactWith(t) {
      const S = G.S, u = this.unit();
      if (t.npc) return this.talk(t);
      if (t.gold !== undefined && !t.building && !t.node && !t.type) return this.pickDrop(t);
      if (t.sheep) {
        if (t.team !== 3) return;
        if ((S.stock.carrot || 0) < 1) { G.UI.toast('Cần 1 cà rốt để dụ cừu', 'bad'); return; }
        if (!G.Village.penWithRoom()) { G.UI.toast('Cần một Chuồng cừu còn chỗ', 'bad'); return; }
        S.stock.carrot--;
        t.follow = u.id;
        G.UI.toast('Cừu đi theo ngài. Dắt nó về chuồng!', 'info');
        G.Audio.play('sheep');
        return;
      }
      if (t.node) { S.hero.work = { type: 'gather', id: t.id, t: 0 }; return; }
      if (t.building) {
        if (t.fire > 0) { t.fire = 0; G.UI.toast('Đã dập lửa!', 'good'); G.Audio.play('splash'); return; }
        if (!t.built) { S.hero.work = { type: 'build', id: t.id }; return; }
        if (t.type === 'plot') {
          const need = G.Village.plotNeed({ ...t, claimBy: 0 });
          if (need) { S.hero.work = { type: 'plot', id: t.id, need, t: 0 }; return; }
        }
        G.UI.selectBuilding(t);
      }
    },

    doWork(u, dt) {
      const S = G.S, w = S.hero.work;
      const t = G.byId(w.id);
      if (!t || t.removed) { S.hero.work = null; return; }
      u.facing = t.x >= u.x ? 1 : -1;
      if (w.type === 'gather') {
        if (t.amount <= 0) { S.hero.work = null; return; }
        if (G.dist(u.x, u.y, t.x, t.y) > 110) { S.hero.work = null; return; }
        const def = G.NODE_DEF[t.type];
        if (!u.act) G.Units.act(u, 'attack1', 0.45);
        w.t += dt;
        if (w.t >= def.work * 0.32) {
          w.t = 0;
          const got = G.Nodes.take(t, def.per);
          if (got) G.Economy.addItem(def.item, got, u);
          G.Audio.play(t.type === 'tree' ? 'chop' : t.type === 'bush' ? 'pick' : 'mine');
          if (t.amount <= 0) S.hero.work = null;
        }
      } else if (w.type === 'build') {
        if (t.built) { S.hero.work = null; return; }
        if (!u.act) G.Units.act(u, 'attack2', 0.5);
        G.Build.work(t, dt * 2.2);
        if (Math.random() < dt * 2) G.Audio.play('hammer');
      } else if (w.type === 'plot') {
        if (!u.act) G.Units.act(u, 'attack2', 0.5);
        w.t += dt;
        if (w.t > 0.9) {
          const res = G.Village.doPlot(t, w.need);
          if (res) G.Economy.addItem(res.item, res.n, u);
          S.hero.work = null;
        }
      }
    },

    pickDrop(d) {
      const S = G.S;
      if (d.gold) { G.Economy.addGold(d.gold); G.FX.text(d.x, d.y - 30, `+${d.gold} vàng`, '#ffd166', 15); }
      if (d.items) for (const k in d.items) G.Economy.addItem(k, d.items[k]);
      if (d.chest && d.items) G.UI.toast('Mở rương: ' + Object.keys(d.items).map((k) => `${d.items[k]} ${G.ITEMS[k].name}`).join(', '), 'good');
      S.drops = S.drops.filter((x) => x !== d);
      G.Audio.play('coin');
    },

    /** Tự nhặt vàng rơi khi đi ngang qua. */
    autoPickup() {
      const u = this.unit();
      if (!u || u.downed) return;
      for (const d of G.S.drops.slice()) {
        if (G.dist(u.x, u.y, d.x, d.y) < (d.chest ? 50 : 70)) this.pickDrop(d);
      }
    },

    talk(npc) {
      const S = G.S;
      const role = npc.role;
      if (role === 'advisor') {
        if (!S.flags.metAdvisor) { S.flags.metAdvisor = true; return; }
        const hints = [];
        const q = G.Quests.active()[0];
        if (q) hints.push(['advisor', `Việc trước mắt: ${q.name} — ${q.desc}`]);
        hints.push(['advisor', G.pick(ADVICE)]);
        G.UI.dialog(hints);
        return;
      }
      if (role === 'merchant') {
        if (!S.flags.met_yellow) {
          S.flags.met_yellow = true;
          G.Economy.newContracts();
          if (!G.Quests.isActive('q_port')) G.UI.dialog([['merchant', 'Khách lạ từ phía bắc à? Thương hội Kim Sa mua bán đủ thứ, cứ tự nhiên xem hàng!']], () => G.UI.openTrade('yellow'));
          return;
        }
        G.UI.openTrade('yellow');
        return;
      }
      if (role === 'abbess') {
        if (!S.flags.met_purple) {
          S.flags.met_purple = true;
          if (!G.Quests.isActive('q_monastery')) G.UI.dialog([['abbess', 'Tử Nguyệt Tự chào đón người hành hương. Chúng ta đổi thuốc lấy bánh, len và bí ngô.']], () => G.UI.openTrade('purple'));
          return;
        }
        if (G.Quests.isActive('q_bread') && !S.flags.breadGiven) {
          if ((S.stock.bread || 0) >= 15) { S.stock.bread -= 15; S.flags.breadGiven = true; return; }
          G.UI.dialog([['abbess', `Tự viện vẫn đang chờ 15 bánh mì của thí chủ (kho đang có ${S.stock.bread || 0}).`]], () => G.UI.openTrade('purple'));
          return;
        }
        G.UI.openTrade('purple');
        return;
      }
      if (role === 'chief') {
        if (!S.flags.met_black) {
          if (!G.Quests.isActive('q_chief')) {
            G.UI.dialog([['chief', 'Người Lam? Hừ. Muốn mua đá, quặng hay thuê quân thì trả bằng vàng. Còn chuyện khác... đợi ngươi đủ mạnh rồi hãy nói.']], () => G.UI.openTrade('black'));
            return;
          }
          S.flags.met_black = true; return;
        }
        G.UI.openTrade('black');
        return;
      }
      if (role === 'hostage') { G.UI.dialog([['chief', '(Hắc Lang, bị trói) Người Lam... cứu ta... Xích Hoả sẽ giết ta trước trận chiến...']]); return; }
      if (role === 'freed') { G.UI.dialog([['chief', '(Hắc Lang) Ơn này Hắc Thạch không quên.']]); return; }
      const lines = {
        townsfolk: ['Nghe nói Huyết Nha đang tụ quân ở phía đông.', 'Mùa đông năm nay chắc lạnh lắm.', 'Bánh mì ở chỗ ngài ngon lắm đấy!', 'Thương thuyền tới thì nhớ ghé xem, có đồ quý.'],
        guard: ['Đá Hắc Thạch cứng nhất đảo này.', 'Tộc trưởng không ưa người lạ.', 'Huyết Nha bắt cậu chủ Hắc Lang đi rồi...'],
      };
      const l = lines[role];
      if (l) G.UI.dialog([['villager', G.pick(l)]]);
    },

    /** Lệnh chuột: đi tới / đánh / tương tác. */
    command(wx, wy) {
      const S = G.S, u = this.unit();
      if (!u || u.downed) return;
      S.hero.work = null;
      // ưu tiên kẻ địch dưới con trỏ
      const enemy = G.Units.nearest(wx, wy - 20, 46, (e) => e.team === 1);
      if (enemy) { S.hero.order = { type: 'attack', id: enemy.id }; u.path = null; return; }
      const eb = G.S.buildings.find((b) => b.team === 1 && wx >= b.tx * T && wx < (b.tx + b.w) * T && wy >= (b.ty - b.h * 0.6) * T && wy < (b.ty + b.h) * T);
      if (eb) { S.hero.order = { type: 'attack', id: eb.id }; u.path = null; return; }
      const it = this.findInteractable(wx, wy, 48);
      if (it && G.byId(it.id)) { S.hero.order = { type: 'interact', id: it.id }; u.path = null; return; }
      S.hero.order = { type: 'move' };
      G.Units.moveTo(u, wx, wy);
      G.FX.sprite('p.selring', wx, wy, 0.6, { dur: 0.5 });
    },
  };
  G.Hero = Hero;
})(typeof window !== 'undefined' ? window : globalThis);
