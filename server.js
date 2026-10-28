/**
 * Khoảng Lặng - Zero-Dependency Personal Journal Server
 * Sử dụng 100% module tích hợp của Node.js (http, fs, path, url)
 * KHÔNG cần `npm install` - Chạy ngay lập tức với `node server.js`
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'posts.json');

// MIME types thông dụng
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

// Khởi tạo thư mục và file dữ liệu nếu chưa có
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const defaultData = [
      {
        id: "post-1",
        title: "Mùa thu Hà Nội và những khoảng dừng bình yên",
        category: "Video",
        videoUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
        content: "Gió heo may chớm lạnh trên những con phố rợp bóng xà cừ. Buổi sáng pha một ấm trà sen, mở bản nhạc êm này và ngắm nhìn nhịp sống ngoài ban công trôi chầm chậm. Đôi khi, điều xa xỉ nhất của người trưởng thành chỉ là được sống trọn vẹn trong một khoảng lặng không vội vã.",
        date: "28/10/2026",
        timestamp: 1793184600000
      },
      {
        id: "post-2",
        title: "Về sự giản lược trong cách sống và cách viết",
        category: "Tản văn",
        videoUrl: "",
        content: "Càng sống nhiều, người ta càng nhận ra giá trị của sự tiết chế. Bớt đi những đồ vật không dùng, lọc bớt những mối quan hệ xã giao gượng gạo, và giản lược những câu từ hoa mỹ để giữ lại những điều chân thực nhất.",
        date: "27/10/2026",
        timestamp: 1793098200000
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

function readPosts() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Lỗi đọc file dữ liệu:", err);
    return [];
  }
}

function writePosts(posts) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}

// Hàm hỗ trợ trả về JSON
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Hàm đọc body của HTTP request
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 10 * 1024 * 1024) { // Giới hạn 10MB
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Phục vụ Static Files
function serveStaticFile(res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback về index.html cho Single Page Application
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
}

// Khởi tạo HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // --- API Routes ---
  if (pathname === '/api/health') {
    sendJSON(res, 200, { status: 'ok', uptime: process.uptime() });
    return;
  }

  // GET /api/posts
  if (pathname === '/api/posts' && method === 'GET') {
    const { category, q } = parsedUrl.query;
    let posts = readPosts();

    if (category && category !== 'all') {
      posts = posts.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase());
    }

    if (q && q.trim()) {
      const keyword = q.trim().toLowerCase();
      posts = posts.filter(p =>
        (p.title && p.title.toLowerCase().includes(keyword)) ||
        (p.content && p.content.toLowerCase().includes(keyword))
      );
    }

    posts.sort((a, b) => b.timestamp - a.timestamp);
    sendJSON(res, 200, posts);
    return;
  }

  // POST /api/posts
  if (pathname === '/api/posts' && method === 'POST') {
    try {
      const data = await getRequestBody(req);
      const { title, content, category, videoUrl } = data;

      if (!title || !title.trim()) {
        sendJSON(res, 400, { error: 'Tiêu đề không được để trống' });
        return;
      }
      if (!content || !content.trim()) {
        sendJSON(res, 400, { error: 'Nội dung không được để trống' });
        return;
      }

      const posts = readPosts();
      const now = new Date();
      const formattedDate = new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(now);

      const newPost = {
        id: 'post-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: title.trim(),
        category: category && category.trim() ? category.trim() : 'Suy ngẫm',
        videoUrl: videoUrl ? videoUrl.trim() : '',
        content: content.trim(),
        date: formattedDate,
        timestamp: Date.now()
      };

      posts.unshift(newPost);
      writePosts(posts);

      sendJSON(res, 201, newPost);
    } catch (err) {
      sendJSON(res, 400, { error: 'Dữ liệu không hợp lệ: ' + err.message });
    }
    return;
  }

  // DELETE /api/posts/:id
  if (pathname.startsWith('/api/posts/') && method === 'DELETE') {
    const id = pathname.substring('/api/posts/'.length);
    let posts = readPosts();
    const beforeLen = posts.length;
    posts = posts.filter(p => p.id !== id);

    if (posts.length === beforeLen) {
      sendJSON(res, 404, { error: 'Không tìm thấy bài viết' });
      return;
    }

    writePosts(posts);
    sendJSON(res, 200, { success: true, message: 'Đã xóa bài viết' });
    return;
  }

  // --- Static Files Routes ---
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const resolvedFile = path.join(PUBLIC_DIR, safePath);
  serveStaticFile(res, resolvedFile);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  Khoảng Lặng • Website Cá Nhân (Zero Dependencies)`);
  console.log(`  Địa chỉ truy cập: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
