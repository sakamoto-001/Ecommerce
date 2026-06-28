/* ═══════════════════════════════════════════════════════════
   ASMIRE — Checkout Controller (checkout.js)
   Renders summary details, validates forms, redirects to eSewa
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initCheckout();
  initFormValidation();
  initPaymentMethodToggle();
});

// Render sidebar order details
function initCheckout() {
  const summaryList = document.getElementById('checkout-items-list');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const shippingEl = document.getElementById('checkout-shipping');
  const totalEl = document.getElementById('checkout-total');

  if (!summaryList || !subtotalEl || !shippingEl || !totalEl) return;

  if (typeof getCart !== 'function') return;

  const cart = getCart();

  if (cart.length === 0) {
    // If cart is empty, redirect back to cart page
    window.location.href = 'cart.html';
    return;
  }

  // Draw items
  summaryList.innerHTML = cart.map(item => `
    <div class="checkout-summary-item">
      <div class="checkout-summary-img">
        <img src="${item.image && (item.image.startsWith('http') || item.image.startsWith('data:image')) ? item.image : `assets/images/${item.image}`}" alt="${item.name}" onerror="this.src='https://placehold.co/50x66/111111/FFFFFF/png?text=${encodeURIComponent(item.name)}'">
      </div>
      <div class="checkout-summary-details">
        <div class="checkout-summary-name">${item.name}</div>
        <div class="checkout-summary-meta">Qty: ${item.quantity} | Size: ${item.selectedSize}</div>
      </div>
      <div class="checkout-summary-price">Rs. ${(item.price * item.quantity).toLocaleString()}</div>
    </div>
  `).join('');

  // Calculate totals
  const subtotal = getCartTotal();
  subtotalEl.textContent = `Rs. ${subtotal.toLocaleString()}`;

  // Shipping
  const shippingCharge = subtotal > 5000 ? 0 : 150;
  shippingEl.textContent = shippingCharge === 0 ? 'Free' : `Rs. ${shippingCharge.toLocaleString()}`;

  // Check if coupon discount is applied in cart-page context (stored in localStorage subtotal ratio or simply read from cart session)
  // Let's implement static promo code reading if we want to carry it over. We can check if `asmire_cart_discount` is stored.
  // For simplicity, we check if the user applied 'ASMIRE10' coupon by checking a short localStorage tag.
  let discountAmount = 0;
  const isPromoActive = sessionStorage.getItem('asmire_promo_applied') === 'true';
  const promoRow = document.getElementById('checkout-promo-row');
  const discountEl = document.getElementById('checkout-discount');

  if (isPromoActive && promoRow && discountEl) {
    discountAmount = Math.round(subtotal * 0.1);
    discountEl.textContent = `-Rs. ${discountAmount.toLocaleString()}`;
    promoRow.style.display = 'flex';
  }

  const finalTotal = subtotal - discountAmount + shippingCharge;
  totalEl.textContent = `Rs. ${finalTotal.toLocaleString()}`;

  // Set final pay button amount text
  const payBtnText = document.getElementById('pay-btn-amount');
  if (payBtnText) {
    payBtnText.textContent = `Rs. ${finalTotal.toLocaleString()}`;
  }

  // Pre-fill user info if logged in
  const userEmail = localStorage.getItem('userEmail');
  const userFullName = localStorage.getItem('userFullName');
  
  if (userEmail) {
    const emailInput = document.getElementById('email');
    if (emailInput && !emailInput.value) {
      emailInput.value = userEmail;
    }
  }
  if (userFullName) {
    const nameInput = document.getElementById('full-name');
    if (nameInput && !nameInput.value) {
      nameInput.value = userFullName;
    }
  }
}

// Payment method toggle — update button text and note
function initPaymentMethodToggle() {
  const radios = document.querySelectorAll('input[name="payment-method"]');
  const submitBtn = document.getElementById('checkout-submit-btn');
  const payBtnAmount = document.getElementById('pay-btn-amount');
  const note = document.getElementById('checkout-payment-note');
  const paymentCards = document.querySelectorAll('.payment-option-card');

  // Bind active class to card on selection
  paymentCards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (!radio) return;
    radio.addEventListener('change', () => {
      paymentCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      updateSubmitButton();
    });
  });

  function updateSubmitButton() {
    const selected = document.querySelector('input[name="payment-method"]:checked');
    if (!selected) return;
    const currentAmount = payBtnAmount ? payBtnAmount.textContent : 'Rs. 0';

    if (selected.value === 'cod') {
      if (submitBtn) submitBtn.innerHTML = `Place Order — Pay on Delivery (<span id="pay-btn-amount">${currentAmount}</span>)`;
      if (note) note.innerHTML = 'Your order will be confirmed and dispatched. A delivery agent will collect payment at your door within 2–4 business days.';
    } else {
      if (submitBtn) submitBtn.innerHTML = `Pay with eSewa (<span id="pay-btn-amount">${currentAmount}</span>)`;
      if (note) note.innerHTML = 'You will be redirected to the secure eSewa portal. Sandbox credentials: ID <code>9806800001</code> / password <code>Nepal@123</code>.';
    }
  }
}

// Field validation bindings
function initFormValidation() {
  const form = document.getElementById('shipping-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (validateForm()) {
      await processPayment();
    }
  });

  // Clear errors on input focus
  form.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      const group = input.closest('.form-group');
      if (group) group.classList.remove('has-error');
    });
  });
}

// Form validation criteria
function validateForm() {
  let isValid = true;

  const fields = [
    { id: 'full-name', label: 'Full Name' },
    { id: 'address', label: 'Address' },
    { id: 'city', label: 'City' },
    { id: 'phone', label: 'Phone Number', pattern: /^[0-9\-+\s]{7,15}$/ },
    { id: 'email', label: 'Email Address', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
  ];

  fields.forEach(field => {
    const input = document.getElementById(field.id);
    if (!input) return;

    const val = input.value.trim();
    const group = input.closest('.form-group');

    if (val === '') {
      setError(group, `${field.label} is required.`);
      isValid = false;
    } else if (field.pattern && !field.pattern.test(val)) {
      setError(group, `Please provide a valid ${field.label.toLowerCase()}.`);
      isValid = false;
    } else {
      if (group) group.classList.remove('has-error');
    }
  });

  return isValid;
}

function setError(groupEl, message) {
  if (!groupEl) return;
  groupEl.classList.add('has-error');
  const errorEl = groupEl.querySelector('.form-error');
  if (errorEl) errorEl.textContent = message;
}

// Post payment details to backend and submit eSewa forms / handle COD
async function processPayment() {
  const payBtn = document.getElementById('checkout-submit-btn');
  const originalText = payBtn.innerHTML;

  // Determine selected payment method
  const paymentMethodEl = document.querySelector('input[name="payment-method"]:checked');
  const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'esewa';
  const isCOD = paymentMethod === 'cod';

  try {
    // Show spinner loading status
    payBtn.disabled = true;
    payBtn.innerHTML = `
      <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation: spin 1s linear infinite; margin-right: 8px;">
        <circle cx="12" cy="12" r="10" stroke-dasharray="31.4" stroke-dashoffset="10"></circle>
      </svg>
      ${isCOD ? 'Placing Order...' : 'Redirecting to eSewa...'}
    `;

    // Extract values
    const fullName = document.getElementById('full-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const city = document.getElementById('city').value.trim();

    const subtotal = getCartTotal();
    const shippingCharge = subtotal > 5000 ? 0 : 150;
    
    let discountAmount = 0;
    const isPromoActive = sessionStorage.getItem('asmire_promo_applied') === 'true';
    if (isPromoActive) {
      discountAmount = Math.round(subtotal * 0.1);
    }
    
    const finalAmount = subtotal - discountAmount + shippingCharge;

    const payload = {
      amount: finalAmount,
      paymentMethod,
      cartItems: getCart(),
      shippingInfo: {
        fullName,
        email,
        phone,
        address,
        city
      }
    };

    // Post order request to server API endpoint
    const response = await fetch('/api/initiate-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to initiate payment.');
    }

    if (isCOD) {
      // COD: clear cart and redirect to success page
      if (typeof window.clearCart === 'function') window.clearCart();
      sessionStorage.removeItem('asmire_promo_applied');
      window.location.href = `success.html?uuid=${data.transactionUuid}&amount=${finalAmount}&method=cod`;
    } else {
      // eSewa: programmatic form redirect
      initiateEsewaFormRedirect(data.paymentUrl, data.paymentData);
    }

  } catch (error) {
    console.error('Checkout processing error:', error);
    if (typeof showToast === 'function') {
      showToast(error.message || 'Payment initiation failed. Please try again.', 'error');
    }
    payBtn.disabled = false;
    payBtn.innerHTML = originalText;
  }
}

// Programmatic post-redirect form generator
function initiateEsewaFormRedirect(paymentUrl, paymentData) {
  const form = document.createElement('form');
  form.action = paymentUrl;
  form.method = 'POST';

  for (const key in paymentData) {
    if (paymentData.hasOwnProperty(key)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = paymentData[key];
      form.appendChild(input);
    }
  }

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

// Add simple CSS spin keyframe helper if not present
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
