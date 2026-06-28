/* ═══════════════════════════════════════════════════════════
   ASMIRE Admin Panel — Full Controller
   ═══════════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://dduwjehethttrzdosmhf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkdXdqZWhldGh0dHJ6ZG9zbWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTc4NjMsImV4cCI6MjA5NzQzMzg2M30.5vHfgNEj1RXmL4ptuvsfKnXg0cyosM15rU-UVpsX3r8';

// ── Auth ────────────────────────────────────────────────────

const token = localStorage.getItem('adminToken');
if (!token) { window.location.replace('/admin-login.html'); }

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

async function api(method, path, body) {
  const opts = { method, headers: authHeaders() };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 401 || res.status === 403) {
    toast('Session expired. Redirecting to login…', 'error');
    setTimeout(() => { localStorage.clear(); window.location.replace('/admin-login.html'); }, 1500);
    return null;
  }
  return res.json();
}

// ── Toast Notifications ─────────────────────────────────────

function toast(message, type = 'default', duration = 3500) {
  const icons = {
    success: '✓', error: '✕', warning: '⚠', default: 'ℹ'
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  el.innerHTML = `<span style="font-size:1.1rem" aria-hidden="true">${icons[type] || icons.default}</span><span>${message}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 200);
  }, duration);
}

// ── Routing ─────────────────────────────────────────────────

let currentPage = 'dashboard';
const pageTitles = {
  dashboard: 'Dashboard', products: 'Products', categories: 'Categories',
  orders: 'Orders', customers: 'Customers', coupons: 'Coupons',
  media: 'Media Library', analytics: 'Analytics', seo: 'SEO', settings: 'Settings'
};

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;
  document.getElementById('pageContent').innerHTML = skeletonPage();

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');

  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'products': renderProducts(); break;
    case 'categories': renderCategories(); break;
    case 'orders': renderOrders(); break;
    case 'customers': renderCustomers(); break;
    case 'coupons': renderCoupons(); break;
    case 'media': renderMedia(); break;
    case 'analytics': renderAnalytics(); break;
    case 'seo': renderSEO(); break;
    case 'settings': renderSettings(); break;
  }
}

function skeletonPage() {
  return `<div style="padding-top:4px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <div class="skeleton" style="width:180px;height:28px;border-radius:8px"></div>
      <div class="skeleton" style="width:120px;height:36px;border-radius:8px"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
      ${[1,2,3,4].map(()=>`<div class="skeleton" style="height:110px;border-radius:10px"></div>`).join('')}
    </div>
    <div class="skeleton" style="height:300px;border-radius:10px"></div>
  </div>`;
}

// ── Modal Helpers ───────────────────────────────────────────

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function confirmAction(message, onConfirm) {
  document.getElementById('confirmMsg').textContent = message;
  document.getElementById('confirmDeleteBtn').onclick = () => { closeModal('confirmModal'); onConfirm(); };
  openModal('confirmModal');
}

// ── Format Helpers ──────────────────────────────────────────

function fmtCurrency(n, symbol = 'NPR') { return `${symbol} ${Number(n || 0).toLocaleString()}`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'; }
function fmtDateShort(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'; }
function statusBadge(status) {
  const map = {
    pending: 'badge-amber', processing: 'badge-blue', shipped: 'badge-purple',
    delivered: 'badge-green', completed: 'badge-green', cancelled: 'badge-red',
    unverified: 'badge-gray', active: 'badge-green', inactive: 'badge-gray'
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
}

// ══════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════

async function renderDashboard() {
  const data = await api('GET', '/api/admin/stats');
  if (!data) return;

  const currency = window._adminSettings?.currency || 'NPR';
  const chart = data.revenueChart || {};
  const days = Object.keys(chart).sort().slice(-14);
  const revenues = days.map(d => chart[d]?.revenue || 0);
  const orderCounts = days.map(d => chart[d]?.orders || 0);
  const maxRev = Math.max(...revenues, 1);

  document.getElementById('pageContent').innerHTML = `
    <!-- Stat Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div class="stat-label">Total Revenue</div>
        <div class="stat-value">${fmtCurrency(data.totalRevenue, currency)}</div>
        <div class="stat-change up">↑ From completed orders</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
        <div class="stat-label">Total Orders</div>
        <div class="stat-value">${(data.totalOrders || 0).toLocaleString()}</div>
        <div class="stat-change up">↑ All time</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>
        <div class="stat-label">Active Products</div>
        <div class="stat-value">${(data.activeProducts || 0).toLocaleString()}</div>
        <div class="stat-change">In catalog</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
        <div class="stat-label">Total Customers</div>
        <div class="stat-value">${(data.totalCustomers || 0).toLocaleString()}</div>
        <div class="stat-change">Unique emails</div>
      </div>
    </div>

    <!-- Revenue Chart -->
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:24px">
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Revenue &amp; Orders (Last 14 days)
          </div>
          <span style="font-size:.78rem;color:#999">Live data</span>
        </div>
        <canvas id="revenueChart" height="200"></canvas>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Order Status</div>
        </div>
        <canvas id="statusChart" height="220"></canvas>
        <div id="statusLegend" style="margin-top:14px;font-size:.82rem"></div>
      </div>
    </div>

    <!-- Recent Orders -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Recent Orders</div>
        <button class="btn btn-sm btn-secondary" onclick="navigateTo('orders')">View All</button>
      </div>
      <div class="table-wrap" id="recentOrdersTable">
        <div style="padding:30px;text-align:center;color:#aaa">Loading…</div>
      </div>
    </div>
  `;

  // Revenue/Orders dual chart
  const rCtx = document.getElementById('revenueChart').getContext('2d');
  new Chart(rCtx, {
    type: 'bar',
    data: {
      labels: days.map(d => fmtDateShort(d)),
      datasets: [
        { label: 'Revenue (NPR)', data: revenues, backgroundColor: '#c5a880', borderRadius: 4, yAxisID: 'y' },
        { label: 'Orders', data: orderCounts, type: 'line', borderColor: '#f4f4f5', backgroundColor: 'rgba(244, 244, 245, 0.05)', fill: true, tension: .4, pointRadius: 3, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true, interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#a1a1aa', font: { family: 'Inter', size: 11 }, usePointStyle: true }
        }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#a1a1aa', font: { family: 'Inter', size: 10 } } },
        y1: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { color: '#a1a1aa', font: { family: 'Inter', size: 10 } } },
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#a1a1aa', font: { family: 'Inter', size: 10 } } }
      }
    }
  });

  // Load recent orders
  const recentRes = await api('GET', '/api/admin/orders?limit=5');
  if (recentRes?.orders) {
    document.getElementById('recentOrdersTable').innerHTML = ordersTableHTML(recentRes.orders, true);
    // Load status chart
    const statusCounts = {};
    (recentRes.orders || []).forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
    // We'll get all orders for accurate status chart
    const allRes = await api('GET', '/api/admin/orders?limit=100');
    if (allRes?.orders) {
      const sc = {};
      allRes.orders.forEach(o => { sc[o.status] = (sc[o.status] || 0) + 1; });
      const labels = Object.keys(sc);
      const values = Object.values(sc);
      const colors = { pending: '#fbbf24', processing: '#60a5fa', shipped: '#a78bfa', delivered: '#34d399', completed: '#34d399', cancelled: '#f87171', unverified: '#71717a' };
      const sCtx = document.getElementById('statusChart').getContext('2d');
      new Chart(sCtx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{ data: values, backgroundColor: labels.map(l => colors[l] || '#a1a1aa'), borderWidth: 2, borderColor: '#121214' }]
        },
        options: {
          cutout: '70%',
          plugins: { legend: { display: false } }
        }
      });
      document.getElementById('statusLegend').innerHTML = labels.map((l, i) =>
        `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:10px;height:10px;border-radius:3px;background:${colors[l] || '#ccc'}"></div>
          <span style="flex:1;color:#666;text-transform:capitalize">${l}</span>
          <strong>${values[i]}</strong>
        </div>`
      ).join('');
    }
  }

  // Update pending badge
  const allOrd = await api('GET', '/api/admin/orders?status=pending&limit=1');
  if (allOrd?.total > 0) {
    const badge = document.getElementById('pendingOrderBadge');
    if (badge) { badge.textContent = allOrd.total; badge.style.display = ''; }
  }
}

// ══════════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════════

let productPage = 1, productTotal = 0, productFilter = { category: 'all', search: '', sort: 'created_at', order: 'desc' };
let selectedProducts = new Set();
let productImages = []; // for upload

async function renderProducts() {
  // Load categories for filter
  const catRes = await api('GET', '/api/admin/categories');
  const cats = catRes || [];

  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <h2>Products <span style="font-size:.9rem;font-weight:400;color:#999">(${productTotal})</span></h2>
      <div class="page-header-actions">
        <button class="btn btn-secondary btn-sm" onclick="exportProducts()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
        <button class="btn btn-primary" onclick="openProductModal()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search products…" id="productSearch" oninput="debouncedProductSearch(this.value)" value="${productFilter.search}" />
      </div>
      <select class="filter-select" onchange="productFilter.category=this.value;productPage=1;loadProductsTable()" id="catFilter">
        <option value="all">All Categories</option>
        ${cats.map(c => `<option value="${c.name}" ${productFilter.category===c.name?'selected':''}>${c.name}</option>`).join('')}
      </select>
      <select class="filter-select" onchange="productFilter.sort=this.value.split(':')[0];productFilter.order=this.value.split(':')[1];productPage=1;loadProductsTable()">
        <option value="created_at:desc">Newest First</option>
        <option value="created_at:asc">Oldest First</option>
        <option value="price:asc">Price: Low to High</option>
        <option value="price:desc">Price: High to Low</option>
        <option value="name:asc">Name A–Z</option>
        <option value="stock:asc">Stock: Low to High</option>
      </select>
    </div>

    <div id="bulkBar"></div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="checkbox-col"><input type="checkbox" id="selectAll" onchange="toggleSelectAll(this)" /></th>
            <th>Product</th>
            <th class="sortable" onclick="setSortProduct('category')">Category</th>
            <th class="sortable" onclick="setSortProduct('price')">Price</th>
            <th class="sortable" onclick="setSortProduct('stock')">Stock</th>
            <th>Status</th>
            <th>Created</th>
            <th style="width:100px">Actions</th>
          </tr>
        </thead>
        <tbody id="productsTableBody">
          <tr><td colspan="8" style="text-align:center;padding:40px;color:#aaa">Loading…</td></tr>
        </tbody>
      </table>
    </div>
    <div id="productPagination" class="pagination"></div>
  `;

  loadProductsTable();
}

async function loadProductsTable() {
  const qs = new URLSearchParams({ page: productPage, limit: 15, ...productFilter });
  const res = await api('GET', `/api/admin/products?${qs}`);
  if (!res) return;
  productTotal = res.total || 0;

  const tbody = document.getElementById('productsTableBody');
  if (!res.products?.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg><h3>No products found</h3><p>Add your first product to get started</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = res.products.map(p => {
    const imgSrc = (p.images?.[0] || '');
    const stockClass = p.stock <= 5 ? 'stock-low' : p.stock <= 20 ? 'stock-med' : '';
    const stockPct = Math.min(100, (p.stock / 100) * 100);
    return `<tr>
      <td><input type="checkbox" class="prod-cb" value="${p.id}" onchange="onProductCheckbox()" /></td>
      <td>
        <div class="product-cell">
          ${imgSrc ? `<img src="${imgSrc}" class="product-thumb" alt="${p.name}" onerror="this.style.display='none'">` : `<div class="product-thumb-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`}
          <div>
            <div class="product-name">${p.name}</div>
            <div class="product-sku">ID #${p.id}</div>
          </div>
        </div>
      </td>
      <td>${p.category || '—'}</td>
      <td><strong>NPR ${Number(p.price).toLocaleString()}</strong></td>
      <td>
        <div class="stock-bar ${stockClass}">
          <span class="stock-num">${p.stock ?? 0}</span>
          <div class="stock-bar-inner"><div class="stock-bar-fill" style="width:${Math.min(100,((p.stock||0)/100)*100)}%"></div></div>
        </div>
      </td>
      <td>${statusBadge(p.active ? 'active' : 'inactive')}</td>
      <td>${fmtDate(p.created_at)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-icon" title="Edit" onclick="editProduct(${p.id})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon danger" title="Delete" onclick="deleteProduct(${p.id},'${p.name.replace(/'/g,"\\'")}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Pagination
  const totalPages = Math.ceil(productTotal / 15);
  renderPagination('productPagination', productPage, totalPages, (p) => { productPage = p; loadProductsTable(); });

  // Update header count
  document.querySelector('.page-header h2').innerHTML = `Products <span style="font-size:.9rem;font-weight:400;color:#999">(${productTotal})</span>`;
}

function setSortProduct(field) {
  if (productFilter.sort === field) {
    productFilter.order = productFilter.order === 'asc' ? 'desc' : 'asc';
  } else {
    productFilter.sort = field; productFilter.order = 'asc';
  }
  productPage = 1; loadProductsTable();
}

let searchTimer;
function debouncedProductSearch(val) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { productFilter.search = val; productPage = 1; loadProductsTable(); }, 400);
}

function toggleSelectAll(cb) {
  document.querySelectorAll('.prod-cb').forEach(el => {
    el.checked = cb.checked;
    cb.checked ? selectedProducts.add(el.value) : selectedProducts.delete(el.value);
  });
  renderBulkBar();
}

function onProductCheckbox() {
  selectedProducts.clear();
  document.querySelectorAll('.prod-cb:checked').forEach(el => selectedProducts.add(el.value));
  renderBulkBar();
}

function renderBulkBar() {
  const bar = document.getElementById('bulkBar');
  if (!selectedProducts.size) { bar.innerHTML = ''; return; }
  bar.innerHTML = `<div class="bulk-bar">
    <span>${selectedProducts.size} product${selectedProducts.size>1?'s':''} selected</span>
    <div class="bulk-actions">
      <button class="bulk-btn" onclick="bulkAction('activate')">Activate</button>
      <button class="bulk-btn" onclick="bulkAction('deactivate')">Deactivate</button>
      <button class="bulk-btn danger" onclick="bulkAction('delete')">Delete</button>
      <button class="bulk-btn" onclick="selectedProducts.clear();renderBulkBar();document.querySelectorAll('.prod-cb').forEach(el=>el.checked=false)">Clear</button>
    </div>
  </div>`;
}

async function bulkAction(action) {
  const ids = Array.from(selectedProducts).map(Number);
  if (action === 'delete') {
    confirmAction(`Delete ${ids.length} product(s)? This cannot be undone.`, async () => {
      await api('POST', '/api/admin/products/bulk', { ids, action: 'delete' });
      toast(`${ids.length} product(s) deleted`, 'success');
      selectedProducts.clear(); loadProductsTable();
    });
  } else {
    await api('POST', '/api/admin/products/bulk', { ids, action });
    toast(`Products ${action}d`, 'success');
    selectedProducts.clear(); loadProductsTable();
  }
}

async function openProductModal(product = null) {
  productImages = [];
  document.getElementById('productId').value = product?.id || '';
  document.getElementById('pName').value = product?.name || '';
  document.getElementById('pPrice').value = product?.price || '';
  document.getElementById('pStock').value = product?.stock ?? '';
  document.getElementById('pDescription').value = product?.description || '';
  document.getElementById('pActive').value = String(product?.active ?? 'true');
  document.getElementById('pSizes').value = (product?.sizes || []).join(', ');
  document.getElementById('pIsTrending').checked = !!product?.is_trending;
  document.getElementById('pIsNew').checked = !!product?.is_new;
  document.getElementById('pImageUrl').value = '';
  document.getElementById('uploadPreviews').innerHTML = '';
  document.getElementById('productModalTitle').textContent = product ? 'Edit Product' : 'Add Product';

  if (product?.images?.length) {
    productImages = [...product.images];
    document.getElementById('uploadPreviews').innerHTML = product.images.map((url, i) =>
      `<div class="upload-preview-item">
        <img src="${url}" />
        <button class="remove-img" onclick="removeProductImage(${i})">✕</button>
      </div>`
    ).join('');
  }

  // Load categories
  const catRes = await api('GET', '/api/admin/categories');
  const cats = catRes || [];
  document.getElementById('pCategory').innerHTML = cats.map(c =>
    `<option value="${c.name}" ${product?.category === c.name ? 'selected' : ''}>${c.name}</option>`
  ).join('');

  openModal('productModal');

  // Image upload handler
  const uploadArea = document.getElementById('uploadArea');
  const imageInput = document.getElementById('imageInput');
  uploadArea.onclick = () => imageInput.click();
  uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); };
  uploadArea.ondragleave = () => uploadArea.classList.remove('dragover');
  uploadArea.ondrop = (e) => {
    e.preventDefault(); uploadArea.classList.remove('dragover');
    handleImageFiles(e.dataTransfer.files);
  };
  imageInput.onchange = (e) => handleImageFiles(e.target.files);
}

function handleImageFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      productImages.push(e.target.result);
      renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  document.getElementById('uploadPreviews').innerHTML = productImages.map((src, i) =>
    `<div class="upload-preview-item">
      <img src="${src}" />
      <button class="remove-img" onclick="removeProductImage(${i})">✕</button>
    </div>`
  ).join('');
}

function removeProductImage(i) { productImages.splice(i, 1); renderImagePreviews(); }

async function saveProduct() {
  const id = document.getElementById('productId').value;
  const urlInput = document.getElementById('pImageUrl').value.trim();

  // Collect images
  let images = [...productImages];
  if (urlInput) images.push(urlInput);

  // Upload base64 images
  const finalImages = [];
  for (const img of images) {
    if (img.startsWith('data:image')) {
      const ext = img.split(';')[0].split('/')[1];
      try {
        const res = await api('POST', '/api/admin/upload', { file: img, filename: `product.${ext}` });
        if (res?.url) finalImages.push(res.url);
        else finalImages.push(img); // fallback to base64
      } catch { finalImages.push(img); }
    } else {
      finalImages.push(img);
    }
  }

  const payload = {
    name: document.getElementById('pName').value.trim(),
    price: parseFloat(document.getElementById('pPrice').value) || 0,
    category: document.getElementById('pCategory').value,
    stock: parseInt(document.getElementById('pStock').value) || 0,
    description: document.getElementById('pDescription').value.trim(),
    active: document.getElementById('pActive').value === 'true',
    sizes: document.getElementById('pSizes').value.split(',').map(s => s.trim()).filter(Boolean),
    is_trending: document.getElementById('pIsTrending').checked,
    is_new: document.getElementById('pIsNew').checked,
    images: finalImages,
  };

  if (!payload.name || !payload.price) { toast('Name and price are required', 'error'); return; }

  const method = id ? 'PUT' : 'POST';
  const path = id ? `/api/admin/products/${id}` : '/api/admin/products';
  const res = await api(method, path, payload);

  if (res?.success) {
    toast(id ? 'Product updated!' : 'Product created!', 'success');
    closeModal('productModal');
    loadProductsTable();
  } else {
    toast(res?.error || 'Failed to save product', 'error');
  }
}

async function editProduct(id) {
  const res = await api('GET', `/api/admin/products?limit=100`);
  const product = res?.products?.find(p => p.id === id);
  if (product) openProductModal(product);
}

function deleteProduct(id, name) {
  confirmAction(`Delete "${name}"? This cannot be undone.`, async () => {
    const res = await api('DELETE', `/api/admin/products/${id}`);
    if (res?.success) { toast('Product deleted', 'success'); loadProductsTable(); }
    else toast(res?.error || 'Failed to delete', 'error');
  });
}

function exportProducts() {
  api('GET', '/api/admin/products?limit=1000').then(res => {
    if (!res?.products) return;
    const csv = ['ID,Name,Category,Price,Stock,Active,Created'];
    res.products.forEach(p => {
      csv.push(`${p.id},"${p.name}","${p.category}",${p.price},${p.stock},${p.active},"${fmtDate(p.created_at)}"`);
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'products.csv';
    a.click();
    toast('Products exported', 'success');
  });
}

// ══════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════

async function renderCategories() {
  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <h2>Categories</h2>
      <button class="btn btn-primary" onclick="openCategoryModal()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Category
      </button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Created</th><th style="width:120px">Actions</th></tr></thead>
        <tbody id="catTableBody"><tr><td colspan="3" style="text-align:center;padding:40px;color:#aaa">Loading…</td></tr></tbody>
      </table>
    </div>
  `;
  loadCategoriesTable();
}

async function loadCategoriesTable() {
  const res = await api('GET', '/api/admin/categories');
  const cats = res || [];
  const tbody = document.getElementById('catTableBody');
  if (!cats.length) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state"><h3>No categories yet</h3><p>Add your first category</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = cats.map(c => `<tr>
    <td><strong>${c.name}</strong></td>
    <td>${fmtDate(c.created_at)}</td>
    <td>
      <div style="display:flex;gap:6px">
        <button class="btn-icon" onclick="editCategory(${c.id},'${c.name.replace(/'/g,"\\'")}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="btn-icon danger" onclick="deleteCategory(${c.id},'${c.name.replace(/'/g,"\\'")}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
      </div>
    </td>
  </tr>`).join('');
}

function openCategoryModal(id = '', name = '') {
  document.getElementById('categoryId').value = id;
  document.getElementById('categoryName').value = name;
  document.getElementById('categoryDesc').value = '';
  document.getElementById('categoryModalTitle').textContent = id ? 'Edit Category' : 'Add Category';
  openModal('categoryModal');
}

function editCategory(id, name) { openCategoryModal(id, name); }

async function saveCategory() {
  const id = document.getElementById('categoryId').value;
  const name = document.getElementById('categoryName').value.trim();
  if (!name) { toast('Name is required', 'error'); return; }

  let res;
  if (id) {
    // Update via direct Supabase REST (no server route for category update yet)
    res = await fetch(`${SUPABASE_URL}/rest/v1/categories?id=eq.${id}`, {
      method: 'PATCH', headers: { ...authHeaders(), 'apikey': SUPABASE_ANON_KEY, 'Prefer': 'return=representation' },
      body: JSON.stringify({ name })
    });
    res = await res.json();
    toast('Category updated!', 'success');
  } else {
    res = await api('POST', '/api/admin/categories', { name });
    if (res?.success) toast('Category created!', 'success');
    else { toast(res?.error || 'Failed', 'error'); return; }
  }
  closeModal('categoryModal');
  loadCategoriesTable();
}

async function deleteCategory(id, name) {
  confirmAction(`Delete category "${name}"?`, async () => {
    await fetch(`${SUPABASE_URL}/rest/v1/categories?id=eq.${id}`, {
      method: 'DELETE', headers: { ...authHeaders(), 'apikey': SUPABASE_ANON_KEY }
    });
    toast('Category deleted', 'success');
    loadCategoriesTable();
  });
}

// ══════════════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════════════

let orderPage = 1, orderTotal = 0, orderFilter = { status: 'all', search: '' };

async function renderOrders() {
  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <h2>Orders</h2>
      <div class="page-header-actions">
        <button class="btn btn-secondary btn-sm" onclick="exportOrders()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
      </div>
    </div>
    <div class="toolbar">
      <div class="search-box">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search by customer name or email…" oninput="debouncedOrderSearch(this.value)" />
      </div>
      <select class="filter-select" onchange="orderFilter.status=this.value;orderPage=1;loadOrdersTable()">
        <option value="all">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <input type="date" class="filter-select" id="orderFromDate" onchange="loadOrdersTable()" />
      <input type="date" class="filter-select" id="orderToDate" onchange="loadOrdersTable()" />
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Date</th>
            <th>Status</th>
            <th style="width:160px">Update Status</th>
          </tr>
        </thead>
        <tbody id="ordersTableBody"><tr><td colspan="7" style="text-align:center;padding:40px;color:#aaa">Loading…</td></tr></tbody>
      </table>
    </div>
    <div id="orderPagination" class="pagination"></div>
  `;
  loadOrdersTable();
}

async function loadOrdersTable() {
  const from = document.getElementById('orderFromDate')?.value;
  const to = document.getElementById('orderToDate')?.value;
  const qs = new URLSearchParams({ page: orderPage, limit: 15, ...orderFilter, ...(from?{from}:{}), ...(to?{to}:{}) });
  const res = await api('GET', `/api/admin/orders?${qs}`);
  if (!res) return;
  orderTotal = res.total || 0;
  document.getElementById('ordersTableBody').innerHTML = ordersTableHTML(res.orders || []);
  renderPagination('orderPagination', orderPage, Math.ceil(orderTotal / 15), (p) => { orderPage = p; loadOrdersTable(); });
}

function ordersTableHTML(orders, compact = false) {
  if (!orders.length) return `<tr><td colspan="7"><div class="empty-state"><h3>No orders found</h3><p>Orders will appear here after customers checkout</p></div></td></tr>`;
  const statuses = ['pending','processing','shipped','delivered','completed','cancelled'];
  return orders.map(o => {
    const items = o.cart_items || [];
    const itemCount = Array.isArray(items) ? items.length : 0;
    return `<tr>
      <td><code style="font-size:.78rem;background:#f5f5f5;padding:3px 7px;border-radius:4px">${(o.transaction_uuid || o.id || '').toString().slice(0,8).toUpperCase()}</code></td>
      <td>
        <div style="font-weight:600">${o.customer_name || '—'}</div>
        <div style="font-size:.78rem;color:#999">${o.customer_email || ''}</div>
      </td>
      <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
      <td><strong>NPR ${Number(o.total_amount || 0).toLocaleString()}</strong></td>
      <td>${fmtDate(o.created_at)}</td>
      <td>${statusBadge(o.status)}</td>
      ${compact ? '' : `<td>
        <select class="filter-select" style="padding:5px 8px;font-size:.8rem" onchange="updateOrderStatus('${o.id}',this.value,this)">
          ${statuses.map(s => `<option value="${s}" ${o.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
      </td>`}
    </tr>`;
  }).join('');
}

async function updateOrderStatus(id, status, select) {
  const res = await api('PUT', `/api/admin/orders/${id}`, { status });
  if (res?.success) {
    toast(`Order status updated to "${status}"`, 'success');
    const badge = select.closest('tr').querySelector('.badge');
    if (badge) badge.outerHTML = statusBadge(status);
  } else {
    toast(res?.error || 'Update failed', 'error');
    select.value = select.getAttribute('data-prev') || '';
  }
}

let orderSearchTimer;
function debouncedOrderSearch(val) {
  clearTimeout(orderSearchTimer);
  orderSearchTimer = setTimeout(() => { orderFilter.search = val; orderPage = 1; loadOrdersTable(); }, 400);
}

function exportOrders() {
  api('GET', '/api/admin/orders?limit=1000').then(res => {
    if (!res?.orders) return;
    const csv = ['ID,Customer,Email,Total,Status,Date'];
    res.orders.forEach(o => csv.push(`"${o.id}","${o.customer_name}","${o.customer_email}",${o.total_amount},"${o.status}","${fmtDate(o.created_at)}"`));
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'orders.csv'; a.click();
    toast('Orders exported', 'success');
  });
}

// ══════════════════════════════════════════════════════════
// CUSTOMERS
// ══════════════════════════════════════════════════════════

async function renderCustomers() {
  document.getElementById('pageContent').innerHTML = `
    <div class="page-header"><h2>Customers</h2></div>
    <div id="customersContent"><div style="text-align:center;padding:40px;color:#aaa">Loading…</div></div>
  `;
  const res = await api('GET', '/api/admin/orders?limit=1000');
  if (!res?.orders) return;

  // Aggregate unique customers from orders
  const customers = {};
  res.orders.forEach(o => {
    const key = o.customer_email || o.customer_name;
    if (!key) return;
    if (!customers[key]) {
      customers[key] = { name: o.customer_name || '', email: o.customer_email || '', orders: 0, spent: 0, lastOrder: o.created_at };
    }
    customers[key].orders++;
    customers[key].spent += parseFloat(o.total_amount || 0);
    if (new Date(o.created_at) > new Date(customers[key].lastOrder)) customers[key].lastOrder = o.created_at;
  });

  const list = Object.values(customers).sort((a, b) => b.spent - a.spent);

  document.getElementById('customersContent').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Customer</th><th>Email</th><th>Total Orders</th><th>Total Spent</th><th>Last Order</th></tr></thead>
        <tbody>
          ${!list.length ? `<tr><td colspan="5"><div class="empty-state"><h3>No customers yet</h3></div></td></tr>` :
          list.map(c => `<tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:34px;height:34px;border-radius:8px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-weight:700;color:#555">${(c.name||c.email||'?')[0].toUpperCase()}</div>
                <strong>${c.name || '—'}</strong>
              </div>
            </td>
            <td>${c.email || '—'}</td>
            <td>${c.orders}</td>
            <td><strong>NPR ${c.spent.toLocaleString()}</strong></td>
            <td>${fmtDate(c.lastOrder)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════
// COUPONS
// ══════════════════════════════════════════════════════════

let coupons = JSON.parse(localStorage.getItem('admin_coupons') || '[]');

function renderCoupons() {
  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <h2>Coupons</h2>
      <button class="btn btn-primary" onclick="openCouponModal()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Coupon
      </button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Max Uses</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="couponTableBody"></tbody>
      </table>
    </div>
  `;
  renderCouponTable();
}

function renderCouponTable() {
  const tbody = document.getElementById('couponTableBody');
  if (!coupons.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><h3>No coupons</h3><p>Create discount codes for your customers</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = coupons.map((c, i) => {
    const expired = c.expiry && new Date(c.expiry) < new Date();
    return `<tr>
      <td><span class="coupon-tag">${c.code}</span></td>
      <td>${c.type === 'percent' ? 'Percentage' : 'Fixed'}</td>
      <td>${c.type === 'percent' ? c.value + '%' : 'NPR ' + c.value}</td>
      <td>${c.minOrder ? 'NPR ' + c.minOrder : '—'}</td>
      <td>${c.maxUses || 'Unlimited'}</td>
      <td>${c.expiry ? fmtDate(c.expiry) : '—'}</td>
      <td>${statusBadge(expired ? 'inactive' : 'active')}</td>
      <td>
        <button class="btn-icon danger" onclick="deleteCoupon(${i})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
      </td>
    </tr>`;
  }).join('');
}

function openCouponModal() {
  ['couponCode','couponValue','couponMin','couponMaxUses','couponExpiry'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('couponId').value = '';
  document.getElementById('couponType').value = 'percent';
  openModal('couponModal');
}

function saveCoupon() {
  const code = document.getElementById('couponCode').value.trim().toUpperCase();
  const type = document.getElementById('couponType').value;
  const value = parseFloat(document.getElementById('couponValue').value);
  if (!code || !value) { toast('Code and value are required', 'error'); return; }

  coupons.push({
    code, type, value,
    minOrder: document.getElementById('couponMin').value || null,
    maxUses: document.getElementById('couponMaxUses').value || null,
    expiry: document.getElementById('couponExpiry').value || null,
  });
  localStorage.setItem('admin_coupons', JSON.stringify(coupons));
  toast('Coupon created!', 'success');
  closeModal('couponModal');
  renderCouponTable();
}

function deleteCoupon(i) {
  confirmAction('Delete this coupon?', () => {
    coupons.splice(i, 1);
    localStorage.setItem('admin_coupons', JSON.stringify(coupons));
    toast('Coupon deleted', 'success');
    renderCouponTable();
  });
}

// ══════════════════════════════════════════════════════════
// MEDIA
// ══════════════════════════════════════════════════════════

async function renderMedia() {
  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <h2>Media Library</h2>
      <button class="btn btn-primary" onclick="document.getElementById('mediaUploadInput').click()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Upload
      </button>
    </div>
    <input type="file" id="mediaUploadInput" accept="image/*" multiple style="display:none" onchange="uploadMediaFiles(this.files)" />
    <div class="card" style="padding:20px">
      <div id="mediaGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px">
        <div style="text-align:center;padding:40px;color:#aaa;grid-column:1/-1">Loading media…</div>
      </div>
    </div>
  `;
  loadMediaLibrary();
}

async function loadMediaLibrary() {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/product-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ prefix: 'products/', limit: 100 })
    });
    const files = await res.json();
    const grid = document.getElementById('mediaGrid');
    if (!files?.length) {
      grid.innerHTML = `<div style="text-align:center;padding:40px;color:#aaa;grid-column:1/-1"><p>No media files yet.</p><p style="font-size:.82rem;margin-top:6px">Upload images to see them here.</p></div>`;
      return;
    }
    grid.innerHTML = files.map(f => {
      const url = `${SUPABASE_URL}/storage/v1/object/public/product-images/${f.name}`;
      return `<div style="position:relative;border-radius:10px;overflow:hidden;border:1px solid #ebebeb;cursor:pointer" onclick="copyMediaUrl('${url}')">
        <img src="${url}" style="width:100%;height:120px;object-fit:cover" alt="${f.name}" onerror="this.parentElement.style.display='none'" />
        <div style="padding:8px;font-size:.72rem;color:#666;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${f.name.split('/').pop()}</div>
        <div style="position:absolute;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;color:#fff;font-size:.8rem" class="media-overlay">Click to copy URL</div>
      </div>`;
    }).join('');
  } catch {
    document.getElementById('mediaGrid').innerHTML = `<div style="text-align:center;padding:40px;color:#aaa;grid-column:1/-1">Media library unavailable.<br><small>Ensure the "product-images" bucket exists in Supabase.</small></div>`;
  }
}

function copyMediaUrl(url) {
  navigator.clipboard.writeText(url).then(() => toast('URL copied to clipboard!', 'success')).catch(() => toast('Could not copy URL', 'error'));
}

async function uploadMediaFiles(files) {
  const arr = Array.from(files);
  toast(`Uploading ${arr.length} file(s)…`, 'default');
  for (const file of arr) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const ext = file.name.split('.').pop();
      await api('POST', '/api/admin/upload', { file: e.target.result, filename: file.name });
    };
    reader.readAsDataURL(file);
  }
  setTimeout(() => { toast('Upload complete!', 'success'); loadMediaLibrary(); }, 2000);
}

// ══════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════

async function renderAnalytics() {
  document.getElementById('pageContent').innerHTML = `
    <div class="page-header"><h2>Analytics</h2>
      <select class="filter-select" id="analyticsPeriod" onchange="loadAnalyticsData(this.value)">
        <option value="7">Last 7 days</option>
        <option value="14">Last 14 days</option>
        <option value="30" selected>Last 30 days</option>
        <option value="90">Last 90 days</option>
      </select>
    </div>
    <div id="analyticsContent"><div style="text-align:center;padding:60px;color:#aaa">Loading analytics…</div></div>
  `;
  loadAnalyticsData(30);
}

async function loadAnalyticsData(days = 30) {
  const res = await api('GET', '/api/admin/stats');
  if (!res) return;

  const chart = res.revenueChart || {};
  const allDays = Object.keys(chart).sort();
  const recent = allDays.slice(-parseInt(days));
  const revenues = recent.map(d => chart[d]?.revenue || 0);
  const orderCounts = recent.map(d => chart[d]?.orders || 0);

  const totalRev = revenues.reduce((s, v) => s + v, 0);
  const totalOrd = orderCounts.reduce((s, v) => s + v, 0);
  const avgOrder = totalOrd ? (totalRev / totalOrd) : 0;

  document.getElementById('analyticsContent').innerHTML = `
    <!-- KPI Cards -->
    <div class="stats-grid" style="margin-bottom:24px">
      <div class="stat-card"><div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="stat-label">Period Revenue</div><div class="stat-value">NPR ${totalRev.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div><div class="stat-label">Period Orders</div><div class="stat-value">${totalOrd.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-icon amber"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div class="stat-label">Avg Order Value</div><div class="stat-value">NPR ${Math.round(avgOrder).toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div class="stat-label">Total Customers</div><div class="stat-value">${res.totalCustomers || 0}</div></div>
    </div>

    <div class="analytics-grid">
      <div class="card">
        <div class="card-header"><div class="card-title">Revenue Trend</div></div>
        <canvas id="analyticsRevChart"></canvas>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Orders per Day</div></div>
        <canvas id="analyticsOrdChart"></canvas>
      </div>
    </div>
  `;

  const commonOpts = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#a1a1aa', font: { family: 'Inter', size: 10 }, maxTicksLimit: 8 } },
      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#a1a1aa', font: { family: 'Inter', size: 10 } } }
    }
  };

  new Chart(document.getElementById('analyticsRevChart'), {
    type: 'line',
    data: { labels: recent.map(d => fmtDateShort(d)), datasets: [{ label: 'Revenue', data: revenues, borderColor: '#c5a880', backgroundColor: 'rgba(197, 168, 128, 0.05)', fill: true, tension: .4, pointRadius: 3 }] },
    options: commonOpts
  });

  new Chart(document.getElementById('analyticsOrdChart'), {
    type: 'bar',
    data: { labels: recent.map(d => fmtDateShort(d)), datasets: [{ data: orderCounts, backgroundColor: '#c5a880', borderRadius: 4 }] },
    options: commonOpts
  });
}

// ══════════════════════════════════════════════════════════
// SEO
// ══════════════════════════════════════════════════════════

async function renderSEO() {
  const res = await api('GET', '/api/admin/settings');
  const s = res || {};

  document.getElementById('pageContent').innerHTML = `
    <div class="page-header"><h2>SEO Settings</h2>
      <button class="btn btn-primary" onclick="saveSEO()">Save Changes</button>
    </div>
    <div class="card">
      <div class="settings-section">
        <h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search Engine Optimization</h3>
        <div class="form-group">
          <label>Site Title</label>
          <input class="form-control" id="seoTitle" value="${s.site_title || 'ASMIRE'}" placeholder="ASMIRE — Premium Streetwear Nepal" />
          <div class="form-hint">Appears in browser tab and search results (50–60 chars recommended)</div>
        </div>
        <div class="form-group">
          <label>Meta Description</label>
          <textarea class="form-control" id="seoDesc" rows="3" placeholder="Discover premium streetwear designed for the bold…">${s.meta_description || ''}</textarea>
          <div class="form-hint">Shown in search engine results (150–160 chars recommended)</div>
        </div>
        <div class="form-group">
          <label>OG Image URL</label>
          <input class="form-control" id="seoOgImage" value="${s.og_image || ''}" placeholder="https://yourdomain.com/og-image.jpg" />
          <div class="form-hint">Image shown when shared on social media (1200×630px recommended)</div>
        </div>
      </div>

      <!-- Live Preview -->
      <hr class="settings-divider" />
      <h3 style="font-size:.88rem;margin-bottom:14px;color:#666">Google Preview</h3>
      <div style="background:#f9f9f9;border:1px solid #e5e7eb;border-radius:10px;padding:18px;max-width:480px">
        <div style="font-size:.75rem;color:#1a0dab;font-weight:500;margin-bottom:2px" id="previewTitle">ASMIRE</div>
        <div style="font-size:.72rem;color:#006621;margin-bottom:4px">https://yourdomain.com</div>
        <div style="font-size:.78rem;color:#545454;line-height:1.5" id="previewDesc">Your meta description will appear here…</div>
      </div>
    </div>
  `;

  // Live preview update
  document.getElementById('seoTitle').addEventListener('input', e => document.getElementById('previewTitle').textContent = e.target.value || 'ASMIRE');
  document.getElementById('seoDesc').addEventListener('input', e => document.getElementById('previewDesc').textContent = e.target.value || 'Your meta description…');
  document.getElementById('previewTitle').textContent = s.site_title || 'ASMIRE';
  document.getElementById('previewDesc').textContent = s.meta_description || 'Your meta description will appear here…';
}

async function saveSEO() {
  const res = await api('PUT', '/api/admin/settings', {
    site_title: document.getElementById('seoTitle').value,
    meta_description: document.getElementById('seoDesc').value,
    og_image: document.getElementById('seoOgImage').value,
  });
  if (res?.success) toast('SEO settings saved!', 'success');
  else toast(res?.error || 'Failed to save', 'error');
}

// ══════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════

async function renderSettings() {
  const res = await api('GET', '/api/admin/settings');
  const s = res || {};

  document.getElementById('pageContent').innerHTML = `
    <div class="page-header"><h2>Settings</h2>
      <button class="btn btn-primary" onclick="saveAllSettings()">Save All Changes</button>
    </div>

    <div style="display:flex;gap:24px">
      <!-- Settings Nav -->
      <div class="settings-nav" style="width:200px;flex-shrink:0">
        ${[
          ['general','🏪','General'],
          ['currency','💱','Currency & Tax'],
          ['store-info','📍','Store Info'],
          ['social','📱','Social Media'],
          ['notifications','🔔','Notifications'],
        ].map(([key,icon,label],i) => `
          <div class="settings-nav-item ${i===0?'active':''}" onclick="switchSettingsTab('${key}',this)">${icon} ${label}</div>
        `).join('')}
      </div>

      <div style="flex:1">
        <!-- GENERAL -->
        <div class="card settings-section" id="tab-general">
          <h3><span style="font-size:1.1rem">🏪</span> General Settings</h3>
          <div class="settings-row">
            <div class="form-group"><label>Store Name</label><input class="form-control" id="sStoreName" value="${s.site_title || 'ASMIRE'}" placeholder="ASMIRE" /></div>
            <div class="form-group"><label>Contact Email</label><input class="form-control" id="sEmail" type="email" value="" placeholder="hello@example.com" /></div>
          </div>
          <div class="settings-row">
            <div class="form-group"><label>Contact Phone</label><input class="form-control" id="sPhone" value="" placeholder="+1 (555) 000-0000" /></div>
            <div class="form-group"><label>Timezone</label>
              <select class="form-control" id="sTimezone">
                <option>Asia/Kathmandu</option><option>Asia/Kolkata</option><option>UTC</option><option>America/New_York</option>
              </select>
            </div>
          </div>
          <div class="form-group"><label>Business Address</label><input class="form-control" id="sAddress" value="" placeholder="123 Design St, Creative City, 10001" /></div>
          <div class="form-group">
            <label>Store Status</label>
            <div style="display:flex;gap:16px;margin-top:4px">
              <label class="toggle-wrap"><label class="toggle"><input type="checkbox" id="sStoreOpen" checked><span class="toggle-slider"></span></label><span class="toggle-label">Store is Open</span></label>
              <label class="toggle-wrap"><label class="toggle"><input type="checkbox" id="sMaintenanceMode"><span class="toggle-slider"></span></label><span class="toggle-label">Maintenance Mode</span></label>
            </div>
          </div>
        </div>

        <!-- CURRENCY & TAX -->
        <div class="card settings-section" id="tab-currency" style="display:none">
          <h3><span style="font-size:1.1rem">💱</span> Currency &amp; Tax</h3>
          <div class="settings-row">
            <div class="form-group">
              <label>Currency</label>
              <select class="form-control" id="sCurrency">
                <option value="NPR" ${s.currency==='NPR'?'selected':''}>NPR (₨)</option>
                <option value="INR" ${s.currency==='INR'?'selected':''}>INR (₹)</option>
                <option value="USD" ${s.currency==='USD'?'selected':''}>USD ($)</option>
                <option value="EUR" ${s.currency==='EUR'?'selected':''}>EUR (€)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Currency Symbol</label>
              <input class="form-control" id="sCurrencySymbol" value="${s.currency==='NPR'?'₨':s.currency==='INR'?'₹':'$'}" placeholder="₨" />
            </div>
            <div class="form-group">
              <label>General Tax Rate (%)</label>
              <input class="form-control" type="number" id="sTaxRate" value="${s.tax_rate || 0}" placeholder="0" />
            </div>
          </div>
          <hr class="settings-divider" />
          <div class="settings-row">
            <div class="form-group">
              <label class="toggle-wrap"><label class="toggle"><input type="checkbox" id="sGst"><span class="toggle-slider"></span></label><span class="toggle-label">Enable Advanced Tax (GST)</span></label>
            </div>
            <div class="form-group">
              <label class="toggle-wrap"><label class="toggle"><input type="checkbox" id="sTaxInclusive"><span class="toggle-slider"></span></label><span class="toggle-label">Tax-inclusive pricing</span></label>
            </div>
          </div>
          <div class="settings-row" style="margin-top:10px">
            <div class="form-group"><label>Store Base State</label><input class="form-control" id="sBaseState" placeholder="State name" /></div>
            <div class="form-group"><label>CGST (%)</label><input class="form-control" type="number" id="sCgst" value="0" /></div>
            <div class="form-group"><label>SGST (%)</label><input class="form-control" type="number" id="sSgst" value="0" /></div>
            <div class="form-group"><label>IGST (%)</label><input class="form-control" type="number" id="sIgst" value="0" /></div>
          </div>
        </div>

        <!-- STORE INFO -->
        <div class="card settings-section" id="tab-store-info" style="display:none">
          <h3><span style="font-size:1.1rem">📍</span> Store Information</h3>
          <div class="settings-row">
            <div class="form-group"><label>Legal Business Name</label><input class="form-control" id="sLegalName" placeholder="ASMIRE Pvt. Ltd." /></div>
            <div class="form-group"><label>VAT / Tax ID</label><input class="form-control" id="sVatId" placeholder="NP12345678" /></div>
          </div>
          <div class="form-group"><label>Return Policy</label><textarea class="form-control" id="sReturnPolicy" rows="4" placeholder="We accept returns within 7 days of delivery…"></textarea></div>
          <div class="form-group"><label>Shipping Policy</label><textarea class="form-control" id="sShippingPolicy" rows="4" placeholder="Free shipping on orders above NPR 2000…"></textarea></div>
        </div>

        <!-- SOCIAL MEDIA -->
        <div class="card settings-section" id="tab-social" style="display:none">
          <h3><span style="font-size:1.1rem">📱</span> Social Media</h3>
          ${[
            ['Instagram','sInstagram','https://instagram.com/asmire'],
            ['Facebook','sFacebook','https://facebook.com/asmire'],
            ['Twitter / X','sTwitter','https://twitter.com/asmire'],
            ['TikTok','sTikTok','https://tiktok.com/@asmire'],
            ['YouTube','sYoutube','https://youtube.com/@asmire'],
          ].map(([label,id,ph]) => `<div class="form-group"><label>${label}</label><input class="form-control" id="${id}" placeholder="${ph}" /></div>`).join('')}
        </div>

        <!-- NOTIFICATIONS -->
        <div class="card settings-section" id="tab-notifications" style="display:none">
          <h3><span style="font-size:1.1rem">🔔</span> Notifications</h3>
          ${[
            ['New Order','nNewOrder','Receive email when a new order is placed'],
            ['Low Stock','nLowStock','Alert when product stock falls below 5'],
            ['Order Delivered','nDelivered','Notify customer when order is marked delivered'],
            ['New Customer','nNewCustomer','Email when a new customer registers'],
          ].map(([label,id,desc]) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #f5f5f5">
              <div><div style="font-weight:600;font-size:.9rem">${label}</div><div style="font-size:.8rem;color:#999;margin-top:2px">${desc}</div></div>
              <label class="toggle"><input type="checkbox" id="${id}" checked><span class="toggle-slider"></span></label>
            </div>`
          ).join('')}
        </div>
      </div>
    </div>
  `;
}

function switchSettingsTab(key, el) {
  document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.card.settings-section').forEach(c => c.style.display = 'none');
  const target = document.getElementById(`tab-${key}`);
  if (target) target.style.display = 'block';
}

async function saveAllSettings() {
  const currency = document.getElementById('sCurrency')?.value || 'NPR';
  const taxRate = parseFloat(document.getElementById('sTaxRate')?.value || 0);
  const siteTitle = document.getElementById('sStoreName')?.value || 'ASMIRE';

  const res = await api('PUT', '/api/admin/settings', { currency, tax_rate: taxRate, site_title: siteTitle });
  if (res?.success) {
    window._adminSettings = res.settings;
    toast('Settings saved successfully!', 'success');
  } else {
    toast(res?.error || 'Failed to save settings', 'error');
  }
}

// ══════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════

function renderPagination(containerId, currentPage, totalPages, onPage) {
  const el = document.getElementById(containerId);
  if (!el || totalPages <= 1) { if(el) el.innerHTML = ''; return; }

  let html = `<button class="page-btn" ${currentPage<=1?'disabled':''} onclick="(${onPage})(${currentPage-1})">‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (totalPages > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
      if (p === 2 || p === totalPages - 1) html += `<span style="padding:0 4px;color:#999">…</span>`;
      continue;
    }
    html += `<button class="page-btn ${p===currentPage?'active':''}" onclick="(${onPage})(${p})">${p}</button>`;
  }
  html += `<button class="page-btn" ${currentPage>=totalPages?'disabled':''} onclick="(${onPage})(${currentPage+1})">›</button>`;
  el.innerHTML = html;
}

// ══════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════

async function init() {
  // Sidebar nav click
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });

  // Hamburger (mobile)
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
  });
  document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    confirmAction('Sign out of the admin panel?', () => {
      localStorage.clear();
      window.location.replace('/admin-login.html');
    });
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => { if (e.target === el) el.classList.remove('open'); });
  });

  // Load settings to get currency
  try {
    const settingsRes = await fetch(`/api/settings?_t=${Date.now()}`);
    if (settingsRes.ok) window._adminSettings = await settingsRes.json();
  } catch {}

  // Get user info
  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
    });
    if (userRes.ok) {
      const user = await userRes.json();
      const email = user.email || 'Admin';
      const initials = email[0].toUpperCase();
      document.getElementById('userAvatar').textContent = initials;
      document.getElementById('userName').textContent = email.split('@')[0];
    }
  } catch {}

  // Navigate to dashboard
  navigateTo('dashboard');
}

init();
