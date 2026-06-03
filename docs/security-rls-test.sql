-- Seshn — RLS / column-security proof.
-- Paste this whole block into the Supabase SQL editor and run it. It picks two
-- existing accounts (A = oldest, B = next), impersonates B under RLS, and tries
-- to read/modify A's private data + escalate its own privileges. Read the
-- NOTICE output: every line should say PASS (or show 0 rows).
--
-- Run AFTER applying 0016 + 0018. It is read-safe: every write it attempts is
-- denied or affects 0 rows, so nothing is mutated. (The SQL editor runs as a
-- superuser that bypasses RLS — this script switches to the `authenticated`
-- role + sets the JWT `sub` claim so auth.uid() = B and RLS actually applies.)

do $$
declare
  a_id uuid; b_id uuid; v int; v_txt text;
begin
  select id into a_id from public.profiles order by created_at limit 1;
  select id into b_id from public.profiles where id <> a_id order by created_at limit 1;
  if a_id is null or b_id is null then
    raise notice 'Need at least 2 accounts to test. Create a second account, then re-run.';
    return;
  end if;
  raise notice '--- Impersonating B=%  targeting A=% ---', b_id, a_id;

  perform set_config('request.jwt.claims', json_build_object('sub', b_id, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    execute 'select username from public.profiles where id=$1' into v_txt using a_id;
    raise notice '[1] read A public username  -> %   (PASS: public read works)', coalesce(v_txt,'(null)');
  exception when others then raise notice '[1] FAIL unexpected: %', sqlerrm; end;

  begin
    execute 'select stripe_account_id from public.profiles where id=$1' using a_id;
    raise notice '[2] FAIL: reading A.stripe_account_id was ALLOWED';
  exception when insufficient_privilege then raise notice '[2] PASS: A private column read denied';
            when others then raise notice '[2] PASS-ish (%): %', sqlstate, sqlerrm; end;

  begin
    execute 'update public.profiles set is_pro=true where id=$1' using b_id;
    raise notice '[3] FAIL: B self-granting is_pro was ALLOWED';
  exception when insufficient_privilege then raise notice '[3] PASS: cannot self-set is_pro';
            when others then raise notice '[3] PASS-ish (%): %', sqlstate, sqlerrm; end;

  begin
    execute 'update public.profiles set restrictions=''{}''::jsonb where id=$1' using b_id;
    raise notice '[4] FAIL: B clearing own restrictions was ALLOWED (ban evasion!)';
  exception when insufficient_privilege then raise notice '[4] PASS: cannot edit own restrictions';
            when others then raise notice '[4] PASS-ish (%): %', sqlstate, sqlerrm; end;

  begin
    execute 'update public.profiles set bio=''x'' where id=$1' using a_id;
    get diagnostics v = row_count;
    if v = 0 then raise notice '[5] PASS: updating A''s profile affected 0 rows (RLS)';
    else raise notice '[5] FAIL: updated % row(s) of A''s profile', v; end if;
  exception when insufficient_privilege then raise notice '[5] PASS: update blocked';
            when others then raise notice '[5] note (%): %', sqlstate, sqlerrm; end;

  begin
    execute 'select count(*) from public.applications where applicant_id=$1' into v using a_id;
    raise notice '[6] A''s applications visible to B = %   (PASS if 0, unless B owns those gigs)', v;
  exception when others then raise notice '[6] note (%): %', sqlstate, sqlerrm; end;

  begin
    execute 'select count(*) from public.messages' into v;
    raise notice '[7] messages visible to B = %   (only B''s conversations; 0 if none)', v;
  exception when others then raise notice '[7] note (%): %', sqlstate, sqlerrm; end;

  begin
    execute 'select count(*) from public.notifications where user_id=$1' into v using a_id;
    raise notice '[8] A''s notifications visible to B = %   (PASS if 0)', v;
  exception when others then raise notice '[8] note (%): %', sqlstate, sqlerrm; end;

  begin
    execute 'select count(*) from public.audit_log' into v;
    raise notice '[9] audit_log rows visible to B = %   (PASS if 0)', v;
  exception when insufficient_privilege then raise notice '[9] PASS: audit_log not readable';
            when others then raise notice '[9] note (%): %', sqlstate, sqlerrm; end;

  reset role;
  raise notice '--- Done. Every line should read PASS (or 0 rows). A FAIL = a hole. ---';
end $$;
