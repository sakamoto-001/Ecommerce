/* ═══════════════════════════════════════════════════════════
   ASMIRE — Home Page Controller (home.js)
   Hero Parallax, Render Featured/Trending Products
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.productsLoadedPromise) {
    await window.productsLoadedPromise;
  }
  initHeroParallax();
  renderTrendingProducts();
});

// Simple Parallax Effect for Hero
function initHeroParallax() {
  const heroBg = document.querySelector('.hero-bg');
  if (!heroBg) return;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    // Move background image slower than content scroll
    heroBg.style.transform = `translateY(${scrollY * 0.4}px)`;
  });
}

// Render Trending Products from database
function renderTrendingProducts() {
  const container = document.getElementById('trending-container');
  if (!container) return;

  // Verify PRODUCTS catalog exists
  if (typeof PRODUCTS === 'undefined') {
    container.innerHTML = `<p class="text-secondary" style="grid-column: 1/-1; text-align: center;">Unable to load catalog.</p>`;
    return;
  }

  // Get items marked isTrending (limit to 4 for clean layout)
  const trendingList = PRODUCTS.filter(p => p.isTrending).slice(0, 4);

  if (trendingList.length === 0) {
    container.innerHTML = `<p class="text-secondary" style="grid-column: 1/-1; text-align: center;">No trending items at this moment.</p>`;
    return;
  }

  container.innerHTML = trendingList.map((product, idx) => {
    // Generate color swatch bubbles
    const colorSwatches = product.colors.map((color, colorIdx) => `
      <span 
        class="color-dot ${colorIdx === 0 ? 'active' : ''}" 
        style="background-color: ${color.hex};" 
        title="${color.name}"
        data-color-name="${color.name}"
        data-color-hex="${color.hex}"
      ></span>
    `).join('');

    // Set badge code
    let badgeHtml = '';
    if (product.isNew) {
      badgeHtml = `<span class="product-card-badge badge-new">New</span>`;
    } else if (product.isTrending) {
      badgeHtml = `<span class="product-card-badge badge-trending">Trending</span>`;
    }

    return `
      <article class="product-card reveal reveal-delay-${(idx % 4) + 1}" data-product-id="${product.id}">
        ${badgeHtml}
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
            ${colorSwatches}
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Re-run Intersection Observer for dynamically added cards
  if (typeof initIntersectionObserver === 'function') {
    initIntersectionObserver();
  }

  // Setup Quick Add interactions
  setupQuickAdd();
}

// Setup click interactions on home page cards (swatches only)
function setupQuickAdd() {
  const container = document.getElementById('trending-container');
  if (!container) return;

  container.addEventListener('click', (e) => {
    // Color swatch click selection logic
    if (e.target.classList.contains('color-dot')) {
      e.preventDefault();
      e.stopPropagation();
      const dots = e.target.parentElement.querySelectorAll('.color-dot');
      dots.forEach(dot => dot.classList.remove('active'));
      e.target.classList.add('active');
    }
  });
}
