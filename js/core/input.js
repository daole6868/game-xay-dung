/* Bàn phím, chuột, cảm ứng. */
(function (root) {
  'use strict';
  const G = root.G;

  const Input = {
    keys: new Set(),
    mouse: { x: 0, y: 0, wx: 0, wy: 0, inside: false, down: false },
    joy: null,
    down(code) { return this.keys.has(code); },

    init(canvas) {
      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
        if (!e.repeat) G.UI.onKey(e);
        this.keys.add(e.code);
      });
      window.addEventListener('keyup', (e) => this.keys.delete(e.code));
      window.addEventListener('blur', () => this.keys.clear());

      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top;
        const w = G.Render.screenToWorld(this.mouse.x, this.mouse.y);
        this.mouse.wx = w.x; this.mouse.wy = w.y;
      };
      let pan = null;
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('mousedown', (e) => {
        pos(e);
        G.Audio.unlock();
        if (e.button === 2 || e.button === 1) {
          pan = { x: e.clientX, y: e.clientY, cx: G.Render.cam.x, cy: G.Render.cam.y, moved: false };
          return;
        }
        this.mouse.down = true;
        G.UI.pointerDown(this.mouse.wx, this.mouse.wy);
      });
      window.addEventListener('mousemove', (e) => {
        pos(e);
        if (pan) {
          const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
          if (Math.abs(dx) + Math.abs(dy) > 6) pan.moved = true;
          if (pan.moved) {
            G.Render.cam.free = true;
            G.Render.cam.x = pan.cx - dx / G.Render.cam.zoom;
            G.Render.cam.y = pan.cy - dy / G.Render.cam.zoom;
          }
        }
      });
      window.addEventListener('mouseup', (e) => {
        if (pan && (e.button === 2 || e.button === 1)) {
          if (!pan.moved && e.button === 2) G.UI.cancel();
          pan = null;
          return;
        }
        if (this.mouse.down) { this.mouse.down = false; pos(e); G.UI.pointerUp(this.mouse.wx, this.mouse.wy); }
      });
      canvas.addEventListener('mouseenter', () => { this.mouse.inside = true; });
      canvas.addEventListener('mouseleave', () => { this.mouse.inside = false; });
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1);
      }, { passive: false });

      // ---------- Cảm ứng ----------
      let touches = {}, pinch = null, tap = null;
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        G.Audio.unlock();
        for (const t of e.changedTouches) touches[t.identifier] = { x: t.clientX, y: t.clientY };
        const ids = Object.keys(touches);
        if (ids.length === 1) {
          const t = e.changedTouches[0];
          tap = { x: t.clientX, y: t.clientY, time: performance.now(), moved: false, cx: G.Render.cam.x, cy: G.Render.cam.y };
          pos(t);
          if (G.UI.placing) G.UI.pointerDown(this.mouse.wx, this.mouse.wy);
        } else if (ids.length === 2) {
          const [a, b] = ids.map((i) => touches[i]);
          pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: G.Render.cam.zoom };
          tap = null;
        }
      }, { passive: false });
      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) if (touches[t.identifier]) touches[t.identifier] = { x: t.clientX, y: t.clientY };
        const ids = Object.keys(touches);
        if (pinch && ids.length >= 2) {
          const [a, b] = ids.map((i) => touches[i]);
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          G.Render.cam.zoom = G.clamp(pinch.zoom * d / pinch.d, 0.4, 1.6);
        } else if (tap && ids.length === 1) {
          const t = e.changedTouches[0];
          pos(t);
          const dx = t.clientX - tap.x, dy = t.clientY - tap.y;
          if (Math.abs(dx) + Math.abs(dy) > 12) tap.moved = true;
          if (tap.moved && !G.UI.placing) {
            G.Render.cam.free = true;
            G.Render.cam.x = tap.cx - dx / G.Render.cam.zoom;
            G.Render.cam.y = tap.cy - dy / G.Render.cam.zoom;
          }
        }
      }, { passive: false });
      const end = (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) delete touches[t.identifier];
        if (Object.keys(touches).length < 2) pinch = null;
        if (tap && Object.keys(touches).length === 0) {
          const t = e.changedTouches[0];
          pos(t);
          if (G.UI.placing) G.UI.pointerUp(this.mouse.wx, this.mouse.wy);
          else if (!tap.moved) { G.UI.pointerDown(this.mouse.wx, this.mouse.wy); G.UI.pointerUp(this.mouse.wx, this.mouse.wy); }
          tap = null;
        }
      };
      canvas.addEventListener('touchend', end, { passive: false });
      canvas.addEventListener('touchcancel', end, { passive: false });
    },

    zoomAt(f) {
      G.Render.cam.zoom = G.clamp(G.Render.cam.zoom * f, 0.4, 1.6);
    },

    /** Cần điều khiển ảo cho màn hình cảm ứng. */
    initJoystick(el) {
      const knob = el.querySelector('.knob');
      let id = null, cx = 0, cy = 0;
      const R = 46;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        id = t.identifier;
        const r = el.getBoundingClientRect();
        cx = r.left + r.width / 2; cy = r.top + r.height / 2;
        move(t);
      }, { passive: false });
      const move = (t) => {
        let dx = t.clientX - cx, dy = t.clientY - cy;
        const d = Math.hypot(dx, dy);
        if (d > R) { dx = dx / d * R; dy = dy / d * R; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.joy = { x: dx / R, y: dy / R };
      };
      el.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) if (t.identifier === id) move(t);
      }, { passive: false });
      const stop = (e) => {
        for (const t of e.changedTouches) if (t.identifier === id) { id = null; this.joy = null; knob.style.transform = ''; }
      };
      el.addEventListener('touchend', stop);
      el.addEventListener('touchcancel', stop);
    },
  };
  G.Input = Input;
})(typeof window !== 'undefined' ? window : globalThis);
