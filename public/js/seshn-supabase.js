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

  // For editing an existing profile. Does NOT include immutable fields like
  // username (which is set at onboarding). Using update() avoids tripping the
  // NOT NULL constraints on a fresh-row INSERT that upsert() would prepare.
  async function updateProfile(fields) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    var res = await sb.from("profiles").update(fields).eq("id", u.id).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  // Upload an avatar image. Validates type/size, writes to the avatars bucket
  // at avatars/{uid}/avatar-<ts>.<ext>, deletes the previous file referenced
  // by the profile (best-effort), and returns the new public URL.
  async function uploadAvatar(file) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    if (!file) throw new Error("No file");
    if (!file.type || file.type.indexOf("image/") !== 0) {
      throw new Error("Avatar must be an image (jpg, png, webp, gif).");
    }
    var MAX = 5 * 1024 * 1024;
    if (file.size > MAX) throw new Error("Image is too large (max 5 MB).");

    var ext = (file.name && file.name.split(".").pop() || "").toLowerCase();
    if (!/^(jpg|jpeg|png|webp|gif)$/.test(ext)) {
      // Fall back to MIME-derived extension if filename had none.
      ext = file.type.split("/")[1] || "jpg";
    }
    var path = u.id + "/avatar-" + Date.now() + "." + ext;

    var up = await sb.storage.from("avatars").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type
    });
    if (up.error) throw up.error;

    var pub = sb.storage.from("avatars").getPublicUrl(path);
    var url = pub.data && pub.data.publicUrl;

    // Best-effort cleanup of the previous avatar.
    try {
      var prev = await getProfile({ id: u.id });
      if (prev && prev.avatar_url) {
        var m = prev.avatar_url.match(/\/avatars\/(.+)$/);
        if (m && m[1] && m[1] !== path) {
          await sb.storage.from("avatars").remove([m[1]]);
        }
      }
    } catch (e) { /* non-fatal */ }

    return url;
  }

  // Upload a cover image. Reuses the avatars bucket under
  // avatars/{uid}/cover-<ts>.<ext>. Cover photos are larger than avatars,
  // so we allow up to 8 MB.
  async function uploadCover(file) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    if (!file) throw new Error("No file");
    if (!file.type || file.type.indexOf("image/") !== 0) {
      throw new Error("Cover must be an image (jpg, png, webp, gif).");
    }
    var MAX = 8 * 1024 * 1024;
    if (file.size > MAX) throw new Error("Image is too large (max 8 MB).");

    var ext = (file.name && file.name.split(".").pop() || "").toLowerCase();
    if (!/^(jpg|jpeg|png|webp|gif)$/.test(ext)) ext = file.type.split("/")[1] || "jpg";
    var path = u.id + "/cover-" + Date.now() + "." + ext;

    var up = await sb.storage.from("avatars").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type
    });
    if (up.error) throw up.error;

    var pub = sb.storage.from("avatars").getPublicUrl(path);
    var url = pub.data && pub.data.publicUrl;

    // Best-effort cleanup of the previous cover.
    try {
      var prev = await getProfile({ id: u.id });
      if (prev && prev.cover_url) {
        var m = prev.cover_url.match(/\/avatars\/(.+)$/);
        if (m && m[1] && m[1] !== path) {
          await sb.storage.from("avatars").remove([m[1]]);
        }
      }
    } catch (e) { /* non-fatal */ }

    return url;
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
      .select("*, owner:profiles!owner_id(id, username, display_name, is_pro, avatar_url)")
      .limit(opts.limit || 30);

    // Status filter. Defaults to ['open']; pass ['open','closed'] to include
    // closed gigs (e.g. on the owner's own profile so they can reopen).
    if (opts.statuses && opts.statuses.length) {
      q = q.in("status", opts.statuses);
    } else {
      q = q.eq("status", "open");
    }

    // Filtering
    if (opts.role) q = q.eq("role", opts.role);
    if (opts.roles && opts.roles.length) q = q.in("role", opts.roles);
    if (opts.ownerId) q = q.eq("owner_id", opts.ownerId);
    if (opts.genre) q = q.contains("genres", [opts.genre]);
    if (opts.genres && opts.genres.length) q = q.overlaps("genres", opts.genres);
    if (opts.comps && opts.comps.length) q = q.in("comp", opts.comps);
    if (opts.location && opts.location.trim()) {
      var loc = opts.location.trim().replace(/[%_]/g, "");
      q = q.ilike("location", "%" + loc + "%");
    }
    if (opts.search && opts.search.trim()) {
      // Strip SQL wildcards and commas (commas break PostgREST's or= syntax).
      var s = opts.search.trim().replace(/[%_,]/g, "");
      if (s) q = q.ilike("title", "%" + s + "%");
    }

    // Sorting
    if (opts.sort === "newest") {
      q = q.order("created_at", { ascending: false });
    } else {
      q = q.order("boosted_until", { ascending: false, nullsFirst: false })
           .order("created_at", { ascending: false });
    }

    var res = await q;
    if (res.error) { console.error("[seshn] listGigs error", res.error); return []; }
    return res.data || [];
  }

  async function getGig(id) {
    var res = await sb
      .from("gigs")
      .select("*, owner:profiles!owner_id(id, username, display_name, is_pro, location, roles, avatar_url)")
      .eq("id", id)
      .maybeSingle();
    if (res.error) { console.error("[seshn] getGig error", res.error); return null; }
    return res.data;
  }

  // Close or reopen a gig. Owner-only (enforced by gigs UPDATE policy).
  async function setGigStatus(gigId, status) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    if (!gigId) throw new Error("Missing gig id");
    if (status !== "open" && status !== "closed") throw new Error("Invalid status");
    var res = await sb
      .from("gigs")
      .update({ status: status })
      .eq("id", gigId)
      .eq("owner_id", u.id)
      .select()
      .single();
    if (res.error) throw res.error;
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
      .select("*, applicant:profiles!applicant_id(id, username, display_name, location, roles, genres, bio, is_pro, avatar_url)")
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
      .select("*, gig:gigs!gig_id(id, title, role, comp, pay_amount, pay_currency, location, status, owner:profiles!owner_id(id, username, display_name, is_pro, avatar_url))")
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

  // ── Messaging ─────────────────────────────────────────────────────
  async function getOrCreateConversation(otherUserId) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    if (!otherUserId) throw new Error("Missing recipient");
    if (otherUserId === u.id) throw new Error("Can't message yourself");
    var res = await sb.rpc("get_or_create_conversation", { other_user: otherUserId });
    if (res.error) throw res.error;
    return res.data; // conversation id (uuid)
  }

  async function listMyConversations() {
    var u = await getUser();
    if (!u) return [];
    var res = await sb
      .from("conversations")
      .select(
        "id, user_a, user_b, last_message_at, last_message_preview, last_message_sender, " +
        "user_a_profile:profiles!user_a(id, username, display_name, is_pro, location, roles, avatar_url), " +
        "user_b_profile:profiles!user_b(id, username, display_name, is_pro, location, roles, avatar_url), " +
        "reads:conversation_reads(user_id, last_read_at)"
      )
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (res.error) { console.error("[seshn] listMyConversations error", res.error); return []; }
    // Decorate with `other` (the not-me participant) and `unread` flag.
    return (res.data || []).map(function (c) {
      var other = c.user_a === u.id ? c.user_b_profile : c.user_a_profile;
      var myRead = (c.reads || []).find(function (r) { return r.user_id === u.id; });
      var lastReadAt = myRead ? new Date(myRead.last_read_at).getTime() : 0;
      var lastMsgAt = c.last_message_at ? new Date(c.last_message_at).getTime() : 0;
      var unread = !!(lastMsgAt && lastMsgAt > lastReadAt && c.last_message_sender && c.last_message_sender !== u.id);
      return Object.assign({}, c, { other: other, unread: unread, me_id: u.id });
    });
  }

  async function getConversation(conversationId) {
    var u = await getUser();
    if (!u || !conversationId) return null;
    var res = await sb
      .from("conversations")
      .select(
        "id, user_a, user_b, last_message_at, " +
        "user_a_profile:profiles!user_a(id, username, display_name, is_pro, location, roles, avatar_url), " +
        "user_b_profile:profiles!user_b(id, username, display_name, is_pro, location, roles, avatar_url)"
      )
      .eq("id", conversationId)
      .maybeSingle();
    if (res.error) { console.error("[seshn] getConversation error", res.error); return null; }
    if (!res.data) return null;
    var other = res.data.user_a === u.id ? res.data.user_b_profile : res.data.user_a_profile;
    return Object.assign({}, res.data, { other: other, me_id: u.id });
  }

  async function listMessages(conversationId, opts) {
    if (!conversationId) return [];
    opts = opts || {};
    var res = await sb
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(opts.limit || 200);
    if (res.error) { console.error("[seshn] listMessages error", res.error); return []; }
    return res.data || [];
  }

  async function sendMessage(conversationId, body) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    if (!conversationId || !body || !body.trim()) throw new Error("Empty message");
    var res = await sb
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: u.id, body: body.trim() })
      .select("*")
      .single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function markConversationRead(conversationId) {
    var u = await getUser();
    if (!u || !conversationId) return;
    var res = await sb
      .from("conversation_reads")
      .upsert(
        { conversation_id: conversationId, user_id: u.id, last_read_at: new Date().toISOString() },
        { onConflict: "conversation_id,user_id" }
      );
    if (res.error) console.error("[seshn] markConversationRead error", res.error);
    // Also clear any unread notifications tied to this conversation.
    var nres = await sb
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", u.id)
      .eq("conversation_id", conversationId)
      .is("read_at", null);
    if (nres.error) console.warn("[seshn] markConversationRead (notifications) error", nres.error);
  }

  // Subscribe to new messages in a conversation. Returns an unsubscribe fn.
  function subscribeToMessages(conversationId, onInsert) {
    if (!conversationId) return function () {};
    var channel = sb
      .channel("messages:" + conversationId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + conversationId },
        function (payload) { onInsert(payload.new); }
      )
      .subscribe();
    return function () { sb.removeChannel(channel); };
  }

  // Subscribe to any new message that touches one of my conversations
  // (used to refresh the inbox sidebar + nav badge).
  async function subscribeToMyConversations(onChange) {
    var u = await getUser();
    if (!u) return function () {};
    var channel = sb
      .channel("user-convos:" + u.id)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        function () { onChange(); }
      )
      .subscribe();
    return function () { sb.removeChannel(channel); };
  }

  async function getUnreadCount() {
    var convos = await listMyConversations();
    return convos.filter(function (c) { return c.unread; }).length;
  }

  // ── Notifications ─────────────────────────────────────────────────
  async function listNotifications(opts) {
    opts = opts || {};
    var u = await getUser();
    if (!u) return [];
    var res = await sb
      .from("notifications")
      .select(
        "id, kind, created_at, read_at, gig_id, application_id, conversation_id, " +
        "actor:profiles!actor_id(id, username, display_name, avatar_url), " +
        "gig:gigs!gig_id(id, title, role)"
      )
      .eq("user_id", u.id)
      .order("created_at", { ascending: false })
      .limit(opts.limit || 50);
    if (res.error) { console.error("[seshn] listNotifications error", res.error); return []; }
    return res.data || [];
  }

  async function getUnreadNotificationCount() {
    var u = await getUser();
    if (!u) return 0;
    var res = await sb
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.id)
      .is("read_at", null);
    if (res.error) { console.error("[seshn] getUnreadNotificationCount error", res.error); return 0; }
    return res.count || 0;
  }

  async function markNotificationsRead(ids) {
    var u = await getUser();
    if (!u) return;
    if (!ids || !ids.length) return;
    var res = await sb
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids)
      .is("read_at", null);
    if (res.error) console.error("[seshn] markNotificationsRead error", res.error);
  }

  async function markAllNotificationsRead() {
    var u = await getUser();
    if (!u) return;
    var res = await sb
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", u.id)
      .is("read_at", null);
    if (res.error) console.error("[seshn] markAllNotificationsRead error", res.error);
  }

  // Subscribe to new notification rows for the current user.
  async function subscribeToNotifications(onInsert) {
    var u = await getUser();
    if (!u) return function () {};
    var channel = sb
      .channel("notifications:" + u.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: "user_id=eq." + u.id },
        function (payload) { onInsert(payload.new); }
      )
      .subscribe();
    return function () { sb.removeChannel(channel); };
  }

  // After auth, route based on whether profile exists.
  async function routeAfterAuth() {
    var u = await getUser();
    if (!u) return;
    var p = await getProfile({ id: u.id });
    if (p && p.username) window.location.href = "/app/profile.html?u=" + encodeURIComponent(p.username);
    else window.location.href = "/app/onboarding.html";
  }

  // Gate every signed-in page that requires a complete profile.
  // - Returns { user, profile } when ready.
  // - Returns null + redirects when missing auth (-> auth.html?next=...) or
  //   missing profile (-> onboarding.html).
  // Pass { allowAnon: true } to fetch the user/profile without redirecting
  // when signed out (useful for pages that have a public read view).
  async function requireProfile(opts) {
    opts = opts || {};
    var u = await getUser();
    if (!u) {
      if (opts.allowAnon) return { user: null, profile: null };
      var next = window.location.pathname + window.location.search;
      window.location.href = "auth.html?next=" + encodeURIComponent(next);
      return null;
    }
    var p = await getProfile({ id: u.id });
    if (!p || !p.username) {
      window.location.href = "onboarding.html";
      return null;
    }
    return { user: u, profile: p };
  }

  // Notify any listening UI (e.g. the nav) that the current user's profile
  // row has changed (avatar, name, etc.) so they can re-render without
  // requiring a page reload.
  function emitProfileUpdated(profile) {
    try { window.dispatchEvent(new CustomEvent("seshn:profile-updated", { detail: profile })); } catch (e) {}
  }

  window.seshn = {
    sb: sb,
    getUser: getUser,
    getProfile: getProfile,
    upsertProfile: upsertProfile,
    updateProfile: updateProfile,
    uploadAvatar: uploadAvatar,
    uploadCover: uploadCover,
    sendMagicLink: sendMagicLink,
    signOut: signOut,
    routeAfterAuth: routeAfterAuth,
    requireProfile: requireProfile,
    emitProfileUpdated: emitProfileUpdated,
    createGig: createGig,
    listGigs: listGigs,
    getGig: getGig,
    setGigStatus: setGigStatus,
    listProfiles: listProfiles,
    applyToGig: applyToGig,
    getMyApplication: getMyApplication,
    listApplicationsForGig: listApplicationsForGig,
    listMyApplications: listMyApplications,
    updateApplicationStatus: updateApplicationStatus,
    getOrCreateConversation: getOrCreateConversation,
    listMyConversations: listMyConversations,
    getConversation: getConversation,
    listMessages: listMessages,
    sendMessage: sendMessage,
    markConversationRead: markConversationRead,
    subscribeToMessages: subscribeToMessages,
    subscribeToMyConversations: subscribeToMyConversations,
    getUnreadCount: getUnreadCount,
    listNotifications: listNotifications,
    getUnreadNotificationCount: getUnreadNotificationCount,
    markNotificationsRead: markNotificationsRead,
    markAllNotificationsRead: markAllNotificationsRead,
    subscribeToNotifications: subscribeToNotifications
  };
})();
