-- Seshn — gig lifecycle (close / reopen)
-- The gigs.status column already supports 'closed'. The remaining piece is
-- allowing applicants to still read a gig once its owner closes it, so their
-- application history and the gig page don't go blank.
--
-- The applications.insert policy already requires gig.status='open', so this
-- read-side relaxation doesn't open up any new write paths.

drop policy if exists "Open gigs visible to everyone" on public.gigs;

create policy "Gigs visible to public, owner, or applicants"
  on public.gigs for select
  using (
    status = 'open'
    or owner_id = auth.uid()
    or id in (select gig_id from public.applications where applicant_id = auth.uid())
  );
