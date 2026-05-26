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

  // Start an OAuth sign-in. The user is redirected to the provider; on
  // return, Supabase-js exchanges the code automatically (we set
  // detectSessionInUrl: true above) and our onAuthStateChange listeners fire.
  async function signInWithGoogle(redirectTo) {
    var url = redirectTo || (window.location.origin + "/app/auth.html");
    return sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: url }
    });
  }

  // Request an email change. Supabase sends a confirmation link to BOTH the
  // current address and the new one; the change only takes effect once the
  // user clicks the link from the NEW address (and, depending on project
  // settings, also confirms from the old one).
  async function updateMyEmail(newEmail) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    if (!newEmail || !newEmail.trim()) throw new Error("Missing email");
    var res = await sb.auth.updateUser({ email: newEmail.trim() });
    if (res.error) throw res.error;
    return res.data;
  }

  // Save notification preferences (a plain { kind: bool } object) onto the
  // current profile. Triggers respect these prefs server-side.
  async function updateNotificationPrefs(prefs) {
    return updateProfile({ notification_prefs: prefs });
  }

  // Permanently delete the current user's account. Cascades through every
  // table that references profiles(id). Signs out locally afterwards.
  async function deleteMyAccount() {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    var res = await sb.rpc("delete_my_account");
    if (res.error) throw res.error;
    await sb.auth.signOut();
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

  // Send a message. body may be empty IFF attachment is provided.
  // attachment shape: { url, name, kind, size_bytes, duration_ms?, mime }
  async function sendMessage(conversationId, body, attachment) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    if (!conversationId) throw new Error("Missing conversation");
    var trimmed = (body || "").trim();
    if (!trimmed && !attachment) throw new Error("Empty message");
    var row = { conversation_id: conversationId, sender_id: u.id, body: trimmed };
    if (attachment) {
      row.attachment_url         = attachment.url;
      row.attachment_name        = attachment.name || null;
      row.attachment_kind        = attachment.kind || "file";
      row.attachment_size_bytes  = attachment.size_bytes != null ? attachment.size_bytes : null;
      row.attachment_duration_ms = attachment.duration_ms != null ? attachment.duration_ms : null;
      row.attachment_mime        = attachment.mime || null;
    }
    var res = await sb.from("messages").insert(row).select("*").single();
    if (res.error) throw res.error;
    return res.data;
  }

  // Upload a DM attachment to dm-attachments/{uid}/<ts>-<safeName>. Validates
  // mime/size. For audio files, probes duration client-side via <audio>.
  // Returns { url, name, kind, size_bytes, duration_ms?, mime }.
  async function uploadDmAttachment(file) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    if (!file) throw new Error("No file");
    var MAX = 50 * 1024 * 1024;
    if (file.size > MAX) throw new Error("File is too large (max 50 MB).");

    var mime = file.type || "application/octet-stream";
    var kind = mime.indexOf("audio/") === 0 ? "audio" : "file";

    // Sanitize the filename for the storage path. Keep something human in the
    // URL but strip unsafe chars; the displayed name uses the original.
    var safe = (file.name || "file")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 100) || "file";
    var path = u.id + "/" + Date.now() + "-" + safe;

    var up = await sb.storage.from("dm-attachments").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: mime
    });
    if (up.error) throw up.error;

    var pub = sb.storage.from("dm-attachments").getPublicUrl(path);
    var url = pub.data && pub.data.publicUrl;

    var duration_ms = null;
    if (kind === "audio") {
      duration_ms = await probeAudioDuration(file);
    }

    return {
      url: url,
      name: file.name || safe,
      kind: kind,
      size_bytes: file.size,
      duration_ms: duration_ms,
      mime: mime
    };
  }

  function probeAudioDuration(file) {
    return new Promise(function (resolve) {
      var url;
      try { url = URL.createObjectURL(file); } catch (e) { resolve(null); return; }
      var audio = new Audio();
      audio.preload = "metadata";
      var done = false;
      function finish(ms) {
        if (done) return; done = true;
        try { URL.revokeObjectURL(url); } catch (e) {}
        resolve(ms);
      }
      audio.onloadedmetadata = function () {
        var d = audio.duration;
        finish(isFinite(d) && d > 0 ? Math.round(d * 1000) : null);
      };
      audio.onerror = function () { finish(null); };
      // Safety timeout — some formats never fire loadedmetadata reliably.
      setTimeout(function () { finish(null); }, 5000);
      audio.src = url;
    });
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

  // ── Connected accounts ─────────────────────────────────────────────
  // Public Spotify client ID for the PKCE flow. PKCE doesn't require a
  // client secret (that's the whole point), so this is safe to ship.
  // Paste your Spotify Developer Dashboard client ID here, and add the
  // redirect URI in Spotify's dashboard:
  //   https://<your-domain>/app/settings.html
  // Until that's done, clicking 'Connect Spotify' will error gracefully.
  var SPOTIFY_CLIENT_ID = "";

  function spotifyRedirectUri() {
    return window.location.origin + "/app/settings.html";
  }

  function randomString(len) {
    var arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    var out = "";
    for (var i = 0; i < arr.length; i++) out += alphabet[arr[i] % alphabet.length];
    return out;
  }

  async function sha256Base64Url(input) {
    var bytes = new TextEncoder().encode(input);
    var digest = await crypto.subtle.digest("SHA-256", bytes);
    var b64 = btoa(String.fromCharCode.apply(null, new Uint8Array(digest)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // Kick off the Spotify PKCE flow. Stores the code_verifier + a CSRF
  // state token in sessionStorage and redirects to Spotify. The user lands
  // back on /app/settings.html with ?code=... ?state=... — completeSpotifyConnect
  // there finishes the exchange.
  async function startSpotifyConnect() {
    if (!SPOTIFY_CLIENT_ID) {
      throw new Error("Spotify is not configured yet — set SPOTIFY_CLIENT_ID in seshn-supabase.js.");
    }
    var verifier = randomString(96);
    var state = randomString(32);
    var challenge = await sha256Base64Url(verifier);
    sessionStorage.setItem("seshn_spotify_verifier", verifier);
    sessionStorage.setItem("seshn_spotify_state", state);
    var params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: spotifyRedirectUri(),
      // Public profile info only — enough for display name + followers.
      scope: "user-read-private user-read-email user-top-read",
      code_challenge_method: "S256",
      code_challenge: challenge,
      state: state
    });
    window.location.href = "https://accounts.spotify.com/authorize?" + params.toString();
  }

  // Called on /app/settings.html when we detect ?code=...&state=... in the URL.
  // Exchanges the code for an access token, fetches the user's Spotify profile
  // + headline stats, persists them to connected_accounts, then drops the token.
  async function completeSpotifyConnect(code, state) {
    var verifier = sessionStorage.getItem("seshn_spotify_verifier");
    var expectedState = sessionStorage.getItem("seshn_spotify_state");
    sessionStorage.removeItem("seshn_spotify_verifier");
    sessionStorage.removeItem("seshn_spotify_state");
    if (!verifier) throw new Error("Spotify connection expired — try again.");
    if (!expectedState || expectedState !== state) throw new Error("Spotify state mismatch — try again.");

    var tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: spotifyRedirectUri(),
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: verifier
      }).toString()
    });
    if (!tokenRes.ok) {
      var t = await tokenRes.text();
      throw new Error("Spotify token exchange failed: " + t.slice(0, 200));
    }
    var token = (await tokenRes.json()).access_token;
    if (!token) throw new Error("Spotify returned no access token.");

    // Fetch the user's profile (followers, country, product, profile URL).
    var meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: "Bearer " + token }
    });
    if (!meRes.ok) throw new Error("Couldn't read your Spotify profile.");
    var me = await meRes.json();

    // Also fetch top artists for a bit of credibility signal (genres).
    var topGenres = [];
    try {
      var topRes = await fetch("https://api.spotify.com/v1/me/top/artists?limit=10&time_range=long_term", {
        headers: { Authorization: "Bearer " + token }
      });
      if (topRes.ok) {
        var top = await topRes.json();
        var counts = {};
        (top.items || []).forEach(function (a) {
          (a.genres || []).forEach(function (g) { counts[g] = (counts[g] || 0) + 1; });
        });
        topGenres = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 5);
      }
    } catch (e) { /* genres are optional */ }

    var stats = {
      followers: me.followers ? me.followers.total : null,
      country: me.country || null,
      product: me.product || null,
      genres: topGenres
    };

    return saveConnectedAccount({
      provider: "spotify",
      external_id: me.id,
      display_name: me.display_name || me.id,
      profile_url: (me.external_urls && me.external_urls.spotify) || null,
      stats: stats
    });
  }

  async function listConnectedAccounts(userId) {
    var uid = userId;
    if (!uid) {
      var u = await getUser();
      if (!u) return [];
      uid = u.id;
    }
    var res = await sb
      .from("connected_accounts")
      .select("*")
      .eq("user_id", uid)
      .order("connected_at", { ascending: true });
    if (res.error) { console.error("[seshn] listConnectedAccounts error", res.error); return []; }
    return res.data || [];
  }

  async function saveConnectedAccount(fields) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    var row = Object.assign({ user_id: u.id }, fields);
    var res = await sb
      .from("connected_accounts")
      .upsert(row, { onConflict: "user_id,provider" })
      .select()
      .single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function disconnectAccount(provider) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    var res = await sb
      .from("connected_accounts")
      .delete()
      .eq("user_id", u.id)
      .eq("provider", provider);
    if (res.error) throw res.error;
  }

  // After auth, route based on whether profile exists and an optional
  // ?next= param. `next` must be a same-app path (starts with "/app/") to
  // avoid open-redirect bugs — anything else falls through to the default.
  // Reads ?next= from the URL first, then falls back to sessionStorage
  // (set by the auth page before OAuth, since some providers strip URL
  // query params from the return URL during code exchange).
  async function routeAfterAuth() {
    var u = await getUser();
    if (!u) return;
    var p = await getProfile({ id: u.id });
    if (!p || !p.username) { window.location.href = "/app/onboarding.html"; return; }
    var next = new URLSearchParams(window.location.search).get("next");
    if (!next) {
      try { next = sessionStorage.getItem("seshn_auth_next"); } catch (e) {}
    }
    try { sessionStorage.removeItem("seshn_auth_next"); } catch (e) {}
    if (next && /^\/app\/[A-Za-z0-9_./?=&%-]*$/.test(next)) {
      window.location.href = next;
      return;
    }
    window.location.href = "/app/profile.html?u=" + encodeURIComponent(p.username);
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

  // ── Contracts ─────────────────────────────────────────────────────
  // Contracts go through four states: draft → awaiting_signatures →
  // active (both signed) → completed (on escrow release). cancelled
  // is a side-state from draft/awaiting_signatures.
  //
  // The status-changing transitions (send, sign, decline, cancel) are
  // RPC calls so the audit_log row lands atomically with the status
  // change. Plain SELECT/INSERT/UPDATE are direct table access under
  // the RLS in 0012_escrow.sql.

  var CONTRACT_FIELDS = "id, gig_id, application_id, owner_id, collaborator_id, status, terms, " +
                        "governing_law, language, signing_provider_ref, pdf_url, " +
                        "owner_signed_at, collaborator_signed_at, fully_signed_at, " +
                        "created_at, updated_at";

  async function listMyContracts() {
    var res = await sb
      .from("contracts")
      .select(
        CONTRACT_FIELDS +
        ", owner:profiles!owner_id(id, username, display_name, avatar_url, is_pro)" +
        ", collaborator:profiles!collaborator_id(id, username, display_name, avatar_url, is_pro)" +
        ", gig:gigs(id, title, role)"
      )
      .order("updated_at", { ascending: false });
    if (res.error) { console.error("[seshn] listMyContracts error", res.error); return []; }
    return res.data || [];
  }

  async function getContract(id) {
    if (!id) throw new Error("Missing contract id");
    var res = await sb
      .from("contracts")
      .select(
        CONTRACT_FIELDS +
        ", owner:profiles!owner_id(id, username, display_name, avatar_url, is_pro, location, stripe_country)" +
        ", collaborator:profiles!collaborator_id(id, username, display_name, avatar_url, is_pro, location, stripe_country)" +
        ", gig:gigs(id, title, role, genres, comp, pay_amount, pay_currency)"
      )
      .eq("id", id)
      .maybeSingle();
    if (res.error) { console.error("[seshn] getContract error", res.error); return null; }
    return res.data;
  }

  // Owner drafts a new contract from an accepted application. Inserted
  // directly under the existing RLS in 0012 (which validates that the
  // application is accepted and that the applicant matches the named
  // collaborator).
  async function createContract(application, terms) {
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    if (!application || !application.id || !application.gig_id || !application.applicant_id) {
      throw new Error("Missing application info");
    }
    if (application.status !== "accepted") {
      throw new Error("Application must be accepted before drafting a contract");
    }
    var row = {
      gig_id: application.gig_id,
      application_id: application.id,
      owner_id: u.id,
      collaborator_id: application.applicant_id,
      terms: Object.assign({ template_version: (window.SeshnContract && window.SeshnContract.version) || null }, terms || {})
    };
    var res = await sb.from("contracts").insert(row).select(CONTRACT_FIELDS).single();
    if (res.error) throw res.error;
    return res.data;
  }

  // Owner updates draft terms (status=draft enforced by RLS).
  async function updateContractTerms(contractId, terms) {
    if (!contractId) throw new Error("Missing contract id");
    var u = await getUser();
    if (!u) throw new Error("Not signed in");
    var res = await sb
      .from("contracts")
      .update({ terms: terms })
      .eq("id", contractId)
      .eq("owner_id", u.id)
      .select(CONTRACT_FIELDS)
      .single();
    if (res.error) throw res.error;
    return res.data;
  }

  // RPC: owner moves draft → awaiting_signatures. Atomic with the
  // audit_log 'contract_sent' write.
  async function sendContract(contractId) {
    if (!contractId) throw new Error("Missing contract id");
    var res = await sb.rpc("send_contract", { p_contract_id: contractId });
    if (res.error) throw res.error;
    // RPC returns the row as a JSONB-encoded record; PostgREST flattens it.
    return Array.isArray(res.data) ? res.data[0] : res.data;
  }

  // RPC: record the caller's signature. agreementHash must be the
  // 64-char sha256 hex of the canonical rendered agreement (computed
  // client-side via SeshnContract.hashAgreement).
  //
  // IP is intentionally null in v1 — the client can't reliably learn
  // its own egress IP, and trusting a client-attested IP would weaken
  // the audit trail. A future Edge Function can intercept this call,
  // capture the real X-Forwarded-For from the request, and pass it
  // through. For now we record only the user-agent.
  async function signContract(contractId, agreementHash) {
    if (!contractId) throw new Error("Missing contract id");
    if (!agreementHash || agreementHash.length !== 64) {
      throw new Error("Agreement hash must be a 64-char sha256 hex");
    }
    var ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
    var res = await sb.rpc("sign_contract", {
      p_contract_id: contractId,
      p_agreement_hash: agreementHash,
      p_ip: "",
      p_user_agent: ua
    });
    if (res.error) throw res.error;
    return Array.isArray(res.data) ? res.data[0] : res.data;
  }

  async function declineContract(contractId, reason) {
    if (!contractId) throw new Error("Missing contract id");
    var res = await sb.rpc("decline_contract", {
      p_contract_id: contractId,
      p_reason: reason || ""
    });
    if (res.error) throw res.error;
    return Array.isArray(res.data) ? res.data[0] : res.data;
  }

  async function cancelContract(contractId, reason) {
    if (!contractId) throw new Error("Missing contract id");
    var res = await sb.rpc("cancel_contract", {
      p_contract_id: contractId,
      p_reason: reason || ""
    });
    if (res.error) throw res.error;
    return Array.isArray(res.data) ? res.data[0] : res.data;
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
    signInWithGoogle: signInWithGoogle,
    updateMyEmail: updateMyEmail,
    updateNotificationPrefs: updateNotificationPrefs,
    deleteMyAccount: deleteMyAccount,
    startSpotifyConnect: startSpotifyConnect,
    completeSpotifyConnect: completeSpotifyConnect,
    listConnectedAccounts: listConnectedAccounts,
    disconnectAccount: disconnectAccount,
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
    uploadDmAttachment: uploadDmAttachment,
    markConversationRead: markConversationRead,
    subscribeToMessages: subscribeToMessages,
    subscribeToMyConversations: subscribeToMyConversations,
    getUnreadCount: getUnreadCount,
    listNotifications: listNotifications,
    getUnreadNotificationCount: getUnreadNotificationCount,
    markNotificationsRead: markNotificationsRead,
    markAllNotificationsRead: markAllNotificationsRead,
    subscribeToNotifications: subscribeToNotifications,
    listMyContracts: listMyContracts,
    getContract: getContract,
    createContract: createContract,
    updateContractTerms: updateContractTerms,
    sendContract: sendContract,
    signContract: signContract,
    declineContract: declineContract,
    cancelContract: cancelContract
  };
})();
