// Verification applications — the vetting flow behind the "Verified" badge.
// The badge (profiles.is_verified) is awarded by staff after reviewing one of
// these. Payment ($49, one-time) is a later step; for now this just captures the
// application for review.
import { getBrowserClient } from "./client";
import { getUser } from "./profiles";

export type VerificationStatus = "pending" | "approved" | "rejected" | "withdrawn";

export interface VerificationDetails {
  full_name: string;
  primary_role: string;
  years_experience: string;
  based_in: string;
  streaming_url: string;
  portfolio_url: string;
  socials: string;
  notable_work: string;
  pitch: string;
  consent_identity: boolean;
}

export interface VerificationApplication {
  id: string;
  user_id: string;
  status: VerificationStatus;
  details: Partial<VerificationDetails>;
  created_at: string;
}

/** Trimmed applicant profile embedded on a row in the staff review queue. */
export interface VerificationApplicant {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

/** A row as seen by staff in the review queue — includes review metadata. */
export interface VerificationReviewItem {
  id: string;
  user_id: string;
  status: VerificationStatus;
  details: Partial<VerificationDetails>;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  applicant: VerificationApplicant | null;
}

const FIELDS = "id, user_id, status, details, created_at";
const REVIEW_FIELDS =
  "id, user_id, status, details, review_notes, reviewed_at, created_at, updated_at, " +
  "applicant:profiles!verification_applications_user_id_fkey(id, username, display_name, avatar_url)";

// The caller's most recent application, or null if they've never applied.
export async function getMyVerificationApplication(): Promise<VerificationApplication | null> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) return null;
  const res = await sb
    .from("verification_applications")
    .select(FIELDS)
    .eq("user_id", u.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (res.error) {
    console.error("[seshn] getMyVerificationApplication error", res.error);
    return null;
  }
  return (res.data as unknown as VerificationApplication) ?? null;
}

export async function submitVerificationApplication(details: VerificationDetails): Promise<VerificationApplication> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  const res = await sb
    .from("verification_applications")
    .insert({ user_id: u.id, details })
    .select(FIELDS)
    .single();
  if (res.error) throw res.error;
  return res.data as unknown as VerificationApplication;
}

export async function withdrawVerificationApplication(id: string): Promise<void> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u || !id) return;
  const res = await sb.from("verification_applications").update({ status: "withdrawn" }).eq("id", id).eq("user_id", u.id);
  if (res.error) throw res.error;
}

// ──── Staff review queue ───────────────────────────────────────────

// Am I staff? Reveals the review screen; RLS + the review RPC still enforce the
// rest, so a non-staff user who reaches the page can read/do nothing.
export async function amIStaff(): Promise<boolean> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) return false;
  const res = await sb.from("profiles").select("is_staff").eq("id", u.id).maybeSingle();
  if (res.error) return false;
  return !!(res.data as { is_staff?: boolean } | null)?.is_staff;
}

// All applications for the review queue (staff-only via RLS), newest first.
// Pass a status to filter the queue; omit for everything.
export async function listVerificationApplications(status?: VerificationStatus): Promise<VerificationReviewItem[]> {
  const sb = getBrowserClient();
  let q = sb.from("verification_applications").select(REVIEW_FIELDS).order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const res = await q;
  if (res.error) throw res.error;
  return (res.data as unknown as VerificationReviewItem[]) ?? [];
}

// Approve/reject (or re-queue) an application. Runs the SECURITY DEFINER RPC,
// which gates on staff, stamps the decision, and flips the applicant's badge.
export async function reviewVerificationApplication(
  id: string,
  decision: "approved" | "rejected" | "pending",
  notes?: string,
): Promise<VerificationReviewItem> {
  const sb = getBrowserClient();
  const res = await sb.rpc("review_verification_application", { app_id: id, decision, notes: notes?.trim() || null });
  if (res.error) throw res.error;
  return res.data as unknown as VerificationReviewItem;
}
