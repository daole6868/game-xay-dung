/* Tìm đường A* trên lưới ô, 8 hướng, ưu tiên đường đất. */
(function (root) {
  'use strict';
  const G = root.G;
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

  let gScore = null, came = null, stamp = null, curStamp = 0;

  const Path = {
    /**
     * Tìm đường từ ô (sx,sy) tới (tx,ty).
     * opts.team: 0 quân ta, 1 giặc (giặc được "đi xuyên" công trình của ta với chi phí cao — gặp thì đập).
     * opts.near: true = chỉ cần tới ô kề đích (đích là cây, công trình...).
     * opts.rect: {x,y,w,h} — tới ô kề hình chữ nhật này là được.
     * Trả về mảng {x,y} (không gồm ô xuất phát) hoặc null.
     */
    find(sx, sy, tx, ty, opts = {}) {
      const W = G.World.W, H = G.World.H, world = G.World;
      const N = W * H;
      if (!gScore || gScore.length !== N) {
        gScore = new Float64Array(N); came = new Int32Array(N); stamp = new Uint32Array(N);
      }
      curStamp++;
      const team = opts.team || 0;
      const maxIter = opts.maxIter || 5000;
      const rect = opts.rect;
      const near = opts.near || !!rect;
      const isGoal = rect
        ? (x, y) => x >= rect.x - 1 && x <= rect.x + rect.w && y >= rect.y - 1 && y <= rect.y + rect.h && !(x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h)
        : near ? (x, y) => Math.max(Math.abs(x - tx), Math.abs(y - ty)) <= 1 && !(x === tx && y === ty && !world.passable(x, y, team)) : (x, y) => x === tx && y === ty;
      const gx = rect ? rect.x + rect.w / 2 : tx, gy = rect ? rect.y + rect.h / 2 : ty;
      const h = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return (dx + dy - 0.6 * Math.min(dx, dy)) * 0.8; };

      const cost = (x, y) => {
        if (!world.inside(x, y)) return -1;
        const i = y * W + x;
        if (world.ground[i] !== 1 || world.nmap[i]) return -1;
        let c = !opts.noRoadBias && world.road[i] ? 0.7 : 1;
        const bid = world.bmap[i];
        if (bid) {
          const b = G.byId(bid);
          if (b) {
            const d = G.BUILDINGS[b.type];
            if (!(d.ground || !b.built || (d.gate && team === 0))) {
              if (team === 1 && b.team === 0) c += 9; else return -1;
            }
          }
        }
        return c;
      };

      if (!world.inside(sx, sy)) return null;
      const start = sy * W + sx;
      if (isGoal(sx, sy)) return [];
      const open = new G.Heap();
      stamp[start] = curStamp; gScore[start] = 0; came[start] = -1;
      open.push(start, h(sx, sy));
      let best = start, bestH = h(sx, sy), iter = 0, found = -1;
      while (open.size && iter++ < maxIter) {
        const cur = open.pop();
        const cx = cur % W, cy = (cur / W) | 0;
        if (isGoal(cx, cy)) { found = cur; break; }
        const cg = gScore[cur];
        for (const [dx, dy, m] of DIRS) {
          const nx = cx + dx, ny = cy + dy;
          const c = cost(nx, ny);
          if (c < 0) continue;
          if (dx && dy && (cost(cx + dx, cy) < 0 || cost(cx, cy + dy) < 0)) continue; // không cắt góc
          const ni = ny * W + nx;
          const ng = cg + c * m;
          if (stamp[ni] === curStamp && ng >= gScore[ni]) continue;
          stamp[ni] = curStamp; gScore[ni] = ng; came[ni] = cur;
          const hh = h(nx, ny);
          if (hh < bestH) { bestH = hh; best = ni; }
          open.push(ni, ng + hh);
        }
      }
      let end = found;
      if (end < 0) {
        if (!opts.partial) return null;
        end = best;
      }
      const out = [];
      for (let c = end; c !== start && c >= 0; c = came[c]) out.push({ x: c % W, y: (c / W) | 0 });
      out.reverse();
      return out;
    },
  };
  G.Path = Path;
})(typeof window !== 'undefined' ? window : globalThis);
