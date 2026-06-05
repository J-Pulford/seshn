-- Seshn — Help board seeder
-- One-shot, staff-only RPC that posts a handful of starter threads (with staff
-- answers) so the community board isn't a ghost town on day one. Threads are
-- authored by the calling staff member; the bodies cross-link to the Get Started
-- tour and the best-practices guides. Idempotent: does nothing once the board
-- has any content. Trigger a staff member from the Help page ("Seed starter
-- posts" button) after setting profiles.is_staff = true.

create or replace function public.seed_help_threads()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid      uuid := auth.uid();
  t_escrow uuid;
  t_apply  uuid;
  t_bug    uuid;
  n        int := 0;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if not public.current_user_is_staff() then
    raise exception 'Staff only' using errcode = '42501';
  end if;
  if (select count(*) from public.help_threads) > 0 then
    return 0;  -- board already has content — don't duplicate
  end if;

  -- 1. Welcome (pinned)
  insert into public.help_threads (author_id, category, title, body, pinned) values (
    uid, 'general', '👋 Start here — welcome to the Seshn community',
    E'Welcome! This board is where you ask questions, report bugs, share feedback, and request features — out in the open. The Seshn team replies here, and so does the community.\n\nA few pointers to get going fast:\n• New to the platform? Take the 60-second tour at /start\n• Want to get booked more / write better briefs? Read the playbooks at /guides\n• Hit a bug or got stuck? Post it here with the "Bug" or "Question" tag.\n\nGlad you''re here. Let''s make some records.',
    true
  );
  n := n + 1;

  -- 2. Escrow Q&A (with staff answer → auto-marks answered)
  insert into public.help_threads (author_id, category, title, body) values (
    uid, 'question', 'How does escrow protect me?',
    E'I''m about to take on my first paid collaboration through Seshn. How does the money side actually work, and how do I know I''ll get paid?'
  ) returning id into t_escrow;
  n := n + 1;
  insert into public.help_replies (thread_id, author_id, body) values (
    t_escrow, uid,
    E'Great question — escrow is the whole point.\n\n1. The owner funds the agreed fee up front. The money is held safely by Seshn (via Stripe) — not paid out yet.\n2. You do the work knowing the funds are already secured.\n3. When you mark it delivered, the owner approves and the funds release to you. If they go quiet, it auto-releases after the approval window.\n\nYou keep 90% on a paid booking — the flat 10% already covers card processing, so no surprise fees. Full detail in the guide: /guides#pricing-and-pay\n\nOne tip: connect your payout account in Settings before you start, or an owner can''t fund a deal to you.'
  );

  -- 3. Applications Q&A (with staff answer)
  insert into public.help_threads (author_id, category, title, body) values (
    uid, 'question', 'How do I get my application accepted?',
    E'I''m applying to briefs but not hearing back. What actually makes an owner say yes?'
  ) returning id into t_apply;
  n := n + 1;
  insert into public.help_replies (thread_id, author_id, body) values (
    t_apply, uid,
    E'Owners skim fast and judge on signal. The biggest levers:\n\n• Lead with one link that directly fits the brief — same genre and role.\n• Reference the actual brief (role, deadline) so they know you read it.\n• Say plainly that you can hit the deadline — reliability is the #1 worry.\n• Keep it to three sharp sentences, and apply early.\n\nThe full playbook is here: /guides#win-applications'
  );

  -- 4. Bug-reporting guidance (with staff answer)
  insert into public.help_threads (author_id, category, title, body) values (
    uid, 'bug', 'Found a bug? Here''s how to report it well',
    E'If something''s broken, post it here as a "Bug". The more detail, the faster we can fix it.'
  ) returning id into t_bug;
  n := n + 1;
  insert into public.help_replies (thread_id, author_id, body) values (
    t_bug, uid,
    E'A great bug report has three things:\n1. What you did (the steps).\n2. What happened.\n3. What you expected to happen instead.\n\nScreenshots and your browser/device help a lot. We read every one — thank you for making Seshn better.'
  );

  -- 5. Feature requests (pinned, stays open for the community)
  insert into public.help_threads (author_id, category, title, body, pinned) values (
    uid, 'feature_request', 'Feature requests — drop your ideas here',
    E'Seshn is built in the open, and the roadmap is shaped by you. Got an idea? Post it as its own "Feature request" thread, or comment here. Tell us the problem you''re hitting, not just the solution — it helps us build the right thing.',
    true
  );
  n := n + 1;

  return n;
end;
$$;

revoke all on function public.seed_help_threads() from public;
grant execute on function public.seed_help_threads() to authenticated;
