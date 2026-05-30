// Gigs data layer. Typed port of the gigs section of seshn-supabase.js.
import { getBrowserClient } from "./client";
import { getUser } from "./profiles";
import type { Gig, GigStatus } from "./types";
import type { CompType } from "./constants";

export async function createGig(fields: Partial<Gig>): Promise<Gig> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  const row = { owner_id: u.id, status: "open" as GigStatus, ...fields };
  const res = await sb.from("gigs").insert(row).select().single();
  if (res.error) throw res.error;
  return res.data as Gig;
}

export interface ListGigsOpts {
  limit?: number;
  statuses?: GigStatus[];
  role?: string;
  roles?: string[];
  ownerId?: string;
  genre?: string;
  genres?: string[];
  comps?: CompType[];
  location?: string;
  search?: string;
  sort?: "newest" | "default";
}

const GIG_SELECT = "*, owner:profiles!owner_id(id, username, display_name, is_pro, avatar_url)";

export async function listGigs(opts: ListGigsOpts = {}): Promise<Gig[]> {
  const sb = getBrowserClient();
  let q = sb.from("gigs").select(GIG_SELECT).limit(opts.limit || 30);

  if (opts.statuses?.length) q = q.in("status", opts.statuses);
  else q = q.eq("status", "open");

  if (opts.role) q = q.eq("role", opts.role);
  if (opts.roles?.length) q = q.in("role", opts.roles);
  if (opts.ownerId) q = q.eq("owner_id", opts.ownerId);
  if (opts.genre) q = q.contains("genres", [opts.genre]);
  if (opts.genres?.length) q = q.overlaps("genres", opts.genres);
  if (opts.comps?.length) q = q.in("comp", opts.comps);
  if (opts.location?.trim()) {
    const loc = opts.location.trim().replace(/[%_]/g, "");
    if (loc) q = q.ilike("location", `%${loc}%`);
  }
  if (opts.search?.trim()) {
    const s = opts.search.trim().replace(/[%_,]/g, "");
    if (s) q = q.ilike("title", `%${s}%`);
  }

  if (opts.sort === "newest") {
    q = q.order("created_at", { ascending: false });
  } else {
    q = q.order("boosted_until", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  }

  const res = await q;
  if (res.error) {
    console.error("[seshn] listGigs error", res.error);
    return [];
  }
  return (res.data as Gig[]) || [];
}

export async function getGig(id: string): Promise<Gig | null> {
  const sb = getBrowserClient();
  const res = await sb
    .from("gigs")
    .select("*, owner:profiles!owner_id(id, username, display_name, is_pro, location, roles, avatar_url)")
    .eq("id", id)
    .maybeSingle();
  if (res.error) {
    console.error("[seshn] getGig error", res.error);
    return null;
  }
  return (res.data as Gig) ?? null;
}

// Close or reopen a gig. Owner-only (enforced by RLS).
export async function setGigStatus(gigId: string, status: GigStatus): Promise<Gig> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  if (!gigId) throw new Error("Missing gig id");
  if (status !== "open" && status !== "closed") throw new Error("Invalid status");
  const res = await sb.from("gigs").update({ status }).eq("id", gigId).eq("owner_id", u.id).select().single();
  if (res.error) throw res.error;
  return res.data as Gig;
}
