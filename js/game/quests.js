/* Quản lý nhiệm vụ cốt truyện và sự kiện ngẫu nhiên. */
(function (root) {
  'use strict';
  const G = root.G;

  const Quests = {
    active() { return G.S.quests.active.map((id) => Object.assign({ id }, G.QUESTS[id])); },
    isActive(id) { return G.S.quests.active.includes(id); },
    isDone(id) { return !!G.S.quests.done[id]; },

    start(id) {
      const Q = G.S.quests;
      if (Q.active.includes(id) || Q.done[id]) return;
      Q.active.push(id);
      const q = G.QUESTS[id];
      if (q.ch > Q.chapter) {
        Q.chapter = q.ch;
        G.UI.chapter(G.CHAPTERS[q.ch].name);
      }
      if (q.talk) G.UI.dialog(q.talk);
      G.UI.log(`Nhiệm vụ mới: ${q.name}`, 'info');
    },

    complete(id) {
      const Q = G.S.quests;
      const q = G.QUESTS[id];
      Q.active = Q.active.filter((x) => x !== id);
      Q.done[id] = G.S.day;
      const r = q.reward || {};
      const parts = [];
      if (r.gold) { G.Economy.addGold(r.gold); parts.push(`+${r.gold} vàng`); }
      if (r.items) for (const k in r.items) { G.Economy.addItem(k, r.items[k]); parts.push(`+${r.items[k]} ${G.ITEMS[k].name}`); }
      if (r.rep) for (const f in r.rep) { G.Economy.addRep(f, r.rep[f]); parts.push(`uy tín ${G.FACTIONS[f].name} +${r.rep[f]}`); }
      if (r.xp) G.Hero.gainXp(r.xp);
      G.Audio.play('quest');
      G.UI.toast(`Hoàn thành: ${q.name}${parts.length ? ' (' + parts.join(', ') + ')' : ''}`, 'good', 4);
      G.S.stats.quests = (G.S.stats.quests || 0) + 1;
      const after = () => {
        if (q.onDone) q.onDone();
        if (q.choice) {
          G.UI.choice(q.choice.text, q.choice.options.map((o) => ({ label: o.label, fn: o.effect })), 'chief');
        }
        for (const n of q.next || []) this.start(n);
      };
      if (q.done) G.UI.dialog(q.done, after); else after();
    },

    update(dt) {
      const Q = G.S.quests;
      Q.checkT = (Q.checkT || 0) - dt;
      if (Q.checkT > 0 || G.UI.modalOpen()) return;
      Q.checkT = 0.5;
      for (const id of Q.active.slice()) {
        const q = G.QUESTS[id];
        const [cur, max] = q.progress();
        if (cur >= max) { this.complete(id); return; }
      }
    },

    // ---------------- Sự kiện ngẫu nhiên ----------------
    rollEvent() {
      const S = G.S;
      if (S.day < 3 || Math.random() > 0.55) return;
      const ev = G.weighted(G.EVENTS.filter((e) => e.id !== S.lastEvent), (e) => e.weight());
      if (!ev) return;
      S.lastEvent = ev.id;
      const d = {};
      if (ev.init) ev.init(d);
      const opts = ev.choices.map((c) => ({
        label: c.label(d), disabled: c.cond ? !c.cond(d) : false,
        fn: () => c.effect(d),
      }));
      if (opts.every((o) => o.disabled)) opts[opts.length - 1].disabled = false;
      G.UI.event(ev.title, ev.text(d), ev.portrait, opts);
    },
  };
  G.Quests = Quests;
})(typeof window !== 'undefined' ? window : globalThis);
