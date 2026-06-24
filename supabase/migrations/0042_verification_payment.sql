-- Seshn — the one-time $49 verification fee.
--
-- Adds payment tracking to verification applications and tightens who may write
-- the row. Payment is taken via Stripe Checkout; the webhook (service role)
-- stamps payment_status. Decisions still run through
-- review_verification_application() (0041, SECURITY DEFINER). The applicant may
-- now ONLY withdraw — never write payment/review columns themselves.

alter table public.verification_applications
  add column if not exists payment_status          text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded')),
  add column if not exists paid_at                  timestamptz,
  add column if not exists amount_paid_cents        int,
  add column if not exists currency                 text,
  add column if not exists stripe_payment_intent_id text;

-- Queue ordering for staff: paid + pending first.
create index if not exists verification_apps_paid_pending_idx
  on public.verification_applications (created_at desc)
  where status = 'pending' and payment_status = 'paid';

-- ──── Lock down applicant writes ───────────────────────────────────
-- Previously the UPDATE policy let an applicant write ANY column on their own
-- row (it existed only so they could withdraw). With a payment_status column
-- that's a hole — a user could mark themselves paid. Fix at two layers:
--   1) column privilege: authenticated may only UPDATE the status column;
--   2) RLS WITH CHECK: an applicant's only legal status write is 'withdrawn'.
-- Payment writes come from the webhook (service_role, bypasses both); staff
-- decisions from the definer function (runs as owner, bypasses both).
revoke update on public.verification_applications from authenticated;
grant update (status) on public.verification_applications to authenticated;

drop policy if exists "Applicant or staff can update verification application" on public.verification_applications;
create policy "Applicant or staff can update verification application"
  on public.verification_applications for update to authenticated
  using (user_id = auth.uid() or public.current_user_is_staff())
  with check (
    (user_id = auth.uid() and status = 'withdrawn')
    or public.current_user_is_staff()
  );
