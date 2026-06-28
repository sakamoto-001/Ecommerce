// ASMIRE — Dynamic Product Catalog Loader
window.PRODUCTS = [];

window.productsLoadedPromise = fetch(`/api/products?_t=${Date.now()}`)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  })
  .then(data => {
    window.PRODUCTS = data;
    console.log(`Loaded ${data.length} products dynamically from Supabase.`);
    return data;
  })
  .catch(err => {
    console.error('Failed to load dynamic product catalog:', err);
    window.PRODUCTS = [];
    return [];
  });
