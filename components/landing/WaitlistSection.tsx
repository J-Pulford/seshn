"use client";

import { useState } from "react";
import { joinWaitlist } from "@/lib/seshn/waitlist";
import { PROFILE_ROLES } from "@/lib/seshn/constants";
import Reveal from "./Reveal";

type Status = "idle" | "sending" | "done" | "error";

// Early-access email capture for the landing. Writes to the insert-only
// `waitlist` table via lib/seshn/waitlist. Styled with the DAW theme tokens
// (see landing.css .wl-*).
export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [already, setAlready] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrMsg("");
    try {
      const res = await joinWaitlist({ email, role, location, source: "landing" });
      setAlready(res.already);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrMsg((err as Error)?.message || "Something went wrong — please try again.");
    }
  }

  return (
    <section className="section" id="waitlist" style={{ background: "var(--bg-2)" }}>
      <div className="container">
        <Reveal>
          <span className="label">[EARLY ACCESS] · THE WAITLIST</span>
          <h2>Get in <span className="stem">before the doors open.</span></h2>
          <p className="lede">
            We let artists in by batches so support stays human and the matches stay good. Drop your email and we&apos;ll
            cue you for the next round — tell us what you do and we&apos;ll line up collaborators for you on day one.
          </p>
        </Reveal>

        <Reveal className="wl-card">
          {status === "done" ? (
            <div className="wl-done" role="status">
              <div className="wl-done-mark" aria-hidden="true">✓</div>
              <h3>{already ? "You're already on the list." : "You're on the list."}</h3>
              <p>
                {already
                  ? "Sit tight — we'll reach out when the next batch opens."
                  : "We'll email you when your batch opens. No spam, no selling your data — ever."}
              </p>
            </div>
          ) : (
            <form className="wl-form" onSubmit={onSubmit} noValidate>
              <div className="wl-row">
                <label className="wl-field wl-grow">
                  <span className="wl-lab">EMAIL</span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@studio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label className="wl-field">
                  <span className="wl-lab">YOU ARE A…</span>
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="">Pick a role (optional)</option>
                    {PROFILE_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                    <option value="Other">Other / listener</option>
                  </select>
                </label>
              </div>
              <div className="wl-row">
                <label className="wl-field wl-grow">
                  <span className="wl-lab">CITY (OPTIONAL)</span>
                  <input
                    type="text"
                    autoComplete="address-level2"
                    placeholder="Brooklyn, CDMX, London…"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    maxLength={120}
                  />
                </label>
                <button type="submit" className="btn primary wl-submit" disabled={status === "sending"}>
                  {status === "sending" ? "Joining…" : "Join the waitlist →"}
                </button>
              </div>
              {status === "error" && <div className="wl-err" role="alert">{errMsg}</div>}
              <div className="wl-fine">No spam. We&apos;ll only email you about your spot.</div>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
