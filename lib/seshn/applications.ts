// Applications data layer. Typed port of the applications section of
// seshn-supabase.js.
import { getBrowserClient } from "./client";
import { getUser } from "./profiles";
import type { Application, ApplicationStatus } from "./types";

export async function applyToGig(
  gigId: string,
  fields: { pitch?: string; attachment_url?: string | null } = {},
): Promise<Application> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  if (!gigId) throw new Error("Missing gig id");
  const row = {
    gig_id: gigId,
    applicant_id: u.id,
    pitch: fields.pitch || "",
    attachment_url: fields.attachment_url || null,
  };
  const res = await sb.from("applications").insert(row).select("*").single();
  if (res.error) throw res.error;
  return res.data as Application;
}

export async function getMyApplication(gigId: string): Promise<Application | null> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u || !gigId) return null;
  const res = await sb
    .from("applications")
    .select("*")
    .eq("gig_id", gigId)
    .eq("applicant_id", u.id)
    .maybeSingle();
  if (res.error) {
    console.error("[seshn] getMyApplication error", res.error);
    return null;
  }
  return (res.data as Application) ?? null;
}

// Decorated with the applicant's profile (used by the gig owner's view).
export async function listApplicationsForGig(gigId: string): Promise<Application[]> {
  const sb = getBrowserClient();
  if (!gigId) return [];
  const res = await sb
    .from("applications")
    .select(
      "*, applicant:profiles!applicant_id(id, username, display_name, location, roles, genres, bio, is_pro, has_producer_badge, avatar_url)",
    )
    .eq("gig_id", gigId)
    .order("created_at", { ascending: false });
  if (res.error) {
    console.error("[seshn] listApplicationsForGig error", res.error);
    return [];
  }
  return (res.data as Application[]) || [];
}

// Decorated with the embedded gig + its owner (used by the applicant's view).
export async function listMyApplications(): Promise<Application[]> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) return [];
  const res = await sb
    .from("applications")
    .select(
      "*, gig:gigs!gig_id(id, title, role, comp, pay_amount, pay_currency, location, status, owner:profiles!owner_id(id, username, display_name, is_pro, avatar_url))",
    )
    .eq("applicant_id", u.id)
    .order("created_at", { ascending: false });
  if (res.error) {
    console.error("[seshn] listMyApplications error", res.error);
    return [];
  }
  return (res.data as Application[]) || [];
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
): Promise<Application> {
  const sb = getBrowserClient();
  if (!applicationId || !status) throw new Error("Missing args");
  const res = await sb.from("applications").update({ status }).eq("id", applicationId).select("*").single();
  if (res.error) throw res.error;
  return res.data as Application;
}
