/* ═══════════════════════════════════════════════════════════
   ASMIRE — Shop Page Controller (shop.js)
   Filtering, Sorting, and Dynamic Rendering
   ═══════════════════════════════════════════════════════════ */

// Filter state
const state = {
  categories: [],
  selectedSizes: [],
  maxPrice: 8000, // catalog max price
  sortBy: 'default'
};

document.addEventListener('DOMContentLoaded', async () => {
  if (window.productsLoadedPromise) {
    await window.productsLoadedPromise;
  }
  initUrlParams();
  initFilterControls();
  renderProducts();
});

// Parse category query parameter from URL
function initUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('category');
  if (catParam) {
    state.categories.push(catParam.toLowerCase());
    
    // Check corresponding checkbox
    const checkbox = document.querySelector(`.category-checkbox[value="${catParam.toLowerCase()}"]`);
    if (checkbox) {
      checkbox.checked = true;
    }
  }
}

// Bind event listeners to UI controls
function initFilterControls() {
  // Category Checkboxes
  const checkboxes = document.querySelectorAll('.category-checkbox');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        state.categories.push(cb.value);
      } else {
        state.categories = state.categories.filter(c => c !== cb.value);
      }
      renderProducts();
    });
  });

  // Size pills selection
  const sizePills = document.querySelectorAll('.size-pill');
  sizePills.forEach(pill => {
    pill.addEventListener('click', () => {
      const size = pill.dataset.size;
      pill.classList.toggle('active');
      
      if (pill.classList.contains('active')) {
        state.selectedSizes.push(size);
      } else {
        state.selectedSizes = state.selectedSizes.filter(s => s !== size);
      }
      renderProducts();
    });
  });

  // Price Slider input
  const priceSlider = document.getElementById('price-slider');
  const priceDisplay = document.getElementById('price-slider-val');
  if (priceSlider && priceDisplay) {
    priceSlider.addEventListener('input', (e) => {
      state.maxPrice = parseInt(e.target.value, 10);
      priceDisplay.textContent = `Rs. ${state.maxPrice.toLocaleString()}`;
    });
    // Render on slider release
    priceSlider.addEventListener('change', () => {
      renderProducts();
    });
  }

  // Sort Selection dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderProducts();
    });
  }

  // Clear All filter pills bar hook
  const pillsContainer = document.getElementById('active-filters-container');
  if (pillsContainer) {
    pillsContainer.addEventListener('click', (e) => {
      if (e.target.closest('.clear-filters-btn')) {
        clearAllFilters();
      } else if (e.target.closest('.filter-pill')) {
        const pill = e.target.closest('.filter-pill');
        removeFilterItem(pill.dataset.type, pill.dataset.value);
      }
    });
  }

  // Bind delegates to product grid (swatch clicks only — Quick Add removed)
  const grid = document.getElementById('shop-products-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      // Swatch bubbles — prevent navigating when clicking color dots
      if (e.target.classList.contains('color-dot')) {
        e.preventDefault();
        e.stopPropagation();
        const dots = e.target.parentElement.querySelectorAll('.color-dot');
        dots.forEach(d => d.classList.remove('active'));
        e.target.classList.add('active');
      }
    });
  }
}

// Clear all active filters
function clearAllFilters() {
  // Reset state variables
  state.categories = [];
  state.selectedSizes = [];
  state.maxPrice = 8000;
  
  // Update inputs
  document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
  document.querySelectorAll('.size-pill').forEach(pill => pill.classList.remove('active'));
  
  const priceSlider = document.getElementById('price-slider');
  const priceDisplay = document.getElementById('price-slider-val');
  if (priceSlider && priceDisplay) {
    priceSlider.value = 8000;
    priceDisplay.textContent = `Rs. 8,000`;
  }

  renderProducts();
}

// Remove one specific filter parameter
function removeFilterItem(type, value) {
  if (type === 'category') {
    state.categories = state.categories.filter(c => c !== value);
    const cb = document.querySelector(`.category-checkbox[value="${value}"]`);
    if (cb) cb.checked = false;
  } else if (type === 'size') {
    state.selectedSizes = state.selectedSizes.filter(s => s !== value);
    const pill = document.querySelector(`.size-pill[data-size="${value}"]`);
    if (pill) pill.classList.remove('active');
  } else if (type === 'price') {
    state.maxPrice = 8000;
    const priceSlider = document.getElementById('price-slider');
    const priceDisplay = document.getElementById('price-slider-val');
    if (priceSlider && priceDisplay) {
      priceSlider.value = 8000;
      priceDisplay.textContent = `Rs. 8,000`;
    }
  }
  renderProducts();
}

// Filter, Sort, and Draw products list to screen
function renderProducts() {
  const grid = document.getElementById('shop-products-grid');
  const countDisplay = document.getElementById('product-count-val');
  if (!grid) return;

  if (typeof PRODUCTS === 'undefined') {
    grid.innerHTML = `<div class="no-results"><h3>Catalog Missing</h3><p>Unable to load products database.</p></div>`;
    return;
  }

  // 1. FILTERING
  let filtered = PRODUCTS.filter(product => {
    // Category check
    if (state.categories.length > 0 && !state.categories.includes(product.category.toLowerCase())) {
      return false;
    }
    // Size check
    if (state.selectedSizes.length > 0) {
      const hasMatchingSize = product.sizes.some(s => state.selectedSizes.includes(s));
      if (!hasMatchingSize) return false;
    }
    // Price check
    if (product.price > state.maxPrice) {
      return false;
    }
    return true;
  });

  // 2. SORTING
  if (state.sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (state.sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Update product total summary statement
  if (countDisplay) {
    countDisplay.textContent = `Showing ${filtered.length} of ${PRODUCTS.length} products`;
  }

  // Draw active filter pill list
  renderActiveFilterPills();

  // 3. DRAW TO GRID
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <h3>No matches found</h3>
        <p>Try refining your filters or price selections to explore items.</p>
        <button class="btn btn-outline btn-sm" onclick="clearAllFilters()">Reset Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map((product, idx) => {
    const swatches = product.colors.map((color, cIdx) => `
      <span 
        class="color-dot ${cIdx === 0 ? 'active' : ''}" 
        style="background-color: ${color.hex};" 
        title="${color.name}"
        data-color-name="${color.name}"
        data-color-hex="${color.hex}"
      ></span>
    `).join('');

    let badgeHtml = '';
    if (product.isNew) {
      badgeHtml = `<span class="product-card-badge badge-new">New</span>`;
    } else if (product.isTrending) {
      badgeHtml = `<span class="product-card-badge badge-trending">Trending</span>`;
    }

    return `
      <article class="product-card reveal reveal-delay-${(idx % 3) + 1}" data-product-id="${product.id}">
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
            ${swatches}
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Re-trigger scroll reveal transitions
  if (typeof initIntersectionObserver === 'function') {
    initIntersectionObserver();
  }
}

// Generate the horizontal badge listings
function renderActiveFilterPills() {
  const container = document.getElementById('active-filters-container');
  if (!container) return;

  const pills = [];

  // Categorical pills
  state.categories.forEach(cat => {
    pills.push(`
      <div class="filter-pill" data-type="category" data-value="${cat}">
        Category: ${cat} <span>&times;</span>
      </div>
    `);
  });

  // Size pills
  state.selectedSizes.forEach(size => {
    pills.push(`
      <div class="filter-pill" data-type="size" data-value="${size}">
        Size: ${size} <span>&times;</span>
      </div>
    `);
  });

  // Price slider pill
  if (state.maxPrice < 8000) {
    pills.push(`
      <div class="filter-pill" data-type="price" data-value="${state.maxPrice}">
        Max Price: Rs. ${state.maxPrice.toLocaleString()} <span>&times;</span>
      </div>
    `);
  }

  // Draw container
  if (pills.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = pills.join('') + `<span class="clear-filters-btn">Clear All</span>`;
}

// Expose clear filters to dynamic onclick context
window.clearAllFilters = clearAllFilters;
