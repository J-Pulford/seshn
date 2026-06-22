// Contracts data layer. Typed port of the contracts section of
// seshn-supabase.js. The status transitions (send/sign/decline/cancel) are
// RPCs so the audit_log row lands atomically; draft create/update are direct
// table writes under the 0012 RLS.
import { getBrowserClient } from "./client";
import { getUser } from "./profiles";
import type { Application, Contract } from "./types";

const CONTRACT_FIELDS =
  "id, gig_id, application_id, owner_id, collaborator_id, origin, proposed_by, conversation_id, status, terms, " +
  "governing_law, language, signing_provider_ref, pdf_url, " +
  "owner_signed_at, collaborator_signed_at, fully_signed_at, created_at, updated_at";

export async function listMyContracts(): Promise<Contract[]> {
  const sb = getBrowserClient();
  const res = await sb
    .from("contracts")
    .select(
      CONTRACT_FIELDS +
        ", owner:profiles!owner_id(id, username, display_name, avatar_url, is_pro)" +
        ", collaborator:profiles!collaborator_id(id, username, display_name, avatar_url, is_pro)" +
        ", gig:gigs(id, title, role)",
    )
    .order("updated_at", { ascending: false });
  if (res.error) {
    console.error("[seshn] listMyContracts error", res.error);
    return [];
  }
  return (res.data as unknown as Contract[]) || [];
}

export async function getContract(id: string): Promise<Contract | null> {
  const sb = getBrowserClient();
  if (!id) throw new Error("Missing contract id");
  const res = await sb
    .from("contracts")
    .select(
      CONTRACT_FIELDS +
        ", owner:profiles!owner_id(id, username, display_name, avatar_url, is_pro, location)" +
        ", collaborator:profiles!collaborator_id(id, username, display_name, avatar_url, is_pro, location)" +
        ", gig:gigs(id, title, role, genres, comp, pay_amount, pay_currency)",
    )
    .eq("id", id)
    .maybeSingle();
  if (res.error) {
    console.error("[seshn] getContract error", res.error);
    return null;
  }
  return (res.data as unknown as Contract) ?? null;
}

// Look up the contract for one application (1:1 via the unique application_id).
// Visible to both parties under the 0012 RLS, so the owner and the applicant
// can each find it. Returns null when no contract has been drafted yet.
export async function getContractForApplication(applicationId: string): Promise<Contract | null> {
  const sb = getBrowserClient();
  if (!applicationId) return null;
  const res = await sb
    .from("contracts")
    .select(CONTRACT_FIELDS)
    .eq("application_id", applicationId)
    .maybeSingle();
  if (res.error) {
    console.error("[seshn] getContractForApplication error", res.error);
    return null;
  }
  return (res.data as unknown as Contract) ?? null;
}

// Count contracts awaiting *my* signature (for the nav badge). RLS already
// scopes contracts to the parties; we just filter to the awaiting state where
// my side hasn't signed yet.
export async function countContractsNeedingMySignature(): Promise<number> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) return 0;
  const res = await sb
    .from("contracts")
    .select("owner_id, collaborator_id, owner_signed_at, collaborator_signed_at")
    .eq("status", "awaiting_signatures");
  if (res.error) {
    console.error("[seshn] countContractsNeedingMySignature error", res.error);
    return 0;
  }
  type Row = { owner_id: string; collaborator_id: string; owner_signed_at: string | null; collaborator_signed_at: string | null };
  return ((res.data as unknown as Row[]) || []).filter(
    (c) => (c.owner_id === u.id && !c.owner_signed_at) || (c.collaborator_id === u.id && !c.collaborator_signed_at),
  ).length;
}

export async function createContract(application: Application, terms: Record<string, unknown>, templateVersion?: string | null): Promise<Contract> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  if (!application?.id || !application.gig_id || !application.applicant_id) throw new Error("Missing application info");
  if (application.status !== "accepted") throw new Error("Application must be accepted before drafting a contract");
  const row = {
    gig_id: application.gig_id,
    application_id: application.id,
    owner_id: u.id,
    collaborator_id: application.applicant_id,
    proposed_by: u.id,
    origin: "gig",
    terms: { template_version: templateVersion ?? null, ...(terms || {}) },
  };
  const res = await sb.from("contracts").insert(row).select(CONTRACT_FIELDS).single();
  if (res.error) throw res.error;
  return res.data as unknown as Contract;
}

// Open a direct contract (no gig) with another user, straight from a DM or a
// profile. `iAmProvider` sets the money direction: true = I'm the paid side
// (collaborator) sending an offer; false = I'm the paying side (owner) booking
// them. Returns a draft the proposer then edits and sends. Backed by the
// create_direct_contract SECURITY DEFINER RPC (blocks self/blocked/unknown users).
export async function createDirectContract(
  counterpartyId: string,
  iAmProvider: boolean,
  terms: Record<string, unknown>,
  conversationId?: string | null,
  templateVersion?: string | null,
): Promise<Contract> {
  const sb = getBrowserClient();
  if (!counterpartyId) throw new Error("Missing counterparty");
  const res = await sb.rpc("create_direct_contract", {
    p_counterparty: counterpartyId,
    p_i_am_provider: iAmProvider,
    p_terms: { template_version: templateVersion ?? null, ...(terms || {}) },
    p_conversation_id: conversationId ?? null,
  });
  if (res.error) throw res.error;
  return unwrap(res.data) as Contract;
}

export async function updateContractTerms(contractId: string, terms: Record<string, unknown>): Promise<Contract> {
  const sb = getBrowserClient();
  if (!contractId) throw new Error("Missing contract id");
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  const res = await sb.from("contracts").update({ terms }).eq("id", contractId).eq("proposed_by", u.id).select(CONTRACT_FIELDS).single();
  if (res.error) throw res.error;
  return res.data as unknown as Contract;
}

function unwrap<T>(data: T | T[]): T {
  return Array.isArray(data) ? data[0] : data;
}

export async function sendContract(contractId: string): Promise<Contract> {
  const sb = getBrowserClient();
  if (!contractId) throw new Error("Missing contract id");
  const res = await sb.rpc("send_contract", { p_contract_id: contractId });
  if (res.error) throw res.error;
  return unwrap(res.data) as Contract;
}

export async function signContract(contractId: string, agreementHash: string): Promise<Contract> {
  const sb = getBrowserClient();
  if (!contractId) throw new Error("Missing contract id");
  if (!agreementHash || agreementHash.length !== 64) throw new Error("Agreement hash must be a 64-char sha256 hex");
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const res = await sb.rpc("sign_contract", { p_contract_id: contractId, p_agreement_hash: agreementHash, p_ip: "", p_user_agent: ua });
  if (res.error) throw res.error;
  return unwrap(res.data) as Contract;
}

export async function declineContract(contractId: string, reason?: string): Promise<Contract> {
  const sb = getBrowserClient();
  if (!contractId) throw new Error("Missing contract id");
  const res = await sb.rpc("decline_contract", { p_contract_id: contractId, p_reason: reason || "" });
  if (res.error) throw res.error;
  return unwrap(res.data) as Contract;
}

export async function cancelContract(contractId: string, reason?: string): Promise<Contract> {
  const sb = getBrowserClient();
  if (!contractId) throw new Error("Missing contract id");
  const res = await sb.rpc("cancel_contract", { p_contract_id: contractId, p_reason: reason || "" });
  if (res.error) throw res.error;
  return unwrap(res.data) as Contract;
}
