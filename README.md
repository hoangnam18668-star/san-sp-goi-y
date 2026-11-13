# Săn sản phẩm – gợi ý tự động

Kho này do tác vụ tự động của Claude cập nhật mỗi sáng (khoảng 7:30 giờ Việt Nam).

- `feed.json`: danh sách mới nhất. Web Điều Hành tự đọc file này và thêm vào tab **Săn sản phẩm**.
- `archive/goi-y-YYYY-MM-DD.csv`: bản lưu từng ngày (mở được bằng Excel).

Chỉ chứa ý tưởng và link sản phẩm công khai, không có số liệu kinh doanh của công ty.

## Web Điều Hành

- `web/index.html`: bản web Điều Hành mới nhất (một file duy nhất).
- `wrangler.jsonc`: cấu hình để Cloudflare tự đưa web lên `app` (app.nexa-commerce.workers.dev) mỗi khi `web/` thay đổi.

Cloudflare tự đưa web lên khi kho thay đổi (đã nối 11/11/2026).
