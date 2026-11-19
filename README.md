# Astrolog Web

Bản web của Astrolog 7.80: lõi C++ gốc (kèm Swiss Ephemeris) được biên dịch sang WebAssembly,
giao diện mới bằng HTML/JS. Mọi phép tính chạy ngay trong trình duyệt, không gửi dữ liệu đi đâu.
Cài được lên điện thoại và máy tính như một ứng dụng (PWA), dùng được cả khi không có mạng.

## Chạy trên máy

```powershell
python -m http.server 8765 --directory D:\Astrolog\web\public
```

Sau đó mở http://localhost:8765. Trên Chrome hoặc Edge sẽ có nút "Cài app" ở góc trên.

## Cài lên điện thoại

App phải chạy trên một địa chỉ HTTPS (ví dụ GitHub Pages, xem phần dưới).

- **Android (Chrome):** mở địa chỉ của app, bấm nút "Cài app" (hoặc menu ⋮ → Cài đặt ứng dụng).
- **iPhone/iPad (Safari):** mở địa chỉ của app, bấm Chia sẻ → Thêm vào MH chính.

Sau lần mở đầu tiên, app tự lưu toàn bộ lõi tính toán và lịch thiên văn (~5 MB) về máy.

## Đưa lên mạng (GitHub Pages)

Thư mục này là một dự án tự chứa. Khi đẩy lên nhánh `main` của một repo GitHub,
quy trình `.github/workflows/pages.yml` tự triển khai thư mục `public/` lên GitHub Pages
(trong Settings → Pages của repo, chọn Source: GitHub Actions).

**Khi sửa bất kỳ file nào trong `public/`**, tăng `VERSION` trong `public/sw.js` để các máy đã cài nhận bản mới.

## Biên dịch lại lõi

Cần WSL Ubuntu đã cài Emscripten SDK ở `~/emsdk`.

```powershell
wsl -e bash /mnt/d/Astrolog/web/build.sh
```

Script chép `astrolog-source/` sang `.build/`, tắt phần giao diện Windows trong bản chép rồi biên dịch.
Nếu có bản cài Astrolog đầy đủ ngay cạnh thư mục này (`..\atlas.as`, `..\ephem\`…), dữ liệu trong
`public/data/` cũng được làm mới từ đó.

## Cấu trúc

- `astrolog-source/`: mã nguồn Astrolog 7.80 (nguyên bản, kèm giấy phép).
- `public/engine.js`: nạp và chạy lõi WebAssembly, chuyển kết quả chữ của Astrolog sang HTML.
- `public/atlas.js`: tìm thành phố trong `atlas.as`, tính múi giờ lịch sử bằng dữ liệu IANA của trình duyệt.
- `public/chartdata.js`: đọc kết quả của Astrolog (`-o0` cho vị trí, `-a` cho góc chiếu) thành dữ liệu có cấu trúc; tên tiếng Việt.
- `public/wheel.js`: vẽ bánh xe lá số bằng SVG, chạm vào hành tinh để làm nổi bật góc chiếu.
- `public/glyphs.js`: ký hiệu hành tinh, cung, góc chiếu dạng vector (không phụ thuộc font hay emoji).
- `public/app.js`: giao diện (form, các tab, lá số đã lưu, cài app). Tab "Cổ điển" giữ nguyên hình và bảng gốc của Astrolog.
- `public/sw.js`, `public/manifest.webmanifest`: phần PWA (cài app, chạy offline).

## Giấy phép

- Astrolog © Walter D. Pullen, phát hành theo GNU GPL v2 (`astrolog-source/license.htm`).
- Swiss Ephemeris © Astrodienst AG, dùng theo GNU AGPL (hoặc giấy phép thương mại của Astrodienst).
- Dữ liệu thành phố từ GeoNames (CC BY 4.0), múi giờ từ IANA TZ database (public domain).

Khi phát hành công khai bản WebAssembly, phải kèm mã nguồn tương ứng. Repo này đã kèm sẵn
`astrolog-source/` và toàn bộ mã giao diện.
