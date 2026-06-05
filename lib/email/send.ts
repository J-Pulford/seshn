// Transactional email sender. Provider-agnostic over a tiny REST call so we add
// no dependency; uses Resend's HTTP API. Dormant until RESEND_API_KEY is set
// (same philosophy as Stripe) — without it, sends are no-ops so the app runs
// fine pre-launch. Server-only.
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "Seshn <hello@seshnnn.com>";

export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(msg: OutgoingEmail): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!isEmailConfigured()) return { ok: false, skipped: true };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text }),
  });
  if (!res.ok) {
    throw new Error(`Resend send failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  return { ok: true };
}
