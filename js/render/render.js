/* Vẽ thế giới bằng Canvas 2D: địa hình, công trình, đơn vị, hiệu ứng, ánh sáng ngày đêm, bản đồ nhỏ. */
(function (root) {
  'use strict';
  const G = root.G;
  const T = G.TILE;

  const COL = {
    water: '#47aba9', waterDeep: '#3d9a9b', grass: '#96b950', grassDark: '#7fa443', lip: '#6c8f39',
    road: '#d8bf86', roadEdge: '#c4a970', night: '10,14,40',
  };

  const Render = {
    canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
    cam: { x: 0, y: 0, zoom: 0.9, free: false },
    shakeT: 0, shakeMag: 0, time: 0,
    tiles: {}, lightCanvas: null,
    showLabels: true,

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.lightCanvas = document.createElement('canvas');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.buildTiles();
    },

    resize() {
      // kích thước bố cục (không bị ảnh hưởng khi màn chơi được xoay ngang bằng CSS)
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = Math.max(1, this.canvas.clientWidth);
      this.h = Math.max(1, this.canvas.clientHeight);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.lightCanvas.width = Math.ceil(this.w / 2);
      this.lightCanvas.height = Math.ceil(this.h / 2);
      // mức phóng mặc định cho màn nhỏ (chỉ đặt một lần, để không ghi đè khi người chơi tự phóng to)
      const small = Math.min(this.w, this.h);
      const kind = small < 450 ? 'phone' : this.w < 900 ? 'tablet' : 'desk';
      if (kind !== this.sizeKind) {
        this.sizeKind = kind;
        this.cam.zoom = kind === 'phone' ? 0.6 : kind === 'tablet' ? 0.75 : 0.9;
      }
    },

    shake(n) { this.shakeMag = Math.max(this.shakeMag, n); this.shakeT = 0.4; },

    snapCamera() {
      const h = G.Hero && G.Hero.unit();
      if (h) { this.cam.x = h.x; this.cam.y = h.y - 30; }
      this.cam.free = false;
    },

    screenToWorld(sx, sy) {
      return { x: (sx - this.w / 2) / this.cam.zoom + this.cam.x, y: (sy - this.h / 2) / this.cam.zoom + this.cam.y };
    },
    worldToScreen(wx, wy) {
      return { x: (wx - this.cam.x) * this.cam.zoom + this.w / 2, y: (wy - this.cam.y) * this.cam.zoom + this.h / 2 };
    },

    // ---------------- Ô đất dựng sẵn ----------------
    buildTiles() {
      // 16 kiểu viền (bit: 1=Bắc, 2=Đông, 4=Nam, 8=Tây giáp nước) x 4 biến thể cỏ
      for (let v = 0; v < 4; v++) {
        for (let m = 0; m < 16; m++) {
          const c = document.createElement('canvas');
          c.width = c.height = T;
          const x = c.getContext('2d');
          const rng = G.makeRng(v * 97 + 13);
          const rad = 18;
          const n = m & 1, e = m & 2, s = m & 4, w = m & 8;
          const tl = n && w ? rad : 0, tr = n && e ? rad : 0, br = s && e ? rad : 0, bl = s && w ? rad : 0;
          // đường viền; cạnh không giáp nước bị đẩy ra ngoài để nét viền bị cắt mất
          const shape = (o) => {
            const L = -(o && !w ? 10 : 0), R = T + (o && !e ? 10 : 0), Tp = -(o && !n ? 10 : 0), B = T + (o && !s ? 10 : 0);
            x.beginPath();
            x.moveTo(L + tl, Tp); x.lineTo(R - tr, Tp); if (tr) x.arcTo(R, Tp, R, Tp + tr, tr); else x.lineTo(R, Tp);
            x.lineTo(R, B - br); if (br) x.arcTo(R, B, R - br, B, br); else x.lineTo(R, B);
            x.lineTo(L + bl, B); if (bl) x.arcTo(L, B, L, B - bl, bl); else x.lineTo(L, B);
            x.lineTo(L, Tp + tl); if (tl) x.arcTo(L, Tp, L + tl, Tp, tl); else x.lineTo(L, Tp);
            x.closePath();
          };
          shape(false);
          x.fillStyle = COL.grass;
          x.fill();
          x.save();
          x.clip();
          for (let i = 0; i < 14; i++) {
            x.fillStyle = rng() < 0.5 ? 'rgba(255,255,230,0.10)' : 'rgba(40,70,20,0.10)';
            const px = Math.floor(rng() * 30) * 2, py = Math.floor(rng() * 30) * 2;
            x.fillRect(px, py, 2 + Math.floor(rng() * 2) * 2, 2);
          }
          if (v === 3) { x.fillStyle = 'rgba(40,70,20,0.18)'; x.fillRect(22, 30, 2, 6); x.fillRect(26, 28, 2, 8); x.fillRect(30, 31, 2, 5); }
          if (m) {
            shape(true);
            x.lineWidth = 8;
            x.strokeStyle = COL.lip;
            x.stroke();
          }
          x.restore();
          this.tiles[v * 16 + m] = c;
        }
      }
    },

    // ---------------- Vẽ sprite ----------------
    sprite(key, frame, x, y, o) {
      const s = window.Assets.get(key);
      if (!s) return null;
      const ctx = this.ctx;
      const sc = (o && o.scale ? o.scale : 1) * s.scale;
      const f = ((frame | 0) % s.n + s.n) % s.n;
      const dw = s.fw * sc, dh = s.fh * sc;
      if (o && o.alpha != null) ctx.globalAlpha = o.alpha;
      if (o && (o.flip || o.rot)) {
        ctx.save();
        ctx.translate(x, y);
        if (o.rot) ctx.rotate(o.rot);
        if (o.flip) ctx.scale(-1, 1);
        ctx.drawImage(s.img, f * s.fw, 0, s.fw, s.fh, -s.ax * sc, -s.ay * sc, dw, dh);
        ctx.restore();
      } else {
        ctx.drawImage(s.img, f * s.fw, 0, s.fw, s.fh, x - s.ax * sc, y - s.ay * sc, dw, dh);
      }
      if (o && o.flash) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55;
        if (o.flip) { ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(s.img, f * s.fw, 0, s.fw, s.fh, -s.ax * sc, -s.ay * sc, dw, dh); ctx.restore(); }
        else ctx.drawImage(s.img, f * s.fw, 0, s.fw, s.fh, x - s.ax * sc, y - s.ay * sc, dw, dh);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (o && (o.alpha != null || o.flash)) ctx.globalAlpha = 1;
      return s;
    },
    frames(key) { const s = window.Assets.get(key); return s ? s.n : 1; },

    // ---------------- Khung hình ----------------
    draw(dt) {
      const ctx = this.ctx, S = G.S;
      this.time += dt;
      if (!S || !G.Game.running) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0a0f39'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); return; }
      // camera
      const hero = G.Hero.unit();
      if (hero && !this.cam.free && !hero.downed) {
        this.cam.x = G.lerp(this.cam.x, hero.x, Math.min(1, dt * 6));
        this.cam.y = G.lerp(this.cam.y, hero.y - 30, Math.min(1, dt * 6));
      }
      const W = G.World;
      const z = this.cam.zoom;
      const halfW = this.w / 2 / z, halfH = this.h / 2 / z;
      this.cam.x = G.clamp(this.cam.x, halfW - T, W.W * T - halfW + T);
      this.cam.y = G.clamp(this.cam.y, halfH - T, W.H * T - halfH + T);
      let sx = 0, sy = 0;
      if (this.shakeT > 0) { this.shakeT -= dt; sx = G.rnd(-1, 1) * this.shakeMag; sy = G.rnd(-1, 1) * this.shakeMag; if (this.shakeT <= 0) this.shakeMag = 0; }
      const dpr = this.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = COL.water;
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (this.w / 2 - (this.cam.x + sx) * z), dpr * (this.h / 2 - (this.cam.y + sy) * z));
      const view = { x0: this.cam.x - halfW - T, y0: this.cam.y - halfH - T, x1: this.cam.x + halfW + T, y1: this.cam.y + halfH + 2 * T };
      this.view = view;
      const tx0 = Math.max(0, Math.floor(view.x0 / T)), ty0 = Math.max(0, Math.floor(view.y0 / T));
      const tx1 = Math.min(W.W - 1, Math.floor(view.x1 / T)), ty1 = Math.min(W.H - 1, Math.floor(view.y1 / T) + 1);

      this.drawWater(tx0, ty0, tx1, ty1);
      this.drawGround(tx0, ty0, tx1, ty1);
      if (S.weather === 'snow') { ctx.fillStyle = 'rgba(225,238,255,0.22)'; ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0); }
      this.drawGroundObjects(view);
      this.drawSorted(view);
      this.drawProjectiles();
      this.drawFx();
      this.drawWeather(view);
      this.drawLight(view, dt);
      this.drawOverlay(view);
    },

    drawWater(tx0, ty0, tx1, ty1) {
      const ctx = this.ctx, W = G.World, t = this.time;
      // gợn sóng
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let y = ty0; y <= ty1; y += 2) {
        for (let x = tx0; x <= tx1; x += 3) {
          if (W.isLand(x, y)) continue;
          const h = G.hash2(x, y, 3);
          if (h < 0.5) continue;
          const ox = ((t * 8 + h * 64) % 64);
          ctx.fillRect(x * T + ox, y * T + 20 + h * 24, 14, 2);
        }
      }
      for (const d of W.decor) {
        if (d.type === 'waterrock' && d.x > this.view.x0 && d.x < this.view.x1 && d.y > this.view.y0 && d.y < this.view.y1) {
          this.sprite('n.waterrock' + d.v, Math.floor(t * 6 + d.x) , d.x, d.y);
        }
      }
      // bọt sóng quanh bờ
      const foam = window.Assets.get('t.foam');
      if (!foam) return;
      const fr = Math.floor(t * 8);
      for (let y = ty0; y <= ty1; y++) {
        for (let x = tx0; x <= tx1; x++) {
          if (!W.coast[y * W.W + x]) continue;
          this.sprite('t.foam', fr + ((x * 7 + y * 3) % foam.n), x * T + T / 2, y * T + T / 2);
        }
      }
    },

    drawGround(tx0, ty0, tx1, ty1) {
      const ctx = this.ctx, W = G.World;
      for (let y = ty0; y <= ty1; y++) {
        for (let x = tx0; x <= tx1; x++) {
          const i = y * W.W + x;
          if (W.ground[i] !== 1) continue;
          let m = 0;
          if (W.coast[i]) {
            if (!W.isLand(x, y - 1)) m |= 1;
            if (!W.isLand(x + 1, y)) m |= 2;
            if (!W.isLand(x, y + 1)) m |= 4;
            if (!W.isLand(x - 1, y)) m |= 8;
          }
          const v = Math.floor(G.hash2(x, y, 1) * 4);
          ctx.drawImage(this.tiles[v * 16 + m], x * T, y * T, T + 0.5, T + 0.5);
        }
      }
      // đường đất
      ctx.fillStyle = COL.road;
      for (let y = ty0; y <= ty1; y++) {
        for (let x = tx0; x <= tx1; x++) {
          if (!W.road[y * W.W + x]) continue;
          const px = x * T, py = y * T;
          ctx.fillRect(px + 8, py + 8, 48, 48);
          if (W.isRoad(x + 1, y)) ctx.fillRect(px + 56, py + 8, 16, 48);
          if (W.isRoad(x, y + 1)) ctx.fillRect(px + 8, py + 56, 48, 16);
          if (W.isRoad(x + 1, y + 1) && W.isRoad(x + 1, y) && W.isRoad(x, y + 1)) ctx.fillRect(px + 56, py + 56, 16, 16);
        }
      }
    },

    inView(x, y, m = 200) { const v = this.view; return x > v.x0 - m && x < v.x1 + m && y > v.y0 - m && y < v.y1 + m * 1.5; },

    drawGroundObjects(view) {
      const S = G.S;
      for (const b of S.buildings) {
        const def = G.BUILDINGS[b.type];
        if (!def.ground || def.road || !this.inView(b.x, b.y)) continue;
        const dim = G.UI.placing && G.UI.placing.move === b.id;
        if (dim) this.ctx.globalAlpha = 0.35;
        if (b.type === 'plot') this.drawPlot(b);
        else this.drawBuilding(b);
        if (dim) this.ctx.globalAlpha = 1;
      }
      // bóng đổ dưới đơn vị
      for (const u of S.units) {
        if (u.hidden || !this.inView(u.x, u.y, 60)) continue;
        this.sprite('p.shadow', 0, u.x, u.y + 2, { scale: (u.scale || 1) * (u.sheep ? 0.8 : 1), alpha: 0.8 });
      }
      // vòng chọn
      const sel = G.UI.selected && G.byId(G.UI.selected);
      if (sel && sel.building) {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255,214,102,0.9)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(sel.tx * T + 2, sel.ty * T + 2, sel.w * T - 4, sel.h * T - 4);
        ctx.setLineDash([]);
        const d = G.BUILDINGS[sel.type];
        if (d.radius) { ctx.beginPath(); ctx.arc(sel.x, sel.y - T / 2, d.radius * T, 0, Math.PI * 2); ctx.stroke(); }
        if (d.shoot) { ctx.strokeStyle = 'rgba(255,120,120,0.6)'; ctx.beginPath(); ctx.arc(sel.x, sel.y - sel.h * T / 2, d.shoot.range * T * (G.S.techs.longbow ? 1.2 : 1), 0, Math.PI * 2); ctx.stroke(); }
      }
      // điểm tập kết đội viễn chinh
      if (S.army.rally) {
        this.sprite('p.banner.blue', Math.floor(this.time * 6), S.army.rally.x, S.army.rally.y);
      }
      for (const d of G.World.decor) if (d.type === 'boat' && this.inView(d.x, d.y)) this.sprite('p.boat', 0, d.x, d.y + Math.sin(this.time * 1.5) * 3);
    },

    drawPlot(b) {
      this.sprite('p.plot', 0, b.x, b.y - T / 2);
      if (!b.built) { this.ctx.globalAlpha = 0.5; this.ctx.fillStyle = '#000'; this.ctx.fillRect(b.tx * T + 4, b.ty * T + 4, T - 8, T - 8); this.ctx.globalAlpha = 1; return; }
      if (b.withered) this.sprite('p.crop.withered', 0, b.x, b.y - 12);
      else if (b.stage >= 0) this.sprite(`p.crop.${b.crop}.${b.stage}`, 0, b.x, b.y - 12);
      if (b.stage === 3 && !b.withered && Math.sin(this.time * 3 + b.id) > 0.6) {
        this.ctx.fillStyle = 'rgba(255,255,220,0.8)';
        this.ctx.fillRect(b.x + 14, b.y - 44, 3, 3);
      }
    },

    drawSorted(view) {
      const S = G.S;
      const list = [];
      for (const n of S.nodes) if (this.inView(n.x, n.y)) list.push(n);
      for (const b of S.buildings) {
        const d = G.BUILDINGS[b.type];
        if (d.ground) continue;
        if (this.inView(b.x, b.y, 320)) list.push(b);
      }
      for (const u of S.units) if (!u.hidden && this.inView(u.x, u.y, 100)) list.push(u);
      for (const d of S.drops) if (this.inView(d.x, d.y)) list.push(d);
      list.sort((a, b) => this.sortY(a) - this.sortY(b));
      const movingId = G.UI.placing && G.UI.placing.move;
      for (const o of list) {
        if (o.node) this.drawNode(o);
        else if (o.building) {
          if (o.id === movingId) { this.ctx.globalAlpha = 0.35; this.drawBuilding(o); this.ctx.globalAlpha = 1; }
          else this.drawBuilding(o);
        }
        else if (o.kind) this.drawUnit(o);
        else this.drawDrop(o);
      }
    },
    sortY(o) {
      if (o.building) return (o.ty + o.h) * T - 6;
      if (o.node) return (o.ty + 1) * T - 14;
      return o.y;
    },

    drawNode(n) {
      const t = this.time;
      const shake = n.hitT > 0 ? Math.sin(t * 60) * 3 : 0;
      const bx = n.x + shake, by = (n.ty + 1) * T - 8;
      if (n.type === 'tree') {
        if (n.amount <= 0) { this.sprite('n.stump' + n.v, 0, bx, by); return; }
        this.sprite('n.tree' + n.v, Math.floor(t * 6 + n.phase * 3), bx, by);
      } else if (n.type === 'rock') this.sprite('n.rock' + n.v, 0, bx, by - 4);
      else if (n.type === 'gold') this.sprite('n.goldstone' + n.v, 0, bx, by - 6, { scale: 0.75 });
      else if (n.type === 'bush') {
        this.sprite('n.bush' + n.v, Math.floor(t * 5 + n.phase * 3), bx, by - 4, { scale: 0.8 });
        if (n.amount > 0) this.sprite('p.berries', 0, bx, by - 4, { scale: 0.8 });
      }
    },

    buildingSprite(b) {
      const d = G.BUILDINGS[b.type];
      if (b.type === 'castle' && b.ruined) return 'p.ruins';
      return b.sprite || d.sprite;
    },

    drawBuilding(b) {
      const ctx = this.ctx;
      const d = G.BUILDINGS[b.type];
      const key = this.buildingSprite(b);
      const x = b.x, y = (b.ty + b.h) * T;
      const flash = b.hitT > 0;
      if (!b.built) {
        // công trình đang xây: hiện dần từ dưới lên
        const s = window.Assets.get(key);
        if (s) {
          const sc = s.scale;
          const top = y - s.ay * sc;
          const hgt = s.fh * sc;
          const cut = top + hgt * (1 - Math.max(0.15, b.progress));
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.drawImage(s.img, 0, 0, s.fw, s.fh, x - s.ax * sc, top, s.fw * sc, hgt);
          ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.rect(x - s.ax * sc - 4, cut, s.fw * sc + 8, hgt); ctx.clip();
          ctx.drawImage(s.img, 0, 0, s.fw, s.fh, x - s.ax * sc, top, s.fw * sc, hgt);
          ctx.restore();
        }
        if (!d.drag) this.sprite('p.scaffold', 0, x, y, { scale: Math.max(0.6, b.w / 2), alpha: 0.9 });
        this.bar(x, y - (s ? s.ay * s.scale : 80) - 6, Math.min(90, b.w * 36), b.progress, '#ffd166');
        return;
      }
      if (b.type === 'mill') {
        this.sprite(key, 0, x, y, { flash });
        const run = b.running;
        b.rot = (b.rot || 0) + (run ? 0.04 : 0.006);
        this.sprite('p.mill.blades', 0, x, y - 132, { rot: b.rot });
      } else if (b.type === 'campfire') {
        this.sprite(key, 0, x, y - 8, { flash });
        this.sprite('p.campfire.anim', Math.floor(this.time * 10), x, y - 14);
      } else if (b.type === 'tower' || b.type === 'r_tower' || b.type === 'k_tower') {
        this.sprite(key, 0, x, y, { flash });
      } else this.sprite(key, 0, x, y, { flash });

      if (d.smoke && b.running && Math.random() < 0.05) G.FX.particle(x + b.w * 14, y - b.h * T * 1.6, { key: 'p.smoke', dur: 2, vy: -22, vx: 6, scale: 1 });
      if (b.fire > 0) {
        for (let i = 0; i < b.w; i++) this.sprite('fx.fire', Math.floor(this.time * 12) + i * 3, b.tx * T + (i + 0.5) * T, y - b.h * T * 0.55 + (i % 2) * 14);
      } else if (b.hp < b.maxHp * 0.4 && b.team !== 2) {
        if (Math.random() < 0.04) G.FX.particle(x + G.rnd(-20, 20), y - b.h * T * 0.8, { key: 'p.smoke', dur: 1.6, vy: -25, scale: 0.9 });
      }
      if (d.badge) {
        const by = y - (window.Assets.get(key) ? window.Assets.get(key).ay * window.Assets.get(key).scale : 160) - 18;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.strokeStyle = '#1d1f33';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(x - 22, by - 22, 44, 40, 10); ctx.fill(); ctx.stroke();
        this.sprite(d.badge, 0, x, by - 2, { scale: 1, alpha: b.starved ? 0.35 : 1 });
        if (b.running) this.bar(x, by + 22, 40, b.prog, '#5be37d');
      }
      if (b.queue && b.queue.length) {
        const q = b.queue[0];
        this.bar(x, y + 10, 70, q.t / G.UNITS[q.type].train, '#7cc4ff');
      }
      if (b.hp < b.maxHp && b.team !== 2 && !d.road) this.bar(x, y - b.h * T * 1.25, Math.min(100, b.w * 34), b.hp / b.maxHp, b.team === 1 ? '#ff6b6b' : '#5be37d');
    },

    unitKey(u) {
      if (u.sheep) {
        const a = u.moving ? 'move' : u.grazing ? 'grass' : 'idle';
        return { key: 'n.sheep.' + a, anim: a };
      }
      const color = u.hero ? 'blue' : u.color || (u.team === 1 ? 'red' : 'blue');
      let anim;
      if (u.act) anim = u.act;
      else if (u.kind === 'pawn' && (u.carry || u.cart)) {
        const it = (u.carry || u.cart).item;
        const v = it === 'wood' ? 'wood' : it === 'stone' || it === 'ore' || it === 'tools' || it === 'weapons' ? 'gold' : 'meat';
        anim = (u.moving ? 'run_' : 'idle_') + v;
      } else anim = u.moving ? 'run' : u.guardT > 0 && u.kind === 'warrior' ? 'guard' : 'idle';
      return { key: `u.${color}.${u.kind}.${anim}`, anim };
    },

    drawUnit(u) {
      const { key, anim } = this.unitKey(u);
      let frame;
      const n = this.frames(key);
      if (u.act && u.actDur) frame = Math.min(n - 1, Math.floor((u.actT / u.actDur) * n));
      else frame = Math.floor((this.time + (u.id % 7) * 0.13) * (anim.startsWith('run') || anim === 'move' ? 11 : 8));
      const scale = (u.scale || 1) * (u.hero ? 1.12 : 1);
      if (u.cart) this.sprite('p.cart', 0, u.x - u.facing * 34, u.y + 2, { flip: u.facing < 0, scale: 0.9 });
      if (u.hero) {
        this.ctx.globalAlpha = 0.5 + Math.sin(this.time * 4) * 0.2;
        this.sprite('p.selring', 0, u.x, u.y + 2, { scale: 0.9 });
        this.ctx.globalAlpha = 1;
      }
      this.sprite(key, frame, u.x, u.y, { flip: u.facing < 0, scale, flash: u.hitT > 0, alpha: u.guardT > 0 ? 0.85 : null });
      const top = u.y - 72 * scale;
      if (u.boss || (u.hp < u.maxHp && !u.npc && !u.sheep)) this.bar(u.x, top, u.boss ? 110 : 44, u.hp / u.maxHp, u.team === 1 ? '#ff6b6b' : u.team === 0 ? '#5be37d' : '#ffd166');
      if (u.rank) {
        this.ctx.fillStyle = '#ffd166';
        for (let i = 0; i < u.rank; i++) this.ctx.fillRect(u.x - 10 + i * 8, top - 10, 6, 4);
      }
      if (u.buffT > 0 && Math.random() < 0.2) G.FX.particle(u.x + G.rnd(-14, 14), u.y - 30, { color: '#9fd3ff', dur: 0.6, vy: -40, size: 3 });
      if (u.npc && (u.role !== 'townsfolk' && u.role !== 'guard')) this.npcMarker(u, top);
      if (u.sheep && u.team === 0 && u.wool >= 1) this.sprite('i.wool', 0, u.x, u.y - 52, { scale: 0.8 });
      if (u.sheep && u.follow) this.sprite('i.heart', 0, u.x, u.y - 50, { scale: 0.6 });
      if (u.boss && u.name) this.label(u.name, u.x, top - 18, '#ff8a80');
    },

    npcMarker(u, top) {
      const S = G.S;
      let mark = '';
      if (u.role === 'advisor' && !S.flags.metAdvisor) mark = '!';
      if (u.role === 'merchant' && G.Quests.isActive('q_port')) mark = '!';
      if (u.role === 'abbess' && (G.Quests.isActive('q_monastery') || (G.Quests.isActive('q_bread') && (S.stock.bread || 0) >= 15))) mark = '!';
      if (u.role === 'chief' && G.Quests.isActive('q_chief')) mark = '!';
      if (u.role === 'hostage') mark = '?';
      const ctx = this.ctx;
      if (mark) {
        const bob = Math.sin(this.time * 4) * 4;
        ctx.font = 'bold 30px "Exo 2", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 5; ctx.strokeStyle = '#1d1f33'; ctx.fillStyle = '#ffd166';
        ctx.strokeText(mark, u.x, top - 8 + bob); ctx.fillText(mark, u.x, top - 8 + bob);
      }
      if (u.name) this.label(u.name, u.x, top + 4, '#ffe9a8');
    },

    drawDrop(d) {
      if (d.chest) this.sprite('p.chest', 0, d.x, d.y);
      else this.sprite('i.coin', 0, d.x, d.y - 8 + Math.sin(this.time * 5 + d.id) * 3, { scale: 0.8 });
    },

    drawProjectiles() {
      for (const p of G.Military.projectiles) this.sprite(`u.${p.color}.archer.arrow`, 0, p.x, p.y, { rot: p.ang, scale: 0.7 });
    },

    drawFx() {
      const ctx = this.ctx;
      for (const f of G.FX.list) {
        const k = f.t / f.dur;
        if (f.particle) {
          if (f.key) this.sprite(f.key, 0, f.x, f.y, { scale: f.scale || 1, alpha: Math.max(0, 0.7 * (1 - k)) });
          else { ctx.globalAlpha = 1 - k; ctx.fillStyle = f.color || '#fff'; ctx.fillRect(f.x, f.y, f.size || 3, f.size || 3); ctx.globalAlpha = 1; }
          continue;
        }
        if (f.key === 'p.selring') { this.sprite(f.key, 0, f.x, f.y, { scale: f.scale * (1 + k), alpha: 1 - k }); continue; }
        this.sprite(f.key, Math.floor(k * this.frames(f.key)), f.x, f.y, { scale: f.scale });
      }
      ctx.textAlign = 'center';
      for (const t of G.FX.texts) {
        const a = Math.min(1, 2 * (1 - t.t / t.dur));
        ctx.globalAlpha = a;
        ctx.font = `bold ${t.size}px "Exo 2", sans-serif`;
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,20,40,0.9)';
        ctx.strokeText(t.str, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },

    drawWeather(view) {
      const ctx = this.ctx, w = G.S.weather;
      if (w !== 'rain' && w !== 'snow') return;
      const t = this.time;
      ctx.fillStyle = w === 'rain' ? 'rgba(200,220,255,0.35)' : 'rgba(255,255,255,0.8)';
      const n = 140;
      const vw = view.x1 - view.x0, vh = view.y1 - view.y0;
      for (let i = 0; i < n; i++) {
        const h1 = G.hash2(i, 1, 9), h2 = G.hash2(i, 2, 9);
        const sp = w === 'rain' ? 700 : 60;
        const x = view.x0 + ((h1 * vw + (w === 'snow' ? Math.sin(t + i) * 20 : t * 120)) % vw);
        const y = view.y0 + ((h2 * vh + t * sp) % vh);
        if (w === 'rain') ctx.fillRect(x, y, 2, 14); else ctx.fillRect(x, y, 4, 4);
      }
    },

    drawLight(view, dt) {
      const dark = G.Time.darkness();
      const S = G.S;
      let tint = 0;
      const R = S.raid;
      if (R && R.blood && dark > 0) tint = 1;
      if (dark <= 0.01) return;
      const lc = this.lightCanvas, l = lc.getContext('2d');
      const lw = lc.width, lh = lc.height;
      l.setTransform(1, 0, 0, 1, 0, 0);
      l.globalCompositeOperation = 'source-over';
      l.clearRect(0, 0, lw, lh);
      l.fillStyle = tint ? `rgba(60,5,15,${0.62 * dark})` : `rgba(${COL.night},${0.6 * dark})`;
      l.fillRect(0, 0, lw, lh);
      l.globalCompositeOperation = 'destination-out';
      const z = this.cam.zoom / 2;
      const hole = (wx, wy, r, a = 1) => {
        const sx = (wx - this.cam.x) * z + lw / 2, sy = (wy - this.cam.y) * z + lh / 2;
        const rr = r * z;
        if (sx < -rr || sy < -rr || sx > lw + rr || sy > lh + rr) return;
        const g = l.createRadialGradient(sx, sy, rr * 0.15, sx, sy, rr);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        l.fillStyle = g;
        l.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
      };
      for (const b of S.buildings) {
        const d = G.BUILDINGS[b.type];
        if (!b.built) continue;
        if (d.light && b.team === 0 && !(b.type === 'castle' && b.ruined)) hole(b.x, b.y - b.h * T / 2, d.light * T * (0.9 + Math.sin(this.time * 7 + b.id) * 0.04));
        else if (b.team !== 0 && !d.ground && (b.type.endsWith('castle') || b.type.endsWith('tower') || b.type === 'y_stall' || b.type === 'p_monastery')) hole(b.x, b.y - b.h * T / 2, 4 * T, 0.8);
        if (b.fire > 0) hole(b.x, b.y - b.h * T / 2, 4 * T);
      }
      const h = G.Hero.unit();
      if (h && !h.downed) hole(h.x, h.y - 20, 3.2 * T, 0.85);
      for (const u of S.units) if (u.soldier && u.team === 0 && this.inView(u.x, u.y)) hole(u.x, u.y - 20, 1.4 * T, 0.5);
      for (const f of G.FX.list) if (f.key === 'fx.explosion') hole(f.x, f.y, 3 * T);
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(lc, 0, 0, this.canvas.width, this.canvas.height);
      ctx.imageSmoothingEnabled = false;
      const dpr = this.dpr, zz = this.cam.zoom;
      ctx.setTransform(dpr * zz, 0, 0, dpr * zz, dpr * (this.w / 2 - this.cam.x * zz), dpr * (this.h / 2 - this.cam.y * zz));
    },

    // ---------------- Lớp phủ: nhãn, thanh máu, xây dựng, chỉ đường ----------------
    drawOverlay(view) {
      const ctx = this.ctx, S = G.S;
      if (this.showLabels && this.cam.zoom > 0.5) {
        for (const b of S.buildings) {
          const d = G.BUILDINGS[b.type];
          if (d.noLabel || d.road || !this.inView(b.x, b.y)) continue;
          if (b.team === 0 && !b.built) continue;
          let name = b.type === 'castle' && b.ruined ? 'TÀN TÍCH LÂU ĐÀI' : d.name.toUpperCase();
          if (b.type === 'castle' && !b.ruined) name = (G.TIERS[S.tier].name + ' Bình Minh').toUpperCase();
          if (d.ground && b.type !== 'pen') continue;
          this.label(name, b.x, b.y + 14, b.team === 1 ? '#ff9b9b' : b.team === 2 ? '#ffe9a8' : '#ffffff', true);
        }
        for (const k in S.camps) {
          const c = S.camps[k];
          if (c.dead) continue;
          const p = G.World.PLACES[k];
          this.label('⚔ ' + c.name.toUpperCase(), (p.tx + 0.5) * T, (p.ty - 3.6) * T, '#ff9b9b', true);
        }
      }
      // gợi ý tương tác
      const h = G.Hero.unit();
      if (h && !h.downed && !S.hero.work) {
        const it = G.Hero.findInteractable(h.x, h.y, 95);
        if (it) {
          const p = it.building ? { x: it.x, y: it.ty * T - 10 } : { x: it.x, y: it.y - (it.node ? 90 : 80) };
          this.keyHint('E', p.x, p.y);
        }
      }
      this.drawPlacement();
      this.drawQuestArrow();
    },

    keyHint(k, x, y) {
      const ctx = this.ctx;
      const bob = Math.sin(this.time * 5) * 3;
      ctx.fillStyle = 'rgba(16,23,65,0.92)';
      ctx.strokeStyle = '#7cc4ff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x - 13, y - 26 + bob, 26, 26, 6); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 16px "Exo 2", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(k, x, y - 7 + bob);
    },

    label(text, x, y, color = '#fff', box = false) {
      const ctx = this.ctx;
      ctx.font = 'bold 13px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      if (box) {
        const w = ctx.measureText(text).width + 12;
        ctx.fillStyle = 'rgba(29,31,51,0.85)';
        ctx.fillRect(x - w / 2, y - 13, w, 19);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y + 1);
      } else {
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,20,40,0.85)';
        ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
      }
    },

    bar(x, y, w, v, color) {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(20,20,40,0.85)';
      ctx.fillRect(x - w / 2 - 2, y - 2, w + 4, 9);
      ctx.fillStyle = color;
      ctx.fillRect(x - w / 2, y, w * G.clamp(v, 0, 1), 5);
    },

    drawPlacement() {
      const P = G.UI.placing;
      if (!P) return;
      const ctx = this.ctx;
      const def = G.BUILDINGS[P.type];
      const tiles = G.UI.placementTiles();
      const moving = P.move ? G.byId(P.move) : null;
      for (const t of tiles) {
        const err = G.Build.canPlace(P.type, t.x, t.y, P.move);
        ctx.fillStyle = err ? 'rgba(255,80,80,0.35)' : 'rgba(120,255,140,0.3)';
        ctx.fillRect(t.x * T, t.y * T, def.w * T, def.h * T);
        ctx.strokeStyle = err ? 'rgba(255,80,80,0.9)' : 'rgba(120,255,140,0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(t.x * T + 1, t.y * T + 1, def.w * T - 2, def.h * T - 2);
      }
      if (tiles.length === 1 && !def.road) {
        const t = tiles[0];
        const key = moving ? this.buildingSprite(moving) : def.sprite || (def.variants && def.variants[0]);
        if (P.type === 'plot') this.sprite('p.plot', 0, (t.x + 0.5) * T, (t.y + 0.5) * T, { alpha: 0.7 });
        else if (key) this.sprite(key, 0, (t.x + def.w / 2) * T, (t.y + def.h) * T, { alpha: 0.65 });
        if (def.radius) { ctx.strokeStyle = 'rgba(160,220,255,0.6)'; ctx.beginPath(); ctx.arc((t.x + 0.5) * T, (t.y + 0.5) * T, def.radius * T, 0, Math.PI * 2); ctx.stroke(); }
        if (def.shoot) { ctx.strokeStyle = 'rgba(255,140,140,0.6)'; ctx.beginPath(); ctx.arc((t.x + def.w / 2) * T, (t.y + def.h / 2) * T, def.shoot.range * T, 0, Math.PI * 2); ctx.stroke(); }
      }
      if (tiles.length > 1) {
        const c = def.cost || {};
        const parts = Object.keys(c).map((k) => `${c[k] * tiles.length} ${k === 'gold' ? 'vàng' : G.ITEMS[k].name}`);
        const last = tiles[tiles.length - 1];
        this.label(`${tiles.length} ô · ${parts.join(', ')}`, (last.x + 0.5) * T, last.y * T - 10, '#fff');
      }
    },

    drawQuestArrow() {
      const q = G.Quests.active().find((x) => x.hint);
      if (!q) return;
      const tgt = q.hint();
      if (!tgt) return;
      const wx = (tgt.x + 0.5) * T, wy = (tgt.y + 0.5) * T;
      const ctx = this.ctx;
      const v = this.view;
      const bob = Math.sin(this.time * 4) * 6;
      if (wx > v.x0 + T && wx < v.x1 - T && wy > v.y0 + T && wy < v.y1 - 2 * T) {
        ctx.fillStyle = '#ffd166'; ctx.strokeStyle = '#1d1f33'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(wx, wy - 70 + bob); ctx.lineTo(wx - 16, wy - 96 + bob); ctx.lineTo(wx + 16, wy - 96 + bob); ctx.closePath();
        ctx.stroke(); ctx.fill();
        return;
      }
      // mũi tên ở mép màn hình
      const cx = this.cam.x, cy = this.cam.y;
      const ang = Math.atan2(wy - cy, wx - cx);
      const hw = (v.x1 - v.x0) / 2 - 1.6 * T, hh = (v.y1 - v.y0) / 2 - 2 * T;
      const k = Math.min(Math.abs(hw / Math.cos(ang)), Math.abs(hh / Math.sin(ang)));
      const ax = cx + Math.cos(ang) * k, ay = cy + Math.sin(ang) * k;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.fillStyle = '#ffd166'; ctx.strokeStyle = '#1d1f33'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(26 + bob * 0.5, 0); ctx.lineTo(-10, -18); ctx.lineTo(-10, 18); ctx.closePath();
      ctx.stroke(); ctx.fill();
      ctx.restore();
      const dist = Math.round(G.dist(cx, cy, wx, wy) / T);
      this.label(`${q.name} · ${dist} ô`, ax - Math.cos(ang) * 40, ay - Math.sin(ang) * 40 + 4, '#ffd166', true);
    },

    // ---------------- Bản đồ nhỏ ----------------
    minimapBase: null,
    buildMinimap() {
      const W = G.World;
      const c = document.createElement('canvas');
      c.width = W.W * 2; c.height = W.H * 2;
      const x = c.getContext('2d');
      for (let y = 0; y < W.H; y++) for (let xx = 0; xx < W.W; xx++) {
        const i = y * W.W + xx;
        x.fillStyle = W.ground[i] ? (W.road[i] ? COL.road : COL.grass) : COL.water;
        x.fillRect(xx * 2, y * 2, 2, 2);
      }
      this.minimapBase = c;
    },
    drawMinimap(canvas) {
      const S = G.S, W = G.World;
      if (!S || !G.Game.running) return;
      if (!this.minimapBase || this.minimapDirty) { this.buildMinimap(); this.minimapDirty = false; }
      const ctx = canvas.getContext('2d');
      const sx = canvas.width / (W.W * T), sy = canvas.height / (W.H * T);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.minimapBase, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(30,70,30,0.55)';
      for (const n of S.nodes) if (n.type === 'tree' && n.amount > 0) ctx.fillRect(n.x * sx - 1, n.y * sy - 1, 2, 2);
      for (const b of S.buildings) {
        if (G.BUILDINGS[b.type].road) continue;
        ctx.fillStyle = b.team === 0 ? '#3f7ee0' : b.team === 1 ? '#d64545' : { yellow: '#e9b93a', purple: '#9b59d6', black: '#4b4d5e' }[b.faction] || '#ccc';
        ctx.fillRect(b.tx * T * sx, b.ty * T * sy, Math.max(2, b.w * T * sx), Math.max(2, b.h * T * sy));
      }
      for (const u of S.units) {
        if (u.hidden || u.sheep || u.npc) continue;
        ctx.fillStyle = u.hero ? '#ffffff' : u.team === 0 ? '#9fd3ff' : '#ff4d4d';
        const s = u.hero ? 4 : 2;
        ctx.fillRect(u.x * sx - s / 2, u.y * sy - s / 2, s, s);
      }
      const q = G.Quests.active().find((x) => x.hint);
      const tgt = q && q.hint();
      if (tgt && Math.sin(this.time * 6) > -0.3) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.strokeRect((tgt.x - 1) * T * sx, (tgt.y - 1) * T * sy, 3 * T * sx, 3 * T * sy); }
      const v = this.view;
      if (v) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.strokeRect(v.x0 * sx, v.y0 * sy, (v.x1 - v.x0) * sx, (v.y1 - v.y0) * sy); }
    },
  };
  G.Render = Render;
})(typeof window !== 'undefined' ? window : globalThis);
