// Profile reads/writes + image uploads. Typed port of the profile section of
// the legacy public/js/seshn-supabase.js. Runs in the browser (client pages).
import { getBrowserClient } from "./client";
import type { User } from "@supabase/supabase-js";
import type { GetProfileOpts, Profile, ProfileStats } from "./types";

// Public profile stats (gigs posted + collaborations), via the SECURITY DEFINER
// RPC so it works when viewing other people's profiles (contracts are RLS-
// restricted to participants).
export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const zero: ProfileStats = { gigs_posted: 0, collaborations: 0, rating_avg: null, rating_count: 0 };
  if (!userId) return zero;
  const res = await getBrowserClient().rpc("public_profile_stats", { p_uid: userId });
  if (res.error) {
    console.error("[seshn] getProfileStats error", res.error);
    return zero;
  }
  return { ...zero, ...(res.data as Partial<ProfileStats>) };
}

// Public-safe profile columns. Must match the SELECT grant in
// 0018_security_hardening.sql — `select *` would hit a revoked column
// (stripe_*, restrictions, deletion_requested_at are client-inaccessible).
const PROFILE_COLUMNS =
  "id, username, display_name, bio, location, pronouns, roles, genres, is_pro, has_producer_badge, avatar_url, cover_url, social_links, gallery, credits, availability, featured, skills, influences, languages, services, created_at, updated_at";

// Cached current user. getUser() is called by nearly every helper (and several
// times per page), and supabase's auth.getUser() makes a NETWORK round-trip to
// re-validate the JWT each time — so the old version fired many redundant
// requests per page load. We instead read the session from local storage
// (instant, no network) and keep it fresh via onAuthStateChange. RLS still
// enforces auth on every query, so this is safe for client-side identity.
let _cachedUser: User | null | undefined; // undefined = not loaded yet
let _authWatch = false;

function watchAuth() {
  if (_authWatch) return;
  _authWatch = true;
  getBrowserClient().auth.onAuthStateChange((_event, session) => {
    _cachedUser = session?.user ?? null;
  });
}

export async function getUser() {
  watchAuth();
  if (_cachedUser !== undefined) return _cachedUser;
  const { data } = await getBrowserClient().auth.getSession(); // local, no network
  _cachedUser = data.session?.user ?? null;
  return _cachedUser;
}

export async function getProfile(opts: GetProfileOpts = {}): Promise<Profile | null> {
  const sb = getBrowserClient();
  let q = sb.from("profiles").select(PROFILE_COLUMNS).limit(1);
  if (opts.username) q = q.eq("username", opts.username);
  else if (opts.id) q = q.eq("id", opts.id);
  else {
    const u = await getUser();
    if (!u) return null;
    q = q.eq("id", u.id);
  }
  const res = await q.maybeSingle();
  if (res.error) console.error("[seshn] getProfile error", res.error);
  const profile = (res.data as Profile) ?? null;
  // is_staff drives a cosmetic badge and is read separately, on request only, so
  // that a missing column grant (e.g. before 0038 is applied) can NEVER break the
  // core profile read. Any error here is swallowed; the badge simply won't show.
  if (profile && opts.withStaff) {
    try {
      const s = await sb.from("profiles").select("is_staff").eq("id", profile.id).maybeSingle();
      if (!s.error && s.data) profile.is_staff = (s.data as { is_staff?: boolean }).is_staff ?? false;
    } catch {
      /* badge is non-critical */
    }
  }
  return profile;
}

export async function upsertProfile(fields: Partial<Profile>): Promise<Profile> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");

  // profiles is column-locked (0018): the authenticated role may INSERT all
  // onboarding columns (incl. username), but a true upsert is blocked — its
  // `ON CONFLICT DO UPDATE` requires UPDATE privilege on the SET columns, and
  // username/id are deliberately NOT update-grantable (username is immutable
  // post-create). So create with a plain INSERT; if a row already exists for
  // this user, fall back to updating only the editable columns.
  const ins = await sb.from("profiles").insert({ id: u.id, ...fields }).select(PROFILE_COLUMNS).single();
  if (!ins.error) return ins.data as Profile;

  const detail = `${ins.error.message ?? ""} ${ins.error.details ?? ""}`.toLowerCase();
  // Username already taken by someone else — let the caller surface it.
  if (ins.error.code === "23505" && detail.includes("username")) throw ins.error;
  // This user already has a profile row (id conflict) — update editable fields.
  if (ins.error.code === "23505") {
    const editable: Partial<Profile> = { ...fields };
    delete editable.username; // immutable after creation (no UPDATE grant)
    const upd = await sb.from("profiles").update(editable).eq("id", u.id).select(PROFILE_COLUMNS).single();
    if (upd.error) throw upd.error;
    return upd.data as Profile;
  }
  throw ins.error;
}

// For editing an existing profile. Does NOT include immutable fields like
// username (set at onboarding). update() avoids tripping NOT NULL constraints
// that a fresh-row upsert() insert would prepare.
export async function updateProfile(fields: Partial<Profile>): Promise<Profile> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  const res = await sb.from("profiles").update(fields).eq("id", u.id).select(PROFILE_COLUMNS).single();
  if (res.error) throw res.error;
  return res.data as Profile;
}

// Self-grant the "Producer mode" easter-egg badge (Konami code). Backed by a
// SECURITY DEFINER RPC so it can only ever set this one cosmetic flag on the
// caller's own row. Idempotent and safe to call repeatedly.
export async function unlockProducerBadge(): Promise<boolean> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) return false;
  const res = await sb.rpc("unlock_producer_badge");
  if (res.error) {
    console.error("[seshn] unlockProducerBadge error", res.error);
    return false;
  }
  return true;
}

function extOf(file: File): string {
  let ext = (file.name?.split(".").pop() ?? "").toLowerCase();
  if (!/^(jpg|jpeg|png|webp|gif)$/.test(ext)) ext = file.type.split("/")[1] || "jpg";
  return ext;
}

// Downscale + re-encode an image in the browser before upload. Phone photos are
// often 3–8 MB / 4000px — way bigger than any avatar/cover needs — which bloats
// storage, egress, and render time. We cap the longest edge and re-encode to
// WebP. Skips animated GIFs and anything we can't decode (uploads the original).
async function downscaleImage(file: File, maxDim: number, quality = 0.82): Promise<File> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file; // leave gif/svg alone
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxDim / longest);
    if (scale >= 1) { bitmap.close?.(); return file; } // already small enough
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close?.(); return file; }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", quality));
    if (!blob || blob.size >= file.size) return file; // no real gain, keep original
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file; // any decode/encode failure → upload the original untouched
  }
}

// Longest-edge cap per image kind.
const MAX_DIM: Record<string, number> = { avatar: 512, cover: 1600, "gig-cover": 1600, gallery: 1600 };

// Shared image-upload to the avatars bucket. `kind` is the filename prefix
// (avatar | cover | gig-cover). `previousUrl` is best-effort deleted.
async function uploadImage(file: File, kind: string, maxBytes: number, previousUrl?: string | null) {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  if (!file) throw new Error("No file");
  if (!file.type || file.type.indexOf("image/") !== 0) {
    throw new Error("Must be an image (jpg, png, webp, gif).");
  }
  if (file.size > maxBytes) throw new Error(`Image is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);

  // Shrink oversized photos client-side before upload (no server cost).
  file = await downscaleImage(file, MAX_DIM[kind] ?? 1600);

  const path = `${u.id}/${kind}-${Date.now()}.${extOf(file)}`;
  const up = await sb.storage.from("avatars").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (up.error) throw up.error;

  const pub = sb.storage.from("avatars").getPublicUrl(path);
  const url = pub.data?.publicUrl;

  if (previousUrl) {
    try {
      const m = previousUrl.match(/\/avatars\/(.+)$/);
      if (m && m[1] && m[1] !== path) await sb.storage.from("avatars").remove([m[1]]);
    } catch {
      /* non-fatal */
    }
  }
  return url;
}

export async function uploadAvatar(file: File) {
  const prev = await getProfile();
  return uploadImage(file, "avatar", 5 * 1024 * 1024, prev?.avatar_url);
}

export async function uploadCover(file: File) {
  const prev = await getProfile();
  return uploadImage(file, "cover", 8 * 1024 * 1024, prev?.cover_url);
}

export async function uploadGigCover(file: File, previousUrl?: string | null) {
  return uploadImage(file, "gig-cover", 8 * 1024 * 1024, previousUrl);
}

// Gallery photos: many per profile, so no previous-url cleanup (removal is
// handled by editing the gallery array; orphaned objects are a day-2 cleanup).
export async function uploadGalleryImage(file: File) {
  return uploadImage(file, "gallery", 8 * 1024 * 1024);
}

// Loosely normalise a pasted showcase URL: trim, prepend https:// when the
// scheme is missing. Returns "" for blank input. Does not hard-validate.
export function normalizeUrl(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return "https://" + v.replace(/^\/+/, "");
}

// Notify listening UI (e.g. the nav) that the current profile row changed.
export function emitProfileUpdated(profile: Profile) {
  try {
    window.dispatchEvent(new CustomEvent("seshn:profile-updated", { detail: profile }));
  } catch {
    /* no-op */
  }
}

export interface ListProfilesOpts {
  roles?: string[];
  genres?: string[];
  location?: string;
  search?: string;
  excludeId?: string | null;
  proOnly?: boolean;
  sort?: "newest" | "name";
  limit?: number;
}

export async function listProfiles(opts: ListProfilesOpts = {}): Promise<Profile[]> {
  const sb = getBrowserClient();
  let q = sb
    .from("profiles")
    .select("id, username, display_name, bio, location, pronouns, roles, genres, is_pro, has_producer_badge, avatar_url, created_at");
  if (opts.roles?.length) q = q.overlaps("roles", opts.roles);
  if (opts.genres?.length) q = q.overlaps("genres", opts.genres);
  if (opts.location?.trim()) {
    const ploc = opts.location.trim().replace(/[%_]/g, "");
    if (ploc) q = q.ilike("location", `%${ploc}%`);
  }
  if (opts.search?.trim()) {
    // Double-quote each value so . ( ) , in the term can't break PostgREST's
    // or= grammar (see commit fef38d9).
    const s = opts.search.trim().replace(/[%_]/g, "").replace(/["\\]/g, "");
    if (s) {
      const pat = `"%${s}%"`;
      q = q.or(`display_name.ilike.${pat},username.ilike.${pat},bio.ilike.${pat}`);
    }
  }
  if (opts.excludeId) q = q.neq("id", opts.excludeId);
  if (opts.proOnly) q = q.eq("is_pro", true);
  if ((opts.sort || "newest") === "newest") q = q.order("created_at", { ascending: false });
  else q = q.order("display_name", { ascending: true });
  q = q.limit(opts.limit || 60);
  const res = await q;
  if (res.error) {
    console.error("[seshn] listProfiles error", res.error);
    return [];
  }
  return (res.data as Profile[]) || [];
}
