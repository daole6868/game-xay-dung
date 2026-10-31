# GƯƠM & LÚA — Tài liệu thiết kế game (GDD)

> Phiên bản 1.0 · Thể loại: nông trại + sinh tồn + xây dựng + quân sự + giao thương · Nền tảng: trình duyệt (PC & điện thoại) · Đồ hoạ: Tiny Swords (Pixel Frog)

---

## 1. Tầm nhìn

**Một câu:** *Bạn là hiệp sĩ cuối cùng của một vương quốc đã mất — tự tay cày ruộng, đốn cây, dựng làng ban ngày, cầm gươm giữ làng ban đêm, rồi buôn bán và kết đồng minh để lấy lại quê hương.*

**Ba trụ cột trải nghiệm**

| Trụ cột | Người chơi cảm thấy | Cơ chế chính |
|---|---|---|
| **Gươm** — hành động | "Tôi đang trực tiếp bảo vệ làng" | Điều khiển Hiệp sĩ, kỹ năng, đánh trận đêm, phá trại, boss |
| **Lúa** — vun đắp | "Làng lớn lên nhờ tôi tính toán" | Nông trại theo mùa, chuỗi sản xuất, dân & lòng dân, nâng bậc |
| **Chợ** — mưu tính | "Mua rẻ chỗ này, bán đắt chỗ kia" | Giá động, 4 khu chợ, hợp đồng, tuyến buôn, uy tín, thương thuyền |

**Nhịp chơi ngày/đêm** là xương sống: ngày là kinh tế, đêm là chiến tranh. Hai nửa nuôi nhau — kinh tế mạnh mới có lính, có lính mới giữ được kinh tế.

---

## 2. Cốt truyện

### Bối cảnh
Năm thứ ba mươi của triều Lam, đạo quân **Huyết Nha** của **Bạo chúa Xích Hoả** vượt biển chiếm kinh thành Lam Quốc trong một đêm. Hiệp sĩ cuối cùng của đội cận vệ (tên do người chơi đặt) đưa nhóm dân sống sót tới **Đất Bình Minh** — hòn đảo hoang có tàn tích một pháo đài cổ.

### Nhân vật

| Nhân vật | Phe | Vai trò |
|---|---|---|
| **Hiệp sĩ** (người chơi) | Lam | Thủ lĩnh, chiến binh mạnh nhất |
| **Quân sư Mạc Tùng** | Lam | Người dẫn dắt, gợi ý chiến lược (bấm E để hỏi bất cứ lúc nào) |
| **Kim Bảo** | Thương hội Kim Sa (vàng) | Lái buôn vui tính, tham tiền; mở cửa giao thương |
| **Sư cô Tịnh Nguyệt** | Tử Nguyệt Tự (tím) | Lãnh đạo tu viện trung lập; y thuật, thuốc men |
| **Tộc trưởng Hắc Sơn** | Hắc Thạch Trại (đen) | Thủ lĩnh thợ mỏ cứng rắn, bị Huyết Nha uy hiếp |
| **Hắc Lang** | Hắc Thạch | Con trai tộc trưởng, bị giam ở Trại Rèn Máu |
| **Bạo chúa Xích Hoả** | Huyết Nha (đỏ) | Trùm cuối |

### Năm chương

| Chương | Tên | Mục tiêu kể chuyện | Nhiệm vụ chính |
|---|---|---|---|
| I | **Tro Tàn** | Sống sót những ngày đầu | Gặp quân sư → 20 gỗ → lửa trại → phục dựng lâu đài → nhà dân → khai hoang 4 ruộng → **Đêm đầu tiên** (trận cướp đầu) |
| II | **Hạt Giống** | Từ trại thành làng | Gặt 15 nông sản · đạt 8 dân · gặp Kim Bảo ở cảng · nâng bậc Làng · xây Chợ, bán 150 vàng · nuôi 3 cừu |
| III | **Lưỡi Gươm Lam** | Có quân, phản công | Lò rèn + 6 vũ khí · 4 binh sĩ · tháp canh · **phá Tiền đồn Đông** · gặp Sư cô · mang 15 bánh mì tới tự viện (mở khoá Tu sĩ) |
| IV | **Liên Minh** | Chọn bạn, chọn thù | Nâng bậc Thị trấn · gặp Tộc trưởng → **lựa chọn**: hứa cứu Hắc Lang hoặc từ chối · 3 chuyến buôn · phá Trại Sói Đỏ |
| V | **Bình Minh** | Trận quyết chiến | Tập hợp 14 binh sĩ (đồng minh tới giúp) · công phá Thành Huyết Nha, hạ Xích Hoả |

**Lựa chọn có hậu quả (chương IV):**
- *Hứa cứu Hắc Lang* → mở nhiệm vụ phá Trại Rèn Máu. Thành công: uy tín Hắc Thạch +50, giá vũ khí/quặng rẻ hơn, thuê lính rẻ hơn, và **6 dũng sĩ Hắc Thạch** (4 Kỵ thương + 2 Kiếm sĩ) tham chiến trận cuối.
- *Từ chối* → uy tín −30, Hắc Thạch đứng ngoài, không còn hợp đồng từ họ.
- Nếu uy tín Tử Nguyệt Tự ≥ 30 khi bắt đầu chương V, tự viện cử **2 tu sĩ** theo quân.

Sau khi thắng, game chuyển sang **chế độ vô tận**: cướp biển vẫn tới, vương quốc tiếp tục lớn.

---

## 3. Vòng lặp chơi

```
          ┌──────────── NGÀY (06:00–20:00) ────────────┐
          │ dân làm việc → thu tài nguyên → sản xuất   │
          │ Hiệp sĩ: khám phá, buôn bán, chặt/đào, xây │
          └───────────────┬────────────────────────────┘
                 18:00 thám báo báo giặc
          ┌───────────────▼──────── ĐÊM ───────────────┐
          │ dân vào nhà · tháp & lâu đài bắn tên        │
          │ Hiệp sĩ + quân đánh cướp · dập lửa          │
          └───────────────┬────────────────────────────┘
                 06:00 BÌNH MINH
          ┌───────────────▼────────────────────────────┐
          │ dân ăn · thuế · lương lính · dân mới tới     │
          │ giá chợ hồi · hợp đồng mới · SỰ KIỆN         │
          └────────────────────────────────────────────┘
```

- **Vòng ngắn (phút):** chặt cây, đánh quái, đặt công trình, bán một mẻ hàng.
- **Vòng trung (ngày):** cân đối lương thực, lòng dân, chuẩn bị cho đêm, nhận/giao hợp đồng.
- **Vòng dài (mùa/chương):** tích trữ cho mùa đông, nâng bậc, nghiên cứu, phá trại, liên minh.

---

## 4. Thời gian & mùa

| Thông số | Giá trị |
|---|---|
| Một ngày | 300 giây thực ở tốc độ 1x (có x2, x3, tạm dừng) |
| Đêm | 20:00 → 05:00 |
| Một mùa | 5 ngày · Xuân → Hạ → Thu → Đông |
| Trăng Máu | Mỗi đêm thứ 8 — trận cướp gấp đôi, trời đỏ máu |

| Mùa | Cây lớn | Đặc điểm |
|---|---|---|
| Xuân | ×1.1 | Cừu sinh con |
| Hạ | ×1.25 | Bí ngô ưa nắng · có thể hạn hán |
| Thu | ×0.9 | Lương thực rẻ (×0.8) · lễ hội mùa màng |
| Đông | ×0 | Ruộng ngừng lớn · dân cần gỗ sưởi (1 gỗ/3 dân/ngày) · lương thực đắt ×1.45 · gỗ đắt ×1.35 |

Quân sư cảnh báo một ngày trước mùa đông nếu kho lương không đủ.

---

## 5. Sinh tồn

### Lương thực
Mỗi sáng: dân ăn **2 điểm no**, lính **2–3**. Dân ăn **luân phiên các món** cho phép trong *Khẩu phần* (bỏ chọn để giữ món đó lại bán).

| Món | Điểm no | Giá gốc | Nguồn |
|---|---|---|---|
| Quả mọng | 1 | 1 | Hái lượm bụi cây |
| Lúa mì | 1 | 2 | Ruộng |
| Cà rốt | 1 | 2 | Ruộng |
| Cá | 2 | 4 | Bến cá |
| Bí ngô | 3 | 5 | Ruộng (cần mua hạt) |
| Thịt | 3 | 5 | Giết cừu |
| Bánh mì | 3 | 8 | Lúa → Bột → Bánh |
| Món hầm | 7 | 18 | Thịt + 2 cà rốt |

**Thiếu ăn:** lòng dân giảm mạnh, tối đa 10% dân bỏ đi mỗi ngày, lính đào ngũ.

### Lòng dân (0–100)
| Tăng | Giảm |
|---|---|
| Ăn nhiều món (+2/món từ món thứ 2, tối đa +8) | Thiếu ăn (−6 đến −25) |
| Thuế nhẹ/miễn thuế (+2/+6) | Thuế nặng/hà khắc (−5/−11) |
| Tu viện +2, Tượng đài +3, Lửa trại mùa đông | Rét mùa đông thiếu gỗ (−6) |
| Thắng trận, phá trại, lễ hội, nâng bậc | Dân/lính hy sinh, mất công trình |

Lòng dân kéo dần về 50. **Hiệu ứng:** tốc độ làm việc ×0.7 → ×1.2; số dân mới mỗi sáng (1/2/3 người khi lòng dân ≥35/55/75); dưới 15 có người bỏ làng.

### Hiệp sĩ
Thanh **No** giảm hết trong ~1.6 ngày (tự ăn khi đói, có thể tắt). Hết no thì mất máu. Hồi máu ngoài giao tranh, nhanh hơn gần lâu đài. Gục ngã → hồi sinh ở lâu đài sau 10 giây, mất 10% vàng.

### Hiểm hoạ khác
Hoả hoạn (lan từ giặc phóng hoả hoặc sự kiện; giếng gần đó giúp lửa tắt nhanh), bão, hạn hán, dịch bệnh cừu, kẻ trộm.

---

## 6. Nông trại & chăn nuôi

| Cây | Thời gian | Sản lượng | Mùa tốt |
|---|---|---|---|
| Lúa mì | 1.6 ngày | 4 | Xuân/Hạ/Thu |
| Cà rốt | 1.2 ngày | 3 | Xuân/Hạ/Thu |
| Bí ngô | 2.4 ngày | 3 | Hạ/Thu (mở khoá bằng hạt giống mua ở thương thuyền) |

- Ruộng 1×1 ô, kéo chuột để đặt cả mảng. Nông dân tự **gieo → gặt → dọn**. Cây chín quá 2.5 ngày sẽ **héo**.
- **Giếng**: ruộng trong 4 ô lớn nhanh hơn 25%, chịu hạn. Mưa: ×1.5. Hạn: ×0.5.
- **Cừu**: dắt cừu hoang về chuồng (đứng cạnh, E, tốn 1 cà rốt) hoặc mua. Len mọc mỗi ~1.2 ngày (trừ mùa đông), Mục đồng xén 2 len. Mùa xuân, chuồng có ≥2 cừu có 50% sinh con mỗi sáng. Có thể giết thịt (+4 thịt).

---

## 7. Xây dựng

### Bậc vương quốc

| Bậc | Điều kiện | Mở khoá |
|---|---|---|
| 1. Trại tị nạn | — | Nhà, ruộng, lửa trại, giếng, kho, chuồng, đường, rào, cổng |
| 2. Làng | 6 dân · 80 gỗ · 40 đá · 100 vàng | Cối xay, lò bánh, lò rèn, xưởng dệt, nhà bếp, bến cá, chợ, doanh trại, tháp canh |
| 3. Thị trấn | 14 dân · 150 gỗ · 120 đá · 400 vàng · 15 công cụ | Trường bắn, tu viện, tường đá, tượng đài, Kỵ thương |
| 4. Kinh thành | 24 dân · 250 đá · 1000 vàng · 30 công cụ · 20 vải | Lâu đài mạnh nhất, thêm chỗ ở |

### Công trình (22 loại người chơi xây được + Lâu đài)

| Nhóm | Công trình | Chức năng |
|---|---|---|
| Cơ bản | Nhà dân, Ruộng, Lửa trại, Giếng, Nhà kho, Chuồng cừu, Đường đất | Chỗ ở, nông nghiệp, ánh sáng, điểm gom hàng, tốc độ di chuyển +35% |
| Sản xuất | Cối xay gió (2 lúa→1 bột), Lò bánh (1 bột→1 bánh), Lò rèn (vũ khí / công cụ), Xưởng dệt (2 len→1 vải), Nhà bếp (thịt + 2 cà rốt→món hầm), Bến cá, Chợ | Chuỗi giá trị gia tăng |
| Quân sự | Doanh trại, Trường bắn, Tu viện, Tháp canh, Hàng rào, Cổng gỗ, Tường đá, Tượng đài | Luyện quân, phòng thủ, lòng dân |

Công trình đặt xong là **công trường**: thợ xây hoặc Hiệp sĩ góp công. Hư hại được thợ xây sửa (tốn chút gỗ). Phá bỏ hoàn 40% (công trường chưa xong hoàn 90%).

### Chuỗi sản xuất

```
Lúa mì ──(Cối xay)──► Bột mì ──(Lò bánh)──► Bánh mì ──► ăn / bán cho Tử Nguyệt Tự (×1.45)
Len ──(Xưởng dệt)──► Vải ──► Cung thủ, Trường bắn, Kinh thành, bán
Quặng + Gỗ ──(Lò rèn)──► Vũ khí ──► luyện lính
                     └──► Công cụ ──► nâng bậc, nghiên cứu
Thịt + Cà rốt ──(Nhà bếp)──► Món hầm ──► ăn (7 no) / bán cho Hắc Thạch (×1.6)
Cà rốt + Bí ngô ──(Tu viện)──► Thuốc hồi phục ──► Hiệp sĩ, luyện Tu sĩ
```

### Dân làng & nghề
9 nghề: Tiều phu, Thợ đá, Thợ mỏ, Hái lượm, Nông dân, Mục đồng, Thợ xây, Thợ xưởng, Thương lái. Người chơi đặt **số lượng mỗi nghề**; dân tự tìm việc, tự mang hàng về kho gần nhất, ban đêm về nhà, chạy trốn khi thấy giặc.

---

## 8. Quân sự

### Binh chủng

| Đơn vị | Máu | Công | Tầm | Chi phí | Lương/ngày | Khắc |
|---|---|---|---|---|---|---|
| Kiếm sĩ | 150 | 14 | gần | 30v + 2 vũ khí | 2 | Kỵ thương ×1.5 |
| Cung thủ | 85 | 11 | 5 ô | 35v + 1 vũ khí + 2 vải | 2 | Kiếm sĩ ×1.3 |
| Kỵ thương | 200 | 22 | gần | 60v + 3 vũ khí | 3 | Cung thủ, Tu sĩ ×1.6 |
| Tu sĩ | 75 | hồi 16 | 3.5 ô | 50v + 2 thuốc | 2 | Chữa trị đồng đội |

Lính lên **3 cấp quân hàm** (3/8/16 mạng hạ), mỗi cấp +12% máu & công.

### Chỉ huy
- **Đội cận vệ**: đi theo Hiệp sĩ, đánh trong tầm 7 ô quanh tướng.
- **Đội viễn chinh**: giữ lâu đài (tự ứng cứu báo động) hoặc **tấn công một điểm** chọn trên bản đồ.
- **Hiệp sĩ**: Chém xoáy (cấp 2), Hiệu triệu (cấp 4: quân +30% công, +15% tốc, hồi 20% máu), Khiên thép (cấp 6: giảm 70% sát thương).
- **Lính đánh thuê Hắc Thạch**: 3 lính trong 3 ngày, không ăn không lương.

### Kẻ địch
- **Trận cướp đêm**: từ ngày 3, xác suất tăng dần (tối đa 85%; Trăng Máu chắc chắn). Quy mô = (3 + 1.25 × ngày) × độ khó × (Trăng Máu ×2) × (−15%/trại đã phá), **giới hạn theo bậc vương quốc** (5/12/24/không giới hạn) để giặc lớn lên cùng người chơi. Thành phần mở dần: Cướp → Đao binh → Kẻ phóng hoả → Xạ thủ → Thiết kỵ → Pháp sư.
- Giặc đi theo đường tới lâu đài; gặp tường/rào thì **đập phá** (tạo điểm giữ chân cho tháp canh). Trời sáng, giặc còn sống rút lui.
- **4 trại Huyết Nha** có quân đồn trú, tháp bắn tên và hồi quân mỗi ngày: Tiền đồn Đông (5 quân), Trại Sói Đỏ (10), Trại Rèn Máu (10, giam Hắc Lang), Thành Huyết Nha (21 + boss).
- **Boss Xích Hoả**: 2400 máu, giáp 8, đòn dậm đất gây sát thương vùng mỗi 7 giây, gọi viện binh ở 60% và 30% máu.
- Phá trại: rương chiến lợi phẩm, +10 lòng dân, vùng đất lộ ra mỏ vàng/đá mới, giặc đêm thưa đi, tuyến buôn an toàn hơn.

---

## 9. Kinh tế & giao thương

### Giá động
```
giá = giá gốc × hệ số mùa × e^(−0.022 × cung) × (cầu nóng)
```
- Mỗi món bán ra làm **cung +1** tại khu chợ đó (giá tụt dần), mua vào làm cung −1. Mỗi sáng cung hồi về 72%.
- **Cầu nóng**: mỗi ngày 60% có một món được Thương hội săn với giá ×1.5–2.
- **Chợ làng** (cần xây Chợ): mua/bán mọi thứ, chênh lệch 15% (7% với kỹ thuật Hội buôn) → không thể mua bán vòng tại chỗ để lời.

### Bốn khu chợ — cơ hội chênh lệch giá

| Nơi | Bán rẻ | Mua đắt |
|---|---|---|
| Chợ làng | — | — (giá chuẩn) |
| Cảng Kim Sa | Mọi thứ (×1.1–1.3) · **thương thuyền** hàng hiếm mỗi 5 ngày | Mọi thứ (×0.8–0.95) |
| Tử Nguyệt Tự | **Thuốc ×0.7** | Bánh ×1.45, Len ×1.35, Bí ngô ×1.4, Quả mọng ×1.5, Cá ×1.3 |
| Hắc Thạch | **Đá ×0.6, Quặng ×0.7, Vũ khí ×0.85** | Thịt ×1.5, Món hầm ×1.6, Vải ×1.3, Bánh ×1.3 |

Phải đưa Hiệp sĩ tới tận nơi để mua bán (xem giá từ xa được). **Uy tín** (−100…100) với từng thế lực làm giá tốt/xấu tới ±20%, tăng khi buôn bán và làm hợp đồng.

### Hợp đồng
3 lời mời từ các thế lực đã gặp, làm mới mỗi 2 ngày: "giao N món trong 3–5 ngày" → thưởng ~1.5–2× giá trị + uy tín. Quá hạn: −8 uy tín.

### Tuyến buôn
Mở ở Chợ: chọn thị trấn, hàng xuất (số lượng/chuyến), hàng nhập. Một **Thương lái** đẩy xe hàng đi thật trên bản đồ, bán, mua hàng nhập bằng tiền vừa kiếm, rồi quay về. **Nguy cơ bị cướp** tính theo các trại giặc còn sống gần đường đi (tháp canh giảm nhẹ) → gắn kinh tế với quân sự.

### Hàng hiếm (thương thuyền)
Hạt giống bí ngô · Cặp cừu giống · Kiếm thép Lam (+8 công) · Giáp vảy rồng (+3 giáp, +60 máu) · Giống lúa vàng (+2 lúa mỗi lần gặt) · Tù và chiến (Hiệu triệu hồi nhanh ×2) · Hòm 5 thuốc · Đón 3 dân di cư.

### Dòng tiền
**Vào:** thuế (theo dân × mức thuế × lòng dân), bán hàng, hợp đồng, chiến lợi phẩm, nhiệm vụ. **Ra:** lương lính mỗi sáng, chi phí xây/luyện/nghiên cứu, hàng nhập, cống nạp. Nợ lương → lòng dân giảm.

---

## 10. Kỹ thuật (12)

| Kinh tế | Nông nghiệp | Quân sự |
|---|---|---|
| Rìu thép: khai thác +30% | Cuốc sắt: +1 nông sản/lần gặt | Giáp xích: +2 giáp |
| Bánh xe: mang ×2, đoàn buôn +50% | Thuỷ lợi: cây +30%, chịu hạn | Kiến trúc đá: công trình +40% bền, tháp +25% |
| Hội buôn: chênh lệch giá ½, hợp đồng +25% | Chăn nuôi: cừu sinh cả năm, len +50% | Cung dài: cung & tháp +20% tầm và công |
| Ngân khố: thuế +50% | Nhà kính: ruộng lớn cả mùa đông | Kỷ luật: lương −30%, máu lính +15% |

---

## 11. Sự kiện ngẫu nhiên (chống nhàm chán)

Mỗi bình minh (từ ngày 3) có 55% xảy ra một sự kiện với **lựa chọn**:

| Sự kiện | Lựa chọn tiêu biểu |
|---|---|
| Người tị nạn | Đón (+dân, −lương) / cho lương khô / đuổi (−lòng dân) |
| Sứ giả Huyết Nha | Nộp cống (đêm yên) / đuổi cổ (giặc ×1.5, +khí thế) |
| Lễ hội mùa màng | Hội lớn / hội nhỏ / bỏ qua |
| Kẻ trộm | Đuổi theo bắt lại vàng |
| Lữ khách áo choàng | Mua bản đồ kho báu / không tin |
| Mối hàng lớn | Bán gấp đôi giá cho Kim Bảo |
| Người thợ lành nghề | Trả 80 vàng: xưởng nhanh hơn 20% vĩnh viễn |
| Mưa rào / Hạn hán / Bão biển / Hoả hoạn / Dịch cừu / Mạch vàng / Cừu hoang | Tác động thời tiết, tài nguyên, thảm hoạ |

**Các nguồn đa dạng khác:** mùa thay đổi luật chơi, Trăng Máu, thương thuyền, cầu nóng hằng ngày, lựa chọn liên minh, đường đi tuyến buôn, boss nhiều giai đoạn.

---

## 12. Độ khó

| | Dễ | Thường | Khó |
|---|---|---|---|
| Quy mô cướp | ×0.6 | ×1 | ×1.45 |
| Sát thương giặc | ×0.75 | ×1 | ×1.2 |
| Tài nguyên khởi đầu | ×1.5 | ×1 | ×0.8 |
| Lương lính | ×0.7 | ×1 | ×1.2 |

---

## 13. Giao diện & điều khiển

- **HUD trên**: vàng, ngày/mùa/giờ/thời tiết, dân/chỗ ở, lòng dân, lương thực (+ số ngày đủ ăn), quân số, cảnh báo giặc/Trăng Máu, tiến độ nghiên cứu, tốc độ.
- **Trái**: theo dõi nhiệm vụ + mũi tên chỉ đường trên bản đồ. **Phải**: bản đồ nhỏ (bấm để di chuyển camera).
- **Dưới**: máu/no/kinh nghiệm Hiệp sĩ, kỹ năng, nút 6 bảng chức năng.
- Điện thoại: cần điều khiển ảo, nút Chém/E/Bản đồ, chạm để đi/tương tác, hai ngón để phóng to.
- Phong cách: nền xanh đêm, nút xanh lam, chữ nghiêng đậm — đồng bộ với các bản "Game do Claude làm" trước.

---

## 14. Đồ hoạ — ánh xạ Tiny Swords

| Trong game | Tài nguyên Tiny Swords (Free Pack) |
|---|---|
| Hiệp sĩ, Kiếm sĩ | Units/Blue Units/Warrior (Idle, Run, Attack1, Attack2, Guard) |
| Dân làng | Units/Blue Units/Pawn (Idle, Run, Interact Axe/Pickaxe/Hammer/Knife, Idle/Run Wood/Gold/Meat) |
| Cung thủ, Kỵ thương, Tu sĩ | Units/Blue Units/Archer, Lancer, Monk |
| Quân Huyết Nha | Units/Red Units/* |
| Thương hội / Tự viện / Hắc Thạch | Units & Buildings màu Yellow / Purple / Black |
| Lâu đài, Nhà, Tháp, Doanh trại, Trường bắn, Tu viện | Buildings/Blue Buildings/Castle, House1–3, Tower, Barracks, Archery, Monastery |
| Lò bánh, Lò rèn, Xưởng dệt, Nhà bếp | House1–3 + biểu tượng sản phẩm |
| Cây, gốc cây, bụi, đá, mỏ vàng, cừu | Terrain/Resources & Decorations |
| Bọt sóng, cháy, nổ, bụi | Terrain/Tileset/Water Foam, Particle FX |
| Ruộng, cây trồng, giếng, chợ, cối xay, chuồng, tường, cổng, chân dung, biểu tượng | Vẽ bằng code (bản Free Pack không có) |

Toàn bộ danh mục nằm ở `js/assets/catalog.js` (khoá sprite → tên file, khung hình, điểm neo).

---

## 15. Kiến trúc kỹ thuật

- HTML5 Canvas 2D + JavaScript thuần, **không cần build**, chạy cả khi mở trực tiếp file `index.html`.
- Mô phỏng tách khỏi phần vẽ (`js/game/*` không đụng DOM) → kiểm thử được bằng Node.
- Bước mô phỏng cố định ≤ 50 ms; lưới không gian 128 px cho truy vấn gần; A* 8 hướng ưu tiên đường đất; trại giặc "ngủ" khi không có quân ta trong 17 ô.
- Lưu game: `localStorage` (3 ô + tự động mỗi sáng và khi đóng tab). Bản đồ tái tạo từ seed, chỉ lưu phần thay đổi.
- Ảnh Tiny Swords: nạp từ zip/thư mục ngay trong game (giải nén bằng `DecompressionStream`, lưu IndexedDB) hoặc qua `assets/manifest.json`.

---

## 16. Lộ trình mở rộng (đề xuất)

1. Nhiều người chơi hợp tác (một người lo kinh tế, một người cầm quân).
2. Hải chiến & thuyền buôn đi tuyến biển.
3. Bản đồ chiến dịch nhiều đảo, giải phóng từng đảo.
4. Nhân vật phụ có tên, thăng cấp nghề, quan hệ gia đình trong làng.
5. Chế độ thử thách theo tuần (seed cố định, bảng xếp hạng).
