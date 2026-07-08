/**
 * Gifting Needs - Admin Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check auth status on load
  const session = GiftingAPI.getCurrentUser();
  if (session) {
    initDashboard(session);
  } else {
    showLogin();
  }

  // Bind login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value;
      const pass = document.getElementById('login-password').value;
      const errorMsg = document.getElementById('login-error-msg');
      
      errorMsg.style.display = 'none';
      
      const res = await GiftingAPI.login(username, pass);
      if (res.success) {
        document.getElementById('login-overlay').classList.remove('active');
        initDashboard(res);
      } else {
        errorMsg.textContent = res.message;
        errorMsg.style.display = 'block';
      }
    });
  }

  // Bind logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      GiftingAPI.logout();
      window.location.reload();
    });
  }
});

function showLogin() {
  document.getElementById('login-overlay').classList.add('active');
  document.getElementById('dashboard-wrapper').style.display = 'none';
}

function initDashboard(user) {
  document.getElementById('dashboard-wrapper').style.display = 'flex';
  document.getElementById('user-display-name').textContent = user.username.toUpperCase();
  document.getElementById('user-display-role').textContent = user.label;

  // Set mode badge (Server vs Local Simulation)
  const modeBadge = document.getElementById('app-mode-badge');
  if (modeBadge) {
    const isServer = GiftingAPI.isServerMode();
    modeBadge.textContent = isServer ? 'Live Server' : 'Local Sandbox';
    modeBadge.style.background = isServer ? 'var(--primary-glow)' : 'var(--gold-glow)';
    modeBadge.style.color = isServer ? 'var(--primary-light)' : 'var(--gold)';
  }

  // 1. Configure Role Permissions & Sidebar visibility
  applyRolePermissions(user.role);

  // 2. Bind tab switching
  initTabs();

  // 3. Load statistical overview data
  loadOverviewStats();

  // 4. Load products catalog CRUD table
  loadProductsGrid();

  // 5. Initialize spreadsheet bulk editor
  initSpreadsheetGrid();
  initBulkImageUploader();

  // 6. Load customer leads
  loadInquiries();

  // 7. Load custom design settings
  loadDesignPanel();

  // 8. Bind AI Chat Form
  initAIChat();

  // 9. Bind Product CRUD Modal close
  const crudModal = document.getElementById('product-crud-modal');
  const crudClose = document.getElementById('crud-modal-close-btn');
  if (crudClose && crudModal) {
    crudClose.addEventListener('click', () => {
      crudModal.classList.remove('active');
    });
  }

  // Bind Add Product button
  const addProdBtn = document.getElementById('btn-add-product');
  if (addProdBtn) {
    addProdBtn.addEventListener('click', () => {
      openProductCrudModal();
    });
  }

  // Bind Product CRUD Form submit
  const crudForm = document.getElementById('product-crud-form');
  if (crudForm) {
    crudForm.addEventListener('submit', handleProductCrudSubmit);
  }

  // 10. Init Product Image Upload Handlers
  initProductImageUpload();
}

/* ============================================================
   1. ROLE SECURITY RULES
   ============================================================ */
function applyRolePermissions(role) {
  const productsMenu = document.getElementById('side-menu-products');
  const bulkMenu = document.getElementById('side-menu-bulk');
  const inquiriesMenu = document.getElementById('side-menu-inquiries');
  const designMenu = document.getElementById('side-menu-design');
  const checklist = document.getElementById('active-permissions-checklist');

  // Reset displays
  productsMenu.style.display = 'flex';
  bulkMenu.style.display = 'flex';
  inquiriesMenu.style.display = 'flex';
  designMenu.style.display = 'flex';

  let checklistHTML = '';

  if (role === 'admin') {
    checklistHTML = `
      <li class="allowed">✅ Access Products Inventory CRUD Control</li>
      <li class="allowed">✅ Access Bulk Spreadsheet Ingestion</li>
      <li class="allowed">✅ Access Customer Leads & Inquiry Management</li>
      <li class="allowed">✅ Access Visual Style & Color Themes</li>
      <li class="allowed">✅ Access AI Command Bot (Administrator privilege)</li>
    `;
  } else if (role === 'product_manager') {
    // Hide Inquiries and Design tabs
    inquiriesMenu.style.display = 'none';
    designMenu.style.display = 'none';

    checklistHTML = `
      <li class="allowed">✅ Access Products Inventory CRUD Control</li>
      <li class="allowed">✅ Access Bulk Spreadsheet Ingestion</li>
      <li class="denied">❌ Access Customer Leads & Inquiry Management (Blocked)</li>
      <li class="denied">❌ Access Visual Style & Color Themes (Blocked)</li>
      <li class="allowed">✅ Access AI Command Bot (Product editing privilege)</li>
    `;
  } else if (role === 'designer') {
    // Hide Products, Bulk, Inquiries tabs
    productsMenu.style.display = 'none';
    bulkMenu.style.display = 'none';
    inquiriesMenu.style.display = 'none';

    checklistHTML = `
      <li class="denied">❌ Access Products Inventory CRUD Control (Blocked)</li>
      <li class="denied">❌ Access Bulk Spreadsheet Ingestion (Blocked)</li>
      <li class="denied">❌ Access Customer Leads & Inquiry Management (Blocked)</li>
      <li class="allowed">✅ Access Visual Style & Color Themes</li>
      <li class="allowed">✅ Access AI Command Bot (Design override privilege)</li>
    `;

    // Switch default active tab to design for designer on start
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    designMenu.classList.add('active');
    document.getElementById('tab-design').classList.add('active');
  }

  if (checklist) checklist.innerHTML = checklistHTML;
}

/* ============================================================
   2. TAB SWITCHING
   ============================================================ */
function initTabs() {
  const items = document.querySelectorAll('.menu-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      
      // Toggle active states
      items.forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      
      item.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
}

/* ============================================================
   3. OVERVIEW & LOGS
   ============================================================ */
async function loadOverviewStats() {
  try {
    const productsRes = await GiftingAPI.getProducts();
    const prodCount = productsRes.success ? productsRes.products.length : 0;
    document.getElementById('stat-products-count').textContent = prodCount;
    
    // Inquiries and Logs are Admin only, wrap in try/role checks
    const session = GiftingAPI.getCurrentUser();
    if (session.role === 'admin') {
      const inquiriesRes = await GiftingAPI.getInquiries();
      if (inquiriesRes.success) {
        document.getElementById('stat-inquiries-count').textContent = inquiriesRes.inquiries.length;
        const pending = inquiriesRes.inquiries.filter(i => i.status === 'pending').length;
        document.getElementById('stat-pending-count').textContent = pending;
      }
      
      // Load logs
      const logsRes = await GiftingAPI.getLogs();
      const logsList = document.getElementById('system-logs-list');
      if (logsRes.success && logsList) {
        logsList.innerHTML = '';
        if (logsRes.logs.length === 0) {
          logsList.innerHTML = '<div class="log-item">No system actions logged.</div>';
        } else {
          logsRes.logs.forEach(log => {
            const dateStr = new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const div = document.createElement('div');
            div.className = 'log-item';
            div.innerHTML = `<span class="log-date">[${dateStr}]</span> ${log.event}`;
            logsList.appendChild(div);
          });
        }
      }
    } else {
      document.getElementById('stat-inquiries-count').textContent = 'N/A';
      document.getElementById('stat-pending-count').textContent = 'N/A';
      const logsList = document.getElementById('system-logs-list');
      if (logsList) logsList.innerHTML = '<div class="log-item">Logs trace only visible to Administrators.</div>';
    }
  } catch (err) {
    console.error("Overview metrics fetch failed:", err);
  }
}

/* ============================================================
   4. PRODUCTS CRUD MANAGEMENT
   ============================================================ */
async function loadProductsGrid() {
  const tbody = document.getElementById('admin-products-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading products...</td></tr>';
  
  const res = await GiftingAPI.getProducts();
  if (res.success) {
    tbody.innerHTML = '';
    if (res.products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No products registered in database.</td></tr>';
      return;
    }
    
    res.products.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: monospace; font-weight: bold; color: var(--text-muted);">${p.id}</td>
        <td style="font-size: 1.5rem; text-align: center;">${p.icon}</td>
        <td style="font-weight: 700; color: var(--primary);">${p.title}</td>
        <td><span class="badge" style="background: rgba(15,76,58,0.06); color: var(--primary); border: 1px solid var(--border);">${p.categoryLabel}</span></td>
        <td>${p.minQty} units</td>
        <td>
          <div class="action-btn-row">
            <button class="btn btn-outline btn-mini btn-edit-prod" data-id="${p.id}">Edit</button>
            <button class="btn btn-outline btn-mini btn-delete-prod" data-id="${p.id}" style="border-color: var(--crimson); color: var(--crimson);">Delete</button>
          </div>
        </td>
      `;

      // Bind Edit
      tr.querySelector('.btn-edit-prod').addEventListener('click', () => {
        openProductCrudModal(p);
      });

      // Bind Delete
      tr.querySelector('.btn-delete-prod').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete "${p.title}"? This cannot be undone.`)) {
          const delRes = await GiftingAPI.deleteProduct(p.id);
          if (delRes.success) {
            loadProductsGrid();
            loadOverviewStats();
          } else {
            alert('Failed to delete: ' + delRes.message);
          }
        }
      });

      tbody.appendChild(tr);
    });
  }
}

function openProductCrudModal(product = null) {
  const modal = document.getElementById('product-crud-modal');
  const modalTitle = document.getElementById('crud-modal-title');
  const form = document.getElementById('product-crud-form');
  
  form.reset();
  
  const imgUrlInput = document.getElementById('crud-image-url');
  const imgPreview = document.getElementById('crud-image-preview');
  const imgClearBtn = document.getElementById('crud-btn-clear-image');
  const fileInput = document.getElementById('crud-image-file');

  if (fileInput) fileInput.value = ""; // Reset file selector

  if (product) {
    modalTitle.textContent = `Edit Product Details (ID: ${product.id})`;
    document.getElementById('crud-prod-id').value = product.id;
    document.getElementById('crud-title').value = product.title;
    document.getElementById('crud-category').value = product.category;
    document.getElementById('crud-price').value = product.price;
    document.getElementById('crud-minqty').value = product.minQty;
    document.getElementById('crud-icon').value = product.icon;
    document.getElementById('crud-badge').value = product.badge;
    document.getElementById('crud-badge-text').value = product.badgeText;
    document.getElementById('crud-desc').value = product.desc;
    
    if (product.image) {
      imgUrlInput.value = product.image;
      imgPreview.innerHTML = `<img src="${GiftingAPI.resolveImage(product.image)}" style="width: 100%; height: 100%; object-fit: cover;">`;
      if (imgClearBtn) imgClearBtn.style.display = 'inline-block';
    } else {
      imgUrlInput.value = "";
      imgPreview.innerHTML = `📷`;
      if (imgClearBtn) imgClearBtn.style.display = 'none';
    }
    
    document.getElementById('crud-submit-btn').textContent = "Save Changes";
  } else {
    modalTitle.textContent = "Add New Gifting Product";
    document.getElementById('crud-prod-id').value = "";
    imgUrlInput.value = "";
    imgPreview.innerHTML = `📷`;
    if (imgClearBtn) imgClearBtn.style.display = 'none';
    document.getElementById('crud-submit-btn').textContent = "Create Product";
  }

  modal.classList.add('active');
}

async function handleProductCrudSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('crud-prod-id').value;
  const categoryLabels = {
    tech: 'Electronics & Tech',
    drinkware: 'Premium Drinkware',
    stationery: 'Desk Utilities & Planners',
    apparel: 'Apparel & Bags',
    hampers: 'Festive & Gourmet Hampers',
    trophies: 'Trophies & Mementos'
  };

  const category = document.getElementById('crud-category').value;
  const prodData = {
    title: document.getElementById('crud-title').value.trim(),
    category,
    categoryLabel: categoryLabels[category],
    price: parseInt(document.getElementById('crud-price').value),
    minQty: parseInt(document.getElementById('crud-minqty').value),
    icon: document.getElementById('crud-icon').value.trim(),
    badge: document.getElementById('crud-badge').value,
    badgeText: document.getElementById('crud-badge-text').value.trim(),
    desc: document.getElementById('crud-desc').value.trim(),
    image: document.getElementById('crud-image-url').value.trim(),
    specs: {}
  };

  let res;
  if (id) {
    res = await GiftingAPI.updateProduct(id, prodData);
  } else {
    res = await GiftingAPI.addProduct(prodData);
  }

  if (res.success) {
    document.getElementById('product-crud-modal').classList.remove('active');
    loadProductsGrid();
    loadOverviewStats();
  } else {
    alert("Operation failed: " + res.message);
  }
}

/* ============================================================
   5. SPREADSHEET BULK EDITOR
   ============================================================ */
function initSpreadsheetGrid() {
  const tbody = document.getElementById('spreadsheet-tbody');
  const btnAddRow = document.getElementById('btn-sheet-add-row');
  const btnClearAll = document.getElementById('btn-sheet-clear-all');
  const btnProcessPasted = document.getElementById('btn-process-pasted');
  const btnClearPaste = document.getElementById('btn-clear-paste');
  const btnSubmit = document.getElementById('btn-submit-bulk-ingest');
  
  if (!tbody) return;

  // Render 10 blank rows initially
  tbody.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    insertBlankRow(i + 1);
  }

  btnAddRow.addEventListener('click', () => {
    const rowNum = tbody.children.length + 1;
    insertBlankRow(rowNum);
  });

  btnClearAll.addEventListener('click', () => {
    tbody.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      insertBlankRow(i + 1);
    }
  });

  btnClearPaste.addEventListener('click', () => {
    document.getElementById('bulk-csv-paste').value = '';
  });

  // Pasted data parser
  btnProcessPasted.addEventListener('click', () => {
    const rawData = document.getElementById('bulk-csv-paste').value.trim();
    if (!rawData) {
      alert("Please paste tab-separated rows into the box first.");
      return;
    }

    const rows = rawData.split('\n');
    tbody.innerHTML = '';
    
    rows.forEach((rowString, index) => {
      // Split by tabs or commas (columns: Title, MOQ, Category, Icon, Description)
      const cells = rowString.split(/\t|,/);
      if (cells.length > 0) {
        const title = cells[0] ? cells[0].trim() : '';
        const minQty = cells[1] ? cells[1].trim() : '50';
        const category = cells[2] ? cells[2].trim() : 'tech';
        const icon = cells[3] ? cells[3].trim() : '🎁';
        const desc = cells[4] ? cells[4].trim() : '';
        const price = '1'; // Default price to 1 for database compatibility

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="text-align: center; color: var(--text-muted); font-weight: bold;">${index + 1}</td>
          <td><input type="text" class="sheet-cell-input val-title" value="${title}"></td>
          <td style="display: none;"><input type="number" class="sheet-cell-input val-price" value="${price}"></td>
          <td><input type="number" class="sheet-cell-input val-qty" value="${minQty}"></td>
          <td><input type="text" class="sheet-cell-input val-cat" value="${category}" placeholder="e.g. tech, drinkware"></td>
          <td><input type="text" class="sheet-cell-input val-icon" value="${icon}"></td>
          <td><input type="text" class="sheet-cell-input val-desc" value="${desc}"></td>
        `;
        tbody.appendChild(tr);
      }
    });

    // Ensure we have at least some rows
    if (tbody.children.length === 0) {
      for (let i = 0; i < 5; i++) insertBlankRow(i + 1);
    }
  });

  // Submit Ingestion
  btnSubmit.addEventListener('click', async () => {
    const rows = Array.from(tbody.children);
    const parsedProducts = [];

    rows.forEach(tr => {
      const title = tr.querySelector('.val-title').value.trim();
      const price = tr.querySelector('.val-price').value.trim() || '1';
      const minQty = tr.querySelector('.val-qty').value.trim();
      const category = tr.querySelector('.val-cat').value.trim();
      const icon = tr.querySelector('.val-icon').value.trim();
      const desc = tr.querySelector('.val-desc').value.trim();

      // Only push valid records that have a name
      if (title) {
        parsedProducts.push({
          title,
          price: parseInt(price) || 1,
          minQty: parseInt(minQty) || 50,
          category: category || 'tech',
          icon: icon || '🎁',
          desc: desc || ''
        });
      }
    });

    if (parsedProducts.length === 0) {
      alert("No valid product data found in sheet rows. Ensure 'Title' is filled.");
      return;
    }

    const res = await GiftingAPI.bulkUploadProducts(parsedProducts);
    if (res.success) {
      alert(`Bulk ingestion successful! Added ${res.added} new products and updated ${res.updated} existing items.`);
      // Reset sheet
      tbody.innerHTML = '';
      for (let i = 0; i < 10; i++) insertBlankRow(i + 1);
      document.getElementById('bulk-csv-paste').value = '';
      
      // Reload inventories
      loadProductsGrid();
      loadOverviewStats();
    } else {
      alert("Bulk upload failed: " + res.message);
    }
  });

  function insertBlankRow(num) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center; color: var(--text-muted); font-weight: bold;">${num}</td>
      <td><input type="text" class="sheet-cell-input val-title" placeholder="Gifting Flask"></td>
      <td style="display: none;"><input type="number" class="sheet-cell-input val-price" value="1"></td>
      <td><input type="number" class="sheet-cell-input val-qty" placeholder="50"></td>
      <td><input type="text" class="sheet-cell-input val-cat" placeholder="drinkware"></td>
      <td><input type="text" class="sheet-cell-input val-icon" placeholder="🥤"></td>
      <td><input type="text" class="sheet-cell-input val-desc" placeholder="Double-walled flask"></td>
    `;
    tbody.appendChild(tr);
  }
}

/* ============================================================
   6. CUSTOMER INQUIRIES & LEADS MANAGEMENT
   ============================================================ */
let activeInquiryFilter = 'all';

function loadInquiries() {
  const container = document.getElementById('inquiries-list-wrapper');
  if (!container) return;

  // Bind status tab filters
  const filterBtns = document.querySelectorAll('.lead-filter-btn');
  filterBtns.forEach(btn => {
    // prevent multiple bindings
    btn.removeEventListener('click', handleInqFilterClick);
    btn.addEventListener('click', handleInqFilterClick);
  });

  renderInquiriesList();
}

function handleInqFilterClick(e) {
  const filterBtns = document.querySelectorAll('.lead-filter-btn');
  filterBtns.forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  
  activeInquiryFilter = e.target.getAttribute('data-filter');
  renderInquiriesList();
}

async function renderInquiriesList() {
  const container = document.getElementById('inquiries-list-wrapper');
  container.innerHTML = '<div class="loading-state">Loading client leads...</div>';
  
  const res = await GiftingAPI.getInquiries();
  if (res.success) {
    container.innerHTML = '';
    
    // Filter inquiries
    let list = res.inquiries;
    if (activeInquiryFilter !== 'all') {
      list = res.inquiries.filter(i => i.status === activeInquiryFilter);
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border-radius: 12px; border: 1.5px dashed var(--border); color: var(--text-muted);">
          <span style="font-size: 2.5rem; display: block; margin-bottom: 0.75rem;">📥</span>
          <h4>No inquiries found matching this category</h4>
        </div>
      `;
      return;
    }

    list.forEach(inq => {
      const card = document.createElement('div');
      card.className = `lead-tile ${inq.status}`;
      
      const date = new Date(inq.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      
      // Determine action buttons based on status
      let actionsHTML = '';
      if (inq.status === 'pending') {
        actionsHTML += `
          <button class="btn btn-outline btn-mini btn-action-reply" data-id="${inq.id}">Mark Replied</button>
          <button class="btn btn-outline btn-mini btn-action-archive" data-id="${inq.id}" style="border-color: var(--text-muted); color: var(--text-muted);">Archive</button>
        `;
      } else if (inq.status === 'replied') {
        actionsHTML += `
          <button class="btn btn-outline btn-mini btn-action-archive" data-id="${inq.id}" style="border-color: var(--text-muted); color: var(--text-muted);">Archive</button>
        `;
      } else if (inq.status === 'archived') {
        actionsHTML += `
          <button class="btn btn-outline btn-mini btn-action-pending" data-id="${inq.id}">Restore to Pending</button>
        `;
      }

      card.innerHTML = `
        <div class="lead-tile-header">
          <div>
            <span class="badge badge-${inq.status}">${inq.status}</span>
            <div class="lead-title-name" style="margin-top: 0.5rem;">${inq.name}</div>
            <div class="lead-company-name">${inq.company}</div>
          </div>
          <div class="lead-date-stamp">${date}</div>
        </div>

        <div class="lead-tile-details">
          <div><strong>📧 Email:</strong> ${inq.email}</div>
          <div><strong>📞 Phone:</strong> ${inq.phone}</div>
          <div><strong>📦 Qty Requested:</strong> ${inq.qty} units</div>
          <div><strong>⏳ Target Date:</strong> ${inq.timeline.toUpperCase()}</div>
        </div>

        <div class="lead-message-text">
          <strong>🛍️ Product Configuration Summary:</strong><br>
          <span style="font-family: monospace; font-size: 0.8rem; background: var(--bg-secondary); padding: 0.25rem 0.5rem; display: block; border-radius: 4px; margin-top: 0.25rem; border: 1px solid var(--border);">${inq.summary || inq.productDetails}</span>
        </div>

        ${inq.message ? `
        <div class="lead-message-text" style="border-top: 1px dashed var(--border); padding-top: 0.75rem;">
          <strong>💬 Client Message:</strong><br>
          <p style="margin-top: 0.25rem; font-style: italic; color: var(--text-muted); font-size: 0.85rem;">"${inq.message}"</p>
        </div>
        ` : ''}

        <div class="lead-actions-row">
          ${actionsHTML}
        </div>
      `;

      // Bind status updates
      const replyBtn = card.querySelector('.btn-action-reply');
      if (replyBtn) {
        replyBtn.addEventListener('click', () => changeInqStatus(inq.id, 'replied'));
      }
      
      const archiveBtn = card.querySelector('.btn-action-archive');
      if (archiveBtn) {
        archiveBtn.addEventListener('click', () => changeInqStatus(inq.id, 'archived'));
      }

      const pendingBtn = card.querySelector('.btn-action-pending');
      if (pendingBtn) {
        pendingBtn.addEventListener('click', () => changeInqStatus(inq.id, 'pending'));
      }

      container.appendChild(card);
    });
  }
}

async function changeInqStatus(id, status) {
  const res = await GiftingAPI.updateInquiryStatus(id, status);
  if (res.success) {
    renderInquiriesList();
    loadOverviewStats();
  }
}

/* ============================================================
   7. DESIGN, UI & SITE CONTENT CONFIGURATOR
   ============================================================ */
let activeDesignSubtab = 'subtab-aesthetics';

async function loadDesignPanel() {
  const slideshowEditorList = document.getElementById('slideshow-editor-list');
  const navLinksTbody = document.getElementById('nav-links-tbody');
  const timelineList = document.getElementById('timeline-editor-list');
  const valuesList = document.getElementById('values-editor-list');
  const faqsContainer = document.getElementById('faqs-editor-container');
  const packagingList = document.getElementById('packaging-editor-list');
  const builderItemsList = document.getElementById('builder-items-editor-list');

  // Bind Subtabs Switching
  const subBtns = document.querySelectorAll('.design-tab-btn');
  subBtns.forEach(btn => {
    btn.removeEventListener('click', handleSubtabClick);
    btn.addEventListener('click', handleSubtabClick);
  });

  const res = await GiftingAPI.getDesignSettings();
  if (!res.success || !res.design) return;
  const design = res.design;

  // ── SUBTAB 1: COLOR SYSTEMS & SLIDESHOW ────────────
  const colors = design.colors;
  document.getElementById('color-primary').value = colors.primary;
  document.getElementById('picker-primary').value = colors.primary;
  document.getElementById('color-gold').value = colors.gold;
  document.getElementById('picker-gold').value = colors.gold;
  document.getElementById('color-crimson').value = colors.crimson;
  document.getElementById('picker-crimson').value = colors.crimson;
  document.getElementById('font-headings').value = design.fonts.headings;

  bindPicker('primary');
  bindPicker('gold');
  bindPicker('crimson');

  // Submit Brand Style Colors
  const colorsForm = document.getElementById('design-colors-form');
  colorsForm.removeEventListener('submit', handleColorsFormSubmit);
  colorsForm.addEventListener('submit', handleColorsFormSubmit);

  // Slides Editor
  if (slideshowEditorList && design.slides) {
    renderSlideshowEditor(design.slides);
  }

  // Bind Add Slide Button
  const addSlideBtn = document.getElementById('btn-add-new-slide');
  if (addSlideBtn) {
    const newAddSlideBtn = addSlideBtn.cloneNode(true);
    addSlideBtn.parentNode.replaceChild(newAddSlideBtn, addSlideBtn);
    newAddSlideBtn.addEventListener('click', () => {
      design.slides.push({
        id: 's' + Date.now(),
        active: true,
        tag: "New Slide Tag",
        title: "New Slide Heading Title",
        desc: "Description copy text goes here...",
        image: ""
      });
      renderSlideshowEditor(design.slides);
    });
  }

  // Bind Save Slides Button
  const saveSlidesBtn = document.getElementById('btn-save-all-slides');
  if (saveSlidesBtn) {
    const newSaveSlidesBtn = saveSlidesBtn.cloneNode(true);
    saveSlidesBtn.parentNode.replaceChild(newSaveSlidesBtn, saveSlidesBtn);
    newSaveSlidesBtn.addEventListener('click', async () => {
      let valid = true;
      design.slides.forEach((s, idx) => {
        if (!s.tag || !s.title || !s.desc) {
          alert(`Please fill in Tag, Title, and Description for Slide #${idx + 1}`);
          valid = false;
        }
      });
      if (!valid) return;

      const res = await GiftingAPI.saveDesignSettings({ slides: design.slides });
      if (res.success) {
        alert("Hero slideshow slides saved successfully!");
        loadOverviewStats();
      } else {
        alert("Failed to save slides: " + res.message);
      }
    });
  }

  // ── SUBTAB 2: NAVBAR MENU & FOOTER ─────────────────
  // Header Base Form
  if (design.header) {
    document.getElementById('header-logo-text').value = design.header.logoText || 'GIFTING NEEDS';
    document.getElementById('header-logo-sub').value = design.header.logoSub || 'Corporate Solutions';
    document.getElementById('header-logo-text-color').value = design.header.logoTextColor || '#0b4c3a';
    document.getElementById('header-logo-text-size').value = design.header.logoTextSize || '1.5rem';
    document.getElementById('header-logo-sub-color').value = design.header.logoSubColor || '#bf8f30';
    document.getElementById('header-logo-sub-size').value = design.header.logoSubSize || '0.65rem';
    document.getElementById('header-cta-text').value = design.header.ctaText || 'Build A Kit';
    document.getElementById('header-cta-href').value = design.header.ctaHref || 'solutions.html';
    document.getElementById('header-logo-image-url').value = design.header.logoImage || '';

    const headerForm = document.getElementById('header-details-form');
    headerForm.removeEventListener('submit', handleHeaderFormSubmit);
    headerForm.addEventListener('submit', handleHeaderFormSubmit);

    // Bind Logo file uploader
    const logoFileInput = document.getElementById('header-logo-image-file');
    const logoUrlInput = document.getElementById('header-logo-image-url');
    if (logoFileInput && logoUrlInput) {
      // Clean previous listener
      const newFileInput = logoFileInput.cloneNode(true);
      logoFileInput.parentNode.replaceChild(newFileInput, logoFileInput);
      
      newFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        logoUrlInput.value = 'Uploading...';

        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target.result;
          const uploadRes = await GiftingAPI.uploadImage(file.name, base64);
          if (uploadRes.success) {
            logoUrlInput.value = uploadRes.url;
            // Instantly apply in admin header logo preview
            const navLogos = document.querySelectorAll('.nav-logo');
            navLogos.forEach(el => {
              el.innerHTML = `<img src="${uploadRes.url}" alt="Logo" style="max-height: 48px; width: auto; object-fit: contain; display: block;">`;
              el.style.gap = '0';
            });
            const standaloneLogoIcons = document.querySelectorAll('.login-header .nav-logo-icon');
            standaloneLogoIcons.forEach(el => {
              el.innerHTML = `<img src="${uploadRes.url}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;">`;
            });
          } else {
            logoUrlInput.value = design.header.logoImage || '';
            alert("Logo upload failed: " + uploadRes.message);
          }
        };
        reader.readAsDataURL(file);
      });
    }

    // Render Logo image in admin topbar & login overlay
    const navLogos = document.querySelectorAll('.nav-logo');
    navLogos.forEach(el => {
      if (design.header.logoImage) {
        el.innerHTML = `<img src="${design.header.logoImage}" alt="Logo" style="max-height: 48px; width: auto; object-fit: contain; display: block;">`;
        el.style.gap = '0';
      } else {
        const logoIcon = el.querySelector('.nav-logo-icon');
        if (logoIcon) {
          logoIcon.innerHTML = `
            <svg viewBox="0 0 24 24">
              <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4V8h16v11zM15 9.5c0 .83-.67 1.5-1.5 1.5h-3c-.83 0-1.5-.67-1.5-1.5V9H7v3c0 2.76 2.24 5 5 5s5-2.24 5-5V9h-2v.5z"/>
            </svg>
          `;
        }
      }
    });

    const standaloneLogoIcons = document.querySelectorAll('.login-header .nav-logo-icon');
    standaloneLogoIcons.forEach(el => {
      if (design.header.logoImage) {
        el.innerHTML = `<img src="${design.header.logoImage}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;">`;
      }
    });
  }

  // Navbar Links list rendering
  renderNavLinksTable(design.navigation);

  // Add Nav Link Form
  const addNavLinkForm = document.getElementById('add-nav-link-form');
  addNavLinkForm.removeEventListener('submit', handleAddNavLinkSubmit);
  addNavLinkForm.addEventListener('submit', handleAddNavLinkSubmit);

  // Footer Details Form
  if (design.footer) {
    const f = design.footer;
    document.getElementById('footer-logo-desc').value = f.logoDesc || '';
    document.getElementById('footer-address').value = f.contactInfo.address || '';
    document.getElementById('footer-phone').value = f.contactInfo.phone || '';
    document.getElementById('footer-phonedesk').value = f.contactInfo.phoneDesk || '';
    document.getElementById('footer-email').value = f.contactInfo.email || '';
    document.getElementById('footer-copyright').value = f.copyright || '';
    document.getElementById('footer-fb').value = f.socials.facebook || '';
    document.getElementById('footer-ln').value = f.socials.linkedin || '';
    document.getElementById('footer-ig').value = f.socials.instagram || '';

    const footerForm = document.getElementById('footer-details-form');
    footerForm.removeEventListener('submit', handleFooterFormSubmit);
    footerForm.addEventListener('submit', handleFooterFormSubmit);
  }

  // ── SUBTAB 3: SECTION CONTENT (Timeline / Values) ──
  // Timeline List
  if (timelineList && design.about && design.about.timeline) {
    renderTimelineMilestones(design.about.timeline);
  }

  // About Hero Form
  if (design.about) {
    document.getElementById('about-hero-title').value = design.about.heroTitle || '';
    document.getElementById('about-hero-desc').value = design.about.heroDesc || '';

    const aboutHeroForm = document.getElementById('about-hero-form');
    aboutHeroForm.removeEventListener('submit', handleAboutHeroSubmit);
    aboutHeroForm.addEventListener('submit', handleAboutHeroSubmit);
  }

  // Values Card Lists
  if (valuesList && design.about && design.about.values) {
    renderValuesEditor(design.about.values);
  }

  // ── SUBTAB 4: FAQS ACCORDION LIST ──────────────────
  if (faqsContainer && design.contact && design.contact.faqs) {
    renderFaqsEditor(design.contact.faqs);
  }

  // ── SUBTAB 5: CUSTOMIZER SOLUTION OPTIONS ──────────
  if (packagingList && design.solutions && design.solutions.boxTypes) {
    renderPackagingEditor(design.solutions.boxTypes);
  }

  if (builderItemsList && design.solutions && design.solutions.builderItems) {
    renderBuilderItemsEditor(design.solutions.builderItems);
  }

  // Add Customizer Kit Item form
  const addKitItemForm = document.getElementById('add-kit-item-form');
  addKitItemForm.removeEventListener('submit', handleAddKitItemSubmit);
  addKitItemForm.addEventListener('submit', handleAddKitItemSubmit);
}

function handleSubtabClick(e) {
  const subBtns = document.querySelectorAll('.design-tab-btn');
  subBtns.forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.design-subtab-content').forEach(c => c.classList.remove('active'));

  e.target.classList.add('active');
  activeDesignSubtab = e.target.getAttribute('data-subtab');
  document.getElementById(activeDesignSubtab).classList.add('active');
}

/* ============================================================
   SUBTAB FORMS & RENDER CONTROLLERS
   ============================================================ */
function bindPicker(name) {
  const picker = document.getElementById(`picker-${name}`);
  const text = document.getElementById(`color-${name}`);
  picker.addEventListener('input', (e) => { text.value = e.target.value.toUpperCase(); });
  text.addEventListener('input', (e) => {
    if (e.target.value.startsWith('#') && e.target.value.length >= 4) picker.value = e.target.value;
  });
}

async function handleColorsFormSubmit(e) {
  e.preventDefault();
  const settings = {
    colors: {
      primary: document.getElementById('color-primary').value.trim(),
      gold: document.getElementById('color-gold').value.trim(),
      crimson: document.getElementById('color-crimson').value.trim()
    },
    fonts: { headings: document.getElementById('font-headings').value }
  };
  const res = await GiftingAPI.saveDesignSettings(settings);
  if (res.success) {
    alert("Visual style color systems override saved successfully.");
    window.location.reload();
  }
}

// Header Submits
async function handleHeaderFormSubmit(e) {
  e.preventDefault();
  const header = {
    logoText: document.getElementById('header-logo-text').value.trim(),
    logoSub: document.getElementById('header-logo-sub').value.trim(),
    logoTextColor: document.getElementById('header-logo-text-color').value,
    logoTextSize: document.getElementById('header-logo-text-size').value.trim(),
    logoSubColor: document.getElementById('header-logo-sub-color').value,
    logoSubSize: document.getElementById('header-logo-sub-size').value.trim(),
    ctaText: document.getElementById('header-cta-text').value.trim(),
    ctaHref: document.getElementById('header-cta-href').value.trim(),
    logoImage: document.getElementById('header-logo-image-url').value.trim()
  };
  const res = await GiftingAPI.saveDesignSettings({ header });
  if (res.success) alert("Header branding elements updated successfully!");
}

function renderNavLinksTable(links) {
  const tbody = document.getElementById('nav-links-tbody');
  tbody.innerHTML = '';
  links.forEach((l, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 700; color: var(--primary);">${l.label}</td>
      <td style="font-family: monospace; font-size: 0.8rem;">${l.href}</td>
      <td style="text-align: center;">
        <button class="btn btn-outline btn-mini btn-del-link" data-idx="${idx}" style="border-color: var(--crimson); color: var(--crimson); padding: 0.25rem 0.5rem;">Delete</button>
      </td>
    `;
    tr.querySelector('.btn-del-link').addEventListener('click', async () => {
      links.splice(idx, 1);
      const res = await GiftingAPI.saveDesignSettings({ navigation: links });
      if (res.success) renderNavLinksTable(links);
    });
    tbody.appendChild(tr);
  });
}

async function handleAddNavLinkSubmit(e) {
  e.preventDefault();
  const label = document.getElementById('add-nav-label').value.trim();
  const href = document.getElementById('add-nav-href').value.trim();

  const designRes = await GiftingAPI.getDesignSettings();
  if (designRes.success) {
    const links = designRes.design.navigation;
    links.push({ label, href });
    const res = await GiftingAPI.saveDesignSettings({ navigation: links });
    if (res.success) {
      document.getElementById('add-nav-label').value = '';
      document.getElementById('add-nav-href').value = '';
      renderNavLinksTable(links);
    }
  }
}

// Footer Configs
async function handleFooterFormSubmit(e) {
  e.preventDefault();
  const footer = {
    logoDesc: document.getElementById('footer-logo-desc').value.trim(),
    copyright: document.getElementById('footer-copyright').value.trim(),
    contactInfo: {
      address: document.getElementById('footer-address').value.trim(),
      email: document.getElementById('footer-email').value.trim(),
      phone: document.getElementById('footer-phone').value.trim(),
      phoneDesk: document.getElementById('footer-phonedesk').value.trim()
    },
    socials: {
      facebook: document.getElementById('footer-fb').value.trim() || '#',
      linkedin: document.getElementById('footer-ln').value.trim() || '#',
      instagram: document.getElementById('footer-ig').value.trim() || '#'
    }
  };
  const res = await GiftingAPI.saveDesignSettings({ footer });
  if (res.success) alert("Footer contacts and description coordinates saved successfully.");
}

// Timeline configs
function renderTimelineMilestones(milestones) {
  const container = document.getElementById('timeline-editor-list');
  container.innerHTML = '';
  
  milestones.forEach((m, idx) => {
    const div = document.createElement('div');
    div.className = 'timeline-editor-list';
    div.innerHTML = `
      <div class="editor-row-header">
        <span>Milestone #${idx + 1}</span>
        <button class="btn-remove-row btn-del-timeline" data-idx="${idx}">×</button>
      </div>
      <div class="form-row-group">
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Year / Milestone *</label>
          <input type="text" class="form-input val-timeline-year" value="${m.year}" required>
        </div>
        <div class="form-group" style="flex: 3;">
          <label class="form-label">Title Header *</label>
          <input type="text" class="form-input val-timeline-title" value="${m.title}" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description Milestone</label>
        <textarea class="form-input val-timeline-desc" rows="2" required>${m.desc}</textarea>
      </div>
    `;

    div.querySelector('.btn-del-timeline').addEventListener('click', async () => {
      milestones.splice(idx, 1);
      const res = await GiftingAPI.saveDesignSettings({ about: { ...GiftingAPI.getCurrentUser().design.about, timeline: milestones } });
      renderTimelineMilestones(milestones);
    });

    container.appendChild(div);
  });

  // Timeline Action Buttons
  const actionRow = document.createElement('div');
  actionRow.style.display = 'flex';
  actionRow.style.justifyContent = 'space-between';
  actionRow.style.marginTop = '1rem';
  actionRow.innerHTML = `
    <button class="btn btn-outline btn-mini" id="btn-add-milestone">+ Add Milestone</button>
    <button class="btn btn-primary btn-mini" id="btn-save-timeline">Save Timeline list</button>
  `;

  actionRow.querySelector('#btn-add-milestone').addEventListener('click', () => {
    milestones.push({ year: "2026", title: "New Milestone", desc: "Description here..." });
    renderTimelineMilestones(milestones);
  });

  actionRow.querySelector('#btn-save-timeline').addEventListener('click', async () => {
    const listCards = container.querySelectorAll('.timeline-editor-list');
    const parsed = [];
    listCards.forEach(card => {
      parsed.push({
        year: card.querySelector('.val-timeline-year').value.trim(),
        title: card.querySelector('.val-timeline-title').value.trim(),
        desc: card.querySelector('.val-timeline-desc').value.trim()
      });
    });
    
    const designRes = await GiftingAPI.getDesignSettings();
    if (designRes.success) {
      const about = designRes.design.about;
      about.timeline = parsed;
      const saveRes = await GiftingAPI.saveDesignSettings({ about });
      if (saveRes.success) alert(" Timeline milestones saved successfully!");
    }
  });

  container.appendChild(actionRow);
}

async function handleAboutHeroSubmit(e) {
  e.preventDefault();
  const designRes = await GiftingAPI.getDesignSettings();
  if (designRes.success) {
    const about = designRes.design.about;
    about.heroTitle = document.getElementById('about-hero-title').value.trim();
    about.heroDesc = document.getElementById('about-hero-desc').value.trim();

    const res = await GiftingAPI.saveDesignSettings({ about });
    if (res.success) alert("About introduction text updated!");
  }
}

function renderValuesEditor(values) {
  const container = document.getElementById('values-editor-list');
  container.innerHTML = '';

  values.forEach((v, idx) => {
    const div = document.createElement('div');
    div.className = 'values-editor-list';
    div.innerHTML = `
      <div class="editor-row-header">
        <span>Commitment #${idx + 1}</span>
      </div>
      <div class="form-row-group">
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Icon (Emoji)</label>
          <input type="text" class="form-input val-val-icon" value="${v.icon}" required>
        </div>
        <div class="form-group" style="flex: 4;">
          <label class="form-label">Commitment Header *</label>
          <input type="text" class="form-input val-val-title" value="${v.title}" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Message Details *</label>
        <textarea class="form-input val-val-desc" rows="2" required>${v.desc}</textarea>
      </div>
    `;
    container.appendChild(div);
  });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary btn-mini';
  saveBtn.style.width = '100%';
  saveBtn.textContent = 'Save Core Brand Commitments';
  saveBtn.addEventListener('click', async () => {
    const cards = container.querySelectorAll('.values-editor-list');
    const parsed = [];
    cards.forEach(card => {
      parsed.push({
        icon: card.querySelector('.val-val-icon').value.trim(),
        title: card.querySelector('.val-val-title').value.trim(),
        desc: card.querySelector('.val-val-desc').value.trim()
      });
    });
    
    const designRes = await GiftingAPI.getDesignSettings();
    if (designRes.success) {
      const about = designRes.design.about;
      about.values = parsed;
      const saveRes = await GiftingAPI.saveDesignSettings({ about });
      if (saveRes.success) alert("Brand commitments saved successfully!");
    }
  });
  container.appendChild(saveBtn);
}

// FAQs Accordions
function renderFaqsEditor(faqs) {
  const container = document.getElementById('faqs-editor-container');
  container.innerHTML = '';

  faqs.forEach((faq, idx) => {
    const div = document.createElement('div');
    div.className = 'faq-editor-row';
    div.innerHTML = `
      <div class="editor-row-header">
        <span>Accordion Row #${idx + 1}</span>
        <button class="btn-remove-row btn-del-faq" data-idx="${idx}">×</button>
      </div>
      <div class="form-group">
        <label class="form-label">Question Text *</label>
        <input type="text" class="form-input val-faq-q" value="${faq.question}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Answer Copy *</label>
        <textarea class="form-input val-faq-a" rows="2" required>${faq.answer}</textarea>
      </div>
    `;

    div.querySelector('.btn-del-faq').addEventListener('click', () => {
      faqs.splice(idx, 1);
      renderFaqsEditor(faqs);
    });

    container.appendChild(div);
  });

  // Bind Insert/Save FAQS
  const addBtn = document.getElementById('btn-add-new-faq');
  addBtn.removeEventListener('click', handleAddNewFaqClick);
  addBtn.addEventListener('click', () => {
    faqs.push({ question: "New FAQ Question?", answer: "Answer copy goes here..." });
    renderFaqsEditor(faqs);
  });

  const saveBtn = document.getElementById('btn-save-all-faqs');
  saveBtn.removeEventListener('click', handleSaveAllFaqsClick);
  saveBtn.addEventListener('click', async () => {
    const rows = container.querySelectorAll('.faq-editor-row');
    const parsed = [];
    rows.forEach(r => {
      parsed.push({
        question: r.querySelector('.val-faq-q').value.trim(),
        answer: r.querySelector('.val-faq-a').value.trim()
      });
    });
    const res = await GiftingAPI.saveDesignSettings({ contact: { faqs: parsed } });
    if (res.success) alert("FAQ list committed successfully!");
  });
}

function handleAddNewFaqClick() {} // Hook declarations
function handleSaveAllFaqsClick() {}

// Customizer Options packaging/items
function renderPackagingEditor(boxes) {
  const container = document.getElementById('packaging-editor-list');
  container.innerHTML = '';

  boxes.forEach((box, idx) => {
    const div = document.createElement('div');
    div.className = 'packaging-editor-card';
    div.innerHTML = `
      <div class="editor-row-header">
        <span>Box: ${box.name}</span>
      </div>
      <div class="form-row-group">
        <div class="form-group" style="flex: 2;">
          <label class="form-label">Box Display Name *</label>
          <input type="text" class="form-input val-box-name" value="${box.name}" required>
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Price (₹) *</label>
          <input type="number" class="form-input val-box-price" value="${box.price}" required>
        </div>
        <div class="form-group" style="flex: 0.5;">
          <label class="form-label">Icon</label>
          <input type="text" class="form-input val-box-icon" value="${box.icon}" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description Description</label>
        <input type="text" class="form-input val-box-desc" value="${box.desc}" required>
      </div>
    `;
    container.appendChild(div);
  });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary btn-mini';
  saveBtn.style.width = '100%';
  saveBtn.textContent = 'Save Custom Box Styles';
  saveBtn.addEventListener('click', async () => {
    const cards = container.querySelectorAll('.packaging-editor-card');
    const parsed = [];
    cards.forEach((card, idx) => {
      parsed.push({
        id: boxes[idx].id,
        name: card.querySelector('.val-box-name').value.trim(),
        price: parseInt(card.querySelector('.val-box-price').value),
        icon: card.querySelector('.val-box-icon').value.trim(),
        desc: card.querySelector('.val-box-desc').value.trim()
      });
    });
    const res = await GiftingAPI.saveDesignSettings({ solutions: { ...GiftingAPI.getCurrentUser().design.solutions, boxTypes: parsed } });
    if (res.success) alert("Box customizer packagings saved!");
  });

  container.appendChild(saveBtn);
}

function renderBuilderItemsEditor(items) {
  const container = document.getElementById('builder-items-editor-list');
  container.innerHTML = '';

  items.forEach((item, idx) => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.style.padding = '0.5rem 1rem';
    div.style.background = 'var(--bg-secondary)';
    div.style.border = '1px solid var(--border)';
    div.style.borderRadius = '8px';
    div.innerHTML = `
      <div>
        <span style="font-size: 1.15rem; margin-right: 0.5rem;">${item.icon}</span>
        <strong>${item.name}</strong> 
        <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 0.5rem;">(₹${item.price})</span>
      </div>
      <button class="btn-remove-row btn-del-kit-item" data-idx="${idx}">×</button>
    `;

    div.querySelector('.btn-del-kit-item').addEventListener('click', async () => {
      items.splice(idx, 1);
      const res = await GiftingAPI.saveDesignSettings({ solutions: { ...GiftingAPI.getCurrentUser().design.solutions, builderItems: items } });
      if (res.success) renderBuilderItemsEditor(items);
    });

    container.appendChild(div);
  });
}

async function handleAddKitItemSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('add-item-name').value.trim();
  const price = parseInt(document.getElementById('add-item-price').value);
  const icon = document.getElementById('add-item-icon').value.trim();

  const designRes = await GiftingAPI.getDesignSettings();
  if (designRes.success) {
    const items = designRes.design.solutions.builderItems;
    
    // Generate next bi ID
    let max = 0;
    items.forEach(i => {
      const num = parseInt(i.id.replace('bi', ''));
      if (!isNaN(num) && num > max) max = num;
    });
    const nextId = 'bi' + (max + 1);

    items.push({ id: nextId, name, price, icon });
    
    const res = await GiftingAPI.saveDesignSettings({ solutions: { ...designRes.design.solutions, builderItems: items } });
    if (res.success) {
      document.getElementById('add-item-name').value = '';
      document.getElementById('add-item-price').value = '';
      document.getElementById('add-item-icon').value = '';
      renderBuilderItemsEditor(items);
    }
  }
}


/* ============================================================
   8. AI CHAT BOT AUTOMATION CONTROLLERS
   ============================================================ */
function initAIChat() {
  const form = document.getElementById('ai-chat-form');
  const input = document.getElementById('ai-chat-input');
  
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    input.value = '';
    appendChatBubble('user', query);

    // Call API Bot
    const res = await GiftingAPI.talkToAIBot(query);
    if (res.success) {
      appendChatBubble('bot', res.reply);
      
      // If AI executed an automation action, trigger data updates in dashboard
      if (res.actionTaken) {
        loadOverviewStats();
        loadProductsGrid();
        loadDesignPanel();
      }
    } else {
      appendChatBubble('bot', "🤖 Processing Error: I ran into an issue automating that command.");
    }
  });
}

function appendChatBubble(sender, text) {
  const body = document.getElementById('ai-chat-logs');
  if (!body) return;

  const div = document.createElement('div');
  div.className = `chat-bubble ${sender}`;
  // Handle newlines formatting in chatbot
  div.innerHTML = text.replace(/\n/g, '<br>');
  body.appendChild(div);
  
  // Auto scroll chat
  body.scrollTop = body.scrollHeight;
}

window.setChatInput = function(text) {
  const input = document.getElementById('ai-chat-input');
  if (input) {
    input.value = text;
    input.focus();
  }
};

/* ============================================================
   9. SLIDES & PRODUCT MEDIA HELPER CONTROLLERS
   ============================================================ */
function initProductImageUpload() {
  const fileInput = document.getElementById('crud-image-file');
  const urlInput = document.getElementById('crud-image-url');
  const previewBox = document.getElementById('crud-image-preview');
  const clearBtn = document.getElementById('crud-btn-clear-image');

  if (!fileInput) return;

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    previewBox.innerHTML = `⏳`;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      const res = await GiftingAPI.uploadImage(file.name, base64);
      if (res.success) {
        urlInput.value = res.url;
        previewBox.innerHTML = `<img src="${res.url}" style="width: 100%; height: 100%; object-fit: cover;">`;
        if (clearBtn) clearBtn.style.display = 'inline-block';
      } else {
        alert("Image upload failed: " + res.message);
        previewBox.innerHTML = `❌`;
      }
    };
    reader.readAsDataURL(file);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      urlInput.value = '';
      fileInput.value = '';
      previewBox.innerHTML = `📷`;
      clearBtn.style.display = 'none';
    });
  }
}

function renderSlideshowEditor(slides) {
  const container = document.getElementById('slideshow-editor-list');
  if (!container) return;
  container.innerHTML = '';

  slides.forEach((slide, idx) => {
    const card = document.createElement('div');
    card.className = 'slide-editor-card';
    card.style.border = '1px solid var(--border)';
    card.style.padding = '1.25rem';
    card.style.background = 'var(--bg-secondary)';
    card.style.borderRadius = '10px';
    card.style.marginBottom = '0.5rem';

    const imgPreview = slide.image
      ? `<img src="${GiftingAPI.resolveImage(slide.image)}" style="width: 100%; height: 100%; object-fit: cover;">`
      : `<span style="font-size: 1.25rem;">🖼️</span>`;

    card.innerHTML = `
      <div class="editor-row-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
        <span style="font-weight: 700; color: var(--primary);">Slide #${idx + 1}</span>
        <div style="display: flex; gap: 0.25rem; align-items: center;">
          <button type="button" class="btn btn-outline btn-mini btn-move-up" data-idx="${idx}" style="padding: 0.2rem 0.4rem; font-size:0.75rem;" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn btn-outline btn-mini btn-move-down" data-idx="${idx}" style="padding: 0.2rem 0.4rem; font-size:0.75rem;" ${idx === slides.length - 1 ? 'disabled' : ''}>▼</button>
          <label class="switch" style="margin: 0 0.5rem;">
            <input type="checkbox" class="slide-active-checkbox" data-idx="${idx}" ${slide.active ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <button type="button" class="btn btn-outline btn-mini btn-delete-slide" data-idx="${idx}" style="border-color: var(--crimson); color: var(--crimson); padding: 0.2rem 0.4rem; font-size:0.75rem;">Delete</button>
        </div>
      </div>
      
      <div class="form-row-group">
        <div class="form-group">
          <label class="form-label" style="font-size: 0.75rem;">Tag / Category Pill</label>
          <input type="text" class="form-input slide-tag-input" value="${slide.tag || ''}" style="padding: 0.4rem;" required>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size: 0.75rem;">Heading Title</label>
          <input type="text" class="form-input slide-title-input" value="${slide.title || ''}" style="padding: 0.4rem;" required>
        </div>
      </div>

      <div class="form-group" style="margin-top:0.5rem;">
        <label class="form-label" style="font-size: 0.75rem;">Description Copy</label>
        <textarea class="form-input slide-desc-input" rows="2" style="padding: 0.4rem;" required>${slide.desc || ''}</textarea>
      </div>

      <div class="form-group" style="margin-top:0.5rem;">
        <label class="form-label" style="font-size: 0.75rem;">Slide Background Image</label>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <input type="file" class="form-input slide-image-file" accept="image/*" style="flex: 1; padding: 0.25rem; font-size: 0.8rem; background: var(--bg-card);">
          <input type="hidden" class="slide-image-url-input" value="${slide.image || ''}">
          <div class="slide-preview-box" style="width: 40px; height: 40px; border-radius: 4px; background: rgba(0,0,0,0.05); overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border);">
            ${imgPreview}
          </div>
          ${slide.image ? `<button type="button" class="btn btn-outline btn-mini btn-clear-slide-img" style="border-color: var(--crimson); color: var(--crimson); padding: 0.2rem 0.4rem;">Clear</button>` : ''}
        </div>
      </div>
    `;

    // Bind Move Up
    const upBtn = card.querySelector('.btn-move-up');
    if (upBtn) {
      upBtn.addEventListener('click', () => {
        if (idx > 0) {
          const temp = slides[idx];
          slides[idx] = slides[idx - 1];
          slides[idx - 1] = temp;
          renderSlideshowEditor(slides);
        }
      });
    }

    // Bind Move Down
    const downBtn = card.querySelector('.btn-move-down');
    if (downBtn) {
      downBtn.addEventListener('click', () => {
        if (idx < slides.length - 1) {
          const temp = slides[idx];
          slides[idx] = slides[idx + 1];
          slides[idx + 1] = temp;
          renderSlideshowEditor(slides);
        }
      });
    }

    // Bind Delete
    card.querySelector('.btn-delete-slide').addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete Slide #${idx + 1}?`)) {
        slides.splice(idx, 1);
        renderSlideshowEditor(slides);
      }
    });

    // Bind Toggle Active
    card.querySelector('.slide-active-checkbox').addEventListener('change', (e) => {
      slide.active = e.target.checked;
    });

    // Bind Text Inputs
    card.querySelector('.slide-tag-input').addEventListener('input', (e) => {
      slide.tag = e.target.value.trim();
    });
    card.querySelector('.slide-title-input').addEventListener('input', (e) => {
      slide.title = e.target.value.trim();
    });
    card.querySelector('.slide-desc-input').addEventListener('input', (e) => {
      slide.desc = e.target.value.trim();
    });

    // Bind Image File Upload
    const fileInput = card.querySelector('.slide-image-file');
    const urlInput = card.querySelector('.slide-image-url-input');
    const previewBox = card.querySelector('.slide-preview-box');
    const clearImgBtn = card.querySelector('.btn-clear-slide-img');

    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        previewBox.innerHTML = `⏳`;

        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target.result;
          const uploadRes = await GiftingAPI.uploadImage(file.name, base64);
          if (uploadRes.success) {
            slide.image = uploadRes.url;
            urlInput.value = uploadRes.url;
            previewBox.innerHTML = `<img src="${uploadRes.url}" style="width: 100%; height: 100%; object-fit: cover;">`;
            renderSlideshowEditor(slides); // Re-render to update clear button
          } else {
            alert("Image upload failed: " + uploadRes.message);
            previewBox.innerHTML = `❌`;
          }
        };
        reader.readAsDataURL(file);
      });
    }

    if (clearImgBtn) {
      clearImgBtn.addEventListener('click', () => {
        slide.image = '';
        urlInput.value = '';
        previewBox.innerHTML = `<span style="font-size: 1.25rem;">🖼️</span>`;
        renderSlideshowEditor(slides);
      });
    }

    container.appendChild(card);
  });
}

/* ============================================================
   8b. BULK PRODUCT IMAGE UPLOADER
   ============================================================ */
function initBulkImageUploader() {
  const imageInput = document.getElementById('bulk-image-select');
  const gridContainer = document.getElementById('bulk-images-grid-container');
  const grid = document.getElementById('bulk-images-grid');
  const btnUploadAll = document.getElementById('btn-submit-bulk-images-upload');
  const btnClearImages = document.getElementById('btn-clear-bulk-images');
  const actionsRow = document.getElementById('bulk-image-upload-actions');

  if (!imageInput) return;

  let selectedFiles = [];

  btnClearImages.addEventListener('click', () => {
    imageInput.value = '';
    selectedFiles = [];
    grid.innerHTML = '';
    gridContainer.style.display = 'none';
    actionsRow.style.display = 'none';
    btnUploadAll.disabled = true;
  });

  imageInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Fetch latest products list
    const prodRes = await GiftingAPI.getProducts();
    const products = prodRes.success ? prodRes.products : [];

    selectedFiles = files.map(file => {
      // Try auto-matching by filename
      // Match by exact product ID (e.g. "p1.png" -> matches product ID "p1")
      // Match by title fuzzy match
      const filename = file.name;
      const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')).toLowerCase().trim();
      let matchedProductId = '';

      const matchedById = products.find(p => p.id.toLowerCase() === nameWithoutExt);
      if (matchedById) {
        matchedProductId = matchedById.id;
      } else {
        // Try fuzzy match title (does product title contain or equal the filename?)
        const matchedByTitle = products.find(p => {
          const titleLower = p.title.toLowerCase();
          return titleLower === nameWithoutExt || titleLower.includes(nameWithoutExt) || nameWithoutExt.includes(titleLower);
        });
        if (matchedByTitle) {
          matchedProductId = matchedByTitle.id;
        }
      }

      return {
        file,
        matchedProductId,
        status: 'pending',
        message: 'Ready',
        uploadedUrl: ''
      };
    });

    renderSelectedImages(products);
  });

  function renderSelectedImages(products) {
    grid.innerHTML = '';
    
    if (selectedFiles.length === 0) {
      gridContainer.style.display = 'none';
      actionsRow.style.display = 'none';
      btnUploadAll.disabled = true;
      return;
    }

    gridContainer.style.display = 'block';
    actionsRow.style.display = 'block';
    btnUploadAll.disabled = false;

    selectedFiles.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'bulk-image-card';
      card.innerHTML = `
        <div class="bulk-image-thumbnail-wrapper">
          <img class="bulk-image-thumbnail" src="" id="bulk-thumb-${index}" alt="Preview">
        </div>
        <div class="bulk-image-details">
          <span class="bulk-image-name" title="${item.file.name}">${item.file.name}</span>
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted);">Link to Product:</label>
            <select class="form-input bulk-image-match-select" id="bulk-select-${index}" style="padding: 0.35rem; font-size: 0.8rem; margin: 0; background: var(--bg-card);">
              <option value="">-- Select Product --</option>
              ${products.map(p => `
                <option value="${p.id}" ${p.id === item.matchedProductId ? 'selected' : ''}>
                  [${p.id}] ${p.title}
                </option>
              `).join('')}
            </select>
          </div>
          <span class="bulk-image-status" id="bulk-status-${index}">
            <span class="status-dot" style="width: 8px; height: 8px; border-radius: 50%; display: inline-block; background: var(--text-muted);"></span>
            <span class="status-text">${item.message}</span>
          </span>
        </div>
      `;

      // Read thumbnail preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = card.querySelector(`#bulk-thumb-${index}`);
        if (img) img.src = e.target.result;
      };
      reader.readAsDataURL(item.file);

      // Listen for manual dropdown selection change
      const select = card.querySelector(`#bulk-select-${index}`);
      select.addEventListener('change', (e) => {
        selectedFiles[index].matchedProductId = e.target.value;
      });

      grid.appendChild(card);
    });
  }

  btnUploadAll.addEventListener('click', async () => {
    btnUploadAll.disabled = true;
    btnClearImages.disabled = true;
    imageInput.disabled = true;

    for (let index = 0; index < selectedFiles.length; index++) {
      const item = selectedFiles[index];
      const statusEl = document.getElementById(`bulk-status-${index}`);
      const selectEl = document.getElementById(`bulk-select-${index}`);

      if (!item.matchedProductId) {
        item.status = 'error';
        item.message = 'No product selected';
        updateStatusUI(index, 'error', 'No product selected');
        continue;
      }

      selectEl.disabled = true;
      item.status = 'uploading';
      item.message = 'Uploading...';
      updateStatusUI(index, 'uploading', 'Uploading...', 'var(--gold)');

      // Read file as base64
      try {
        const base64Data = await readFileAsBase64(item.file);
        
        // Upload image to API
        const uploadRes = await GiftingAPI.uploadImage(item.file.name, base64Data);
        if (uploadRes.success) {
          item.uploadedUrl = uploadRes.url;
          
          // Update product in DB
          const updateRes = await GiftingAPI.updateProduct(item.matchedProductId, { image: uploadRes.url });
          if (updateRes.success) {
            item.status = 'success';
            item.message = 'Linked successfully!';
            updateStatusUI(index, 'success', '✓ Linked!', 'var(--primary-light)');
          } else {
            item.status = 'error';
            item.message = 'Failed to link product';
            updateStatusUI(index, 'error', 'Failed to link: ' + updateRes.message, 'var(--crimson)');
          }
        } else {
          item.status = 'error';
          item.message = 'Upload failed';
          updateStatusUI(index, 'error', 'Upload failed: ' + uploadRes.message, 'var(--crimson)');
        }
      } catch (err) {
        console.error(err);
        item.status = 'error';
        item.message = 'Error during upload';
        updateStatusUI(index, 'error', 'Error: ' + err.message, 'var(--crimson)');
      }
    }

    alert('Bulk product image upload completed!');
    btnUploadAll.disabled = false;
    btnClearImages.disabled = false;
    imageInput.disabled = false;
    
    // Reload product CRUD table to show updated images
    loadProductsGrid();
  });

  function updateStatusUI(index, status, text, color = 'var(--text-muted)') {
    const statusEl = document.getElementById(`bulk-status-${index}`);
    if (statusEl) {
      statusEl.className = `bulk-image-status ${status}`;
      statusEl.innerHTML = `
        <span class="status-dot" style="width: 8px; height: 8px; border-radius: 50%; display: inline-block; background: ${color};"></span>
        <span class="status-text">${text}</span>
      `;
    }
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
}
