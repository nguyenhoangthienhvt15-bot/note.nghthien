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
     1. Khởi tạo Giao diện 3 trong 1 (Sáng -> Tối -> Sóng Động) & Bảng Màu
     ========================================================================== */
  const waveColorModal = document.getElementById('waveColorModal');
  const closeWaveModalBtn = document.getElementById('closeWaveModalBtn');
  const cancelWaveModalBtn = document.getElementById('cancelWaveModalBtn');
  const applyWaveModalBtn = document.getElementById('applyWaveModalBtn');
  const hueRange = document.getElementById('hueRange');
  const satRange = document.getElementById('satRange');
  const hueValDisplay = document.getElementById('hueValDisplay');
  const satValDisplay = document.getElementById('satValDisplay');
  const miniWavePreview = document.getElementById('miniWavePreview');
  const pickerTabBtns = document.querySelectorAll('.picker-tab-btn');
  const tabPresets = document.getElementById('tabPresets');
  const tabSliders = document.getElementById('tabSliders');
  const presetCards = document.querySelectorAll('.preset-card');

  let currentTheme = localStorage.getItem('journal_theme') || 'light';
  let waveHue = parseInt(localStorage.getItem('wave_hue') || '145', 10);
  let waveSat = parseInt(localStorage.getItem('wave_sat') || '45', 10);

  function applyWaveColors(hue, sat) {
    document.documentElement.style.setProperty('--wave-hue', hue);
    document.documentElement.style.setProperty('--wave-sat', `${sat}%`);
    if (hueRange) hueRange.value = hue;
    if (satRange) satRange.value = sat;
    if (hueValDisplay) hueValDisplay.textContent = `${hue}°`;
    if (satValDisplay) satValDisplay.textContent = `${sat}%`;
    if (miniWavePreview) {
      miniWavePreview.style.background = `hsl(${hue}, ${sat}%, 18%)`;
      const orb1 = miniWavePreview.querySelector('.orb-1');
      const orb2 = miniWavePreview.querySelector('.orb-2');
      if (orb1) orb1.style.background = `hsl(${(hue + 30) % 360}, ${sat + 10}%, 32%)`;
      if (orb2) orb2.style.background = `hsl(${(hue - 20 + 360) % 360}, ${sat}%, 26%)`;
    }
  }

  function setTheme(theme, save = true) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'custom-wave') {
      applyWaveColors(waveHue, waveSat);
    }
    if (save) {
      localStorage.setItem('journal_theme', theme);
    }
  }

  function openWaveModal() {
    if (waveColorModal) {
      waveColorModal.classList.add('open');
      applyWaveColors(waveHue, waveSat);
    }
  }

  function closeWaveModal() {
    if (waveColorModal) {
      waveColorModal.classList.remove('open');
    }
  }

  // Khởi chạy Theme ban đầu
  applyWaveColors(waveHue, waveSat);
  setTheme(currentTheme, false);

  // Chu kỳ bấm nút: Sáng -> Tối -> Sóng Động (tự động hiện bảng màu) -> Sáng...
  themeToggle.addEventListener('click', () => {
    if (currentTheme === 'light') {
      setTheme('dark');
    } else if (currentTheme === 'dark') {
      setTheme('custom-wave');
      openWaveModal();
    } else {
      setTheme('light');
      closeWaveModal();
    }
  });

  // Chuyển Tab trong bảng màu
  pickerTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pickerTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.getAttribute('data-tab');
      if (tab === 'presets') {
        tabPresets.classList.add('active');
        tabSliders.classList.remove('active');
      } else {
        tabSliders.classList.add('active');
        tabPresets.classList.remove('active');
      }
    });
  });

  // Chọn nhanh từ preset cards
  presetCards.forEach(card => {
    card.addEventListener('click', () => {
      presetCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const h = parseInt(card.getAttribute('data-hue'), 10);
      const s = parseInt(card.getAttribute('data-sat'), 10);
      waveHue = h;
      waveSat = s;
      applyWaveColors(waveHue, waveSat);
    });
  });

  // Kéo thanh trượt Hue & Saturation
  if (hueRange) {
    hueRange.addEventListener('input', (e) => {
      waveHue = parseInt(e.target.value, 10);
      presetCards.forEach(c => c.classList.remove('active'));
      applyWaveColors(waveHue, waveSat);
    });
  }

  if (satRange) {
    satRange.addEventListener('input', (e) => {
      waveSat = parseInt(e.target.value, 10);
      presetCards.forEach(c => c.classList.remove('active'));
      applyWaveColors(waveHue, waveSat);
    });
  }

  // Bấm OK để áp dụng và lưu
  if (applyWaveModalBtn) {
    applyWaveModalBtn.addEventListener('click', () => {
      localStorage.setItem('wave_hue', waveHue.toString());
      localStorage.setItem('wave_sat', waveSat.toString());
      closeWaveModal();
    });
  }

  if (cancelWaveModalBtn) {
    cancelWaveModalBtn.addEventListener('click', closeWaveModal);
  }

  if (closeWaveModalBtn) {
    closeWaveModalBtn.addEventListener('click', closeWaveModal);
  }

  if (waveColorModal) {
    waveColorModal.addEventListener('click', (e) => {
      if (e.target === waveColorModal) closeWaveModal();
    });
  }

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

    feedContainer.innerHTML = filtered.map(post => {
      // 1. Video trực tuyến (YouTube / Vimeo)
      let mediaHTML = post.videoUrl ? parseVideoToHTML(post.videoUrl) : '';

      // 2. Tệp đính kèm từ máy (Ảnh, Video MP4, hoặc PDF)
      if (post.attachment && post.attachment.data) {
        if (post.attachment.type === 'image') {
          mediaHTML += `
            <div class="post-media-box">
              <img src="${post.attachment.data}" alt="${escapeHTML(post.title)}" class="post-attached-image" loading="lazy">
            </div>
          `;
        } else if (post.attachment.type === 'video') {
          mediaHTML += `
            <div class="media-viewport">
              <video controls preload="metadata">
                <source src="${post.attachment.data}">
                Trình duyệt không hỗ trợ thẻ video này.
              </video>
            </div>
          `;
        } else if (post.attachment.type === 'pdf') {
          mediaHTML += `
            <div class="pdf-attachment-card">
              <div class="pdf-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <div class="pdf-details">
                <span class="pdf-name-title">${escapeHTML(post.attachment.name || 'Tài liệu PDF')}</span>
                <span class="pdf-size-meta">${escapeHTML(post.attachment.size || 'Tài liệu đính kèm')}</span>
              </div>
              <div class="pdf-action-buttons">
                <button type="button" class="btn btn-outline btn-sm" onclick="window.togglePdfViewer('${post.id}')">Đọc PDF</button>
                <a href="${post.attachment.data}" download="${escapeHTML(post.attachment.name || 'document.pdf')}" class="btn btn-primary btn-sm">Tải về</a>
              </div>
            </div>
            <div class="pdf-frame-collapse" id="pdfViewer-${post.id}" style="display: none;">
              <iframe src="${post.attachment.data}" class="pdf-iframe-reader" title="Trình đọc PDF"></iframe>
            </div>
          `;
        }
      }

      return `
        <article class="post-entry" id="${post.id}">
          <div class="post-top">
            <span class="post-badge">${escapeHTML(post.category || 'Suy ngẫm')}</span>
            <time class="post-timestamp">${escapeHTML(post.date || '')}</time>
          </div>

          <h2 class="post-heading">${escapeHTML(post.title)}</h2>

          ${mediaHTML}

          <div class="post-body">${escapeHTML(post.content)}</div>

          <div class="post-bottom">
            <span class="post-label">#nhật_ký</span>
            <button class="delete-action-btn" onclick="window.deletePost('${post.id}')" title="Xóa bài viết này">
              Xóa bài
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  window.togglePdfViewer = function (postId) {
    const el = document.getElementById('pdfViewer-' + postId);
    if (el) {
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
  };

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c)
    );
  }

  /* ==========================================================================
     4. Soạn thảo, Đính kèm Tệp (Ảnh, Video, PDF) & Đăng bài
     ========================================================================== */
  const postFileInput = document.getElementById('postFileInput');
  const dropZone = document.getElementById('dropZone');
  const filePreviewCard = document.getElementById('filePreviewCard');
  const fileTypeBadge = document.getElementById('fileTypeBadge');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const fileSizeDisplay = document.getElementById('fileSizeDisplay');
  const removeFileBtn = document.getElementById('removeFileBtn');
  const fileVisualPreview = document.getElementById('fileVisualPreview');

  let currentAttachment = null;

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function handleFileSelected(file) {
    if (!file) return;

    let type = 'file';
    let badgeText = 'TỆP';

    if (file.type.startsWith('image/')) {
      type = 'image';
      badgeText = 'ẢNH';
    } else if (file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov)$/i)) {
      type = 'video';
      badgeText = 'VIDEO';
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      type = 'pdf';
      badgeText = 'PDF';
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      currentAttachment = {
        type: type,
        name: file.name,
        size: formatBytes(file.size),
        data: dataUrl
      };

      if (fileTypeBadge) fileTypeBadge.textContent = badgeText;
      if (fileNameDisplay) fileNameDisplay.textContent = file.name;
      if (fileSizeDisplay) fileSizeDisplay.textContent = formatBytes(file.size);

      if (fileVisualPreview) {
        if (type === 'image') {
          fileVisualPreview.innerHTML = `<img src="${dataUrl}" alt="Preview" style="max-height:160px; object-fit:contain;">`;
          fileVisualPreview.style.display = 'flex';
        } else if (type === 'video') {
          fileVisualPreview.innerHTML = `<video src="${dataUrl}" controls style="max-height:160px; max-width:100%;"></video>`;
          fileVisualPreview.style.display = 'flex';
        } else if (type === 'pdf') {
          fileVisualPreview.innerHTML = `
            <div style="padding:14px; text-align:center; color:#FFF; font-size:0.85rem;">
              📄 Đã sẵn sàng đính kèm tệp PDF: <strong>${escapeHTML(file.name)}</strong>
            </div>
          `;
          fileVisualPreview.style.display = 'flex';
        } else {
          fileVisualPreview.style.display = 'none';
        }
      }

      if (filePreviewCard) filePreviewCard.style.display = 'block';
      if (dropZone) dropZone.style.display = 'none';
    };

    reader.readAsDataURL(file);
  }

  if (dropZone && postFileInput) {
    dropZone.addEventListener('click', () => postFileInput.click());
    postFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelected(e.target.files[0]);
      }
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });
  }

  function resetAttachment() {
    currentAttachment = null;
    if (postFileInput) postFileInput.value = '';
    if (filePreviewCard) filePreviewCard.style.display = 'none';
    if (dropZone) dropZone.style.display = 'flex';
    if (fileVisualPreview) fileVisualPreview.innerHTML = '';
  }

  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', resetAttachment);
  }

  window.openComposeModal = function () {
    modalOverlay.classList.add('open');
    document.getElementById('postTitle').focus();
  };

  function closeModal() {
    modalOverlay.classList.remove('open');
    composeForm.reset();
    resetAttachment();
    videoLivePreview.style.display = 'none';
    videoLivePreview.innerHTML = '';
  }

  openModalBtn.addEventListener('click', window.openComposeModal);
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Xem trước video theo thời gian thực khi dán link trực tuyến
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

    const payload = { 
      title, 
      category, 
      videoUrl, 
      content,
      attachment: currentAttachment
    };

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
      attachment: currentAttachment,
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

