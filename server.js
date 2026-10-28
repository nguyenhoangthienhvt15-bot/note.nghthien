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
const FOLDERS_FILE = path.join(DATA_DIR, 'folders.json');

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
        timestamp: 1793184600000,
        folderId: null
      },
      {
        id: "post-2",
        title: "Về sự giản lược trong cách sống và cách viết",
        category: "Tản văn",
        videoUrl: "",
        content: "Càng sống nhiều, người ta càng nhận ra giá trị của sự tiết chế. Bớt đi những đồ vật không dùng, lọc bớt những mối quan hệ xã giao gượng gạo, và giản lược những câu từ hoa mỹ để giữ lại những điều chân thực nhất.",
        date: "27/10/2026",
        timestamp: 1793098200000,
        folderId: null
      },
      {
        id: "post-doc-1",
        title: "Bản thảo tản văn & Kế hoạch sáng tạo 2026",
        category: "Tài liệu",
        videoUrl: "",
        content: "Tổng hợp các ghi chép nghiên cứu, danh mục tài liệu tham khảo và dàn ý chi tiết cho các bài viết chuyên đề.",
        date: "28/10/2026",
        timestamp: 1793190000000,
        folderId: "folder-1"
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }

  if (!fs.existsSync(FOLDERS_FILE)) {
    const defaultFolders = [
      {
        id: "folder-1",
        name: "Bản thảo xuất bản",
        parentId: null,
        createdAt: 1793180000000
      },
      {
        id: "folder-2",
        name: "Tài liệu PDF & Học tập",
        parentId: null,
        createdAt: 1793185000000
      }
    ];
    fs.writeFileSync(FOLDERS_FILE, JSON.stringify(defaultFolders, null, 2), 'utf-8');
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

function readFolders() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(FOLDERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Lỗi đọc file folders:", err);
    return [];
  }
}

function writeFolders(folders) {
  ensureDataFile();
  fs.writeFileSync(FOLDERS_FILE, JSON.stringify(folders, null, 2), 'utf-8');
}

// Hàm hỗ trợ trả về JSON
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Hàm đọc body của HTTP request
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 50 * 1024 * 1024) { // Giới hạn 50MB cho tệp đính kèm
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // --- API Routes ---
  if (pathname === '/api/health') {
    sendJSON(res, 200, { status: 'ok', uptime: process.uptime() });
    return;
  }

  // GET /api/folders
  if (pathname === '/api/folders' && method === 'GET') {
    sendJSON(res, 200, readFolders());
    return;
  }

  // POST /api/folders
  if (pathname === '/api/folders' && method === 'POST') {
    try {
      const data = await getRequestBody(req);
      const { name, parentId } = data;
      if (!name || !name.trim()) {
        sendJSON(res, 400, { error: 'Tên thư mục không được để trống' });
        return;
      }
      const folders = readFolders();
      const newFolder = {
        id: 'folder-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        name: name.trim(),
        parentId: parentId || null,
        createdAt: Date.now()
      };
      folders.push(newFolder);
      writeFolders(folders);
      sendJSON(res, 201, newFolder);
    } catch (err) {
      sendJSON(res, 400, { error: 'Lỗi tạo thư mục: ' + err.message });
    }
    return;
  }

  // PUT /api/folders/:id (Đổi tên thư mục)
  if (pathname.startsWith('/api/folders/') && method === 'PUT') {
    const id = pathname.substring('/api/folders/'.length);
    try {
      const data = await getRequestBody(req);
      const { name } = data;
      if (!name || !name.trim()) {
        sendJSON(res, 400, { error: 'Tên thư mục không được để trống' });
        return;
      }
      const folders = readFolders();
      const folder = folders.find(f => f.id === id);
      if (!folder) {
        sendJSON(res, 404, { error: 'Không tìm thấy thư mục' });
        return;
      }
      folder.name = name.trim();
      writeFolders(folders);
      sendJSON(res, 200, folder);
    } catch (err) {
      sendJSON(res, 400, { error: 'Lỗi cập nhật thư mục: ' + err.message });
    }
    return;
  }

  // DELETE /api/folders/:id (Xóa thư mục)
  if (pathname.startsWith('/api/folders/') && method === 'DELETE') {
    const id = pathname.substring('/api/folders/'.length);
    let folders = readFolders();
    const folderExists = folders.some(f => f.id === id);
    if (!folderExists) {
      sendJSON(res, 404, { error: 'Không tìm thấy thư mục' });
      return;
    }

    // Xóa thư mục này và các thư mục con
    const folderIdsToDelete = new Set([id]);
    let added = true;
    while (added) {
      added = false;
      for (const f of folders) {
        if (f.parentId && folderIdsToDelete.has(f.parentId) && !folderIdsToDelete.has(f.id)) {
          folderIdsToDelete.add(f.id);
          added = true;
        }
      }
    }

    folders = folders.filter(f => !folderIdsToDelete.has(f.id));
    writeFolders(folders);

    // Chuyển các file thuộc thư mục bị xóa về thư mục gốc (folderId = null)
    let posts = readPosts();
    posts = posts.map(p => {
      if (p.folderId && folderIdsToDelete.has(p.folderId)) {
        return { ...p, folderId: null };
      }
      return p;
    });
    writePosts(posts);

    sendJSON(res, 200, { success: true, message: 'Đã xóa thư mục' });
    return;
  }

  // PUT /api/posts/:id/move (Di chuyển file vào thư mục)
  if (pathname.match(/^\/api\/posts\/[^\/]+\/move$/) && method === 'PUT') {
    const parts = pathname.split('/');
    const postId = parts[3];
    try {
      const data = await getRequestBody(req);
      const { folderId } = data;
      const posts = readPosts();
      const post = posts.find(p => p.id === postId);
      if (!post) {
        sendJSON(res, 404, { error: 'Không tìm thấy tài liệu' });
        return;
      }
      post.folderId = folderId || null;
      writePosts(posts);
      sendJSON(res, 200, post);
    } catch (err) {
      sendJSON(res, 400, { error: 'Lỗi di chuyển: ' + err.message });
    }
    return;
  }

  // GET /api/backup (Xuất dữ liệu bài viết + thư mục)
  if (pathname === '/api/backup' && method === 'GET') {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      posts: readPosts(),
      folders: readFolders()
    };
    sendJSON(res, 200, backupData);
    return;
  }

  // POST /api/backup/restore (Khôi phục dữ liệu)
  if (pathname === '/api/backup/restore' && method === 'POST') {
    try {
      const data = await getRequestBody(req);
      if (data && Array.isArray(data.posts)) {
        writePosts(data.posts);
        if (Array.isArray(data.folders)) {
          writeFolders(data.folders);
        }
        sendJSON(res, 200, { success: true, message: 'Khôi phục dữ liệu thành công' });
        return;
      } else if (Array.isArray(data)) {
        // Hỗ trợ dạng backup cũ chỉ có mảng posts
        writePosts(data);
        sendJSON(res, 200, { success: true, message: 'Khôi phục danh sách bài viết thành công' });
        return;
      }
      sendJSON(res, 400, { error: 'Định dạng dữ liệu sao lưu không đúng' });
    } catch (err) {
      sendJSON(res, 400, { error: 'Lỗi khôi phục: ' + err.message });
    }
    return;
  }

  // GET /api/posts
  if (pathname === '/api/posts' && method === 'GET') {
    const { category, q, folderId } = parsedUrl.query;
    let posts = readPosts();

    if (category && category !== 'all') {
      posts = posts.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase());
    }

    if (folderId !== undefined) {
      const targetFolder = folderId === 'root' || folderId === 'null' || folderId === '' ? null : folderId;
      posts = posts.filter(p => (p.folderId || null) === targetFolder);
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
      const { title, content, category, videoUrl, attachment, folderId } = data;

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
        attachment: attachment || null,
        folderId: folderId || null,
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
