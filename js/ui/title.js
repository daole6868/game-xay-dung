/* Màn hình chính: chơi mới, tiếp tục, tải game, nạp bộ ảnh Tiny Swords, hướng dẫn. */
(function (root) {
  'use strict';
  const G = root.G;
  const $ = (s) => document.querySelector(s);
  const A = () => G.UI.actions;

  const Title = {
    view: 'main',

    render() {
      const el = $('#title-body');
      if (this.view === 'new') el.innerHTML = this.newHtml();
      else if (this.view === 'load') el.innerHTML = this.loadHtml();
      else if (this.view === 'assets') el.innerHTML = this.assetsHtml(true);
      else if (this.view === 'help') el.innerHTML = this.helpHtml() + '<button class="btn" data-act="tview" data-arg="main">◂ Quay lại</button>';
      else el.innerHTML = this.mainHtml();
      $('#asset-status').innerHTML = this.assetStatus();
    },

    assetStatus() {
      const a = window.Assets;
      if (a.source === 'fallback') return 'Đồ hoạ: bản vẽ dự phòng · <a href="#" data-act="tview" data-arg="assets">Nạp Tiny Swords</a>';
      return `Đồ hoạ: <b>Tiny Swords</b> — Pixel Frog (${a.ts.size}/${a.totalKeys} sprite${a.source === 'static' ? ', từ thư mục assets/' : ''})`;
    },

    mainHtml() {
      const auto = G.Game.slotMeta('auto');
      return `<div class="tmenu">
        ${auto ? `<button class="btn primary big" data-act="continue">▶ Tiếp tục <small>${G.esc(auto.hero)} · ngày ${auto.day} · ${G.TIERS[auto.tier].name}</small></button>` : ''}
        <button class="btn ${auto ? '' : 'primary'} big" data-act="tview" data-arg="new">⚔ Chơi mới</button>
        <button class="btn big" data-act="tview" data-arg="load">📜 Tải game</button>
        <button class="btn big" data-act="tview" data-arg="assets">🖼 Bộ ảnh Tiny Swords</button>
        <button class="btn big" data-act="tview" data-arg="help">❔ Hướng dẫn</button>
      </div>
      <div class="pitch">
        <div>${G.UI.icon('i.wheat')}<b>Nông trại</b><span>Gieo lúa, cà rốt, bí ngô theo mùa. Chăn cừu, xay bột, nướng bánh.</span></div>
        <div>${G.UI.icon('i.fire')}<b>Sinh tồn</b><span>Đói, rét mùa đông, lòng dân, hoả hoạn, dịch bệnh, đêm Trăng Máu.</span></div>
        <div>${G.UI.icon('i.castle')}<b>Xây dựng</b><span>23 loại công trình, 4 bậc vương quốc, 12 kỹ thuật.</span></div>
        <div>${G.UI.icon('i.sword')}<b>Quân sự</b><span>4 binh chủng khắc chế nhau, tháp canh, phá trại giặc, đánh boss.</span></div>
        <div>${G.UI.icon('i.trade')}<b>Giao thương</b><span>Giá động theo cung cầu & mùa, 4 khu chợ, hợp đồng, tuyến buôn, thương thuyền.</span></div>
      </div>`;
    },

    newHtml() {
      return `<div class="form newgame">
        <h3>Ván mới</h3>
        <label>Tên Hiệp sĩ <input id="ng-name" maxlength="18" value="Lam Phong"></label>
        <label>Độ khó</label>
        <div class="seg" id="ng-diff">${Object.keys(G.DIFFICULTY).map((k) => `<button class="${k === 'normal' ? 'on' : ''}" data-act="ngDiff" data-arg="${k}">${G.DIFFICULTY[k].name}<small>${k === 'easy' ? 'Giặc yếu, nhiều tài nguyên' : k === 'hard' ? 'Giặc đông & mạnh' : 'Cân bằng'}</small></button>`).join('')}</div>
        <label>Seed bản đồ (để trống = ngẫu nhiên) <input id="ng-seed" inputmode="numeric" placeholder="ví dụ 2026"></label>
        <div class="row"><button class="btn" data-act="tview" data-arg="main">◂ Quay lại</button><button class="btn primary" data-act="startGame">Bắt đầu ▸</button></div>
      </div>`;
    },

    loadHtml() {
      let h = '<div class="form"><h3>Tải game</h3>';
      for (const s of ['auto', '1', '2', '3']) {
        const m = G.Game.slotMeta(s);
        h += `<div class="slot"><span>${s === 'auto' ? 'Tự động' : 'Ô ' + s}: ${m ? `${G.esc(m.hero)} · ngày ${m.day} · ${G.TIERS[m.tier].name} · ${G.CHAPTERS[m.ch || 1].name}` : '<i class="muted">trống</i>'}</span>${m ? `<button class="mini" data-act="tLoad" data-arg="${s}">Tải</button>` : ''}</div>`;
      }
      return h + '<button class="btn" data-act="tview" data-arg="main">◂ Quay lại</button></div>';
    },

    assetsHtml(inTitle) {
      const a = window.Assets;
      const rep = a.report();
      const ok = rep.filter((r) => r.ok);
      const groups = {};
      for (const r of rep) {
        const g = r.key.startsWith('u.') ? 'Nhân vật' : r.key.startsWith('b.') ? 'Công trình' : r.key.startsWith('n.') || r.key.startsWith('r.') ? 'Thiên nhiên' : 'Hiệu ứng & địa hình';
        (groups[g] = groups[g] || { ok: 0, all: 0 }).all++;
        if (r.ok) groups[g].ok++;
      }
      return `<div class="form assets">
        ${inTitle ? '<h3>Bộ ảnh Tiny Swords</h3>' : ''}
        <p>Game được thiết kế cho bộ <b>Tiny Swords</b> của Pixel Frog. Tải bản miễn phí tại
          <a href="https://pixelfrog-assets.itch.io/tiny-swords" target="_blank" rel="noopener">pixelfrog-assets.itch.io/tiny-swords</a>, rồi chọn <b>file .zip vừa tải</b> (hoặc thư mục đã giải nén) ở đây.
          Ảnh chỉ lưu trong trình duyệt của bạn. Chưa nạp thì game dùng đồ hoạ vẽ sẵn, vẫn chơi đầy đủ.</p>
        <div class="row">
          <label class="btn primary">Chọn file .zip<input type="file" accept=".zip" id="pick-zip" hidden></label>
          <label class="btn">Chọn thư mục<input type="file" id="pick-dir" webkitdirectory multiple hidden></label>
          ${a.source === 'imported' ? '<button class="btn danger" data-act="clearAssets">Xoá bộ ảnh đã nạp</button>' : ''}
        </div>
        <div id="import-progress" class="small"></div>
        <p>Trạng thái: <b>${a.source === 'fallback' ? 'Đang dùng đồ hoạ dự phòng' : `Đã có ${ok.length}/${rep.length} sprite Tiny Swords`}</b></p>
        <ul class="small">${Object.keys(groups).map((g) => `<li>${g}: ${groups[g].ok}/${groups[g].all}</li>`).join('')}</ul>
        ${ok.length ? `<details><summary>Chi tiết các file đã khớp</summary><div class="logfull small">${ok.map((r) => `<div><b>${r.key}</b> ← ${G.esc(r.path || '')} (${r.n} khung ${r.fw}×${r.fh})</div>`).join('')}</div></details>` : ''}
        <p class="small muted">Muốn đặt game lên web cho mọi người cùng thấy ảnh Tiny Swords: chạy <code>node tools/scan-assets.mjs "Tiny Swords (Free Pack).zip"</code> (xem README). Lưu ý giấy phép Tiny Swords: được dùng trong game, không được phát tán lại bộ ảnh gốc.</p>
        ${inTitle ? '<button class="btn" data-act="tview" data-arg="main">◂ Quay lại</button>' : ''}
      </div>`;
    },

    helpHtml() {
      return `<div class="help">
        <h4>Mục tiêu</h4>
        <p>Dựng lại vương quốc Lam từ một trại tị nạn: nuôi dân, giữ làng qua những đêm bị cướp, buôn bán với các thế lực, luyện quân, phá các trại Huyết Nha và đánh bại Bạo chúa Xích Hoả. Mất Lâu đài là thua.</p>
        <h4>Điều khiển</h4>
        <table class="keys">
          <tr><td>WASD / mũi tên</td><td>Di chuyển Hiệp sĩ</td></tr>
          <tr><td>Chuột trái</td><td>Đi tới / đánh / tương tác / chọn công trình</td></tr>
          <tr><td>Chuột phải kéo</td><td>Kéo bản đồ · Chuột phải: huỷ</td></tr>
          <tr><td>Lăn chuột, + / −</td><td>Phóng to / thu nhỏ</td></tr>
          <tr><td>Space</td><td>Chém</td></tr>
          <tr><td>E</td><td>Tương tác gần nhất (chặt cây, đào đá, nói chuyện, xây, gặt, dắt cừu, dập lửa)</td></tr>
          <tr><td>1 · 2 · 3</td><td>Kỹ năng: Chém xoáy · Hiệu triệu · Khiên thép</td></tr>
          <tr><td>F · H</td><td>Ăn · Uống thuốc hồi phục</td></tr>
          <tr><td>B · V · R · T · K · J · M</td><td>Xây dựng · Dân làng · Quân đội · Giao thương · Kỹ thuật · Nhiệm vụ · Bản đồ</td></tr>
          <tr><td>P · C · L · Esc</td><td>Tạm dừng · Về Hiệp sĩ · Bật/tắt tên · Menu</td></tr>
        </table>
        <p class="small muted">Điện thoại (luôn màn ngang): cần điều khiển ảo bên trái; Chém, E, kỹ năng, Bản đồ bên phải; chạm để đi/tương tác; một ngón kéo bản đồ, hai ngón phóng to. Khi xây: chạm chọn chỗ (ruộng/đường/rào: kéo chọn vùng) rồi bấm ✓ Đặt hoặc ✕ Huỷ.</p>
        <h4>Vòng chơi</h4>
        <ul>
          <li><b>Ban ngày</b> dân làm việc theo nghề bạn giao (bảng Dân làng). <b>Ban đêm</b> dân về nhà, giặc có thể kéo tới — thám báo báo trước lúc 18:00.</li>
          <li><b>Mỗi sáng</b>: dân ăn (2 điểm no/người), thu thuế, trả lương lính, dân mới tới nếu còn chỗ ở và đủ ăn. Có thể xảy ra sự kiện ngẫu nhiên.</li>
          <li><b>Mùa</b>: mỗi mùa 5 ngày. Mùa đông ruộng không lớn, dân cần gỗ sưởi, giá lương thực tăng. Mỗi 8 đêm có <b>Trăng Máu</b>.</li>
          <li><b>Lòng dân</b> tăng khi ăn đa dạng, thuế nhẹ, có công trình đẹp, thắng trận; giảm khi đói, rét, mất người.</li>
          <li><b>Giao thương</b>: giá thay đổi theo mùa và lượng bạn mua bán. Mỗi thế lực thèm những món khác nhau — mua rẻ chỗ này, bán đắt chỗ kia.</li>
        </ul>
      </div>`;
    },

    async handleImport(files) {
      const prog = $('#import-progress');
      if (prog) prog.textContent = 'Đang đọc file...';
      try {
        const r = await window.Assets.importFiles(files, (p) => { if (prog) prog.textContent = `Đang nạp ảnh... ${Math.round(p * 100)}%`; });
        G.UI.thumbs = {};
        G.Render.buildTiles();
        G.UI.toast(`Đã nạp ${r.matched}/${r.total} sprite Tiny Swords!`, 'good', 4);
      } catch (e) {
        G.UI.toast(e.message, 'bad', 6);
        if (prog) prog.textContent = e.message;
        return;
      }
      if (G.Game.running && G.UI.panel === 'assets') G.UI.renderPanel(); else this.render();
    },

    init() {
      const a = A();
      a.tview = (v) => { this.view = v; this.render(); };
      a.ngDiff = (k, el) => { this.diff = k; for (const b of el.parentNode.children) b.classList.toggle('on', b === el); };
      a.startGame = () => {
        const name = ($('#ng-name').value || 'Lam Phong').trim().slice(0, 18);
        const seedRaw = $('#ng-seed').value.trim();
        const seed = seedRaw ? (parseInt(seedRaw, 10) || [...seedRaw].reduce((s, c) => (s * 31 + c.charCodeAt(0)) | 0, 7)) : undefined;
        this.start(() => G.Game.newGame({ heroName: name, difficulty: this.diff || 'normal', seed }), true);
      };
      a.continue = () => this.start(() => G.Game.load('auto'));
      a.tLoad = (s) => this.start(() => G.Game.load(s));
      a.clearAssets = async () => { await window.Assets.clearImported(); G.UI.thumbs = {}; G.UI.toast('Đã xoá bộ ảnh đã nạp', 'info'); if (G.Game.running) G.UI.renderPanel(); else this.render(); };
      document.addEventListener('change', (e) => {
        if (e.target.id === 'pick-zip' || e.target.id === 'pick-dir') this.handleImport(e.target.files);
      });
      this.render();
    },

    start(fn, intro) {
      G.Audio.unlock();
      G.Layout.tryLandscape();
      $('#title').classList.add('hidden');
      $('#game').classList.remove('hidden');
      G.Render.resize();
      G.Render.minimapBase = null;
      G.UI.logs = [];
      fn();
      if (intro) this.intro();
      G.UI.refresh();
    },

    intro() {
      G.UI.modalQueue.unshift({
        render(box) {
          box.innerHTML = `<div class="intro"><div class="intro-kicker">BIÊN NIÊN SỬ LAM QUỐC</div><h2>Đêm Tàn Tro</h2>${G.INTRO.map((p) => `<p>${G.esc(p)}</p>`).join('')}<button class="btn primary" data-act="introGo">Bắt đầu hành trình ▸</button></div>`;
          G.UI.actions.introGo = () => G.UI.closeModal();
        },
      });
      if (!G.UI.modal) G.UI.nextModal();
    },
  };
  G.Title = Title;
})(typeof window !== 'undefined' ? window : globalThis);
