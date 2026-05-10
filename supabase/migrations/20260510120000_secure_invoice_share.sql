-- Replace the permissive `using (true)` SELECT policy from
-- 20260508000000_add_invoice_share_columns.sql with a SECURITY DEFINER RPC,
-- so anonymous /i/[token] visitors cannot list every invoice via PostgREST.

drop policy if exists "public read by token" on public.invoices;

create or replace function public.get_public_invoice_by_token(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'invoice', jsonb_build_object(
      'id', i.id,
      'invoice_number', i.invoice_number,
      'issue_date', i.issue_date,
      'due_date', i.due_date,
      'notes', i.notes,
      'bank_account', i.bank_account,
      'kid', i.kid,
      'iban', i.iban
    ),
    'client', case when c.id is null then null else jsonb_build_object(
      'name', c.name,
      'email', c.email,
      'company', c.company
    ) end,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'description', ii.description,
        'quantity', ii.quantity,
        'unit_price', ii.unit_price,
        'vat_rate', ii.vat_rate
      ) order by ii.created_at)
      from public.invoice_items ii
      where ii.invoice_id = i.id
    ), '[]'::jsonb),
    'company', case when cs.id is null then null else jsonb_build_object(
      'company_name', cs.company_name,
      'address_line1', cs.address_line1,
      'address_line2', cs.address_line2,
      'city', cs.city,
      'postal_code', cs.postal_code,
      'country', cs.country,
      'organization_number', cs.organization_number,
      'email', cs.email,
      'bank_account', cs.bank_account
    ) end
  )
  from public.invoices i
  left join public.clients c on c.id = i.client_id
  left join public.company_settings cs on cs.user_id::text = i.user_id
  where i.share_token = p_token
  limit 1;
$$;

revoke all on function public.get_public_invoice_by_token(text) from public;
grant execute on function public.get_public_invoice_by_token(text) to anon, authenticated;
