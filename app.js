/* ═══════════════════════════════════════════════════════
   Restaurant POS — Reporting Dashboard (Read-Only)
   Pure JS + Supabase JS Client + Chart.js
   ═══════════════════════════════════════════════════════ */

let db;
const charts = {};
let currentPage = 'dashboard';
let connected = false;
const COLORS = {
  blue: '#3b82f6', green: '#22c55e', red: '#ef4444', yellow: '#eab308',
  purple: '#a855f7', cyan: '#06b6d4', orange: '#f97316', pink: '#ec4899',
  teal: '#14b8a6', indigo: '#6366f1',
  blueA: 'rgba(59,130,246,.15)', greenA: 'rgba(34,197,94,.15)', redA: 'rgba(239,68,68,.15)',
  yellowA: 'rgba(234,179,8,.15)', purpleA: 'rgba(168,85,247,.15)', cyanA: 'rgba(6,182,212,.15)',
  orangeA: 'rgba(249,115,22,.15)', pinkA: 'rgba(236,72,153,.15)'
};
const COLOR_ARR = [COLORS.blue, COLORS.green, COLORS.orange, COLORS.purple, COLORS.cyan, COLORS.red, COLORS.yellow, COLORS.pink, COLORS.teal, COLORS.indigo];

// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    db = window.supabase.createClient(REPORT_CONFIG.SUPABASE_URL, REPORT_CONFIG.SUPABASE_ANON_KEY);
    const { error } = await db.from('app_settings').select('id').limit(1);
    if (error && error.code === '42P01') {
      connected = false;
    } else {
      connected = true;
    }
  } catch (e) {
    connected = false;
  }
  updateConnectionStatus();
  initNavigation();
  initMobileMenu();
  initDates();
  loadDashboard();
});

function updateConnectionStatus() {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  if (connected) {
    dot?.classList.remove('offline'); dot?.classList.add('online');
    if (txt) txt.textContent = 'Connected';
  } else {
    dot?.classList.remove('online'); dot?.classList.add('offline');
    if (txt) txt.textContent = 'Disconnected';
  }
}

// ── Navigation ───────────────────────────────────────
function initNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });
}

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('.sidebar-overlay')?.classList.remove('active');
  window.scrollTo(0, 0);

  const loaders = {
    dashboard: loadDashboard, sales: loadSales, orders: loadOrders,
    invoices: loadInvoices, menu: loadMenu, expenses: loadExpenses,
    registers: loadRegisters, tables: loadTables, staff: loadStaff,
    customers: loadCustomers
  };
  loaders[page]?.();
}

// ── Mobile menu ──────────────────────────────────────
function initMobileMenu() {
  const sidebar = document.querySelector('.sidebar');
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }
  function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('active'); }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }
  document.querySelectorAll('.mobile-menu-btn').forEach(btn => {
    btn.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
  });
  overlay.addEventListener('click', closeSidebar);
  let touchStartX = 0;
  sidebar.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  sidebar.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientX - touchStartX < -60) closeSidebar();
  }, { passive: true });
}

// ── Dates ────────────────────────────────────────────
function initDates() {
  const today = new Date();
  const thirtyAgo = new Date(today); thirtyAgo.setDate(today.getDate() - 30);
  const fmt = d => d.toISOString().slice(0, 10);
  document.querySelectorAll('input[type="date"]').forEach(inp => {
    inp.value = inp.id.includes('From') || inp.id.includes('from') ? fmt(thirtyAgo) : fmt(today);
  });
}

function getDateRange(fromId, toId) {
  const f = document.getElementById(fromId)?.value;
  const t = document.getElementById(toId)?.value;
  return { from: f ? f + 'T00:00:00Z' : null, to: t ? t + 'T23:59:59Z' : null };
}

// ── Helpers ──────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function fmt(n) { return n == null ? '0.00' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtInt(n) { return n == null ? '0' : Number(n).toLocaleString('en-US'); }
function fmtDate(d) { if (!d) return '-'; return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }
function fmtDateTime(d) { if (!d) return '-'; const dt = new Date(d); return dt.toLocaleDateString('en-US', { month:'short', day:'numeric' }) + ' ' + dt.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }); }
function statusBadge(s) {
  const map = { open:'info', paid:'success', voided:'danger', closed:'success', active:'success', available:'success', occupied:'warning', reserved:'purple', cleaning:'orange', proforma:'yellow' };
  return `<span class="badge badge-${map[s]||'info'}">${s||'-'}</span>`;
}
function statCard(label, value, icon, colorClass) {
  const c = COLORS[colorClass] || COLORS.blue;
  return `<div class="stat-card"><div class="icon" style="background:${c}22;color:${c}">${icon||''}</div><div class="label">${label}</div><div class="value">${value}</div></div>`;
}
function showLoader(id) { const el = $(id); if (el) el.innerHTML = '<div class="loader"><div class="spinner"></div></div>'; }
function emptyMsg(msg) { return `<tr><td colspan="20" style="text-align:center;color:var(--text-dim);padding:40px">${msg}</td></tr>`; }
function errorState(containerId, msg) {
  const el = $(containerId);
  if (el) el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-dim)"><p style="font-size:32px;margin-bottom:8px">&#9888;</p><p style="font-size:14px">${msg}</p></div>`;
}

function filterTable(input, tableId) {
  const val = input.value.toLowerCase();
  document.querySelectorAll(`#${tableId} tbody tr`).forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(val) ? '' : 'none';
  });
}

function makeChart(canvasId, config) {
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  const isPie = ['doughnut','pie','polarArea'].includes(config.type);
  const baseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
    scales: isPie ? {} : {
      x: { ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45 }, grid: { color: 'rgba(255,255,255,.05)' } },
      y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.05)' } }
    }
  };
  config.options = { ...baseOpts, ...config.options, plugins: { ...baseOpts.plugins, ...config.options?.plugins } };
  charts[canvasId] = new Chart(ctx, config);
  return charts[canvasId];
}

// ── Supabase query helper ────────────────────────────
async function q(table, { select = '*', from, to, dateCol = 'created_at', filters = {}, order = null, limit = null } = {}) {
  let query = db.from(table).select(select);
  if (from && to) query = query.gte(dateCol, from).lte(dateCol, to);
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== '' && v != null && v !== undefined) {
      if (typeof v === 'boolean') query = query.eq(k, v);
      else query = query.eq(k, v);
    }
  });
  if (order) query = query.order(order.col, { ascending: order.asc ?? false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) { console.error(`${table}:`, error.message); return []; }
  return data || [];
}

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════
async function loadDashboard() {
  const { from, to } = getDateRange('dashDateFrom', 'dashDateTo');
  showLoader('dashStats');
  try {
    const [invoices, orders, expenses, orderItems, recentOrders, allOrderItems] = await Promise.all([
      q('invoices', { from, to, filters: { status: 'paid' } }),
      q('orders', { from, to }),
      q('expenses', { from, to }),
      q('order_items', { from, to }),
      q('orders', { from, to, order: { col:'created_at', asc:false }, limit: 20 }),
      q('order_items', { from, to })
    ]);

    const totalRevenue = invoices.reduce((s, i) => s + (i.grand_total || 0), 0);
    const totalOrders = orders.length;
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalItems = orderItems.reduce((s, i) => s + (i.quantity || 0), 0);
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalDiscounts = invoices.reduce((s, i) => s + (i.discount_value || 0), 0);

    $('dashStats').innerHTML = [
      statCard('Revenue', '$' + fmt(totalRevenue), '$', 'green'),
      statCard('Orders', fmtInt(totalOrders), '#', 'blue'),
      statCard('Avg Order', '$' + fmt(avgOrder), '~', 'purple'),
      statCard('Items Sold', fmtInt(totalItems), '*', 'orange'),
      statCard('Expenses', '$' + fmt(totalExpenses), '-', 'red'),
      statCard('Discounts', '$' + fmt(totalDiscounts), '%', 'yellow'),
    ].join('');

    // Revenue over time
    const daily = {};
    invoices.forEach(i => {
      const d = new Date(i.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' });
      daily[d] = (daily[d]||0) + (i.grand_total||0);
    });
    makeChart('chartRevenue', {
      type: 'bar', data: {
        labels: Object.keys(daily),
        datasets: [{ label:'Revenue', data: Object.values(daily), backgroundColor: COLORS.blueA, borderColor: COLORS.blue, borderWidth: 1.5, borderRadius: 4 }]
      }
    });

    // Orders by type
    const types = {};
    orders.forEach(o => { types[(o.order_type||'dine_in').replace('_',' ')] = (types[(o.order_type||'dine_in').replace('_',' ')]||0)+1; });
    makeChart('chartOrderType', {
      type: 'doughnut', data: {
        labels: Object.keys(types),
        datasets: [{ data: Object.values(types), backgroundColor: COLOR_ARR.slice(0, Object.keys(types).length), borderWidth: 0 }]
      }, options: { plugins: { legend: { position:'bottom' } } }
    });

    // Payment methods
    const methods = {};
    invoices.forEach(i => { const m = (i.payment_method||'cash').charAt(0).toUpperCase()+(i.payment_method||'cash').slice(1); methods[m] = (methods[m]||0)+(i.grand_total||0); });
    makeChart('chartPayment', {
      type: 'doughnut', data: {
        labels: Object.keys(methods),
        datasets: [{ data: Object.values(methods), backgroundColor: COLOR_ARR.slice(0, Object.keys(methods).length), borderWidth: 0 }]
      }, options: { plugins: { legend: { position:'bottom' } } }
    });

    // Top items
    const itemSales = {};
    orderItems.forEach(oi => { itemSales[oi.menu_item_name] = (itemSales[oi.menu_item_name]||0) + (oi.quantity||0); });
    const sortedItems = Object.entries(itemSales).sort((a,b)=>b[1]-a[1]).slice(0,10);
    if (sortedItems.length) makeChart('chartTopItems', {
      type: 'bar', data: {
        labels: sortedItems.map(i=>i[0]),
        datasets: [{ label:'Qty Sold', data: sortedItems.map(i=>i[1]), backgroundColor: COLORS.purpleA, borderColor: COLORS.purple, borderWidth: 1.5, borderRadius: 4 }]
      }, options: { indexAxis:'y' }
    });

    // Expenses by category
    const expCat = {};
    expenses.forEach(e => { expCat[e.category||'Other'] = (expCat[e.category||'Other']||0)+(e.amount||0); });
    if (Object.keys(expCat).length) makeChart('chartExpensesCat', {
      type: 'polarArea', data: {
        labels: Object.keys(expCat),
        datasets: [{ data: Object.values(expCat), backgroundColor: COLOR_ARR.map(c=>c+'44') }]
      }
    });

    // Recent orders
    const oiCounts = {};
    allOrderItems.forEach(oi => { oiCounts[oi.order_id] = (oiCounts[oi.order_id]||0) + oi.quantity; });
    const orderTotals = {};
    allOrderItems.forEach(oi => { orderTotals[oi.order_id] = (orderTotals[oi.order_id]||0) + (oi.unit_price||0)*(oi.quantity||0); });
    $('dashRecentOrders').querySelector('tbody').innerHTML = recentOrders.length
      ? recentOrders.map(o => `<tr>
          <td><strong>${o.order_number||''}</strong></td><td>${o.table_name||''}</td><td>${o.waiter_name||''}</td>
          <td>${(o.order_type||'').replace('_',' ')}</td><td>${statusBadge(o.status)}</td>
          <td>$${fmt(orderTotals[o.id]||0)}</td><td>${fmtDateTime(o.created_at)}</td>
        </tr>`).join('')
      : emptyMsg('No recent orders');
  } catch (e) { console.error('Dashboard error:', e); errorState('dashStats', 'Failed to load dashboard. Check connection.'); }
}

// ═══════════════════════════════════════════════════════
// SALES
// ═══════════════════════════════════════════════════════
async function loadSales() {
  const { from, to } = getDateRange('salesDateFrom', 'salesDateTo');
  showLoader('salesStats');
  try {
    const inv = await q('invoices', { from, to, filters: { status: 'paid' } });
    const total = inv.reduce((s,i)=>s+(i.grand_total||0),0);
    const count = inv.length;
    const avg = count > 0 ? total/count : 0;
    const discounts = inv.reduce((s,i)=>s+(i.discount_value||0),0);

    $('salesStats').innerHTML = [
      statCard('Total Sales', '$'+fmt(total), '$', 'green'),
      statCard('Invoices', fmtInt(count), '#', 'blue'),
      statCard('Average', '$'+fmt(avg), '~', 'purple'),
      statCard('Discounts', '$'+fmt(discounts), '%', 'yellow'),
    ].join('');

    // Daily revenue
    const daily = {};
    inv.forEach(i => {
      const d = new Date(i.created_at).toISOString().slice(0,10);
      daily[d] = (daily[d]||0)+(i.grand_total||0);
    });
    const sortedDays = Object.keys(daily).sort();
    if (sortedDays.length) makeChart('chartSalesDaily', {
      type:'line', data: {
        labels: sortedDays.map(d=>new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'})),
        datasets: [{ label:'Revenue', data:sortedDays.map(d=>daily[d]), borderColor:COLORS.green, backgroundColor:COLORS.greenA, fill:true, tension:.3, pointRadius:3 }]
      }
    });

    // Hourly
    const hourly = new Array(24).fill(0);
    inv.forEach(i => { hourly[new Date(i.created_at).getHours()] += (i.grand_total||0); });
    makeChart('chartSalesHourly', {
      type:'bar', data: {
        labels: hourly.map((_,i)=>`${i}:00`),
        datasets: [{ label:'Revenue', data:hourly, backgroundColor:COLORS.cyanA, borderColor:COLORS.cyan, borderWidth:1, borderRadius:3 }]
      }
    });

    // By waiter
    const waiter = {};
    inv.forEach(i => { waiter[i.waiter_name||'Unknown'] = (waiter[i.waiter_name||'Unknown']||0)+(i.grand_total||0); });
    const sortedWaiters = Object.entries(waiter).sort((a,b)=>b[1]-a[1]);
    if (sortedWaiters.length) makeChart('chartSalesWaiter', {
      type:'bar', data: {
        labels: sortedWaiters.map(w=>w[0]),
        datasets: [{ label:'Revenue', data:sortedWaiters.map(w=>w[1]), backgroundColor:COLORS.orangeA, borderColor:COLORS.orange, borderWidth:1, borderRadius:3 }]
      }
    });

    // Table
    const sorted = [...inv].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    $('salesTable').querySelector('tbody').innerHTML = sorted.length
      ? sorted.map(i => `<tr>
          <td><strong>${i.invoice_number||''}</strong></td><td>${i.order_number||''}</td><td>${i.table_name||''}</td><td>${i.waiter_name||''}</td>
          <td>$${fmt(i.subtotal)}</td><td>$${fmt(i.discount_value)}</td><td>$${fmt(i.tax_value)}</td><td><strong>$${fmt(i.grand_total)}</strong></td>
          <td>${statusBadge(i.payment_method)}</td><td>${fmtDateTime(i.created_at)}</td>
        </tr>`).join('')
      : emptyMsg('No paid invoices found for this period');
  } catch (e) { console.error('Sales error:', e); errorState('salesStats', 'Failed to load sales data.'); }
}

// ═══════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════
async function loadOrders() {
  const { from, to } = getDateRange('ordersDateFrom', 'ordersDateTo');
  const status = $('ordersStatusFilter')?.value;
  showLoader('orderStats');
  try {
    const orders = await q('orders', { from, to, filters: status ? { status } : {} });
    const allItems = await q('order_items', { from, to });
    const itemCounts = {}, orderTotals = {};
    allItems.forEach(oi => {
      itemCounts[oi.order_id] = (itemCounts[oi.order_id]||0) + oi.quantity;
      orderTotals[oi.order_id] = (orderTotals[oi.order_id]||0) + (oi.unit_price||0)*(oi.quantity||0);
    });

    const paid = orders.filter(o=>o.status==='paid').length;
    const open = orders.filter(o=>o.status==='open').length;
    const voided = orders.filter(o=>o.status==='voided').length;

    $('orderStats').innerHTML = [
      statCard('Total Orders', fmtInt(orders.length), '#', 'blue'),
      statCard('Paid', fmtInt(paid), '$', 'green'),
      statCard('Open', fmtInt(open), '~', 'cyan'),
      statCard('Voided', fmtInt(voided), '!', 'red'),
    ].join('');

    const sorted = [...orders].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    $('ordersTable').querySelector('tbody').innerHTML = sorted.length
      ? sorted.map(o => `<tr>
          <td><strong>${o.order_number||''}</strong></td><td>${o.table_name||''}</td><td>${o.waiter_name||''}</td>
          <td>${(o.order_type||'').replace('_',' ')}</td><td>${o.guest_count||0}</td><td>${statusBadge(o.status)}</td>
          <td>${itemCounts[o.id]||0}</td><td>$${fmt(orderTotals[o.id]||0)}</td><td>${fmtDateTime(o.created_at)}</td><td>${fmtDateTime(o.paid_at)}</td>
        </tr>`).join('')
      : emptyMsg('No orders found for this period');
  } catch (e) { console.error('Orders error:', e); errorState('orderStats', 'Failed to load orders.'); }
}

// ═══════════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════════
async function loadInvoices() {
  const { from, to } = getDateRange('invDateFrom', 'invDateTo');
  const status = $('invStatusFilter')?.value;
  showLoader('invStats');
  try {
    const inv = await q('invoices', { from, to, filters: status ? { status } : {} });
    const total = inv.reduce((s,i)=>s+(i.grand_total||0),0);
    const paid = inv.filter(i=>i.status==='paid').length;
    const voided = inv.filter(i=>i.status==='voided').length;
    const proforma = inv.filter(i=>i.status==='proforma').length;

    $('invStats').innerHTML = [
      statCard('Total Invoices', fmtInt(inv.length), '#', 'blue'),
      statCard('Revenue', '$'+fmt(total), '$', 'green'),
      statCard('Paid', fmtInt(paid), '$', 'green'),
      statCard('Proforma', fmtInt(proforma), '~', 'yellow'),
      statCard('Voided', fmtInt(voided), '!', 'red'),
    ].join('');

    const sorted = [...inv].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    $('invTable').querySelector('tbody').innerHTML = sorted.length
      ? sorted.map(i => `<tr>
          <td><strong>${i.invoice_number||''}</strong></td><td>${i.order_number||''}</td><td>${i.table_name||''}</td><td>${i.waiter_name||''}</td>
          <td>$${fmt(i.subtotal)}</td><td>$${fmt(i.discount_value)}</td><td>$${fmt(i.tax_value)}</td><td>$${fmt(i.service_charge_value)}</td>
          <td><strong>$${fmt(i.grand_total)}</strong></td><td>$${fmt(i.amount_paid)}</td>
          <td>${statusBadge(i.payment_method)}</td><td>${statusBadge(i.status)}</td><td>${fmtDateTime(i.created_at)}</td>
        </tr>`).join('')
      : emptyMsg('No invoices found for this period');
  } catch (e) { console.error('Invoices error:', e); errorState('invStats', 'Failed to load invoices.'); }
}

// ═══════════════════════════════════════════════════════
// MENU ITEMS
// ═══════════════════════════════════════════════════════
async function loadMenu() {
  showLoader('menuStats');
  try {
    const [items, groups, orderItems] = await Promise.all([
      q('menu_items'), q('menu_groups'), q('order_items')
    ]);

    const totalRevenue = orderItems.reduce((s,oi)=>s+(oi.unit_price||0)*(oi.quantity||0),0);
    const totalItemsSold = orderItems.reduce((s,oi)=>s+(oi.quantity||0),0);
    const available = items.filter(i=>i.is_available).length;

    $('menuStats').innerHTML = [
      statCard('Total Items', fmtInt(items.length), '*', 'blue'),
      statCard('Active', fmtInt(available), '$', 'green'),
      statCard('Groups', fmtInt(groups.length), '#', 'purple'),
      statCard('Items Sold', fmtInt(totalItemsSold), '~', 'orange'),
      statCard('Revenue', '$'+fmt(totalRevenue), '$', 'cyan'),
    ].join('');

    // Performance chart
    const salesByName = {};
    orderItems.forEach(oi => { salesByName[oi.menu_item_name] = (salesByName[oi.menu_item_name]||0) + oi.quantity; });
    const top = Object.entries(salesByName).sort((a,b)=>b[1]-a[1]).slice(0,15);
    if (top.length) makeChart('chartItemPerformance', {
      type:'bar', data: {
        labels: top.map(t=>t[0]),
        datasets: [{ label:'Qty Sold', data:top.map(t=>t[1]), backgroundColor:COLOR_ARR.slice(0,top.length).map(c=>c+'66'), borderColor:COLOR_ARR.slice(0,top.length), borderWidth:1, borderRadius:3 }]
      }, options: { indexAxis: top.length > 10 ? 'y' : 'x' }
    });

    // Table
    const groupMap = {};
    groups.forEach(g => groupMap[g.id] = g.name);
    const itemStats = {};
    orderItems.forEach(oi => {
      if (!itemStats[oi.menu_item_id]) itemStats[oi.menu_item_id] = { qty: 0, rev: 0 };
      itemStats[oi.menu_item_id].qty += oi.quantity||0;
      itemStats[oi.menu_item_id].rev += (oi.unit_price||0)*(oi.quantity||0);
    });
    $('menuTable').querySelector('tbody').innerHTML = items.length
      ? items.map(i => {
          const st = itemStats[i.id] || { qty:0, rev:0 };
          const margin = i.price > 0 ? ((i.price - (i.cost_price||0))/i.price*100).toFixed(1) : 0;
          return `<tr>
            <td><strong>${i.name||''}</strong></td><td>${groupMap[i.group_id]||'-'}</td>
            <td>$${fmt(i.price)}</td><td>$${fmt(i.cost_price)}</td>
            <td>${margin}%</td>
            <td>${i.is_available ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-danger">No</span>'}</td>
            <td>${fmtInt(st.qty)}</td><td>$${fmt(st.rev)}</td>
          </tr>`;
        }).join('')
      : emptyMsg('No menu items found');
  } catch (e) { console.error('Menu error:', e); errorState('menuStats', 'Failed to load menu items.'); }
}

// ═══════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════
async function loadExpenses() {
  const { from, to } = getDateRange('expDateFrom', 'expDateTo');
  showLoader('expStats');
  try {
    const exp = await q('expenses', { from, to });
    const total = exp.reduce((s,e)=>s+(e.amount||0),0);
    const cats = [...new Set(exp.map(e=>e.category))];
    const avg = exp.length > 0 ? total/exp.length : 0;

    $('expStats').innerHTML = [
      statCard('Total Expenses', '$'+fmt(total), '-', 'red'),
      statCard('Count', fmtInt(exp.length), '#', 'blue'),
      statCard('Avg Expense', '$'+fmt(avg), '~', 'yellow'),
      statCard('Categories', fmtInt(cats.length), '*', 'purple'),
    ].join('');

    const byCat = {};
    exp.forEach(e => { byCat[e.category||'Other'] = (byCat[e.category||'Other']||0)+(e.amount||0); });
    if (Object.keys(byCat).length) makeChart('chartExpCat', {
      type:'doughnut', data: {
        labels: Object.keys(byCat),
        datasets: [{ data:Object.values(byCat), backgroundColor:COLOR_ARR.slice(0,Object.keys(byCat).length), borderWidth:0 }]
      }, options: { plugins: { legend:{ position:'bottom' } } }
    });

    const daily = {};
    exp.forEach(e => {
      const d = new Date(e.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'});
      daily[d]=(daily[d]||0)+(e.amount||0);
    });
    if (Object.keys(daily).length) makeChart('chartExpDaily', {
      type:'line', data: {
        labels: Object.keys(daily),
        datasets: [{ label:'Expenses', data:Object.values(daily), borderColor:COLORS.red, backgroundColor:COLORS.redA, fill:true, tension:.3, pointRadius:3 }]
      }
    });

    const sorted = [...exp].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    $('expTable').querySelector('tbody').innerHTML = sorted.length
      ? sorted.map(e => `<tr>
          <td>${fmtDate(e.created_at)}</td><td>${statusBadge(e.category)}</td><td>${e.description||''}</td>
          <td><strong>$${fmt(e.amount)}</strong></td><td>${e.paid_by||''}</td><td>${e.register_id||'-'}</td>
        </tr>`).join('')
      : emptyMsg('No expenses found for this period');
  } catch (e) { console.error('Expenses error:', e); errorState('expStats', 'Failed to load expenses.'); }
}

// ═══════════════════════════════════════════════════════
// CASH REGISTERS
// ═══════════════════════════════════════════════════════
async function loadRegisters() {
  const { from, to } = getDateRange('regDateFrom', 'regDateTo');
  showLoader('regStats');
  try {
    const regs = await q('cash_registers', { from, to, dateCol: 'opened_at' });
    const totalCash = regs.reduce((s,r)=>s+(r.total_cash_sales||0),0);
    const totalCard = regs.reduce((s,r)=>s+(r.total_card_sales||0),0);
    const totalExp = regs.reduce((s,r)=>s+(r.total_expenses||0),0);
    const totalOrd = regs.reduce((s,r)=>s+(r.total_orders||0),0);

    $('regStats').innerHTML = [
      statCard('Cash Sales', '$'+fmt(totalCash), '$', 'green'),
      statCard('Card Sales', '$'+fmt(totalCard), '$', 'blue'),
      statCard('Expenses', '$'+fmt(totalExp), '-', 'red'),
      statCard('Orders', fmtInt(totalOrd), '#', 'purple'),
    ].join('');

    const daily = {};
    regs.forEach(r => {
      const d = new Date(r.opened_at).toLocaleDateString('en-US',{month:'short',day:'numeric'});
      daily[d] = (daily[d]||0)+(r.total_cash_sales||0)+(r.total_card_sales||0);
    });
    if (Object.keys(daily).length) makeChart('chartRegDaily', {
      type:'bar', data: {
        labels: Object.keys(daily),
        datasets: [{ label:'Total Sales', data:Object.values(daily), backgroundColor:COLORS.greenA, borderColor:COLORS.green, borderWidth:1, borderRadius:3 }]
      }
    });

    const sorted = [...regs].sort((a,b)=>new Date(b.opened_at)-new Date(a.opened_at));
    $('regTable').querySelector('tbody').innerHTML = sorted.length
      ? sorted.map(r => `<tr>
          <td>${r.id}</td><td>${r.opened_by||''}</td><td>$${fmt(r.opening_cash)}</td><td>${statusBadge(r.status)}</td>
          <td>${r.closed_by||'-'}</td><td>$${fmt(r.closing_cash)}</td>
          <td>$${fmt(r.total_cash_sales)}</td><td>$${fmt(r.total_card_sales)}</td>
          <td>$${fmt(r.total_expenses)}</td><td>${r.total_orders||0}</td>
          <td>${fmtDateTime(r.opened_at)}</td><td>${fmtDateTime(r.closed_at)}</td>
        </tr>`).join('')
      : emptyMsg('No register sessions found');
  } catch (e) { console.error('Registers error:', e); errorState('regStats', 'Failed to load register data.'); }
}

// ═══════════════════════════════════════════════════════
// TABLES
// ═══════════════════════════════════════════════════════
async function loadTables() {
  showLoader('tableStats');
  try {
    const [tables, floors] = await Promise.all([ q('restaurant_tables'), q('floors') ]);
    const available = tables.filter(t=>t.status==='available').length;
    const occupied = tables.filter(t=>t.status==='occupied').length;
    const reserved = tables.filter(t=>t.status==='reserved').length;
    const totalCap = tables.reduce((s,t)=>s+(t.capacity||0),0);

    $('tableStats').innerHTML = [
      statCard('Total Tables', fmtInt(tables.length), '#', 'blue'),
      statCard('Available', fmtInt(available), '$', 'green'),
      statCard('Occupied', fmtInt(occupied), '~', 'yellow'),
      statCard('Reserved', fmtInt(reserved), '*', 'purple'),
      statCard('Capacity', fmtInt(totalCap), '*', 'cyan'),
    ].join('');

    const floorMap = {};
    floors.forEach(f => floorMap[f.id] = f.name);
    $('tablesTable').querySelector('tbody').innerHTML = tables.length
      ? tables.map(t => `<tr>
          <td>${t.id}</td><td>${floorMap[t.floor_id]||'-'}</td><td><strong>${t.name||''}</strong></td><td>${t.capacity||0}</td>
          <td>${statusBadge(t.status)}</td><td>${t.waiter_name||'-'}</td><td>${t.guest_count||0}</td>
          <td>$${fmt(t.running_total)}</td><td>${fmtDateTime(t.order_start_time)}</td>
        </tr>`).join('')
      : emptyMsg('No tables found');
  } catch (e) { console.error('Tables error:', e); errorState('tableStats', 'Failed to load tables.'); }
}

// ═══════════════════════════════════════════════════════
// STAFF
// ═══════════════════════════════════════════════════════
async function loadStaff() {
  showLoader('staffStats');
  try {
    const [users, attendance, orders] = await Promise.all([
      q('users'), q('attendance', { order: { col:'check_in', asc:false }, limit:100 }),
      q('orders', { filters: { status:'paid' } })
    ]);

    const active = users.filter(u=>u.is_active).length;
    const totalSal = users.reduce((s,u)=>s+(u.salary||0),0);
    const present = attendance.filter(a=>!a.check_out).length;

    $('staffStats').innerHTML = [
      statCard('Total Staff', fmtInt(users.length), '#', 'blue'),
      statCard('Active', fmtInt(active), '$', 'green'),
      statCard('Currently In', fmtInt(present), '~', 'cyan'),
      statCard('Monthly Payroll', '$'+fmt(totalSal), '$', 'purple'),
    ].join('');

    const waiterOrders = {};
    orders.forEach(o => { waiterOrders[o.waiter_name||'Unknown'] = (waiterOrders[o.waiter_name||'Unknown']||0)+1; });
    const sortedW = Object.entries(waiterOrders).sort((a,b)=>b[1]-a[1]);
    if (sortedW.length) makeChart('chartStaffOrders', {
      type:'bar', data: { labels:sortedW.map(w=>w[0]), datasets:[{ label:'Orders', data:sortedW.map(w=>w[1]), backgroundColor:COLORS.blueA, borderColor:COLORS.blue, borderWidth:1, borderRadius:3 }] }
    });

    const inv = await q('invoices', { filters: { status:'paid' } });
    const waiterRev = {};
    inv.forEach(i => { waiterRev[i.waiter_name||'Unknown'] = (waiterRev[i.waiter_name||'Unknown']||0)+(i.grand_total||0); });
    const sortedR = Object.entries(waiterRev).sort((a,b)=>b[1]-a[1]);
    if (sortedR.length) makeChart('chartStaffRevenue', {
      type:'bar', data: { labels:sortedR.map(w=>w[0]), datasets:[{ label:'Revenue', data:sortedR.map(w=>w[1]), backgroundColor:COLORS.greenA, borderColor:COLORS.green, borderWidth:1, borderRadius:3 }] }
    });

    $('staffTable').querySelector('tbody').innerHTML = users.length
      ? users.map(u => `<tr>
          <td><strong>${u.name||''}</strong></td><td>${u.email||''}</td><td>${statusBadge(u.role)}</td>
          <td>${u.phone||'-'}</td><td>$${fmt(u.salary)}</td><td>${u.wage_type||'-'}</td>
          <td>${u.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</td>
        </tr>`).join('')
      : emptyMsg('No staff found');

    $('attendanceTable').querySelector('tbody').innerHTML = attendance.length
      ? attendance.map(a => {
          let dur = '-';
          if (a.check_in && a.check_out) {
            const ms = new Date(a.check_out) - new Date(a.check_in);
            dur = `${Math.floor(ms/3600000)}h ${Math.floor((ms%3600000)/60000)}m`;
          }
          return `<tr><td>${a.user_name||''}</td><td>${fmtDateTime(a.check_in)}</td><td>${fmtDateTime(a.check_out)}</td><td>${dur}</td><td>$${fmt(a.daily_wage)}</td></tr>`;
        }).join('')
      : emptyMsg('No attendance records');
  } catch (e) { console.error('Staff error:', e); errorState('staffStats', 'Failed to load staff data.'); }
}

// ═══════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════
async function loadCustomers() {
  showLoader('custStats');
  try {
    const [custs, credit, inv] = await Promise.all([
      q('customers'), q('credit_ledger'), q('invoices', { filters: { status:'paid' } })
    ]);

    const totalBal = custs.reduce((s,c)=>s+(c.balance||0),0);
    const totalLoyalty = custs.reduce((s,c)=>s+(c.loyalty_points||0),0);
    const creditUsed = credit.filter(c=>c.type==='sale').reduce((s,c)=>s+(c.amount||0),0);

    $('custStats').innerHTML = [
      statCard('Customers', fmtInt(custs.length), '#', 'blue'),
      statCard('Outstanding', '$'+fmt(totalBal), '-', 'red'),
      statCard('Loyalty Pts', fmtInt(totalLoyalty), '*', 'purple'),
      statCard('Credit Sales', '$'+fmt(creditUsed), '$', 'orange'),
    ].join('');

    const custInv = {};
    inv.filter(i=>i.customer_id).forEach(i => { custInv[i.customer_id] = (custInv[i.customer_id]||0)+(i.grand_total||0); });
    const custMap = {};
    custs.forEach(c => custMap[c.id] = c.name);
    const topCust = Object.entries(custInv).map(([id,rev])=>({name:custMap[id]||`#${id}`,rev})).sort((a,b)=>b.rev-a.rev).slice(0,10);
    if (topCust.length) makeChart('chartCustTop', {
      type:'bar', data: { labels:topCust.map(c=>c.name), datasets:[{ label:'Revenue', data:topCust.map(c=>c.rev), backgroundColor:COLORS.orangeA, borderColor:COLORS.orange, borderWidth:1, borderRadius:3 }] }
    });

    $('custTable').querySelector('tbody').innerHTML = custs.length
      ? custs.map(c => `<tr>
          <td><strong>${c.name||''}</strong></td><td>${c.phone||''}</td><td>${c.address||'-'}</td>
          <td>$${fmt(c.credit_limit)}</td><td><strong>$${fmt(c.balance)}</strong></td><td>${c.loyalty_points||0}</td>
          <td>${fmtDate(c.created_at)}</td>
        </tr>`).join('')
      : emptyMsg('No customers found');

    const sortedCredit = [...credit].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,100);
    $('creditTable').querySelector('tbody').innerHTML = sortedCredit.length
      ? sortedCredit.map(c => `<tr>
          <td>${custLookup[c.customer_id]||'#'+c.customer_id}</td>
          <td>${statusBadge(c.type)}</td><td>$${fmt(c.amount)}</td><td>$${fmt(c.balance_after)}</td>
          <td>${c.description||''}</td><td>${fmtDateTime(c.created_at)}</td>
        </tr>`).join('')
      : emptyMsg('No credit records found');
  } catch (e) { console.error('Customers error:', e); errorState('custStats', 'Failed to load customer data.'); }
}
