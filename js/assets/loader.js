/*
 * Nạp sprite cho game theo thứ tự ưu tiên:
 *   1. Bộ Tiny Swords người chơi đã nạp trong game (lưu ở IndexedDB của trình duyệt)
 *   2. Bộ Tiny Swords đặt sẵn trong thư mục assets/ (có assets/manifest.json do tools/scan-assets.mjs tạo)
 *   3. Đồ hoạ dự phòng tự vẽ (js/art/fallback.js)
 */
(function () {
  'use strict';
  const CAT = window.TS_CATALOG;
  const DB_NAME = 'guom-lua-assets';
  const STORE = 'files';

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('Không có IndexedDB'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function dbAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  async function dbReplace(rows) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      st.clear();
      for (const r of rows) st.put(r);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Không tải được ảnh ' + src));
      img.src = src;
    });
  }

  const tsKeys = Object.keys(CAT.entries).filter((k) => !CAT.entries[k].proc);

  const Assets = {
    ts: new Map(),
    paths: {},
    source: 'fallback',
    totalKeys: tsKeys.length,

    async init(onProgress) {
      try {
        const rows = await dbAll();
        if (rows.length) {
          await this._loadRows(rows, onProgress);
          if (this.ts.size) { this.source = 'imported'; return; }
        }
      } catch (e) { /* trình duyệt chặn IndexedDB: bỏ qua */ }
      try {
        const res = await fetch('assets/manifest.json', { cache: 'no-cache' });
        if (res.ok) {
          const man = await res.json();
          const files = man.files || man;
          const rows = Object.keys(files).filter((k) => CAT.entries[k]).map((k) => ({ key: k, path: files[k], url: 'assets/' + files[k].split('/').map(encodeURIComponent).join('/') }));
          await this._loadRows(rows, onProgress);
          if (this.ts.size) this.source = 'static';
        }
      } catch (e) { /* chạy từ file:// hoặc không có manifest */ }
    },

    async _loadRows(rows, onProgress) {
      let done = 0;
      await Promise.all(rows.map(async (r) => {
        let url = r.url;
        let revoke = false;
        if (!url && r.blob) { url = URL.createObjectURL(r.blob); revoke = true; }
        try {
          const img = await loadImage(url);
          this._addSheet(r.key, img);
          this.paths[r.key] = r.path || url;
        } catch (e) { /* ảnh hỏng: dùng đồ hoạ dự phòng */ }
        if (revoke) setTimeout(() => URL.revokeObjectURL(url), 1000);
        done++;
        if (onProgress) onProgress(done / rows.length);
      }));
    },

    _addSheet(key, img) {
      const e = CAT.entries[key];
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const inf = CAT.inferFrames(key, w, h);
      // Công trình được co giãn theo bề rộng thiết kế để khớp với ô đất; nhân vật giữ nguyên tỉ lệ gốc.
      const scale = key.startsWith('b.') ? e.size[0] / inf.fw : 1;
      this.ts.set(key, { img, fw: inf.fw, fh: inf.fh, n: inf.n, ax: e.ax * inf.fw, ay: e.ay * inf.fh, scale, ts: true });
    },

    get(key) {
      const s = this.ts.get(key);
      if (s) return s;
      return window.Fallback ? window.Fallback.get(key) : null;
    },

    icon(key) {
      return window.Fallback ? window.Fallback.iconURL(key) : '';
    },

    /** Nạp từ danh sách File: chấp nhận file .zip của Tiny Swords hoặc cả thư mục đã giải nén. */
    async importFiles(fileList, onProgress) {
      const files = Array.from(fileList || []);
      const paths = [];
      const getters = {};
      for (const f of files) {
        if (/\.zip$/i.test(f.name)) {
          const zip = await window.ZipReader.openZip(f);
          for (const ent of zip.entries) {
            const p = f.name + '/' + ent.name;
            paths.push(p);
            getters[p] = async () => new Blob([await zip.read(ent)], { type: 'image/png' });
          }
        } else if (/\.png$/i.test(f.name)) {
          const p = f.webkitRelativePath || f.name;
          paths.push(p);
          getters[p] = async () => f;
        }
      }
      const match = CAT.matchFiles(paths);
      const keys = Object.keys(match);
      if (!keys.length) throw new Error('Không tìm thấy ảnh Tiny Swords nào khớp. Hãy chọn file zip "Tiny Swords (Free Pack)" hoặc thư mục đã giải nén.');
      const rows = [];
      for (const key of keys) rows.push({ key, path: match[key], blob: await getters[match[key]]() });
      try { await dbReplace(rows); } catch (e) { /* không lưu được thì vẫn dùng trong phiên này */ }
      this.ts.clear();
      this.paths = {};
      await this._loadRows(rows, onProgress);
      this.source = 'imported';
      return { matched: this.ts.size, total: this.totalKeys };
    },

    async clearImported() {
      try { await dbReplace([]); } catch (e) { /* bỏ qua */ }
      this.ts.clear();
      this.paths = {};
      this.source = 'fallback';
      await this.init();
    },

    /** Danh sách khoá Tiny Swords và trạng thái (để kiểm tra bộ ảnh). */
    report() {
      return tsKeys.map((k) => {
        const s = this.ts.get(k);
        return s ? { key: k, ok: true, path: this.paths[k], n: s.n, fw: s.fw, fh: s.fh } : { key: k, ok: false };
      });
    },
  };

  window.Assets = Assets;
})();
