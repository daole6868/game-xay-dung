# GƯƠM & LÚA — Biên niên sử Lam Quốc

Game **nông trại + sinh tồn + xây dựng + quân sự + giao thương** chơi ngay trên trình duyệt (máy tính và điện thoại), dùng bộ đồ hoạ **[Tiny Swords](https://pixelfrog-assets.itch.io/tiny-swords)** của Pixel Frog.

> Bạn là hiệp sĩ cuối cùng của Lam Quốc. Ban ngày cày ruộng, đốn cây, dựng làng, buôn bán với ba thế lực trên đảo. Ban đêm cầm gươm giữ làng trước quân cướp Huyết Nha. Rồi luyện quân, chọn đồng minh, phá từng trại giặc và đánh bại Bạo chúa Xích Hoả.

📘 Tài liệu thiết kế đầy đủ (cốt truyện, hệ thống, số liệu cân bằng): [`docs/thiet-ke-game.md`](docs/thiet-ke-game.md)

## Chơi ngay

Không cần cài đặt hay build. Chọn một cách:

```bash
# Cách 1: có Node.js
npm start              # → mở http://localhost:8080

# Cách 2: có Python
python3 -m http.server 8080

# Cách 3: mở thẳng file index.html bằng Chrome/Edge (lưu game và nạp ảnh vẫn hoạt động)
```

Có thể đưa lên **GitHub Pages** (Settings → Pages → chọn nhánh) để chơi online.

## Nạp đồ hoạ Tiny Swords

Game đã có sẵn đồ hoạ vẽ bằng code nên chơi được ngay. Để dùng đúng ảnh Tiny Swords:

1. Tải bản miễn phí tại <https://pixelfrog-assets.itch.io/tiny-swords> (file `Tiny Swords (Free Pack).zip`).
2. **Trong game:** màn hình chính → **Bộ ảnh Tiny Swords** → **Chọn file .zip** (hoặc **Chọn thư mục** đã giải nén). Ảnh được lưu trong trình duyệt, lần sau mở game tự dùng.
3. **Cho bản đặt trên web** (mọi người truy cập đều thấy ảnh):
   ```bash
   node tools/scan-assets.mjs "đường/dẫn/Tiny Swords (Free Pack).zip"
   # hoặc giải nén vào thư mục assets/ rồi chạy:  npm run assets
   ```
   Lệnh tạo `assets/manifest.json`; game tự đọc khi chạy qua máy chủ web.

Bảng **Bộ ảnh Tiny Swords** trong game cho biết đã khớp bao nhiêu sprite, file nào ứng với khoá nào, bao nhiêu khung hình. Nếu bộ ảnh của bạn đặt tên file khác, thêm tên vào mảng `base` của khoá tương ứng trong [`js/assets/catalog.js`](js/assets/catalog.js); khung hình và điểm neo cũng chỉnh ở đó.

> Giấy phép Tiny Swords cho phép dùng trong game (kể cả thương mại) nhưng **không cho phát tán lại bộ ảnh gốc**. Kho mã này không chứa ảnh Tiny Swords; nếu repo công khai, cân nhắc trước khi commit thư mục `assets/`.

## Điều khiển

| Phím | Tác dụng |
|---|---|
| `W A S D` / mũi tên | Di chuyển Hiệp sĩ |
| Chuột trái | Đi tới · đánh · tương tác · chọn công trình |
| Chuột phải (kéo) | Kéo bản đồ · huỷ thao tác |
| Lăn chuột · `+` `−` | Phóng to / thu nhỏ |
| `Space` | Chém |
| `E` | Tương tác gần nhất: chặt cây, đào đá, gặt, xây, nói chuyện, dắt cừu, dập lửa |
| `1` `2` `3` | Kỹ năng: Chém xoáy · Hiệu triệu · Khiên thép |
| `F` · `H` | Ăn · uống thuốc hồi phục |
| `B` `V` `R` `T` `K` `J` `M` | Xây dựng · Dân làng · Quân đội · Giao thương · Kỹ thuật · Nhiệm vụ · Bản đồ |
| `P` · `C` · `L` · `Esc` | Tạm dừng · về Hiệp sĩ · bật/tắt tên công trình · menu |

Trên điện thoại game luôn hiển thị **màn ngang**: nếu máy đang cầm dọc, màn chơi tự xoay — chỉ cần xoay ngang điện thoại. Cần điều khiển ảo bên trái; Chém, E, kỹ năng, Bản đồ bên phải; chạm để đi/tương tác; một ngón kéo bản đồ, hai ngón phóng to. Khi xây: chạm để chọn chỗ (ruộng, đường, rào: kéo ngón tay chọn cả vùng) rồi bấm **✓ Đặt**, hoặc **✕ Huỷ** để thôi.

**Dời công trình:** chọn công trình → **✥ Di chuyển** → bấm/chạm chỗ mới (điện thoại: bấm **✓ Đặt**). Miễn phí; công trình giữ nguyên tiến độ xây, độ bền, cây trồng, thợ và cừu bên trong. Lâu đài không dời được.

## Có gì trong game

- **Cốt truyện 5 chương**, 26 nhiệm vụ, lựa chọn liên minh có hậu quả, trùm cuối nhiều giai đoạn, chế độ vô tận sau khi thắng.
- **Nông trại theo mùa**: lúa mì, cà rốt, bí ngô; giếng, mưa, hạn; chăn cừu, xén len, sinh sản.
- **Sinh tồn**: dân ăn mỗi sáng, ăn đa dạng thì vui, mùa đông cần gỗ sưởi, đói thì bỏ làng; Hiệp sĩ có thanh no; hoả hoạn, bão, dịch bệnh, trộm.
- **Xây dựng**: 23 loại công trình, 4 bậc vương quốc, 5 chuỗi sản xuất, 9 nghề cho dân tự làm việc, 12 kỹ thuật.
- **Quân sự**: 4 binh chủng khắc chế nhau, quân hàm, hai đội (cận vệ / viễn chinh), tháp canh, tường, trận cướp đêm và Trăng Máu, 4 trại giặc, lính đánh thuê.
- **Giao thương**: giá động theo cung cầu và mùa, 4 khu chợ với nhu cầu khác nhau, uy tín, hợp đồng, tuyến buôn có xe hàng chạy thật trên bản đồ (có thể bị cướp), thương thuyền hàng hiếm, cầu nóng mỗi ngày.
- **14 sự kiện ngẫu nhiên** có lựa chọn, 3 mức độ khó, bản đồ sinh từ seed, lưu 3 ô + tự động.
- Âm thanh và nhạc nền tổng hợp bằng WebAudio (không cần file âm thanh).

## Cấu trúc mã nguồn

```
index.html            Trang game (nạp các script theo thứ tự, không cần build)
css/style.css         Giao diện
js/assets/            Danh mục sprite Tiny Swords, đọc zip, nạp ảnh (IndexedDB / manifest)
js/art/fallback.js    Đồ hoạ dự phòng vẽ bằng code cho mọi sprite
js/core/              Tiện ích, âm thanh, điều khiển
js/data/              Dữ liệu cân bằng, cốt truyện & nhiệm vụ, sự kiện
js/game/              Mô phỏng: bản đồ, tìm đường, thực thể, làng, quân sự, kinh tế, Hiệp sĩ, nhiệm vụ, vòng game
js/render/render.js   Vẽ thế giới, ánh sáng ngày đêm, bản đồ nhỏ
js/ui/                HUD, các bảng chức năng, màn hình chính
tools/                scan-assets.mjs (tạo manifest ảnh), serve.mjs (máy chủ tĩnh), art-preview.html (xem toàn bộ sprite)
tests/                Kiểm thử bằng Node: bản đồ, kinh tế, nông trại, chiến đấu, lưu/tải, tuyến buôn, trận cuối, chơi tự động
docs/thiet-ke-game.md Tài liệu thiết kế
```

## Kiểm thử

```bash
npm test
```

Bộ kiểm thử chạy phần mô phỏng của game trong Node (không cần trình duyệt), gồm cả một "người chơi máy" chơi tự động nhiều ngày và một trận công thành hạ trùm cuối.
