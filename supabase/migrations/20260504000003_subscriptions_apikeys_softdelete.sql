-- 003: Subscriptions, API keys, soft delete, invoice numbers, audit log
-- Required by: api/stripe-webhook, api/v1/*, REBUILD.md plan

-- ----------------------------------------------------------------------------
-- profiles: subscription columns
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_stripe_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_stripe_id
  ON public.profiles(subscription_stripe_id);

-- ----------------------------------------------------------------------------
-- API keys (Bearer-token auth for /api/v1)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own api keys" ON public.api_keys;
CREATE POLICY "Users can view their own api keys" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own api keys" ON public.api_keys;
CREATE POLICY "Users can insert their own api keys" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own api keys" ON public.api_keys;
CREATE POLICY "Users can update their own api keys" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own api keys" ON public.api_keys;
CREATE POLICY "Users can delete their own api keys" ON public.api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Soft delete on invoices and clients
-- ----------------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON public.invoices(deleted_at);
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON public.clients(deleted_at);

-- ----------------------------------------------------------------------------
-- invoice_number: make nullable + add per-user uniqueness, auto-generate
-- ----------------------------------------------------------------------------
-- The 20240320 migration installed a trigger-based generator. Drop it in favour
-- of the atomic next_invoice_number() RPC defined below.
DROP TRIGGER IF EXISTS ensure_sequential_invoice_number ON public.invoices;
DROP FUNCTION IF EXISTS public.ensure_sequential_invoice_number();

ALTER TABLE public.invoices ALTER COLUMN invoice_number DROP NOT NULL;

DROP INDEX IF EXISTS idx_invoice_number_per_user;
CREATE UNIQUE INDEX idx_invoice_number_per_user
  ON public.invoices(user_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

-- Per-user sequence stored in profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS next_invoice_number INTEGER NOT NULL DEFAULT 1;

-- Atomic invoice number allocator
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  UPDATE public.profiles
  SET next_invoice_number = next_invoice_number + 1
  WHERE id = p_user_id
  RETURNING next_invoice_number - 1 INTO next_num;

  IF next_num IS NULL THEN
    INSERT INTO public.profiles (id, next_invoice_number)
    VALUES (p_user_id, 2)
    RETURNING 1 INTO next_num;
  END IF;

  RETURN to_char(now(), 'YYYY') || '-' || lpad(next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Audit log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own audit log" ON public.audit_log;
CREATE POLICY "Users can view their own audit log" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);
