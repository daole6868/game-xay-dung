/* Bàn phím, chuột, cảm ứng. */
(function (root) {
  'use strict';
  const G = root.G;

  const Input = {
    keys: new Set(),
    mouse: { x: 0, y: 0, wx: 0, wy: 0, inside: false, down: false },
    joy: null,
    touchMode: false,
    down(code) { return this.keys.has(code); },

    /** Toạ độ trong màn chơi (đã tính cả khi màn bị xoay ngang trên điện thoại). */
    local(cx, cy, canvas) {
      if (G.Layout && G.Layout.rotated) return G.Layout.toLocal(cx, cy);
      const r = canvas.getBoundingClientRect();
      return { x: cx - r.left, y: cy - r.top };
    },

    setMouse(p) {
      this.mouse.x = p.x; this.mouse.y = p.y;
      const w = G.Render.screenToWorld(p.x, p.y);
      this.mouse.wx = w.x; this.mouse.wy = w.y;
    },

    init(canvas) {
      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
        if (!e.repeat) G.UI.onKey(e);
        this.keys.add(e.code);
      });
      window.addEventListener('keyup', (e) => this.keys.delete(e.code));
      window.addEventListener('blur', () => this.keys.clear());

      const pos = (e) => this.setMouse(this.local(e.clientX, e.clientY, canvas));
      let pan = null;
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('mousedown', (e) => {
        pos(e);
        this.touchMode = false;
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
      // 1 ngón: chạm = đi/tương tác, kéo = kéo bản đồ (hoặc vẽ vùng khi đặt ruộng/đường/rào)
      // 2 ngón: phóng to/thu nhỏ và kéo bản đồ
      const touches = {};
      let g = null;
      const cam = G.Render.cam;
      const mid = () => {
        const ps = Object.values(touches);
        return { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2, d: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) };
      };
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        G.Audio.unlock();
        this.touchMode = true;
        for (const t of e.changedTouches) touches[t.identifier] = this.local(t.clientX, t.clientY, canvas);
        const n = Object.keys(touches).length;
        if (n === 1) {
          const p = touches[e.changedTouches[0].identifier];
          this.setMouse(p);
          g = { type: 'one', sx: p.x, sy: p.y, cx: cam.x, cy: cam.y, moved: false, drawing: false };
          if (G.UI.placing && G.UI.dragMode()) { g.drawing = true; G.UI.touchDragStart(this.mouse.wx, this.mouse.wy); }
        } else if (n === 2) {
          if (g && g.drawing) G.UI.touchDragCancel();
          const m = mid();
          g = { type: 'pinch', d: Math.max(20, m.d), zoom: cam.zoom, mx: m.x, my: m.y, cx: cam.x, cy: cam.y };
        }
      }, { passive: false });
      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) if (touches[t.identifier]) touches[t.identifier] = this.local(t.clientX, t.clientY, canvas);
        if (!g) return;
        if (g.type === 'pinch' && Object.keys(touches).length >= 2) {
          const m = mid();
          cam.zoom = G.clamp(g.zoom * m.d / g.d, 0.35, 1.6);
          cam.free = true;
          cam.x = g.cx - (m.x - g.mx) / cam.zoom;
          cam.y = g.cy - (m.y - g.my) / cam.zoom;
        } else if (g.type === 'one') {
          const p = touches[e.changedTouches[0].identifier];
          if (!p) return;
          this.setMouse(p);
          const dx = p.x - g.sx, dy = p.y - g.sy;
          if (Math.abs(dx) + Math.abs(dy) > 12) g.moved = true;
          if (g.drawing) G.UI.touchDragMove(this.mouse.wx, this.mouse.wy);
          else if (g.moved) {
            cam.free = true;
            cam.x = g.cx - dx / cam.zoom;
            cam.y = g.cy - dy / cam.zoom;
          }
        }
      }, { passive: false });
      const end = (e) => {
        e.preventDefault();
        let last = null;
        for (const t of e.changedTouches) { last = this.local(t.clientX, t.clientY, canvas); delete touches[t.identifier]; }
        const left = Object.keys(touches).length;
        if (!g) return;
        if (g.type === 'pinch') { if (left === 0) g = null; return; }
        if (left > 0) return;
        if (last) this.setMouse(last);
        const wx = this.mouse.wx, wy = this.mouse.wy;
        if (g.drawing) G.UI.touchDragEnd(wx, wy);
        else if (!g.moved) {
          if (G.UI.placing) G.UI.touchPlaceAt(wx, wy);
          else { G.UI.pointerDown(wx, wy); G.UI.pointerUp(wx, wy); }
        }
        g = null;
      };
      canvas.addEventListener('touchend', end, { passive: false });
      canvas.addEventListener('touchcancel', end, { passive: false });
    },

    zoomAt(f) {
      G.Render.cam.zoom = G.clamp(G.Render.cam.zoom * f, 0.35, 1.6);
    },

    /** Cần điều khiển ảo cho màn hình cảm ứng. */
    initJoystick(el) {
      const knob = el.querySelector('.knob');
      let id = null, cx = 0, cy = 0;
      const R = 42;
      const loc = (x, y) => (G.Layout && G.Layout.rotated ? G.Layout.toLocal(x, y) : { x, y });
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        G.Audio.unlock();
        const t = e.changedTouches[0];
        id = t.identifier;
        const r = el.getBoundingClientRect();
        const c = loc(r.left + r.width / 2, r.top + r.height / 2);
        cx = c.x; cy = c.y;
        move(t);
      }, { passive: false });
      const move = (t) => {
        const p = loc(t.clientX, t.clientY);
        let dx = p.x - cx, dy = p.y - cy;
        const d = Math.hypot(dx, dy);
        if (d > R) { dx = dx / d * R; dy = dy / d * R; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.joy = { x: dx / R, y: dy / R };
        G.Render.cam.free = false;
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
