/* =====================================================================
   app.js  -  SHARED SCRIPT (loaded on every page, before page scripts)
   ---------------------------------------------------------------------
   Responsibilities:
     1. LocalStorage helpers (cart, coupon, orders, theme)
     2. Utility helpers (currency format, fetch JSON, escape HTML)
     3. Cart helpers used by many pages (add item, count, bill calc)
     4. UI features: dark mode, mobile menu, toast, back-to-top,
        active nav link, scroll reveal animation
     5. Home page: render "Featured Foods" from products.json
   ===================================================================== */

/* ---------- 1. LOCAL STORAGE KEYS & HELPERS ---------- */
const STORAGE_KEYS = {
  CART: "fos_cart",          // array of cart items
  COUPON: "fos_coupon",      // applied coupon object (or null)
  ORDERS: "fos_orders",      // array of placed orders
  LAST_ORDER: "fos_last_order", // id of the most recent order
  THEME: "fos_theme",        // "light" | "dark"
};

/**
 * Read a value from LocalStorage and convert it from JSON text to a JS value.
 * Returns `fallback` if nothing is stored or the data is corrupted.
 */
function getStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn("Could not read", key, error);
    return fallback;
  }
}

/** Convert a JS value to JSON text and save it in LocalStorage. */
function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Could not save", key, error);
  }
}

/* Short-hand helpers for the cart and orders */
const getCart = () => getStorage(STORAGE_KEYS.CART, []);
const saveCart = (cart) => {
  setStorage(STORAGE_KEYS.CART, cart);
  updateCartCount();                     // keep navbar badge in sync
};
const getOrders = () => getStorage(STORAGE_KEYS.ORDERS, []);
const saveOrders = (orders) => setStorage(STORAGE_KEYS.ORDERS, orders);
const getAppliedCoupon = () => getStorage(STORAGE_KEYS.COUPON, null);

/* ---------- 2. UTILITIES ---------- */

/** Format a number as Indian Rupees, e.g. 1234.5 -> "₹1,234.50" */
function formatPrice(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Round to 2 decimal places (avoids floating point issues like 0.1 + 0.2). */
function round2(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Load a JSON file using the Fetch API.
 * NOTE: browsers block fetch() on file:// URLs, so the project must be opened
 * through a local server (e.g. VS Code "Live Server").
 */
async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (HTTP ${response.status})`);
  }
  return response.json();
}

/** Escape text before inserting into innerHTML (prevents HTML injection / XSS). */
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

/** Format an ISO date string as "03 Oct 2026, 09:15 PM". */
function formatDate(isoString) {
  return new Date(isoString).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Spinner markup shown while data is loading. */
function spinnerHTML(message = "Loading delicious food...") {
  return `<div class="spinner-wrap"><div class="spinner"></div><p>${message}</p></div>`;
}

/** Friendly error shown when JSON cannot be fetched. */
function loadErrorHTML() {
  return `
    <div class="empty-state">
      <div class="big-icon">⚠️</div>
      <h3>Could not load the menu</h3>
      <p>Please open this project using a local server such as
         <strong>VS Code &rarr; Live Server</strong>.<br>
         Browsers block <code>fetch()</code> when a page is opened directly as a file.</p>
    </div>`;
}

/* ---------- 3. CART HELPERS ---------- */

/**
 * Add a product to the cart. If it already exists, increase quantity.
 * @param {Object} product - product object from products.json
 */
function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      qty: 1,
    });
  }

  saveCart(cart);
  showToast(`${product.name} added to cart`, "success");
}

/** Total number of units in the cart (sum of quantities). */
function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

/** Update the small number badge on the cart icon in the navbar. */
function updateCartCount() {
  const badge = document.getElementById("cartCount");
  if (!badge) return;
  badge.textContent = getCartCount();
  badge.classList.remove("bump");
  void badge.offsetWidth;            // restart CSS animation
  badge.classList.add("bump");
}

/**
 * Calculate the coupon discount for a given subtotal.
 * Supports percentage coupons ("discount") and flat coupons ("discountFlat").
 */
function calculateDiscount(subtotal, coupon) {
  if (!coupon) return 0;
  if (coupon.minOrder && subtotal < coupon.minOrder) return 0;

  let discount = 0;
  if (coupon.discount) {
    discount = (subtotal * coupon.discount) / 100;   // percentage
  } else if (coupon.discountFlat) {
    discount = coupon.discountFlat;                  // flat amount
  }
  return round2(Math.min(discount, subtotal));       // never below ₹0
}

/**
 * Calculate the complete bill for the cart.
 * Returns { subtotal, discount, total, itemCount }.
 */
function calculateBill(cart, coupon) {
  const subtotal = round2(cart.reduce((sum, item) => sum + item.price * item.qty, 0));
  const discount = calculateDiscount(subtotal, coupon);
  const total = round2(subtotal - discount);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  return { subtotal, discount, total, itemCount };
}

/** Build one product card (used on Home "Featured" and the Menu page). */
function productCardHTML(product, index = 0) {
  return `
    <article class="product-card" style="animation-delay:${index * 0.05}s">
      <div class="product-img">
        <img src="${product.image}" alt="${escapeHTML(product.name)}" loading="lazy">
        <span class="badge">${escapeHTML(product.category)}</span>
        <span class="veg-mark ${product.veg ? "" : "nonveg"}"
              title="${product.veg ? "Vegetarian" : "Non-Vegetarian"}"></span>
      </div>
      <div class="product-body">
        <div class="product-meta">
          <span>${escapeHTML(product.category)}</span>
          <span>⭐ ${product.rating ?? "-"}</span>
        </div>
        <h3>${escapeHTML(product.name)}</h3>
        <p class="product-desc">${escapeHTML(product.description)}</p>
        <div class="product-footer">
          <span class="price">₹${product.price}</span>
          <button class="btn btn-primary btn-sm add-to-cart" data-id="${product.id}">
            🛒 Add to Cart
          </button>
        </div>
      </div>
    </article>`;
}

/**
 * Event delegation: one click listener on the grid handles every
 * "Add to Cart" button inside it (even ones added later).
 */
function attachAddToCart(gridElement, products) {
  gridElement.addEventListener("click", (event) => {
    const button = event.target.closest(".add-to-cart");
    if (!button) return;
    const product = products.find((p) => p.id === Number(button.dataset.id));
    if (product) addToCart(product);
  });
}

/* ---------- 4. UI FEATURES ---------- */

/** Toast notification (small message box in the corner). */
function showToast(message, type = "success") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", "status");
  toast.innerHTML = `<span>${icons[type] || ""}</span><span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  // Hide after 2.5 s, then remove from the DOM once the animation ends
  setTimeout(() => {
    toast.classList.add("hide");
    toast.addEventListener("animationend", () => toast.remove());
  }, 2500);
}

/** Dark mode: apply saved theme and handle the toggle button. */
function initTheme() {
  const saved = getStorage(STORAGE_KEYS.THEME, null);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);

  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      setStorage(STORAGE_KEYS.THEME, next);
      showToast(`${next === "dark" ? "Dark" : "Light"} mode enabled`, "info");
    });
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.textContent = theme === "dark" ? "☀️" : "🌙";
    toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
}

/** Responsive hamburger menu for small screens. */
function initMobileMenu() {
  const toggle = document.getElementById("menuToggle");
  const links = document.getElementById("navLinks");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.textContent = isOpen ? "✕" : "☰";
    toggle.setAttribute("aria-expanded", isOpen);
  });

  // Close menu after clicking a link
  links.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.textContent = "☰";
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

/** Highlight the nav link of the current page. */
function highlightActiveLink() {
  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((link) => {
    if (link.getAttribute("href") === page) link.classList.add("active");
  });
}

/** Back-to-top button appears after scrolling 400px. */
function initBackToTop() {
  const button = document.getElementById("backToTop");
  if (!button) return;

  window.addEventListener("scroll", () => {
    button.classList.toggle("show", window.scrollY > 400);
  });
  button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/** Fade-in elements with class "reveal" when they scroll into view. */
function initScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((el) => observer.observe(el));
}

/** Click a coupon code on the Home page to copy it. */
function initCouponCopy() {
  document.querySelectorAll(".coupon-code").forEach((el) => {
    el.addEventListener("click", async () => {
      const code = el.dataset.code;
      try {
        await navigator.clipboard.writeText(code);
        showToast(`Coupon ${code} copied! Apply it in your cart.`, "info");
      } catch {
        showToast(`Use coupon ${code} in your cart`, "info");
      }
    });
  });
}

/* ---------- 5. HOME PAGE: FEATURED FOODS ---------- */
async function loadFeaturedFoods() {
  const grid = document.getElementById("featuredGrid");
  if (!grid) return;                     // not on the home page

  grid.innerHTML = spinnerHTML();
  try {
    const products = await fetchJSON("data/products.json");
    const featured = products.filter((p) => p.featured);
    grid.innerHTML = featured.map(productCardHTML).join("");
    attachAddToCart(grid, products);
  } catch (error) {
    console.error(error);
    grid.innerHTML = loadErrorHTML();
  }
}

/* ---------- INITIALISE ON EVERY PAGE ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initMobileMenu();
  highlightActiveLink();
  initBackToTop();
  initScrollReveal();
  initCouponCopy();
  updateCartCount();
  loadFeaturedFoods();

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
