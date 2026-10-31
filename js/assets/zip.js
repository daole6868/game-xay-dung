/*
 * Đọc file .zip tối giản (không cần thư viện): hỗ trợ kiểu nén "stored" và "deflate",
 * giải nén bằng DecompressionStream có sẵn trong trình duyệt / Node ≥ 18.
 */
(function (root) {
  'use strict';

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Trình duyệt không hỗ trợ giải nén zip, hãy giải nén rồi chọn thư mục.');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /** Mở zip từ Blob/File/ArrayBuffer. Trả về { entries:[{name,size}], read(entry) → Uint8Array }. */
  async function openZip(src) {
    const ab = src instanceof ArrayBuffer ? src : await src.arrayBuffer();
    const buf = new Uint8Array(ab);
    const dv = new DataView(ab);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('File không phải zip hợp lệ.');
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const utf8 = new TextDecoder('utf-8');
    const entries = [];
    for (let i = 0; i < count; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true);
      const csize = dv.getUint32(p + 20, true);
      const usize = dv.getUint32(p + 24, true);
      const nlen = dv.getUint16(p + 28, true);
      const elen = dv.getUint16(p + 30, true);
      const clen = dv.getUint16(p + 32, true);
      const lho = dv.getUint32(p + 42, true);
      const name = utf8.decode(buf.subarray(p + 46, p + 46 + nlen));
      if (!name.endsWith('/')) entries.push({ name, method, csize, size: usize, lho });
      p += 46 + nlen + elen + clen;
    }
    async function read(e) {
      const nlen = dv.getUint16(e.lho + 26, true);
      const elen = dv.getUint16(e.lho + 28, true);
      const start = e.lho + 30 + nlen + elen;
      const data = buf.subarray(start, start + e.csize);
      if (e.method === 0) return data.slice();
      if (e.method === 8) return inflateRaw(data);
      throw new Error('Kiểu nén chưa hỗ trợ: ' + e.method);
    }
    return { entries, read };
  }

  root.ZipReader = { openZip };
})(typeof window !== 'undefined' ? window : globalThis);
