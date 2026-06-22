-- Seshn — direct contracts (book a collaborator without a posted gig).
--
-- Until now a contract required a gig + an accepted application, and only the
-- gig owner (the paying side) could draft one. This migration lets either party
-- start a contract straight from a DM or a profile:
--   * a provider can send an offer (e.g. "mix your single, $500"), or
--   * a client can book a provider directly.
-- The downstream lifecycle (sign -> fund escrow -> deliver -> release/dispute)
-- is unchanged and already keys off the contract's owner/collaborator, not the
-- gig. "Owner" is always the paying side; "collaborator" is always the paid side.
--
-- Key idea: a new `proposed_by` column records who drafted the contract (the
-- initiator). For legacy gig contracts that's the owner, so behaviour is
-- preserved. The draft/send controls move from "owner" to "proposer", and the
-- counterparty (whoever didn't propose) is the one who can decline to renegotiate.

-- ── 1. Decouple from gigs + add provenance ────────────────────────────────
alter table public.contracts
  alter column gig_id drop not null,
  alter column application_id drop not null,
  add column origin          text not null default 'gig' check (origin in ('gig', 'direct')),
  add column proposed_by      uuid references public.profiles(id) on delete restrict,
  add column conversation_id  uuid references public.conversations(id) on delete set null;

-- Existing contracts came from gigs and were drafted by the owner.
update public.contracts set proposed_by = owner_id where proposed_by is null;
alter table public.contracts alter column proposed_by set not null;

create index contracts_proposed_by_idx  on public.contracts (proposed_by);
create index contracts_conversation_idx on public.contracts (conversation_id) where conversation_id is not null;

-- ── 2. Insert/edit policies: keep the gig path, generalise edit to proposer ──
-- Gig contracts are still created by a direct INSERT (createContract); harden it
-- so the owner must also be the proposer.
drop policy if exists "Owners can create contracts on their accepted applications" on public.contracts;
create policy "Owners can create contracts on their accepted applications"
  on public.contracts for insert
  with check (
    owner_id = auth.uid()
    and proposed_by = auth.uid()
    and origin = 'gig'
    and application_id in (
      select a.id from public.applications a
      join public.gigs g on g.id = a.gig_id
      where g.owner_id = auth.uid()
        and a.status = 'accepted'
        and a.applicant_id = collaborator_id
    )
  );

-- Direct contracts are created via create_direct_contract() (SECURITY DEFINER),
-- so they don't need an INSERT policy here.

drop policy if exists "Owners can edit draft contracts" on public.contracts;
create policy "Proposer can edit draft contracts"
  on public.contracts for update
  using (proposed_by = auth.uid() and status = 'draft')
  with check (proposed_by = auth.uid() and status in ('draft', 'awaiting_signatures', 'cancelled'));

-- ── 3. Notification kind + the create function ─────────────────────────────
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'application_received', 'application_accepted', 'application_rejected',
  'message_received',
  'meeting_proposed', 'meeting_updated', 'meeting_confirmed', 'meeting_declined', 'meeting_cancelled',
  'escrow_funded', 'escrow_delivered', 'escrow_released', 'escrow_refunded', 'escrow_disputed',
  'help_reply',
  'review_received',
  'contract_received'
));

-- create_direct_contract: open a draft contract between the caller and another
-- user, with no gig. p_i_am_provider decides the money direction:
--   true  -> caller is the paid side (collaborator); counterparty pays (owner)
--   false -> caller pays (owner); counterparty is paid (collaborator)
create or replace function public.create_direct_contract(
  p_counterparty    uuid,
  p_i_am_provider   boolean,
  p_terms           jsonb,
  p_conversation_id uuid default null
)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_collab uuid;
  v_convo uuid := p_conversation_id;
  c public.contracts;
begin
  if v_actor is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_counterparty is null or p_counterparty = v_actor then
    raise exception 'Pick someone other than yourself' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_counterparty) then
    raise exception 'That user does not exist' using errcode = '42704';
  end if;
  if public.blocks_between(v_actor, p_counterparty) then
    raise exception 'You cannot send a contract to this user' using errcode = '42501';
  end if;

  if p_i_am_provider then
    v_collab := v_actor; v_owner := p_counterparty;
  else
    v_owner := v_actor;  v_collab := p_counterparty;
  end if;

  -- A supplied conversation must be one the caller is in; otherwise ignore it.
  if v_convo is not null and not exists (
       select 1 from public.conversations cc
        where cc.id = v_convo and v_actor in (cc.user_a, cc.user_b)) then
    v_convo := null;
  end if;

  insert into public.contracts
    (gig_id, application_id, owner_id, collaborator_id, origin, proposed_by, conversation_id, status, terms)
  values
    (null, null, v_owner, v_collab, 'direct', v_actor, v_convo, 'draft', coalesce(p_terms, '{}'::jsonb))
  returning * into c;

  insert into public.audit_log (actor_id, action, target_table, target_id, payload)
  values (v_actor, 'contract_created_direct', 'contracts', c.id::text,
          jsonb_build_object('owner_id', v_owner, 'collaborator_id', v_collab, 'conversation_id', v_convo));

  return c;
end;
$$;

revoke all on function public.create_direct_contract(uuid, boolean, jsonb, uuid) from public, anon;
grant execute on function public.create_direct_contract(uuid, boolean, jsonb, uuid) to authenticated;

-- ── 4. Generalise send / cancel / decline to the proposer model ────────────

-- send_contract: the PROPOSER (was: owner) sends the draft for signing, and the
-- counterparty gets a notification.
create or replace function public.send_contract(p_contract_id uuid)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  c          public.contracts;
  v_actor    uuid := auth.uid();
  v_recipient uuid;
begin
  if v_actor is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into c from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'Contract not found' using errcode = '42704';
  end if;
  if c.proposed_by <> v_actor then
    raise exception 'Only the party who drafted this contract can send it' using errcode = '42501';
  end if;
  if c.status <> 'draft' then
    raise exception 'Contract is in status % (must be draft to send)', c.status using errcode = '22023';
  end if;

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
  values (v_actor, 'contract_sent', 'contracts', p_contract_id::text,
          jsonb_build_object('terms_snapshot', c.terms));

  -- Tell the counterparty (whoever didn't propose) that a contract is waiting.
  v_recipient := case when c.proposed_by = c.owner_id then c.collaborator_id else c.owner_id end;
  insert into public.notifications (user_id, kind, actor_id, contract_id, gig_id, conversation_id)
  values (v_recipient, 'contract_received', v_actor, c.id, c.gig_id, c.conversation_id);

  return c;
end;
$$;

revoke all on function public.send_contract(uuid) from public, anon;
grant execute on function public.send_contract(uuid) to authenticated;

-- cancel_contract: the proposer (withdraw) OR the owner (paying side) can void a
-- pre-funding contract.
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
  if v_actor not in (c.owner_id, c.proposed_by) then
    raise exception 'Only the proposer or the paying party can cancel this contract' using errcode = '42501';
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
  values (v_actor, 'contract_cancelled', 'contracts', p_contract_id::text,
          jsonb_build_object('reason', coalesce(p_reason, '')));

  return c;
end;
$$;

revoke all on function public.cancel_contract(uuid, text) from public, anon;
grant execute on function public.cancel_contract(uuid, text) to authenticated;

-- decline_contract: the COUNTERPARTY (the party who didn't propose) bounces it
-- back to draft so the proposer can renegotiate.
create or replace function public.decline_contract(p_contract_id uuid, p_reason text)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  c        public.contracts;
  v_actor  uuid := auth.uid();
  v_signed boolean;
begin
  if v_actor is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into c from public.contracts where id = p_contract_id for update;
  if not found then
    raise exception 'Contract not found' using errcode = '42704';
  end if;
  if v_actor not in (c.owner_id, c.collaborator_id) then
    raise exception 'Not a party to this contract' using errcode = '42501';
  end if;
  if v_actor = c.proposed_by then
    raise exception 'You drafted this contract; cancel it instead of declining' using errcode = '22023';
  end if;
  if c.status <> 'awaiting_signatures' then
    raise exception 'Contract is in status % (must be awaiting_signatures to decline)', c.status
      using errcode = '22023';
  end if;

  v_signed := case when v_actor = c.owner_id then c.owner_signed_at is not null
                   else c.collaborator_signed_at is not null end;
  if v_signed then
    raise exception 'You have already signed this contract; you cannot decline it' using errcode = '22023';
  end if;

  update public.contracts
     set status                 = 'draft',
         owner_signed_at        = null,
         collaborator_signed_at = null
   where id = p_contract_id
   returning * into c;

  insert into public.audit_log (actor_id, action, target_table, target_id, payload)
  values (v_actor, 'contract_declined', 'contracts', p_contract_id::text,
          jsonb_build_object('reason', coalesce(p_reason, '')));

  return c;
end;
$$;

revoke all on function public.decline_contract(uuid, text) from public, anon;
grant execute on function public.decline_contract(uuid, text) to authenticated;
