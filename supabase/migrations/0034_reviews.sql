-- Seshn — reviews & star ratings
-- After a collaboration completes (escrow released → contract 'completed'),
-- either party can leave the other a 1–5 star rating and a written testimonial.
-- Reviews are public and surface on the reviewee's profile; the reviewee is
-- notified. One review per party per contract.

create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  contract_id  uuid not null references public.contracts(id) on delete cascade,
  reviewer_id  uuid not null references public.profiles(id) on delete cascade,
  reviewee_id  uuid not null references public.profiles(id) on delete cascade,
  rating       int  not null check (rating between 1 and 5),
  body         text not null default '' check (char_length(body) <= 2000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (contract_id, reviewer_id),     -- one review per party per contract
  check (reviewer_id <> reviewee_id)
);
create index reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);
create index reviews_contract_idx on public.reviews (contract_id);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.tg_set_updated_at();

-- ──── RLS ──────────────────────────────────────────────────────────
alter table public.reviews enable row level security;

create policy "Reviews are public" on public.reviews for select using (true);

-- Insert only: by a party, on a COMPLETED contract, about the counterparty.
create policy "Parties review the counterparty on completed contracts"
  on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and reviewer_id <> reviewee_id
    and exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and c.status = 'completed'
        and (
          (c.owner_id = auth.uid() and c.collaborator_id = reviewee_id)
          or (c.collaborator_id = auth.uid() and c.owner_id = reviewee_id)
        )
    )
  );

create policy "Authors edit their own reviews"
  on public.reviews for update
  using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());
create policy "Authors delete their own reviews"
  on public.reviews for delete
  using (reviewer_id = auth.uid());

-- ──── Profile stats — fold in the rating ───────────────────────────
create or replace function public.public_profile_stats(p_uid uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'gigs_posted', (
      select count(*) from public.gigs
       where owner_id = p_uid and status <> 'draft'
    ),
    'collaborations', (
      select count(*) from public.contracts
       where fully_signed_at is not null
         and (owner_id = p_uid or collaborator_id = p_uid)
    ),
    'rating_avg', (
      select round(avg(rating)::numeric, 2) from public.reviews where reviewee_id = p_uid
    ),
    'rating_count', (
      select count(*) from public.reviews where reviewee_id = p_uid
    )
  )
$$;
revoke all on function public.public_profile_stats(uuid) from public;
grant execute on function public.public_profile_stats(uuid) to anon, authenticated;

-- ──── Notifications wiring ─────────────────────────────────────────
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'application_received', 'application_accepted', 'application_rejected',
  'message_received',
  'meeting_proposed', 'meeting_updated', 'meeting_confirmed', 'meeting_declined', 'meeting_cancelled',
  'escrow_funded', 'escrow_delivered', 'escrow_released', 'escrow_refunded', 'escrow_disputed',
  'help_reply',
  'review_received'
));

create or replace function public.tg_notify_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  select gig_id into g from public.contracts where id = new.contract_id;
  insert into public.notifications (user_id, kind, actor_id, gig_id, contract_id)
  values (new.reviewee_id, 'review_received', new.reviewer_id, g, new.contract_id);
  return new;
end; $$;

create trigger reviews_notify
  after insert on public.reviews
  for each row execute function public.tg_notify_review();
