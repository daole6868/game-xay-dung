/* Giao diện HTML: thanh trạng thái, thông báo, hộp thoại, sự kiện, xử lý chuột/phím trên bản đồ. */
(function (root) {
  'use strict';
  const G = root.G;
  const T = G.TILE;
  const $ = (s) => document.querySelector(s);

  const UI = {
    selected: 0,
    placing: null,
    panel: null,
    modalQueue: [],
    modal: null,
    hudT: 0,
    panelT: 0,
    pointerInPanel: false,
    actions: {},

    icon(key, cls = 'ic') { return `<img class="${cls}" src="${window.Assets.icon(key)}" alt="">`; },
    itemIcon(item, cls) { return this.icon(G.ITEMS[item].icon, cls); },
    costHtml(cost, mult = 1) {
      if (!cost) return '<span class="muted">Miễn phí</span>';
      return Object.keys(cost).map((k) => {
        const need = cost[k] * mult;
        const have = k === 'gold' ? G.S.gold : G.S.stock[k] || 0;
        const ic = k === 'gold' ? this.icon('i.coin') : this.itemIcon(k);
        return `<span class="cost ${have < need ? 'lack' : ''}">${ic}${G.fmt(need)}</span>`;
      }).join(' ');
    },

    thumbs: {},
    /** Ảnh thu nhỏ của một sprite (dùng cho thẻ công trình). */
    thumb(key, size = 64) {
      const ck = key + '@' + size;
      if (this.thumbs[ck]) return this.thumbs[ck];
      const make = (s) => {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const x = c.getContext('2d');
        x.imageSmoothingEnabled = false;
        const dw = s.fw * s.scale, dh = s.fh * s.scale;
        const k = Math.min(size / dw, size / dh) * 0.95;
        x.drawImage(s.img, 0, 0, s.fw, s.fh, (size - dw * k) / 2, (size - dh * k) / 2, dw * k, dh * k);
        return c.toDataURL();
      };
      let url = '';
      try { const s = window.Assets.get(key); if (s) url = make(s); } catch (e) {
        try { const s = window.Fallback.get(key); if (s) url = make(s); } catch (e2) { url = ''; }
      }
      this.thumbs[ck] = url;
      return url;
    },

    init() {
      document.body.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act]');
        if (!el || el.disabled) return;
        G.Audio.unlock();
        const fn = this.actions[el.dataset.act];
        if (fn) { G.Audio.play('click'); fn(el.dataset.arg, el, e); }
      });
      const panel = $('#panel');
      panel.addEventListener('pointerdown', () => { this.pointerInPanel = true; });
      window.addEventListener('pointerup', () => { setTimeout(() => { this.pointerInPanel = false; }, 50); });
      G.on('built', (b) => { if (G.BUILDINGS[b.type].road) G.Render.minimapDirty = true; });
      const mm = $('#minimap');
      mm.addEventListener('click', (e) => this.minimapClick(e, mm));
      G.Input.initJoystick($('#joystick'));
    },

    // ---------------- Cập nhật mỗi khung ----------------
    update(dt) {
      if (!G.S || !G.Game.running) return;
      this.hudT -= dt;
      if (this.hudT <= 0) { this.hudT = 0.12; this.renderHud(); }
      this.panelT -= dt;
      if (this.panel && this.panelT <= 0 && !this.pointerInPanel) {
        this.panelT = 0.6;
        this.renderPanel(true);
      }
      G.Render.drawMinimap($('#minimap'));
      if (this.mapOpen) G.Render.drawMinimap($('#bigmap'));
    },

    renderHud() {
      const S = G.S;
      const season = G.Time.season();
      const night = G.Time.isNight();
      const set = (sel, html) => { const el = $(sel); if (el && el._h !== html) { el.innerHTML = html; el._h = html; } };
      set('#hud-gold', `${this.icon('i.coin')}<b>${G.fmt(S.gold)}</b>`);
      set('#hud-day', `${this.icon(night ? 'i.moon' : 'i.sun')}<span>Ngày <b>${S.day}</b> · <b style="color:${season.color}">${season.name}</b> · ${G.Time.clock()}${S.weather === 'rain' ? ' · Mưa' : S.weather === 'drought' ? ' · Hạn' : S.weather === 'snow' ? ' · Tuyết' : ''}</span>`);
      set('#hud-pop', `${this.icon('i.pop')}<b>${S.villagers}</b>/${G.Build.houseCap()}`);
      const mc = S.morale >= 65 ? 'good' : S.morale < 35 ? 'bad' : '';
      set('#hud-morale', `${this.icon('i.morale')}<b class="${mc}">${Math.round(S.morale)}</b>`);
      const fp = G.Economy.foodPoints();
      const need = Math.max(1, S.villagers * 2 + S.units.filter((u) => u.team === 0 && u.soldier).reduce((a, u) => a + (G.UNITS[u.type].eat || 0), 0));
      const days = fp / need;
      set('#hud-food', `${this.icon('i.food')}<b class="${days < 1.5 ? 'bad' : days > 4 ? 'good' : ''}">${G.fmt(fp)}</b><small>${days >= 10 ? '10+' : days.toFixed(1)} ngày</small>`);
      const soldiers = S.units.filter((u) => u.team === 0 && u.soldier).length;
      set('#hud-army', `${this.icon('i.sword')}<b>${soldiers}</b>`);
      let rs = '';
      if (S.raid && (S.raid.pending || S.raid.active)) rs = `<span class="chip warn">${this.icon('i.skull')}${S.raid.active ? 'Giặc đang tấn công!' : 'Đêm nay có giặc'}${S.raid.blood ? ' · Trăng Máu' : ''}</span>`;
      else if (S.day % 8 === 7) rs = `<span class="chip warn soft">${this.icon('i.moon')}Đêm mai: Trăng Máu</span>`;
      if (S.research) rs += `<span class="chip">${this.icon('i.book')}${G.TECHS[S.research.id].name} ${Math.floor(S.research.t / G.TECHS[S.research.id].time * 100)}%</span>`;
      set('#hud-status', rs);
      for (const b of document.querySelectorAll('#speed button')) b.classList.toggle('on', (S.paused ? 0 : S.speed) === +b.dataset.arg);

      // tài nguyên
      let res = '';
      for (const k of G.ITEM_ORDER) {
        const n = S.stock[k] || 0;
        if (!n && !['wood', 'stone', 'berry', 'wheat'].includes(k)) continue;
        res += `<span class="res" title="${G.ITEMS[k].name}">${this.itemIcon(k)}${G.fmtShort(n)}</span>`;
      }
      set('#res-bar', res);

      // nhiệm vụ
      let q = `<div class="qt-ch">${G.CHAPTERS[S.quests.chapter].name}</div>`;
      for (const qq of G.Quests.active().slice(0, 4)) {
        const [cur, max] = qq.progress();
        q += `<div class="qt"><div class="qt-name">${G.esc(qq.name)}</div><div class="qt-desc">${G.esc(qq.desc)}</div><div class="qbar"><i style="width:${Math.min(100, cur / max * 100)}%"></i></div><small>${Math.min(cur, max)}/${max}</small></div>`;
      }
      if (S.flags.won) q += '<div class="qt"><div class="qt-name">Thử thách vô tận</div><div class="qt-desc">Huyết Nha đã tan, nhưng cướp biển vẫn còn. Hãy xây vương quốc hùng mạnh nhất!</div></div>';
      set('#quest-tracker', q);

      // hiệp sĩ
      const h = G.Hero.unit();
      const hs = S.hero;
      if (h) {
        set('#hero-name', `${G.esc(S.heroName)} <small>Cấp ${hs.lvl}</small>`);
        $('#bar-hp i').style.width = (h.hp / h.maxHp * 100) + '%';
        set('#bar-hp span', h.downed ? `Hồi sinh sau ${Math.ceil(hs.respawnT)}s` : `${Math.ceil(h.hp)}/${h.maxHp}`);
        $('#bar-hunger i').style.width = hs.hunger + '%';
        set('#bar-hunger span', `No ${Math.round(hs.hunger)}%`);
        $('#bar-xp i').style.width = (hs.xp / G.Hero.xpNext() * 100) + '%';
        G.Hero.SKILLS.forEach((sk, i) => {
          const el = $(`#skill-${i}`);
          const locked = hs.lvl < sk.lvl;
          el.classList.toggle('locked', locked);
          const cd = hs.cds[sk.id] || 0;
          el.querySelector('.cd').style.height = locked ? '100%' : (cd > 0 ? (cd / sk.cd * 100) + '%' : '0');
        });
        set('#btn-potion small', String(S.stock.potion || 0));
      }
    },

    // ---------------- Thông báo ----------------
    toast(msg, type = 'info', dur = 3) {
      const box = $('#toasts');
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      el.textContent = msg;
      box.appendChild(el);
      while (box.children.length > 4) box.firstChild.remove();
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, dur * 1000);
      if (type === 'bad') G.Audio.play('tick');
    },
    logs: [],
    log(msg, type = 'info') {
      this.logs.push({ msg, type, day: G.S ? G.S.day : 0 });
      if (this.logs.length > 80) this.logs.shift();
      const el = $('#log');
      if (!el) return;
      el.innerHTML = this.logs.slice(-5).map((l) => `<div class="${l.type}">${G.esc(l.msg)}</div>`).join('');
    },
    ping(x, y, label) {
      G.FX.text(x, y - 40, '▼ ' + label, '#ffd166', 18);
      this.log(`${label}: xem trên bản đồ nhỏ.`, 'info');
      this.pings = (this.pings || []).concat([{ x, y, t: 6 }]);
    },
    banner(title, sub) {
      const el = $('#banner');
      el.innerHTML = `<h2>${G.esc(title)}</h2>${sub ? `<p>${G.esc(sub)}</p>` : ''}`;
      el.classList.remove('show');
      void el.offsetWidth;
      el.classList.add('show');
    },
    chapter(name) { this.banner(name, ''); G.Audio.play('victory'); },

    // ---------------- Hộp thoại (tạm dừng game) ----------------
    modalOpen() { return !!this.modal; },
    pushModal(m) { this.modalQueue.push(m); if (!this.modal) this.nextModal(); },
    nextModal() {
      const box = $('#modal');
      this.modal = this.modalQueue.shift() || null;
      if (!this.modal) { box.classList.add('hidden'); box.innerHTML = ''; return; }
      box.classList.remove('hidden');
      this.modal.render(box);
    },
    closeModal() { const m = this.modal; this.modal = null; if (m && m.onClose) m.onClose(); this.nextModal(); },

    dialog(lines, cb) {
      if (!lines || !lines.length) { if (cb) cb(); return; }
      let i = 0;
      const ui = this;
      this.pushModal({
        onClose: cb,
        render(box) {
          const [who, text] = lines[i];
          const ch = G.CHARACTERS[who] || G.CHARACTERS.villager;
          const name = typeof ch.name === 'function' ? ch.name() : ch.name;
          box.innerHTML = `<div class="dialog">
            <img class="portrait" src="${window.Assets.icon('p.portrait.' + ch.portrait)}" alt="">
            <div class="dlg-body"><div class="dlg-name">${G.esc(name)}</div><div class="dlg-text">${G.esc(text)}</div>
            <div class="dlg-foot"><small>${i + 1}/${lines.length}</small><button class="btn primary" data-act="dlgNext">${i < lines.length - 1 ? 'Tiếp ▸' : 'Đóng'}</button></div></div></div>`;
          ui.actions.dlgNext = () => { i++; if (i >= lines.length) ui.closeModal(); else this.render(box); };
        },
      });
    },

    choice(text, options, portrait = 'advisor') {
      const ui = this;
      this.pushModal({
        render(box) {
          box.innerHTML = `<div class="dialog">
            <img class="portrait" src="${window.Assets.icon('p.portrait.' + portrait)}" alt="">
            <div class="dlg-body"><div class="dlg-text">${G.esc(text)}</div>
            <div class="choices">${options.map((o, i) => `<button class="btn choice" data-act="choose" data-arg="${i}">${G.esc(o.label)}</button>`).join('')}</div></div></div>`;
          ui.actions.choose = (i) => { ui.closeModal(); options[+i].fn(); };
        },
      });
    },

    event(title, text, portrait, options) {
      const ui = this;
      G.Audio.play('ready');
      this.pushModal({
        render(box) {
          box.innerHTML = `<div class="event-card">
            <div class="ev-head">${ui.icon('i.scroll')} Sự kiện · Ngày ${G.S.day}</div>
            <h3>${G.esc(title)}</h3>
            <div class="ev-row"><img class="portrait" src="${window.Assets.icon('p.portrait.' + portrait)}" alt=""><p>${G.esc(text)}</p></div>
            <div class="choices">${options.map((o, i) => `<button class="btn choice" data-act="evChoose" data-arg="${i}" ${o.disabled ? 'disabled' : ''}>${G.esc(o.label)}</button>`).join('')}</div></div>`;
          ui.actions.evChoose = (i) => { ui.closeModal(); options[+i].fn(); ui.refresh(); };
        },
      });
    },

    endScreen(win) {
      const S = G.S, st = S.stats;
      const ui = this;
      this.pushModal({
        render(box) {
          box.innerHTML = `<div class="event-card end ${win ? 'win' : 'lose'}">
            <h2>${win ? 'BÌNH MINH LAM QUỐC' : 'LÂU ĐÀI ĐÃ THẤT THỦ'}</h2>
            <p>${win ? `Sau ${S.day} ngày, cờ Lam lại tung bay. Huyết Nha tan rã, và Đất Bình Minh trở thành vương quốc mới của người Lam.` : `Ngày ${S.day}, ngọn lửa cuối cùng của Lam Quốc đã tắt... Nhưng truyền thuyết có thể viết lại.`}</p>
            <div class="stats">
              <div><b>${S.villagers}</b><span>dân</span></div><div><b>${G.TIERS[S.tier].name}</b><span>bậc</span></div>
              <div><b>${st.kills || 0}</b><span>giặc bị hạ</span></div><div><b>${st.camps || 0}</b><span>trại bị phá</span></div>
              <div><b>${G.fmt(st.goldEarned || 0)}</b><span>vàng kiếm được</span></div><div><b>${st.harvested || 0}</b><span>nông sản</span></div>
              <div><b>${st.raidsBeaten || 0}</b><span>đêm giữ thành</span></div><div><b>${st.quests || 0}</b><span>nhiệm vụ</span></div>
            </div>
            <div class="choices row">
              ${win ? '<button class="btn primary" data-act="endContinue">Tiếp tục xây dựng (vô tận)</button>' : '<button class="btn primary" data-act="endLoad">Tải bản lưu tự động</button>'}
              <button class="btn" data-act="endTitle">Về màn hình chính</button>
            </div></div>`;
          ui.actions.endContinue = () => ui.closeModal();
          ui.actions.endLoad = () => { ui.closeModal(); if (G.Game.load('auto')) ui.toast('Đã tải bản lưu tự động', 'good'); };
          ui.actions.endTitle = () => { ui.closeModal(); ui.toTitle(); };
        },
      });
    },

    // ---------------- Bàn phím ----------------
    onKey(e) {
      if (!G.Game.running) return;
      const k = e.code;
      if (this.modal) {
        if (k === 'Enter' || k === 'Space' || k === 'KeyE') { const b = $('#modal [data-act="dlgNext"], #modal [data-act="introGo"], #modal [data-act="endContinue"]'); if (b) b.click(); }
        return;
      }
      switch (k) {
        case 'Escape': if (this.placing) this.cancel(); else if (this.panel || this.mapOpen) this.closePanel(); else this.openPanel('menu'); break;
        case 'Space': G.Hero.attack(); break;
        case 'KeyE': G.Hero.interactNearest(); break;
        case 'Digit1': G.Hero.skill(0); break;
        case 'Digit2': G.Hero.skill(1); break;
        case 'Digit3': G.Hero.skill(2); break;
        case 'KeyF': G.Hero.eat(false); break;
        case 'KeyH': G.Hero.potion(); break;
        case 'KeyB': this.togglePanel('build'); break;
        case 'KeyV': this.togglePanel('village'); break;
        case 'KeyR': this.togglePanel('army'); break;
        case 'KeyT': this.togglePanel('trade'); break;
        case 'KeyK': this.togglePanel('tech'); break;
        case 'KeyJ': this.togglePanel('quests'); break;
        case 'KeyM': this.toggleMap(); break;
        case 'KeyC': G.Render.snapCamera(); break;
        case 'KeyL': G.Render.showLabels = !G.Render.showLabels; break;
        case 'KeyP': G.S.paused = !G.S.paused; break;
        case 'Equal': case 'NumpadAdd': G.Input.zoomAt(1.1); break;
        case 'Minus': case 'NumpadSubtract': G.Input.zoomAt(1 / 1.1); break;
        default: break;
      }
    },

    // ---------------- Chuột trên bản đồ ----------------
    tileAt(wx, wy) { return { x: Math.floor(wx / T), y: Math.floor(wy / T) }; },

    placementTiles() {
      const P = this.placing;
      if (!P) return [];
      const def = G.BUILDINGS[P.type];
      const m = G.Input.mouse;
      const cur = this.tileAt(m.wx, m.wy);
      if (P.drag && def.drag) {
        const a = P.drag, out = [];
        if (P.type === 'plot') {
          const x0 = Math.min(a.x, cur.x), x1 = Math.max(a.x, cur.x), y0 = Math.min(a.y, cur.y), y1 = Math.max(a.y, cur.y);
          for (let y = y0; y <= y1 && out.length < 60; y++) for (let x = x0; x <= x1 && out.length < 60; x++) out.push({ x, y });
        } else {
          const sx = Math.sign(cur.x - a.x), sy = Math.sign(cur.y - a.y);
          for (let x = a.x; ; x += sx) { out.push({ x, y: a.y }); if (x === cur.x || !sx) break; }
          if (sy) for (let y = a.y + sy; ; y += sy) { out.push({ x: cur.x, y }); if (y === cur.y) break; }
        }
        return out.slice(0, 80);
      }
      return [{ x: cur.x - Math.floor((def.w - 1) / 2), y: cur.y - Math.floor((def.h - 1) / 2) }];
    },

    startPlacing(type) {
      const def = G.BUILDINGS[type];
      if ((def.tier || 1) > G.S.tier) { this.toast(`Cần đạt bậc ${G.TIERS[def.tier].name}`, 'bad'); return; }
      if (!G.Build.canAfford(def.cost)) { this.toast('Không đủ tài nguyên', 'bad'); return; }
      this.placing = { type };
      this.closePanel();
      this.toast(def.drag ? `Kéo chuột để đặt nhiều ${def.name}. Chuột phải / Esc để thôi.` : `Chọn vị trí đặt ${def.name}. Chuột phải / Esc để huỷ.`, 'info', 2.5);
      document.body.classList.add('placing');
    },
    cancel() {
      if (this.placing) { this.placing = null; document.body.classList.remove('placing'); return; }
      this.selected = 0;
      if (this.panel === 'building') this.closePanel();
    },

    pointerDown(wx, wy) {
      if (this.modal) return;
      const P = this.placing;
      if (P) {
        const def = G.BUILDINGS[P.type];
        if (def.drag) { P.drag = this.tileAt(wx, wy); return; }
        const t = this.placementTiles()[0];
        const b = G.Build.place(P.type, t.x, t.y);
        if (b && !G.Input.down('ShiftLeft') && !G.Input.down('ShiftRight')) { this.placing = null; document.body.classList.remove('placing'); }
        return;
      }
      this.down = { x: wx, y: wy };
    },

    pointerUp(wx, wy) {
      if (this.modal) return;
      const P = this.placing;
      if (P && P.drag) {
        const tiles = this.placementTiles();
        let n = 0;
        for (const t of tiles) { if (G.Build.place(P.type, t.x, t.y, true)) n++; else if (!G.Build.canAfford(G.BUILDINGS[P.type].cost)) break; }
        if (!n) this.toast('Không đặt được ở đó', 'bad', 1.5);
        P.drag = null;
        return;
      }
      if (!this.down) return;
      this.down = null;
      this.clickWorld(wx, wy);
    },

    buildingAtPoint(wx, wy) {
      let best = null;
      for (const b of G.S.buildings) {
        const d = G.BUILDINGS[b.type];
        if (d.road) continue;
        const up = d.ground ? 0 : b.h * 0.7;
        if (wx >= b.tx * T && wx < (b.tx + b.w) * T && wy >= (b.ty - up) * T && wy < (b.ty + b.h) * T) {
          if (!best || b.ty > best.ty) best = b;
        }
      }
      return best;
    },

    clickWorld(wx, wy) {
      const b = this.buildingAtPoint(wx, wy);
      const enemy = G.Units.nearest(wx, wy - 20, 46, (e) => e.team === 1);
      if (enemy || (b && b.team === 1)) { G.Hero.command(wx, wy); return; }
      if (b && b.team === 0) {
        if (!b.built || b.fire > 0 || (b.type === 'plot' && G.Village.plotNeed({ ...b, claimBy: 0 }) && !(this.selected === b.id))) {
          G.S.hero.order = { type: 'interact', id: b.id };
          const h = G.Hero.unit(); if (h) h.path = null;
          if (b.type === 'plot') this.selectBuilding(b);
          return;
        }
        this.selectBuilding(b);
        return;
      }
      if (b && b.team === 2) {
        const npc = G.S.units.find((u) => u.npc && u.faction === b.faction && ['merchant', 'abbess', 'chief'].includes(u.role));
        if (npc) { G.S.hero.order = { type: 'interact', id: npc.id }; const h = G.Hero.unit(); if (h) h.path = null; return; }
      }
      if (this.panel === 'building') this.closePanel();
      this.selected = 0;
      G.Hero.command(wx, wy);
    },

    selectBuilding(b) {
      this.selected = b.id;
      this.openPanel('building');
    },

    // ---------------- Bản đồ ----------------
    minimapClick(e, canvas) {
      const r = canvas.getBoundingClientRect();
      const wx = (e.clientX - r.left) / r.width * G.World.W * T;
      const wy = (e.clientY - r.top) / r.height * G.World.H * T;
      if (this.mapMode === 'attack') {
        this.mapMode = null;
        G.Military.orderAttack(wx, wy);
        this.toggleMap(false);
        return;
      }
      G.Render.cam.free = true;
      G.Render.cam.x = wx; G.Render.cam.y = wy;
      if (canvas.id === 'bigmap') this.toggleMap(false);
    },
    toggleMap(force) {
      const open = force === undefined ? !this.mapOpen : force;
      this.mapOpen = open;
      $('#mapview').classList.toggle('hidden', !open);
      if (!open) this.mapMode = null;
      $('#map-hint').textContent = this.mapMode === 'attack' ? 'Chọn điểm cho Đội viễn chinh tấn công' : 'Bấm để di chuyển camera · phím C để quay về Hiệp sĩ';
    },

    toTitle() {
      G.Game.running = false;
      this.closePanel();
      $('#game').classList.add('hidden');
      $('#title').classList.remove('hidden');
      G.Title.render();
    },

    refresh() { this.hudT = 0; this.panelT = 0; if (this.panel) this.renderPanel(); },
  };
  G.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
