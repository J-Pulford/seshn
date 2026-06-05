-- Seshn — "download my data" (subject access export)
-- A single SECURITY DEFINER RPC that returns everything we hold about the
-- caller as one JSON document, scoped strictly to auth.uid(). Closes the
-- privacy TODO (account deletion already exists via delete_my_account()).
--
-- We export whole rows with to_jsonb(row) rather than naming columns, so the
-- export stays complete as the schema evolves and never breaks on a renamed
-- column. Everything returned is the caller's own data: their profile, the
-- gigs they own, applications they've sent, contracts/escrows they're a party
-- to, their connected accounts, the messages they've sent, and their
-- notifications. Email lives in auth.users and is intentionally not duplicated
-- here.

create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid    uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'exported_at', now(),
    'user_id',     uid,
    'profile',            (select to_jsonb(p)  from public.profiles p           where p.id = uid),
    'gigs',               (select coalesce(jsonb_agg(to_jsonb(g)),  '[]'::jsonb) from public.gigs g               where g.owner_id = uid),
    'applications',       (select coalesce(jsonb_agg(to_jsonb(a)),  '[]'::jsonb) from public.applications a       where a.applicant_id = uid),
    'contracts',          (select coalesce(jsonb_agg(to_jsonb(c)),  '[]'::jsonb) from public.contracts c          where c.owner_id = uid or c.collaborator_id = uid),
    'escrows',            (select coalesce(jsonb_agg(to_jsonb(e)),  '[]'::jsonb)
                             from public.escrows e
                             join public.contracts c on c.id = e.contract_id
                            where c.owner_id = uid or c.collaborator_id = uid),
    'connected_accounts', (select coalesce(jsonb_agg(to_jsonb(ca)), '[]'::jsonb) from public.connected_accounts ca where ca.user_id = uid),
    'messages_sent',      (select coalesce(jsonb_agg(to_jsonb(m)),  '[]'::jsonb) from public.messages m           where m.sender_id = uid),
    'notifications',      (select coalesce(jsonb_agg(to_jsonb(n)),  '[]'::jsonb) from public.notifications n       where n.user_id = uid)
  ) into result;

  return result;
end;
$$;

revoke all on function public.export_my_data() from public;
grant execute on function public.export_my_data() to authenticated;
