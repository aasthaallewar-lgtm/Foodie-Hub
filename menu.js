/* =====================================================================
   menu.js  -  FOOD MENU PAGE
   ---------------------------------------------------------------------
   1. Fetch all products from data/products.json (Fetch API)
   2. Search by food name (live, as the user types)
   3. Filter by category (Pizza, Burger, Chinese, South Indian, Beverages)
   4. Sort by price / rating / name
   5. Add to Cart (uses addToCart() from app.js)
   Depends on: app.js (fetchJSON, productCardHTML, attachAddToCart ...)
   ===================================================================== */

// Page state: all products + the currently selected search / filter / sort
let allProducts = [];
const state = {
  search: "",
  category: "All",
  sort: "default",
};

// DOM references
const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const filterContainer = document.getElementById("categoryFilters");
const resultInfo = document.getElementById("resultInfo");

/** Step 1: load products with the Fetch API and show a spinner meanwhile. */
async function loadProducts() {
  productGrid.innerHTML = spinnerHTML();
  try {
    allProducts = await fetchJSON("data/products.json");
    applyCategoryFromURL();          // e.g. menu.html?category=Pizza from footer links
    renderProducts();
  } catch (error) {
    console.error(error);
    productGrid.innerHTML = loadErrorHTML();
    resultInfo.textContent = "";
  }
}

/** Return products that match the current search text and category, sorted. */
function getFilteredProducts() {
  const searchText = state.search.toLowerCase();

  // filter() keeps only items for which the function returns true
  let result = allProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchText);
    const matchesCategory = state.category === "All" || product.category === state.category;
    return matchesSearch && matchesCategory;
  });

  // sort() on a copy so the original order is preserved for "Recommended"
  result = [...result];
  switch (state.sort) {
    case "price-asc":
      result.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      result.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      result.sort((a, b) => b.rating - a.rating);
      break;
    case "name":
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }
  return result;
}

/** Draw the product cards (DOM manipulation using innerHTML). */
function renderProducts() {
  const products = getFilteredProducts();

  if (products.length === 0) {
    productGrid.innerHTML = `
      <div class="empty-state">
        <div class="big-icon">🍽️</div>
        <h3>No dishes found</h3>
        <p>Try a different name or choose another category.</p>
        <button class="btn btn-outline" id="resetFilters">Reset Filters</button>
      </div>`;
    document.getElementById("resetFilters").addEventListener("click", resetFilters);
  } else {
    productGrid.innerHTML = products.map(productCardHTML).join("");
  }

  const categoryText = state.category === "All" ? "all categories" : state.category;
  resultInfo.textContent = `Showing ${products.length} of ${allProducts.length} dishes in ${categoryText}` +
    (state.search ? ` matching "${state.search}"` : "");
}

/** Mark the selected category button as active. */
function setActiveCategory(category) {
  state.category = category;
  filterContainer.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === category);
  });
}

/** Read ?category=... from the URL (used by the footer category links). */
function applyCategoryFromURL() {
  const category = new URLSearchParams(location.search).get("category");
  const exists = category && filterContainer.querySelector(`[data-category="${CSS.escape(category)}"]`);
  if (exists) setActiveCategory(category);
}

function resetFilters() {
  state.search = "";
  state.sort = "default";
  searchInput.value = "";
  sortSelect.value = "default";
  setActiveCategory("All");
  renderProducts();
}

/* ---------- EVENT HANDLING ---------- */

// Live search: re-render on every keystroke
searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.trim();
  renderProducts();
});

// Category filter buttons (event delegation on the container)
filterContainer.addEventListener("click", (event) => {
  const button = event.target.closest(".filter-btn");
  if (!button) return;
  setActiveCategory(button.dataset.category);
  renderProducts();
});

// Sort dropdown
sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderProducts();
});

// Add-to-cart buttons inside the grid (event delegation: one listener for all cards).
// addToCart() itself is defined in app.js.
productGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".add-to-cart");
  if (!button) return;
  const product = allProducts.find((p) => p.id === Number(button.dataset.id));
  if (product) addToCart(product);
});

// Start
loadProducts();
