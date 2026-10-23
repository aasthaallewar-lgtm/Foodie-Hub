# Online Food Ordering System (FoodieHub)

Semester 3 Mini Project — a responsive food ordering website built with **HTML5, CSS3 and Vanilla JavaScript**.
Product and coupon data are stored in **JSON files**; the cart, coupon, orders and theme are stored in the browser's **LocalStorage**.
No backend, database, PHP, Node.js or framework is used.

## How to run

`fetch()` does not work when a page is opened directly as a file (`file://`), so serve the folder with any local web server:

- **VS Code (recommended):** install the *Live Server* extension → right-click `index.html` → **Open with Live Server**.
- **Python:** `python -m http.server 5500` in this folder → open <http://localhost:5500>.

## Folder structure

```
├── index.html            Home: hero banner, shop by category, featured foods, special offers
├── menu.html             Menu: products from JSON, search, category filter, sort
├── cart.html             Cart: quantity +/-, remove, coupon, bill summary
├── checkout.html         Checkout: customer form, payment options, validation
├── order-summary.html    Receipt of a placed order
├── orders.html           Order history (LocalStorage)
├── contact.html          Contact details + validated feedback form
├── css/style.css         All styles: theme variables, dark mode, Grid/Flexbox, animations, responsive
├── js/app.js             Shared: storage helpers, cart helpers, bill calculation, dark mode,
│                         mobile menu, toast, back-to-top, featured foods
├── js/menu.js            Fetch products, search, filter, sort, add to cart
├── js/cart.js            Render cart, quantity update, coupon validation
├── js/checkout.js        Form validation (RegEx), create & save order
├── js/orders.js          Order summary + order history pages
├── data/products.json    30 items (10 beverages) (id, name, category, description, price, image, veg, rating, featured)
├── data/coupons.json     SAVE10 (10%), FOOD20 (20%, min ₹499), WELCOME50 (flat ₹50, min ₹199)
├── data/orders.json      One sample order showing the saved order structure
└── images/               Real food photos (JPG) from Wikimedia Commons, saved locally so the
                          site works offline; see images/CREDITS.md for authors and licences
```

## LocalStorage keys

| Key | Holds |
| --- | --- |
| `fos_cart` | Array of cart items `{id, name, price, image, category, qty}` |
| `fos_coupon` | The applied coupon object |
| `fos_orders` | Array of placed orders (newest first) |
| `fos_last_order` | ID of the most recent order |
| `fos_theme` | `"light"` or `"dark"` |

To reset the demo: browser DevTools → Application → Local Storage → clear, or use **Clear Cart** / **Clear Order History** buttons.

## Test card / UPI values for the demo

- Mobile: any 10 digits starting with 6–9, e.g. `9876543210`
- UPI: `rahul@okaxis`
- Card: `4111 1111 1111 1111`, expiry in the future (e.g. `12/30`), CVV `123`
  Only the last 4 digits are saved; CVV is never stored.
