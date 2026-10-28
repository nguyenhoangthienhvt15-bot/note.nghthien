/**
 * Khoảng Lặng - Journal, Video & Document Web App
 * Kiến trúc thuần Vanilla JavaScript nhẹ nhàng, không phụ thuộc thư viện nặng.
 * Hỗ trợ Dual-Mode: Tự động dùng REST API khi có server,
 * hoặc tự động fallback sang LocalStorage khi chạy ở môi trường hosting tĩnh.
 */

(function () {
  'use strict';

  // State Management
  let postsData = [];
  let foldersData = [];
  let currentCategory = 'all';
  let currentFolderId = null; // null = Thư mục gốc
  let searchTerm = '';
  let isApiAvailable = true;

  // Google Drive State
  let gdriveAccessToken = null;
  let gdriveUser = null;
  let tokenClient = null;
  let draggedPostId = null;
  let currentMovingPostId = null;

  // DOM Elements
  const feedContainer = document.getElementById('feedContainer');
  const catFilters = document.getElementById('catFilters');
  const searchInput = document.getElementById('searchInput');
  const searchSuggestions = document.getElementById('searchSuggestions');
  const themeToggle = document.getElementById('themeToggle');
  const openModalBtn = document.getElementById('openModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const composeForm = document.getElementById('composeForm');
  const postCategory = document.getElementById('postCategory');
  const folderSelectGroup = document.getElementById('folderSelectGroup');
  const postFolderSelect = document.getElementById('postFolder');
  const postVideoInput = document.getElementById('postVideo');
  const videoLivePreview = document.getElementById('videoLivePreview');
  const yearSpan = document.getElementById('yearSpan');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const filePicker = document.getElementById('filePicker');

  // Explorer DOM Elements
  const explorerSection = document.getElementById('explorerSection');
  const explorerBreadcrumbs = document.getElementById('explorerBreadcrumbs');
  const foldersGrid = document.getElementById('foldersGrid');
  const newFolderBtn = document.getElementById('newFolderBtn');
  const uploadDocBtn = document.getElementById('uploadDocBtn');

  // Folder Modal Elements
  const folderModal = document.getElementById('folderModal');
  const folderModalTitle = document.getElementById('folderModalTitle');
  const folderForm = document.getElementById('folderForm');
  const folderEditId = document.getElementById('folderEditId');
  const folderNameInput = document.getElementById('folderNameInput');
  const closeFolderModalBtn = document.getElementById('closeFolderModalBtn');
  const cancelFolderModalBtn = document.getElementById('cancelFolderModalBtn');

  // Move File Modal Elements
  const moveFileModal = document.getElementById('moveFileModal');
  const moveFileNameText = document.getElementById('moveFileNameText');
  const moveDestinationList = document.getElementById('moveDestinationList');
  const closeMoveModalBtn = document.getElementById('closeMoveModalBtn');
  const cancelMoveModalBtn = document.getElementById('cancelMoveModalBtn');

  // Google Drive Modal Elements
  const openGoogleDriveBtn = document.getElementById('openGoogleDriveBtn');
  const openGoogleDriveFooterBtn = document.getElementById('openGoogleDriveFooterBtn');
  const googleDriveModal = document.getElementById('googleDriveModal');
  const closeGdriveModalBtn = document.getElementById('closeGdriveModalBtn');
  const closeGdriveModalBottomBtn = document.getElementById('closeGdriveModalBottomBtn');
  const gdriveStatusDot = document.getElementById('gdriveStatusDot');
  const gdriveLoginBtn = document.getElementById('gdriveLoginBtn');
  const gdriveLogoutBtn = document.getElementById('gdriveLogoutBtn');
  const gdriveUserAvatar = document.getElementById('gdriveUserAvatar');
  const gdriveUserName = document.getElementById('gdriveUserName');
  const gdriveUserEmail = document.getElementById('gdriveUserEmail');
  const gdriveOperations = document.getElementById('gdriveOperations');
  const gdriveBackupNowBtn = document.getElementById('gdriveBackupNowBtn');
  const gdriveFetchBackupsBtn = document.getElementById('gdriveFetchBackupsBtn');
  const gdriveBackupsContainer = document.getElementById('gdriveBackupsContainer');
  const gdriveBackupsList = document.getElementById('gdriveBackupsList');
  const gdriveStatusMsg = document.getElementById('gdriveStatusMsg');
  const customClientIdInput = document.getElementById('customClientIdInput');
  const saveClientIdBtn = document.getElementById('saveClientIdBtn');

  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  /* ==========================================================================
     1. Theme 3 trong 1 (Sáng -> Tối -> Sóng Động) & Bảng Màu
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

  applyWaveColors(waveHue, waveSat);
  setTheme(currentTheme, false);

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

  if (applyWaveModalBtn) {
    applyWaveModalBtn.addEventListener('click', () => {
      localStorage.setItem('wave_hue', waveHue.toString());
      localStorage.setItem('wave_sat', waveSat.toString());
      closeWaveModal();
    });
  }

  if (cancelWaveModalBtn) cancelWaveModalBtn.addEventListener('click', closeWaveModal);
  if (closeWaveModalBtn) closeWaveModalBtn.addEventListener('click', closeWaveModal);
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

    return `
      <p style="font-size:0.88rem; margin-bottom:14px;">
        <span style="color:var(--accent);">▶</span> 
        <a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--accent); text-decoration:underline;">
          Mở liên kết video này
        </a>
      </p>
    `;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c)
    );
  }

  /* ==========================================================================
     3. Tương tác Dữ liệu: Posts & Folders (API + Local Storage Fallback)
     ========================================================================== */
  async function loadFolders() {
    try {
      const res = await fetch('/api/folders');
      if (res.ok) {
        foldersData = await res.json();
        localStorage.setItem('cached_folders', JSON.stringify(foldersData));
      } else {
        throw new Error('API folders error');
      }
    } catch (err) {
      const cached = localStorage.getItem('cached_folders');
      if (cached) {
        foldersData = JSON.parse(cached);
      } else {
        foldersData = [
          { id: 'folder-1', name: 'Bản thảo xuất bản', parentId: null, createdAt: Date.now() },
          { id: 'folder-2', name: 'Tài liệu PDF & Tham khảo', parentId: null, createdAt: Date.now() }
        ];
      }
    }
    updateFolderSelectDropdown();
  }

  async function loadPosts() {
    try {
      const response = await fetch('/api/posts');
      if (!response.ok) throw new Error('API posts error');
      postsData = await response.json();
      isApiAvailable = true;
      localStorage.setItem('cached_posts', JSON.stringify(postsData));
    } catch (err) {
      isApiAvailable = false;
      const cached = localStorage.getItem('cached_posts');
      if (cached) {
        postsData = JSON.parse(cached);
      } else {
        postsData = [];
      }
    }
    renderExplorer();
    renderPosts();
  }

  function getFolderName(folderId) {
    if (!folderId) return 'Thư mục gốc';
    const f = foldersData.find(item => item.id === folderId);
    return f ? f.name : 'Thư mục';
  }

  function updateFolderSelectDropdown() {
    if (!postFolderSelect) return;
    let html = '<option value="">📁 (Thư mục gốc)</option>';
    foldersData.forEach(f => {
      html += `<option value="${f.id}">📁 ${escapeHTML(f.name)}</option>`;
    });
    postFolderSelect.innerHTML = html;
  }

  /* ==========================================================================
     4. Quản lý Thư mục & Giao diện File Explorer
     ========================================================================== */
  function renderExplorer() {
    if (!explorerSection) return;

    if (currentCategory !== 'Tài liệu') {
      explorerSection.style.display = 'none';
      return;
    }

    explorerSection.style.display = 'block';

    // 1. Breadcrumbs
    let breadcrumbHTML = '';
    if (!currentFolderId) {
      breadcrumbHTML = `
        <span class="crumb-item active">
          📁 Thư mục gốc
        </span>
      `;
    } else {
      const currentFolder = foldersData.find(f => f.id === currentFolderId);
      const name = currentFolder ? currentFolder.name : 'Thư mục';
      breadcrumbHTML = `
        <span class="crumb-item" onclick="window.navigateToFolder(null)">
          📁 Thư mục gốc
        </span>
        <span class="crumb-sep">/</span>
        <span class="crumb-item active">
          📂 ${escapeHTML(name)}
        </span>
      `;
    }
    explorerBreadcrumbs.innerHTML = breadcrumbHTML;

    // 2. Danh sách thư mục (chỉ hiển thị thư mục con của currentFolderId)
    const childFolders = foldersData.filter(f => (f.parentId || null) === currentFolderId);

    if (childFolders.length === 0) {
      foldersGrid.innerHTML = `
        <div class="folder-empty-notice">
          Chưa có thư mục con nào ở đây. Bấm <strong>"Tạo thư mục"</strong> để tạo mới.
        </div>
      `;
    } else {
      foldersGrid.innerHTML = childFolders.map(folder => {
        const count = postsData.filter(p => p.folderId === folder.id).length;
        return `
          <div class="folder-card" 
               id="folder-card-${folder.id}"
               onclick="window.navigateToFolder('${folder.id}')"
               ondragover="window.handleFolderDragOver(event, '${folder.id}')"
               ondragleave="window.handleFolderDragLeave(event, '${folder.id}')"
               ondrop="window.handleFolderDrop(event, '${folder.id}')">
            
            <div class="folder-card-top">
              <span class="folder-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="currentColor" fill-opacity="0.15"></path>
                </svg>
              </span>
              
              <div class="folder-menu-wrap" onclick="event.stopPropagation()">
                <button type="button" class="folder-menu-btn" onclick="window.toggleFolderDropdown('${folder.id}')" title="Tùy chọn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                    <circle cx="12" cy="19" r="2"></circle>
                  </svg>
                </button>
                <div class="folder-dropdown" id="dropdown-${folder.id}">
                  <button type="button" class="folder-dropdown-item" onclick="window.openRenameFolderModal('${folder.id}')">
                    ✏️ Đổi tên
                  </button>
                  <button type="button" class="folder-dropdown-item text-danger" onclick="window.deleteFolder('${folder.id}')">
                    🗑️ Xóa thư mục
                  </button>
                </div>
              </div>
            </div>

            <div class="folder-name" title="${escapeHTML(folder.name)}">${escapeHTML(folder.name)}</div>
            <div class="folder-meta">${count} tệp tài liệu</div>
          </div>
        `;
      }).join('');
    }
  }

  window.navigateToFolder = function (folderId) {
    currentFolderId = folderId;
    renderExplorer();
    renderPosts();
  };

  window.toggleFolderDropdown = function (folderId) {
    document.querySelectorAll('.folder-dropdown').forEach(d => {
      if (d.id !== 'dropdown-' + folderId) d.classList.remove('show');
    });
    const el = document.getElementById('dropdown-' + folderId);
    if (el) el.classList.toggle('show');
  };

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.folder-menu-wrap')) {
      document.querySelectorAll('.folder-dropdown').forEach(d => d.classList.remove('show'));
    }
  });

  // Modal Tạo & Đổi tên thư mục
  function openFolderModal(isEdit = false, folder = null) {
    folderModal.classList.add('open');
    if (isEdit && folder) {
      folderModalTitle.textContent = 'Đổi tên thư mục';
      folderEditId.value = folder.id;
      folderNameInput.value = folder.name;
    } else {
      folderModalTitle.textContent = 'Tạo thư mục mới';
      folderEditId.value = '';
      folderNameInput.value = '';
    }
    folderNameInput.focus();
  }

  function closeFolderModal() {
    folderModal.classList.remove('open');
    folderForm.reset();
  }

  newFolderBtn.addEventListener('click', () => openFolderModal(false));
  closeFolderModalBtn.addEventListener('click', closeFolderModal);
  cancelFolderModalBtn.addEventListener('click', closeFolderModal);
  folderModal.addEventListener('click', (e) => {
    if (e.target === folderModal) closeFolderModal();
  });

  window.openRenameFolderModal = function (folderId) {
    const f = foldersData.find(item => item.id === folderId);
    if (f) openFolderModal(true, f);
  };

  folderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = folderNameInput.value.trim();
    if (!name) return;

    const editId = folderEditId.value;

    if (editId) {
      // Đổi tên
      if (isApiAvailable) {
        try {
          const res = await fetch(`/api/folders/${editId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
          });
          if (res.ok) {
            await loadFolders();
            closeFolderModal();
            renderExplorer();
            renderPosts();
            return;
          }
        } catch (err) {
          console.warn('Lỗi gọi API rename folder');
        }
      }
      const f = foldersData.find(item => item.id === editId);
      if (f) f.name = name;
      localStorage.setItem('cached_folders', JSON.stringify(foldersData));
    } else {
      // Tạo mới
      const newFolderPayload = { name, parentId: currentFolderId };
      if (isApiAvailable) {
        try {
          const res = await fetch('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newFolderPayload)
          });
          if (res.ok) {
            await loadFolders();
            closeFolderModal();
            renderExplorer();
            return;
          }
        } catch (err) {
          console.warn('Lỗi gọi API create folder');
        }
      }
      const newFolder = {
        id: 'folder-' + Date.now(),
        name,
        parentId: currentFolderId,
        createdAt: Date.now()
      };
      foldersData.push(newFolder);
      localStorage.setItem('cached_folders', JSON.stringify(foldersData));
    }

    closeFolderModal();
    updateFolderSelectDropdown();
    renderExplorer();
    renderPosts();
  });

  window.deleteFolder = async function (folderId) {
    const f = foldersData.find(item => item.id === folderId);
    const folderName = f ? f.name : 'thư mục';
    if (!confirm(`Bạn có chắc muốn xóa thư mục "${folderName}" không?\nCác tệp bên trong sẽ được đưa ra Thư mục gốc an toàn.`)) return;

    if (isApiAvailable) {
      try {
        const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' });
        if (res.ok) {
          await loadFolders();
          await loadPosts();
          return;
        }
      } catch (err) {
        console.warn('Lỗi API delete folder');
      }
    }

    foldersData = foldersData.filter(item => item.id !== folderId && item.parentId !== folderId);
    localStorage.setItem('cached_folders', JSON.stringify(foldersData));

    postsData = postsData.map(p => (p.folderId === folderId ? { ...p, folderId: null } : p));
    localStorage.setItem('cached_posts', JSON.stringify(postsData));

    if (currentFolderId === folderId) currentFolderId = null;
    updateFolderSelectDropdown();
    renderExplorer();
    renderPosts();
  };

  /* ==========================================================================
     5. Kéo thả & Di chuyển File vào Thư mục
     ========================================================================== */
  window.handleFileDragStart = function (e, postId) {
    draggedPostId = postId;
    e.dataTransfer.setData('text/plain', postId);
    e.dataTransfer.effectAllowed = 'move';
    const card = document.getElementById(postId);
    if (card) card.classList.add('dragging');
  };

  window.handleFileDragEnd = function (postId) {
    draggedPostId = null;
    const card = document.getElementById(postId);
    if (card) card.classList.remove('dragging');
  };

  window.handleFolderDragOver = function (e, folderId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const card = document.getElementById('folder-card-' + folderId);
    if (card) card.classList.add('drag-over');
  };

  window.handleFolderDragLeave = function (e, folderId) {
    const card = document.getElementById('folder-card-' + folderId);
    if (card) card.classList.remove('drag-over');
  };

  window.handleFolderDrop = async function (e, targetFolderId) {
    e.preventDefault();
    const card = document.getElementById('folder-card-' + targetFolderId);
    if (card) card.classList.remove('drag-over');

    const postId = e.dataTransfer.getData('text/plain') || draggedPostId;
    if (postId) {
      await movePostToFolder(postId, targetFolderId);
    }
  };

  async function movePostToFolder(postId, targetFolderId) {
    if (isApiAvailable) {
      try {
        const res = await fetch(`/api/posts/${postId}/move`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: targetFolderId })
        });
        if (res.ok) {
          await loadPosts();
          return;
        }
      } catch (err) {
        console.warn('Lỗi API move post');
      }
    }

    const post = postsData.find(p => p.id === postId);
    if (post) {
      post.folderId = targetFolderId || null;
      localStorage.setItem('cached_posts', JSON.stringify(postsData));
      renderExplorer();
      renderPosts();
    }
  }

  // Modal Di chuyển File qua menu click
  window.openMoveModal = function (postId) {
    currentMovingPostId = postId;
    const post = postsData.find(p => p.id === postId);
    if (!post) return;

    moveFileNameText.textContent = `Tài liệu: "${post.title}"`;

    let html = `
      <div class="dest-folder-item ${!post.folderId ? 'current' : ''}" onclick="window.confirmMove(null)">
        <span>📁</span>
        <span class="dest-folder-name">Thư mục gốc</span>
        ${!post.folderId ? '<span class="suggestion-badge">Đang ở đây</span>' : ''}
      </div>
    `;

    foldersData.forEach(f => {
      const isCurrent = post.folderId === f.id;
      html += `
        <div class="dest-folder-item ${isCurrent ? 'current' : ''}" onclick="${isCurrent ? '' : `window.confirmMove('${f.id}')`}">
          <span>📂</span>
          <span class="dest-folder-name">${escapeHTML(f.name)}</span>
          ${isCurrent ? '<span class="suggestion-badge">Đang ở đây</span>' : ''}
        </div>
      `;
    });

    moveDestinationList.innerHTML = html;
    moveFileModal.classList.add('open');
  };

  window.confirmMove = async function (targetFolderId) {
    if (currentMovingPostId) {
      await movePostToFolder(currentMovingPostId, targetFolderId);
      closeMoveModal();
    }
  };

  function closeMoveModal() {
    moveFileModal.classList.remove('open');
    currentMovingPostId = null;
  }

  closeMoveModalBtn.addEventListener('click', closeMoveModal);
  cancelMoveModalBtn.addEventListener('click', closeMoveModal);
  moveFileModal.addEventListener('click', (e) => {
    if (e.target === moveFileModal) closeMoveModal();
  });

  /* ==========================================================================
     6. Render Danh Sách Bài Viết & Tài Liệu
     ========================================================================== */
  function renderPosts() {
    let filtered = postsData.filter(item => {
      const matchCat = currentCategory === 'all' || 
        (item.category && item.category.toLowerCase() === currentCategory.toLowerCase());
      
      let matchFolder = true;
      if (currentCategory === 'Tài liệu' && searchTerm === '') {
        matchFolder = (item.folderId || null) === currentFolderId;
      }

      const matchSearch = searchTerm === '' ||
        (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.content && item.content.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchCat && matchFolder && matchSearch;
    });

    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (filtered.length === 0) {
      if (currentCategory === 'Tài liệu') {
        const folderName = getFolderName(currentFolderId);
        feedContainer.innerHTML = `
          <div class="state-empty">
            <p>Chưa có tài liệu hoặc PDF nào trong ${folderName}.</p>
            <button class="btn btn-primary" onclick="window.openComposeDocModal()">Thêm tài liệu vào đây</button>
          </div>
        `;
      } else {
        feedContainer.innerHTML = `
          <div class="state-empty">
            <p>Chưa có mẩu chuyện hay video nào trong mục này.</p>
            <button class="btn btn-primary" onclick="window.openComposeModal()">Ghi lại câu chuyện đầu tiên</button>
          </div>
        `;
      }
      return;
    }

    feedContainer.innerHTML = filtered.map(post => {
      let mediaHTML = post.videoUrl ? parseVideoToHTML(post.videoUrl) : '';

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

      const isDocument = post.category === 'Tài liệu';
      const folderBadge = isDocument ? `
        <span class="folder-badge-tag" onclick="window.navigateToFolder('${post.folderId || ''}')" title="Thuộc thư mục: ${escapeHTML(getFolderName(post.folderId))}">
          📁 ${escapeHTML(getFolderName(post.folderId))}
        </span>
      ` : '';

      const moveButtonHTML = isDocument ? `
        <button class="move-action-btn" onclick="window.openMoveModal('${post.id}')" title="Di chuyển vào thư mục khác">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
          Di chuyển
        </button>
      ` : '';

      return `
        <article class="post-entry ${isDocument ? 'draggable' : ''}" 
                 id="${post.id}"
                 ${isDocument ? `draggable="true" ondragstart="window.handleFileDragStart(event, '${post.id}')" ondragend="window.handleFileDragEnd('${post.id}')"` : ''}>
          
          <div class="post-top">
            <div style="display:flex; align-items:center;">
              <span class="post-badge">${escapeHTML(post.category || 'Suy ngẫm')}</span>
              ${folderBadge}
            </div>
            <time class="post-timestamp">${escapeHTML(post.date || '')}</time>
          </div>

          <h2 class="post-heading">${escapeHTML(post.title)}</h2>

          ${mediaHTML}

          <div class="post-body">${escapeHTML(post.content)}</div>

          <div class="post-bottom">
            <span class="post-label">#nhật_ký</span>
            <div style="display:flex; gap:10px; align-items:center;">
              ${moveButtonHTML}
              <button class="delete-action-btn" onclick="window.deletePost('${post.id}')" title="Xóa bài viết này">
                Xóa bài
              </button>
            </div>
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

  /* ==========================================================================
     7. Tìm Kiếm Thông Minh & Gợi Ý Tức Thì (Search Suggestions)
     ========================================================================== */
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    renderPosts();
    renderSearchSuggestions(searchTerm);
  });

  function renderSearchSuggestions(query) {
    if (!query) {
      searchSuggestions.style.display = 'none';
      searchSuggestions.innerHTML = '';
      return;
    }

    const qLower = query.toLowerCase();

    // 1. Tìm trong thư mục
    const matchedFolders = foldersData.filter(f => f.name.toLowerCase().includes(qLower));

    // 2. Tìm trong tài liệu & bài viết
    const matchedPosts = postsData.filter(p => 
      (p.title && p.title.toLowerCase().includes(qLower)) ||
      (p.attachment && p.attachment.name && p.attachment.name.toLowerCase().includes(qLower)) ||
      (p.content && p.content.toLowerCase().includes(qLower))
    ).slice(0, 8);

    if (matchedFolders.length === 0 && matchedPosts.length === 0) {
      searchSuggestions.innerHTML = `
        <div style="padding:12px 14px; font-size:0.84rem; color:var(--text-tertiary); text-align:center;">
          Không tìm thấy thư mục hoặc bài viết nào với từ khóa "${escapeHTML(query)}".
        </div>
      `;
      searchSuggestions.style.display = 'block';
      return;
    }

    let html = '';

    if (matchedFolders.length > 0) {
      html += '<div class="suggestion-group-title">📁 Thư mục</div>';
      matchedFolders.forEach(f => {
        const count = postsData.filter(p => p.folderId === f.id).length;
        html += `
          <div class="suggestion-item" onclick="window.selectFolderSuggestion('${f.id}')">
            <span class="suggestion-icon">📂</span>
            <div class="suggestion-text-wrap">
              <div class="suggestion-title">${escapeHTML(f.name)}</div>
              <div class="suggestion-sub">${count} tài liệu bên trong</div>
            </div>
            <span class="suggestion-badge">Mở thư mục</span>
          </div>
        `;
      });
    }

    if (matchedPosts.length > 0) {
      html += '<div class="suggestion-group-title">📄 Tài liệu & Bài viết</div>';
      matchedPosts.forEach(p => {
        const isDoc = p.category === 'Tài liệu';
        const icon = isDoc ? '📄' : '✍️';
        html += `
          <div class="suggestion-item" onclick="window.selectPostSuggestion('${p.id}', '${p.category}')">
            <span class="suggestion-icon">${icon}</span>
            <div class="suggestion-text-wrap">
              <div class="suggestion-title">${escapeHTML(p.title)}</div>
              <div class="suggestion-sub">${escapeHTML(p.category)} • ${escapeHTML(p.date || '')}</div>
            </div>
            <span class="suggestion-badge">${escapeHTML(p.category)}</span>
          </div>
        `;
      });
    }

    searchSuggestions.innerHTML = html;
    searchSuggestions.style.display = 'block';
  }

  window.selectFolderSuggestion = function (folderId) {
    searchSuggestions.style.display = 'none';
    searchInput.value = '';
    searchTerm = '';

    // Kích hoạt tab Tài liệu
    document.querySelectorAll('.pill-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-cat') === 'Tài liệu');
    });
    currentCategory = 'Tài liệu';
    currentFolderId = folderId;

    renderExplorer();
    renderPosts();
  };

  window.selectPostSuggestion = function (postId, category) {
    searchSuggestions.style.display = 'none';
    searchInput.value = '';
    searchTerm = '';

    const post = postsData.find(p => p.id === postId);
    if (!post) return;

    if (post.category === 'Tài liệu') {
      document.querySelectorAll('.pill-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-cat') === 'Tài liệu');
      });
      currentCategory = 'Tài liệu';
      currentFolderId = post.folderId || null;
      renderExplorer();
      renderPosts();
    } else {
      document.querySelectorAll('.pill-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-cat') === 'all');
      });
      currentCategory = 'all';
      renderPosts();
    }

    setTimeout(() => {
      const el = document.getElementById(postId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'box-shadow 0.4s ease';
        el.style.boxShadow = '0 0 0 3px var(--accent)';
        setTimeout(() => { el.style.boxShadow = ''; }, 2000);
      }
    }, 150);
  };

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      searchSuggestions.style.display = 'none';
    }
  });

  /* ==========================================================================
     8. Soạn thảo, Thêm Tài liệu & Tệp đính kèm
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
      postCategory.value = 'Tài liệu';
      toggleFolderSelectVisibility();
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
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
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

  if (removeFileBtn) removeFileBtn.addEventListener('click', resetAttachment);

  function toggleFolderSelectVisibility() {
    if (folderSelectGroup) {
      const isDoc = postCategory.value === 'Tài liệu';
      folderSelectGroup.style.display = isDoc ? 'block' : 'none';
      if (isDoc && currentFolderId) {
        postFolderSelect.value = currentFolderId;
      }
    }
  }

  postCategory.addEventListener('change', toggleFolderSelectVisibility);

  window.openComposeModal = function () {
    modalOverlay.classList.add('open');
    toggleFolderSelectVisibility();
    document.getElementById('postTitle').focus();
  };

  window.openComposeDocModal = function () {
    postCategory.value = 'Tài liệu';
    updateFolderSelectDropdown();
    if (postFolderSelect) postFolderSelect.value = currentFolderId || '';
    window.openComposeModal();
  };

  if (uploadDocBtn) uploadDocBtn.addEventListener('click', window.openComposeDocModal);

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

  composeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('postTitle').value.trim();
    const category = postCategory.value;
    const videoUrl = postVideoInput.value.trim();
    const content = document.getElementById('postContent').value.trim();
    const folderId = category === 'Tài liệu' && postFolderSelect ? (postFolderSelect.value || null) : null;

    const payload = { 
      title, 
      category, 
      videoUrl, 
      content,
      attachment: currentAttachment,
      folderId: folderId
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
        console.warn('Lỗi gọi API create post');
      }
    }

    const now = new Date();
    const newPost = {
      id: 'post-' + Date.now(),
      title,
      category,
      videoUrl,
      content,
      attachment: currentAttachment,
      folderId: folderId,
      date: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(now),
      timestamp: Date.now()
    };
    postsData.unshift(newPost);
    localStorage.setItem('cached_posts', JSON.stringify(postsData));
    closeModal();
    renderExplorer();
    renderPosts();
  });

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
        console.warn('Lỗi API delete post');
      }
    }

    postsData = postsData.filter(p => p.id !== id);
    localStorage.setItem('cached_posts', JSON.stringify(postsData));
    renderExplorer();
    renderPosts();
  };

  /* ==========================================================================
     9. Bộ Lọc Chuyên Mục
     ========================================================================== */
  catFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill-btn');
    if (!btn) return;
    document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.getAttribute('data-cat') || 'all';

    renderExplorer();
    renderPosts();
  });

  /* ==========================================================================
     10. Sao lưu & Khôi phục Tệp Cục Bộ (Local JSON)
     ========================================================================== */
  exportBtn.addEventListener('click', () => {
    const backupObj = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      posts: postsData,
      folders: foldersData
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `khoang-lang-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  });

  importBtn.addEventListener('click', () => filePicker.click());
  filePicker.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported && Array.isArray(imported.posts)) {
          if (isApiAvailable) {
            await fetch('/api/backup/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(imported)
            });
          }
          postsData = imported.posts;
          foldersData = imported.folders || [];
          localStorage.setItem('cached_posts', JSON.stringify(postsData));
          localStorage.setItem('cached_folders', JSON.stringify(foldersData));
          updateFolderSelectDropdown();
          renderExplorer();
          renderPosts();
          alert('Khôi phục bài viết và cây thư mục thành công!');
        } else if (Array.isArray(imported)) {
          postsData = imported;
          localStorage.setItem('cached_posts', JSON.stringify(postsData));
          renderPosts();
          alert('Khôi phục danh sách bài viết thành công!');
        } else {
          alert('Tệp sao lưu không đúng định dạng!');
        }
      } catch (err) {
        alert('Lỗi đọc tệp sao lưu: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  /* ==========================================================================
     11. Đăng nhập Google & Sao lưu / Đồng bộ Google Drive
     ========================================================================== */
  function getGoogleClientId() {
    return localStorage.getItem('gdrive_client_id') || '';
  }

  function showGdriveMsg(msg, type = 'info') {
    if (!gdriveStatusMsg) return;
    gdriveStatusMsg.className = `gdrive-status-message ${type}`;
    gdriveStatusMsg.textContent = msg;
    gdriveStatusMsg.style.display = 'block';
  }

  function updateGdriveUI() {
    if (gdriveAccessToken && gdriveUser) {
      if (gdriveStatusDot) gdriveStatusDot.classList.add('connected');
      if (gdriveUserName) gdriveUserName.textContent = gdriveUser.name || 'Người dùng Google';
      if (gdriveUserEmail) gdriveUserEmail.textContent = gdriveUser.email || '';
      if (gdriveUserAvatar) {
        if (gdriveUser.picture) {
          gdriveUserAvatar.innerHTML = `<img src="${gdriveUser.picture}" alt="Avatar">`;
        } else {
          gdriveUserAvatar.textContent = '👤';
        }
      }
      if (gdriveLoginBtn) gdriveLoginBtn.style.display = 'none';
      if (gdriveLogoutBtn) gdriveLogoutBtn.style.display = 'inline-block';
      if (gdriveOperations) gdriveOperations.style.display = 'block';
    } else {
      if (gdriveStatusDot) gdriveStatusDot.classList.remove('connected');
      if (gdriveUserName) gdriveUserName.textContent = 'Chưa đăng nhập tài khoản Google';
      if (gdriveUserEmail) gdriveUserEmail.textContent = 'Đăng nhập để tự động lưu trữ lên Google Drive của bạn';
      if (gdriveUserAvatar) gdriveUserAvatar.textContent = '👤';
      if (gdriveLoginBtn) gdriveLoginBtn.style.display = 'inline-flex';
      if (gdriveLogoutBtn) gdriveLogoutBtn.style.display = 'none';
      if (gdriveOperations) gdriveOperations.style.display = 'none';
      if (gdriveBackupsContainer) gdriveBackupsContainer.style.display = 'none';
    }
  }

  function openGdriveModal() {
    googleDriveModal.classList.add('open');
    if (customClientIdInput) {
      customClientIdInput.value = getGoogleClientId();
    }
    updateGdriveUI();
  }

  function closeGdriveModal() {
    googleDriveModal.classList.remove('open');
    if (gdriveStatusMsg) gdriveStatusMsg.style.display = 'none';
  }

  if (openGoogleDriveBtn) openGoogleDriveBtn.addEventListener('click', openGdriveModal);
  if (openGoogleDriveFooterBtn) openGoogleDriveFooterBtn.addEventListener('click', openGdriveModal);
  if (closeGdriveModalBtn) closeGdriveModalBtn.addEventListener('click', closeGdriveModal);
  if (closeGdriveModalBottomBtn) closeGdriveModalBottomBtn.addEventListener('click', closeGdriveModal);
  if (googleDriveModal) {
    googleDriveModal.addEventListener('click', (e) => {
      if (e.target === googleDriveModal) closeGdriveModal();
    });
  }

  if (saveClientIdBtn && customClientIdInput) {
    saveClientIdBtn.addEventListener('click', () => {
      const val = customClientIdInput.value.trim();
      localStorage.setItem('gdrive_client_id', val);
      showGdriveMsg('Đã lưu cấu hình Google Client ID thành công!', 'success');
    });
  }

  // Khởi tạo OAuth Token Client của Google
  function initGoogleTokenClient() {
    const clientId = getGoogleClientId();
    if (!clientId) {
      showGdriveMsg('Vui lòng mở mục "⚙️ Cấu hình Google Cloud Client ID" ở dưới và nhập Client ID của bạn để đăng nhập.', 'info');
      return null;
    }

    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            gdriveAccessToken = tokenResponse.access_token;
            showGdriveMsg('Đang lấy thông tin tài khoản Google...', 'info');
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${gdriveAccessToken}` }
              });
              if (res.ok) {
                gdriveUser = await res.json();
                updateGdriveUI();
                showGdriveMsg(`🎉 Xin chào ${gdriveUser.name}! Đã kết nối Google Drive thành công.`, 'success');
              } else {
                gdriveUser = { name: 'Google User', email: '' };
                updateGdriveUI();
              }
            } catch (err) {
              gdriveUser = { name: 'Google User', email: '' };
              updateGdriveUI();
            }
          }
        }
      });
      return tokenClient;
    }
    return null;
  }

  if (gdriveLoginBtn) {
    gdriveLoginBtn.addEventListener('click', () => {
      const client = initGoogleTokenClient();
      if (client) {
        client.requestAccessToken();
      }
    });
  }

  if (gdriveLogoutBtn) {
    gdriveLogoutBtn.addEventListener('click', () => {
      if (gdriveAccessToken && window.google && window.google.accounts && window.google.accounts.oauth2) {
        window.google.accounts.oauth2.revoke(gdriveAccessToken, () => {
          gdriveAccessToken = null;
          gdriveUser = null;
          updateGdriveUI();
          showGdriveMsg('Đã đăng xuất tài khoản Google.', 'info');
        });
      } else {
        gdriveAccessToken = null;
        gdriveUser = null;
        updateGdriveUI();
      }
    });
  }

  // Sao lưu lên Google Drive
  if (gdriveBackupNowBtn) {
    gdriveBackupNowBtn.addEventListener('click', async () => {
      if (!gdriveAccessToken) {
        showGdriveMsg('Vui lòng đăng nhập Google trước khi sao lưu.', 'error');
        return;
      }

      showGdriveMsg('Đang đóng gói dữ liệu và tải lên Google Drive...', 'info');

      try {
        const backupData = {
          version: '1.0',
          appName: 'KhoangLangJournal',
          exportedAt: new Date().toISOString(),
          posts: postsData,
          folders: foldersData
        };

        const fileContent = JSON.stringify(backupData, null, 2);
        const fileName = `PersonalJournal_Backup_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.json`;

        const metadata = {
          name: fileName,
          mimeType: 'application/json',
          description: 'Bản sao lưu nhật ký, tài liệu và cấu trúc thư mục của ứng dụng note.nghthien'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'application/json' }));

        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${gdriveAccessToken}` },
          body: form
        });

        if (uploadRes.ok) {
          showGdriveMsg(`🎉 Sao lưu thành công! Tệp "${fileName}" đã được lưu an toàn trên Google Drive.`, 'success');
        } else {
          const errData = await uploadRes.json();
          showGdriveMsg('Lỗi sao lưu lên Drive: ' + (errData.error ? errData.error.message : 'Upload failed'), 'error');
        }
      } catch (err) {
        showGdriveMsg('Lỗi kết nối khi sao lưu: ' + err.message, 'error');
      }
    });
  }

  // Lấy danh sách sao lưu từ Google Drive
  if (gdriveFetchBackupsBtn) {
    gdriveFetchBackupsBtn.addEventListener('click', async () => {
      if (!gdriveAccessToken) {
        showGdriveMsg('Vui lòng đăng nhập Google trước.', 'error');
        return;
      }

      showGdriveMsg('Đang tìm kiếm các bản sao lưu trên Drive của bạn...', 'info');

      try {
        const q = encodeURIComponent("name contains 'PersonalJournal_Backup_' and trashed = false");
        const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`, {
          headers: { Authorization: `Bearer ${gdriveAccessToken}` }
        });

        if (listRes.ok) {
          const data = await listRes.json();
          const files = data.files || [];

          if (files.length === 0) {
            gdriveBackupsList.innerHTML = '<div style="padding:10px; font-size:0.8rem; color:var(--text-tertiary);">Chưa có bản sao lưu nào trên Google Drive.</div>';
          } else {
            gdriveBackupsList.innerHTML = files.map(file => {
              const d = new Date(file.createdTime).toLocaleString('vi-VN');
              return `
                <div class="gdrive-backup-row">
                  <div>
                    <div class="gdrive-backup-name">📄 ${escapeHTML(file.name)}</div>
                    <div class="gdrive-backup-time">${d} • ${formatBytes(parseInt(file.size || '0', 10))}</div>
                  </div>
                  <button type="button" class="btn btn-outline btn-sm" onclick="window.restoreFromDriveFile('${file.id}', '${escapeHTML(file.name)}')">
                    Khôi phục
                  </button>
                </div>
              `;
            }).join('');
          }
          gdriveBackupsContainer.style.display = 'block';
          showGdriveMsg(`Tìm thấy ${files.length} bản sao lưu trên Drive.`, 'success');
        } else {
          showGdriveMsg('Không thể lấy danh sách từ Drive.', 'error');
        }
      } catch (err) {
        showGdriveMsg('Lỗi khi tải danh sách sao lưu: ' + err.message, 'error');
      }
    });
  }

  window.restoreFromDriveFile = async function (fileId, fileName) {
    if (!confirm(`Bạn có chắc muốn khôi phục dữ liệu từ bản sao lưu:\n"${fileName}"?\nDữ liệu hiện tại sẽ được cập nhật.`)) return;

    showGdriveMsg('Đang tải nội dung bản sao lưu từ Google Drive...', 'info');

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${gdriveAccessToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.posts)) {
          if (isApiAvailable) {
            await fetch('/api/backup/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
          }
          postsData = data.posts;
          foldersData = data.folders || [];
          localStorage.setItem('cached_posts', JSON.stringify(postsData));
          localStorage.setItem('cached_folders', JSON.stringify(foldersData));

          updateFolderSelectDropdown();
          renderExplorer();
          renderPosts();

          showGdriveMsg(`🎉 Đã khôi phục thành công từ bản sao lưu "${fileName}"!`, 'success');
        } else {
          showGdriveMsg('Nội dung file sao lưu không hợp lệ.', 'error');
        }
      } else {
        showGdriveMsg('Không thể tải tệp này từ Google Drive.', 'error');
      }
    } catch (err) {
      showGdriveMsg('Lỗi khi khôi phục: ' + err.message, 'error');
    }
  };

  /* ==========================================================================
     12. Khởi Động Ứng Dụng
     ========================================================================== */
  async function initApp() {
    await loadFolders();
    await loadPosts();
  }

  initApp();
})();
