-- WARNING: This schema is for context only — generated from migrations 001-004.
-- Do not run as-is. Apply via supabase/migrations/*.sql in order.

-- ============================================================================
-- Core tables (original schema)
-- ============================================================================

CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  user_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,                            -- 003: soft delete
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);

CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL,
  phone text,
  email text NOT NULL,
  website text,
  tax_id text,
  bank_account text,
  notes text,
  organization_number text,
  is_company_registered boolean DEFAULT false,
  vat_registered boolean DEFAULT false,
  vat_number text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT company_settings_pkey PRIMARY KEY (id),
  CONSTRAINT company_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_id uuid NOT NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  amount numeric NOT NULL,
  vat_rate numeric DEFAULT 25.00,
  vat_amount numeric DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
);

CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_number text,                                            -- 003: nullable; allocated via next_invoice_number()
  client_id uuid NOT NULL,
  user_id text NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  total_amount numeric NOT NULL DEFAULT 0,
  subtotal_amount numeric DEFAULT 0.00,
  vat_amount numeric DEFAULT 0.00,
  vat_rate numeric DEFAULT 25.00,
  notes text,
  delivery_time timestamp with time zone,
  delivery_place text,
  deleted_at timestamp with time zone,                            -- 003: soft delete
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);

-- 003: per-user uniqueness on invoice_number
CREATE UNIQUE INDEX idx_invoice_number_per_user
  ON public.invoices(user_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_date date NOT NULL,
  payment_method text NOT NULL,
  transaction_id text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  invoice_points integer NOT NULL DEFAULT 0,
  next_invoice_number integer NOT NULL DEFAULT 1,                 -- 003
  -- 003: subscription columns (dormant — no subscriptions sold in v1)
  subscription_tier text DEFAULT 'free',
  subscription_status text DEFAULT 'inactive',
  subscription_stripe_id text,
  stripe_customer_id text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- ============================================================================
-- 003: API keys (Bearer auth for /api/v1)
-- ============================================================================

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

-- ============================================================================
-- 003: Audit log
-- ============================================================================

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- RPCs (see migrations for definitions)
-- ============================================================================

-- 002: Atomic invoice point management
--   public.add_invoice_points(p_user_id uuid, p_points int) RETURNS int
--   public.deduct_invoice_point(p_user_id uuid) RETURNS int   -- NULL if no points

-- 003: Per-user invoice number sequence
--   public.next_invoice_number(p_user_id uuid) RETURNS text   -- e.g. "2026-0001"

-- 004: Free trial seeding trigger on auth.users insert
--   public.seed_profile_with_trial_points()  -- 3 invoice_points for every new user

-- ============================================================================
-- RLS — see migration 001 for full policies. All user-owned tables enforce
-- auth.uid() = user_id (text-cast on invoices/clients, native uuid elsewhere).
-- ============================================================================
