"use client";

import { useEffect } from "react";

// Supabase auth email links (magic link / password recovery) are configured to
// return to /auth. But if the Supabase project's Site URL / Redirect-URL
// allow-list isn't set for this domain, Supabase falls back to the Site URL
// (the homepage) and appends the auth params there — leaving the user stranded,
// seemingly logged out, on the landing page with the token unused.
//
// This catches that case on ANY page and forwards the auth params to /auth,
// where the browser client's detectSessionInUrl + onAuthStateChange complete the
// sign-in (or recovery). It's a safety net: the proper fix is the Supabase URL
// configuration, but this keeps email links working regardless.
export default function AuthLinkCatcher() {
  useEffect(() => {
    // /auth already handles its own params; never bounce in a loop.
    if (window.location.pathname === "/auth") return;

    const search = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));

    const isRecovery = hashParams.get("type") === "recovery";
    const hasImplicitToken = !!hashParams.get("access_token");
    const hasAuthError = !!hashParams.get("error") || !!hashParams.get("error_description");
    // PKCE auth code from a Supabase email link arrives as `?code=` with NO
    // OAuth `state`. The Spotify connect flow on /settings sends code+state, so
    // requiring the absence of `state` cleanly excludes it.
    const hasPkceCode = !!search.get("code") && !search.get("state");

    if (!isRecovery && !hasImplicitToken && !hasAuthError && !hasPkceCode) return;

    const target = new URL("/auth", window.location.origin);
    // Carry the original query + hash through so /auth can finish the exchange.
    if (window.location.search) target.search = window.location.search;
    if (window.location.hash) target.hash = window.location.hash;
    // A recovery link's intent lives in the hash (type=recovery); surface it as
    // the query flag /auth uses to show the "set a new password" form.
    if (isRecovery) target.searchParams.set("recover", "1");

    window.location.replace(target.toString());
  }, []);

  return null;
}
