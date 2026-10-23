/* =====================================================================
   cart.js  -  CART PAGE
   ---------------------------------------------------------------------
   1. Show cart items stored in LocalStorage
   2. Increase / decrease quantity, remove item, clear cart
   3. Load coupons from data/coupons.json and validate the entered code
   4. Calculate Subtotal, Discount and Final Bill (calculateBill in app.js)
   ===================================================================== */

let coupons = [];   // filled from coupons.json

// DOM references
const emptyCartBox = document.getElementById("emptyCart");
const cartContent = document.getElementById("cartContent");
const cartItemsBox = document.getElementById("cartItems");
const itemCountEl = document.getElementById("itemCount");
const couponInput = document.getElementById("couponInput");
const couponMsg = document.getElementById("couponMsg");
const couponListBox = document.getElementById("couponList");

/** Render everything on the page from the current LocalStorage data. */
function renderCart() {
  const cart = getCart();

  // Toggle between "empty cart" message and the cart layout
  const isEmpty = cart.length === 0;
  emptyCartBox.classList.toggle("hidden", !isEmpty);
  cartContent.classList.toggle("hidden", isEmpty);
  if (isEmpty) {
    // An empty cart should not keep an old coupon
    localStorage.removeItem(STORAGE_KEYS.COUPON);
    return;
  }

  cartItemsBox.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-item" data-id="${item.id}">
        <img src="${item.image}" alt="${escapeHTML(item.name)}">
        <div>
          <h3>${escapeHTML(item.name)}</h3>
          <div class="unit-price">${formatPrice(item.price)} each</div>
          <button class="remove-btn" data-action="remove">Remove</button>
        </div>
        <div class="qty-control">
          <button data-action="decrease" aria-label="Decrease quantity">−</button>
          <span>${item.qty}</span>
          <button data-action="increase" aria-label="Increase quantity">+</button>
        </div>
        <div class="item-total">
          <strong>${formatPrice(item.price * item.qty)}</strong>
        </div>
      </div>`
    )
    .join("");

  renderBill();
}

/** Update subtotal / discount / total in the summary panel. */
function renderBill() {
  const cart = getCart();
  const coupon = getAppliedCoupon();
  const bill = calculateBill(cart, coupon);

  itemCountEl.textContent = bill.itemCount;
  document.getElementById("subtotal").textContent = formatPrice(bill.subtotal);
  document.getElementById("discount").textContent = "- " + formatPrice(bill.discount);
  document.getElementById("total").textContent = formatPrice(bill.total);
  document.getElementById("couponLabel").textContent = coupon ? `(${coupon.code})` : "";

  // If the cart value drops below the coupon's minimum, warn the user
  if (coupon && coupon.minOrder && bill.subtotal < coupon.minOrder) {
    setCouponMessage(`${coupon.code} needs a minimum order of ₹${coupon.minOrder}. Add more items.`, "error");
  } else if (coupon) {
    setCouponMessage(`🎉 ${coupon.code} applied! You saved ${formatPrice(bill.discount)}`, "success");
  }
}

/** Change quantity by +1 or -1. Quantity 0 removes the item. */
function changeQuantity(id, change) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  item.qty += change;
  if (item.qty <= 0) {
    removeItem(id);
    return;
  }
  saveCart(cart);
  renderCart();
}

/** Remove one product from the cart. */
function removeItem(id) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  saveCart(cart.filter((i) => i.id !== id));
  if (item) showToast(`${item.name} removed from cart`, "error");
  renderCart();
}

/* ---------- COUPONS ---------- */

async function loadCoupons() {
  try {
    coupons = await fetchJSON("data/coupons.json");
    couponListBox.innerHTML = coupons
      .map(
        (c) => `
        <div class="coupon-chip" data-code="${c.code}">
          <strong>${c.code}</strong>
          <span>${escapeHTML(c.description || "")}</span>
        </div>`
      )
      .join("");
  } catch (error) {
    console.error(error);
    couponListBox.innerHTML = `<p class="text-muted">Coupons unavailable (open the project through Live Server).</p>`;
  }
}

/**
 * Validate a coupon code:
 *   - must not be empty
 *   - must exist in coupons.json (case-insensitive)
 *   - subtotal must meet minOrder (if the coupon has one)
 */
function applyCoupon(rawCode) {
  const code = rawCode.trim().toUpperCase();

  if (!code) {
    setCouponMessage("Please enter a coupon code.", "error");
    return;
  }

  const coupon = coupons.find((c) => c.code.toUpperCase() === code);
  if (!coupon) {
    setCouponMessage(`"${code}" is not a valid coupon code.`, "error");
    showToast("Invalid coupon code", "error");
    return;
  }

  const { subtotal } = calculateBill(getCart(), null);
  if (coupon.minOrder && subtotal < coupon.minOrder) {
    setCouponMessage(`${coupon.code} is valid only on orders above ₹${coupon.minOrder}.`, "error");
    showToast("Minimum order value not reached", "error");
    return;
  }

  setStorage(STORAGE_KEYS.COUPON, coupon);   // remember coupon for checkout page
  couponInput.value = coupon.code;
  showToast(`Coupon ${coupon.code} applied`, "success");
  renderBill();
}

function setCouponMessage(text, type) {
  couponMsg.textContent = text;
  couponMsg.className = `coupon-msg ${type}`;
}

/* ---------- EVENT HANDLING ---------- */

// +, − and Remove buttons (event delegation)
cartItemsBox.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.closest(".cart-item").dataset.id);

  if (button.dataset.action === "increase") changeQuantity(id, 1);
  if (button.dataset.action === "decrease") changeQuantity(id, -1);
  if (button.dataset.action === "remove") removeItem(id);
});

document.getElementById("applyCouponBtn").addEventListener("click", () => applyCoupon(couponInput.value));

// Press Enter inside the coupon box
couponInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") applyCoupon(couponInput.value);
});

// Click a coupon from the list to apply it
couponListBox.addEventListener("click", (event) => {
  const chip = event.target.closest(".coupon-chip");
  if (chip) applyCoupon(chip.dataset.code);
});

document.getElementById("clearCartBtn").addEventListener("click", () => {
  if (confirm("Remove all items from your cart?")) {
    saveCart([]);
    localStorage.removeItem(STORAGE_KEYS.COUPON);
    showToast("Cart cleared", "info");
    renderCart();
  }
});

// Start: show saved coupon in the input, load coupons, render cart
const savedCoupon = getAppliedCoupon();
if (savedCoupon) couponInput.value = savedCoupon.code;
loadCoupons();
renderCart();
