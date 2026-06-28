require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// ─── Supabase Clients ───────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Service-role client for server-side privileged operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// eSewa Config
const ESEWA_CONFIG = {
  merchantCode: process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST',
  secretKey: process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q',
  paymentUrl: process.env.ESEWA_PAYMENT_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
  statusUrl: process.env.ESEWA_STATUS_URL || 'https://rc-epay.esewa.com.np/api/epay/transaction/status/',
};

const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Order database configuration (legacy file-based, kept for eSewa flow)
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// In-memory order map for eSewa payment flow
const orders = new Map();

function loadOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const dataStr = fs.readFileSync(ORDERS_FILE, 'utf-8');
      const orderList = JSON.parse(dataStr);
      orderList.forEach(order => {
        orders.set(order.transactionUuid, order);
      });
      console.log(`Loaded ${orders.size} orders from local database.`);
    } else {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf-8');
      console.log('Initialized empty orders database.');
    }
  } catch (error) {
    console.error('Error loading orders database:', error);
  }
}

function saveOrders() {
  try {
    const orderList = Array.from(orders.values());
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orderList, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving orders database:', error);
  }
}

async function depleteStock(cartItems) {
  if (!cartItems || !Array.isArray(cartItems)) return;
  console.log(`Depleting stock for ${cartItems.length} items...`);
  for (const item of cartItems) {
    const productId = item.id;
    const quantity = parseInt(item.quantity, 10) || 1;
    if (!productId) continue;

    try {
      // Fetch current stock from Supabase
      const { data, error } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();

      if (error) {
        console.error(`Error fetching stock for product ${productId}:`, error);
        continue;
      }

      if (data) {
        const currentStock = parseInt(data.stock, 10) || 0;
        const newStock = Math.max(0, currentStock - quantity);

        // Update stock in Supabase
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', productId);

        if (updateError) {
          console.error(`Error updating stock for product ${productId}:`, updateError);
        } else {
          console.log(`Successfully depleted stock for product ${productId} (${item.name}) by ${quantity}. Old: ${currentStock}, New: ${newStock}`);
        }
      }
    } catch (err) {
      console.error(`Exception while depleting stock for product ${productId}:`, err);
    }
  }
}

loadOrders();

// Generate HMAC-SHA256 signature
function generateSignature(message) {
  return crypto
    .createHmac('sha256', ESEWA_CONFIG.secretKey)
    .update(message)
    .digest('base64');
}

// ─── Public API Routes ──────────────────────────────────────

// Get active products for storefront
app.get('/api/products', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const { category, search } = req.query;
    let query = supabase.from('products').select('*').eq('active', true);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Map DB fields to storefront format
    const products = (data || []).map(p => ({
      id: parseInt(p.id, 10),
      name: p.name,
      price: parseFloat(p.price) || 0,
      category: p.category || 'Tops',
      description: p.description || '',
      sizes: p.sizes && p.sizes.length ? p.sizes : ['M', 'L', 'XL'],
      colors: p.colors && p.colors.length ? p.colors : [{ name: 'Standard', hex: '#000000' }],
      images: p.images && p.images.length ? p.images : ['placeholder.jpg'],
      isTrending: !!p.is_trending,
      isNew: !!p.is_new,
      stock: parseInt(p.stock, 10) || 0
    }));

    res.json(products);
  } catch (err) {
    console.error('Public products fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Initiate eSewa payment
app.post('/api/initiate-payment', async (req, res) => {
  try {
    const { amount, cartItems, shippingInfo, paymentMethod = 'esewa' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Validate stock for all cart items
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    for (const item of cartItems) {
      const productId = item.id;
      const quantity = parseInt(item.quantity, 10) || 1;
      if (!productId) continue;

      const { data: product, error: pErr } = await supabase
        .from('products')
        .select('name, stock')
        .eq('id', productId)
        .single();

      if (pErr || !product) {
        return res.status(400).json({ error: `Product not found or unavailable: ${item.name}` });
      }

      if (product.stock < quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for "${product.name}". Only ${product.stock} items left.` 
        });
      }
    }

    const transactionUuid = uuidv4();
    const totalAmount = parseFloat(amount);
    const orderStatus = paymentMethod === 'cod' ? 'processing' : 'pending';

    // Store order locally
    const orderData = {
      transactionUuid,
      totalAmount,
      cartItems,
      shippingInfo,
      status: orderStatus,
      paymentMethod,
      createdAt: new Date().toISOString(),
    };
    orders.set(transactionUuid, orderData);
    saveOrders();

    // Also store in Supabase
    try {
      await supabase.from('orders').insert({
        transaction_uuid: transactionUuid,
        total_amount: totalAmount,
        cart_items: cartItems,
        shipping_info: { ...shippingInfo, paymentMethod },
        status: orderStatus,
        customer_name: shippingInfo?.fullName || shippingInfo?.name || '',
        customer_email: shippingInfo?.email || '',
      });
    } catch (sbErr) {
      console.error('Supabase order insert error:', sbErr);
    }

    if (paymentMethod === 'cod') {
      await depleteStock(cartItems);
      return res.json({ success: true, paymentMethod: 'cod', transactionUuid, totalAmount });
    }

    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_CONFIG.merchantCode}`;
    const signature = generateSignature(message);

    const paymentData = {
      amount: totalAmount,
      tax_amount: 0,
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: ESEWA_CONFIG.merchantCode,
      product_service_charge: 0,
      product_delivery_charge: 0,
      success_url: `${BASE_URL}/api/payment/success`,
      failure_url: `${BASE_URL}/api/payment/failure`,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature: signature,
    };

    res.json({ success: true, paymentMethod: 'esewa', paymentUrl: ESEWA_CONFIG.paymentUrl, paymentData });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// eSewa success callback
app.get('/api/payment/success', async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) return res.redirect('/failure.html?error=no_data');

    const decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
    const { transaction_uuid, total_amount, product_code } = decodedData;

    const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
    const expectedSignature = generateSignature(message);

    if (decodedData.signature !== expectedSignature) {
      console.error('Signature mismatch!');
      return res.redirect('/failure.html?error=signature_mismatch');
    }

    try {
      const verifyUrl = `${ESEWA_CONFIG.statusUrl}?product_code=${product_code}&total_amount=${total_amount}&transaction_uuid=${transaction_uuid}`;
      const verifyResponse = await fetch(verifyUrl);
      const verifyData = await verifyResponse.json();

      if (verifyData.status === 'COMPLETE') {
        const order = orders.get(transaction_uuid);
        if (order) {
          if (order.status !== 'completed') {
            await depleteStock(order.cartItems);
          }
          order.status = 'completed';
          order.paidAt = new Date().toISOString();
          order.esewaRef = decodedData.transaction_code || '';
          saveOrders();
        }
        // Update Supabase
        await supabase.from('orders').update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          esewa_ref: decodedData.transaction_code || '',
        }).eq('transaction_uuid', transaction_uuid);

        return res.redirect(`/success.html?uuid=${transaction_uuid}&amount=${total_amount}&ref=${decodedData.transaction_code || ''}`);
      }
    } catch (verifyError) {
      console.error('Verification API error:', verifyError);
    }

    const order = orders.get(transaction_uuid);
    if (order) {
      order.status = 'unverified';
      order.esewaRef = decodedData.transaction_code || '';
      saveOrders();
    }
    await supabase.from('orders').update({ status: 'unverified', esewa_ref: decodedData.transaction_code || '' }).eq('transaction_uuid', transaction_uuid);

    return res.redirect(`/success.html?uuid=${transaction_uuid}&amount=${total_amount}&status=unverified`);
  } catch (error) {
    console.error('Payment success handler error:', error);
    res.redirect('/failure.html?error=server_error');
  }
});

app.get('/api/payment/failure', (req, res) => {
  res.redirect('/failure.html?error=payment_failed');
});

app.get('/api/order/:uuid', (req, res) => {
  const order = orders.get(req.params.uuid);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// ─── Supabase Auth Middleware ────────────────────────────────

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '';

async function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Primary check: admin_users table
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!adminError && adminData) {
      req.user = user;
      return next();
    }

    // Fallback: match against ADMIN_EMAIL or ADMIN_USER_ID env vars
    // (used before the admin_users table is created in Supabase)
    if (ADMIN_EMAIL && user.email === ADMIN_EMAIL) {
      req.user = user;
      return next();
    }
    if (ADMIN_USER_ID && user.id === ADMIN_USER_ID) {
      req.user = user;
      return next();
    }

    return res.status(403).json({ error: 'Forbidden: Not an admin user' });
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication server error' });
  }
}

// ─── Admin API Routes ────────────────────────────────────────

// Dashboard stats
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const results = await Promise.allSettled([
      supabase.from('orders').select('id, total_amount, status, created_at, customer_email'),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('active', true),
    ]);

    const orderData = results[0].status === 'fulfilled' ? (results[0].value.data || []) : [];
    const productCount = results[1].status === 'fulfilled' ? (results[1].value.count || 0) : 0;

    const completedOrders = orderData.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const uniqueCustomers = new Set(orderData.map(o => o.customer_email).filter(Boolean)).size;

    // Revenue trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = orderData.filter(o => new Date(o.created_at) >= thirtyDaysAgo);

    const dailyRevenue = {};
    recentOrders.forEach(o => {
      const day = new Date(o.created_at).toISOString().split('T')[0];
      if (!dailyRevenue[day]) dailyRevenue[day] = { revenue: 0, orders: 0 };
      dailyRevenue[day].orders++;
      if (o.status === 'completed') dailyRevenue[day].revenue += parseFloat(o.total_amount || 0);
    });

    res.json({
      totalRevenue,
      totalOrders: orderData.length,
      activeProducts: productCount,
      totalCustomers: uniqueCustomers,
      revenueChart: dailyRevenue,
    });
  } catch (err) {
    console.error('Stats error:', err);
    // Return empty stats if tables don't exist yet
    res.json({ totalRevenue: 0, totalOrders: 0, activeProducts: 0, totalCustomers: 0, revenueChart: {} });
  }
});

// ── Orders ──
app.get('/api/admin/orders', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, from, to } = req.query;
    let query = supabase.from('orders').select('*', { count: 'exact' });

    if (status && status !== 'all') query = query.eq('status', status);
    if (search) query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.order('created_at', { ascending: false }).range(offset, offset + parseInt(limit) - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ orders: data || [], total: count || 0, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Orders fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.put('/api/admin/orders/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, order: data });
  } catch (err) {
    console.error('Order update error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// ── Categories ──
app.get('/api/admin/categories', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Categories fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/admin/categories', adminAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const { data, error } = await supabase.from('categories').insert({ name }).select().single();
    if (error) throw error;
    res.json({ success: true, category: data });
  } catch (err) {
    console.error('Category add error:', err);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

// ── Products ──
app.get('/api/admin/products', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, sort = 'created_at', order = 'desc' } = req.query;
    let query = supabase.from('products').select('*', { count: 'exact' });

    if (category && category !== 'all') query = query.eq('category', category);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.order(sort, { ascending: order === 'asc' }).range(offset, offset + parseInt(limit) - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ products: data || [], total: count || 0, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Products fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/admin/products', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').insert(req.body).select().single();
    if (error) throw error;
    res.json({ success: true, product: data });
  } catch (err) {
    console.error('Product add error:', err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

app.put('/api/admin/products/:id', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, product: data });
  } catch (err) {
    console.error('Product update error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/admin/products/:id', adminAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Product delete error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Bulk product actions
app.post('/api/admin/products/bulk', adminAuth, async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No product IDs provided' });

    if (action === 'delete') {
      const { error } = await supabase.from('products').delete().in('id', ids);
      if (error) throw error;
    } else if (action === 'activate') {
      const { error } = await supabase.from('products').update({ active: true }).in('id', ids);
      if (error) throw error;
    } else if (action === 'deactivate') {
      const { error } = await supabase.from('products').update({ active: false }).in('id', ids);
      if (error) throw error;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Bulk action error:', err);
    res.status(500).json({ error: 'Failed to perform bulk action' });
  }
});

// ── Settings ──
app.get('/api/admin/settings', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (error && error.code === 'PGRST116') {
      // No settings row, insert default
      const { data: newData, error: insertErr } = await supabase.from('settings').insert({
        id: 1, currency: 'NPR', tax_rate: 0, site_title: 'ASMIRE', meta_description: '', og_image: ''
      }).select().single();
      if (insertErr) throw insertErr;
      return res.json(newData);
    }
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Settings fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/admin/settings', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, settings: data });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Public settings endpoint (for storefront)
app.get('/api/settings', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const { data, error } = await supabase.from('settings').select('currency, tax_rate, site_title, meta_description, og_image').eq('id', 1).single();
    if (error) return res.json({ currency: 'NPR', tax_rate: 0, site_title: 'ASMIRE' });
    res.json(data);
  } catch (err) {
    res.json({ currency: 'NPR', tax_rate: 0, site_title: 'ASMIRE' });
  }
});

// ── Product Reviews ──
app.get('/api/products/:productId/reviews', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', req.params.productId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Reviews fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.post('/api/products/:productId/reviews', async (req, res) => {
  try {
    const { rating, reviewer_name, comment } = req.body;
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        product_id: parseInt(req.params.productId, 10),
        rating: parseInt(rating, 10),
        reviewer_name: reviewer_name || 'Anonymous',
        comment: comment || ''
      })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, review: data });
  } catch (err) {
    console.error('Review submission error:', err);
    res.status(500).json({ error: 'Failed to add review' });
  }
});


// ── Image Upload ──
app.post('/api/admin/upload', adminAuth, async (req, res) => {
  try {
    const { file, filename } = req.body;
    if (!file || !filename) return res.status(400).json({ error: 'File and filename are required' });

    // Decode base64 file
    const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = filename.split('.').pop();
    const storagePath = `products/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(storagePath, buffer, {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from('product-images')
      .getPublicUrl(storagePath);

    res.json({ success: true, url: publicUrl.publicUrl });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// ─── Serve Frontend ─────────────────────────────────────────

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start Server ───────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🛍️  ASMIRE server running at http://localhost:${PORT}`);
  console.log(`📦 eSewa Sandbox Mode: ${ESEWA_CONFIG.merchantCode}`);
  console.log(`🔐 Supabase connected: ${supabaseUrl ? 'Yes' : 'No'}`);
});
