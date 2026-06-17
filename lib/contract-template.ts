// Seshn — Collaboration Agreement template (v1). Typed port of
// public/js/contract-template.js. The same render() + hashAgreement run on the
// sign page; the hash is what each party attests to, so the document structure
// and key order are preserved byte-for-byte from the prototype (canonicalize is
// JSON.stringify of the render() output).
//
// THIS TEMPLATE IS A STARTING POINT, NOT FINAL LEGAL TEXT — an Australian
// solicitor should review before live use (TODO markers retained).

const TEMPLATE_VERSION = "2026-05-20";
const PLATFORM = {
  name: "Seshn",
  legal_entity: "Seshn Pty Ltd",
  abn: "[ABN TBD]",
  jurisdiction: "New South Wales, Australia",
};

export type Paragraph =
  | string
  | { kind: "party"; role: string; name: string; handle: string; country: string }
  | { kind: "blockquote"; text: string }
  | { kind: "list-letter" | "list-bullet"; items: string[] }
  | { kind: "splits-block"; label: string; rows: { handle: string; pct: string }[] };

export interface AgreementSection { number?: string; title: string; paragraphs: Paragraph[] }

export interface AgreementDoc {
  version: string;
  title: string;
  header: { contract_id: string; created_at: string | null; gig_title: string | null };
  sections: AgreementSection[];
  signatures: ReturnType<typeof buildSignatureBlocks>;
}

// Loose shapes — the sign page passes the fetched Contract + embedded profiles/gig.
interface PartyProfile {
  legal_name?: string;
  display_name?: string;
  username?: string;
  country?: string;
  stripe_country?: string | null;
}
interface TemplateContract {
  id?: string;
  created_at?: string | null;
  terms?: Record<string, unknown>;
  owner_signed_at?: string | null;
  collaborator_signed_at?: string | null;
  _owner_evidence?: unknown;
  _collaborator_evidence?: unknown;
}
interface TemplateGig { id?: string; title?: string }

export function fmtMoney(cents?: number | null, currency?: string) {
  if (cents == null) return "·";
  const n = Number(cents) / 100;
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: currency || "AUD", minimumFractionDigits: 2 }).format(n);
  } catch {
    return (currency || "AUD") + " " + n.toFixed(2);
  }
}
function fmtDate(iso?: string | null) {
  if (!iso) return "·";
  try {
    return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}
function fmtPct(n?: number | null) {
  if (n == null || isNaN(n)) return "·";
  return Number(n).toString() + "%";
}
function fallback<T>(v: T | null | undefined, alt: T): T {
  return v == null || v === "" ? alt : v;
}

const getTerms = (c?: TemplateContract): Record<string, unknown> => (c && c.terms) || {};
const getDeliverable = (c?: TemplateContract) => (getTerms(c).deliverable as Record<string, string> | undefined) || {};
const getSplits = (c?: TemplateContract) => (getTerms(c).splits as Record<string, number> | undefined) || {};
const getCredits = (c?: TemplateContract) => (getTerms(c).credits as Record<string, string> | undefined) || {};

function partyLine(profile?: PartyProfile) {
  if (!profile) return { name: "[unspecified]", handle: "·", country: "·" };
  return {
    name: fallback(profile.legal_name || profile.display_name, "[no legal name on file]"),
    handle: profile.username ? "@" + profile.username : "·",
    country: fallback(profile.country || profile.stripe_country || "", "[location not set]"),
  };
}

function buildParties(owner?: PartyProfile, collaborator?: PartyProfile): AgreementSection {
  const o = partyLine(owner);
  const c = partyLine(collaborator);
  return {
    number: "1",
    title: "The parties",
    paragraphs: [
      "This agreement is between:",
      { kind: "party", role: "Owner", name: o.name, handle: o.handle, country: o.country },
      { kind: "party", role: "Collaborator", name: c.name, handle: c.handle, country: c.country },
      "This agreement is facilitated by " + PLATFORM.name + ", a service operated by " + PLATFORM.legal_entity + " (" + PLATFORM.abn + "), a company registered in " + PLATFORM.jurisdiction + ". Seshn is not a party to this agreement. Seshn's role is to host the platform, hold the agreed payment in escrow via Stripe Connect, and provide a structured process for delivery, approval and dispute resolution.",
    ],
  };
}

function buildBackground(gig?: TemplateGig): AgreementSection {
  const title = gig?.title || "[gig title]";
  const gigId = gig?.id || "[gig id]";
  return {
    number: "2",
    title: "Background",
    paragraphs: [
      'The Owner posted a gig on Seshn titled "' + title + '" (gig ID ' + gigId + '). The Collaborator applied to that gig and the Owner accepted the application. The parties now wish to record the terms of their collaboration in this agreement.',
    ],
  };
}

function buildDeliverable(c?: TemplateContract): AgreementSection {
  const d = getDeliverable(c);
  return {
    number: "3",
    title: "What the Collaborator will deliver",
    paragraphs: [
      "The Collaborator agrees to deliver the following work to the Owner:",
      { kind: "blockquote", text: fallback(d.description, "[deliverable description]") },
      "Format: " + fallback(d.format_notes, "[format notes]") + ".",
      "Deadline: by " + fmtDate(d.deliver_by) + ".",
      "Delivery is made by uploading the work to Seshn under this contract. The upload triggers the approval period described in Section 5.",
    ],
  };
}

function buildPayment(c?: TemplateContract): AgreementSection {
  const t = getTerms(c) as { fee_cents?: number; currency?: string; platform_fee_pct?: number };
  const feeStr = fmtMoney(t.fee_cents, t.currency);
  const platformPct = t.platform_fee_pct != null ? t.platform_fee_pct : 10;
  const netCents = t.fee_cents ? Math.round(t.fee_cents * (1 - platformPct / 100)) : null;
  return {
    number: "4",
    title: "What the Owner will pay",
    paragraphs: [
      "The Owner agrees to pay the Collaborator " + feeStr + " for the deliverable in Section 3.",
      "How the money is held. When this agreement is signed by both parties, the Owner will fund an escrow held by Stripe Connect under this contract. The funds are held by Stripe until released under the terms of this agreement. Seshn does not hold the money directly.",
      "Platform fee. Seshn charges a platform fee of " + fmtPct(platformPct) + " of the agreed amount, deducted from the payment to the Collaborator at the time of release. The Collaborator therefore receives " + fmtMoney(netCents, t.currency) + " on release.",
      { kind: "list-letter", items: [
        "On approval. If the Owner approves the delivered work within the approval window (Section 5), the funds are released immediately to the Collaborator.",
        "Automatically. If the Owner does not approve, request revisions, or open a dispute before the end of the approval window, the funds are released automatically to the Collaborator at the end of the window.",
        "On dispute. If a dispute is opened, the auto-release timer is paused. The funds remain in escrow until the dispute is resolved as described in Section 7.",
      ] },
      "If the deadline in Section 3 passes without delivery, the Owner may cancel this agreement and request a refund. Seshn will return the held funds to the Owner.",
    ],
  };
}

function buildApproval(c?: TemplateContract): AgreementSection {
  const days = (getTerms(c).approval_window_days as number) || 7;
  return {
    number: "5",
    title: "Approval period",
    paragraphs: [
      "The Owner has " + days + " days from the time the Collaborator marks the work as delivered to do one of the following:",
      { kind: "list-bullet", items: ["approve the work;", "request a specific, reasonable revision; or", "open a dispute under Section 7."] },
      "If the Owner does not act within the approval period, the work is considered approved and the funds are released to the Collaborator under Section 4.",
      "If revisions are requested, the Collaborator is required to make a good-faith attempt to complete them within a reasonable time. The approval period restarts once the revised work is re-delivered. The parties may agree to additional rounds of revisions, but neither party is obligated to engage in unlimited revisions.",
    ],
  };
}

function buildSplits(c?: TemplateContract, owner?: PartyProfile, collaborator?: PartyProfile): AgreementSection {
  const s = getSplits(c);
  const oh = partyLine(owner).handle;
  const ch = partyLine(collaborator).handle;
  const credits = getCredits(c);
  return {
    number: "6",
    title: "Ownership and splits",
    paragraphs: [
      "On full release of the agreed payment under Section 4, the following splits become effective:",
      { kind: "splits-block", label: "Master recording (sound recording copyright)", rows: [
        { handle: oh, pct: fmtPct(s.master_owner_pct) },
        { handle: ch, pct: fmtPct(s.master_collaborator_pct) },
      ] },
      { kind: "splits-block", label: "Publishing (composition / underlying musical work)", rows: [
        { handle: oh, pct: fmtPct(s.publishing_owner_pct) },
        { handle: ch, pct: fmtPct(s.publishing_collaborator_pct) },
      ] },
      "What this means. Each party owns the percentage of each copyright set out above from the moment of full release of the payment. Neither party may exploit the work commercially before full release.",
      "Filing with collection societies. Each party is responsible for registering this work and the agreed splits with their own collection society or PRO (in Australia: APRA AMCOS; in the US: ASCAP, BMI, or SESAC; in the UK: PRS for Music; and equivalent bodies elsewhere). Seshn does not file splits with any collection society. Seshn provides this signed agreement as evidence the parties may rely on when registering.",
      "Credit. The parties agree to use the following credit text in any release, distribution metadata, or public promotion of the work:",
      { kind: "blockquote", text: fallback(credits.text, "[credit text]") },
      "Variations of this credit (for example, abbreviated versions for short-form metadata) are permitted provided they substantively preserve the attribution above.",
    ],
  };
}

function buildDisputes(): AgreementSection {
  return {
    number: "7",
    title: "Disputes",
    paragraphs: [
      "Either party may open a dispute under this contract via the Seshn dispute process during the approval window in Section 5.",
      "When a dispute is opened:",
      { kind: "list-bullet", items: [
        "the auto-release timer is immediately paused;",
        "the funds remain in escrow;",
        "Seshn's support team will contact both parties to gather evidence;",
        "the parties agree to engage in good faith with the Seshn dispute process before pursuing any other resolution.",
      ] },
      "The Seshn dispute process may result in one of the following outcomes:",
      { kind: "list-bullet", items: [
        "release, the full funds are released to the Collaborator;",
        "refund, the full funds are returned to the Owner;",
        "split, a partial amount is released to the Collaborator and the remainder is returned to the Owner, as agreed by both parties or as determined by the Seshn dispute resolver.",
      ] },
      "If the parties cannot resolve a dispute through the Seshn process, the dispute is subject to the dispute resolution clause of Seshn's Terms of Service, which provides for arbitration under the rules of the Resolution Institute (or such other Australian arbitration body as the Terms of Service specify). Any arbitration is seated in Sydney, New South Wales, and conducted in English.",
    ],
  };
}

function buildWarranties(): AgreementSection {
  return {
    number: "8",
    title: "Representations and warranties",
    paragraphs: [
      "Each party warrants to the other that:",
      { kind: "list-letter", items: [
        "they have the legal capacity and right to enter into this agreement;",
        "their contribution to the work is original to them, or properly licensed from any third party whose material they incorporate, and does not infringe any third party's rights;",
        "they will use the work only in ways consistent with the ownership and credit terms in Section 6.",
      ] },
      "Each party indemnifies the other against any third-party claim arising from a breach of the warranties above by the indemnifying party.",
    ],
  };
}

function buildConfidentiality(): AgreementSection {
  return {
    number: "9",
    title: "Confidentiality",
    paragraphs: [
      "Work in progress shared between the parties under this agreement (including unreleased demos, rough mixes, lyrics, stems and session files) is confidential. Neither party may share work in progress with any third party until the work is publicly released or unless both parties consent in writing.",
      "This obligation does not apply to:",
      { kind: "list-bullet", items: [
        "information that becomes public other than through a breach of this section;",
        "information independently developed; or",
        "disclosures required by law.",
      ] },
    ],
  };
}

function buildTermination(): AgreementSection {
  return {
    number: "10",
    title: "Termination",
    paragraphs: [
      "This agreement may be terminated:",
      { kind: "list-letter", items: [
        "by mutual agreement at any time before delivery, in which case Seshn will refund the held funds to the Owner and this agreement is void;",
        "by the Owner if the Collaborator fails to deliver by the deadline in Section 3 and does not request a deadline extension that the Owner accepts;",
        "on full release of the funds and effective transfer of the splits in Section 6, at which point this agreement is complete.",
      ] },
    ],
  };
}

function buildGoverningLaw(): AgreementSection {
  return {
    number: "11",
    title: "Governing law",
    paragraphs: [
      "This agreement is governed by the laws of " + PLATFORM.jurisdiction + ". Subject to the dispute resolution process in Section 7 and Seshn's Terms of Service, the parties submit to the exclusive jurisdiction of the courts of " + PLATFORM.jurisdiction + ".",
    ],
  };
}

function buildElectronicSignature(): AgreementSection {
  return {
    number: "12",
    title: "Electronic signature",
    paragraphs: [
      "The parties consent to executing this agreement electronically through Seshn's click-to-sign interface.",
      'By clicking "Sign contract" on Seshn while signed in to their account, each party:',
      { kind: "list-bullet", items: [
        "confirms their identity as the named party;",
        "agrees to be bound by the terms of this agreement; and",
        "consents to Seshn recording the date, time, IP address, user-agent and a cryptographic hash of this agreement as proof of their signature.",
      ] },
      "This agreement is binding on the parties as an electronic signature under the Electronic Transactions Act 1999 (Cth) and equivalent legislation in other jurisdictions.",
    ],
  };
}

function buildSignatureBlocks(c: TemplateContract, owner?: PartyProfile, collaborator?: PartyProfile) {
  return {
    title: "Signed",
    owner: { party: partyLine(owner), signed_at: c.owner_signed_at, evidence: c._owner_evidence || null },
    collaborator: { party: partyLine(collaborator), signed_at: c.collaborator_signed_at, evidence: c._collaborator_evidence || null },
    witness: { entity: PLATFORM.legal_entity, contract_id: c.id || "[contract id]" },
  };
}

export function render(contract: TemplateContract, owner?: PartyProfile, collaborator?: PartyProfile, gig?: TemplateGig): AgreementDoc {
  return {
    version: TEMPLATE_VERSION,
    title: "COLLABORATION AGREEMENT",
    header: {
      contract_id: contract?.id || "[contract id]",
      created_at: contract?.created_at || null,
      gig_title: gig?.title || null,
    },
    sections: [
      buildParties(owner, collaborator),
      buildBackground(gig),
      buildDeliverable(contract),
      buildPayment(contract),
      buildApproval(contract),
      buildSplits(contract, owner, collaborator),
      buildDisputes(),
      buildWarranties(),
      buildConfidentiality(),
      buildTermination(),
      buildGoverningLaw(),
      buildElectronicSignature(),
    ],
    signatures: buildSignatureBlocks(contract, owner, collaborator),
  };
}

// Stable string form for SHA-256. Mirrors the prototype (a JSON.stringify of
// the render() output), so the hash a party signs is identical to before.
export function canonicalize(doc: AgreementDoc): string {
  return JSON.stringify(doc);
}

export async function hashAgreement(doc: AgreementDoc): Promise<string> {
  const str = canonicalize(doc);
  if (typeof crypto === "undefined" || !crypto.subtle) throw new Error("Web Crypto unavailable; cannot hash agreement client-side.");
  const buf = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const SeshnContract = { version: TEMPLATE_VERSION, platform: PLATFORM, render, hashAgreement, canonicalize, fmtMoney, fmtDate, fmtPct };
