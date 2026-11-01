/* Chế độ chơi: luật riêng, mục tiêu, tiến lên thời đại, đối thủ máy (AI). */
(function (root) {
  'use strict';
  const G = root.G;
  const T = G.TILE;

  G.MODES = {
    campaign: { name: 'Chiến dịch', icon: 'i.book', desc: 'Cốt truyện 5 chương trên Đảo Bình Minh: dựng lại Lam Quốc, kết đồng minh, đánh bại Bạo chúa Xích Hoả.', story: true, fixedMap: 'binhminh' },
    ages: { name: 'Thời đại', icon: 'i.era', desc: 'Khởi đầu thời Đồ đá với lều tranh và chuỳ đá, tiến lên Đồ đồng, Sắt, Trung cổ, Thuốc súng, Công nghiệp tới Hiện đại với xe tăng và tên lửa.', eras: true, startEra: 0 },
    survival: { name: 'Sinh tồn', icon: 'i.skull', desc: 'Đêm nào giặc cũng tới và mạnh dần, cứ 5 đêm một lần Trăng Máu. Trụ được bao nhiêu ngày?', eras: true, pickEra: true },
    sandbox: { name: 'Phát triển', icon: 'i.house', desc: 'Không có giặc. Tha hồ quy hoạch, buôn bán và đưa vương quốc lên thời hiện đại.', eras: true, pickEra: true, peaceful: true },
    skirmish: { name: 'Đấu với máy', icon: 'i.robot', desc: 'Một vương quốc máy ở phía đông cũng xây dựng, luyện quân và tấn công bạn. Phá lâu đài của nó để thắng.', eras: true, pickEra: true },
    pvp: { name: 'Đấu online', icon: 'i.pvp', desc: 'Hai đến bốn người cùng mở game, vào chung một phòng. Mỗi người xây vương quốc trên cùng bản đồ, gửi quân sang đánh nhau.', eras: true, pickEra: true, peaceful: true, online: true },
  };

  const Modes = {
    mode() { return (G.S && G.S.mode) || 'campaign'; },
    def() { return G.MODES[this.mode()]; },
    eraMode() { return !!this.def().eras; },
    level() { return G.World.map ? G.World.map.level : 2; },
    /** Hệ số sức mạnh giặc theo cấp bản đồ. */
    levelMult() { return 0.7 + this.level() * 0.1; },

    campList() {
      const m = this.mode();
      if (m === 'sandbox' || m === 'pvp') return [];
      const P = G.World.PLACES;
      const all = Object.keys(P).filter((k) => k.length === 1).sort();
      if (m === 'skirmish') return all.filter((k) => k === 'F' || k === 'A');
      return all;
    },
    noBoss() { return this.mode() === 'skirmish'; },

    /** Công trình đã mở khoá chưa (chiến dịch: theo bậc; chế độ khác: theo thời đại). */
    locked(def) {
      const S = G.S;
      if (!this.eraMode()) {
        if ((def.era || 0) > 3) return 'Chỉ có ở chế độ Thời đại';
        return (def.tier || 1) > S.tier ? `Cần bậc ${G.TIERS[def.tier].name}` : '';
      }
      return (def.era || 0) > S.era ? `Cần ${G.ERAS[def.era].name}` : '';
    },
    unitLocked(def) {
      const S = G.S;
      const era = this.eraMode() ? S.era : 3;
      if ((def.era || 0) > era) return `Cần ${G.ERAS[def.era || 0].name}`;
      if (def.eraMax != null && era > def.eraMax) return 'Đã lỗi thời';
      if (!this.eraMode() && (def.tier || 0) > S.tier) return `Cần bậc ${G.TIERS[def.tier].name}`;
      return '';
    },
    techLocked(t) {
      const S = G.S;
      if (this.eraMode()) return S.era < t.tier ? `Cần ${G.ERAS[t.tier].name}` : '';
      return S.tier < t.tier ? `Cần bậc ${G.TIERS[t.tier].name}` : '';
    },

    // ---------------- Thời đại ----------------
    nextEra() { return G.ERAS[G.S.era + 1] || null; },
    advanceEra() {
      const S = G.S, next = this.nextEra();
      if (!next) return;
      if (!S.flags.castleRepaired) { G.UI.toast('Hãy phục dựng nhà lớn trước', 'bad'); return; }
      S.villagers = G.Village.villagers().length;
      if (S.villagers < next.pop) { G.UI.toast(`Cần ${next.pop} dân`, 'bad'); return; }
      if (!G.Economy.has(next.cost)) { G.UI.toast('Không đủ tài nguyên', 'bad'); return; }
      G.Economy.take(next.cost);
      this.setEra(S.era + 1);
      G.Audio.play('victory');
      G.UI.banner(next.name, 'Công trình, quân đội và kiến trúc mới đã mở khoá.');
      G.Village.addMorale(8, 'Bước sang thời đại mới');
      G.UI.refresh();
    },
    setEra(e) {
      const S = G.S;
      S.era = e;
      S.tier = e <= 1 ? 1 : e === 2 ? 2 : e === 3 ? 3 : 4;
      // công trình cứng hơn theo thời đại
      for (const b of S.buildings) {
        if (b.team !== 0) continue;
        const d = G.BUILDINGS[b.type];
        const r = b.hp / b.maxHp;
        b.maxHp = Math.round(d.hp * (S.techs.masonry ? 1.4 : 1) * (1 + e * (b.type === 'castle' ? 0.45 : 0.25)) + (b.type === 'castle' ? (S.tier - 1) * 600 : 0));
        b.hp = Math.max(1, Math.round(b.maxHp * r));
      }
      G.Military.refreshAllBuffs();
      if (G.Render.minimapDirty !== undefined) G.Render.minimapDirty = true;
    },
    houseCap(b) {
      const d = G.BUILDINGS[b.type];
      if (b.type === 'castle') return null;
      if (b.type === 'house' && this.eraMode()) return G.ERAS[G.S.era].house;
      return d.house;
    },

    // ---------------- Giặc ----------------
    raidPolicy() {
      const m = this.mode();
      if (this.def().peaceful) return null;
      if (m === 'survival') return { every: true, blood: 5, mult: 1.35, from: 2 };
      if (m === 'skirmish') return { every: true, blood: 7, mult: 1, from: 3 };
      return { blood: 8, mult: 1, from: 3 };
    },

    // ---------------- Mục tiêu ----------------
    chapterName() {
      if (this.mode() === 'campaign') return G.CHAPTERS[G.S.quests.chapter].name;
      return `${this.def().name} · ${G.World.map.name} (cấp ${this.level()})`;
    },
    startQuests() {
      const m = this.mode();
      if (m === 'campaign') { G.Quests.start('q_advisor'); return; }
      const first = { ages: 'm_era1', survival: 'm_day5', sandbox: 'm_era_any', skirmish: 'm_ai', pvp: 'm_pvp' }[m];
      if (first) G.Quests.start(first);
      if (m === 'ages') G.Quests.start('m_house3');
    },

    // ---------------- Đối thủ máy ----------------
    aiInit() {
      const S = G.S;
      S.ai = { gold: 200, era: S.era, day: 0, built: 0, wave: 0 };
      const F = S.camps.F;
      if (F) F.name = 'Vương quốc Huyết Nha (máy)';
    },
    aiDaily() {
      const S = G.S;
      if (this.mode() !== 'skirmish' || !S.ai || G.campDead('F')) return;
      const ai = S.ai, lm = this.levelMult();
      ai.gold += Math.round((60 + S.day * 18) * lm);
      // máy theo kịp thời đại của người chơi (chậm hơn một chút)
      if (ai.era < S.era && S.day % 3 === 0) ai.era++;
      if (ai.era < 6 && S.day % 8 === 0) ai.era = Math.min(6, ai.era + 1);
      // xây thêm công trình quanh thành
      const P = G.World.PLACES.F;
      if (ai.gold > 250 && ai.built < 10) {
        const type = G.pick(['r_tower', 'r_house', 'r_barracks', 'r_house2', 'r_tower']);
        const d = G.BUILDINGS[type];
        for (let k = 0; k < 30; k++) {
          const tx = P.tx + G.randInt(-9, 9), ty = P.ty + G.randInt(-7, 7);
          if (!G.Build.canPlace(type, tx, ty)) {
            const b = G.Build.create(type, tx, ty, 1, { built: true, camp: 'F' });
            b.maxHp = b.hp = Math.round(d.hp * lm);
            ai.gold -= 250; ai.built++;
            break;
          }
        }
      }
      // luyện quân đồn trú
      const camp = S.camps.F;
      const want = 8 + Math.floor(S.day * 0.8 * lm);
      camp.garrison = camp.garrison.filter((id) => G.byId(id));
      while (ai.gold >= 40 && camp.garrison.length < want) {
        G.Units.spawnGarrison('F', G.pick(['raider', 'redwarrior', 'redarcher', 'redwarrior', 'redlancer']));
        ai.gold -= 40;
      }
      // đợt tấn công ban ngày
      if (S.day >= 4 && S.day % 2 === 0) G.Military.sendAiWave(0.6);
    },
  };
  G.Modes = Modes;

  // ---------------- Mục tiêu các chế độ (dùng chung hệ nhiệm vụ) ----------------
  const eraQ = (e, next) => ({
    ch: 1, name: `Tiến lên ${G.ERAS[e].name}`, desc: `Nâng Nhà lớn/Lâu đài lên ${G.ERAS[e].name} (bấm vào trung tâm vương quốc).`,
    progress: () => [G.S.era >= e ? 1 : 0, 1], reward: { xp: 60 + e * 30, gold: 50 * e }, next,
  });
  Object.assign(G.QUESTS, {
    m_house3: { ch: 1, name: 'Bộ lạc đầu tiên', desc: 'Phục dựng Nhà lớn, có 3 nhà ở.', progress: () => [G.S.buildings.filter((b) => b.type === 'house' && b.built && b.team === 0).length, 3], reward: { xp: 40, gold: 40 } },
    m_era1: eraQ(1, ['m_era2']), m_era2: eraQ(2, ['m_era3']), m_era3: eraQ(3, ['m_era4']), m_era4: eraQ(4, ['m_era5']), m_era5: eraQ(5, ['m_era6']), m_era6: eraQ(6, ['m_fortress']),
    m_fortress: {
      ch: 1, name: 'Bá chủ', desc: 'Phá huỷ Thành Huyết Nha để thống nhất bản đồ.',
      progress: () => [G.campDead('F') ? 1 : 0, 1], hint: () => G.campTile('F'), reward: { xp: 500, gold: 1000 }, onDone: () => G.Game.victory(),
    },
    m_day5: { ch: 1, name: 'Trụ vững 5 ngày', desc: 'Sống sót tới ngày 6.', progress: () => [Math.min(5, G.S.day - 1), 5], reward: { xp: 80, gold: 100 }, next: ['m_day10'] },
    m_day10: { ch: 1, name: 'Trụ vững 10 ngày', desc: 'Sống sót tới ngày 11.', progress: () => [Math.min(10, G.S.day - 1), 10], reward: { xp: 150, gold: 200 }, next: ['m_day20'] },
    m_day20: { ch: 1, name: 'Trụ vững 20 ngày', desc: 'Sống sót tới ngày 21.', progress: () => [Math.min(20, G.S.day - 1), 20], reward: { xp: 300, gold: 400 }, next: ['m_day40'] },
    m_day40: { ch: 1, name: 'Huyền thoại sinh tồn', desc: 'Sống sót tới ngày 41.', progress: () => [Math.min(40, G.S.day - 1), 40], reward: { xp: 600, gold: 1000 }, onDone: () => G.Game.victory() },
    m_era_any: {
      ch: 1, name: 'Đô thị hiện đại', desc: 'Đưa vương quốc tới Thời Hiện Đại với 40 dân.',
      progress: () => [Math.min(G.S.era, 6) + (G.S.era >= 6 ? Math.min(40, G.S.villagers) / 40 * 0.999 : 0), 6.999], reward: { xp: 500 }, onDone: () => G.Game.victory(),
    },
    m_ai: { ch: 1, name: 'Hạ vương quốc máy', desc: 'Phá huỷ toàn bộ Vương quốc Huyết Nha ở phía đông.', progress: () => [G.campDead('F') ? 1 : 0, 1], hint: () => G.campTile('F'), reward: { xp: 500 }, onDone: () => G.Game.victory() },
    m_pvp: { ch: 1, name: 'Người sống sót cuối cùng', desc: 'Phá lâu đài đối thủ bằng cách gửi quân (bảng Quân đội). Giữ lâu đài của mình.', progress: () => [G.PvP && G.PvP.won ? 1 : 0, 1], reward: { xp: 500 }, onDone: () => G.Game.victory() },
  });
})(typeof window !== 'undefined' ? window : globalThis);
