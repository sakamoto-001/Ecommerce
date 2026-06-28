/* ═══════════════════════════════════════════════════════════
   ASMIRE — Cart Page Controller (cart-page.js)
   Rendering Cart details, updating quantities, removing items
   ═══════════════════════════════════════════════════════════ */

let promoApplied = false;
let promoDiscount = 0; // percentage

document.addEventListener('DOMContentLoaded', async () => {
  if (window.productsLoadedPromise) {
    await window.productsLoadedPromise;
  }
  renderCartPage();
  initPromoCode();
});

// Render Cart view layout depending on state
function renderCartPage() {
  const container = document.getElementById('cart-page-container');
  if (!container) return;

  if (typeof getCart !== 'function') {
    container.innerHTML = `<p class="text-secondary" style="grid-column: 1/-1; text-align: center;">Cart utility is missing.</p>`;
    return;
  }

  const cart = getCart();

  if (cart.length === 0) {
    renderEmptyCart(container);
    return;
  }

  // Draw two column cart layout
  container.innerHTML = `
    <div class="cart-layout">
      <!-- Left side: items list -->
      <section class="cart-items-column" aria-label="Shopping Bag Items" id="cart-items-list">
        <!-- Rendered items go here -->
      </section>

      <!-- Right side: order details summary -->
      <aside class="summary-sidebar" aria-label="Order Summary">
        <h2>Order Summary</h2>
        
        <div class="summary-row">
          <span>Subtotal</span>
          <span id="summary-subtotal">Rs. 0</span>
        </div>

        <div class="summary-row" id="promo-row" style="display: none; color: var(--color-success);">
          <span>Promo Code Discount</span>
          <span id="summary-discount">-Rs. 0</span>
        </div>

        <div class="summary-row">
          <span>Shipping</span>
          <span id="summary-shipping">Rs. 0</span>
        </div>

        <div class="summary-row total">
          <span>Total</span>
          <span id="summary-total">Rs. 0</span>
        </div>

        <!-- Promo code input -->
        <div class="promo-container">
          <input type="text" id="promo-input" placeholder="Promo Code (ASMIRE10)" aria-label="Promo Code">
          <button id="promo-apply-btn">Apply</button>
        </div>

        <a href="checkout.html" class="btn btn-primary btn-block">Proceed to Checkout</a>
      </aside>
    </div>
  `;

  // Draw individual items
  renderCartItems(cart);
  // Calculate totals
  updateCartTotals();
  // Hook item quantity update buttons
  setupItemActions();
}

// Render empty visual
function renderEmptyCart(container) {
  container.innerHTML = `
    <div class="cart-empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
      </svg>
      <h2>Your Bag is Empty</h2>
      <p>Items you add to your shopping bag will appear here. Find something to get started.</p>
      <a href="shop.html" class="btn btn-primary">Shop Our Catalog</a>
    </div>
  `;
}

// Generate the HTML list of line items
function renderCartItems(cart) {
  const list = document.getElementById('cart-items-list');
  if (!list) return;

  list.innerHTML = cart.map(item => `
    <article class="cart-item" 
      data-id="${item.id}" 
      data-size="${item.selectedSize}" 
      data-color-hex="${item.selectedColor.hex}"
      data-color-name="${item.selectedColor.name}"
    >
      <div class="cart-item-image">
        <a href="product.html?id=${item.id}">
          <img src="${item.image && (item.image.startsWith('http') || item.image.startsWith('data:image')) ? item.image : `assets/images/${item.image}`}" alt="${item.name}" onerror="this.src='https://placehold.co/90x120/111111/FFFFFF/png?text=${encodeURIComponent(item.name)}'">
        </a>
      </div>
      <div class="cart-item-info">
        <a href="product.html?id=${item.id}">
          <h3>${item.name}</h3>
        </a>
        <div class="cart-item-details">
          <span>Size: <strong>${item.selectedSize}</strong></span>
          <span class="color-preview">
            Colour: 
            <span class="color-dot" style="background-color: ${item.selectedColor.hex};"></span> 
            <strong>${item.selectedColor.name}</strong>
          </span>
        </div>
        <div class="cart-item-qty-price">
          <!-- Quantity buttons -->
          <div class="qty-selector" style="height: 34px;">
            <button class="qty-btn qty-dec-btn" style="width: 30px;" aria-label="Decrease quantity">&minus;</button>
            <input type="number" class="qty-input item-qty-input" style="width: 30px; font-size: var(--text-sm);" value="${item.quantity}" min="1" aria-label="Quantity">
            <button class="qty-btn qty-inc-btn" style="width: 30px;" aria-label="Increase quantity">+</button>
          </div>
          <!-- Subtotal for item -->
          <div class="cart-item-price">Rs. ${(item.price * item.quantity).toLocaleString()}</div>
        </div>
      </div>

      <!-- Delete Button -->
      <button class="cart-item-remove-btn delete-btn" aria-label="Remove item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </article>
  `).join('');
}

// Calculate and update order summary prices
function updateCartTotals() {
  const subtotalEl = document.getElementById('summary-subtotal');
  const discountEl = document.getElementById('summary-discount');
  const promoRow = document.getElementById('promo-row');
  const shippingEl = document.getElementById('summary-shipping');
  const totalEl = document.getElementById('summary-total');

  if (!subtotalEl || !totalEl || !shippingEl) return;

  const subtotal = getCartTotal();
  subtotalEl.textContent = `Rs. ${subtotal.toLocaleString()}`;

  // Calculate promo discount
  let discountAmount = 0;
  if (promoApplied && promoDiscount > 0) {
    discountAmount = Math.round(subtotal * (promoDiscount / 100));
    discountEl.textContent = `-Rs. ${discountAmount.toLocaleString()}`;
    promoRow.style.display = 'flex';
  } else {
    promoRow.style.display = 'none';
  }

  // Calculate shipping (free for orders above Rs 5,000, else Rs 150)
  const shippingCharge = subtotal > 5000 ? 0 : 150;
  shippingEl.textContent = shippingCharge === 0 ? 'Free' : `Rs. ${shippingCharge.toLocaleString()}`;

  // Update total
  const finalTotal = subtotal - discountAmount + shippingCharge;
  totalEl.textContent = `Rs. ${finalTotal.toLocaleString()}`;
}

// Hook item interaction events (delegation)
function setupItemActions() {
  const list = document.getElementById('cart-items-list');
  if (!list) return;

  list.addEventListener('click', (e) => {
    const card = e.target.closest('.cart-item');
    if (!card) return;

    const id = parseInt(card.dataset.id, 10);
    const size = card.dataset.size;
    const colorHex = card.dataset.colorHex;

    // Delete item click
    if (e.target.closest('.delete-btn')) {
      if (typeof removeFromCart === 'function') {
        removeFromCart(id, size, colorHex);
        renderCartPage(); // Redraw list
      }
    }

    // Qty Increment click
    if (e.target.closest('.qty-inc-btn')) {
      const qtyInput = card.querySelector('.item-qty-input');
      const currentVal = parseInt(qtyInput.value, 10);
      const newVal = currentVal + 1;
      
      const product = window.PRODUCTS ? window.PRODUCTS.find(p => p.id === id) : null;
      const maxStock = product && product.stock !== undefined ? product.stock : 999;
      if (newVal > maxStock) {
        if (typeof showToast === 'function') {
          showToast(`Only ${maxStock} items left in stock.`, 'error');
        }
        return;
      }

      if (typeof updateCartQuantity === 'function') {
        updateCartQuantity(id, size, colorHex, newVal);
        qtyInput.value = newVal;
        updateItemSubtotal(card, id, newVal);
      }
    }

    // Qty Decrement click
    if (e.target.closest('.qty-dec-btn')) {
      const qtyInput = card.querySelector('.item-qty-input');
      const currentVal = parseInt(qtyInput.value, 10);
      const newVal = currentVal - 1;
      
      if (newVal >= 1) {
        if (typeof updateCartQuantity === 'function') {
          updateCartQuantity(id, size, colorHex, newVal);
          qtyInput.value = newVal;
          updateItemSubtotal(card, id, newVal);
        }
      } else {
        // Remove item if user decreases past 1
        if (typeof removeFromCart === 'function') {
          removeFromCart(id, size, colorHex);
          renderCartPage();
        }
      }
    }
  });

  // Handle direct keyboard inputs in quantity boxes
  list.addEventListener('change', (e) => {
    if (e.target.classList.contains('item-qty-input')) {
      const card = e.target.closest('.cart-item');
      if (!card) return;

      const id = parseInt(card.dataset.id, 10);
      const size = card.dataset.size;
      const colorHex = card.dataset.colorHex;
      
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1) {
        val = 1;
      }

      const product = window.PRODUCTS ? window.PRODUCTS.find(p => p.id === id) : null;
      const maxStock = product && product.stock !== undefined ? product.stock : 999;
      if (val > maxStock) {
        val = maxStock;
        if (typeof showToast === 'function') {
          showToast(`Only ${maxStock} items left in stock.`, 'error');
        }
      }

      if (typeof updateCartQuantity === 'function') {
        updateCartQuantity(id, size, colorHex, val);
        e.target.value = val;
        updateItemSubtotal(card, id, val);
      }
    }
  });
}

// Swap the subtotal label on card element directly to avoid full redraw
function updateItemSubtotal(cardEl, productId, newQty) {
  const priceDisplay = cardEl.querySelector('.cart-item-price');
  if (!priceDisplay) return;

  if (typeof getCart !== 'function') return;
  const cart = getCart();
  const size = cardEl.dataset.size;
  const colorHex = cardEl.dataset.colorHex;

  const item = cart.find(
    i => i.id === productId && i.selectedSize === size && i.selectedColor.hex === colorHex
  );
  if (!item) return;

  priceDisplay.textContent = `Rs. ${(item.price * newQty).toLocaleString()}`;
  updateCartTotals();
}

// Promo Code simulation details
function initPromoCode() {
  // Bind Apply Button click
  document.body.addEventListener('click', (e) => {
    if (e.target.id === 'promo-apply-btn') {
      applyPromo();
    }
  });

  // Keypress event
  document.body.addEventListener('keypress', (e) => {
    if (e.target.id === 'promo-input' && e.key === 'Enter') {
      applyPromo();
    }
  });
}

function applyPromo() {
  const input = document.getElementById('promo-input');
  if (!input) return;

  const code = input.value.trim().toUpperCase();

  if (code === '') return;

  if (code === 'ASMIRE10') {
    promoApplied = true;
    promoDiscount = 10;
    sessionStorage.setItem('asmire_promo_applied', 'true');
    if (typeof showToast === 'function') {
      showToast('Promo code applied successfully: 10% Off.', 'success');
    }
    updateCartTotals();
  } else {
    sessionStorage.setItem('asmire_promo_applied', 'false');
    if (typeof showToast === 'function') {
      showToast('Invalid promo code.', 'error');
    }
  }
}
