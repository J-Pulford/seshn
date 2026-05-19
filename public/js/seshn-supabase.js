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

  // ── Profiles browse ───────────────────────────────────────────────
  async function listProfiles(opts) {
    opts = opts || {};
    var q = sb.from("profiles").select("id, username, display_name, bio, location, pronouns, roles, genres, is_pro, created_at");
    if (opts.roles && opts.roles.length) q = q.overlaps("roles", opts.roles);
    if (opts.genres && opts.genres.length) q = q.overlaps("genres", opts.genres);
    if (opts.location && opts.location.trim()) q = q.ilike("location", "%" + opts.location.trim() + "%");
    if (opts.search && opts.search.trim()) {
      var s = opts.search.trim().replace(/[%,]/g, "");
      q = q.or("display_name.ilike.%" + s + "%,username.ilike.%" + s + "%,bio.ilike.%" + s + "%");
    }
    if (opts.excludeId) q = q.neq("id", opts.excludeId);
    if (opts.proOnly) q = q.eq("is_pro", true);
    var sort = opts.sort || "newest";
    if (sort === "newest") q = q.order("created_at", { ascending: false });
    else q = q.order("display_name", { ascending: true });
    q = q.limit(opts.limit || 60);
    var res = await q;
    if (res.error) { console.error("[seshn] listProfiles error", res.error); return []; }
    return res.data || [];
  }

  // ── Applications ──────────────────────────────────────────────────
  async function applyToGig(gigId, fields) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    if (!gigId) throw new Error("Missing gig id");
    var row = {
      gig_id: gigId,
      applicant_id: u.id,
      pitch: (fields && fields.pitch) || "",
      attachment_url: (fields && fields.attachment_url) || null
    };
    var res = await sb.from("applications").insert(row).select("*").single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function getMyApplication(gigId) {
    var u = await getUser();
    if (!u || !gigId) return null;
    var res = await sb
      .from("applications")
      .select("*")
      .eq("gig_id", gigId)
      .eq("applicant_id", u.id)
      .maybeSingle();
    if (res.error) { console.error("[seshn] getMyApplication error", res.error); return null; }
    return res.data;
  }

  async function listApplicationsForGig(gigId) {
    if (!gigId) return [];
    var res = await sb
      .from("applications")
      .select("*, applicant:profiles!applicant_id(id, username, display_name, location, roles, genres, bio, is_pro)")
      .eq("gig_id", gigId)
      .order("created_at", { ascending: false });
    if (res.error) { console.error("[seshn] listApplicationsForGig error", res.error); return []; }
    return res.data || [];
  }

  async function listMyApplications() {
    var u = await getUser();
    if (!u) return [];
    var res = await sb
      .from("applications")
      .select("*, gig:gigs!gig_id(id, title, role, comp, pay_amount, pay_currency, location, status, owner:profiles!owner_id(id, username, display_name, is_pro))")
      .eq("applicant_id", u.id)
      .order("created_at", { ascending: false });
    if (res.error) { console.error("[seshn] listMyApplications error", res.error); return []; }
    return res.data || [];
  }

  async function updateApplicationStatus(applicationId, status) {
    if (!applicationId || !status) throw new Error("Missing args");
    var res = await sb
      .from("applications")
      .update({ status: status })
      .eq("id", applicationId)
      .select("*")
      .single();
    if (res.error) throw res.error;
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
    getGig: getGig,
    listProfiles: listProfiles,
    applyToGig: applyToGig,
    getMyApplication: getMyApplication,
    listApplicationsForGig: listApplicationsForGig,
    listMyApplications: listMyApplications,
    updateApplicationStatus: updateApplicationStatus
  };
})();
