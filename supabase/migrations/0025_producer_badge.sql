-- Producer mode easter egg: a fun, self-earned badge shown next to a member's
-- name once they crack the Konami code on the site.

alter table public.profiles
  add column if not exists has_producer_badge boolean not null default false;

-- Publicly readable (so the badge renders on profiles/feed), but — like is_pro —
-- NOT directly writable by users via the normal update grants.
grant select (has_producer_badge) on public.profiles to anon, authenticated;

-- Let a signed-in user grant *only* this harmless cosmetic flag to themselves.
-- SECURITY DEFINER scopes the write to auth.uid(), so it can't be used to set
-- any other column or touch anyone else's row.
create or replace function public.unlock_producer_badge()
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set has_producer_badge = true
   where id = auth.uid()
  returning has_producer_badge;
$$;

revoke all on function public.unlock_producer_badge() from public, anon;
grant execute on function public.unlock_producer_badge() to authenticated;
