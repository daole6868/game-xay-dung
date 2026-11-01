/*
 * Đấu online qua "phòng" của trang claude.ai (capability `room`).
 * Mỗi người chơi tự chạy vương quốc của mình; trạng thái và các đợt quân gửi đi được chia sẻ qua presence:
 *   { app, code, n (tên), st: lobby|play, ready, cfg (chủ phòng), go (lệnh bắt đầu), day, era, pop, pw, cs, lost, out: [{id,to,u}] }
 * Bên nhận tự sinh quân địch khi thấy một đợt mới gửi tới mình.
 */
(function (root) {
  'use strict';
  const G = root.G;
  const $ = (s) => document.querySelector(s);

  const PvP = {
    room: null, status: 'idle', code: '', name: '', cfg: {}, ready: false,
    started: null, seen: new Set(), out: [], won: false, lostSent: false, statT: 0,

    async connect() {
      if (this.room) return this.room;
      if (!window.claude || typeof window.claude.use !== 'function') { this.status = 'none'; return null; }
      this.status = 'connecting';
      try { this.room = await window.claude.use('room'); } catch (e) { this.room = null; }
      if (!this.room) { this.status = 'none'; this.renderLobby(); return null; }
      this.status = 'ok';
      this.room.onPeers(() => this.onPeers(), () => { this.status = 'none'; this.renderLobby(); });
      return this.room;
    },

    me() { const r = this.room; return r ? r.peers().find((p) => p.isMe && p.sameTab) : null; },
    players() {
      if (!this.room) return [];
      return this.room.peers().filter((p) => p.presence && p.presence.app === 'guomlua' && p.presence.code === this.code).sort((a, b) => (a.peer < b.peer ? -1 : 1));
    },
    host() { return this.players()[0] || null; },
    isHost() { const h = this.host(), m = this.me(); return !!(h && m && h.peer === m.peer); },
    opponents() { const m = this.me(); return this.players().filter((p) => !m || p.peer !== m.peer); },
    set(patch) { if (this.room) this.room.presence(patch).catch(() => {}); },

    // ---------------- Phòng chờ ----------------
    async openLobby(opts) {
      this.name = opts.name;
      this.cfg = { mapId: opts.mapId, era: opts.era, diff: opts.difficulty };
      if (!this.code) this.code = Math.random().toString(36).slice(2, 7);
      this.ready = false; this.started = null; this.won = false; this.lostSent = false; this.out = []; this.seen.clear();
      G.Title.view = 'lobby';
      G.Title.render();
      await this.connect();
      this.announce();
      this.renderLobby();
    },
    announce() {
      this.set({ app: 'guomlua', code: this.code, n: this.name.slice(0, 18), st: 'lobby', ready: this.ready, cfg: this.cfg, go: null, lost: false, out: [] });
    },
    renderLobby() { if (G.Title.view === 'lobby' && !G.Game.running) G.Title.render(); },

    lobbyHtml() {
      if (this.status === 'none') {
        return `<div class="form"><h3>${G.UI.icon('i.pvp', 'mi')} Đấu online</h3>
          <p>Không kết nối được phòng chơi. Chế độ online chỉ chạy khi mở game trên <b>claude.ai</b> bằng tài khoản đã đăng nhập và được mời vào trang này (khách vào bằng link công khai không kết nối được).</p>
          <p class="small muted">Bạn vẫn có thể chơi chế độ <b>Đấu với máy</b>.</p>
          <div class="row"><button class="btn" data-act="tview" data-arg="new">◂ Quay lại</button><button class="btn primary" data-act="ngMode" data-arg="skirmish">Đấu với máy ▸</button></div></div>`;
      }
      const players = this.players();
      const host = this.host();
      const hc = (host && host.presence.cfg) || this.cfg;
      const map = G.mapById(hc.mapId);
      const me = this.me();
      const allReady = players.length >= 2 && players.every((p) => p.presence.ready);
      return `<div class="form wide"><h3>${G.UI.icon('i.pvp', 'mi')} Phòng đấu online</h3>
        <div class="row lobby-code"><label>Mã phòng <input id="pvp-code" maxlength="12" value="${G.esc(this.code)}"></label><button class="btn small" data-act="pvpCode">Đổi phòng</button></div>
        <p class="small muted">Gửi mã phòng cho bạn bè. Họ mở cùng trang game, chọn Đấu online và nhập đúng mã này.</p>
        <p>Bản đồ: <b>${map.name}</b> (cấp ${map.level}, ${map.W}×${map.H}) · Thời đại: <b>${G.ERAS[hc.era || 0].short}</b> <span class="small muted">— chủ phòng chọn</span></p>
        <div class="lobby-list">${this.status !== 'ok' ? '<p class="muted">Đang kết nối...</p>' : players.length ? players.map((p) => `<div class="lp ${p.presence.ready ? 'ready' : ''}">${host && p.peer === host.peer ? '👑 ' : ''}<b>${G.esc(String(p.presence.n || 'Người chơi'))}</b>${me && p.peer === me.peer ? ' <small>(bạn)</small>' : ''}${p.guest ? ' <small>(khách)</small>' : ''}<span>${p.presence.ready ? 'Sẵn sàng' : 'Đang chờ'}</span></div>`).join('') : '<p class="muted">Chưa có ai trong phòng.</p>'}</div>
        <div class="row">
          <button class="btn" data-act="tview" data-arg="new">◂ Rời phòng</button>
          <button class="btn ${this.ready ? '' : 'primary'}" data-act="pvpReady">${this.ready ? 'Huỷ sẵn sàng' : '✓ Sẵn sàng'}</button>
          ${this.isHost() ? `<button class="btn primary" data-act="pvpStart" ${allReady ? '' : 'disabled'}>Bắt đầu trận (${players.length} người)</button>` : '<span class="small muted">Chờ chủ phòng bắt đầu…</span>'}
        </div></div>`;
    },

    onPeers() {
      if (!G.Game.running) {
        // lệnh bắt đầu từ chủ phòng
        const h = this.host();
        const go = h && h.presence.go;
        if (go && go.id && this.started !== go.id && this.players().some((p) => p.peer === (this.me() || {}).peer)) {
          this.started = go.id;
          this.startGame(go);
          return;
        }
        this.renderLobby();
        return;
      }
      if (G.S.mode !== 'pvp') return;
      const me = this.me();
      if (!me) return;
      for (const p of this.opponents()) {
        const name = String(p.presence.n || 'Đối thủ');
        for (const a of Array.isArray(p.presence.out) ? p.presence.out : []) {
          const key = p.peer + ':' + a.id;
          if (!a || a.to !== me.peer || this.seen.has(key)) continue;
          this.seen.add(key);
          if (a.u && typeof a.u === 'object') G.Military.spawnIncoming(this.cleanUnits(a.u), name);
        }
      }
      const opp = this.opponents().filter((p) => p.presence.st === 'play');
      if (opp.length && opp.every((p) => p.presence.lost) && !this.won && !G.Game.over) {
        this.won = true;
        G.UI.toast('Mọi đối thủ đã bị loại!', 'good', 5);
      }
    },
    cleanUnits(u) {
      const out = {};
      for (const k in u) if (G.UNITS[k] && G.UNITS[k].cost && +u[k] > 0) out[k] = Math.min(40, Math.floor(+u[k]));
      return out;
    },

    // ---------------- Trong trận ----------------
    start() {
      if (!this.isHost()) return;
      const go = { id: Math.random().toString(36).slice(2, 9), seed: (Math.random() * 1e9) | 0, mapId: this.cfg.mapId, era: this.cfg.era, diff: this.cfg.diff };
      this.set({ go });
    },
    startGame(go) {
      this.seen.clear(); this.out = []; this.won = false; this.lostSent = false;
      G.Title.start(() => G.Game.newGame({ heroName: this.name, difficulty: go.diff || 'normal', seed: go.seed, mode: 'pvp', mapId: go.mapId, era: go.era }), false);
    },
    onGameStart() {
      this.set({ st: 'play', ready: false, lost: false, out: [], go: null });
      G.UI.toast('Trận đấu bắt đầu! Xây quân rồi gửi sang đất đối thủ ở bảng Quân đội (R).', 'info', 6);
    },
    update(dt) {
      if (!G.Game.running || G.S.mode !== 'pvp' || !this.room) return;
      this.statT -= dt;
      if (this.statT > 0) return;
      this.statT = 2;
      const S = G.S;
      const c = G.byId(S.castleId);
      this.set({ day: S.day, era: S.era, pop: S.villagers, pw: S.units.filter((u) => u.team === 0 && u.soldier).length, cs: c ? Math.round(c.hp / c.maxHp * 100) : 0 });
    },
    onDefeat() { if (!this.lostSent) { this.lostSent = true; this.set({ lost: true }); } },

    /** Gửi quân: rút khỏi vương quốc của mình và xuất hiện ở đất đối thủ. */
    sendAttack(toPeer, which) {
      const S = G.S;
      const list = S.units.filter((u) => u.team === 0 && u.soldier && !u.merc && (which === 'all' || u.squad === 'B'));
      if (!list.length) { G.UI.toast(which === 'all' ? 'Chưa có binh sĩ' : 'Đội viễn chinh đang trống', 'bad'); return; }
      const u = {};
      for (const s of list) { u[s.type] = (u[s.type] || 0) + 1; G.FX.sprite('fx.dust', s.x, s.y, 0.7); G.Units.remove(s); }
      this.out.push({ id: Math.random().toString(36).slice(2, 8), to: toPeer, u });
      if (this.out.length > 6) this.out.shift();
      this.set({ out: this.out });
      G.Audio.play('horn');
      G.UI.toast(`Đã xuất ${list.length} quân sang đánh đối thủ!`, 'good', 4);
    },

    panelHtml() {
      if (!this.room) return '<div class="box"><b>Đấu online</b><p class="small muted">Mất kết nối phòng chơi.</p></div>';
      const opp = this.opponents();
      let h = `<div class="box"><b>${G.UI.icon('i.pvp')} Đối thủ (phòng ${G.esc(this.code)})</b>`;
      if (!opp.length) h += '<p class="small muted">Không còn ai trong phòng.</p>';
      for (const p of opp) {
        const pr = p.presence;
        h += `<div class="contract"><div><b>${G.esc(String(pr.n || 'Đối thủ'))}</b>${pr.lost ? ' <span class="bad">— đã bị loại</span>' : ''}<br>
          <small>Ngày ${+pr.day || 1} · ${G.ERAS[+pr.era || 0] ? G.ERAS[+pr.era || 0].short : ''} · ${+pr.pop || 0} dân · ${+pr.pw || 0} lính · lâu đài ${+pr.cs || 0}%</small></div>
          ${pr.lost ? '' : `<button class="btn small" data-act="pvpSend" data-arg="${G.esc(p.peer)}:B">Gửi đội viễn chinh</button><button class="btn danger small" data-act="pvpSend" data-arg="${G.esc(p.peer)}:all">Gửi toàn quân</button>`}</div>`;
      }
      return h + '<p class="small muted">Quân gửi đi sẽ rời vương quốc của bạn và xuất hiện ở phía đông đất đối thủ, tiến đánh lâu đài của họ.</p></div>';
    },
  };
  G.PvP = PvP;

  const A = G.UI.actions;
  A.pvpReady = () => { PvP.ready = !PvP.ready; PvP.set({ ready: PvP.ready }); PvP.renderLobby(); };
  A.pvpStart = () => PvP.start();
  A.pvpCode = () => {
    const v = ($('#pvp-code').value || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    if (!v) return;
    PvP.code = v; PvP.ready = false; PvP.announce(); PvP.renderLobby();
  };
  A.pvpSend = (arg) => {
    const i = arg.lastIndexOf(':');
    PvP.sendAttack(arg.slice(0, i), arg.slice(i + 1));
    G.UI.renderPanel();
  };
})(typeof window !== 'undefined' ? window : globalThis);
