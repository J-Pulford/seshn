// Trust & safety data layer (reports + blocks). Typed port of the trust-safety
// section of seshn-supabase.js. Backed by migration 0016.
import { getBrowserClient } from "./client";
import { getUser } from "./profiles";

interface PgError {
  code?: string;
  message?: string;
}

async function fileReport(
  extra: { target_type: "user" | "gig"; target_user_id?: string; target_gig_id?: string },
  reason: string,
  details: string | undefined,
): Promise<boolean> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  if (!reason?.trim()) throw new Error("Pick a reason");
  const res = await sb.from("reports").insert({
    reporter_id: u.id,
    reason: String(reason).trim().slice(0, 80),
    details: String(details || "").trim().slice(0, 2000),
    ...extra,
  });
  if (res.error) {
    if ((res.error as PgError).code === "23505")
      throw new Error("You've already reported this. Thanks — we're looking into it.");
    throw res.error;
  }
  return true;
}

export async function reportUser(targetUserId: string, reason: string, details?: string) {
  if (!targetUserId) throw new Error("Missing user to report");
  return fileReport({ target_type: "user", target_user_id: targetUserId }, reason, details);
}

export async function reportGig(targetGigId: string, reason: string, details?: string) {
  if (!targetGigId) throw new Error("Missing gig to report");
  return fileReport({ target_type: "gig", target_gig_id: targetGigId }, reason, details);
}

export async function blockUser(userId: string): Promise<boolean> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  if (!userId) throw new Error("Missing user");
  if (userId === u.id) throw new Error("You can't block yourself");
  const res = await sb.from("blocks").insert({ blocker_id: u.id, blocked_id: userId });
  // 23505 = already blocked; idempotent success.
  if (res.error && (res.error as PgError).code !== "23505") throw res.error;
  return true;
}

export async function unblockUser(userId: string): Promise<boolean> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  if (!userId) throw new Error("Missing user");
  const res = await sb.from("blocks").delete().eq("blocker_id", u.id).eq("blocked_id", userId);
  if (res.error) throw res.error;
  return true;
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u || !userId) return false;
  const res = await sb
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", u.id)
    .eq("blocked_id", userId)
    .maybeSingle();
  if (res.error) {
    console.error("[seshn] isUserBlocked error", res.error);
    return false;
  }
  return !!res.data;
}

export async function listMyBlocks() {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) return [];
  const res = await sb
    .from("blocks")
    .select("blocked_id, created_at, blocked:profiles!blocked_id(id, username, display_name, avatar_url)")
    .eq("blocker_id", u.id)
    .order("created_at", { ascending: false });
  if (res.error) {
    console.error("[seshn] listMyBlocks error", res.error);
    return [];
  }
  return res.data || [];
}
