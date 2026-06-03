// Auth helpers + route guards. Typed port of the auth section of the legacy
// seshn-supabase.js, including the email-verification gate. Browser-only.
import type { User } from "@supabase/supabase-js";
import { getBrowserClient } from "./client";
import { getProfile, getUser } from "./profiles";
import type { Profile } from "./types";

export { getUser };

// Redirect targets. Some still point at legacy .html pages that haven't been
// ported yet; flip each to its Next route as that page lands. Centralised here
// so the guards don't need editing in multiple places.
const ROUTES = {
  auth: "/auth", // ported
  onboarding: "/onboarding", // ported
  feed: "/feed", // ported
  profile: (username: string) => `/profile/${encodeURIComponent(username)}`, // ported
};

function origin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

export async function signOut() {
  return getBrowserClient().auth.signOut();
}

export async function sendMagicLink(email: string, redirectTo?: string) {
  return getBrowserClient().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo || origin() + "/auth",
      shouldCreateUser: true,
    },
  });
}

// The account must already exist and have a password. Supabase returns the same
// generic "Invalid login credentials" for unknown email / wrong password /
// unverified email by design (no account enumeration).
export async function signInWithPassword(email: string, password: string) {
  if (!email || !password) throw new Error("Email and password required");
  return getBrowserClient().auth.signInWithPassword({ email: email.trim(), password });
}

export async function signUpWithPassword(email: string, password: string, redirectTo?: string) {
  if (!email || !password) throw new Error("Email and password required");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
  return getBrowserClient().auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: redirectTo || origin() + "/auth" },
  });
}

// Set or change the current user's password.
export async function setMyPassword(newPassword: string) {
  if (!newPassword) throw new Error("Missing password");
  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters");
  const res = await getBrowserClient().auth.updateUser({ password: newPassword });
  if (res.error) throw res.error;
  return res.data;
}

export async function sendPasswordReset(email: string, redirectTo?: string) {
  if (!email) throw new Error("Missing email");
  return getBrowserClient().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectTo || origin() + "/auth?recover=1",
  });
}

export async function signInWithGoogle(redirectTo?: string) {
  return getBrowserClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectTo || origin() + "/auth" },
  });
}

export async function updateMyEmail(newEmail: string) {
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  if (!newEmail?.trim()) throw new Error("Missing email");
  const res = await getBrowserClient().auth.updateUser({ email: newEmail.trim() });
  if (res.error) throw res.error;
  return res.data;
}

// True once the user has confirmed their email. Magic-link/Google set this on
// first use, so it's only ever false for an unconfirmed password signup.
export function isEmailVerified(u: User | null): boolean {
  return !!(u && (u.email_confirmed_at || u.confirmed_at));
}

export async function resendVerificationEmail(email: string, redirectTo?: string) {
  if (!email?.trim()) throw new Error("Missing email");
  return getBrowserClient().auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: redirectTo || origin() + "/auth" },
  });
}

export async function deleteMyAccount() {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  const res = await sb.rpc("delete_my_account");
  if (res.error) throw res.error;
  await sb.auth.signOut();
}

// After a successful sign-in, send the user where they belong. Gates unverified
// emails to the confirm screen; routes incomplete profiles to onboarding; honours
// a ?next= / sessionStorage hop; otherwise lands on their profile.
export async function routeAfterAuth() {
  const u = await getUser();
  if (!u) return;
  if (!isEmailVerified(u)) {
    window.location.href = ROUTES.auth + "?verify=1" + (u.email ? "&email=" + encodeURIComponent(u.email) : "");
    return;
  }
  const p = await getProfile({ id: u.id });
  if (!p || !p.username) {
    window.location.href = ROUTES.onboarding;
    return;
  }
  let next = new URLSearchParams(window.location.search).get("next");
  if (!next) {
    try {
      next = sessionStorage.getItem("seshn_auth_next");
    } catch {
      /* ignore */
    }
  }
  try {
    sessionStorage.removeItem("seshn_auth_next");
  } catch {
    /* ignore */
  }
  // Only follow same-origin relative paths. The negative lookahead rejects
  // protocol-relative ("//evil.com") and backslash ("/\\evil.com") targets,
  // which the browser would otherwise treat as an off-site (open) redirect.
  if (next && /^\/(?![/\\])[A-Za-z0-9_./?=&%-]*$/.test(next)) {
    window.location.href = next;
    return;
  }
  window.location.href = ROUTES.profile(p.username);
}

export interface RequireProfileResult {
  user: User;
  profile: Profile;
}

// Gate a signed-in page. Returns { user, profile } when ready; otherwise
// redirects (to auth when signed out / unverified, to onboarding when the
// profile is incomplete) and returns null. Pass allowAnon for public-read pages.
export async function requireProfile(
  opts: { allowAnon?: boolean } = {},
): Promise<RequireProfileResult | { user: null; profile: null } | null> {
  const u = await getUser();
  if (!u) {
    if (opts.allowAnon) return { user: null, profile: null };
    const next = window.location.pathname + window.location.search;
    window.location.href = ROUTES.auth + "?next=" + encodeURIComponent(next);
    return null;
  }
  if (!isEmailVerified(u) && !opts.allowAnon) {
    window.location.href = ROUTES.auth + "?verify=1" + (u.email ? "&email=" + encodeURIComponent(u.email) : "");
    return null;
  }
  const p = await getProfile({ id: u.id });
  if (!p || !p.username) {
    window.location.href = ROUTES.onboarding;
    return null;
  }
  return { user: u, profile: p };
}
