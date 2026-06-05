-- Phase 5: tax exemption reason + GDPR export/erasure.
--
-- 1. company_settings.tax_exemption_reason — BT-120 text emitted on EHF category
--    'E' lines for sellers below the MVA threshold.
-- 2. profiles.deleted_at / anonymized_at — account-erasure markers.
-- 3. export_user_data()      — GDPR Art.15 data portability.
-- 4. anonymize_user_account() — GDPR Art.17 erasure. Bokføringsloven §13 +
--    bokføringsforskriften require sales documents to be retained COMPLETE and
--    UNALTERED for ~5 years; mutating a stored accounting record (or stripping
--    the buyer identity it must carry) would itself breach that. Art.17(3)(b)
--    exempts data held under a legal retention obligation from erasure, so we do
--    NOT touch clients or invoices here. We "lock" the account: ban login (done
--    by the API route), mark the profile erased, and scrub only the seller's own
--    contact fields that the invoice does not legally require (email, phone,
--    website, notes). The seller's legal identity on retained invoices
--    (company_name, organization_number, address, vat_number, bank_account) is
--    kept. A separate post-retention purge job (Phase 6) hard-deletes after 5y.
--
-- Both RPCs are SECURITY DEFINER but verify auth.uid() = p_user_id internally,
-- pin search_path, and follow the secure_invoice_share (20260510120000) ACL
-- pattern: revoke all from public, grant execute to authenticated only (never
-- anon — these are authed-only actions).
--
-- NOTE on user_id types: clients.user_id and invoices.user_id are TEXT (they
-- store the uuid as text); company_settings.user_id and profiles.id are UUID.
-- Hence the ::text casts on clients/invoices below.

-- ----------------------------------------------------------------------------
-- 1. Tax exemption reason
-- ----------------------------------------------------------------------------
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS tax_exemption_reason text
    DEFAULT 'Selger er ikke registrert i Merverdiavgiftsregisteret';

COMMENT ON COLUMN public.company_settings.tax_exemption_reason IS
  'EN16931 BT-120 exemption reason emitted on EHF category E lines (non-VAT-registered seller).';

-- ----------------------------------------------------------------------------
-- 2. Account erasure markers
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

-- ----------------------------------------------------------------------------
-- 3. GDPR Art.15 — export everything we hold about the caller
-- ----------------------------------------------------------------------------
create or replace function public.export_user_data(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or v_uid <> p_user_id then
    raise exception 'not authorized';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = p_user_id),
    'company_settings', (select to_jsonb(cs) from public.company_settings cs where cs.user_id = p_user_id),
    'clients', coalesce(
      (select jsonb_agg(to_jsonb(c) order by c.created_at)
         from public.clients c where c.user_id = p_user_id::text), '[]'::jsonb),
    'invoices', coalesce(
      (select jsonb_agg(to_jsonb(i) order by i.created_at)
         from public.invoices i where i.user_id = p_user_id::text), '[]'::jsonb),
    'invoice_items', coalesce(
      (select jsonb_agg(to_jsonb(ii))
         from public.invoice_items ii
        where ii.invoice_id in (select id from public.invoices where user_id = p_user_id::text)),
      '[]'::jsonb)
  );
end;
$$;

revoke all on function public.export_user_data(uuid) from public;
grant execute on function public.export_user_data(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. GDPR Art.17 — lock the account; retain the books unaltered
-- ----------------------------------------------------------------------------
create or replace function public.anonymize_user_account(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invoices integer;
begin
  if v_uid is null or v_uid <> p_user_id then
    raise exception 'not authorized';
  end if;

  -- Clients and invoices are NOT touched: they are part of the retained
  -- accounting record (bokføringsloven §13) and must stay complete and
  -- unaltered. Art.17(3)(b) exempts them from erasure until the retention period
  -- expires, after which a separate purge job removes them.
  select count(*) into v_invoices from public.invoices where user_id = p_user_id::text;

  -- Scrub only the seller's own contact fields that the invoice does not legally
  -- require. Legal seller identity (company_name, organization_number, address,
  -- vat_number, bank_account) is kept so retained invoices remain valid.
  update public.company_settings
     set email      = 'anonymisert@example.invalid',
         phone      = null,
         website    = null,
         notes      = null,
         updated_at = now()
   where user_id = p_user_id;

  -- Mark the profile erased (the "lock"). The auth.users row is banned (not
  -- deleted) by the API route, because profiles/company_settings cascade from it
  -- and must survive for invoice retention.
  update public.profiles
     set anonymized_at = now(),
         deleted_at    = now(),
         updated_at    = now()
   where id = p_user_id;

  insert into public.audit_log (user_id, action, resource_type, resource_id, details)
  values (p_user_id, 'account.erase_lock', 'profile', p_user_id,
          jsonb_build_object('invoices_retained', v_invoices));

  return jsonb_build_object('ok', true, 'invoices_retained', v_invoices);
end;
$$;

revoke all on function public.anonymize_user_account(uuid) from public;
grant execute on function public.anonymize_user_account(uuid) to authenticated;
