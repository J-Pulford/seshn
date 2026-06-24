"use client";

import { useEffect, useRef, useState } from "react";
import { AlbumArt } from "@/components/visual/AlbumArt";
import { Vinyl } from "@/components/visual/Vinyl";
import { Grain } from "@/components/visual/Grain";
import { getBrowserClient } from "@/lib/seshn/client";
import {
  getUser,
  isEmailVerified,
  routeAfterAuth,
  sendMagicLink,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  sendPasswordReset,
  setMyPassword,
  resendVerificationEmail,
} from "@/lib/seshn/auth";
import Captcha, { captchaEnabled, type CaptchaHandle } from "@/components/Captcha";
import "./auth.css";

type Status = "idle" | "sending" | "sent" | "error" | "checking";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function AuthPage() {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Sign-up defaults to password (Artist name + email + password); sign-in keeps
  // the magic-link default. switchMode() resets this per tab.
  const [mode, setMode] = useState<"magic" | "password">("password");
  // Intent: are we creating an account (→ onboarding) or returning (→ sign in)?
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [artistName, setArtistName] = useState("");
  const [status, setStatus] = useState<Status>("checking");
  const [errMsg, setErrMsg] = useState("");
  const [recoverMode, setRecoverMode] = useState(false);
  const [verifyMode, setVerifyMode] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);
  // Only block on captcha when it's actually configured (site key present).
  const needCaptcha = captchaEnabled && !captchaToken;

  // All URL-dependent state is read after mount to avoid a hydration mismatch
  // between the server prerender (no window) and the client.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recover =
      params.get("recover") === "1" ||
      /(^|&)type=recovery(&|$)/.test((window.location.hash || "").replace(/^#/, ""));
    const verify = params.get("verify") === "1";
    const presetEmail = params.get("email") || "";
    setRecoverMode(recover);
    setVerifyMode(verify);
    if (params.get("mode") === "signin") { setAuthMode("signin"); setMode("magic"); }
    if (presetEmail) setEmail(presetEmail);
    setReady(true);

    // An auth code (?code=, PKCE) or token (#access_token, implicit) in the URL
    // means the client is still exchanging it for a session. Don't auto-route
    // yet — let onAuthStateChange decide (SIGNED_IN → route, PASSWORD_RECOVERY →
    // show the reset form), so a recovery link without ?recover=1 isn't bounced
    // straight to the profile before we know it's a recovery.
    const pendingExchange =
      params.has("code") || /(access_token|type=recovery)=?/.test(window.location.hash || "");

    const sb = getBrowserClient();
    getUser().then((u) => {
      if (!u || recover || pendingExchange) {
        setStatus("idle");
        return;
      }
      if (isEmailVerified(u)) {
        routeAfterAuth();
        return;
      }
      // Signed in but unverified: park on the verify screen (never call
      // routeAfterAuth for an unverified user — it would reload-loop here).
      if (!verify) {
        window.location.href =
          "/auth?verify=1" + (u.email ? "&email=" + encodeURIComponent(u.email) : "");
        return;
      }
      if (u.email) setEmail(u.email);
      setStatus("idle");
    });

    const { data } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // Recovery session established — surface the "set a new password" form,
        // even if the URL never carried ?recover=1 (e.g. a PKCE recovery link).
        setRecoverMode(true);
        setStatus("idle");
        return;
      }
      if (event === "SIGNED_IN" && session && !recover && isEmailVerified(session.user)) {
        routeAfterAuth();
      }
    });
    return () => data?.subscription?.unsubscribe();
  }, []);

  async function onGoogle() {
    setErrMsg("");
    setStatus("sending");
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) sessionStorage.setItem("seshn_auth_next", next);
    const redirect = window.location.origin + "/auth" + (next ? "?next=" + encodeURIComponent(next) : "");
    try {
      const { error } = await signInWithGoogle(redirect);
      if (error) throw error;
    } catch (e) {
      setStatus("error");
      setErrMsg((e as Error)?.message || "Couldn't start Google sign-in.");
    }
  }

  async function onSendMagic(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email || !email.includes("@")) {
      setErrMsg("Please enter a valid email.");
      setStatus("error");
      return;
    }
    if (authMode === "signup" && !artistName.trim()) {
      setErrMsg("Enter your artist name.");
      setStatus("error");
      return;
    }
    if (needCaptcha) {
      setErrMsg("Please complete the verification below.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setErrMsg("");
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) sessionStorage.setItem("seshn_auth_next", next);
    try {
      const { error } = await sendMagicLink(email, undefined, captchaToken ?? undefined, authMode === "signup" ? artistName : undefined);
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setErrMsg((err as Error)?.message || "Couldn't send the link.");
      setStatus("error");
      captchaRef.current?.reset();
    }
  }

  // Toggle between create-account and sign-in intent, syncing the URL so the
  // mode survives a refresh and can be linked to directly (?mode=signin).
  function switchMode(m: "signup" | "signin") {
    setAuthMode(m);
    setErrMsg("");
    setStatus("idle");
    setPassword("");
    // Sign-up leads with password (Artist name/email/password); sign-in with magic.
    setMode(m === "signup" ? "password" : "magic");
    const url = new URL(window.location.href);
    url.searchParams.set("mode", m);
    window.history.replaceState({}, "", url.toString());
  }

  async function onSignUpPassword(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email || !email.includes("@")) {
      setErrMsg("Please enter a valid email.");
      setStatus("error");
      return;
    }
    if (!artistName.trim()) {
      setErrMsg("Enter your artist name.");
      setStatus("error");
      return;
    }
    if (!password || password.length < 8) {
      setErrMsg("Password must be at least 8 characters.");
      setStatus("error");
      return;
    }
    if (needCaptcha) {
      setErrMsg("Please complete the verification below.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setErrMsg("");
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) sessionStorage.setItem("seshn_auth_next", next);
    try {
      const { data, error } = await signUpWithPassword(email, password, undefined, captchaToken ?? undefined, artistName);
      if (error) throw error;
      // If email confirmations are off, Supabase returns a session — go straight
      // through (routeAfterAuth sends a profile-less new user to onboarding).
      if (data.session) {
        routeAfterAuth();
        return;
      }
      // Otherwise we need them to confirm their email first.
      window.location.href = "/auth?verify=1&email=" + encodeURIComponent(email);
    } catch (err) {
      setErrMsg((err as Error)?.message || "Couldn't create your account.");
      setStatus("error");
      captchaRef.current?.reset();
    }
  }

  async function onSignInPassword(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email || !email.includes("@")) {
      setErrMsg("Please enter a valid email.");
      setStatus("error");
      return;
    }
    if (!password) {
      setErrMsg("Please enter your password.");
      setStatus("error");
      return;
    }
    if (needCaptcha) {
      setErrMsg("Please complete the verification below.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setErrMsg("");
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) sessionStorage.setItem("seshn_auth_next", next);
    try {
      const { error } = await signInWithPassword(email, password, captchaToken ?? undefined);
      if (error) throw error;
      // routeAfterAuth fires via onAuthStateChange when the session lands.
    } catch (err) {
      setErrMsg((err as Error)?.message || "Couldn't sign in.");
      setStatus("error");
      captchaRef.current?.reset();
    }
  }

  async function onSendReset() {
    if (!email || !email.includes("@")) {
      setErrMsg("Enter your email above first.");
      setStatus("error");
      return;
    }
    if (needCaptcha) {
      setErrMsg("Please complete the verification below.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setErrMsg("");
    try {
      const { error } = await sendPasswordReset(email, undefined, captchaToken ?? undefined);
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setErrMsg((err as Error)?.message || "Couldn't send the reset email.");
      setStatus("error");
      captchaRef.current?.reset();
    }
  }

  async function onSetNewPassword(e?: React.FormEvent) {
    e?.preventDefault();
    if (!password || password.length < 8) {
      setErrMsg("Password must be at least 8 characters.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setErrMsg("");
    try {
      await setMyPassword(password);
      window.history.replaceState({}, "", window.location.pathname);
      routeAfterAuth();
    } catch (err) {
      setErrMsg((err as Error)?.message || "Couldn't set password.");
      setStatus("error");
    }
  }

  async function onResendVerification() {
    if (!email || !email.includes("@")) {
      setErrMsg("We don't have your email, try signing in again.");
      setStatus("error");
      return;
    }
    if (needCaptcha) {
      setErrMsg("Please complete the verification below.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setErrMsg("");
    try {
      const { error } = await resendVerificationEmail(email, undefined, captchaToken ?? undefined);
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setErrMsg((err as Error)?.message || "Couldn't resend the email.");
      setStatus("error");
      captchaRef.current?.reset();
    }
  }

  async function onCheckVerified() {
    setStatus("checking");
    setErrMsg("");
    try {
      const u = await getUser();
      if (u && isEmailVerified(u)) {
        routeAfterAuth();
        return;
      }
      setStatus("idle");
      setErrMsg("Still not confirmed, open the link in the email (check spam too).");
    } catch {
      setStatus("idle");
      setErrMsg("Couldn't check just yet, give it a moment and try again.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <nav className="top-nav">
        <a href="/" className="logo">Seshn</a>
        <button type="button" onClick={() => switchMode(authMode === "signup" ? "signin" : "signup")}
          style={{ fontSize: 13, color: "var(--ink-3)", textDecoration: "none", fontFamily: "var(--font-display)", background: "none", border: "none", cursor: "pointer" }}>
          {authMode === "signup" ? (
            <>Already on Seshn? <strong style={{ color: "var(--ink)" }}>Sign in</strong></>
          ) : (
            <>New to Seshn? <strong style={{ color: "var(--ink)" }}>Create an account</strong></>
          )}
        </button>
      </nav>

      <div className="auth-grid" style={{ flex: 1 }}>
        <div className="auth-left">
          <div className="eyebrow">{authMode === "signup" ? "Join Seshn" : "Welcome back"}</div>
          {authMode === "signup" ? (
            <>
              <h1>Make your first<br />session.</h1>
              <p className="sub">Create a profile, post a brief, find your collaborators. Free forever, no follower counts, no noise.</p>
            </>
          ) : (
            <>
              <h1>Pick up where<br />you left off.</h1>
              <p className="sub">Sign in to your profile, your gigs, and your messages.</p>
            </>
          )}

          {!ready ? (
            <div className="form-stack"><div style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--ink-3)" }}>Loading…</div></div>
          ) : verifyMode ? (
            <div className="form-stack">
              <div style={{ padding: "16px 18px", borderRadius: 12, border: "1px solid var(--accent-d)", background: "var(--accent-bg)", color: "var(--accent-d)", fontFamily: "var(--font-display)", fontSize: 13, lineHeight: 1.5 }}>
                <strong>Confirm your email to continue.</strong> We sent a confirmation link
                {email ? <> to <b>{email}</b></> : ""}. Open it, then come back here.
              </div>
              {status === "sent" ? (
                <div style={{ fontSize: 13, color: "var(--ink-2)", fontFamily: "var(--font-display)" }}>
                  Sent again, give it a minute, then check your inbox (and spam).
                </div>
              ) : (
                <>
                  <Captcha ref={captchaRef} onToken={setCaptchaToken} />
                  <button type="button" className="btn-primary" onClick={onResendVerification} disabled={status === "sending" || needCaptcha}>
                    {status === "sending" ? "Resending…" : "Resend confirmation email"}
                  </button>
                </>
              )}
              <button type="button" onClick={onCheckVerified} disabled={status === "checking"} style={linkBtn}>
                {status === "checking" ? "Checking…" : "I've confirmed, continue"}
              </button>
              {errMsg && <div style={errStyle}>{errMsg}</div>}
              <button type="button" onClick={() => getBrowserClient().auth.signOut().then(() => (window.location.href = "/auth"))} style={{ ...linkBtn, color: "var(--ink-4)", marginTop: 4 }}>
                Use a different account
              </button>
            </div>
          ) : recoverMode ? (
            <form className="form-stack" onSubmit={onSetNewPassword}>
              <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--surface-2)", fontFamily: "var(--font-display)", fontSize: 13, color: "var(--ink-2)" }}>
                You&apos;re signed in. Set a new password below to finish recovery.
              </div>
              <input type="password" className="input-field" placeholder="New password (min 8 characters)" value={password}
                onChange={(e) => { setPassword(e.target.value); if (status === "error") setStatus("idle"); }}
                disabled={status === "sending"} autoComplete="new-password" autoFocus />
              <button type="submit" className="btn-primary" disabled={status === "sending" || !password}>
                {status === "sending" ? "Saving…" : "Set new password →"}
              </button>
              {errMsg && <div style={errStyle}>{errMsg}</div>}
            </form>
          ) : (
            <form
              className="form-stack"
              onSubmit={
                mode === "password"
                  ? authMode === "signup"
                    ? onSignUpPassword
                    : onSignInPassword
                  : onSendMagic
              }
            >
              <button type="button" className="btn-oauth" onClick={onGoogle} disabled={status === "sending" || status === "checking"}>
                <GoogleIcon />
                {authMode === "signup" ? "Sign up with Google" : "Continue with Google"}
              </button>
              <div className="divider"><span>or with email</span></div>

              {status === "sent" ? (
                <div style={{ padding: "16px 18px", borderRadius: 12, border: "1px solid var(--accent-d)", background: "var(--accent-bg)", color: "var(--accent-d)", fontFamily: "var(--font-display)", fontSize: 13, lineHeight: 1.45 }}>
                  <strong>Check your inbox.</strong> We sent {mode === "password" ? "a reset link" : authMode === "signup" ? "a sign-up link" : "a sign-in link"} to <b>{email}</b>. Open it on this device to continue.
                </div>
              ) : (
                <>
                  {authMode === "signup" && (
                    <input type="text" className="input-field" placeholder="Artist name" value={artistName}
                      onChange={(e) => { setArtistName(e.target.value); if (status === "error") setStatus("idle"); }}
                      disabled={status === "sending" || status === "checking"} autoComplete="nickname" maxLength={60} />
                  )}
                  <input type="email" className="input-field" placeholder="you@artist.fm" value={email}
                    onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
                    disabled={status === "sending" || status === "checking"} autoComplete="email" />
                  {mode === "password" && (
                    <input type="password" className="input-field" placeholder={authMode === "signup" ? "Create a password (min 8 characters)" : "Password"} value={password}
                      onChange={(e) => { setPassword(e.target.value); if (status === "error") setStatus("idle"); }}
                      disabled={status === "sending" || status === "checking"} autoComplete={authMode === "signup" ? "new-password" : "current-password"} />
                  )}
                  <Captcha ref={captchaRef} onToken={setCaptchaToken} />
                  <button type="submit" className="btn-primary" disabled={status === "sending" || status === "checking" || !email || (authMode === "signup" && !artistName.trim()) || (mode === "password" && !password) || needCaptcha}>
                    {status === "checking"
                      ? "Loading…"
                      : status === "sending"
                        ? mode === "password"
                          ? authMode === "signup" ? "Creating account…" : "Signing in…"
                          : "Sending link…"
                        : mode === "password"
                          ? authMode === "signup" ? "Create account →" : "Sign in →"
                          : authMode === "signup" ? "Send sign-up link →" : "Email me a sign-in link →"}
                  </button>
                  {errMsg && <div style={{ ...errStyle, marginTop: -4 }}>{errMsg}</div>}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, gap: 12, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => { setMode(mode === "password" ? "magic" : "password"); setErrMsg(""); setStatus("idle"); }} style={linkBtn}>
                      {mode === "password" ? "Use a magic link instead" : "Use a password instead"}
                    </button>
                    {mode === "password" && authMode === "signin" && (
                      <button type="button" onClick={onSendReset} disabled={status === "sending"} style={linkBtn}>
                        Forgot password?
                      </button>
                    )}
                  </div>
                </>
              )}
            </form>
          )}

          {authMode === "signup" && (
            <p className="tos">By signing up you agree to Seshn&apos;s <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</p>
          )}
          <p className="signin-link">
            {authMode === "signup" ? (
              <>Already on Seshn? <a role="button" tabIndex={0} onClick={() => switchMode("signin")} onKeyDown={(e) => { if (e.key === "Enter") switchMode("signin"); }} style={{ cursor: "pointer" }}>Sign in</a></>
            ) : (
              <>New to Seshn? <a role="button" tabIndex={0} onClick={() => switchMode("signup")} onKeyDown={(e) => { if (e.key === "Enter") switchMode("signup"); }} style={{ cursor: "pointer" }}>Create an account</a></>
            )}
          </p>
        </div>

        <div className="auth-right">
          <Grain opacity={0.22} />
          <div className="float-art" style={{ top: 64, right: 44, transform: "rotate(9deg)" }}><AlbumArt seed="coast-demo" size={130} radius={8} /></div>
          <div className="float-art" style={{ top: 148, right: 158, transform: "rotate(-7deg)" }}><AlbumArt seed="morning-light" size={96} radius={6} /></div>
          <div className="float-art" style={{ top: 230, right: 52, transform: "rotate(4deg)" }}>
            <span style={{ display: "inline-block", transform: "rotate(4deg)", padding: "6px 12px", borderRadius: 4, background: "#f0e8d6", color: "#0d0d0d", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", boxShadow: "0 6px 14px rgba(0,0,0,0.25)" }}>✶ artist · vol.1</span>
          </div>
          <div className="float-art" style={{ bottom: 148, right: 210 }}>
            <Vinyl size={60} color="rgba(255,255,255,0.07)" label="var(--accent)" style={{ animation: "seshn-spin 12s linear infinite" }} />
          </div>

          <div className="featured-pill"><span style={{ color: "var(--accent)", fontSize: 8 }}>●</span> Featured artist · this week</div>
          <div className="quote-section">
            <p className="quote-text">&quot;I found my whole band on Seshn in three weeks. Two of them ended up on the record.&quot;</p>
            <div className="attribution">
              <div className="attr-avatar">NK</div>
              <div>
                <div className="attr-name">Nia Kassim</div>
                <div className="attr-sub">Vocalist · London</div>
              </div>
            </div>
            <div className="pagination-dots">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} style={{ width: 18, height: 3, borderRadius: 2, background: i === 0 ? "var(--accent)" : "rgba(255,255,255,0.2)" }} />
              ))}
            </div>
          </div>
          <div className="footer-row"><span>seshn.fm</span><span>01 / 04</span></div>
        </div>
      </div>
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer",
  fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 12,
  color: "var(--ink-3)", textDecoration: "underline", alignSelf: "flex-start",
};
const errStyle: React.CSSProperties = { color: "var(--cherry)", fontSize: 12, fontFamily: "var(--font-display)" };
