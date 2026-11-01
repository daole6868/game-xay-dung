/* Bản đồ: sinh đảo, địa danh, tài nguyên, trại giặc, thị trấn trung lập. */
(function (root) {
  'use strict';
  const G = root.G;
  const T = G.TILE;

  // Công trình không xây được: thị trấn trung lập và trại Huyết Nha
  Object.assign(G.BUILDINGS, {
    y_house1: { name: 'Nhà buôn', w: 2, h: 2, hp: 500, sprite: 'b.yellow.house1', npc: true },
    y_house2: { name: 'Kho hàng', w: 2, h: 2, hp: 500, sprite: 'b.yellow.house2', npc: true },
    y_house3: { name: 'Quán trọ', w: 2, h: 2, hp: 500, sprite: 'b.yellow.house3', npc: true },
    y_stall: { name: 'Chợ Kim Sa', w: 3, h: 2, hp: 500, sprite: 'p.stall', npc: true },
    y_dock: { name: 'Bến cảng', w: 2, h: 2, hp: 500, sprite: 'p.dock', npc: true },
    p_monastery: { name: 'Tử Nguyệt Tự', w: 3, h: 2, hp: 500, sprite: 'b.purple.monastery', npc: true },
    p_house1: { name: 'Tăng xá', w: 2, h: 2, hp: 500, sprite: 'b.purple.house1', npc: true },
    p_house3: { name: 'Dược phòng', w: 2, h: 2, hp: 500, sprite: 'b.purple.house3', npc: true },
    k_castle: { name: 'Hắc Thạch Trại', w: 5, h: 3, hp: 500, sprite: 'b.black.castle', npc: true },
    k_tower: { name: 'Tháp đá đen', w: 2, h: 2, hp: 500, sprite: 'b.black.tower', npc: true },
    k_barracks: { name: 'Lò luyện binh', w: 3, h: 2, hp: 500, sprite: 'b.black.barracks', npc: true },
    r_tent: { name: 'Lều cướp', w: 2, h: 2, hp: 240, sprite: 'p.tent.red', enemy: true, noLabel: true },
    r_house: { name: 'Hang ổ', w: 2, h: 2, hp: 450, sprite: 'b.red.house1', enemy: true },
    r_house2: { name: 'Kho cướp', w: 2, h: 2, hp: 450, sprite: 'b.red.house2', enemy: true },
    r_tower: { name: 'Tháp Huyết Nha', w: 2, h: 2, hp: 750, sprite: 'b.red.tower', enemy: true, shoot: { range: 6.5, dmg: 11, cd: 1.4 } },
    r_barracks: { name: 'Trại lính Huyết Nha', w: 3, h: 2, hp: 950, sprite: 'b.red.barracks', enemy: true },
    r_archery: { name: 'Bãi tập bắn', w: 3, h: 2, hp: 850, sprite: 'b.red.archery', enemy: true },
    r_castle: { name: 'Thành Huyết Nha', w: 5, h: 3, hp: 3600, sprite: 'b.red.castle', enemy: true, shoot: { range: 7.5, dmg: 16, cd: 1.1 } },
  });

  let W = 96, H = 72;
  const CLASSIC = {
    castle: { tx: 16, ty: 33 },
    yellow: { tx: 42, ty: 58 },
    purple: { tx: 33, ty: 9 },
    black: { tx: 62, ty: 9 },
    A: { tx: 48, ty: 33 },
    B: { tx: 66, ty: 52 },
    C: { tx: 75, ty: 21 },
    F: { tx: 84, ty: 36 },
  };
  let PLACES = CLASSIC;
  const CAMPS = {
    A: {
      name: 'Tiền đồn Đông', buildings: [['r_tower', 0, -2], ['r_house', 3, -1], ['r_tent', -3, 1], ['r_tent', 1, 2]],
      garrison: { raider: 3, redwarrior: 1, redarcher: 1 }, respawn: 1,
    },
    B: {
      name: 'Trại Sói Đỏ', buildings: [['r_barracks', -1, -3], ['r_tower', 3, 0], ['r_house2', -4, 0], ['r_tent', 0, 2], ['r_tent', -4, 3]],
      garrison: { raider: 4, redwarrior: 3, redarcher: 2, redlancer: 1 }, respawn: 2,
    },
    C: {
      name: 'Trại Rèn Máu', buildings: [['r_archery', -1, -3], ['r_tower', 3, -1], ['r_house', -4, 0], ['r_tent', 0, 2], ['r_tent', 3, 3]],
      garrison: { raider: 3, redwarrior: 3, redarcher: 3, redmonk: 1 }, respawn: 2, hostage: true,
    },
    F: {
      name: 'Thành Huyết Nha', buildings: [['r_castle', -2, -1], ['r_tower', -5, -3], ['r_tower', 4, -3], ['r_barracks', -6, 3], ['r_archery', 4, 3], ['r_tent', -1, 4]],
      garrison: { raider: 5, redwarrior: 6, redarcher: 5, redlancer: 3, redmonk: 2 }, respawn: 3, boss: true,
    },
  };
  G.CAMPS = CAMPS;

  /** Định nghĩa trại theo chữ cái (trại thêm ở bản đồ lớn dùng lại mẫu A/B/C). */
  G.campDef = function (c) {
    if (CAMPS[c] && (c !== 'C' || G.S.mode === 'campaign')) return CAMPS[c];
    if (c === 'C') return Object.assign({}, CAMPS.C, { hostage: false });
    const base = CAMPS['ABC'['DEHIJ'.indexOf(c) % 3]];
    return Object.assign({}, base, { name: G.CAMP_NAMES[c] || 'Trại giặc', hostage: false });
  };

  const World = {
    W, H, PLACES,
    map: null, biome: null,
    ground: null, road: null, bmap: null, nmap: null, coast: null,
    decor: [],

    /** Chọn bản đồ: đặt kích thước, khí hậu và vị trí các địa danh (tất định theo seed). */
    setup(mapId, seed) {
      const m = G.mapById(mapId);
      this.map = m;
      this.biome = G.BIOMES[m.biome] || G.BIOMES.grass;
      W = m.W; H = m.H;
      this.W = W; this.H = H;
      PLACES = m.shape === 'classic' ? CLASSIC : this.layout(m, seed);
      this.PLACES = PLACES;
    },

    /** Bố trí địa danh cho bản đồ sinh tự động. */
    layout(m, seed) {
      const rng = G.makeRng(seed * 7 + 101);
      const j = (v, r) => v + (rng() - 0.5) * 2 * r;
      const mx = Math.max(7, Math.round(W * 0.08)), my = Math.max(7, Math.round(H * 0.1));
      const cl = (p) => ({ tx: Math.round(G.clamp(p.tx, mx, W - mx)), ty: Math.round(G.clamp(p.ty, my, H - my)) });
      const P = {
        castle: cl({ tx: j(W * 0.16, 2), ty: j(H * 0.5, H * 0.08) }),
        purple: cl({ tx: j(W * 0.34, 3), ty: j(H * 0.14, 2) }),
        black: cl({ tx: j(W * 0.62, 4), ty: j(H * 0.14, 2) }),
        yellow: cl({ tx: j(W * 0.42, 4), ty: j(H * 0.84, 2) }),
        F: cl({ tx: j(W * 0.86, 2), ty: j(H * 0.5, H * 0.1) }),
      };
      const letters = ['A', 'B', 'C', 'D', 'E', 'H', 'I', 'J'].slice(0, G.campCount(m));
      const minD = Math.max(9, Math.min(W, H) * 0.16);
      const far = (p, r) => Object.values(P).every((q) => G.dist(p.tx, p.ty, q.tx, q.ty) >= r);
      for (let i = 0; i < letters.length; i++) {
        let best = null;
        for (let k = 0; k < 400; k++) {
          // trại đầu tiên ở gần làng nhất, các trại sau lan dần về phía đông
          const t = letters.length === 1 ? 0.5 : i / (letters.length - 1);
          const p = cl({ tx: W * (0.42 + 0.36 * t) + (rng() - 0.5) * W * 0.2, ty: my + rng() * (H - 2 * my) });
          if (G.dist(p.tx, p.ty, P.castle.tx, P.castle.ty) < Math.max(16, W * 0.22)) continue;
          if (far(p, minD - k * 0.02)) { best = p; break; }
        }
        if (best) P[letters[i]] = best;
      }
      return P;
    },

    idx: (x, y) => y * W + x,
    inside: (x, y) => x >= 0 && y >= 0 && x < W && y < H,
    isLand(x, y) { return this.inside(x, y) && this.ground[y * W + x] === 1; },
    isRoad(x, y) { return this.inside(x, y) && this.road[y * W + x] === 1; },
    buildingAt(x, y) { if (!this.inside(x, y)) return null; const id = this.bmap[y * W + x]; return id ? G.byId(id) : null; },
    nodeAt(x, y) { if (!this.inside(x, y)) return null; const id = this.nmap[y * W + x]; return id ? G.byId(id) : null; },

    /** Ô có đi qua được không (team 0: quân ta; 1: giặc). */
    passable(x, y, team) {
      if (!this.inside(x, y)) return false;
      const i = y * W + x;
      if (this.ground[i] !== 1) return false;
      if (this.nmap[i]) return false;
      const bid = this.bmap[i];
      if (bid) {
        const b = G.byId(bid);
        if (!b) return true;
        const d = G.BUILDINGS[b.type];
        if (d.ground || !b.built) return true;
        if (d.gate && team === 0) return true;
        return false;
      }
      return true;
    },

    /** Sinh địa hình (tất định theo seed, không dùng rng chung). */
    genTerrain(seed) {
      const n1 = G.makeNoise(seed + 11), n2 = G.makeNoise(seed + 23), n3 = G.makeNoise(seed + 37);
      const P = PLACES;
      this.alloc();
      const g = this.ground;
      const forced = new Uint8Array(W * H); // 1: bắt buộc đất, 2: bắt buộc nước

      const shape = this.map ? this.map.shape : 'classic';
      const fs = 0.05 * Math.sqrt(96 / W); // đặc điểm địa hình to lên theo kích thước bản đồ
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const nx = (x + 0.5) / W * 2 - 1, ny = (y + 0.5) / H * 2 - 1;
          const d = Math.sqrt(nx * nx * 0.92 + ny * ny * 1.05);
          const n = n1.fbm(x * fs, y * fs, 4);
          let v;
          if (shape === 'continent') v = n * 0.6 + (1 - Math.pow(Math.max(Math.abs(nx), Math.abs(ny)), 6)) * 0.9 - 0.42;
          else if (shape === 'archipelago') v = n * 1.25 + (1 - d * d) * 0.55 - 0.78;
          else if (shape === 'lakes') v = n * 0.55 + (1 - Math.pow(Math.max(Math.abs(nx), Math.abs(ny)), 5)) * 0.9 - 0.38;
          else v = n * 0.75 + (1 - d * d) * 0.95 - 0.5;
          g[y * W + x] = v > 0 ? 1 : 0;
        }
      }
      if (shape === 'river') {
        // dòng sông uốn lượn từ bắc xuống nam ở khoảng giữa bản đồ
        for (let y = 0; y < H; y++) {
          const cx = W * 0.5 + Math.sin(y * 0.09) * W * 0.06 + (n2(y * 0.05, 3) - 0.5) * 8;
          const hw = 1.6 + n3(y * 0.1, 7) * 1.4;
          for (let x = Math.floor(cx - hw); x <= cx + hw; x++) if (this.inside(x, y)) forced[y * W + x] = 2;
        }
      }
      const disc = (cx, cy, r, val) => {
        for (let y = Math.floor(cy - r); y <= cy + r; y++) {
          for (let x = Math.floor(cx - r); x <= cx + r; x++) {
            if (this.inside(x, y) && (x - cx) ** 2 + (y - cy) ** 2 <= r * r) forced[y * W + x] = val;
          }
        }
      };
      const line = (a, b, r) => {
        const steps = Math.ceil(Math.hypot(b.tx - a.tx, b.ty - a.ty));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const wob = Math.sin(t * Math.PI) * (n2(i * 0.3, a.tx) - 0.5) * 6;
          const cx = G.lerp(a.tx, b.tx, t) + wob, cy = G.lerp(a.ty, b.ty, t) - wob;
          disc(cx, cy, r, 1);
          // lối đi luôn trống cây/đá để mọi nơi đều tới được
          for (let yy = Math.floor(cy - 1); yy <= cy + 1; yy++) for (let xx = Math.floor(cx - 1); xx <= cx + 1; xx++) if (this.inside(xx, yy)) this.corr[yy * W + xx] = 1;
        }
      };
      if (shape === 'classic') {
        // Vịnh cảng phía nam
        for (let y = 63; y < H; y++) for (let x = 35; x <= 50; x++) forced[y * W + x] = 2;
      }
      for (const k in P) disc(P[k].tx, P[k].ty, k === 'castle' || k === 'F' ? 9 : 7, 1);
      for (const [a, b] of this.links()) line(P[a], P[b], shape === 'archipelago' ? 1.6 : 2.2);
      const lake = shape === 'lakes' ? 0.6 : shape === 'archipelago' || shape === 'river' ? 0.78 : 0.7;
      for (let i = 0; i < W * H; i++) {
        if (forced[i] === 1) g[i] = 1;
        else if (forced[i] === 2) g[i] = 0;
        else if (g[i] === 1 && n3.fbm((i % W) * 0.09, Math.floor(i / W) * 0.09, 3) > lake) g[i] = 0; // hồ
      }
      for (let x = 0; x < W; x++) for (const y of [0, 1, H - 2, H - 1]) g[y * W + x] = 0;
      for (let y = 0; y < H; y++) for (const x of [0, 1, W - 2, W - 1]) g[y * W + x] = 0;
      // Loại bỏ đất không nối với lâu đài
      const seen = new Uint8Array(W * H);
      const stack = [P.castle.ty * W + P.castle.tx];
      seen[stack[0]] = 1;
      while (stack.length) {
        const i = stack.pop();
        const x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (!this.inside(xx, yy)) continue;
          const j = yy * W + xx;
          if (!seen[j] && g[j] === 1) { seen[j] = 1; stack.push(j); }
        }
      }
      for (let i = 0; i < W * H; i++) if (g[i] === 1 && !seen[i]) g[i] = 0;
      // Bỏ các mỏm đất 1 ô lẻ loi cho bờ biển đẹp hơn
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          if (g[i] !== 1 || forced[i] === 1) continue;
          const nb = g[i - 1] + g[i + 1] + g[i - W] + g[i + W];
          if (nb <= 1) g[i] = 0;
        }
      }
      this.computeCoast();
    },

    /** Các cặp địa danh được nối bằng dải đất (bảo đảm đi tới được). */
    links() {
      const P = PLACES;
      if (P === CLASSIC) return [['castle', 'A'], ['castle', 'yellow'], ['castle', 'purple'], ['purple', 'black'], ['black', 'C'], ['A', 'B'], ['A', 'F'], ['C', 'F'], ['B', 'F'], ['B', 'yellow'], ['A', 'C']];
      const out = [['castle', 'yellow'], ['castle', 'purple'], ['purple', 'black'], ['black', 'F'], ['yellow', 'F']];
      const camps = Object.keys(P).filter((k) => k.length === 1 && k !== 'F');
      let prev = 'castle';
      for (const c of camps) { out.push([prev, c]); out.push([c, 'F']); prev = c; }
      return out;
    },

    /** Tạo bản đồ mới từ seed. Ghi vào G.S (nodes, buildings, units). */
    generate(seed) {
      const S = G.S;
      const rng = G.makeRng(seed);
      const n2 = G.makeNoise(seed + 23), n4 = G.makeNoise(seed + 51);
      this.genTerrain(seed);
      const P = PLACES;


      // Đường cũ nối lâu đài với các thị trấn
      const front = { tx: P.castle.tx + 2, ty: P.castle.ty + 4 };
      for (const k of ['yellow', 'purple', 'A']) {
        if (!P[k]) continue;
        const dst = k === 'A' ? { tx: P.A.tx - 6, ty: P.A.ty + 1 } : { tx: P[k].tx, ty: P[k].ty + 3 };
        const path = G.Path.find(front.tx, front.ty, dst.tx, dst.ty, { team: 0, maxIter: 60000, noRoadBias: true });
        if (path) {
          // nối các bước chéo thành đường 4 hướng cho liền mạch
          let px = front.tx, py = front.ty;
          for (const p of path) {
            if (p.x !== px && p.y !== py) this.road[(this.isLand(p.x, py) && !this.nmap[py * W + p.x] ? py * W + p.x : p.y * W + px)] = 1;
            this.road[p.y * W + p.x] = 1;
            px = p.x; py = p.y;
          }
        }
      }
      for (let x = P.castle.tx - 3; x <= P.castle.tx + 8; x++) this.road[(P.castle.ty + 4) * W + x] = 1;

      // ---------- Lâu đài (tàn tích), dân, Hiệp sĩ ----------
      const castle = G.Build.create('castle', P.castle.tx - 2, P.castle.ty - 1, 0, { built: true, ruined: true });
      castle.hp = castle.maxHp * 0.35;
      S.castleId = castle.id;

      // ---------- Thị trấn trung lập ----------
      const town = (key, list) => {
        const p = P[key];
        for (const [type, dx, dy] of list) G.Build.create(type, p.tx + dx, p.ty + dy, 2, { built: true, faction: key });
      };
      town('yellow', [['y_stall', -1, -1], ['y_house1', -5, -2], ['y_house2', 3, -3], ['y_house3', -4, 2]]);
      town('purple', [['p_monastery', -1, -2], ['p_house1', -5, -1], ['p_house3', 3, -1]]);
      town('black', [['k_castle', -2, -2], ['k_tower', -6, -1], ['k_barracks', 4, -1]]);
      let dock = null;
      if (PLACES === CLASSIC) {
        const dockX = P.yellow.tx + 4;
        let dockY = P.yellow.ty + 1;
        while (dockY < H - 3 && this.isLand(dockX, dockY + 2)) dockY++;
        dock = { x: dockX, y: dockY };
      } else {
        for (let r = 3; r < 14 && !dock; r++) {
          for (let dy = 0; dy <= r && !dock; dy++) for (const dx of [-r + dy, r - dy]) {
            const x = P.yellow.tx + dx, y = P.yellow.ty + dy;
            if (this.isLand(x, y) && this.isLand(x + 1, y) && this.isLand(x, y + 1) && this.isLand(x + 1, y + 1) && !this.isLand(x, y + 2) && !this.bmap[y * W + x] && !this.bmap[y * W + x + 1]) { dock = { x, y }; break; }
          }
        }
      }
      if (dock) {
        G.Build.create('y_dock', dock.x, dock.y, 2, { built: true, faction: 'yellow' });
        this.decor.push({ type: 'boat', x: (dock.x + 1) * T, y: (dock.y + 3.6) * T });
      }
      G.Units.spawnNpc('merchant', 'yellow', P.yellow.tx + 0.5, P.yellow.ty + 1.6);
      G.Units.spawnNpc('abbess', 'purple', P.purple.tx + 0.5, P.purple.ty + 1.2);
      G.Units.spawnNpc('chief', 'black', P.black.tx + 0.5, P.black.ty + 2.2);
      for (let i = 0; i < 2; i++) {
        G.Units.spawnNpc('townsfolk', 'yellow', P.yellow.tx - 2 + i * 5, P.yellow.ty + 3);
        G.Units.spawnNpc('townsfolk', 'purple', P.purple.tx - 3 + i * 6, P.purple.ty + 2.5);
        G.Units.spawnNpc('guard', 'black', P.black.tx - 3 + i * 7, P.black.ty + 3);
      }

      // ---------- Trại Huyết Nha ----------
      S.camps = {};
      const campList = G.Modes ? G.Modes.campList() : Object.keys(CAMPS);
      for (const c of campList) {
        const def = G.campDef(c), p = P[c];
        if (!p) continue;
        S.camps[c] = { id: c, name: def.name, tx: p.tx, ty: p.ty, dead: false, garrison: [] };
        for (const [type, dx, dy] of def.buildings) G.Build.create(type, p.tx + dx, p.ty + dy, 1, { built: true, camp: c });
        for (const k in def.garrison) {
          for (let i = 0; i < def.garrison[k]; i++) G.Units.spawnGarrison(c, k);
        }
        if (def.boss && !(G.Modes && G.Modes.noBoss())) G.Units.spawnGarrison(c, 'boss');
        if (def.hostage) S.camps[c].hostage = G.Units.spawnNpc('hostage', 'black', p.tx + 0.5, p.ty + 0.5).id;
      }

      // ---------- Tài nguyên ----------
      const clearOf = (x, y) => {
        if (this.road[y * W + x] || this.bmap[y * W + x]) return false;
        for (const k in P) {
          const r = k === 'castle' ? 7 : k.length === 1 ? 7 : 6;
          if (Math.abs(x - P[k].tx) <= r && Math.abs(y - P[k].ty) <= r) return false;
        }
        return true;
      };
      const tryNode = (type, x, y) => {
        if (!this.isLand(x, y) || this.nmap[y * W + x] || this.bmap[y * W + x] || this.road[y * W + x]) return null;
        if (this.coast[y * W + x] || this.corr[y * W + x]) return null;
        return G.Nodes.create(type, x, y);
      };
      const B = this.biome || G.BIOMES.grass;
      const tf = 0.56 + (1 - B.tree) * 0.12;
      for (let y = 2; y < H - 2; y++) {
        for (let x = 2; x < W - 2; x++) {
          if (!this.isLand(x, y) || !clearOf(x, y)) continue;
          const f = n2.fbm(x * 0.09, y * 0.09, 3);
          const r = rng();
          if (f > tf && r < 0.6 * Math.min(1.3, B.tree)) tryNode('tree', x, y);
          else if (n4.fbm(x * 0.12 + 40, y * 0.12, 3) > 0.69 - (B.rock - 1) * 0.06 && r < 0.45) tryNode('rock', x, y);
          else if (r < 0.018 * B.bush) tryNode('bush', x, y);
          else if (r < 0.018 * B.bush + 0.004 * B.tree) tryNode('tree', x, y);
          else if (r < 0.018 * B.bush + 0.004 * B.tree + 0.0015 * B.gold) tryNode('gold', x, y);
        }
      }
      // Bảo đảm tài nguyên gần nơi bắt đầu
      const c0 = P.castle;
      const cluster = (type, cx, cy, n, spread) => {
        let placed = 0;
        for (let k = 0; k < n * 6 && placed < n; k++) {
          const x = Math.round(cx + (rng() - 0.5) * spread * 2), y = Math.round(cy + (rng() - 0.5) * spread * 2);
          if (tryNode(type, x, y)) placed++;
        }
      };
      cluster('tree', c0.tx + 10, c0.ty - 4, 14, 3.5);
      cluster('tree', c0.tx - 8, c0.ty - 6, 8, 3);
      cluster('rock', c0.tx - 7, c0.ty + 6, 5, 2);
      cluster('bush', c0.tx + 6, c0.ty + 7, 5, 2.5);
      cluster('gold', c0.tx + 9, c0.ty + 9, 4, 1.5);
      cluster('gold', P.black.tx + 8, P.black.ty + 7, 6, 2);
      cluster('gold', P.black.tx - 8, P.black.ty + 8, 5, 2);
      for (const k of Object.keys(P)) if (k.length === 1) cluster('gold', P[k].tx + G.randInt(-8, 8), P[k].ty + 9, 5, 2);
      cluster('rock', P.black.tx, P.black.ty + 10, 6, 3);
      cluster('rock', P.purple.tx + 9, P.purple.ty + 8, 5, 3);
      // Đá trong nước làm cảnh
      for (let k = 0; k < W * H / 170; k++) {
        const x = 2 + Math.floor(rng() * (W - 4)), y = 2 + Math.floor(rng() * (H - 4));
        if (!this.isLand(x, y) && this.nearLand(x, y, 2) && !this.nearLand(x, y, 0)) this.decor.push({ type: 'waterrock', x: x * T + T / 2, y: y * T + T / 2, v: 1 + Math.floor(rng() * 4) });
      }
      // Cừu hoang
      for (let k = 0; k < Math.max(3, Math.round(W * H / 2300)); k++) this.spawnWildSheep(3, false, rng);
    },

    alloc() {
      this.ground = new Uint8Array(W * H);
      this.road = new Uint8Array(W * H);
      this.bmap = new Int32Array(W * H);
      this.nmap = new Int32Array(W * H);
      this.coast = new Uint8Array(W * H);
      this.corr = new Uint8Array(W * H);
      this.decor = [];
    },

    nearLand(x, y, r) {
      for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) if (this.isLand(xx, yy)) return true;
      return false;
    },

    computeCoast() {
      const g = this.ground;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (g[i] !== 1) { this.coast[i] = 0; continue; }
        let c = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !this.isLand(x + dx, y + dy)) c = 1;
        this.coast[i] = c;
      }
    },

    /** Tìm một ô cỏ trống ngẫu nhiên trong khoảng cách [rmin, rmax] quanh (cx, cy). */
    findFreeTile(cx, cy, rmin, rmax, rng = Math.random) {
      for (let k = 0; k < 200; k++) {
        const a = rng() * Math.PI * 2, r = rmin + rng() * (rmax - rmin);
        const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
        if (this.passable(x, y, 0) && !this.bmap[y * W + x] && !this.coast[y * W + x]) return { x, y };
      }
      return null;
    },

    spawnWildSheep(n, nearVillage, rng = Math.random) {
      const c = PLACES.castle;
      const spot = nearVillage ? this.findFreeTile(c.tx, c.ty, 9, 15, rng) : this.findFreeTile(c.tx + 15, c.ty, 8, 26, rng);
      if (!spot) return;
      for (let i = 0; i < n; i++) {
        const t = this.findFreeTile(spot.x, spot.y, 0, 2.5, rng) || spot;
        G.Units.spawnSheep((t.x + 0.5) * T, (t.y + 0.5) * T, 3);
      }
      if (nearVillage && G.UI) G.UI.ping((spot.x + 0.5) * T, (spot.y + 0.5) * T, 'Cừu hoang');
    },

    spawnGoldVein() {
      const c = PLACES.castle;
      const spot = this.findFreeTile(c.tx, c.ty, 8, 16);
      if (!spot) return;
      let placed = 0;
      for (let k = 0; k < 30 && placed < 4; k++) {
        const x = spot.x + G.randInt(-2, 2), y = spot.y + G.randInt(-2, 2);
        if (this.passable(x, y, 0) && !this.bmap[y * W + x] && !this.road[y * W + x] && !this.coast[y * W + x]) { G.Nodes.create('gold', x, y); placed++; }
      }
      if (G.UI) G.UI.ping((spot.x + 0.5) * T, (spot.y + 0.5) * T, 'Mạch vàng');
    },

    spawnTreasure() {
      const c = PLACES.castle;
      const spot = this.findFreeTile(c.tx, c.ty, 18, 34);
      if (!spot) return;
      G.S.drops.push({ id: G.newId(), x: (spot.x + 0.5) * T, y: (spot.y + 0.5) * T, chest: true, gold: G.randInt(120, 260), items: { weapons: G.randInt(2, 5), cloth: G.randInt(2, 6) } });
      if (G.UI) G.UI.ping((spot.x + 0.5) * T, (spot.y + 0.5) * T, 'Kho báu');
    },

    serialize() {
      const roads = [];
      for (let i = 0; i < W * H; i++) if (this.road[i]) roads.push(i);
      return { roads, decor: this.decor };
    },
  };
  G.World = World;

  // Tra cứu toạ độ cho nhiệm vụ
  G.castleTile = () => { const c = G.byId(G.S.castleId); return c ? { x: c.tx + 2, y: c.ty + 1 } : null; };
  G.townTile = (f) => ({ x: PLACES[f].tx, y: PLACES[f].ty + 2 });
  G.campTile = (c) => (PLACES[c] ? { x: PLACES[c].tx, y: PLACES[c].ty } : null);
  G.campDead = (c) => !!(G.S.camps && G.S.camps[c] && G.S.camps[c].dead);
  G.npcTile = (role) => {
    const u = G.S.units.find((v) => v.role === role);
    return u ? { x: Math.floor(u.x / T), y: Math.floor(u.y / T) } : null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
