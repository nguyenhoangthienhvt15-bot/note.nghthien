/**
 * Khoảng Lặng - Journal & Video Web App
 * Kiến trúc thuần Vanilla JavaScript nhẹ nhàng, không phụ thuộc thư viện nặng.
 * Hỗ trợ Dual-Mode: Tự động dùng Express REST API khi có server,
 * hoặc tự động fallback sang LocalStorage khi chạy ở môi trường hosting tĩnh.
 */

(function () {
  'use strict';

  // State Management
  let postsData = [];
  let currentCategory = 'all';
  let searchTerm = '';
  let isApiAvailable = true;

  // DOM Elements
  const feedContainer = document.getElementById('feedContainer');
  const catFilters = document.getElementById('catFilters');
  const searchInput = document.getElementById('searchInput');
  const themeToggle = document.getElementById('themeToggle');
  const openModalBtn = document.getElementById('openModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const composeForm = document.getElementById('composeForm');
  const postVideoInput = document.getElementById('postVideo');
  const videoLivePreview = document.getElementById('videoLivePreview');
  const yearSpan = document.getElementById('yearSpan');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const filePicker = document.getElementById('filePicker');

  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  /* ==========================================================================
     1. Khởi tạo Giao diện Sáng / Tối (Theme Mode)
     ========================================================================== */
  function initTheme() {
    const savedTheme = localStorage.getItem('journal_theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  themeToggle.addEventListener('click', () => {
    const active = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = active === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('journal_theme', nextTheme);
  });

  initTheme();

  /* ==========================================================================
     2. Trình Phân Tích & Nhúng Video (Video Embed Parser)
     ========================================================================== */
  function parseVideoToHTML(url) {
    if (!url) return '';
    const cleanUrl = url.trim();

    // YouTube: Hỗ trợ watch?v=, youtu.be/, youtube.com/shorts/
    const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `
        <div class="media-viewport">
          <iframe 
            src="https://www.youtube-nocookie.com/embed/${ytMatch[1]}" 
            title="YouTube Video Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen>
          </iframe>
        </div>
      `;
    }

    // Vimeo
    const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/);
    if (vimeoMatch && vimeoMatch[3]) {
      return `
        <div class="media-viewport">
          <iframe 
            src="https://player.vimeo.com/video/${vimeoMatch[3]}?dnt=1" 
            title="Vimeo Video Player"
            allow="autoplay; fullscreen; picture-in-picture" 
            allowfullscreen>
          </iframe>
        </div>
      `;
    }

    // Direct MP4 / WebM / OGG video
    if (cleanUrl.match(/\.(mp4|webm|ogg)($|\?)/i)) {
      return `
        <div class="media-viewport">
          <video controls preload="metadata">
            <source src="${cleanUrl}">
            Trình duyệt của bạn không hỗ trợ định dạng video này.
          </video>
        </div>
      `;
    }

    // Nếu không khớp định dạng video phổ biến, hiển thị dạng liên kết trang nhã
    return `
      <p style="font-size:0.88rem; margin-bottom:14px;">
        <span style="color:var(--accent);">▶</span> 
        <a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--accent); text-decoration:underline;">
          Mở liên kết video này
        </a>
      </p>
    `;
  }

  /* ==========================================================================
     3. Tương tác Dữ liệu (API + Local Storage Fallback)
     ========================================================================== */
  async function loadPosts() {
    try {
      const response = await fetch('/api/posts');
      if (!response.ok) throw new Error('API không phản hồi 200');
      postsData = await response.json();
      isApiAvailable = true;
      localStorage.setItem('cached_posts', JSON.stringify(postsData));
    } catch (err) {
      // Fallback sang local storage nếu chạy độc lập (VD: GitHub Pages)
      isApiAvailable = false;
      const cached = localStorage.getItem('cached_posts');
      if (cached) {
        postsData = JSON.parse(cached);
      } else {
        postsData = [
          {
            id: "post-sample",
            title: "Mùa thu Hà Nội và những khoảng dừng bình yên",
            category: "Video",
            videoUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
            content: "Buổi sáng pha một ấm trà sen, mở bản nhạc êm này và ngắm nhìn nhịp sống ngoài ban công trôi chầm chậm.",
            date: "28/10/2026",
            timestamp: Date.now()
          }
        ];
      }
    }
    renderPosts();
  }

  function renderPosts() {
    let filtered = postsData.filter(item => {
      const matchCat = currentCategory === 'all' || 
        (item.category && item.category.toLowerCase() === currentCategory.toLowerCase());
      const matchSearch = searchTerm === '' ||
        (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.content && item.content.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });

    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (filtered.length === 0) {
      feedContainer.innerHTML = `
        <div class="state-empty">
          <p>Chưa có mẩu chuyện hay video nào trong mục này.</p>
          <button class="btn btn-primary" onclick="window.openComposeModal()">Ghi lại câu chuyện đầu tiên</button>
        </div>
      `;
      return;
    }

    feedContainer.innerHTML = filtered.map(post => `
      <article class="post-entry" id="${post.id}">
        <div class="post-top">
          <span class="post-badge">${escapeHTML(post.category || 'Suy ngẫm')}</span>
          <time class="post-timestamp">${escapeHTML(post.date || '')}</time>
        </div>

        <h2 class="post-heading">${escapeHTML(post.title)}</h2>

        ${post.videoUrl ? parseVideoToHTML(post.videoUrl) : ''}

        <div class="post-body">${escapeHTML(post.content)}</div>

        <div class="post-bottom">
          <span class="post-label">#nhật_ký</span>
          <button class="delete-action-btn" onclick="window.deletePost('${post.id}')" title="Xóa bài viết này">
            Xóa bài
          </button>
        </div>
      </article>
    `).join('');
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c)
    );
  }

  /* ==========================================================================
     4. Soạn thảo & Đăng bài mới
     ========================================================================== */
  window.openComposeModal = function () {
    modalOverlay.classList.add('open');
    document.getElementById('postTitle').focus();
  };

  function closeModal() {
    modalOverlay.classList.remove('open');
    composeForm.reset();
    videoLivePreview.style.display = 'none';
    videoLivePreview.innerHTML = '';
  }

  openModalBtn.addEventListener('click', window.openComposeModal);
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Xem trước video theo thời gian thực khi dán link
  postVideoInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val) {
      const html = parseVideoToHTML(val);
      if (html) {
        videoLivePreview.innerHTML = html;
        videoLivePreview.style.display = 'block';
        return;
      }
    }
    videoLivePreview.style.display = 'none';
    videoLivePreview.innerHTML = '';
  });

  // Gửi bài viết
  composeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('postTitle').value.trim();
    const category = document.getElementById('postCategory').value;
    const videoUrl = postVideoInput.value.trim();
    const content = document.getElementById('postContent').value.trim();

    const payload = { title, category, videoUrl, content };

    if (isApiAvailable) {
      try {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          closeModal();
          await loadPosts();
          return;
        }
      } catch (err) {
        console.warn('Không thể gửi đến API, chuyển sang lưu nội bộ.');
      }
    }

    // Fallback lưu cục bộ
    const now = new Date();
    const newPost = {
      id: 'post-' + Date.now(),
      title,
      category,
      videoUrl,
      content,
      date: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(now),
      timestamp: Date.now()
    };
    postsData.unshift(newPost);
    localStorage.setItem('cached_posts', JSON.stringify(postsData));
    closeModal();
    renderPosts();
  });

  /* ==========================================================================
     5. Xóa bài viết
     ========================================================================== */
  window.deletePost = async function (id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;

    if (isApiAvailable) {
      try {
        const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
        if (res.ok) {
          await loadPosts();
          return;
        }
      } catch (err) {
        console.warn('Lỗi kết nối khi xóa trên API');
      }
    }

    postsData = postsData.filter(p => p.id !== id);
    localStorage.setItem('cached_posts', JSON.stringify(postsData));
    renderPosts();
  };

  /* ==========================================================================
     6. Lọc Thể Loại & Tìm Kiếm
     ========================================================================== */
  catFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill-btn');
    if (!btn) return;
    document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.getAttribute('data-cat') || 'all';
    renderPosts();
  });

  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    renderPosts();
  });

  /* ==========================================================================
     7. Sao lưu (Export) & Khôi phục (Import) dữ liệu
     ========================================================================== */
  exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(postsData, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `khoang-lang-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  });

  importBtn.addEventListener('click', () => filePicker.click());
  filePicker.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          postsData = imported;
          localStorage.setItem('cached_posts', JSON.stringify(postsData));
          renderPosts();
          alert('Đã khôi phục dữ liệu bài viết thành công!');
        } else {
          alert('File không hợp lệ: Cần là mảng danh sách bài viết.');
        }
      } catch (err) {
        alert('Lỗi khi đọc file JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  // Tải dữ liệu ban đầu
  loadPosts();
})();
