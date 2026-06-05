-- Seshn — Help & community board
-- A public, threaded support/community forum: members post threads (questions,
-- bug reports, feedback, feature requests), anyone can reply, and Seshn staff
-- replies are badged. Threads auto-flip to 'answered' when staff respond. The
-- thread author is notified on every reply from someone else.

-- Staff flag — set manually for founders/support:
--   update public.profiles set is_staff = true where username = '<you>';
alter table public.profiles add column is_staff boolean not null default false;

-- SECURITY DEFINER staff check used in policies (avoids exposing is_staff via
-- column grants and avoids RLS recursion on profiles).
create or replace function public.current_user_is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_staff from public.profiles where id = auth.uid()), false);
$$;

-- ──── Threads ──────────────────────────────────────────────────────
create table public.help_threads (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references public.profiles(id) on delete cascade,
  category         text not null check (category in ('question', 'bug', 'feedback', 'feature_request', 'general')),
  title            text not null check (char_length(title) between 3 and 160),
  body             text not null check (char_length(body) between 1 and 8000),
  status           text not null default 'open' check (status in ('open', 'answered', 'closed')),
  pinned           boolean not null default false,
  reply_count      int not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index help_threads_activity_idx on public.help_threads (pinned desc, last_activity_at desc);
create index help_threads_category_idx on public.help_threads (category, last_activity_at desc);
create index help_threads_author_idx   on public.help_threads (author_id, created_at desc);

create trigger help_threads_set_updated_at
  before update on public.help_threads
  for each row execute function public.tg_set_updated_at();

-- ──── Replies ──────────────────────────────────────────────────────
create table public.help_replies (
  id             uuid primary key default gen_random_uuid(),
  thread_id      uuid not null references public.help_threads(id) on delete cascade,
  author_id      uuid not null references public.profiles(id) on delete cascade,
  body           text not null check (char_length(body) between 1 and 8000),
  is_staff_reply boolean not null default false,
  created_at     timestamptz not null default now()
);
create index help_replies_thread_idx on public.help_replies (thread_id, created_at);

-- Stamp is_staff_reply from the author's profile (can't be spoofed by the client).
create or replace function public.tg_help_reply_before()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.is_staff_reply := coalesce((select is_staff from public.profiles where id = new.author_id), false);
  return new;
end; $$;
create trigger help_replies_before_insert
  before insert on public.help_replies
  for each row execute function public.tg_help_reply_before();

-- Maintain thread counters/activity, auto-answer on staff reply, and notify the
-- thread author when someone else replies.
create or replace function public.tg_help_reply_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare th public.help_threads;
begin
  update public.help_threads
     set reply_count      = reply_count + 1,
         last_activity_at = now(),
         status           = case when new.is_staff_reply and status = 'open' then 'answered' else status end
   where id = new.thread_id
   returning * into th;

  if th.author_id is not null and th.author_id <> new.author_id then
    insert into public.notifications (user_id, kind, actor_id, help_thread_id)
    values (th.author_id, 'help_reply', new.author_id, new.thread_id);
  end if;
  return new;
end; $$;
create trigger help_replies_after_insert
  after insert on public.help_replies
  for each row execute function public.tg_help_reply_after();

-- ──── Notifications wiring ─────────────────────────────────────────
alter table public.notifications
  add column if not exists help_thread_id uuid references public.help_threads(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'application_received', 'application_accepted', 'application_rejected',
  'message_received',
  'meeting_proposed', 'meeting_updated', 'meeting_confirmed', 'meeting_declined', 'meeting_cancelled',
  'escrow_funded', 'escrow_delivered', 'escrow_released', 'escrow_refunded', 'escrow_disputed',
  'help_reply'
));

-- ──── RLS ──────────────────────────────────────────────────────────
alter table public.help_threads enable row level security;
alter table public.help_replies enable row level security;

-- Public read (support content is open + good for SEO).
create policy "Help threads are public" on public.help_threads for select using (true);
create policy "Help replies are public" on public.help_replies for select using (true);

-- Authors create their own threads/replies.
create policy "Members can post threads" on public.help_threads for insert with check (author_id = auth.uid());
create policy "Members can post replies" on public.help_replies for insert with check (author_id = auth.uid());

-- Authors edit/delete their own; staff can moderate anything (pin, close, remove).
create policy "Authors or staff edit threads" on public.help_threads for update
  using (author_id = auth.uid() or public.current_user_is_staff())
  with check (author_id = auth.uid() or public.current_user_is_staff());
create policy "Authors or staff delete threads" on public.help_threads for delete
  using (author_id = auth.uid() or public.current_user_is_staff());
create policy "Authors or staff edit replies" on public.help_replies for update
  using (author_id = auth.uid() or public.current_user_is_staff())
  with check (author_id = auth.uid() or public.current_user_is_staff());
create policy "Authors or staff delete replies" on public.help_replies for delete
  using (author_id = auth.uid() or public.current_user_is_staff());

-- ──── Realtime — live thread view ──────────────────────────────────
alter publication supabase_realtime add table public.help_replies;
alter publication supabase_realtime add table public.help_threads;
