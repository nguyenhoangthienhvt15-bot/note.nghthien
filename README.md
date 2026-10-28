# Khoảng Lặng • Personal Journal & Video Web

Một website nhật ký cá nhân tinh giản, thanh nhã được thiết kế theo tiêu chuẩn thủ công cao cấp (**Craft Web Design / Editorial Minimalist**), phục vụ việc viết bài và chia sẻ video đa nền tảng.

---

## 🌿 Điểm Nổi Bật

- **Thẩm mỹ Editorial Minimalist**: Tông nền giấy ấm (`#FBF9F5`), chữ than chì mực in, chế độ đêm than ấm dịu mắt, không gradient tím neon hay hiệu ứng AI-slop.
- **Typography tuyển chọn**: Phối hợp giữa font tiêu đề trang nhã (*Newsreader*), font nội dung tối ưu tiếng Việt (*Be Vietnam Pro*), và font số liệu tinh gọn (*Space Mono*).
- **Hỗ trợ nhúng Video thông minh**:
  - Tự động nhận diện và nhúng video từ **YouTube** (chuẩn và Shorts) với chế độ bảo mật `youtube-nocookie`.
  - Tự động nhúng video từ **Vimeo**.
  - Tự động hiển thị trình phát HTML5 cho các tệp video trực tiếp (**MP4, WebM**).
  - Có khung xem trước video (Live Preview) ngay khi dán liên kết vào form soạn thảo.
- **Zero External Dependencies**: Backend viết bằng 100% module tích hợp của Node.js (`http`, `fs`, `path`). Không cần chạy `npm install`, không sợ lỗi bảo mật hay xung đột gói.
- **Dual-Mode**: Hoạt động linh hoạt với Backend Express/Node REST API hoặc tự động fallback sang `LocalStorage` khi lưu trữ tĩnh.
- **Sao lưu & Khôi phục**: Tích hợp sẵn nút xuất và nhập file dữ liệu JSON ngay tại chân trang.

---

## 📂 Cấu Trúc Dự Án

```text
personal-journal/
├── server.js               # Backend REST API thuần Node.js (Zero Dependencies)
├── package.json            # Thông tin dự án và scripts
├── render.yaml             # Cấu hình tự động triển khai lên Render.com
├── vercel.json             # Cấu hình tự động triển khai lên Vercel
├── .gitignore              # Loại trừ file rác
├── data/
│   └── posts.json          # Cơ sở dữ liệu JSON lưu trữ các bài viết
└── public/
    ├── index.html          # Giao diện chính tinh giản
    ├── style.css           # Hệ thống CSS theo chuẩn craft-web-design
    └── app.js              # Xử lý logic, embed video, tìm kiếm & bộ lọc
```

---

## 🚀 Hướng Dẫn Sử Dụng & Triển Khai

### 1. Chạy trên máy tính cá nhân
Chỉ cần mở terminal tại thư mục dự án và chạy:
```bash
node server.js
```
Mở trình duyệt truy cập: `http://localhost:3000`

---

### 2. Triển khai miễn phí lên Internet (Deploy Online)

#### Lựa chọn A: Render.com (Khuyên dùng cho Full-Stack Node.js)
1. Đẩy mã nguồn lên tài khoản GitHub của bạn:
   ```bash
   git remote add origin <URL_GITHUB_REPO_CUA_BAN>
   git push -u origin master
   ```
2. Truy cập [Render.com](https://render.com) > Đăng nhập > Chọn **New Web Service**.
3. Chọn repo GitHub của bạn. Render sẽ tự nhận diện file `render.yaml`.
4. Bấm **Create Web Service**. Trong 1-2 phút, bạn sẽ nhận được đường dẫn dạng: `https://your-journal.onrender.com`.

#### Lựa chọn B: Vercel (Cực nhanh và mượt)
1. Cài đặt Vercel CLI (nếu có) hoặc truy cập [Vercel.com](https://vercel.com).
2. Kết nối với GitHub repo và bấm **Deploy**. Vercel sẽ đọc file `vercel.json` và phân phối website trên toàn cầu.

#### Lựa chọn C: Netlify Drop / GitHub Pages (Tĩnh 100% không cần server)
Vì website có sẵn cơ chế **Dual-Mode Fallback**, bạn chỉ cần kéo-thả toàn bộ thư mục `public` vào [Netlify Drop](https://app.netlify.com/drop) là trang web sẽ hoạt động ngay lập tức với đầy đủ tính năng tạo bài, xem video và lưu vào máy của bạn!

