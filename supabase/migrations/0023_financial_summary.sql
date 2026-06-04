-- Seshn — financial summary RPC for the in-app finances dashboard.
--
-- Escrows and contracts are RLS-restricted to their participants, so a member
-- can already read their own rows. This function exists to do the aggregation
-- server-side in one round trip (and so we never pull every row to the client
-- just to sum it), following the same SECURITY DEFINER pattern as
-- public_profile_stats() in 0022.
--
-- All money is bigint cents (see 0012). We treat escrows.amount_cents as the
-- total charged to the payer and escrows.platform_fee_cents as Seshn's cut, so
-- the collaborator's take-home on a released deal is (amount - platform_fee).
-- Figures are grouped by currency because a member may transact in more than
-- one; the client picks a primary currency from the returned array.
--
-- Idempotent.

create or replace function public.my_financial_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid    uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    return jsonb_build_object('authenticated', false);
  end if;

  with mine as (
    select e.amount_cents,
           e.platform_fee_cents,
           e.currency,
           e.status,
           c.owner_id,
           c.collaborator_id
      from public.escrows e
      join public.contracts c on c.id = e.contract_id
     where c.owner_id = uid or c.collaborator_id = uid
  ),
  by_cur as (
    select currency,
      coalesce(sum(case when collaborator_id = uid and status = 'released'
                        then amount_cents - platform_fee_cents else 0 end), 0) as earned_cents,
      coalesce(sum(case when collaborator_id = uid and status in ('funded', 'delivered')
                        then amount_cents - platform_fee_cents else 0 end), 0) as pending_cents,
      coalesce(sum(case when owner_id = uid and status in ('funded', 'delivered', 'released')
                        then amount_cents else 0 end), 0) as spent_cents,
      coalesce(sum(case when collaborator_id = uid and status = 'released'
                        then platform_fee_cents else 0 end), 0) as fees_cents,
      count(*) filter (where collaborator_id = uid and status = 'released') as paid_deals
      from mine
     group by currency
  )
  select jsonb_build_object(
    'authenticated', true,
    'currencies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'currency',      currency,
        'earned_cents',  earned_cents,
        'pending_cents', pending_cents,
        'spent_cents',   spent_cents,
        'fees_cents',    fees_cents,
        'paid_deals',    paid_deals
      ) order by (earned_cents + pending_cents + spent_cents) desc)
      from by_cur
    ), '[]'::jsonb),
    'active_contracts', (
      select count(*) from public.contracts
       where (owner_id = uid or collaborator_id = uid) and status = 'active'
    ),
    'completed_deals', (
      select count(*) from public.contracts
       where (owner_id = uid or collaborator_id = uid) and status = 'completed'
    ),
    'total_deals', (
      select count(*) from public.contracts
       where (owner_id = uid or collaborator_id = uid)
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.my_financial_summary() from public;
grant execute on function public.my_financial_summary() to authenticated;
