-- Seshn — applications schema
-- One row = one applicant pitching themselves for one gig.
-- A given user can apply at most once per gig (UNIQUE).

create table public.applications (
  id              uuid primary key default gen_random_uuid(),
  gig_id          uuid not null references public.gigs(id) on delete cascade,
  applicant_id    uuid not null references public.profiles(id) on delete cascade,
  pitch           text not null check (char_length(pitch) between 10 and 2000),
  attachment_url  text check (attachment_url is null or char_length(attachment_url) <= 500),
  status          text not null default 'pending'
                    check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (gig_id, applicant_id)
);

create index applications_gig_idx        on public.applications (gig_id);
create index applications_applicant_idx  on public.applications (applicant_id);
create index applications_status_idx     on public.applications (status);
create index applications_created_idx    on public.applications (created_at desc);

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.tg_set_updated_at();

alter table public.applications enable row level security;

-- SELECT: the applicant and the gig owner can see the row. No one else.
create policy "Applications visible to applicant or gig owner"
  on public.applications for select
  using (
    applicant_id = auth.uid()
    or gig_id in (select id from public.gigs where owner_id = auth.uid())
  );

-- INSERT: only the applicant can create their own application, and only on
-- somebody else's open gig (no self-applying, no applying to closed gigs).
create policy "Authenticated users can apply to others' open gigs"
  on public.applications for insert
  with check (
    applicant_id = auth.uid()
    and gig_id in (select id from public.gigs where owner_id <> auth.uid() and status = 'open')
  );

-- UPDATE (applicant): can only withdraw their own application.
create policy "Applicants can withdraw their own application"
  on public.applications for update
  using (applicant_id = auth.uid())
  with check (applicant_id = auth.uid() and status = 'withdrawn');

-- UPDATE (owner): can accept/reject/reopen applications to their gigs.
create policy "Owners can decide on applications to their gigs"
  on public.applications for update
  using (gig_id in (select id from public.gigs where owner_id = auth.uid()))
  with check (
    gig_id in (select id from public.gigs where owner_id = auth.uid())
    and status in ('pending', 'accepted', 'rejected')
  );

-- No DELETE: applications are immutable once submitted; use status='withdrawn' instead.
