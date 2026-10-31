/* Các bảng chức năng: xây dựng, công trình, dân làng, quân đội, giao thương, kỹ thuật, nhiệm vụ, menu. */
(function (root) {
  'use strict';
  const G = root.G;
  const UI = G.UI;
  const T = G.TILE;
  const $ = (s) => document.querySelector(s);
  const A = UI.actions;

  const TITLES = { build: 'Xây dựng', building: 'Công trình', village: 'Dân làng', army: 'Quân đội', trade: 'Giao thương', tech: 'Kỹ thuật', quests: 'Nhiệm vụ & Nhật ký', menu: 'Hệ thống', assets: 'Bộ ảnh Tiny Swords', help: 'Hướng dẫn' };

  UI.openPanel = function (name, sub) {
    this.panel = name;
    if (sub !== undefined) this.panelSub = sub;
    $('#panel').classList.remove('hidden');
    this.renderPanel();
  };
  UI.closePanel = function () {
    this.panel = null;
    $('#panel').classList.add('hidden');
    if (this.mapOpen) this.toggleMap(false);
  };
  UI.togglePanel = function (name) { if (this.panel === name) this.closePanel(); else { this.panelSub = undefined; this.openPanel(name); } };
  UI.renderPanel = function (live) {
    const p = this.panel;
    if (!p) return;
    const fn = PANELS[p];
    if (!fn) return;
    if (live && fn.static) return;
    const body = fn.call(this);
    if (body == null) { this.closePanel(); return; }
    const el = $('#panel');
    const scroll = el.querySelector('.pbody') ? el.querySelector('.pbody').scrollTop : 0;
    el.innerHTML = `<div class="phead"><h3>${typeof fn.title === 'function' ? fn.title() : TITLES[p]}</h3><button class="x" data-act="closePanel">✕</button></div><div class="pbody">${body}</div>`;
    el.querySelector('.pbody').scrollTop = scroll;
  };
  UI.openTrade = function (place) { this.panelSub = place; this.openPanel('trade'); };
  A.closePanel = () => UI.closePanel();
  A.panel = (name) => UI.togglePanel(name);
  A.sub = (s) => { UI.panelSub = s; UI.renderPanel(); };

  const tabs = (list, cur) => `<div class="tabs">${list.map(([id, label, dis]) => `<button class="tab ${cur === id ? 'on' : ''}" data-act="sub" data-arg="${id}" ${dis ? 'disabled' : ''}>${label}</button>`).join('')}</div>`;
  const bar = (v, color = '#5be37d') => `<div class="mbar"><i style="width:${G.clamp(v, 0, 1) * 100}%;background:${color}"></i></div>`;

  const PANELS = {};

  // ================= XÂY DỰNG =================
  PANELS.build = function () {
    const S = G.S;
    const cat = this.panelSub != null && G.BUILD_MENU[this.panelSub] ? +this.panelSub : 0;
    let h = tabs(G.BUILD_MENU.map((c, i) => [i, c.name]), cat);
    h += '<div class="cards">';
    for (const type of G.BUILD_MENU[cat].items) {
      const d = G.BUILDINGS[type];
      const locked = (d.tier || 1) > S.tier;
      const key = d.sprite || (d.variants && d.variants[0]);
      const afford = G.Build.canAfford(d.cost);
      h += `<button class="card ${locked ? 'locked' : ''} ${!afford ? 'poor' : ''}" data-act="place" data-arg="${type}" ${locked ? 'disabled' : ''}>
        <img class="thumb" src="${type === 'road' ? window.Assets.icon('i.map') : UI.thumb(key)}" alt="">
        <div class="cinfo"><b>${d.name}</b>${locked ? `<small class="lockt">🔒 Bậc ${G.TIERS[d.tier].name}</small>` : ''}
        <div class="costs">${UI.costHtml(d.cost)}</div><small>${d.desc}</small></div></button>`;
    }
    h += '</div><p class="muted small">Mẹo: giữ Shift để đặt liên tục. Ruộng, đường, rào, tường: kéo chuột để đặt cả dãy. Thợ xây sẽ tới dựng; Hiệp sĩ cũng có thể góp tay (bấm vào công trình đang xây).</p>';
    return h;
  };
  PANELS.build.static = true;
  A.place = (type) => UI.startPlacing(type);

  // ================= CÔNG TRÌNH =================
  PANELS.building = function () {
    const S = G.S;
    const b = G.byId(this.selected);
    if (!b) return null;
    const d = G.BUILDINGS[b.type];
    let h = `<div class="binfo"><img class="thumb big" src="${UI.thumb(G.Render.buildingSprite(b) || 'p.plot', 96)}" alt=""><div>
      <p>${d.desc || ''}</p>${d.road ? '' : `<div class="hpline">Độ bền ${Math.ceil(b.hp)}/${b.maxHp}${bar(b.hp / b.maxHp, b.hp < b.maxHp * 0.4 ? '#ff6b6b' : '#5be37d')}</div>`}
      ${!b.built ? `<div>Đang xây ${Math.floor(b.progress * 100)}% ${bar(b.progress, '#ffd166')}</div>` : ''}
      ${b.fire > 0 ? '<div class="bad">🔥 Đang cháy! Thợ xây hoặc Hiệp sĩ (E) có thể dập lửa.</div>' : ''}</div></div>`;
    if (b.team !== 0) return h;
    if (!b.built) {
      h += `<button class="btn" data-act="heroBuild">Hiệp sĩ góp tay xây</button> `;
      h += `<button class="btn danger" data-act="demolish">Huỷ (hoàn 90%)</button>`;
      return h;
    }
    if (b.type === 'castle') h += castleSection(b);
    if (d.house && b.type !== 'castle') h += `<p>Chỗ ở: +${d.house} người. Tổng chỗ ở: ${G.Build.houseCap()}, dân: ${S.villagers}.</p>`;
    if (b.type === 'plot') h += plotSection(b);
    if (b.type === 'pen') h += penSection(b);
    if (d.recipes) h += workshopSection(b);
    if (d.trains) h += trainSection(b);
    if (d.market) h += `<button class="btn primary" data-act="openTrade" data-arg="market">${UI.icon('i.trade')} Mở chợ</button>`;
    if (b.type === 'storage') h += '<p>Dân mang hàng tới kho gần nhất.</p>';
    if (!d.unique) h += `<div class="sep"></div><button class="btn danger small" data-act="demolish">Phá bỏ (hoàn 40%)</button>`;
    return h;
  };
  PANELS.building.title = () => { const b = G.byId(UI.selected); return b ? (b.type === 'castle' && b.ruined ? 'Tàn tích Lâu đài' : G.BUILDINGS[b.type].name) : ''; };
  A.demolish = () => { const b = G.byId(UI.selected); if (b) { G.Build.demolish(b); UI.closePanel(); } };
  A.heroBuild = () => { const b = G.byId(UI.selected); if (b) { G.S.hero.order = { type: 'interact', id: b.id }; UI.closePanel(); } };
  A.openTrade = (p) => UI.openTrade(p);

  function castleSection(b) {
    const S = G.S;
    let h = '';
    if (b.ruined) {
      return h + `<div class="box"><b>Phục dựng Lâu đài</b><p>Lâu đài đổ nát chỉ chứa được 3 người và không thể nâng cấp.</p><div class="costs">${UI.costHtml({ wood: 40, stone: 20 })}</div>
        <button class="btn primary" data-act="repairCastle">Phục dựng</button></div>`;
    }
    const next = G.TIERS[S.tier + 1];
    h += `<div class="box"><b>Bậc hiện tại: ${G.TIERS[S.tier].name}</b>`;
    if (next) {
      h += `<p>Nâng lên <b>${next.name}</b>: cần ${next.pop} dân (đang có ${S.villagers}).</p><div class="costs">${UI.costHtml(next.cost)}</div>
        <button class="btn primary" data-act="upgradeTier" ${S.villagers < next.pop || !G.Economy.has(next.cost) ? 'disabled' : ''}>Nâng bậc</button>`;
    } else h += '<p>Vương quốc đã đạt bậc cao nhất.</p>';
    h += '</div>';
    h += `<div class="box"><b>Thuế</b><div class="seg">${G.TAX.map((t, i) => `<button class="${S.tax === i ? 'on' : ''}" data-act="tax" data-arg="${i}">${t.name}<small>${t.gold}v/người · ${t.morale >= 0 ? '+' : ''}${t.morale} lòng dân</small></button>`).join('')}</div></div>`;
    h += `<button class="btn" data-act="panel" data-arg="tech">${UI.icon('i.book')} Nghiên cứu kỹ thuật</button>`;
    if (S.tier >= 2) h += '<p class="muted small">Từ bậc Làng, lâu đài tự bắn tên vào giặc.</p>';
    return h;
  }
  A.repairCastle = () => { G.Game.repairCastle(); UI.renderPanel(); };
  A.upgradeTier = () => { G.Game.upgradeTier(); UI.renderPanel(); };
  A.tax = (i) => { G.S.tax = +i; UI.renderPanel(); };

  function plotSection(b) {
    const S = G.S;
    const c = G.CROPS[b.crop];
    let st = 'Đất trống';
    if (b.withered) st = 'Cây đã héo — cần dọn';
    else if (b.stage === 3) st = 'Đã chín — chờ gặt!';
    else if (b.stage >= 0) st = `Đang lớn ${Math.floor(b.growth * 100)}%`;
    const season = G.Time.season().id;
    let h = `<p><b>${st}</b>${b.stage >= 0 && b.stage < 3 ? bar(b.growth, '#9be07a') : ''}</p>`;
    if (season === 'winter' && !S.techs.greenhouse) h += '<p class="bad small">Mùa đông: cây không lớn (cần kỹ thuật Nhà kính).</p>';
    h += '<b>Cây trồng cho ô này</b><div class="seg">';
    for (const k in G.CROPS) {
      const cr = G.CROPS[k];
      const locked = cr.locked && !S.flags.pumpkinUnlocked;
      h += `<button class="${b.crop === k ? 'on' : ''}" data-act="crop" data-arg="${k}" ${locked ? 'disabled' : ''}>${UI.itemIcon(cr.item)} ${cr.name}<small>${locked ? 'Mua hạt ở Cảng Kim Sa' : `${cr.days} ngày · ${cr.yield} sp · ${cr.seasons.map((s) => G.SEASONS.find((x) => x.id === s).name).join('/')}`}</small></button>`;
    }
    h += '</div><button class="btn small" data-act="cropAll">Áp dụng cho mọi ruộng trống</button>';
    void c;
    return h;
  }
  A.crop = (k) => { const b = G.byId(UI.selected); if (b) { b.crop = k; if (b.stage >= 0 && b.stage < 3) { /* giữ cây đang trồng */ } UI.renderPanel(); } };
  A.cropAll = () => {
    const b = G.byId(UI.selected);
    if (!b) return;
    let n = 0;
    for (const p of G.S.buildings) if (p.type === 'plot' && p.team === 0 && p.stage < 0) { p.crop = b.crop; n++; }
    UI.toast(`Đã đặt ${G.CROPS[b.crop].name} cho ${n} ruộng trống`, 'info');
  };

  function penSection(b) {
    const list = G.Village.sheepIn(b);
    const ready = list.filter((s) => s.wool >= 1).length;
    return `<p>Cừu: <b>${list.length}</b>/${G.BUILDINGS.pen.sheepCap} · Có len: ${ready}</p>
      <p class="small muted">Giao nghề Mục đồng để xén len. Cừu sinh con vào mùa xuân khi có từ 2 con. Dắt cừu hoang về: đứng cạnh, bấm E (tốn 1 cà rốt).</p>
      <button class="btn small" data-act="slaughter" ${list.length ? '' : 'disabled'}>Giết thịt 1 con (+4 thịt)</button>`;
  }
  A.slaughter = () => { const b = G.byId(UI.selected); if (b) { G.Village.slaughter(b); UI.renderPanel(); } };

  function workshopSection(b) {
    const d = G.BUILDINGS[b.type];
    const r = d.recipes[b.recipe || 0];
    const io = (o) => Object.keys(o).map((k) => `${o[k]} ${UI.itemIcon(k)}${G.ITEMS[k].name}`).join(' + ') || 'không cần nguyên liệu';
    let h = `<div class="box"><b>Sản xuất</b>`;
    if (d.recipes.length > 1) {
      h += '<div class="seg">' + d.recipes.map((rr, i) => `<button class="${(b.recipe || 0) === i ? 'on' : ''}" data-act="recipe" data-arg="${i}">${UI.itemIcon(Object.keys(rr.out)[0])} ${G.ITEMS[Object.keys(rr.out)[0]].name}</button>`).join('') + '</div>';
    }
    h += `<p>${io(r.in)} → ${io(r.out)} · ${r.t} giây/thợ</p>`;
    h += `<p>Thợ: <b>${b.activeWorkers || 0}</b>/${d.slots} ${b.running ? bar(b.prog, '#5be37d') : ''}</p>`;
    if (b.starved) h += '<p class="bad small">Thiếu nguyên liệu!</p>';
    if (!b.workers.length) h += '<p class="small muted">Chưa có thợ. Tăng số Thợ xưởng trong bảng Dân làng (V).</p>';
    h += `<button class="btn small" data-act="pauseWs">${b.paused ? '▶ Tiếp tục' : '⏸ Tạm dừng'}</button></div>`;
    return h;
  }
  A.recipe = (i) => { const b = G.byId(UI.selected); if (b) { b.recipe = +i; b.running = false; UI.renderPanel(); } };
  A.pauseWs = () => {
    const b = G.byId(UI.selected);
    if (!b) return;
    b.paused = !b.paused;
    if (b.paused) for (const id of b.workers.slice()) { const w = G.byId(id); if (w) G.Village.dropTask(w); }
    UI.renderPanel();
  };

  function trainSection(b) {
    const S = G.S;
    const d = G.BUILDINGS[b.type];
    let h = '<div class="box"><b>Huấn luyện</b><div class="cards">';
    for (const type of d.trains) {
      const u = G.UNITS[type];
      const err = G.Military.canTrain(b, type);
      h += `<button class="card" data-act="train" data-arg="${type}" ${err && err !== 'Không đủ tài nguyên' && err !== 'Hàng chờ đã đầy' ? 'disabled' : ''}>
        <img class="thumb" src="${UI.thumb(`u.blue.${u.kind}.idle`)}" alt=""><div class="cinfo"><b>${u.name}</b>
        <small>Máu ${u.hp} · ${u.healer ? 'Hồi ' + u.heal : 'Công ' + u.dmg} · ${u.ranged ? 'Tầm xa' : u.healer ? 'Chữa trị' : 'Cận chiến'} · Lương ${u.upkeep}v/ngày</small>
        <div class="costs">${UI.costHtml(u.cost)}</div>${err && err !== 'Không đủ tài nguyên' ? `<small class="lockt">${err}</small>` : ''}</div></button>`;
    }
    h += '</div>';
    if (b.queue.length) h += `<p>Hàng chờ: ${b.queue.map((q, i) => `${G.UNITS[q.type].name}${i === 0 ? ` (${Math.floor(q.t / G.UNITS[q.type].train * 100)}%)` : ''}`).join(', ')}</p>`;
    h += `<p class="small muted">Lính mới vào ${S.army.defaultSquad === 'A' ? 'Đội cận vệ (đi theo Hiệp sĩ)' : 'Đội viễn chinh (giữ thành)'} — đổi trong bảng Quân đội (R).</p></div>`;
    return h;
  }
  A.train = (type) => { const b = G.byId(UI.selected); if (b) { G.Military.train(b, type); UI.renderPanel(); } };

  // ================= DÂN LÀNG =================
  PANELS.village = function () {
    const S = G.S;
    const counts = G.Village.jobCounts();
    let h = `<div class="kv"><span>Dân số</span><b>${S.villagers}/${G.Build.houseCap()}</b><span>Rảnh rỗi</span><b class="${counts.idle ? 'warn' : ''}">${counts.idle}</b><span>Lòng dân</span><b>${Math.round(S.morale)} ${bar(S.morale / 100, S.morale < 35 ? '#ff6b6b' : '#ffd166')}</b></div>`;
    h += '<table class="jobs">';
    for (const k of G.JOB_ORDER) {
      const j = G.JOBS[k];
      h += `<tr><td>${UI.icon(j.icon)} <b>${j.name}</b><br><small class="muted">${j.desc}</small></td>
        <td class="num"><button class="mini" data-act="job" data-arg="${k}:-1">−</button><b>${counts[k] || 0}</b><button class="mini" data-act="job" data-arg="${k}:1" ${counts.idle ? '' : 'disabled'}>+</button></td></tr>`;
    }
    h += '</table>';
    const ws = S.buildings.filter((b) => b.team === 0 && b.built && G.BUILDINGS[b.type].slots).reduce((a, b) => a + G.BUILDINGS[b.type].slots, 0);
    h += `<p class="small muted">Thợ xưởng tự vào các xưởng còn chỗ (tổng ${ws} chỗ). Thương lái chạy các tuyến buôn đã mở ở Chợ (${S.routes.length} tuyến). Ban đêm dân về nhà nghỉ, trừ thợ xưởng và thương lái.</p>`;
    // khẩu phần
    h += '<div class="box"><b>Khẩu phần ăn</b> <small class="muted">(bỏ chọn để giữ món đó lại, ví dụ để bán)</small><div class="ration">';
    for (const k of G.FOOD_ORDER) {
      const on = S.ration[k] !== false;
      h += `<button class="${on ? 'on' : ''}" data-act="ration" data-arg="${k}">${UI.itemIcon(k)} ${G.ITEMS[k].name} <small>${S.stock[k] || 0} · ${G.ITEMS[k].food} no</small></button>`;
    }
    h += '</div><p class="small muted">Mỗi dân ăn 2 điểm no/ngày, lính 2–3. Ăn càng nhiều món, lòng dân càng tăng.</p></div>';
    const r = S.lastReport;
    if (r) {
      h += `<div class="box"><b>Báo cáo sáng ngày ${r.day}</b><p>Ăn ${r.foodEaten}/${r.foodNeed} điểm no (${r.types} món). Thuế +${r.tax}, lương lính -${r.upkeep}. Dân mới: ${r.arrivals}.</p>`;
      h += '<ul class="small">' + r.morale.map(([n, v]) => `<li>${G.esc(n)}: <b class="${v > 0 ? 'good' : v < 0 ? 'bad' : ''}">${v > 0 ? '+' : ''}${Math.round(v * 10) / 10}</b></li>`).join('') + '</ul></div>';
    }
    h += `<div class="box"><b>Thuế</b><div class="seg">${G.TAX.map((t, i) => `<button class="${S.tax === i ? 'on' : ''}" data-act="tax" data-arg="${i}">${t.name}<small>${t.gold}v · ${t.morale >= 0 ? '+' : ''}${t.morale}</small></button>`).join('')}</div></div>`;
    return h;
  };
  A.job = (arg) => {
    const [k, d] = arg.split(':');
    const cur = G.Village.jobCounts()[k] || 0;
    G.Village.setJob(k, Math.max(0, cur + +d));
    UI.renderPanel();
  };
  A.ration = (k) => { G.S.ration[k] = G.S.ration[k] === false; UI.renderPanel(); };

  // ================= QUÂN ĐỘI =================
  PANELS.army = function () {
    const S = G.S;
    const types = ['warrior', 'archer', 'lancer', 'monk', 'merc', 'blacklancer'];
    const cnt = (sq, t) => S.units.filter((u) => u.team === 0 && u.soldier && u.squad === sq && u.type === t).length;
    let h = '<table class="army"><tr><th></th><th>Đội cận vệ<br><small>theo Hiệp sĩ</small></th><th></th><th>Đội viễn chinh<br><small>giữ thành / tấn công</small></th></tr>';
    let any = false;
    for (const t of types) {
      const a = cnt('A', t), b = cnt('B', t);
      if (!a && !b && (t === 'merc' || t === 'blacklancer')) continue;
      any = any || a || b;
      h += `<tr><td>${UI.icon(t === 'archer' ? 'i.bow' : t === 'lancer' || t === 'blacklancer' ? 'i.lance' : t === 'monk' ? 'i.heart' : 'i.sword')} ${G.UNITS[t].name}</td>
        <td class="num"><b>${a}</b></td><td class="num"><button class="mini" data-act="squad" data-arg="${t}:B" ${a ? '' : 'disabled'}>→</button><button class="mini" data-act="squad" data-arg="${t}:A" ${b ? '' : 'disabled'}>←</button></td><td class="num"><b>${b}</b></td></tr>`;
    }
    h += '</table>';
    if (!any) h += '<p class="muted">Chưa có binh sĩ. Xây Doanh trại (cần bậc Làng) và Lò rèn để có vũ khí.</p>';
    h += `<div class="box"><b>Đội viễn chinh: ${S.army.mode === 'attack' ? '⚔ Đang tấn công' : '🛡 Phòng thủ lâu đài'}</b><div class="row">
      <button class="btn primary" data-act="attackMap">⚔ Chọn điểm tấn công</button>
      <button class="btn" data-act="guard">🛡 Rút về giữ thành</button></div>
      <p class="small muted">Đội viễn chinh khi phòng thủ sẽ tự ứng cứu nơi có báo động gần lâu đài. Khi tấn công, đội sẽ đánh mọi thứ của giặc quanh điểm đã chọn.</p></div>`;
    h += `<div class="box"><b>Lính mới gia nhập</b><div class="seg"><button class="${S.army.defaultSquad === 'A' ? 'on' : ''}" data-act="defSquad" data-arg="A">Đội cận vệ</button><button class="${S.army.defaultSquad === 'B' ? 'on' : ''}" data-act="defSquad" data-arg="B">Đội viễn chinh</button></div></div>`;
    const up = S.units.filter((u) => u.team === 0 && u.soldier).reduce((a, u) => a + (G.UNITS[u.type].upkeep || 0), 0);
    h += `<p class="small">Lương lính mỗi sáng: <b>${Math.round(up * (S.techs.discipline ? 0.7 : 1) * G.DIFFICULTY[S.difficulty].upkeep)}</b> vàng. Khắc chế: Kiếm sĩ › Kỵ thương › Cung thủ › Kiếm sĩ.</p>`;
    h += '<div class="box"><b>Trại Huyết Nha</b><ul class="small">' + Object.values(S.camps).map((c) => `<li>${c.dead ? '✅' : '⚔'} ${c.name} ${c.dead ? '(đã phá)' : `— ${c.garrison.filter((id) => G.byId(id)).length} quân`}</li>`).join('') + '</ul></div>';
    return h;
  };
  A.squad = (arg) => { const [t, sq] = arg.split(':'); G.Military.setSquad(t, sq, G.Input.down('ShiftLeft') ? 99 : 1); UI.renderPanel(); };
  A.attackMap = () => { UI.closePanel(); UI.mapMode = 'attack'; UI.toggleMap(true); };
  A.guard = () => { G.Military.orderGuard(); UI.renderPanel(); };
  A.defSquad = (s) => { G.S.army.defaultSquad = s; UI.renderPanel(); };

  // ================= GIAO THƯƠNG =================
  PANELS.trade = function () {
    const S = G.S;
    const places = [['market', 'Chợ làng'], ['yellow', 'Cảng Kim Sa'], ['purple', 'Tử Nguyệt Tự'], ['black', 'Hắc Thạch'], ['contracts', 'Hợp đồng'], ['routes', 'Tuyến buôn']];
    const known = { market: true, yellow: S.flags.met_yellow, purple: S.flags.met_purple, black: S.flags.met_black, contracts: true, routes: true };
    let sub = this.panelSub && places.some((p) => p[0] === this.panelSub) ? this.panelSub : 'market';
    let h = tabs(places.map(([id, n]) => [id, n, !known[id]]), sub);
    if (S.demand && sub !== 'contracts' && sub !== 'routes') h += `<div class="demand">${UI.itemIcon(S.demand.item)} Hôm nay Thương hội đang săn <b>${G.ITEMS[S.demand.item].name}</b> — giá x${S.demand.mult.toFixed(1)} ở Chợ làng & Cảng Kim Sa</div>`;
    if (sub === 'contracts') return h + contractsHtml();
    if (sub === 'routes') return h + routesHtml();
    const can = G.Economy.canTradeAt(sub);
    if (sub !== 'market') {
      const f = G.FACTIONS[sub];
      h += `<div class="fac"><img class="portrait sm" src="${window.Assets.icon('p.portrait.' + f.portrait)}" alt=""><div><b>${f.name}</b> · ${f.leader}<br><small>${f.desc}</small><br><small>Uy tín: <b class="${S.rep[sub] >= 0 ? 'good' : 'bad'}">${Math.round(S.rep[sub] || 0)}</b> (giá ${S.rep[sub] >= 0 ? 'tốt hơn' : 'tệ hơn'} ${Math.abs(Math.round((S.rep[sub] || 0) / 5))}%)</small></div></div>`;
      if (!can) h += `<p class="warn">Chỉ xem giá. Muốn mua bán, hãy đưa Hiệp sĩ tới ${f.town}.</p>`;
    } else if (!can) h += '<p class="warn">Chưa có Chợ. Xây Chợ (bậc Làng) để buôn bán tại làng. Dưới đây là giá tham khảo.</p>';
    else h += `<p class="small muted">Thương hội Kim Sa thu mua mọi thứ. Chênh lệch mua/bán ${Math.round(G.Economy.spread() * 100)}%. Bán nhiều thì giá tụt, mỗi ngày giá hồi dần.</p>`;
    h += '<table class="trade"><tr><th>Hàng</th><th>Kho</th><th>Bán</th><th></th><th>Mua</th><th></th></tr>';
    for (const k of G.ITEM_ORDER) {
      const sp = G.Economy.sellPrice(k, sub), bp = G.Economy.buyPrice(k, sub);
      if (sp == null && bp == null) continue;
      const hist = sub === 'market' && S.markets.market && S.markets.market.hist[k];
      let trend = '';
      if (hist && hist.length > 1) { const a = hist[hist.length - 1], b = hist[hist.length - 2]; trend = a > b * 1.03 ? '<i class="up">▲</i>' : a < b * 0.97 ? '<i class="down">▼</i>' : ''; }
      const base = G.ITEMS[k].price;
      const sCls = sp != null && sp > base * 1.15 ? 'good' : '';
      h += `<tr><td>${UI.itemIcon(k)} ${G.ITEMS[k].name}${trend}</td><td class="num">${S.stock[k] || 0}</td>
        <td class="num ${sCls}">${sp != null ? sp.toFixed(1) : '—'}</td>
        <td>${sp != null && can ? `<button class="mini" data-act="sell" data-arg="${k}:1">1</button><button class="mini" data-act="sell" data-arg="${k}:10">10</button><button class="mini" data-act="sell" data-arg="${k}:all">Hết</button>` : ''}</td>
        <td class="num">${bp != null ? bp.toFixed(1) : '—'}</td>
        <td>${bp != null && can ? `<button class="mini" data-act="buy" data-arg="${k}:1">1</button><button class="mini" data-act="buy" data-arg="${k}:10">10</button>` : ''}</td></tr>`;
    }
    h += '</table>';
    if (sub === 'yellow') {
      const rare = G.Economy.rareAvailable();
      h += `<div class="box"><b>${UI.icon('i.chest')} Thương thuyền phương xa</b>`;
      if (!rare.length) h += `<p class="small muted">Thương thuyền ghé cảng mỗi 5 ngày (lần tới: ngày ${Math.ceil((S.day + 1) / 5) * 5}).</p>`;
      else {
        h += `<p class="small">Còn ở cảng tới hết ngày ${S.rare.until}.</p><div class="cards">`;
        for (const r of rare) {
          const price = Math.round(r.price * (1 - G.Economy.repMult('yellow')));
          h += `<button class="card" data-act="rare" data-arg="${r.id}" ${!can ? 'disabled' : ''}>${UI.icon(r.icon, 'thumb')}<div class="cinfo"><b>${r.name}</b><div class="costs">${UI.costHtml({ gold: price })}</div><small>${r.desc}</small></div></button>`;
        }
        h += '</div>';
      }
      h += '</div>';
    }
    if (sub === 'black') {
      h += `<div class="box"><b>${UI.icon('i.sword')} Thuê lính Hắc Thạch</b><p class="small">3 lính đánh thuê thiện chiến theo Hiệp sĩ trong 3 ngày, không cần lương hay lương thực.</p>
        <button class="btn" data-act="mercs" ${!can ? 'disabled' : ''}>Thuê (${S.flags.blackAlly ? 100 : 180} vàng)</button></div>`;
    }
    return h;
  };
  PANELS.trade.title = () => 'Giao thương';
  const qty = (arg) => { const [k, n] = arg.split(':'); return [k, n === 'all' ? G.S.stock[k] || 0 : +n]; };
  A.sell = (arg) => {
    const [k, n] = qty(arg);
    const place = UI.panelSub || 'market';
    if (!G.Economy.canTradeAt(place)) return;
    const g = G.Economy.sell(k, n, place);
    if (g) UI.toast(`Bán ${G.ITEMS[k].name}: +${g} vàng`, 'good', 1.5);
    UI.renderPanel();
  };
  A.buy = (arg) => {
    const [k, n] = qty(arg);
    const place = UI.panelSub || 'market';
    if (!G.Economy.canTradeAt(place)) return;
    const got = G.Economy.buy(k, n, place);
    if (!got) UI.toast('Không đủ vàng', 'bad', 1.5);
    UI.renderPanel();
  };
  A.rare = (id) => { G.Economy.buyRare(id); UI.renderPanel(); };
  A.mercs = () => { G.Military.hireMercs(); UI.renderPanel(); };

  function contractsHtml() {
    const S = G.S;
    let h = '<p class="small muted">Hợp đồng mới mỗi 2 ngày. Giao hàng từ kho, nhận vàng và uy tín. Quá hạn bị trừ uy tín.</p>';
    if (!S.contracts.length) h += '<p class="muted">Chưa có hợp đồng nào. Hãy gặp Kim Bảo ở Cảng Kim Sa.</p>';
    for (const c of S.contracts) {
      const f = G.FACTIONS[c.faction];
      const have = S.stock[c.item] || 0;
      h += `<div class="contract ${c.accepted ? 'acc' : ''}"><img class="portrait sm" src="${window.Assets.icon('p.portrait.' + f.portrait)}" alt="">
        <div><b>${f.name}</b> cần <b>${c.n} ${UI.itemIcon(c.item)}${G.ITEMS[c.item].name}</b> (kho ${have})<br>
        <small>Thưởng ${UI.icon('i.coin')}${c.gold} · uy tín +${c.rep} · ${c.accepted ? `hạn chót ngày ${c.deadline}` : `${c.days} ngày để giao · nhận trước ngày ${c.offerUntil}`}</small></div>
        ${c.accepted ? `<button class="btn primary small" data-act="deliver" data-arg="${c.id}" ${have < c.n ? 'disabled' : ''}>Giao hàng</button>` : `<button class="btn small" data-act="acceptC" data-arg="${c.id}">Nhận</button>`}</div>`;
    }
    return h;
  }
  A.acceptC = (id) => { const c = G.S.contracts.find((x) => x.id === +id); if (c) G.Economy.acceptContract(c); UI.renderPanel(); };
  A.deliver = (id) => { const c = G.S.contracts.find((x) => x.id === +id); if (c) G.Economy.deliverContract(c); UI.renderPanel(); };

  function routesHtml() {
    const S = G.S;
    const hasMarket = G.Economy.canTradeAt('market');
    let h = '<p class="small muted">Tuyến buôn: một Thương lái đẩy xe hàng tới thị trấn, bán hàng xuất khẩu rồi dùng tiền đó mua hàng nhập khẩu mang về. Trại giặc gần đường làm tăng nguy cơ bị cướp; tháp canh giảm nhẹ nguy cơ.</p>';
    if (!hasMarket) return h + '<p class="warn">Cần xây Chợ để mở tuyến buôn.</p>';
    for (const r of S.routes) {
      const u = G.byId(r.trader);
      h += `<div class="contract"><div><b>→ ${G.FACTIONS[r.town].town}</b>: xuất ${r.exportN} ${UI.itemIcon(r.exportItem)}${G.ITEMS[r.exportItem].name}${r.importItem ? `, nhập ${r.importN} ${UI.itemIcon(r.importItem)}${G.ITEMS[r.importItem].name}` : ''}<br>
        <small>${u ? `Thương lái: ${G.esc(u.name)}` : '<span class="warn">Chưa có thương lái — tăng nghề Thương lái</span>'} · ${r.trips} chuyến · lãi ${G.fmt(r.profit)} vàng · nguy cơ cướp ${Math.round(G.Economy.routeRisk(r.town) * 100)}%</small></div>
        <button class="btn danger small" data-act="delRoute" data-arg="${r.id}">Huỷ</button></div>`;
    }
    const towns = ['yellow', 'purple', 'black'].filter((t) => S.flags['met_' + t]);
    if (!towns.length) return h + '<p class="muted">Hãy ghé thăm ít nhất một thị trấn để mở tuyến buôn.</p>';
    const f = UI.routeForm || (UI.routeForm = { town: towns[0], ex: 'bread', exN: 10, im: '', imN: 10 });
    if (!towns.includes(f.town)) f.town = towns[0];
    const buys = Object.keys(G.FACTIONS[f.town].buy), sells = Object.keys(G.FACTIONS[f.town].sell);
    if (!buys.includes(f.ex)) f.ex = buys[0];
    h += `<div class="box"><b>Mở tuyến mới</b><div class="form">
      <label>Tới <select data-field="town">${towns.map((t) => `<option value="${t}" ${f.town === t ? 'selected' : ''}>${G.FACTIONS[t].town}</option>`).join('')}</select></label>
      <label>Xuất <select data-field="ex">${buys.map((k) => `<option value="${k}" ${f.ex === k ? 'selected' : ''}>${G.ITEMS[k].name} (${G.Economy.sellPrice(k, f.town).toFixed(1)}v)</option>`).join('')}</select></label>
      <label>Số lượng/chuyến <input type="number" min="1" max="60" value="${f.exN}" data-field="exN"></label>
      <label>Nhập về <select data-field="im"><option value="">— không —</option>${sells.map((k) => `<option value="${k}" ${f.im === k ? 'selected' : ''}>${G.ITEMS[k].name} (${G.Economy.buyPrice(k, f.town).toFixed(1)}v)</option>`).join('')}</select></label>
      <label>Số lượng nhập <input type="number" min="1" max="60" value="${f.imN}" data-field="imN"></label>
      </div><p class="small">Nguy cơ cướp hiện tại: <b>${Math.round(G.Economy.routeRisk(f.town) * 100)}%</b></p>
      <button class="btn primary" data-act="addRoute">Mở tuyến</button></div>`;
    return h;
  }
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.dataset || !el.dataset.field || !UI.routeForm) return;
    const v = el.type === 'number' ? Math.max(1, Math.min(60, +el.value || 1)) : el.value;
    UI.routeForm[el.dataset.field] = v;
    UI.renderPanel();
  });
  A.addRoute = () => { const f = UI.routeForm; G.Economy.addRoute(f.town, f.ex, f.exN, f.im, f.imN); UI.renderPanel(); };
  A.delRoute = (id) => { const r = G.S.routes.find((x) => x.id === +id); if (r) G.Economy.removeRoute(r); UI.renderPanel(); };

  // ================= KỸ THUẬT =================
  PANELS.tech = function () {
    const S = G.S;
    let h = '';
    if (S.research) {
      const t = G.TECHS[S.research.id];
      h += `<div class="box"><b>Đang nghiên cứu: ${t.name}</b>${bar(S.research.t / t.time, '#7cc4ff')}</div>`;
    }
    const branches = {};
    for (const id in G.TECHS) (branches[G.TECHS[id].branch] = branches[G.TECHS[id].branch] || []).push(id);
    for (const br in branches) {
      h += `<h4>${br}</h4><div class="cards">`;
      for (const id of branches[br]) {
        const t = G.TECHS[id];
        const done = S.techs[id];
        const lock = S.tier < t.tier ? `🔒 Bậc ${G.TIERS[t.tier].name}` : t.req && !S.techs[t.req] ? `Cần ${G.TECHS[t.req].name}` : '';
        h += `<button class="card ${done ? 'done' : ''}" data-act="research" data-arg="${id}" ${done || lock || S.research ? 'disabled' : ''}>
          ${UI.icon(done ? 'i.star' : 'i.book', 'thumb')}<div class="cinfo"><b>${t.name}${done ? ' ✓' : ''}</b><small>${t.desc}</small>
          ${done ? '' : `<div class="costs">${UI.costHtml(t.cost)} <span class="cost">${UI.icon('i.clock')}${t.time}s</span></div>`}${lock ? `<small class="lockt">${lock}</small>` : ''}</div></button>`;
      }
      h += '</div>';
    }
    return h;
  };
  A.research = (id) => G.Game.research(id);

  // ================= NHIỆM VỤ =================
  PANELS.quests = function () {
    const S = G.S;
    let h = `<h4>${G.CHAPTERS[S.quests.chapter].name}</h4>`;
    for (const q of G.Quests.active()) {
      const [cur, max] = q.progress();
      h += `<div class="box"><b>${q.name}</b><p>${q.desc}</p>${bar(cur / max, '#ffd166')}<small>${Math.min(cur, max)}/${max}</small></div>`;
    }
    const done = Object.keys(S.quests.done);
    if (done.length) h += `<details><summary>Đã hoàn thành (${done.length})</summary><ul class="small">${done.map((id) => `<li>${G.QUESTS[id].name} — ngày ${S.quests.done[id]}</li>`).join('')}</ul></details>`;
    h += '<h4>Nhật ký</h4><div class="logfull">' + UI.logs.slice().reverse().map((l) => `<div class="${l.type}"><small>N${l.day}</small> ${G.esc(l.msg)}</div>`).join('') + '</div>';
    const st = S.stats;
    h += `<h4>Thống kê</h4><div class="kv small"><span>Giặc bị hạ</span><b>${st.kills || 0}</b><span>Đêm giữ thành</span><b>${st.raidsBeaten || 0}</b><span>Nông sản</span><b>${st.harvested || 0}</b><span>Vàng kiếm được</span><b>${G.fmt(st.goldEarned || 0)}</b><span>Hợp đồng</span><b>${st.contracts || 0}</b><span>Chuyến buôn</span><b>${st.trips || 0}</b></div>`;
    return h;
  };

  // ================= MENU =================
  PANELS.menu = function () {
    const S = G.S;
    let h = '<div class="menu">';
    h += `<button class="btn primary" data-act="closePanel">▶ Tiếp tục chơi</button>`;
    h += '<h4>Lưu game</h4><div class="slots">';
    for (const s of ['1', '2', '3']) {
      const m = G.Game.slotMeta(s);
      h += `<div class="slot"><span>Ô ${s}: ${m ? `${G.esc(m.hero)} · ngày ${m.day} · ${G.TIERS[m.tier].name}` : '<i class="muted">trống</i>'}</span><button class="mini" data-act="saveSlot" data-arg="${s}">Lưu</button>${m ? `<button class="mini" data-act="loadSlot" data-arg="${s}">Tải</button>` : ''}</div>`;
    }
    const am = G.Game.slotMeta('auto');
    if (am) h += `<div class="slot"><span>Tự động: ngày ${am.day}</span><button class="mini" data-act="loadSlot" data-arg="auto">Tải</button></div>`;
    h += '</div><h4>Cài đặt</h4><div class="toggles">';
    h += `<button class="${G.Audio.sfxOn ? 'on' : ''}" data-act="toggle" data-arg="sfx">Hiệu ứng âm thanh</button>`;
    h += `<button class="${G.Audio.musicOn ? 'on' : ''}" data-act="toggle" data-arg="music">Nhạc nền</button>`;
    h += `<button class="${G.Render.showLabels ? 'on' : ''}" data-act="toggle" data-arg="labels">Tên công trình (L)</button>`;
    h += `<button class="${S.settings.autoEat ? 'on' : ''}" data-act="toggle" data-arg="autoEat">Hiệp sĩ tự ăn khi đói</button>`;
    h += '</div>';
    h += `<button class="btn" data-act="panel" data-arg="help">❔ Hướng dẫn & phím tắt</button>`;
    h += `<button class="btn" data-act="panel" data-arg="assets">🖼 Bộ ảnh Tiny Swords</button>`;
    h += `<button class="btn danger" data-act="quit">Về màn hình chính</button>`;
    h += `<p class="small muted">Độ khó: ${G.DIFFICULTY[S.difficulty].name} · Seed bản đồ: ${S.seed}</p></div>`;
    return h;
  };
  PANELS.menu.static = true;
  A.saveSlot = (s) => { G.Game.save(s); UI.renderPanel(); };
  A.loadSlot = (s) => { if (G.Game.load(s)) { UI.closePanel(); UI.toast('Đã tải game', 'good'); } };
  A.toggle = (k) => {
    if (k === 'sfx') G.Audio.setSfx(!G.Audio.sfxOn);
    if (k === 'music') G.Audio.setMusic(!G.Audio.musicOn);
    if (k === 'labels') G.Render.showLabels = !G.Render.showLabels;
    if (k === 'autoEat') G.S.settings.autoEat = !G.S.settings.autoEat;
    try { localStorage.setItem('guomlua_settings', JSON.stringify({ sfx: G.Audio.sfxOn, music: G.Audio.musicOn, labels: G.Render.showLabels })); } catch (e) { /* bỏ qua */ }
    UI.renderPanel();
  };
  A.quit = () => { G.Game.save('auto'); UI.toTitle(); };

  PANELS.help = function () { return G.Title.helpHtml(); };
  PANELS.help.static = true;
  PANELS.assets = function () { return G.Title.assetsHtml(); };
  PANELS.assets.static = true;

  // ---------- Thanh nút dưới & tốc độ ----------
  A.speed = (v) => { v = +v; if (v === 0) G.S.paused = !G.S.paused; else { G.S.paused = false; G.S.speed = v; } UI.renderHud(); };
  A.attack = () => G.Hero.attack();
  A.interact = () => G.Hero.interactNearest();
  A.skill = (i) => G.Hero.skill(+i);
  A.eat = () => G.Hero.eat(false);
  A.potion = () => G.Hero.potion();
  A.map = () => UI.toggleMap();
  A.center = () => G.Render.snapCamera();
  A.zoom = (f) => G.Input.zoomAt(+f);
})(typeof window !== 'undefined' ? window : globalThis);
