// Seshn — shared Supabase client + helpers.
// Depends on the Supabase UMD bundle being loaded first (window.supabase).

(function () {
  var SUPABASE_URL = "https://qatauoaqbplgsikzzxak.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhdGF1b2FxYnBsZ3Npa3p6eGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzM1OTMsImV4cCI6MjA5NDYwOTU5M30.95QE3GsG6HA3X3LNICqtwz46YrZ4bKHl9BqkH95smLw";

  if (!window.supabase || !window.supabase.createClient) {
    console.error("[seshn] Supabase UMD bundle missing — load https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2 before this script.");
    return;
  }

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.sb = sb;

  // ── helpers ───────────────────────────────────────────────────────
  async function getUser() {
    var res = await sb.auth.getUser();
    return res.data ? res.data.user : null;
  }

  async function getProfile(opts) {
    opts = opts || {};
    var q = sb.from("profiles").select("*").limit(1);
    if (opts.username) q = q.eq("username", opts.username);
    else if (opts.id) q = q.eq("id", opts.id);
    else {
      var u = await getUser();
      if (!u) return null;
      q = q.eq("id", u.id);
    }
    var res = await q.maybeSingle();
    if (res.error) console.error("[seshn] getProfile error", res.error);
    return res.data;
  }

  async function upsertProfile(fields) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    var row = Object.assign({ id: u.id }, fields);
    var res = await sb.from("profiles").upsert(row, { onConflict: "id" }).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function sendMagicLink(email, redirectTo) {
    return sb.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: redirectTo || (window.location.origin + "/app/auth.html"),
        shouldCreateUser: true
      }
    });
  }

  async function signOut() {
    return sb.auth.signOut();
  }

  // ── Gigs ──────────────────────────────────────────────────────────
  async function createGig(fields) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    var row = Object.assign({ owner_id: u.id, status: "open" }, fields);
    var res = await sb.from("gigs").insert(row).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function listGigs(opts) {
    opts = opts || {};
    var q = sb
      .from("gigs")
      .select("*, owner:profiles!owner_id(id, username, display_name, is_pro)")
      .eq("status", "open")
      .order("boosted_until", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(opts.limit || 30);
    if (opts.role) q = q.eq("role", opts.role);
    if (opts.ownerId) q = q.eq("owner_id", opts.ownerId);
    if (opts.genre) q = q.contains("genres", [opts.genre]);
    var res = await q;
    if (res.error) { console.error("[seshn] listGigs error", res.error); return []; }
    return res.data || [];
  }

  async function getGig(id) {
    var res = await sb
      .from("gigs")
      .select("*, owner:profiles!owner_id(id, username, display_name, is_pro, location, roles)")
      .eq("id", id)
      .maybeSingle();
    if (res.error) { console.error("[seshn] getGig error", res.error); return null; }
    return res.data;
  }

  // After auth, route based on whether profile exists.
  async function routeAfterAuth() {
    var u = await getUser();
    if (!u) return;
    var p = await getProfile({ id: u.id });
    if (p && p.username) window.location.href = "/app/profile.html?u=" + encodeURIComponent(p.username);
    else window.location.href = "/app/onboarding.html";
  }

  window.seshn = {
    sb: sb,
    getUser: getUser,
    getProfile: getProfile,
    upsertProfile: upsertProfile,
    sendMagicLink: sendMagicLink,
    signOut: signOut,
    routeAfterAuth: routeAfterAuth,
    createGig: createGig,
    listGigs: listGigs,
    getGig: getGig
  };
})();
