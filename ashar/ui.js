/* =========================================================
   CITIZEN SERVICE REQUEST MANAGEMENT SYSTEM
   ui.js — UI Rendering, Events, Navigation
   ========================================================= */

'use strict';

/* ─────────────────────────────────────────────────────────
   PAGE NAVIGATION
   ───────────────────────────────────────────────────────── */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  
  const link = document.querySelector(`.nav-links a[data-page="${pageId}"]`);
  if (link) link.classList.add('active');
  
  // Close mobile nav
  document.getElementById('navLinks').classList.remove('open');
  
  // Special logic per page
  if (pageId === 'admin') {
    renderAdminPage();
  }
  if (pageId === 'home') {
    updateHomeStats();
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─────────────────────────────────────────────────────────
   TOAST NOTIFICATIONS
   ───────────────────────────────────────────────────────── */
function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toastContainer');
  
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-msg">${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

/* ─────────────────────────────────────────────────────────
   LOADING SCREEN
   ───────────────────────────────────────────────────────── */
function hideLoader() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    setTimeout(() => {
      overlay.classList.add('hidden');
      setTimeout(() => overlay.remove(), 400);
    }, 900);
  }
}

/* ─────────────────────────────────────────────────────────
   DARK / LIGHT MODE
   ───────────────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem(LS_THEME) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(LS_THEME, next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

/* ─────────────────────────────────────────────────────────
   HOME PAGE
   ───────────────────────────────────────────────────────── */
function updateHomeStats() {
  const s = getStats();
  
  const el = (id) => document.getElementById(id);
  
  const totalEl    = el('home-total');
  const pendingEl  = el('home-pending');
  const resolvedEl = el('home-resolved');
  
  if (totalEl)    animateNumber(totalEl, 0, s.total,    600);
  if (pendingEl)  animateNumber(pendingEl,  0, s.pending,  600);
  if (resolvedEl) animateNumber(resolvedEl, 0, s.resolved, 600);
}

function animateNumber(el, from, to, duration) {
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(from + (to - from) * easeOut(progress));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

/* ─────────────────────────────────────────────────────────
   SUBMIT COMPLAINT FORM
   ───────────────────────────────────────────────────────── */
let previewImageBase64 = null;

function initSubmitForm() {
  const form        = document.getElementById('complaintForm');
  const imgInput    = document.getElementById('imgInput');
  const imgPreview  = document.getElementById('imgPreview');
  const clearImgBtn = document.getElementById('clearImg');
  
  if (!form) return;
  
  // Image preview
  imgInput.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    
    if (file.size > 3 * 1024 * 1024) {
      showToast('Image too large. Max 3MB.', 'error');
      this.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImageBase64 = e.target.result;
      imgPreview.src = previewImageBase64;
      imgPreview.style.display = 'block';
      clearImgBtn.style.display = 'inline-flex';
      document.querySelector('.upload-text').textContent = file.name;
    };
    reader.readAsDataURL(file);
  });
  
  clearImgBtn.addEventListener('click', () => {
    previewImageBase64 = null;
    imgInput.value = '';
    imgPreview.style.display = 'none';
    clearImgBtn.style.display = 'none';
    document.querySelector('.upload-text').textContent = 'Click to upload or drag & drop';
  });
  
  // Form submit
  form.addEventListener('submit', handleFormSubmit);
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const fields = {
    name:        document.getElementById('f-name'),
    location:    document.getElementById('f-location'),
    issueType:   document.getElementById('f-issue'),
    description: document.getElementById('f-desc')
  };
  
  // Validate
  let isValid = true;
  
  Object.entries(fields).forEach(([key, el]) => {
    const errEl = document.getElementById(`err-${key === 'issueType' ? 'issue' : key}`);
    
    if (!el.value.trim()) {
      el.classList.add('error');
      if (errEl) errEl.classList.add('show');
      isValid = false;
    } else {
      el.classList.remove('error');
      if (errEl) errEl.classList.remove('show');
    }
  });
  
  if (!isValid) {
    showToast('Please fill all required fields.', 'error');
    return;
  }
  
  // Fake loading delay
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Submitting...';
  
  setTimeout(() => {
    const complaint = addComplaint({
      name:        fields.name.value,
      location:    fields.location.value,
      issueType:   fields.issueType.value,
      description: fields.description.value,
      imageBase64: previewImageBase64
    });
    
    submitBtn.disabled = false;
    submitBtn.textContent = '📤 Submit Complaint';
    
    // Show success banner
    const banner = document.getElementById('successBanner');
    document.getElementById('newComplaintId').textContent = complaint.id;
    banner.classList.add('show');
    banner.scrollIntoView({ behavior: 'smooth' });
    
    // Reset form
    document.getElementById('complaintForm').reset();
    previewImageBase64 = null;
    document.getElementById('imgPreview').style.display = 'none';
    document.getElementById('clearImg').style.display = 'none';
    document.querySelector('.upload-text').textContent = 'Click to upload or drag & drop';
    
    showToast(`Complaint ${complaint.id} submitted!`, 'success');
    
  }, 1200);
}

/* ─────────────────────────────────────────────────────────
   TRACK COMPLAINT
   ───────────────────────────────────────────────────────── */
function initTrackForm() {
  const btn = document.getElementById('trackBtn');
  const input = document.getElementById('trackInput');
  
  if (!btn) return;
  
  btn.addEventListener('click', doTrack);
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') doTrack(); });
}

function doTrack() {
  const input = document.getElementById('trackInput');
  const id    = input.value.trim().toUpperCase();
  
  if (!id) {
    showToast('Please enter a Complaint ID.', 'error');
    return;
  }
  
  // O(1) lookup via hash table
  const complaint = getComplaintById(id);
  
  if (!complaint) {
    showToast(`No complaint found with ID: ${id}`, 'error');
    document.getElementById('complaintDetail').classList.remove('show');
    return;
  }
  
  renderComplaintDetail(complaint);
  showToast('Complaint found!', 'success', 2000);
}

function renderComplaintDetail(c) {
  const el = (id) => document.getElementById(id);
  
  el('d-id').textContent          = c.id;
  el('d-name').textContent        = c.name;
  el('d-location').textContent    = c.location;
  el('d-issue').textContent       = `${issueIcon(c.issueType)} ${c.issueType}`;
  el('d-desc').textContent        = c.description;
  el('d-created').textContent     = formatDate(c.createdAt);
  el('d-updated').textContent     = formatDate(c.updatedAt);
  el('d-status').innerHTML        = statusBadge(c.status);
  
  // Image
  const imgWrap = el('d-img');
  const imgTag  = el('d-img-tag');
  if (c.imageBase64) {
    imgTag.src = c.imageBase64;
    imgWrap.style.display = 'block';
  } else {
    imgWrap.style.display = 'none';
  }
  
  // Timeline
  const timelineEl = el('d-timeline');
  const allSteps = ['Submitted', 'Pending', 'In Progress', 'Resolved'];
  
  // Build timeline from complaint.timeline array
  const completedStatuses = new Set(c.timeline.map(t => t.status));
  
  timelineEl.innerHTML = c.timeline.map((t, i) => {
    const isLast   = i === c.timeline.length - 1;
    const dotClass = isLast ? 'active' : 'done';
    return `
      <li class="timeline-item">
        <div class="tl-dot ${dotClass}">${isLast ? '●' : '✓'}</div>
        <div class="tl-content">
          <div class="tl-status">${t.status}</div>
          <div class="tl-time">${formatDate(t.time)}</div>
        </div>
      </li>
    `;
  }).join('');
  
  el('complaintDetail').classList.add('show');
  el('complaintDetail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ─────────────────────────────────────────────────────────
   ADMIN — PAGE ROUTER
   ───────────────────────────────────────────────────────── */
function renderAdminPage() {
  if (isAdminLoggedIn) {
    document.getElementById('adminLogin').style.display   = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    renderDashboard();
  } else {
    document.getElementById('adminLogin').style.display   = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
  }
}

/* ─────────────────────────────────────────────────────────
   ADMIN LOGIN
   ───────────────────────────────────────────────────────── */
function initAdminLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('l-username').value.trim();
    const password = document.getElementById('l-password').value;
    const errEl    = document.getElementById('login-error');
    const btnEl    = document.getElementById('loginBtn');
    
    btnEl.disabled = true;
    btnEl.textContent = '🔐 Signing in...';
    
    setTimeout(() => {
      if (adminLogin(username, password)) {
        isAdminLoggedIn = true;
        showToast('Welcome, Admin!', 'success');
        renderAdminPage();
      } else {
        errEl.style.display = 'block';
        showToast('Invalid credentials.', 'error');
      }
      
      btnEl.disabled = false;
      btnEl.textContent = '🔐 Sign In';
    }, 800);
  });
}

function logoutAdmin() {
  isAdminLoggedIn = false;
  showToast('Logged out.', 'info');
  renderAdminPage();
}

/* ─────────────────────────────────────────────────────────
   ADMIN DASHBOARD
   ───────────────────────────────────────────────────────── */
let donutChart = null;
let barChart   = null;

function renderDashboard() {
  const s = getStats();
  
  // Stat cards
  document.getElementById('dash-total').textContent    = s.total;
  document.getElementById('dash-pending').textContent  = s.pending;
  document.getElementById('dash-progress').textContent = s.progress;
  document.getElementById('dash-resolved').textContent = s.resolved;
  document.getElementById('dash-pending-pct').textContent  = `${s.pendingPct}% of total`;
  document.getElementById('dash-resolved-pct').textContent = `${s.resolvedPct}% of total`;
  document.getElementById('dash-queue').textContent    = `Queue: ${s.queueLength} pending`;
  
  renderCharts(s);
  renderComplaintsTable(getAllComplaints());
}

/* ─────────────────────────────────────────────────────────
   CHARTS (Chart.js)
   ───────────────────────────────────────────────────────── */
function renderCharts(s) {
  renderDonut(s);
  renderBar();
}

function renderDonut(s) {
  const canvas = document.getElementById('donutChart');
  if (!canvas) return;
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#a8a29a' : '#9a9590';
  
  if (donutChart) donutChart.destroy();
  
  donutChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'In Progress', 'Resolved'],
      datasets: [{
        data:            [s.pending, s.progress, s.resolved],
        backgroundColor: ['#d4880a', '#2d6be4', '#1e8c5a'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor, padding: 16, font: { size: 12 }, usePointStyle: true }
        }
      }
    }
  });
}

function renderBar() {
  const canvas = document.getElementById('barChart');
  if (!canvas) return;
  
  const breakdown = getIssueBreakdown();
  const labels    = Object.keys(breakdown);
  const values    = Object.values(breakdown);
  
  const isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#a8a29a' : '#9a9590';
  const gridColor = isDark ? '#3a3632' : '#ddd9d1';
  
  if (barChart) barChart.destroy();
  
  barChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Complaints',
        data: values,
        backgroundColor: '#d95f2b',
        borderRadius: 6,
        barPercentage: 0.55
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          ticks: { color: textColor, precision: 0 },
          grid:  { color: gridColor }
        },
        x: {
          ticks: { color: textColor },
          grid:  { display: false }
        }
      }
    }
  });
}

/* ─────────────────────────────────────────────────────────
   COMPLAINTS TABLE
   ───────────────────────────────────────────────────────── */
function renderComplaintsTable(complaints) {
  const tbody  = document.getElementById('complaintsTableBody');
  const noData = document.getElementById('noData');
  
  if (!tbody) return;
  
  if (complaints.length === 0) {
    tbody.innerHTML = '';
    noData.style.display = 'block';
    return;
  }
  
  noData.style.display = 'none';
  
  tbody.innerHTML = complaints.map(c => `
    <tr>
      <td><span class="id-cell">${c.id}</span></td>
      <td><span class="name-cell">${escHtml(c.name)}</span></td>
      <td>${escHtml(c.location)}</td>
      <td>${issueIcon(c.issueType)} ${c.issueType}</td>
      <td>${statusBadge(c.status)}</td>
      <td>${formatDateShort(c.createdAt)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-blue" onclick="openUpdateModal('${c.id}')">
            ✏️ Update
          </button>
          <button class="btn btn-sm btn-outline" onclick="viewDetailModal('${c.id}')">
            👁 View
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────────────────────────
   TABLE — FILTER & SEARCH
   ───────────────────────────────────────────────────────── */
function filterAndSearch() {
  const query  = (document.getElementById('tableSearch').value || '').toLowerCase().trim();
  const filter = document.getElementById('statusFilter').value;
  
  let results = getAllComplaints();
  
  // Filter by status
  if (filter && filter !== 'all') {
    results = results.filter(c => c.status === filter);
  }
  
  // Search by ID, name, location
  if (query) {
    results = results.filter(c =>
      c.id.toLowerCase().includes(query)   ||
      c.name.toLowerCase().includes(query) ||
      c.location.toLowerCase().includes(query) ||
      c.issueType.toLowerCase().includes(query)
    );
  }
  
  renderComplaintsTable(results);
}

/* ─────────────────────────────────────────────────────────
   UPDATE STATUS MODAL
   ───────────────────────────────────────────────────────── */
let currentEditId = null;

function openUpdateModal(id) {
  const complaint = htGet(id);
  if (!complaint) return;
  
  currentEditId = id;
  
  document.getElementById('modal-id').textContent     = complaint.id;
  document.getElementById('modal-name').textContent   = complaint.name;
  document.getElementById('modal-issue').textContent  = `${issueIcon(complaint.issueType)} ${complaint.issueType}`;
  document.getElementById('modal-status').innerHTML   = statusBadge(complaint.status);
  document.getElementById('new-status').value         = complaint.status;
  
  document.getElementById('updateModal').classList.add('open');
}

function closeUpdateModal() {
  document.getElementById('updateModal').classList.remove('open');
  currentEditId = null;
}

function saveStatusUpdate() {
  if (!currentEditId) return;
  
  const newStatus = document.getElementById('new-status').value;
  const success   = updateComplaintStatus(currentEditId, newStatus);
  
  if (success) {
    showToast(`Status updated to "${newStatus}"`, 'success');
    closeUpdateModal();
    renderDashboard();
  } else {
    showToast('Update failed. Please try again.', 'error');
  }
}

/* ─────────────────────────────────────────────────────────
   VIEW DETAIL MODAL (Admin)
   ───────────────────────────────────────────────────────── */
function viewDetailModal(id) {
  const c = htGet(id);
  if (!c) return;
  
  const content = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; font-size:0.9rem;">
      <div>
        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-3);margin-bottom:3px;font-weight:700;">Complaint ID</div>
        <div style="font-family:monospace;color:var(--accent);font-weight:700;">${c.id}</div>
      </div>
      <div>
        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-3);margin-bottom:3px;font-weight:700;">Status</div>
        <div>${statusBadge(c.status)}</div>
      </div>
      <div>
        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-3);margin-bottom:3px;font-weight:700;">Citizen</div>
        <div>${escHtml(c.name)}</div>
      </div>
      <div>
        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-3);margin-bottom:3px;font-weight:700;">Location</div>
        <div>${escHtml(c.location)}</div>
      </div>
      <div>
        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-3);margin-bottom:3px;font-weight:700;">Issue Type</div>
        <div>${issueIcon(c.issueType)} ${c.issueType}</div>
      </div>
      <div>
        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-3);margin-bottom:3px;font-weight:700;">Submitted</div>
        <div>${formatDate(c.createdAt)}</div>
      </div>
      <div style="grid-column:1/-1;">
        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-3);margin-bottom:3px;font-weight:700;">Description</div>
        <div style="line-height:1.6;color:var(--text-2);">${escHtml(c.description)}</div>
      </div>
      ${c.imageBase64 ? `
      <div style="grid-column:1/-1;">
        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-3);margin-bottom:8px;font-weight:700;">Attached Image</div>
        <img src="${c.imageBase64}" style="max-width:100%;max-height:220px;border-radius:8px;border:1px solid var(--border);object-fit:cover;" />
      </div>` : ''}
    </div>
    
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">
      <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-3);margin-bottom:12px;font-weight:700;">Timeline</div>
      ${c.timeline.map((t, i) => `
        <div style="display:flex;gap:10px;align-items:center;padding:5px 0;font-size:0.85rem;">
          <span style="color:var(--accent);font-size:1rem;">${i === c.timeline.length - 1 ? '●' : '○'}</span>
          <span style="font-weight:600;">${t.status}</span>
          <span style="color:var(--text-3);margin-left:auto;">${formatDate(t.time)}</span>
        </div>
      `).join('')}
    </div>
  `;
  
  document.getElementById('viewModalContent').innerHTML = content;
  document.getElementById('viewModal').classList.add('open');
}

function closeViewModal() {
  document.getElementById('viewModal').classList.remove('open');
}

/* ─────────────────────────────────────────────────────────
   QUEUE VISUALIZER (Admin)
   ───────────────────────────────────────────────────────── */
function renderQueueView() {
  const container = document.getElementById('queueVisual');
  if (!container) return;
  
  if (complaintQueue.length === 0) {
    container.innerHTML = '<p style="color:var(--text-3);font-size:0.88rem;text-align:center;padding:20px;">Queue is empty — all complaints processed!</p>';
    return;
  }
  
  container.innerHTML = complaintQueue.map((id, i) => {
    const c = htGet(id);
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg-alt);border-radius:8px;font-size:0.85rem;border:1px solid var(--border);">
        <span style="font-family:var(--font-display);font-weight:700;color:var(--text-3);width:20px;">${i + 1}</span>
        <span style="font-family:monospace;color:var(--accent);font-weight:600;">${id}</span>
        ${c ? `<span style="color:var(--text-2);">— ${escHtml(c.name)}</span>
               <span style="margin-left:auto;">${issueIcon(c.issueType)}</span>` : ''}
      </div>
    `;
  }).join('');
}

/* ─────────────────────────────────────────────────────────
   HASH TABLE VISUALIZER (Admin — DSA info)
   ───────────────────────────────────────────────────────── */
function renderHashTableInfo() {
  const el = document.getElementById('hashTableInfo');
  if (!el) return;
  
  const keys     = Object.keys(complaintHashTable);
  const total    = keys.length;
  const lastThree = keys.slice(-3);
  
  el.innerHTML = `
    <div style="font-size:0.82rem;color:var(--text-2);">
      <div style="margin-bottom:8px;">
        <span style="font-weight:700;color:var(--text);">Entries:</span> ${total}
        &nbsp;|&nbsp;
        <span style="font-weight:700;color:var(--text);">Type:</span> JavaScript Object (Hash Map)
      </div>
      ${lastThree.map(k => `
        <div style="padding:4px 8px;background:var(--bg);border-radius:5px;margin-bottom:4px;font-family:monospace;font-size:0.8rem;">
          <span style="color:var(--accent);">"${k}"</span>
          <span style="color:var(--text-3);">→</span>
          <span style="color:var(--text-2);">{ name: "${escHtml(complaintHashTable[k].name)}", status: "${complaintHashTable[k].status}" }</span>
        </div>
      `).join('')}
      ${total > 3 ? `<div style="color:var(--text-3);font-size:0.78rem;margin-top:4px;">...and ${total - 3} more entries</div>` : ''}
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────
   INIT ALL
   ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  hideLoader();
  
  // Nav links
  document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showPage(a.dataset.page);
    });
  });
  
  // Issue chips on home → navigate to submit
  document.querySelectorAll('.issue-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      showPage('submit');
      const select = document.getElementById('f-issue');
      if (select && chip.dataset.issue) {
        select.value = chip.dataset.issue;
      }
    });
  });
  
  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    toggleTheme();
    // Re-render charts if dashboard visible
    if (isAdminLoggedIn) {
      setTimeout(() => renderCharts(getStats()), 100);
    }
  });
  
  // Hamburger menu
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });
  
  // Forms
  initSubmitForm();
  initTrackForm();
  initAdminLogin();
  
  // Table filter & search
  document.getElementById('tableSearch') ?.addEventListener('input', filterAndSearch);
  document.getElementById('statusFilter')?.addEventListener('change', filterAndSearch);
  
  // Modal close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });
  
  // Show home by default
  showPage('home');
  
  // Show DSA info if admin is on dashboard
  setTimeout(() => {
    if (isAdminLoggedIn) {
      renderQueueView();
      renderHashTableInfo();
    }
  }, 100);
});
