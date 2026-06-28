/* ═══════════════════════════════════════════════════════════
   ASMIRE — Cart Operations (localStorage-based)
   ═══════════════════════════════════════════════════════════ */

// Initialize Cart in LocalStorage
const CART_STORAGE_KEY = 'asmire_cart';

function getCart() {
  const cartJson = localStorage.getItem(CART_STORAGE_KEY);
  return cartJson ? JSON.parse(cartJson) : [];
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  // Dispatch custom event to notify other scripts of cart changes
  window.dispatchEvent(new Event('cartUpdated'));
}

// Add item to cart
function addToCart(productId, size, colorHex, colorName, quantity = 1) {
  // Ensure products database is loaded
  if (typeof PRODUCTS === 'undefined') {
    console.error('Products database not loaded.');
    return false;
  }

  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) {
    console.error('Product not found:', productId);
    return false;
  }

  const cart = getCart();
  
  // Find if identical product item (same id, size, and color) already in cart
  const existingItemIndex = cart.findIndex(
    item => item.id === productId && item.selectedSize === size && item.selectedColor.hex === colorHex
  );

  if (existingItemIndex > -1) {
    // Increment quantity
    cart[existingItemIndex].quantity += quantity;
  } else {
    // Add new item
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.images[0], // primary thumbnail
      selectedSize: size,
      selectedColor: {
        name: colorName,
        hex: colorHex
      },
      quantity: quantity
    });
  }

  saveCart(cart);
  showToast(`Added ${product.name} (${size}) to bag.`, 'success');
  return true;
}

// Update item quantity
function updateCartQuantity(productId, size, colorHex, newQuantity) {
  if (newQuantity <= 0) {
    return removeFromCart(productId, size, colorHex);
  }

  const cart = getCart();
  const itemIndex = cart.findIndex(
    item => item.id === productId && item.selectedSize === size && item.selectedColor.hex === colorHex
  );

  if (itemIndex > -1) {
    cart[itemIndex].quantity = parseInt(newQuantity, 10);
    saveCart(cart);
    return true;
  }
  return false;
}

// Remove item from cart
function removeFromCart(productId, size, colorHex) {
  let cart = getCart();
  const itemToRemove = cart.find(
    item => item.id === productId && item.selectedSize === size && item.selectedColor.hex === colorHex
  );
  
  cart = cart.filter(
    item => !(item.id === productId && item.selectedSize === size && item.selectedColor.hex === colorHex)
  );

  saveCart(cart);
  if (itemToRemove) {
    showToast(`Removed ${itemToRemove.name} from bag.`, 'info');
  }
  return true;
}

// Clear cart
function clearCart() {
  saveCart([]);
}

// Get total price
function getCartTotal() {
  const cart = getCart();
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Get total item count (for badge)
function getCartItemCount() {
  const cart = getCart();
  return cart.reduce((count, item) => count + item.quantity, 0);
}

// Toast Notifications Helper
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '🛍️';
  if (type === 'success') icon = '✨';
  if (type === 'error') icon = '❌';
  if (type === 'info') icon = 'ℹ️';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 3s
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    }, 400);
  }, 3000);
}

// Expose functions globally
if (typeof window !== 'undefined') {
  window.getCart = getCart;
  window.addToCart = addToCart;
  window.updateCartQuantity = updateCartQuantity;
  window.removeFromCart = removeFromCart;
  window.clearCart = clearCart;
  window.getCartTotal = getCartTotal;
  window.getCartItemCount = getCartItemCount;
  window.showToast = showToast;
}
