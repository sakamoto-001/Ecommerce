You are building a production-grade, fully functional e-commerce platform optimized for Nepal. The tech stack is strictly: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Supabase (Auth + Database + Storage), and eSewa for payment integrations. The project must be deployable to Vercel with zero configuration or building errors.

CRITICAL ARCHITECTURAL REQUIREMENT: You must strictly adhere to Next.js 14 App Router boundaries. All UI components using Framer Motion, React state, React Context, or event listeners (onClick, onChange) MUST be marked explicitly with the "use client" directive at the very top of the file to prevent server-side rendering crashes.

This is NOT a template or mockup. Every feature must be wired to Supabase and fully functional with clean error handling.

---

## SECTION 1 — UI DESIGN SYSTEM & UTILITIES (HIGHEST PRIORITY)

### Typography
- Use Inter for body text and a premium serif font (Playfair Display or DM Serif Display) for hero headings and product titles.
- Font sizes: Hero headings 56–72px, Section headings 36–44px, Product titles 18–22px, Body text 15–16px, Captions/labels 12–13px in uppercase tracked-out (letter-spacing: 0.1em).
- Line height: 1.2 for headings, 1.6 for body text. Never use default line heights.

### Color Palette
- Primary background: #FAFAFA (warm off-white). Secondary background: #F5F5F0 (cream).
- Primary text: #1A1A1A. Secondary text: #6B6B6B.
- Accent color: #2563EB (deep blue) — used only for CTAs, links, and active states.
- Destructive/sale: #DC2626. Success: #16A34A.
- All cards and containers must use background #FFFFFF with a subtle border (border: 1px solid rgba(0,0,0,0.06)) and a refined shadow (shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)).

### Spacing & Layout
- Use an 8px grid system. All padding, margins, and gaps must be multiples of 8 (8, 16, 24, 32, 48, 64, 80, 120).
- Maximum content width: 1440px, centered. Horizontal page padding: 64px on desktop, 24px on mobile.
- Section vertical padding: 80–120px. Never less than 64px between major sections.
- Product grid: 4 columns on desktop, 2 on mobile. Grid gap: 24px. No masonry layouts.

### Currency Formatting
- Default currency is Nepalese Rupees (NPR). All pricing must render using a robust local formatting helper: `Rs. ${price.toLocaleString('en-NP')}`.

### Micro-Interactions & Animations (Framer Motion - Client Side Only)
Every interaction must feel tactile and premium. Implement all of the following:
1. Page transitions: Wrap pages in AnimatePresence. Pages fade in (opacity 0→1) and slide up (y: 20→0) over 0.4s with ease [0.25, 0.1, 0.25, 1].
2. Product card hover: On hover, the product image scales to 1.05 over 0.5s with cubic-bezier(0.4, 0, 0.2, 1). A secondary lifestyle image crossfades in (opacity swap). The "Quick Add" button slides up from below the card (y: 20→0, opacity 0→1) with a staggered 0.1s delay.
3. Add-to-cart effect: When a user clicks "Add to Cart", animate a ghost image of the product (position: fixed, cloned from the product image) that flies in a bezier arc toward the cart icon in the header. Use Framer Motion's useAnimation controller. Simultaneously, the cart icon should do a spring bounce (scale 1→1.3→1, type: "spring", stiffness: 400).
4. Button interactions: All buttons scale to 0.97 on press (whileTap), have a 0.2s background-color transition on hover. Primary CTA buttons have a subtle shimmer/gradient sweep animation on hover.
5. Scroll-triggered reveals: Every section, product card, and text block should animate in on scroll using Framer Motion's whileInView. Use staggerChildren: 0.08 for grid items. Animation: fade up (opacity 0→1, y: 30→0) over 0.6s.
6. Cart drawer: Opens from the right as a slide-over panel (x: 100%→0) with a backdrop blur overlay that fades in. Cart items inside stagger in. Removing an item should animate it out (opacity→0, height→0, x→50) before state removal.
7. Skeleton loading states: Every dynamic content area must show animated skeleton placeholders (shimmer gradient animation using CSS background-position) before data loads. Never show blank space or layout shift.
8. Toast notifications: Slide in from top-right, auto-dismiss after 3s with a shrinking progress bar at the bottom. Entrance: slide from right + fade. Exit: slide to right + fade.

### Component Quality Rules
- All images must use next/image with proper aspect ratios, priority loading for above-fold, and explicit width/height or fill layouts to prevent layout shifts.
- Inputs must have floating labels that animate up on focus (not placeholder text).
- Mobile responsiveness is mandatory. Test every component at 375px, 768px, and 1440px widths.

---

## SECTION 2 — STOREFRONT PAGES & FEATURES

### Homepage
- Hero Section: Full-width lifestyle image with overlay text. Animated headline with word-by-word stagger reveal. CTA button with shimmer effect. Auto-rotating carousel of 3–4 hero slides with progress indicators.
- Featured Categories: Horizontal scrollable row of category cards with hover zoom on images.
- New Arrivals: Product grid (4 columns) with "NEW" badge animation (pulse). Pulled from Supabase, filtered by created_at descending.
- Best Sellers: Product grid sorted by total orders count from Supabase.
- Newsletter Signup: Email input with animated submit button. Store submissions in Supabase "subscribers" table.

### Product Listing Page (PLP)
- Filters sidebar (desktop) / bottom sheet (mobile): Filter by category, price range (dual-thumb slider), color, size, availability. All filters query Supabase in real-time with URL search params for shareable filtered URLs.
- Sort dropdown: Price low-high, high-low, newest, best-selling.
- Product count and active filter chips with remove (×) animation.

### Product Detail Page (PDP)
- Image gallery: Large main image on left. Thumbnail strip below or to the side. Click to swap with crossfade. Support for 5+ images. Zoom on hover (desktop).
- Product info: Title (serif font), price (Rs. formatted, with strikethrough for sale), star rating, short description, SKU.
- Variant selectors: Color swatches (circles with checkmark animation on select), size selector (pill buttons with out-of-stock shown as crossed out and disabled).
- Quantity selector: Styled increment/decrement with min 1 and max = stock count.
- Add to Cart button: Full-width, large, with the flying-image animation described above. Disable and show "Out of Stock" when stock = 0.
- Customer Reviews section: Star breakdown bar chart, individual review cards with verified badge, pagination. Submit review form.

### Cart Page / Cart Drawer
- Slide-over drawer from the right (primary interaction) + dedicated /cart page.
- Order summary: Subtotal, discount, estimated shipping, tax, total. All calculated properly in NPR.
- Coupon/promo code input with "Apply" button. Validate against Supabase "coupons" table.

### Checkout Page & eSewa Integration
- Multi-step checkout: Shipping → Payment → Review. Animated step indicator with progress bar.
- Shipping form: Name, email, phone (validated for Nepalese mobile formats: 98xxxxxxxx / 97xxxxxxxx), city, district/zone, specific delivery address.
- Payment Selector: Radio cards displaying payment methods:
  1. eSewa (Primary)
  2. Cash on Delivery (COD)
- Place Order & eSewa Redirect Logic:
  - When eSewa is chosen and "Place Order" is clicked, create an entry in the Supabase `orders` table with a state of `payment_status = 'pending'`.
  - Dynamically generate an eSewa signature hash on a secure server-side route using the parameters required by eSewa (Amount, Tax Amount, Service Charge, Delivery Charge, Total Amount, Product Code, Success URL, Failure URL) via HMAC-SHA256 signature algorithm.
  - Return the parameters and hash to the client side, then auto-submit a hidden form pointing directly to eSewa's payment gateway (`https://rc-epay.esewa.com.np/api/epay/main/v2/form` for development/UAT or the live production endpoint).
  - Provide a clean success validation handler route (`/checkout/success`) that reads eSewa's returned data parameter string, decodes it, and verifies the response server-side before updating the Supabase database to `payment_status = 'paid'`.

### Order Confirmation Page
- Animated checkmark (SVG path draw animation).
- Order number, summary, estimated delivery.

### User Account Pages (Supabase Auth)
- Sign Up / Sign In: Use Supabase Auth with email+password. Styled modal or dedicated page with smooth tab transition.
- My Account Dashboard: Welcome message, recent orders, saved addresses.
- Order History: Table/card list of past orders with status badges (color-coded: pending=yellow, processing=blue, delivered=green, cancelled=red).

---

## SECTION 3 — ADMIN PANEL (/admin)

The admin panel must be a completely separate layout (no storefront header/footer). Protected by Supabase Auth with a server-side role check (role = "admin" in profiles table). Redirect non-admins to storefront.

### Admin Dashboard (Home)
- KPI Cards (animated count-up): Total Revenue (Rs.), Total Orders, Total Customers, Low Stock Alerts (where stock < 10).
- Revenue Chart: Line/area chart using the Recharts library styled cleanly with no inline CSS rules.
- Recent Orders: Table showing last 10 orders with status, customer, total.

### Product Management (/admin/products)
- Product List: Table with columns: Image thumbnail, Name, SKU, Category, Price, Stock, Status (Active/Draft), Actions (Edit/Delete).
- Add/Edit Product Form:
  - Title, slug (auto-generated from title, editable), description (rich text editor — use a lightweight RTE like TipTap).
  - Category selector (from categories table), tags (multi-select/creatable).
  - Pricing: Regular price, sale price.
  - Media: Drag-and-drop image upload zone. Upload to Supabase Storage bucket "product-images".
  - Variants: Dynamic variant creator (Size, Color). Each variant has its own price, stock, and SKU.

### Order Management (/admin/orders)
- Order List: Table showing Order #, Date, Customer, Total, Payment Status, Fulfillment Status.
- Order Detail View: Detailed item breakdown, shipping address, updates dropdown for fulfillment status (Pending → Processing → Shipped → Delivered → Cancelled).

---

## SECTION 4 — SUPABASE DATABASE SCHEMA

Create the following tables with proper relationships, RLS (Row Level Security) policies, and indexes. Provide a clean, executable SQL migration script.

### Tables:
1. profiles — id (uuid, FK to auth.users), email, full_name, phone, role (enum: 'customer', 'admin'), created_at, updated_at.
2. categories — id, name, slug (unique), description, image_url, parent_id (self-referencing FK), sort_order, created_at.
3. products — id, title, slug (unique), description (text/html), category_id (FK), price (numeric), sale_price (numeric, nullable), sku (unique), stock_quantity (int), track_inventory (bool), status (enum: 'draft', 'active'), created_at, updated_at.
4. product_images — id, product_id (FK), image_url, sort_order, alt_text.
5. product_variants — id, product_id (FK), sku, price (override, nullable), stock_quantity, option_values (jsonb — array of {option_name, value}), created_at.
6. addresses — id, user_id (FK), full_name, phone, address_line1, city, district, is_default (bool), created_at.
7. orders — id, order_number (unique, auto-generated), user_id (FK), email, shipping_address (jsonb), payment_method (text), shipping_cost (numeric), subtotal, discount_amount, tax_amount, total, payment_status (enum: 'pending', 'paid', 'failed', 'refunded'), fulfillment_status (enum: 'pending', 'processing', 'shipped', 'delivered', 'cancelled'), esewa_ref_id (text, nullable), created_at, updated_at.
8. order_items — id, order_id (FK), product_id (FK), variant_id (FK, nullable), title, quantity, unit_price, line_total.
9. reviews — id, product_id (FK), user_id (FK), rating (1-5), title, body, created_at.
10. coupons — id, code (unique), type (enum: 'percentage', 'fixed'), value (numeric), is_active (bool).
11. subscribers — id, email (unique), created_at.
12. hero_slides — id, image_url, heading, subheading, cta_link, sort_order.

### RLS Policies:
- Customers can only read/update their own profile, addresses, orders, reviews, and wishlist.
- Products, categories, and site settings are publicly readable.
- Only admins (role = 'admin') can insert/update/delete records on products, categories, orders, coupons, settings, and hero_slides.

---

## SECTION 5 — TECHNICAL REQUIREMENTS & PROJECT STRUCTURE

### Directory Tree:
/app
/(storefront)
/layout.tsx         ← Front layout with dynamic client-side Context providers
/page.tsx           ← Interactive Homepage
/products/page.tsx  ← PLP with search filter functionalities
/products/[slug]/page.tsx ← PDP
/cart/page.tsx      ← Order totals calculation page
/checkout/page.tsx  ← Delivery handling form & eSewa form submission triggers
/checkout/success/page.tsx ← eSewa transaction response handler (server/client validated)
/account/...        ← Secure user profiles and transaction history
/(admin)
/admin/layout.tsx   ← Separate layout for administration with safe routing
/admin/page.tsx     ← Dashboard graphs and status metrics
/api
/esewa/initiate/route.ts  ← Generates HMAC signatures securely from raw checkout vectors
/esewa/verify/route.ts    ← Postback checker using the public eSewa verification endpoint
/components
/ui                   ← Form buttons, custom elements with explicit "use client" boundaries where necessary
/lib
/esewa.ts          ← Typed initialization wrappers for database interactions
### Performance & Safety:
- Never call window or browser APIs directly within base component scopes; abstract them inside `useEffect` or client dynamic blocks.
- Generate all source code files with completely written logic. Do not truncate components with placeholder code blocks or comment shortcuts like `// TODO`. Ensure TypeScript type checking passes without fallback errors.

---

## VISUAL REFERENCE KEYWORDS FOR UI QUALITY:
The website should visually feel like a blend of these brands: Apple Store's minimalism and whitespace, Aesop's typography and elegance, Nike's product page energy, Shopify Dawn theme's clean structure. The admin panel should feel like a mix of Vercel's dashboard clarity and Linear's polished UI. If in doubt about any design choice, choose the more minimal, more spacious, more refined option. White space is a feature, not a bug.