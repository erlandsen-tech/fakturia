-- Products catalogue — reusable invoice-line templates, managed the same way as
-- clients (per-user, RLS-scoped, soft-deletable). A product prefills an invoice
-- line's description / price / VAT / unit on the create page.
--
-- Mirrors the clients table: user_id is TEXT (auth.uid()::text), RLS scoped to
-- the owner, plus the shared set_user_id / prevent_user_id_change / handle_
-- updated_at triggers (all defined in earlier migrations).

create table if not exists public.products (
  id             uuid not null default gen_random_uuid(),
  user_id        text not null,
  name           text not null,
  description    text,
  unit_price     numeric not null default 0,        -- NOK
  vat_rate       numeric(5,2) not null default 25,  -- percent; forced to 0 at
                                                     -- invoice time for non-VAT-
                                                     -- registered sellers
  unit           text not null default 'stk',       -- human label (stk, time, …)
  unit_code      text not null default 'C62',        -- UN/ECE Rec 20 for EHF
  product_number text,                               -- optional SKU
  deleted_at     timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  constraint products_pkey primary key (id)
);

create index if not exists idx_products_user_id    on public.products(user_id);
create index if not exists idx_products_deleted_at on public.products(deleted_at);

alter table public.products enable row level security;

create policy "Users can view their own products" on public.products
  for select using (auth.uid()::text = user_id);

create policy "Users can insert their own products" on public.products
  for insert with check (auth.uid()::text = user_id);

create policy "Users can update their own products" on public.products
  for update using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "Users can delete their own products" on public.products
  for delete using (auth.uid()::text = user_id);

-- updated_at maintenance
create trigger handle_products_updated_at
  before update on public.products
  for each row execute function public.handle_updated_at();

-- user_id auto-fill on insert + immutability on update (parity with clients)
create trigger set_user_id_trigger_products
  before insert on public.products
  for each row execute function public.set_user_id();

create trigger prevent_user_id_change_products
  before update on public.products
  for each row execute function public.prevent_user_id_change();
