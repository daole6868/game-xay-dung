/* Thời gian: ngày/đêm, mùa, thời tiết; hiệu ứng (FX) nhẹ. */
(function (root) {
  'use strict';
  const G = root.G;

  const Time = {
    hour() { return (6 + G.S.time * 24) % 24; },
    clock() {
      const h = this.hour();
      const hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 10) * 10;
      return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    },
    isNight() { const h = this.hour(); return h >= 20 || h < 5; },
    /** Độ tối 0..1 để vẽ. */
    darkness() {
      const h = this.hour();
      if (h >= 21 || h < 4) return 1;
      if (h >= 18) return (h - 18) / 3;
      if (h < 6.5 && h >= 4) return 1 - (h - 4) / 2.5;
      return 0;
    },
    seasonIndex(day) { return Math.floor(((day || G.S.day) - 1) / G.SEASON_DAYS) % 4; },
    season() { return G.SEASONS[this.seasonIndex()]; },
    dayOfSeason() { return ((G.S.day - 1) % G.SEASON_DAYS) + 1; },
    year() { return Math.floor((G.S.day - 1) / (G.SEASON_DAYS * 4)) + 1; },
    setWeather(w) { G.S.weather = w; },
    growMult(plot) {
      let m = this.season().grow;
      if (G.S.techs.greenhouse && m === 0) m = 0.35;
      if (G.S.weather === 'rain') m *= 1.5;
      if (G.S.weather === 'drought' && !(plot && plot.nearWell) && !G.S.techs.irrigation) m *= 0.5;
      if (G.S.techs.irrigation) m *= 1.3;
      if (plot && plot.nearWell) m *= 1.25;
      return m;
    },

    update(dt) {
      const S = G.S;
      const before = this.hour();
      S.time += dt / G.DAY_LEN;
      if (S.time >= 1) {
        S.time -= 1;
        S.day++;
        G.Game.newDay();
      }
      const h = this.hour();
      const crossed = (mark) => (before < mark && h >= mark) || (before > h && h >= mark && mark < 6);
      if (crossed(18)) G.emit('dusk');
      if (crossed(20)) G.emit('night');
      if (crossed(5)) G.emit('morning');
    },
  };
  G.Time = Time;

  // ---------- Hiệu ứng ----------
  const FX = {
    list: [],
    texts: [],
    sprite(key, x, y, scale = 1, opts = {}) {
      this.list.push(Object.assign({ key, x, y, scale, t: 0, dur: opts.dur || 0.6 }, opts));
    },
    text(x, y, str, color = '#fff', size = 16) {
      this.texts.push({ x, y, str, color, size, t: 0, dur: 1.1 });
    },
    particle(x, y, opts) {
      this.list.push(Object.assign({ x, y, t: 0, dur: 1, vx: 0, vy: -20, particle: true }, opts));
    },
    update(dt) {
      for (const f of this.list) {
        f.t += dt;
        if (f.particle) { f.x += f.vx * dt; f.y += f.vy * dt; }
      }
      for (const t of this.texts) { t.t += dt; t.y -= 28 * dt; }
      this.list = this.list.filter((f) => f.t < f.dur);
      this.texts = this.texts.filter((t) => t.t < t.dur);
    },
    clear() { this.list = []; this.texts = []; },
  };
  G.FX = FX;
})(typeof window !== 'undefined' ? window : globalThis);
