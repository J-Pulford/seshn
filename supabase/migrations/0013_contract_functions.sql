-- Seshn — contract lifecycle functions
-- Companion to 0012_escrow.sql. Defines the atomic transitions that
-- the contract RLS policies deliberately don't allow as plain UPDATEs:
--
--   - sign_contract(): writes the signer's signed_at timestamp AND an
--     audit_log row in a single transaction, then promotes the contract
--     to 'active' if both parties have now signed. The audit_log row
--     captures IP + user-agent + agreement hash — that's the evidence
--     of signing.
--
--   - send_contract(): owner promotes a draft to 'awaiting_signatures'.
--     This is allowed under the existing RLS policy on contracts, but
--     wrapping it in a function lets the audit_log row land in the
--     same transaction.
--
--   - cancel_contract(): owner voids a draft / awaiting_signatures
--     contract before funding. After funding the escrow takes over;
--     cancellation post-funding is a refund flow, not this function.
--
-- These functions are SECURITY DEFINER and validate auth.uid() against
-- the contract's owner_id / collaborator_id. They are the only path
-- by which signed_at columns change.

-- ──── sign_contract ────────────────────────────────────────────────
-- Either party calls this to record their signature. Updates the
-- correct signed_at column, writes the audit row, and (if both have
-- now signed) promotes the contract to 'active'.

create or replace function public.sign_contract(
  p_contract_id   uuid,
  p_agreement_hash text,
  p_ip            text,
  p_user_agent    text
)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  c        public.contracts;
  v_actor  uuid := auth.uid();
  v_role   text;   -- 'owner' or 'collaborator'
begin
  if v_actor is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_agreement_hash is null or length(p_agreement_hash) <> 64 then
    raise exception 'Agreement hash must be a 64-char sha256 hex' using errcode = '22023';
  end if;

  select * into c from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'Contract not found' using errcode = '42704';
  end if;

  if v_actor = c.owner_id then
    v_role := 'owner';
  elsif v_actor = c.collaborator_id then
    v_role := 'collaborator';
  else
    raise exception 'Not a party to this contract' using errcode = '42501';
  end if;

  if c.status <> 'awaiting_signatures' then
    raise exception 'Contract is in status % (must be awaiting_signatures to sign)', c.status
      using errcode = '22023';
  end if;

  if v_role = 'owner' and c.owner_signed_at is not null then
    raise exception 'Owner has already signed' using errcode = '22023';
  end if;
  if v_role = 'collaborator' and c.collaborator_signed_at is not null then
    raise exception 'Collaborator has already signed' using errcode = '22023';
  end if;

  -- Stamp the signer's column.
  if v_role = 'owner' then
    update public.contracts
       set owner_signed_at = now()
     where id = p_contract_id
     returning * into c;
  else
    update public.contracts
       set collaborator_signed_at = now()
     where id = p_contract_id
     returning * into c;
  end if;

  -- Promote to active if both have now signed.
  if c.owner_signed_at is not null and c.collaborator_signed_at is not null then
    update public.contracts
       set fully_signed_at = now(),
           status          = 'active'
     where id = p_contract_id
     returning * into c;
  end if;

  -- Audit: one row per signer's click.
  insert into public.audit_log (actor_id, action, target_table, target_id, payload, ip, user_agent)
  values (
    v_actor,
    'contract_signed',
    'contracts',
    p_contract_id::text,
    jsonb_build_object(
      'role',            v_role,
      'agreement_hash',  p_agreement_hash,
      'template_version', c.terms->>'template_version'
    ),
    nullif(p_ip, '')::inet,
    p_user_agent
  );

  -- Audit: a second row when the contract becomes fully signed, so the
  -- timeline has a clear 'now it's active' event independent of which
  -- party signed last.
  if c.status = 'active' and c.fully_signed_at is not null
     and c.fully_signed_at >= now() - interval '5 seconds' then
    insert into public.audit_log (actor_id, action, target_table, target_id, payload)
    values (
      v_actor,
      'contract_fully_signed',
      'contracts',
      p_contract_id::text,
      jsonb_build_object('owner_signed_at', c.owner_signed_at,
                         'collaborator_signed_at', c.collaborator_signed_at)
    );
  end if;

  return c;
end;
$$;

revoke all on function public.sign_contract(uuid, text, text, text) from public;
grant execute on function public.sign_contract(uuid, text, text, text) to authenticated;


-- ──── send_contract ────────────────────────────────────────────────
-- Owner moves a draft into the signature phase. Could be done as a
-- plain UPDATE under the existing RLS, but wrapping it makes the
-- 'contract_sent' audit row atomic with the status change.

create or replace function public.send_contract(p_contract_id uuid)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  c       public.contracts;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into c from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'Contract not found' using errcode = '42704';
  end if;
  if c.owner_id <> v_actor then
    raise exception 'Only the contract owner can send the contract' using errcode = '42501';
  end if;
  if c.status <> 'draft' then
    raise exception 'Contract is in status % (must be draft to send)', c.status using errcode = '22023';
  end if;

  -- Light sanity check on the terms. Full validation lives in app code;
  -- this just stops a contract going out the door without basic fields.
  if (c.terms->>'fee_cents') is null
     or (c.terms->'deliverable'->>'description') is null
     or (c.terms->'deliverable'->>'deliver_by') is null then
    raise exception 'Contract terms incomplete (need fee_cents, deliverable.description, deliverable.deliver_by)'
      using errcode = '22023';
  end if;

  update public.contracts
     set status = 'awaiting_signatures'
   where id = p_contract_id
   returning * into c;

  insert into public.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    v_actor,
    'contract_sent',
    'contracts',
    p_contract_id::text,
    jsonb_build_object('terms_snapshot', c.terms)
  );

  return c;
end;
$$;

revoke all on function public.send_contract(uuid) from public;
grant execute on function public.send_contract(uuid) to authenticated;


-- ──── cancel_contract ──────────────────────────────────────────────
-- Owner voids a contract pre-funding. After funding the escrow flow
-- takes over (cancellation becomes a refund operation handled by the
-- Stripe webhook + cron).

create or replace function public.cancel_contract(p_contract_id uuid, p_reason text)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  c       public.contracts;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into c from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'Contract not found' using errcode = '42704';
  end if;
  if c.owner_id <> v_actor then
    raise exception 'Only the contract owner can cancel this contract' using errcode = '42501';
  end if;
  if c.status not in ('draft', 'awaiting_signatures') then
    raise exception 'Contract is in status % (post-funding cancellation goes through the refund flow)',
      c.status using errcode = '22023';
  end if;

  update public.contracts
     set status = 'cancelled'
   where id = p_contract_id
   returning * into c;

  insert into public.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    v_actor,
    'contract_cancelled',
    'contracts',
    p_contract_id::text,
    jsonb_build_object('reason', coalesce(p_reason, ''))
  );

  return c;
end;
$$;

revoke all on function public.cancel_contract(uuid, text) from public;
grant execute on function public.cancel_contract(uuid, text) to authenticated;


-- ──── decline_contract ─────────────────────────────────────────────
-- The collaborator can decline a contract sent to them. Unlike cancel,
-- this does NOT void the contract — it pushes it back to 'draft' so
-- the owner can renegotiate terms. The decline is recorded in
-- audit_log so the negotiation has a paper trail.

create or replace function public.decline_contract(p_contract_id uuid, p_reason text)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  c       public.contracts;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into c from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'Contract not found' using errcode = '42704';
  end if;
  if c.collaborator_id <> v_actor then
    raise exception 'Only the collaborator can decline this contract' using errcode = '42501';
  end if;
  if c.status <> 'awaiting_signatures' then
    raise exception 'Contract is in status % (must be awaiting_signatures to decline)', c.status
      using errcode = '22023';
  end if;
  if c.collaborator_signed_at is not null then
    raise exception 'You have already signed this contract; you cannot decline it'
      using errcode = '22023';
  end if;

  -- Wipe any prior owner signature so the next round starts clean.
  update public.contracts
     set status               = 'draft',
         owner_signed_at      = null,
         collaborator_signed_at = null
   where id = p_contract_id
   returning * into c;

  insert into public.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    v_actor,
    'contract_declined',
    'contracts',
    p_contract_id::text,
    jsonb_build_object('reason', coalesce(p_reason, ''))
  );

  return c;
end;
$$;

revoke all on function public.decline_contract(uuid, text) from public;
grant execute on function public.decline_contract(uuid, text) to authenticated;
