# Thư mục ảnh Tiny Swords

Đặt bộ ảnh Tiny Swords ở đây nếu muốn bản game chạy trên web tự dùng ảnh thật:

```bash
# từ file zip (chỉ chép những ảnh game dùng vào assets/ts/)
node tools/scan-assets.mjs "Tiny Swords (Free Pack).zip"

# hoặc giải nén cả bộ vào thư mục này rồi chạy
npm run assets
```

Lệnh sẽ tạo `assets/manifest.json`. Nếu chỉ chơi trên máy mình, dùng nút **Bộ ảnh Tiny Swords** trong game là đủ.
