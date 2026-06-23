// Analytics consent (cookie banner). Stored in localStorage; changes broadcast
// via a window event so the banner and the GA loader stay in sync without a
// shared provider. "granted" = load analytics; "denied"/null = don't.
export const CONSENT_KEY = "seshn:analytics-consent";
export const CONSENT_EVENT = "seshn:consent-changed";

export type Consent = "granted" | "denied" | null;

export function getConsent(): Consent {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(v: "granted" | "denied"): void {
  try {
    localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* private mode / storage blocked */
  }
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: v }));
  } catch {
    /* no-op */
  }
}
