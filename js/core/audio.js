/* Âm thanh tổng hợp bằng WebAudio (không cần file âm thanh): hiệu ứng + nhạc nền sinh tự động. */
(function (root) {
  'use strict';
  const G = root.G;

  const Audio = {
    ctx: null, master: null, sfx: null, musicGain: null, noiseBuf: null,
    sfxOn: true, musicOn: true, last: {},

    unlock() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.7; this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = this.sfxOn ? 0.55 : 0; this.sfx.connect(this.master);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicOn ? 0.16 : 0; this.musicGain.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startMusic();
    },

    setSfx(on) { this.sfxOn = on; if (this.sfx) this.sfx.gain.value = on ? 0.55 : 0; },
    setMusic(on) { this.musicOn = on; if (this.musicGain) this.musicGain.gain.value = on ? 0.16 : 0; },

    tone(freq, dur, type = 'sine', vol = 0.3, slide = 0, delay = 0, dest) {
      const c = this.ctx, t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || this.sfx);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, vol = 0.3, filter = 'lowpass', freq = 1200, delay = 0, q = 1) {
      const c = this.ctx, t = c.currentTime + delay;
      const s = c.createBufferSource(); s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = filter; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.sfx);
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    },

    play(name, vol = 1) {
      if (!this.ctx || !this.sfxOn) return;
      const now = performance.now();
      if (this.last[name] && now - this.last[name] < 45) return;
      this.last[name] = now;
      const v = vol;
      switch (name) {
        case 'click': this.tone(660, 0.06, 'square', 0.08 * v); break;
        case 'tick': this.tone(900, 0.03, 'square', 0.04 * v); break;
        case 'coin': this.tone(1320, 0.08, 'square', 0.1 * v); this.tone(1760, 0.14, 'square', 0.1 * v, 0, 0.07); break;
        case 'chop': this.noise(0.09, 0.4 * v, 'lowpass', 900); this.tone(140, 0.08, 'triangle', 0.25 * v, 0.6); break;
        case 'mine': this.tone(1100 + Math.random() * 300, 0.12, 'triangle', 0.18 * v, 0.7); this.noise(0.05, 0.2 * v, 'highpass', 2000); break;
        case 'pick': this.tone(500, 0.07, 'sine', 0.2 * v, 1.6); break;
        case 'plant': this.tone(300, 0.08, 'sine', 0.15 * v, 1.4); break;
        case 'hammer': this.tone(220, 0.05, 'square', 0.12 * v, 0.5); this.noise(0.04, 0.2 * v, 'bandpass', 1800); break;
        case 'sword': this.noise(0.08, 0.3 * v, 'highpass', 3000); this.tone(900, 0.08, 'triangle', 0.1 * v, 0.5); break;
        case 'swing': case 'spin': this.noise(name === 'spin' ? 0.25 : 0.12, 0.25 * v, 'bandpass', 1400, 0, 0.8); break;
        case 'bow': this.tone(320, 0.12, 'sawtooth', 0.08 * v, 0.5); break;
        case 'hitwood': this.tone(110, 0.1, 'triangle', 0.3 * v, 0.6); this.noise(0.06, 0.25 * v, 'lowpass', 700); break;
        case 'death': this.tone(300, 0.35, 'sawtooth', 0.1 * v, 0.3); break;
        case 'place': this.tone(180, 0.1, 'triangle', 0.25 * v, 0.7); break;
        case 'built': [523, 659, 784].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.15 * v, 0, i * 0.07)); break;
        case 'demolish': case 'collapse': this.noise(0.6, 0.45 * v, 'lowpass', 400); this.tone(80, 0.5, 'sine', 0.3 * v, 0.5); break;
        case 'boom': this.noise(0.7, 0.6 * v, 'lowpass', 300); this.tone(60, 0.6, 'sine', 0.4 * v, 0.4); break;
        case 'levelup': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'square', 0.09 * v, 0, i * 0.08)); break;
        case 'quest': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.14 * v, 0, i * 0.06)); break;
        case 'ready': [440, 554].forEach((f, i) => this.tone(f, 0.15, 'square', 0.08 * v, 0, i * 0.1)); break;
        case 'victory': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'square', 0.09 * v, 0, i * 0.11)); break;
        case 'horn': this.tone(147, 1.1, 'sawtooth', 0.12 * v, 1.02); this.tone(220, 1.1, 'sawtooth', 0.07 * v, 1.0, 0.05); break;
        case 'drums': for (let i = 0; i < 4; i++) { this.tone(70, 0.25, 'sine', 0.5 * v, 0.5, i * 0.28); this.noise(0.1, 0.2 * v, 'lowpass', 300, i * 0.28); } break;
        case 'heal': [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.07 * v, 0, i * 0.06)); break;
        case 'sheep': this.tone(420, 0.35, 'sawtooth', 0.06 * v, 0.85); break;
        case 'eat': this.noise(0.05, 0.2 * v, 'bandpass', 2500); this.noise(0.05, 0.2 * v, 'bandpass', 2500, 0.1); break;
        case 'splash': this.noise(0.3, 0.3 * v, 'highpass', 1500); break;
        case 'shield': this.tone(700, 0.2, 'square', 0.08 * v, 0.6); break;
        default: break;
      }
    },

    /** Âm thanh có vị trí: nhỏ dần theo khoảng cách tới camera. */
    playAt(name, x, y) {
      if (!this.ctx || !G.Render) return;
      const c = G.Render.cam;
      const d = G.dist(x, y, c.x, c.y);
      const range = 900 / c.zoom;
      if (d > range) return;
      this.play(name, 1 - d / range);
    },

    // ---------------- Nhạc nền ----------------
    startMusic() {
      const scaleDay = [0, 2, 4, 7, 9, 12, 14, 16];
      const scaleNight = [0, 3, 5, 7, 10, 12, 15];
      let step = 0;
      const beat = 0.42;
      const tick = () => {
        if (!this.ctx) return;
        const night = G.S && G.Game.running && G.Time.isNight();
        const raid = G.S && G.Military.raidActive();
        const sc = night ? scaleNight : scaleDay;
        const root = night ? 196 : 262;
        if (this.musicOn) {
          const t = this.ctx.currentTime + 0.05;
          if (step % 8 === 0) this.musicNote(root / 2 * Math.pow(2, (step % 16 === 0 ? 0 : (night ? 3 : 5)) / 12), beat * 7, 'triangle', 0.5, t);
          if (Math.random() < (raid ? 0.35 : 0.55)) {
            const n = sc[Math.floor(Math.random() * sc.length)];
            this.musicNote(root * Math.pow(2, n / 12), beat * (Math.random() < 0.3 ? 2 : 1), night ? 'sine' : 'triangle', 0.32, t);
          }
          if (raid && step % 2 === 0) { this.musicDrum(t, step % 4 === 0 ? 0.5 : 0.25); }
        }
        step++;
        setTimeout(tick, beat * 1000);
      };
      tick();
    },
    musicNote(f, dur, type, vol, t) {
      const c = this.ctx;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.musicGain);
      o.start(t); o.stop(t + dur + 0.05);
    },
    musicDrum(t, vol) {
      const c = this.ctx;
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(this.musicGain);
      o.start(t); o.stop(t + 0.3);
    },
  };
  G.Audio = Audio;
})(typeof window !== 'undefined' ? window : globalThis);
