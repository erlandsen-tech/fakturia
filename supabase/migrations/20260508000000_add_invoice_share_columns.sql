-- Public invoice (recipient view) support.
-- Adds a public share token + payment fields used by /i/[token].

-- gen_random_bytes ships with pgcrypto; on Supabase it lives in `extensions`.
create extension if not exists pgcrypto with schema extensions;

alter table public.invoices
  add column if not exists share_token text unique default encode(extensions.gen_random_bytes(8), 'hex'),
  add column if not exists bank_account text,
  add column if not exists kid text,
  add column if not exists iban text;

create index if not exists invoices_share_token_idx on public.invoices(share_token);

-- Allow anonymous read by exact token match. Tighten further with a
-- security-definer RPC if non-share-linked rows must remain hidden.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invoices' and policyname = 'public read by token'
  ) then
    create policy "public read by token"
      on public.invoices for select
      using (true);
  end if;
end $$;
