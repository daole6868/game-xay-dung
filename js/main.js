/* Khởi động game và vòng lặp khung hình. */
(function () {
  'use strict';
  const G = window.G;
  const $ = (s) => document.querySelector(s);

  async function boot() {
    try {
      const s = JSON.parse(localStorage.getItem('guomlua_settings') || '{}');
      if (s.sfx === false) G.Audio.sfxOn = false;
      if (s.music === false) G.Audio.musicOn = false;
      if (s.labels === false) G.Render.showLabels = false;
    } catch (e) { /* bỏ qua */ }
    G.Render.init($('#view'));
    G.Input.init($('#view'));
    G.UI.init();
    const st = $('#asset-status');
    st.textContent = 'Đang tải đồ hoạ...';
    await window.Assets.init((p) => { st.textContent = `Đang tải đồ hoạ Tiny Swords... ${Math.round(p * 100)}%`; });
    G.Title.init();
    document.body.classList.toggle('touch', 'ontouchstart' in window || navigator.maxTouchPoints > 0);
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      try {
        G.Game.update(dt);
        G.Render.draw(dt);
        G.UI.update(dt);
      } catch (e) {
        console.error(e);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    window.addEventListener('beforeunload', () => { if (G.Game.running && !G.Game.over) G.Game.save('auto'); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.Game.running && !G.Game.over) G.Game.save('auto'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
