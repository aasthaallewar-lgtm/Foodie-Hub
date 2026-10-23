/* =====================================================================
   orders.js  -  ORDER SUMMARY + ORDER HISTORY PAGES
   ---------------------------------------------------------------------
   Used by two pages:
     - order-summary.html : receipt of one order (?id=ORDER_ID in URL)
     - orders.html        : list of all previous orders
   Orders come from LocalStorage ("fos_orders"). data/orders.json holds a
   sample order that shows the data structure and is listed as "Sample".
   ===================================================================== */

/** Load sample orders from orders.json (returns [] if it cannot be fetched). */
async function loadSampleOrders() {
  try {
    return await fetchJSON("data/orders.json");
  } catch (error) {
    console.warn("Sample orders not loaded:", error.message);
    return [];
  }
}

/** All orders: real ones from LocalStorage first, then samples. */
async function getAllOrders() {
  const saved = getOrders();
  const samples = await loadSampleOrders();
  return [...saved, ...samples];
}

/* ---------- ORDER SUMMARY PAGE ---------- */
async function renderOrderSummary(container) {
  const params = new URLSearchParams(location.search);
  const orderId = params.get("id") || getStorage(STORAGE_KEYS.LAST_ORDER, null);
  const orders = await getAllOrders();
  const order = orders.find((o) => o.orderId === orderId);

  if (!order) {
    container.innerHTML = `
      <div class="panel empty-state">
        <div class="big-icon">🧾</div>
        <h3>Order not found</h3>
        <p>We couldn't find that order in this browser.</p>
        <a href="menu.html" class="btn btn-primary">Order Something Tasty</a>
      </div>`;
    return;
  }

  const rows = order.items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHTML(item.name)}</td>
        <td class="num">${formatPrice(item.price)}</td>
        <td class="num">${item.qty}</td>
        <td class="num">${formatPrice(item.price * item.qty)}</td>
      </tr>`
    )
    .join("");

  // "new=1" is added by checkout.js only when the order was just placed
  const isNew = params.get("new") === "1";

  container.innerHTML = `
    <div class="success-banner">
      <div class="success-icon">✓</div>
      <h1>${isNew ? "Thank you! Your order has been placed." : "Order Details"}</h1>
      <p class="text-muted">${isNew ? "Your delicious food is being prepared 🍳" : ""}</p>
    </div>

    <div class="panel receipt">
      <div class="receipt-head">
        <div>
          <h4 class="text-muted">ORDER ID</h4>
          <h2>${escapeHTML(order.orderId)}</h2>
        </div>
        <div>
          <h4 class="text-muted">ORDER DATE</h4>
          <strong>${formatDate(order.date)}</strong>
        </div>
        <div>
          <h4 class="text-muted">STATUS</h4>
          <span class="status-badge">${escapeHTML(order.status)}</span>
        </div>
      </div>

      <div class="info-grid">
        <div>
          <h4>Customer</h4>
          <p><strong>${escapeHTML(order.customer.name)}</strong><br>
             📞 ${escapeHTML(order.customer.mobile)}<br>
             ✉️ ${escapeHTML(order.customer.email)}</p>
        </div>
        <div>
          <h4>Delivery Address</h4>
          <p>${escapeHTML(order.customer.address)}</p>
        </div>
        <div>
          <h4>Payment Method</h4>
          <p><strong>${escapeHTML(order.payment.method)}</strong><br>
             <span class="text-muted">${escapeHTML(order.payment.detail)}</span></p>
        </div>
      </div>

      <div class="table-wrap">
        <table class="order-table">
          <thead>
            <tr><th>#</th><th>Item</th><th class="num">Price</th><th class="num">Qty</th><th class="num">Amount</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="bill-box">
        <div class="summary-row"><span>Total Amount</span><span>${formatPrice(order.subtotal)}</span></div>
        <div class="summary-row discount"><span>Discount ${order.coupon ? `(${escapeHTML(order.coupon)})` : ""}</span><span>- ${formatPrice(order.discount)}</span></div>
        <div class="summary-row"><span>Delivery</span><span>FREE</span></div>
        <div class="summary-row total"><span>Final Bill</span><span>${formatPrice(order.total)}</span></div>
      </div>
    </div>

    <div class="receipt-actions">
      <button class="btn btn-outline" id="printBtn">🖨️ Print Receipt</button>
      <a href="orders.html" class="btn btn-outline">📋 My Orders</a>
      <a href="menu.html" class="btn btn-primary">🍕 Order More</a>
    </div>`;

  document.getElementById("printBtn").addEventListener("click", () => window.print());
}

/* ---------- ORDER HISTORY PAGE ---------- */
async function renderOrderHistory(list) {
  const orders = await getAllOrders();
  const realCount = orders.filter((o) => !o.sample).length;
  document.getElementById("ordersInfo").textContent =
    `You have placed ${realCount} order${realCount === 1 ? "" : "s"} from this browser.`;
  document.getElementById("clearOrdersBtn").classList.toggle("hidden", realCount === 0);

  if (orders.length === 0) {
    list.innerHTML = `
      <div class="panel empty-state">
        <div class="big-icon">📋</div>
        <h3>No orders yet</h3>
        <p>Your placed orders will appear here.</p>
        <a href="menu.html" class="btn btn-primary">Start Ordering</a>
      </div>`;
    return;
  }

  list.innerHTML = orders
    .map((order, index) => {
      const itemsText = order.items.map((i) => `${escapeHTML(i.name)} × ${i.qty}`).join(", ");
      const units = order.items.reduce((sum, i) => sum + i.qty, 0);
      return `
        <article class="order-card" style="animation-delay:${index * 0.05}s">
          <div class="order-card-head">
            <h3>${escapeHTML(order.orderId)}</h3>
            <span class="status-badge ${order.sample ? "sample" : ""}">
              ${order.sample ? "Sample (orders.json)" : escapeHTML(order.status)}
            </span>
          </div>
          <p class="text-muted">${formatDate(order.date)} · ${units} item${units === 1 ? "" : "s"} · ${escapeHTML(order.payment.method)}</p>
          <p class="order-card-items">${itemsText}</p>
          <div class="order-card-foot">
            <strong>Final Bill: ${formatPrice(order.total)}</strong>
            <a href="order-summary.html?id=${encodeURIComponent(order.orderId)}" class="btn btn-outline btn-sm">View Details</a>
          </div>
        </article>`;
    })
    .join("");
}

/* ---------- DECIDE WHICH PAGE WE ARE ON ---------- */
const summaryContainer = document.getElementById("orderSummary");
const historyList = document.getElementById("orderList");

if (summaryContainer) renderOrderSummary(summaryContainer);

if (historyList) {
  renderOrderHistory(historyList);

  document.getElementById("clearOrdersBtn").addEventListener("click", () => {
    if (confirm("Delete all your order history? This cannot be undone.")) {
      saveOrders([]);
      localStorage.removeItem(STORAGE_KEYS.LAST_ORDER);
      showToast("Order history cleared", "info");
      renderOrderHistory(historyList);
    }
  });
}
