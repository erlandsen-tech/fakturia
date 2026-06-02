-- Phase 2 (legal/retention): status-guarded soft-delete for invoices.
--
-- bokføringsloven §13 requires sales invoices (a bokføringspliktig document) to
-- be retained 5 years; an issued/sent invoice MUST NOT be physically deleted,
-- and deleting one would also leave a gap in the gap-free sequential
-- invoice_number series (bokføringsforskriften). Only 'draft' invoices — which
-- were never issued — may be removed, and even then we soft-delete (set
-- deleted_at) rather than DELETE, so nothing physically disappears.
--
-- SECURITY DEFINER + the `where user_id = auth.uid()` guard means the UPDATE may
-- safely bypass RLS: ownership is enforced inside the function. search_path is
-- pinned to public to avoid search-path hijacking. ACL copies the
-- secure_invoice_share pattern (20260510120000), but grants to authenticated
-- ONLY — deletion is an authed action, never anonymous.

create or replace function public.soft_delete_invoice(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv record;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select id, status, deleted_at
    into v_inv
    from public.invoices
   where id = p_invoice_id
     and user_id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_inv.deleted_at is not null then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  -- §13: never remove an issued/retained document. Only drafts are deletable.
  if v_inv.status <> 'draft' then
    return jsonb_build_object('ok', false, 'error', 'not_draft', 'status', v_inv.status);
  end if;

  update public.invoices
     set deleted_at = now()
   where id = p_invoice_id
     and user_id = v_uid;

  insert into public.audit_log (user_id, action, resource_type, resource_id)
  values (v_uid, 'invoice.soft_delete', 'invoice', p_invoice_id);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.soft_delete_invoice(uuid) from public;
grant execute on function public.soft_delete_invoice(uuid) to authenticated;
