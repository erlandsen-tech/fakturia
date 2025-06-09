-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  user_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
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
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  organization_number text,
  is_company_registered boolean DEFAULT false,
  vat_registered boolean DEFAULT false,
  vat_number text,
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
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  vat_rate numeric DEFAULT 25.00,
  vat_amount numeric DEFAULT 0.00,
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_number text NOT NULL,
  client_id uuid NOT NULL,
  user_id text NOT NULL,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'draft'::invoice_status,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  delivery_time timestamp with time zone,
  delivery_place text,
  vat_rate numeric DEFAULT 25.00,
  vat_amount numeric DEFAULT 0.00,
  subtotal_amount numeric DEFAULT 0.00,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
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
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);