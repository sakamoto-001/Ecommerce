-- ═══════════════════════════════════════════════════════════
-- ASMIRE eCommerce — Supabase Schema
-- ═══════════════════════════════════════════════════════════

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id bigserial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- Insert default categories
INSERT INTO public.categories (name) VALUES
  ('Tops'), ('Bottoms'), ('Outerwear'), ('Accessories')
ON CONFLICT (name) DO NOTHING;

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
    id bigserial PRIMARY KEY,
    name text NOT NULL,
    price numeric NOT NULL DEFAULT 0,
    category text NOT NULL DEFAULT 'Tops',
    category_id bigint REFERENCES public.categories(id),
    sizes jsonb NOT NULL DEFAULT '[]'::jsonb,
    colors jsonb NOT NULL DEFAULT '[]'::jsonb,
    images jsonb NOT NULL DEFAULT '[]'::jsonb,
    description text DEFAULT '',
    stock integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    is_trending boolean DEFAULT false,
    is_new boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_uuid uuid NOT NULL,
    total_amount numeric NOT NULL,
    cart_items jsonb NOT NULL DEFAULT '[]'::jsonb,
    shipping_info jsonb NOT NULL DEFAULT '{}'::jsonb,
    customer_name text DEFAULT '',
    customer_email text DEFAULT '',
    status text NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','processing','shipped','delivered','completed','unverified','cancelled')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    paid_at timestamptz,
    esewa_ref text DEFAULT ''
);

-- Admin users table (links Supabase Auth users to admin role)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

-- Settings singleton table
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

-- Insert default settings row
INSERT INTO public.settings (id, currency, tax_rate, site_title)
VALUES (1, 'NPR', 0, 'ASMIRE')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_orders_tx_uuid ON public.orders (transaction_uuid);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (active);

-- ═══════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admin full access policies (only users in admin_users table)
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

-- Public read-only policies (for storefront)
CREATE POLICY "public_read_products" ON public.products FOR SELECT
  USING (active = true);

CREATE POLICY "public_read_categories" ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "public_read_settings" ON public.settings FOR SELECT
  USING (true);

-- Allow anonymous order insertion (for checkout flow)
CREATE POLICY "anon_insert_orders" ON public.orders FOR INSERT
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- Storage bucket (run in Supabase Dashboard > Storage)
-- ═══════════════════════════════════════════════════════════
-- Create a bucket named "product-images" with public access.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Reviews table
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

-- Policies
CREATE POLICY "public_read_reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "public_insert_reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_full_access" ON public.reviews FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

