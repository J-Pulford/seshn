-- Seshn — escrow funding & delivery transitions
-- Companion to 0012_escrow.sql / 0013_contract_functions.sql. The funding and
-- release transitions touch Stripe and run server-side via the service-role
-- client (app/api/stripe/escrow/*), the same pattern the webhook already uses
-- for profiles.stripe_account_status. The one transition a *participant* drives
-- directly from the browser is "mark delivered", so it lives here as a
-- SECURITY DEFINER RPC: escrows have no UPDATE policy, and we want the status
-- flip, the approval-clock start, the deliverable row and the audit entry to all
-- land in one transaction.

-- ──── mark_delivered ───────────────────────────────────────────────
-- The collaborator declares the work done. Flips a funded escrow to
-- 'delivered', starts the auto-release clock from the contract's
-- approval_window_days, optionally records a closing note as a
-- deliverable, and writes the audit row.

create or replace function public.mark_delivered(
  p_escrow_id uuid,
  p_note      text default null
)
returns public.escrows
language plpgsql
security definer
set search_path = public
as $$
declare
  e        public.escrows;
  c        public.contracts;
  v_actor  uuid := auth.uid();
  v_days   int;
begin
  if v_actor is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into e from public.escrows where id = p_escrow_id for update;
  if not found then
    raise exception 'Escrow not found' using errcode = '42704';
  end if;

  select * into c from public.contracts where id = e.contract_id;
  if not found then
    raise exception 'Contract not found' using errcode = '42704';
  end if;
  if c.collaborator_id <> v_actor then
    raise exception 'Only the collaborator can mark work delivered' using errcode = '42501';
  end if;
  if e.status <> 'funded' then
    raise exception 'Escrow is in status % (must be funded to deliver)', e.status using errcode = '22023';
  end if;

  -- Approval window from the signed terms; default 7 days, clamped 1..30.
  v_days := coalesce((c.terms->>'approval_window_days')::int, 7);
  if v_days < 1 then v_days := 1; end if;
  if v_days > 30 then v_days := 30; end if;

  -- Optional closing note as an immutable deliverable row.
  if p_note is not null and length(btrim(p_note)) > 0 then
    insert into public.deliverables (escrow_id, kind, note)
    values (p_escrow_id, 'note', left(btrim(p_note), 4000));
  end if;

  update public.escrows
     set status          = 'delivered',
         delivered_at    = now(),
         auto_release_at = now() + make_interval(days => v_days)
   where id = p_escrow_id
   returning * into e;

  insert into public.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    v_actor,
    'escrow_delivered',
    'escrows',
    p_escrow_id::text,
    jsonb_build_object('auto_release_at', e.auto_release_at, 'approval_window_days', v_days)
  );

  return e;
end;
$$;

revoke all on function public.mark_delivered(uuid, text) from public;
grant execute on function public.mark_delivered(uuid, text) to authenticated;
