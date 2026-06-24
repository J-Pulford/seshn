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

const FIELDS = "id, user_id, status, details, created_at";

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
