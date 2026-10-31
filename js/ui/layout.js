/*
 * Bố cục theo thiết bị. Trên điện thoại, game luôn ở màn ngang: nếu máy đang cầm dọc,
 * cả màn chơi được xoay 90° bằng CSS (người chơi xoay ngang điện thoại để chơi).
 *   body.touch   : thiết bị cảm ứng
 *   body.phone   : màn hình nhỏ (cạnh ngắn < 560px) → giao diện gọn
 *   body.rotated : đang xoay giả lập màn ngang
 * Biến CSS --lw / --lh là kích thước "logic" của màn chơi (sau khi xoay).
 */
(function (root) {
  'use strict';
  const G = root.G;

  const Layout = {
    rotated: false,
    touch: false,
    lw: 0, lh: 0,

    init() {
      this.touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const upd = () => this.update();
      window.addEventListener('resize', upd);
      window.addEventListener('orientationchange', () => setTimeout(upd, 120));
      if (window.visualViewport) window.visualViewport.addEventListener('resize', upd);
      this.update();
    },

    update() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const rotate = this.touch && vh > vw;
      const lw = rotate ? vh : vw, lh = rotate ? vw : vh;
      if (rotate === this.rotated && lw === this.lw && lh === this.lh && document.body.classList.contains('touch') === this.touch) return;
      this.rotated = rotate; this.lw = lw; this.lh = lh;
      const b = document.body;
      b.classList.toggle('touch', this.touch);
      b.classList.toggle('rotated', rotate);
      b.classList.toggle('phone', this.touch && Math.min(lw, lh) < 560);
      document.documentElement.style.setProperty('--lw', lw + 'px');
      document.documentElement.style.setProperty('--lh', lh + 'px');
      for (const el of document.querySelectorAll('#title, #game')) {
        const s = el.style;
        if (rotate) {
          s.width = lw + 'px'; s.height = lh + 'px';
          s.top = '0'; s.left = '0'; s.right = 'auto'; s.bottom = 'auto';
          s.transformOrigin = '0 0';
          s.transform = `translateX(${vw}px) rotate(90deg)`;
        } else {
          s.width = s.height = s.top = s.left = s.right = s.bottom = s.transformOrigin = s.transform = '';
        }
      }
      if (G.Render && G.Render.canvas) G.Render.resize();
    },

    /** Đổi toạ độ màn hình (clientX/Y) sang toạ độ trong màn chơi đã xoay. */
    toLocal(cx, cy) {
      if (this.rotated) return { x: cy, y: window.innerWidth - cx };
      return { x: cx, y: cy };
    },

    /** Thử bật toàn màn hình + khoá màn ngang (chỉ một số trình duyệt cho phép). */
    tryLandscape() {
      if (!this.touch) return;
      try {
        const el = document.documentElement;
        const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : null;
        if (p && p.then) {
          p.then(() => (screen.orientation && screen.orientation.lock ? screen.orientation.lock('landscape') : null))
            .catch(() => { /* trình duyệt không cho: đã có xoay giả lập */ });
        }
      } catch (e) { /* bỏ qua */ }
    },
  };
  G.Layout = Layout;
})(typeof window !== 'undefined' ? window : globalThis);
