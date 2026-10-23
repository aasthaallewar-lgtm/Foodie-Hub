/* =====================================================================
   checkout.js  -  CHECKOUT PAGE
   ---------------------------------------------------------------------
   1. Show a short order summary (cart + coupon from LocalStorage)
   2. Show extra fields for UPI / Card payment methods
   3. Validate the form with Regular Expressions
   4. Create the order object, save it in LocalStorage, clear the cart
      and redirect to order-summary.html
   ===================================================================== */

const form = document.getElementById("checkoutForm");
const upiFields = document.getElementById("upiFields");
const cardFields = document.getElementById("cardFields");

/* ---------- 1. ORDER SUMMARY SIDEBAR ---------- */
function renderCheckoutSummary() {
  const cart = getCart();

  // Nothing to check out -> send the user back to the menu
  if (cart.length === 0) {
    form.innerHTML = `
      <div class="panel empty-state" style="grid-column:1/-1">
        <div class="big-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add some dishes before checking out.</p>
        <a href="menu.html" class="btn btn-primary">Browse Menu</a>
      </div>`;
    return false;
  }

  const coupon = getAppliedCoupon();
  const bill = calculateBill(cart, coupon);

  document.getElementById("checkoutItems").innerHTML = cart
    .map(
      (item) => `
      <div class="mini-item">
        <span>${escapeHTML(item.name)} × ${item.qty}</span>
        <span>${formatPrice(item.price * item.qty)}</span>
      </div>`
    )
    .join("");

  document.getElementById("coSubtotal").textContent = formatPrice(bill.subtotal);
  document.getElementById("coDiscount").textContent = "- " + formatPrice(bill.discount);
  document.getElementById("coTotal").textContent = formatPrice(bill.total);
  document.getElementById("coCoupon").textContent = coupon && bill.discount > 0 ? `(${coupon.code})` : "";
  return true;
}

/* ---------- 2. PAYMENT METHOD SWITCH ---------- */
function getSelectedPayment() {
  return form.querySelector('input[name="payment"]:checked').value;
}

function updatePaymentFields() {
  const method = getSelectedPayment();
  upiFields.classList.toggle("hidden", method !== "UPI");
  cardFields.classList.toggle("hidden", !method.includes("Card"));
}

/* ---------- 3. VALIDATION ---------- */

// Regular expressions used for validation
const PATTERNS = {
  name: /^[A-Za-z][A-Za-z .]{2,49}$/,          // letters, spaces, dots; 3-50 chars
  mobile: /^[6-9]\d{9}$/,                       // Indian mobile: 10 digits, starts 6-9
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,       // simple email pattern
  upi: /^[\w.\-]{2,}@[A-Za-z]{2,}$/,            // e.g. rahul.s@okaxis
  card: /^\d{16}$/,                             // 16 digits (spaces removed first)
  expiry: /^(0[1-9]|1[0-2])\/\d{2}$/,           // MM/YY
  cvv: /^\d{3}$/,
};

/** Show or clear an error message under one input. Returns true if valid. */
function setFieldState(input, isValid, message) {
  const group = input.closest(".form-group");
  group.classList.toggle("invalid", !isValid);
  group.classList.toggle("valid", isValid);
  group.querySelector(".error-msg").textContent = isValid ? "" : message;
  return isValid;
}

/** Card expiry must be the current month or later. */
function isExpiryInFuture(value) {
  const [mm, yy] = value.split("/").map(Number);
  const now = new Date();
  const expiry = new Date(2000 + yy, mm);          // first day of the month AFTER expiry
  return expiry > now;
}

/** Each rule returns an error message, or "" when the value is valid. */
const RULES = {
  fullName: (v) =>
    !v ? "Full name is required" : !PATTERNS.name.test(v) ? "Enter a valid name (letters only, min 3)" : "",
  mobile: (v) =>
    !v ? "Mobile number is required" : !PATTERNS.mobile.test(v) ? "Enter a valid 10-digit mobile number starting with 6-9" : "",
  email: (v) => (!v ? "Email is required" : !PATTERNS.email.test(v) ? "Enter a valid email address" : ""),
  address: (v) => (!v ? "Delivery address is required" : v.length < 10 ? "Address must be at least 10 characters" : ""),
  upiId: (v) => (!v ? "UPI ID is required" : !PATTERNS.upi.test(v) ? "Enter a valid UPI ID (e.g. name@okbank)" : ""),
  cardNumber: (v) =>
    !v ? "Card number is required" : !PATTERNS.card.test(v.replace(/\s/g, "")) ? "Card number must be 16 digits" : "",
  cardExpiry: (v) =>
    !v ? "Expiry is required"
      : !PATTERNS.expiry.test(v) ? "Use MM/YY format"
      : !isExpiryInFuture(v) ? "This card has expired" : "",
  cardCvv: (v) => (!v ? "CVV is required" : !PATTERNS.cvv.test(v) ? "CVV must be 3 digits" : ""),
};

/** Validate a single field by id. */
function validateField(id) {
  const input = document.getElementById(id);
  const error = RULES[id](input.value.trim());
  return setFieldState(input, error === "", error);
}

/** Validate all fields required for the selected payment method. */
function validateForm() {
  const fields = ["fullName", "mobile", "email", "address"];
  const method = getSelectedPayment();
  if (method === "UPI") fields.push("upiId");
  if (method.includes("Card")) fields.push("cardNumber", "cardExpiry", "cardCvv");

  // map() first so EVERY field shows its error, then check all are valid
  const results = fields.map(validateField);
  const firstInvalid = fields.find((id, i) => !results[i]);
  if (firstInvalid) document.getElementById(firstInvalid).focus();
  return results.every(Boolean);
}

/* ---------- 4. PLACE ORDER ---------- */

/** Generate an order id like ORD-20261003-4821 */
function generateOrderId() {
  const d = new Date();
  const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${datePart}-${random}`;
}

function placeOrder() {
  const cart = getCart();
  const coupon = getAppliedCoupon();
  const bill = calculateBill(cart, coupon);
  const method = getSelectedPayment();

  // Only safe, masked payment info is saved - never the full card number or CVV
  let paymentDetail = "";
  if (method === "UPI") paymentDetail = document.getElementById("upiId").value.trim();
  if (method.includes("Card")) {
    const digits = document.getElementById("cardNumber").value.replace(/\s/g, "");
    paymentDetail = "XXXX XXXX XXXX " + digits.slice(-4);
  }

  const order = {
    orderId: generateOrderId(),
    date: new Date().toISOString(),
    customer: {
      name: document.getElementById("fullName").value.trim(),
      mobile: document.getElementById("mobile").value.trim(),
      email: document.getElementById("email").value.trim(),
      address: document.getElementById("address").value.trim(),
    },
    items: cart.map(({ id, name, price, qty, image }) => ({ id, name, price, qty, image })),
    subtotal: bill.subtotal,
    coupon: coupon && bill.discount > 0 ? coupon.code : null,
    discount: bill.discount,
    total: bill.total,
    payment: { method, detail: paymentDetail },
    status: "Order Placed",
  };

  // Save: newest order first
  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);
  setStorage(STORAGE_KEYS.LAST_ORDER, order.orderId);

  // Empty the cart and coupon after a successful order
  saveCart([]);
  localStorage.removeItem(STORAGE_KEYS.COUPON);

  window.location.href = `order-summary.html?id=${encodeURIComponent(order.orderId)}&new=1`;
}

/* ---------- EVENT HANDLING ---------- */
if (renderCheckoutSummary()) {
  // Show / hide UPI and card fields
  form.querySelectorAll('input[name="payment"]').forEach((radio) =>
    radio.addEventListener("change", updatePaymentFields)
  );

  // Validate a field when the user leaves it (blur)
  Object.keys(RULES).forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener("blur", () => {
      if (input.value.trim()) validateField(id);
    });
  });

  // Allow only digits in mobile / CVV, auto-format card number and expiry
  document.getElementById("mobile").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "");
  });
  document.getElementById("cardCvv").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "");
  });
  document.getElementById("cardNumber").addEventListener("input", (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
    e.target.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");     // "1234 5678 ..."
  });
  document.getElementById("cardExpiry").addEventListener("input", (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    e.target.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  });

  // Submit
  form.addEventListener("submit", (event) => {
    event.preventDefault();                 // stop the normal page reload
    if (!validateForm()) {
      showToast("Please correct the highlighted fields", "error");
      return;
    }
    const button = document.getElementById("placeOrderBtn");
    button.disabled = true;
    button.textContent = "Placing order...";
    showToast("Order placed successfully!", "success");
    setTimeout(placeOrder, 700);            // short delay so the user sees feedback
  });
}
