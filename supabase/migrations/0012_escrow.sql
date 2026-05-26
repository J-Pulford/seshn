-- Seshn — escrow v1 schema
-- Foundation for the contracted-collaboration flow: an owner and a
-- collaborator agree to terms, both click-sign a per-deal contract
-- PDF, the owner funds an escrow held by Stripe Connect, the
-- collaborator delivers, and funds release either on owner approval
-- or after an approval window elapses.
--
-- Signing model: click-sign, not third-party e-sign. The PDF is
-- generated server-side from a template; each party hits "I agree"
-- and the system records timestamp + IP + user-agent + PDF hash
-- in audit_log (action='contract_signed'). This matches the Fiverr /
-- Upwork / SoundBetter pattern and is legally valid as an electronic
-- signature under the AU Electronic Transactions Act 1999 and US
-- ESIGN Act (authentication + intent + record retention). The
-- contracts.signing_provider_ref column is reserved for a future
-- high-value path that may route through DocuSign or similar.
--
-- This migration only lays down the data model. It does not enable
-- realtime, does not wire any payment processor, and does not yet
-- enforce restrictions on gigs/applications RLS — those land in a
-- follow-up once Stripe + e-sign credentials exist and we're ready
-- to flip the feature on.
--
-- Money is stored in minor units (cents) as bigint. Floats are never
-- used for currency. Currency is a free-text ISO 4217 code; default
-- is 'AUD' since the platform entity is Seshn Pty Ltd, but per-deal
-- contracts can specify USD or anything else Stripe Connect supports.


-- ──── Profile additions ────────────────────────────────────────────
-- Stripe Connect identity, locale, soft-ban state, GDPR/APP delete flag.

alter table public.profiles
  add column stripe_account_id        text,
  add column stripe_account_status    text check (
    stripe_account_status is null
    or stripe_account_status in ('pending', 'verified', 'restricted')
  ),
  add column stripe_country           text check (
    stripe_country is null or stripe_country ~ '^[A-Z]{2}$'
  ),
  add column locale                   text not null default 'en-AU',
  add column deletion_requested_at    timestamptz,
  add column restrictions             jsonb not null default '{}'::jsonb;

-- Restrictions shape:
--   { "cannot_post_until":  "2026-06-20T00:00:00Z",
--     "cannot_apply_until": "9999-12-31T00:00:00Z",  -- permanent ban
--     "cannot_pay_until":   "2026-06-20T00:00:00Z" }
-- A key being absent or its timestamp being in the past = not restricted.
-- This format lets RLS read a single jsonb field per request instead of
-- joining to an events table on every check.

create index profiles_stripe_account_idx on public.profiles (stripe_account_id)
  where stripe_account_id is not null;


-- ──── Contracts ────────────────────────────────────────────────────
-- One contract per accepted application (1:1 enforced via unique).
-- Terms live in a jsonb blob because they evolve faster than DDL: split
-- percentages, credits, deliverable types, deadlines all change shape
-- as the product learns. The PDF generated from these terms is the
-- legally binding artifact; the row is just our queryable mirror.

create table public.contracts (
  id                       uuid primary key default gen_random_uuid(),
  gig_id                   uuid not null references public.gigs(id) on delete restrict,
  application_id           uuid not null unique references public.applications(id) on delete restrict,
  owner_id                 uuid not null references public.profiles(id) on delete restrict,
  collaborator_id          uuid not null references public.profiles(id) on delete restrict,
  status                   text not null default 'draft' check (status in (
                             'draft',                -- owner is editing terms
                             'awaiting_signatures',  -- sent to e-sign, neither party signed yet
                             'active',               -- both signed; escrow takes over
                             'completed',            -- escrow released
                             'cancelled'             -- voided pre-funding
                           )),
  terms                    jsonb not null default '{}'::jsonb,
  -- Expected terms shape:
  --   { "fee_cents": 50000,
  --     "currency": "AUD",
  --     "master_split":     { "owner": 50, "collaborator": 50 },
  --     "publishing_split": { "owner": 50, "collaborator": 50 },
  --     "credits": "Produced by X. Co-written by Y.",
  --     "deliverable_kind": "audio_stem",
  --     "deliver_by": "2026-07-01",
  --     "approval_window_days": 7 }
  governing_law            text not null default 'AU-NSW',
  language                 text not null default 'en',
  signing_provider_ref     text,       -- null in v1 (click-sign, audit trail in audit_log).
                                       -- Reserved for a future high-value path that routes
                                       -- through DocuSign/Dropbox Sign and stores the
                                       -- envelope ID here.
  pdf_url                  text,
  owner_signed_at          timestamptz,
  collaborator_signed_at   timestamptz,
  fully_signed_at          timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (owner_id <> collaborator_id)
);

create index contracts_owner_idx        on public.contracts (owner_id);
create index contracts_collaborator_idx on public.contracts (collaborator_id);
create index contracts_gig_idx          on public.contracts (gig_id);
create index contracts_status_idx       on public.contracts (status);

create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.tg_set_updated_at();


-- ──── Escrows ──────────────────────────────────────────────────────
-- One escrow per contract (1:1). Lifecycle:
--   awaiting_funds → funded → delivered → released
--                       │           │
--                       │           └─→ disputed (manual review)
--                       └─→ refunded (deadline missed before delivery)
--                       └─→ cancelled (contract voided before delivery)
-- Funding state is authoritative from Stripe; we mirror it via webhook.

create table public.escrows (
  id                          uuid primary key default gen_random_uuid(),
  contract_id                 uuid not null unique references public.contracts(id) on delete restrict,
  status                      text not null default 'awaiting_funds' check (status in (
                                'awaiting_funds',
                                'funded',
                                'delivered',
                                'released',
                                'refunded',
                                'disputed',
                                'cancelled'
                              )),
  amount_cents                bigint not null check (amount_cents > 0),
  currency                    text not null check (currency ~ '^[A-Z]{3}$'),
  platform_fee_cents          bigint not null default 0 check (platform_fee_cents >= 0),
  stripe_payment_intent_id    text,
  stripe_transfer_id          text,
  funded_at                   timestamptz,
  delivered_at                timestamptz,
  released_at                 timestamptz,
  auto_release_at             timestamptz,    -- set when delivered; cron releases when now() crosses
  deadline_at                 timestamptz,    -- collaborator must deliver before this
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index escrows_status_idx       on public.escrows (status);
-- Partial indexes for the two cron sweeps:
create index escrows_auto_release_due_idx on public.escrows (auto_release_at)
  where status = 'delivered';
create index escrows_deadline_due_idx     on public.escrows (deadline_at)
  where status = 'funded';

create trigger escrows_set_updated_at
  before update on public.escrows
  for each row execute function public.tg_set_updated_at();


-- ──── Deliverables ─────────────────────────────────────────────────
-- The collaborator can submit multiple files / links / notes against
-- a single escrow. The escrow flips to 'delivered' on the first row
-- (handled in app code, not a trigger, so the collaborator can choose
-- when they're "done" rather than every upload prematurely starting
-- the approval clock).

create table public.deliverables (
  id              uuid primary key default gen_random_uuid(),
  escrow_id       uuid not null references public.escrows(id) on delete cascade,
  kind            text not null check (kind in ('audio_stem', 'doc', 'link', 'note')),
  file_url        text,
  file_meta       jsonb not null default '{}'::jsonb,
  note            text default '' check (char_length(note) <= 4000),
  submitted_at    timestamptz not null default now(),
  check (file_url is not null or kind = 'note')
);

create index deliverables_escrow_idx on public.deliverables (escrow_id, submitted_at desc);


-- ──── Disputes ─────────────────────────────────────────────────────
-- Either party can open a dispute during the approval window. v1 has
-- no in-app mediation UI; opening a dispute pauses the auto-release
-- timer and sends the case to support@ via app code.

create table public.disputes (
  id              uuid primary key default gen_random_uuid(),
  escrow_id       uuid not null references public.escrows(id) on delete restrict,
  opened_by       uuid not null references public.profiles(id) on delete restrict,
  reason          text not null check (char_length(reason) between 10 and 4000),
  evidence        jsonb not null default '{}'::jsonb,
  status          text not null default 'open' check (status in (
                    'open',
                    'resolved_release',   -- funds go to collaborator
                    'resolved_refund',    -- funds back to owner
                    'resolved_split',     -- partial release; resolution.split holds detail
                    'withdrawn'
                  )),
  resolution      jsonb,
  opened_at       timestamptz not null default now(),
  resolved_at     timestamptz
);

create index disputes_escrow_idx       on public.disputes (escrow_id);
create index disputes_open_idx         on public.disputes (opened_at desc) where status = 'open';


-- ──── Restriction events ───────────────────────────────────────────
-- Audit trail behind profiles.restrictions. Every soft/hard ban writes
-- a row here so we can answer "why was I restricted?" and "when does
-- it expire?" The jsonb on profiles is the fast-read mirror; this is
-- the durable history.

create table public.restriction_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  action          text not null check (action in (
                    'cannot_post',
                    'cannot_apply',
                    'cannot_pay',
                    'cleared'
                  )),
  reason          text not null,
  until           timestamptz,          -- null = permanent for ban actions; ignored for 'cleared'
  escrow_id       uuid references public.escrows(id) on delete set null,
  actor           text not null default 'system' check (actor in ('system', 'support')),
  created_at      timestamptz not null default now()
);

create index restriction_events_user_idx on public.restriction_events (user_id, created_at desc);


-- ──── Audit log ────────────────────────────────────────────────────
-- Generic append-only log written by app code at security-sensitive
-- transitions (contract signed, escrow funded, funds released,
-- dispute opened, restriction applied). Used for:
--   - GDPR/APP subject access requests
--   - Dispute evidence
--   - Internal investigations
-- Not enabled for realtime; not user-readable via RLS.

create table public.audit_log (
  id              bigserial primary key,
  actor_id        uuid references public.profiles(id) on delete set null,
  action          text not null,
  target_table    text not null,
  target_id       text,
  payload         jsonb not null default '{}'::jsonb,
  ip              inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index audit_log_actor_idx  on public.audit_log (actor_id, created_at desc);
create index audit_log_target_idx on public.audit_log (target_table, target_id);


-- ──── Row-level security ───────────────────────────────────────────

alter table public.contracts          enable row level security;
alter table public.escrows            enable row level security;
alter table public.deliverables       enable row level security;
alter table public.disputes           enable row level security;
alter table public.restriction_events enable row level security;
alter table public.audit_log          enable row level security;


-- ── contracts ──
-- Visible to owner and collaborator. The owner drafts and edits while
-- status='draft'. Status transitions beyond 'draft' go through
-- security-definer functions in later migrations (sign, fund, etc.).

create policy "Contracts visible to participants"
  on public.contracts for select
  using (owner_id = auth.uid() or collaborator_id = auth.uid());

create policy "Owners can create contracts on their accepted applications"
  on public.contracts for insert
  with check (
    owner_id = auth.uid()
    and application_id in (
      select a.id from public.applications a
      join public.gigs g on g.id = a.gig_id
      where g.owner_id = auth.uid()
        and a.status = 'accepted'
        and a.applicant_id = collaborator_id
    )
  );

create policy "Owners can edit draft contracts"
  on public.contracts for update
  using (owner_id = auth.uid() and status = 'draft')
  with check (owner_id = auth.uid() and status in ('draft', 'awaiting_signatures', 'cancelled'));


-- ── escrows ──
-- Read-only for participants. All writes happen via security-definer
-- functions called from Stripe webhook handlers and the cron sweep.

create policy "Escrows visible to contract participants"
  on public.escrows for select
  using (
    contract_id in (
      select id from public.contracts
      where owner_id = auth.uid() or collaborator_id = auth.uid()
    )
  );


-- ── deliverables ──
-- Visible to both participants. The collaborator inserts; nobody
-- updates or deletes (deliverables are immutable evidence).

create policy "Deliverables visible to contract participants"
  on public.deliverables for select
  using (
    escrow_id in (
      select e.id from public.escrows e
      join public.contracts c on c.id = e.contract_id
      where c.owner_id = auth.uid() or c.collaborator_id = auth.uid()
    )
  );

create policy "Collaborator can submit deliverables on funded escrows"
  on public.deliverables for insert
  with check (
    escrow_id in (
      select e.id from public.escrows e
      join public.contracts c on c.id = e.contract_id
      where c.collaborator_id = auth.uid()
        and e.status in ('funded', 'delivered')
    )
  );


-- ── disputes ──
-- Either participant can open a dispute on their own escrow when it's
-- in a disputable state. Resolution goes through security-definer.

create policy "Disputes visible to participants"
  on public.disputes for select
  using (
    escrow_id in (
      select e.id from public.escrows e
      join public.contracts c on c.id = e.contract_id
      where c.owner_id = auth.uid() or c.collaborator_id = auth.uid()
    )
  );

create policy "Participants can open disputes on their escrows"
  on public.disputes for insert
  with check (
    opened_by = auth.uid()
    and escrow_id in (
      select e.id from public.escrows e
      join public.contracts c on c.id = e.contract_id
      where (c.owner_id = auth.uid() or c.collaborator_id = auth.uid())
        and e.status in ('funded', 'delivered')
    )
  );


-- ── restriction_events ──
-- Users can read their own history. No client writes.

create policy "Users can read their own restriction events"
  on public.restriction_events for select
  using (user_id = auth.uid());


-- ── audit_log ──
-- No public access. Reads via service role only.
-- (No policies created = no rows accessible under RLS.)
