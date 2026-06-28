/* ═══════════════════════════════════════════════════════════
   ASMIRE — Product Detail Page Controller (product.js)
   Renders Detail Information, Gallery Swapping, Selection
   ═══════════════════════════════════════════════════════════ */

let currentProduct = null;
let selectedSize = '';
let selectedColor = { name: '', hex: '' };
let selectedQuantity = 1;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.productsLoadedPromise) {
    await window.productsLoadedPromise;
  }
  initProduct();
  initAccordions();
  initReviews();
});

// Load product details from ID query parameter
function initProduct() {
  const urlParams = new URLSearchParams(window.location.search);
  const idParam = urlParams.get('id');
  const productId = parseInt(idParam, 10);

  if (isNaN(productId)) {
    showNotFound();
    return;
  }

  if (typeof PRODUCTS === 'undefined') {
    showNotFound();
    return;
  }

  currentProduct = PRODUCTS.find(p => p.id === productId);

  if (!currentProduct) {
    showNotFound();
    return;
  }

  // Set default variants
  selectedSize = currentProduct.sizes[0];
  selectedColor = { 
    name: currentProduct.colors[0].name, 
    hex: currentProduct.colors[0].hex 
  };

  // Render elements
  renderBreadcrumbs();
  renderGallery();
  renderProductInfo();
  renderRelatedProducts();
}

function showNotFound() {
  const container = document.getElementById('product-detail-container');
  if (container) {
    container.innerHTML = `
      <div class="no-results" style="grid-column: 1/-1; padding: var(--space-5xl) 0;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3>Product Not Found</h3>
        <p>The product you are looking for does not exist or has been removed from our catalog.</p>
        <a href="shop.html" class="btn btn-primary btn-sm" style="margin-top: var(--space-md);">Go to Shop</a>
      </div>
    `;
  }
}

// Render dynamic breadcrumbs
function renderBreadcrumbs() {
  const currentTitle = document.getElementById('breadcrumb-current');
  const currentLink = document.getElementById('breadcrumb-category');
  if (currentTitle) currentTitle.textContent = currentProduct.name;
  if (currentLink) {
    currentLink.textContent = currentProduct.category;
    currentLink.href = `shop.html?category=${currentProduct.category.toLowerCase()}`;
  }
}

// Render image gallery (main + thumbnail list)
function renderGallery() {
  const mainImg = document.getElementById('gallery-main-img');
  const thumbsContainer = document.getElementById('gallery-thumbs-container');
  
  if (!mainImg || !thumbsContainer) return;

  // Set primary main image
  mainImg.src = currentProduct.images[0] && (currentProduct.images[0].startsWith('http') || currentProduct.images[0].startsWith('data:image')) ? currentProduct.images[0] : `assets/images/${currentProduct.images[0]}`;
  mainImg.alt = currentProduct.name;
  mainImg.onerror = function() {
    this.src = `https://placehold.co/600x800/111111/FFFFFF/png?text=${encodeURIComponent(currentProduct.name)}`;
  };

  // Build thumbnails
  thumbsContainer.innerHTML = currentProduct.images.map((img, idx) => `
    <button class="thumb-wrapper ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="View product image ${idx+1}">
      <img src="${img && (img.startsWith('http') || img.startsWith('data:image')) ? img : `assets/images/${img}`}" alt="Thumbnail ${idx+1}" onerror="this.src='https://placehold.co/80x106/111111/FFFFFF/png?text=${idx+1}'">
    </button>
  `).join('');

  // Thumb clicks to swap main image
  thumbsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.thumb-wrapper');
    if (!btn) return;

    // Toggle active state
    thumbsContainer.querySelectorAll('.thumb-wrapper').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update main image source
    const index = parseInt(btn.dataset.index, 10);
    mainImg.src = currentProduct.images[index] && (currentProduct.images[index].startsWith('http') || currentProduct.images[index].startsWith('data:image')) ? currentProduct.images[index] : `assets/images/${currentProduct.images[index]}`;
  });
}

// Render specifications text and variant selectors
function renderProductInfo() {
  const categoryEl = document.getElementById('info-category');
  const nameEl = document.getElementById('info-name');
  const priceEl = document.getElementById('info-price');
  const descEl = document.getElementById('info-desc');

  const colorContainer = document.getElementById('color-variants-container');
  const sizeContainer = document.getElementById('size-variants-container');

  const colorValLabel = document.getElementById('selected-color-val');
  const sizeValLabel = document.getElementById('selected-size-val');

  if (categoryEl) categoryEl.textContent = currentProduct.category;
  if (nameEl) nameEl.textContent = currentProduct.name;
  if (priceEl) priceEl.textContent = `Rs. ${currentProduct.price.toLocaleString()}`;
  if (descEl) descEl.textContent = currentProduct.description;

  // Initialize selected text displays
  if (colorValLabel) colorValLabel.textContent = selectedColor.name;
  if (sizeValLabel) sizeValLabel.textContent = selectedSize;

  // Render Color Swatches
  if (colorContainer) {
    colorContainer.innerHTML = currentProduct.colors.map((color, idx) => `
      <button 
        class="color-variant-dot ${idx === 0 ? 'active' : ''}" 
        style="background-color: ${color.hex};" 
        title="${color.name}"
        data-color-name="${color.name}"
        data-color-hex="${color.hex}"
        aria-label="Select color ${color.name}"
      ></button>
    `).join('');

    colorContainer.addEventListener('click', (e) => {
      const dot = e.target.closest('.color-variant-dot');
      if (!dot) return;

      colorContainer.querySelectorAll('.color-variant-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');

      selectedColor.name = dot.dataset.colorName;
      selectedColor.hex = dot.dataset.colorHex;

      if (colorValLabel) colorValLabel.textContent = selectedColor.name;
    });
  }

  // Render Size Pills
  if (sizeContainer) {
    sizeContainer.innerHTML = currentProduct.sizes.map((size, idx) => `
      <button 
        class="size-btn ${idx === 0 ? 'active' : ''}" 
        data-size="${size}"
        aria-label="Select size ${size}"
      >${size}</button>
    `).join('');

    sizeContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.size-btn');
      if (!btn) return;

      sizeContainer.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      selectedSize = btn.dataset.size;
      if (sizeValLabel) sizeValLabel.textContent = selectedSize;
    });
  }

  // Setup quantity controls
  initQuantityControls();

  // Bind Add to Cart action button
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const buyNowBtn = document.getElementById('buy-now-btn');
  const qtyInput = document.getElementById('quantity-input');

  if (currentProduct.stock === 0) {
    if (addToCartBtn) {
      addToCartBtn.disabled = true;
      addToCartBtn.textContent = 'Out of Stock';
    }
    if (buyNowBtn) {
      buyNowBtn.disabled = true;
      buyNowBtn.textContent = 'Out of Stock';
      buyNowBtn.style.opacity = '0.5';
    }
    if (qtyInput) {
      qtyInput.disabled = true;
      qtyInput.value = 0;
      selectedQuantity = 0;
    }
  }

  if (addToCartBtn && currentProduct.stock > 0) {
    addToCartBtn.addEventListener('click', () => {
      if (typeof window.addToCart === 'function') {
        const added = window.addToCart(
          currentProduct.id, 
          selectedSize, 
          selectedColor.hex, 
          selectedColor.name, 
          selectedQuantity
        );
        if (added) {
          // Reset qty to 1
          selectedQuantity = 1;
          if (qtyInput) qtyInput.value = 1;
        }
      }
    });
  }

  // Bind Buy Now action button
  if (buyNowBtn && currentProduct.stock > 0) {
    buyNowBtn.addEventListener('click', () => {
      if (typeof window.addToCart === 'function') {
        const added = window.addToCart(
          currentProduct.id, 
          selectedSize, 
          selectedColor.hex, 
          selectedColor.name, 
          selectedQuantity
        );
        if (added) {
          // Redirect immediately to checkout
          window.location.href = 'checkout.html';
        }
      }
    });
  }
}

// Bind quantity clicks
function initQuantityControls() {
  const decBtn = document.getElementById('qty-dec');
  const incBtn = document.getElementById('qty-inc');
  const qtyInput = document.getElementById('quantity-input');

  if (!decBtn || !incBtn || !qtyInput) return;

  const maxStock = currentProduct.stock !== undefined ? currentProduct.stock : 999;

  decBtn.addEventListener('click', () => {
    if (selectedQuantity > 1) {
      selectedQuantity--;
      qtyInput.value = selectedQuantity;
    }
  });

  incBtn.addEventListener('click', () => {
    if (selectedQuantity < maxStock) {
      selectedQuantity++;
      qtyInput.value = selectedQuantity;
    } else if (typeof showToast === 'function') {
      showToast(`Only ${maxStock} items left in stock.`, 'error');
    }
  });

  qtyInput.addEventListener('change', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      val = 1;
    }
    if (val > maxStock) {
      val = maxStock;
      if (typeof showToast === 'function') {
        showToast(`Only ${maxStock} items left in stock.`, 'error');
      }
    }
    selectedQuantity = val;
    qtyInput.value = selectedQuantity;
  });
}

// Accordion Collapsible menus logic (shipping details, sizing etc)
function initAccordions() {
  const accordionContainer = document.querySelector('.info-accordion');
  if (!accordionContainer) return;

  accordionContainer.addEventListener('click', (e) => {
    const trigger = e.target.closest('.accordion-trigger');
    if (!trigger) return;

    const item = trigger.closest('.accordion-item');
    const isActive = item.classList.contains('active');

    // Close all other options first
    accordionContainer.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));

    // Toggle active state
    if (!isActive) {
      item.classList.add('active');
    }
  });
}

// Render related products from category
function renderRelatedProducts() {
  const container = document.getElementById('related-container');
  if (!container) return;

  if (typeof PRODUCTS === 'undefined') return;

  // Filter items in same category, exclude current product
  let related = PRODUCTS.filter(p => p.category === currentProduct.category && p.id !== currentProduct.id);

  // If not enough items in same category, pad with others
  if (related.length < 4) {
    const paddingItems = PRODUCTS.filter(p => p.id !== currentProduct.id && !related.some(r => r.id === p.id));
    related = [...related, ...paddingItems];
  }

  // Slice to 4
  related = related.slice(0, 4);

  container.innerHTML = related.map((product, idx) => {
    const swatches = product.colors.map(color => `
      <span class="color-dot" style="background-color: ${color.hex};" title="${color.name}"></span>
    `).join('');

    return `
      <article class="product-card reveal reveal-delay-${idx + 1}" data-product-id="${product.id}">
        <div class="product-card-image">
          <a href="product.html?id=${product.id}">
            <img src="${product.images && product.images[0] && (product.images[0].startsWith('http') || product.images[0].startsWith('data:image')) ? product.images[0] : `assets/images/${product.images[0]}`}" alt="${product.name}" onerror="this.src='https://placehold.co/400x533/111111/FFFFFF/png?text=${encodeURIComponent(product.name)}'">
          </a>
        </div>
        <div class="product-card-info">
          <div class="category">${product.category}</div>
          <a href="product.html?id=${product.id}">
            <h3>${product.name}</h3>
          </a>
          <div class="price">Rs. ${product.price.toLocaleString()}</div>
          <div class="product-card-colors">
            ${swatches}
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Re-run animation observers
  if (typeof initIntersectionObserver === 'function') {
    initIntersectionObserver();
  }
}

// Reviews System Logic
async function initReviews() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = parseInt(urlParams.get('id'), 10);
  if (isNaN(productId)) return;

  const reviewForm = document.getElementById('review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rating = document.getElementById('review-rating').value;
      const reviewer_name = document.getElementById('review-name').value.trim();
      const comment = document.getElementById('review-comment').value.trim();

      try {
        const res = await fetch(`/api/products/${productId}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating, reviewer_name, comment })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (typeof window.showToast === 'function') {
            window.showToast('Thank you! Review submitted successfully.', 'success');
          } else {
            alert('Review submitted successfully.');
          }
          reviewForm.reset();
          loadReviews(productId);
        } else {
          throw new Error(data.error || 'Failed to submit review');
        }
      } catch (err) {
        console.error(err);
        if (typeof window.showToast === 'function') {
          window.showToast(err.message || 'Error submitting review.', 'error');
        } else {
          alert('Error submitting review.');
        }
      }
    });
  }

  loadReviews(productId);
}

async function loadReviews(productId) {
  const listContainer = document.getElementById('reviews-list-container');
  const avgRatingVal = document.getElementById('avg-rating-val');
  const avgRatingStars = document.getElementById('avg-rating-stars');
  const reviewCountVal = document.getElementById('review-count-val');

  if (!listContainer) return;

  try {
    const res = await fetch(`/api/products/${productId}/reviews?_t=${Date.now()}`);
    if (!res.ok) throw new Error('Failed to fetch reviews');
    const reviews = await res.json();

    if (reviews.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: var(--space-xl) 0; color: var(--color-text-secondary);">
          <p>No reviews yet. Be the first to write a review for this product!</p>
        </div>
      `;
      if (avgRatingVal) avgRatingVal.textContent = '0.0';
      if (avgRatingStars) avgRatingStars.textContent = '☆☆☆☆☆';
      if (reviewCountVal) reviewCountVal.textContent = 'Based on 0 reviews';
      return;
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = (totalRating / reviews.length).toFixed(1);
    const starCount = Math.round(avg);
    const starsStr = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);

    if (avgRatingVal) avgRatingVal.textContent = avg;
    if (avgRatingStars) avgRatingStars.textContent = starsStr;
    if (reviewCountVal) reviewCountVal.textContent = `Based on ${reviews.length} review${reviews.length > 1 ? 's' : ''}`;

    // Render reviews list
    listContainer.innerHTML = reviews.map(r => {
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const dateStr = new Date(r.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return `
        <div style="background: var(--color-bg-elevated); border: 1px solid var(--color-border); padding: var(--space-lg); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: var(--space-xs); text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: var(--text-sm); font-weight: 600;">${r.reviewer_name}</strong>
            <span style="font-size: var(--text-xs); color: var(--color-text-muted);">${dateStr}</span>
          </div>
          <div style="color: var(--color-accent); font-size: var(--text-sm);">${stars}</div>
          <p style="font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.6; margin-top: var(--space-xs); white-space: pre-line;">${r.comment}</p>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading reviews:', err);
    listContainer.innerHTML = `
      <div style="text-align: center; padding: var(--space-xl) 0; color: var(--color-text-error);">
        <p>Failed to load reviews. Please refresh the page.</p>
      </div>
    `;
  }
}
