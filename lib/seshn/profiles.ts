// Profile reads/writes + image uploads. Typed port of the profile section of
// the legacy public/js/seshn-supabase.js. Runs in the browser (client pages).
import { getBrowserClient } from "./client";
import type { GetProfileOpts, Profile } from "./types";

export async function getUser() {
  const sb = getBrowserClient();
  const res = await sb.auth.getUser();
  return res.data ? res.data.user : null;
}

export async function getProfile(opts: GetProfileOpts = {}): Promise<Profile | null> {
  const sb = getBrowserClient();
  let q = sb.from("profiles").select("*").limit(1);
  if (opts.username) q = q.eq("username", opts.username);
  else if (opts.id) q = q.eq("id", opts.id);
  else {
    const u = await getUser();
    if (!u) return null;
    q = q.eq("id", u.id);
  }
  const res = await q.maybeSingle();
  if (res.error) console.error("[seshn] getProfile error", res.error);
  return (res.data as Profile) ?? null;
}

export async function upsertProfile(fields: Partial<Profile>): Promise<Profile> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  const row = { id: u.id, ...fields };
  const res = await sb.from("profiles").upsert(row, { onConflict: "id" }).select().single();
  if (res.error) throw res.error;
  return res.data as Profile;
}

// For editing an existing profile. Does NOT include immutable fields like
// username (set at onboarding). update() avoids tripping NOT NULL constraints
// that a fresh-row upsert() insert would prepare.
export async function updateProfile(fields: Partial<Profile>): Promise<Profile> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  const res = await sb.from("profiles").update(fields).eq("id", u.id).select().single();
  if (res.error) throw res.error;
  return res.data as Profile;
}

function extOf(file: File): string {
  let ext = (file.name?.split(".").pop() ?? "").toLowerCase();
  if (!/^(jpg|jpeg|png|webp|gif)$/.test(ext)) ext = file.type.split("/")[1] || "jpg";
  return ext;
}

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
    .select("id, username, display_name, bio, location, pronouns, roles, genres, is_pro, created_at");
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
