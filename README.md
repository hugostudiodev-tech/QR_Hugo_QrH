# QR Hugo

Studio tạo mã QR mang phong cách riêng, chạy trên Cloudflare Workers + Static Assets.

## Tính năng

- 8 loại nội dung: link, văn bản, Wi-Fi, email, gọi điện, SMS, danh thiếp vCard, vị trí.
- 7 kiểu chấm, 6 kiểu mắt, gradient chéo/tỏa tròn, màu mắt riêng, nền trong suốt, 6 mẫu có sẵn.
- Logo: biểu tượng hoặc chữ viết tắt (đổi màu, 5 hình nền) hoặc ảnh tải lên; tự lấy màu chủ đạo của logo để gợi ý phối màu.
- Đo độ tương phản (dễ quét / khó quét) và nút tự sửa.
- Khung trang trí (thẻ, dải chữ, nút bo) kèm gợi ý chữ theo loại nội dung.
- Tải PNG (tối đa 2048px) / SVG, sao chép ảnh.
- i18next: tiếng Việt + English; các ngôn ngữ khác dùng dịch máy (Google Translate proxy, chỉ chạy trên domain đã deploy).
- Lazy-load + skeleton cho các phần dưới, âm thanh WebAudio (có nút tắt), sáng/tối theo thiết bị.
- SEO: sitemap.xml, robots.txt, hreflang, JSON-LD (WebApplication + FAQ).
- API `GET /api/qr` (xem `GET /api`) và thư viện npm `qr-hugo` trong [lib/](lib/) (core, Web Component, React).

Thêm ngôn ngữ dịch tay: tạo `src/locales/<code>.js` (copy `en.js`) rồi thêm một dòng vào `LANGS` và `loaders` trong `src/i18n.js`.

Phát hành thư viện: `cd lib && npm publish`. Web và API import `qr-hugo` qua `"qr-hugo": "file:lib"`, nên sửa trong `lib/` là cả ba cùng đổi.

Hosting: production chạy trên **Vercel** (`vercel.json`; API nằm ở `api/qr.js` và `api/index.js`, gọi lại đúng handler trong `worker/index.js`). Có thể deploy lên Cloudflare Workers bằng `npm run deploy`, vẫn dùng chung handler đó.

## Yêu cầu

- Node.js 20.19 trở lên.
- npm 10 trở lên.
- Tài khoản Cloudflare miễn phí nếu muốn deploy.

## Chạy giao diện trên máy

```bash
git clone https://github.com/hugostudiodev-tech/QR_Hugo_QrH.git
cd QR_Hugo_QrH
npm install
npm run dev
```

Mở `http://localhost:3000`. Chế độ này chỉ chạy giao diện. Trình tạo và tải QR vẫn hoạt động hoàn toàn trong trình duyệt.

## Chạy đầy đủ website + API trên máy

Terminal 1:

```bash
npm run build
npx wrangler dev
```

Worker chạy tại `http://localhost:8787`. Mở địa chỉ này để kiểm tra cả website và `/api/qr`.

Nếu muốn vừa sửa giao diện bằng Vite vừa gọi API local, giữ Worker ở terminal 1 rồi mở terminal 2:

```bash
npm run dev
```

Vite tự chuyển các request `/api/*` sang Worker ở cổng `8787`.

## Kiểm tra và build production

```bash
npm run check
```

Lệnh này kiểm tra API và build frontend vào thư mục `dist/`. Có thể chỉ build bằng:

```bash
npm run build
```

## Deploy trực tiếp bằng Wrangler

Đăng nhập Cloudflare một lần:

```bash
npx wrangler login
```

Sau đó deploy:

```bash
npm run deploy
```

Wrangler sẽ build, kiểm tra rồi tạo/cập nhật Worker tên `qr-hugo`. URL tạm có dạng `https://qr-hugo.<subdomain>.workers.dev`.

## Tự động deploy từ GitHub

1. Mở Cloudflare Dashboard → **Workers & Pages**.
2. Chọn **Create application** → **Import a repository**.
3. Kết nối GitHub và chọn `hugostudiodev-tech/QR_Hugo_QrH`.
4. Giữ nhánh production là `main`.
5. Build command: `npm run build`.
6. Deploy command: `npx wrangler deploy`.
7. Root directory để trống vì `package.json` nằm ngay gốc repo.
8. Lưu cấu hình. Từ đây mỗi lần push lên `main`, Cloudflare sẽ build và deploy tự động.

## Gắn tên miền `qr.hugowishpax.studio`

Sau khi Worker deploy thành công:

1. Cloudflare Dashboard → **Workers & Pages** → Worker **qr-hugo**.
2. Mở **Settings** → **Domains & Routes**.
3. Chọn **Add** → **Custom Domain**.
4. Nhập `qr.hugowishpax.studio` rồi xác nhận.
5. Cloudflare tự tạo DNS record và chứng chỉ SSL nếu zone `hugowishpax.studio` nằm trong cùng tài khoản.
6. Chờ trạng thái domain chuyển sang **Active**, sau đó mở `https://qr.hugowishpax.studio`.

Không cần tạo database, API key hay biến môi trường.

## API công khai

```http
GET /api/qr?url=https%3A%2F%2Fexample.com
```

Ví dụ đầy đủ:

```text
https://qr.hugowishpax.studio/api/qr?url=https%3A%2F%2Fexample.com&size=512&foreground=%23111827&background=%23ffffff&level=M
```

Tham số:

| Tên | Mô tả | Mặc định |
| --- | --- | --- |
| `url` | Link HTTP/HTTPS, bắt buộc, tối đa 2.048 ký tự | — |
| `size` | Kích thước từ 128 đến 1024 px | `512` |
| `foreground` | Màu QR dạng `#RRGGBB` | `#111827` |
| `background` | Màu nền dạng `#RRGGBB` | `#ffffff` |
| `level` | Mức sửa lỗi `L`, `M`, `Q`, `H` | `M` |
| `download` | Đặt `1` để tải file thay vì hiển thị | — |

API trả `image/svg+xml`, cho phép CORS từ mọi origin và không ghi link vào bộ nhớ hay database.

## Cấu trúc

```text
src/              Giao diện React
worker/           API Cloudflare Worker
public/           Favicon và security headers
scripts/          Self-check nhỏ cho API
wrangler.jsonc    Cấu hình deploy Cloudflare
```

## Giấy phép

MIT — tự do sử dụng, chỉnh sửa và đóng góp cho cộng đồng.
