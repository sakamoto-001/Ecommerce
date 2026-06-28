-- ═══════════════════════════════════════════════════════════════
-- ASMIRE — Supabase Setup Script (Safe / Idempotent)
-- Run this in Supabase Dashboard > SQL Editor
-- Safe to run multiple times — won't break existing data
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Categories ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
    id bigserial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);
INSERT INTO public.categories (name)
VALUES ('Tops'),('Bottoms'),('Outerwear'),('Accessories')
ON CONFLICT (name) DO NOTHING;

-- ── 2. Products ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
    id bigserial PRIMARY KEY,
    name text NOT NULL,
    price numeric NOT NULL DEFAULT 0,
    category text NOT NULL DEFAULT 'Tops',
    description text DEFAULT '',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Add columns if they don't exist yet (safe upgrade)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id bigint REFERENCES public.categories(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sizes jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colors jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_trending boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_new boolean DEFAULT false;

-- ── 3. Orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_uuid uuid NOT NULL,
    total_amount numeric NOT NULL,
    cart_items jsonb NOT NULL DEFAULT '[]',
    shipping_info jsonb NOT NULL DEFAULT '{}',
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Add new columns if missing
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS esewa_ref text DEFAULT '';

-- Fix status CHECK constraint to include all statuses
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','processing','shipped','delivered','completed','unverified','cancelled'));

-- ── 4. Admin Users ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- ── 5. Settings (singleton row) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
    id smallint PRIMARY KEY CHECK (id = 1),
    currency text NOT NULL DEFAULT 'NPR',
    tax_rate numeric NOT NULL DEFAULT 0,
    site_title text DEFAULT 'ASMIRE',
    meta_description text DEFAULT '',
    og_image text DEFAULT '',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
INSERT INTO public.settings (id, currency, tax_rate, site_title)
VALUES (1, 'NPR', 0, 'ASMIRE')
ON CONFLICT (id) DO NOTHING;

-- ── 6. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_tx_uuid  ON public.orders (transaction_uuid);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created  ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (active);

-- ── 7. Enable Row Level Security ─────────────────────────────
ALTER TABLE public.products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ── 8. Drop old policies if they exist (clean slate) ─────────
DROP POLICY IF EXISTS "admin_full_access"     ON public.products;
DROP POLICY IF EXISTS "admin_full_access"     ON public.orders;
DROP POLICY IF EXISTS "admin_full_access"     ON public.categories;
DROP POLICY IF EXISTS "admin_full_access"     ON public.settings;
DROP POLICY IF EXISTS "admin_full_access"     ON public.admin_users;
DROP POLICY IF EXISTS "public_read_products"  ON public.products;
DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
DROP POLICY IF EXISTS "public_read_settings"  ON public.settings;
DROP POLICY IF EXISTS "anon_insert_orders"    ON public.orders;
-- Also drop old policy name variant
DROP POLICY IF EXISTS "admin_access" ON public.products;
DROP POLICY IF EXISTS "admin_access" ON public.orders;
DROP POLICY IF EXISTS "admin_access" ON public.categories;
DROP POLICY IF EXISTS "admin_access" ON public.settings;

-- ── 9. Admin full-access policies ────────────────────────────
CREATE POLICY "admin_full_access" ON public.products FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "admin_full_access" ON public.orders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "admin_full_access" ON public.categories FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "admin_full_access" ON public.settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "admin_full_access" ON public.admin_users FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- ── 10. Public / Storefront read policies ────────────────────
CREATE POLICY "public_read_products"  ON public.products  FOR SELECT USING (active = true);
CREATE POLICY "public_read_categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "public_read_settings"  ON public.settings  FOR SELECT USING (true);
CREATE POLICY "anon_insert_orders"    ON public.orders    FOR INSERT WITH CHECK (true);

-- ── 11. Register admin user ──────────────────────────────────
-- Pre-filled with your admin account (majhisandesh842@gmail.com)
INSERT INTO public.admin_users (user_id)
VALUES ('5ee166ab-1904-4715-8ccd-c3feb7e3355c')
ON CONFLICT (user_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- ✅ Done! All tables and policies are set up.
-- Login → http://localhost:3000/admin-login.html
-- Email  → majhisandesh842@gmail.com
-- Password → Supreme90
-- ════════════════════════════════════════════════════════════

-- ── 12. Reviews ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
    id bigserial PRIMARY KEY,
    product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    reviewer_name text NOT NULL,
    comment text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop old policies if exist
DROP POLICY IF EXISTS "public_read_reviews" ON public.reviews;
DROP POLICY IF EXISTS "public_insert_reviews" ON public.reviews;
DROP POLICY IF EXISTS "admin_full_access" ON public.reviews;

-- Create policies
CREATE POLICY "public_read_reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "public_insert_reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_full_access" ON public.reviews FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

