// UI Navigation & State
document.addEventListener('DOMContentLoaded', async () => {
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabSections = document.querySelectorAll('.tab-section');
  const pageTitle = document.getElementById('pageTitle');

  const titlesMap = {
    dashboard: 'Downloads Auto-Sorter',
    activity: 'Activity History Log',
    categories: 'Folder & Extension Rules',
    settings: 'Sorter Preferences'
  };

  // Tab switching logic
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      navBtns.forEach(b => b.classList.remove('active'));
      tabSections.forEach(s => s.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
      pageTitle.textContent = titlesMap[targetTab] || 'Downloads Auto-Sorter';
    });
  });

  // Action Buttons
  const btnSortNow = document.getElementById('btnSortNow');
  const btnOpenFolder = document.getElementById('btnOpenFolder');
  const cardToggleState = document.getElementById('cardToggleState');
  const btnClearLog = document.getElementById('btnClearLog');
  const inputSearchLog = document.getElementById('inputSearchLog');
  const chkAutoStart = document.getElementById('chkAutoStart');
  const btnViewAllActivity = document.getElementById('btnViewAllActivity');

  // Open Downloads folder
  btnOpenFolder.addEventListener('click', () => {
    window.electronAPI.openDownloadsFolder();
  });

  // Sort Now
  btnSortNow.addEventListener('click', async () => {
    btnSortNow.disabled = true;
    btnSortNow.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      Sorting...
    `;

    try {
      const res = await window.electronAPI.sortNow();
      await refreshData();
      
      // Toast notice
      alert(`Sort Completed! ${res.movedCount} files organized.`);
    } catch (err) {
      console.error('Sort error:', err);
    } finally {
      btnSortNow.disabled = false;
      btnSortNow.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        Sort Existing Now
      `;
    }
  });

  // Toggle Watcher State
  cardToggleState.addEventListener('click', async () => {
    const res = await window.electronAPI.toggleWatcher();
    updateWatcherUI(res.enabled);
  });

  // Clear Log
  btnClearLog.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear the activity history log?')) {
      await window.electronAPI.clearHistory();
      await refreshData();
    }
  });

  // Search Filter
  inputSearchLog.addEventListener('input', () => {
    filterActivityTable(inputSearchLog.value.toLowerCase());
  });

  const btnTestNoti = document.getElementById('btnTestNoti');
  if (btnTestNoti) {
    btnTestNoti.addEventListener('click', async () => {
      await window.electronAPI.sendTestNotification();
    });
  }

  // View All Activity link
  btnViewAllActivity.addEventListener('click', () => {
    document.querySelector('.nav-btn[data-tab="activity"]').click();
  });

  // Real-time Event Listener for incoming sorted files!
  window.electronAPI.onFileMoved((record) => {
    refreshData();
  });

  window.electronAPI.onStatusChanged((data) => {
    updateWatcherUI(data.enabled);
    refreshData();
  });

  // Initial Load
  await loadInitialState();
});

let cachedHistory = [];
let cachedMappings = {};

async function loadInitialState() {
  const status = await window.electronAPI.getStatus();
  const autoStart = await window.electronAPI.getAutoStartStatus();

  document.getElementById('targetDirDisplay').textContent = status.downloadsDir;
  document.getElementById('chkAutoStart').checked = autoStart;

  updateWatcherUI(status.enabled);
  renderDashboard(status);
}

async function refreshData() {
  const status = await window.electronAPI.getStatus();
  renderDashboard(status);
}

function updateWatcherUI(enabled) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const statusDesc = document.getElementById('statusDesc');
  const statWatcherState = document.getElementById('statWatcherState');
  const toggleBtnText = document.getElementById('toggleBtnText');
  const toggleIconBg = document.getElementById('toggleIconBg');

  if (enabled) {
    statusDot.className = 'status-dot pulsing';
    statusText.textContent = 'Active';
    statusDesc.textContent = 'Monitoring Downloads folder';
    statWatcherState.textContent = 'Active';
    toggleBtnText.textContent = 'Pause Watcher';
    toggleIconBg.className = 'metric-icon icon-amber';
  } else {
    statusDot.className = 'status-dot paused';
    statusText.textContent = 'Paused';
    statusDesc.textContent = 'Background watching stopped';
    statWatcherState.textContent = 'Paused';
    toggleBtnText.textContent = 'Resume Watcher';
    toggleIconBg.className = 'metric-icon icon-emerald';
  }
}

function renderDashboard(status) {
  const stats = status.stats || { totalMoved: 0, categoryCounts: {} };
  cachedHistory = status.history || [];
  cachedMappings = status.mappings || {};

  // Total Moved Counter
  document.getElementById('statTotalMoved').textContent = stats.totalMoved;
  document.getElementById('statCategoriesCount').textContent = Object.keys(cachedMappings).length;

  // Render Category Badges Grid
  renderCategoryBadges(stats.categoryCounts);

  // Render Recent Activity List on Dashboard
  renderDashboardActivity(cachedHistory.slice(0, 5));

  // Render Activity Log Table
  renderActivityTable(cachedHistory);

  // Render Rules Categories Tab
  renderCategoriesRules(cachedMappings);
}

// Category Icons Mapping
const categoryIcons = {
  image: '🖼️',
  apk: '📱',
  videos: '🎥',
  documents: '📄',
  audio: '🎵',
  archives: '📦',
  executables: '⚙️',
  spreadsheets: '📊',
  presentations: '📽️',
  code: '💻',
  fonts: '🔤',
  '3d_models': '🧊',
  other: '📁'
};

function renderCategoryBadges(categoryCounts) {
  const grid = document.getElementById('categoryBadgesGrid');
  grid.innerHTML = '';

  const categories = Object.keys(cachedMappings);

  categories.forEach(cat => {
    const icon = categoryIcons[cat] || '📁';
    const count = categoryCounts[cat] || 0;

    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <div class="cat-badge-icon">${icon}</div>
      <div class="cat-badge-info">
        <div class="cat-badge-name">${cat}</div>
        <div class="cat-badge-count">${count} files sorted</div>
      </div>
    `;

    card.addEventListener('click', () => {
      window.electronAPI.openCategoryFolder(cat);
    });

    grid.appendChild(card);
  });
}

function renderDashboardActivity(records) {
  const list = document.getElementById('dashboardActivityList');

  if (!records || records.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>No files sorted yet. Downloads will appear here automatically when moved!</p>
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  records.forEach(rec => {
    const timeStr = new Date(rec.timestamp).toLocaleTimeString();
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-left">
        <div class="activity-file-icon">${(categoryIcons[rec.folderName] || '📁')}</div>
        <div>
          <div class="activity-title">${escapeHtml(rec.fileName)}</div>
          <div class="activity-sub">Moved to target folder</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 16px;">
        <span class="folder-pill">${escapeHtml(rec.folderName)}</span>
        <span class="activity-time">${timeStr}</span>
      </div>
    `;
    list.appendChild(item);
  });
}

function renderActivityTable(records) {
  const tbody = document.getElementById('activityTableBody');
  tbody.innerHTML = '';

  if (!records || records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">
          No history logged yet.
        </td>
      </tr>
    `;
    return;
  }

  records.forEach(rec => {
    const timeStr = new Date(rec.timestamp).toLocaleString();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600; color: #fff;">${escapeHtml(rec.fileName)}</td>
      <td><span class="folder-pill">${escapeHtml(rec.folderName)}</span></td>
      <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(rec.destPath)}</td>
      <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: var(--text-dim);">${timeStr}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openFileFolder('${escapeJs(rec.destPath)}')">Open</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterActivityTable(query) {
  const filtered = cachedHistory.filter(r => 
    r.fileName.toLowerCase().includes(query) || 
    r.folderName.toLowerCase().includes(query)
  );
  renderActivityTable(filtered);
}

function renderCategoriesRules(mappings) {
  const container = document.getElementById('fullCategoriesContainer');
  container.innerHTML = '';

  for (const [folderName, extList] of Object.entries(mappings)) {
    const card = document.createElement('div');
    card.className = 'category-rule-card';

    const chips = extList.map(ext => `<span class="ext-chip">${ext}</span>`).join('');
    const icon = categoryIcons[folderName] || '📁';

    card.innerHTML = `
      <div class="category-rule-header">
        <div class="category-rule-name">${icon} ${folderName}</div>
        <span class="badge">${extList.length} extensions</span>
      </div>
      <div class="extension-chips">
        ${chips}
      </div>
    `;

    container.appendChild(card);
  }
}

function openFileFolder(destPath) {
  window.electronAPI.openCategoryFolder(destPath);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

function escapeJs(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
