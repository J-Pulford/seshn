"use client";

import { useEffect, useState } from "react";
import { getConsent, setConsent, CONSENT_EVENT } from "@/lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// Cookie-consent banner for analytics. Only appears when analytics is actually
// configured (NEXT_PUBLIC_GA_ID set) and the visitor hasn't chosen yet. Choosing
// "Accept" lets GoogleAnalytics load; "Decline" keeps it off. Self-contained
// dark styling so it reads on both the marketing site and the app.
export default function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!GA_ID) return;
    const sync = () => setShow(getConsent() === null);
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!GA_ID || !show) return null;

  const btn: React.CSSProperties = {
    padding: "9px 16px",
    borderRadius: 8,
    fontFamily: "var(--font-display, system-ui)",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    border: "1px solid transparent",
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 1000,
        maxWidth: 720,
        margin: "0 auto",
        background: "#16161a",
        color: "#ececec",
        border: "1px solid #2d2d33",
        borderRadius: 14,
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        padding: "16px 18px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
      }}
    >
      <p style={{ margin: 0, flex: "1 1 280px", fontSize: 13, lineHeight: 1.5, color: "#cfcfd4" }}>
        We use Google Analytics to understand how Seshn is used and make it better. It only runs if you
        accept. See our{" "}
        <a href="/privacy" style={{ color: "#2CCB73", textDecoration: "underline" }}>privacy policy</a>.
      </p>
      <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
        <button
          type="button"
          onClick={() => setConsent("denied")}
          style={{ ...btn, background: "transparent", color: "#cfcfd4", border: "1px solid #3a3a42" }}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => setConsent("granted")}
          style={{ ...btn, background: "#2CCB73", color: "#062c19" }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
