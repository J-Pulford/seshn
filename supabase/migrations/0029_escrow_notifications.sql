-- Seshn — escrow notifications
-- Extend the bell feed to cover the money milestones the SOP describes
-- (docs/sops/08-contracts-escrow.md: "bell notification on each state change").
-- An escrow's status is the source of truth, and it flips from several places —
-- the Stripe webhook (funded / released via the service role), the mark_delivered
-- RPC (collaborator), the cron sweep (refund / auto-release). Rather than dot
-- notification inserts across all of those, a single AFTER UPDATE trigger on
-- public.escrows fires for every transition regardless of who caused it.

-- Carry contract + escrow references so the bell can deep-link to /contract/[id]
-- and the row survives joins. (gig_id is also set so the existing gig-title join
-- lights up the notification text.)
alter table public.notifications
  add column if not exists contract_id uuid references public.contracts(id) on delete cascade,
  add column if not exists escrow_id   uuid references public.escrows(id)   on delete cascade;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'application_received',
  'application_accepted',
  'application_rejected',
  'message_received',
  'meeting_proposed',
  'meeting_updated',
  'meeting_confirmed',
  'meeting_declined',
  'meeting_cancelled',
  'escrow_funded',
  'escrow_delivered',
  'escrow_released',
  'escrow_refunded',
  'escrow_disputed'
));

-- Who hears about each transition:
--   funded    → collaborator (owner paid; you're clear to start)
--   delivered → owner        (collaborator says it's done; approve to release)
--   released  → collaborator (you've been paid)
--   refunded  → owner        (money came back)
--   disputed  → both parties (it's under review)
-- actor_id is auth.uid(), which is null for service-role writes (webhook / cron);
-- the bell copy for escrow kinds doesn't depend on the actor, so that's fine.
create or replace function public.tg_notify_escrow()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  c     public.contracts;
begin
  if tg_op <> 'UPDATE' then return new; end if;
  if new.status is not distinct from old.status then return new; end if;

  select * into c from public.contracts where id = new.contract_id;
  if not found then return new; end if;

  if new.status = 'funded' then
    insert into public.notifications (user_id, kind, actor_id, gig_id, contract_id, escrow_id)
    values (c.collaborator_id, 'escrow_funded', actor, c.gig_id, c.id, new.id);
  elsif new.status = 'delivered' then
    insert into public.notifications (user_id, kind, actor_id, gig_id, contract_id, escrow_id)
    values (c.owner_id, 'escrow_delivered', actor, c.gig_id, c.id, new.id);
  elsif new.status = 'released' then
    insert into public.notifications (user_id, kind, actor_id, gig_id, contract_id, escrow_id)
    values (c.collaborator_id, 'escrow_released', actor, c.gig_id, c.id, new.id);
  elsif new.status = 'refunded' then
    insert into public.notifications (user_id, kind, actor_id, gig_id, contract_id, escrow_id)
    values (c.owner_id, 'escrow_refunded', actor, c.gig_id, c.id, new.id);
  elsif new.status = 'disputed' then
    insert into public.notifications (user_id, kind, actor_id, gig_id, contract_id, escrow_id)
    values (c.owner_id,        'escrow_disputed', actor, c.gig_id, c.id, new.id),
           (c.collaborator_id, 'escrow_disputed', actor, c.gig_id, c.id, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists escrows_notify on public.escrows;
create trigger escrows_notify
  after update on public.escrows
  for each row execute function public.tg_notify_escrow();
