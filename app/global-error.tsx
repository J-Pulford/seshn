"use client";

// Last-resort boundary for errors thrown in the root layout itself. It REPLACES
// the root layout, so global CSS/fonts/tokens are NOT available here — styles are
// inlined with the brand's dark "Studio" palette.
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center", background: "#0A0A09", color: "#E9E8E0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.03em", textTransform: "uppercase", color: "#2CCB73" }}>Seshn</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
        <p style={{ color: "#B6B5AB", maxWidth: 420, lineHeight: 1.6 }}>The app hit an unexpected error. Reload to try again.</p>
        <button onClick={() => reset()} style={{ background: "#2CCB73", color: "#062c19", border: "none", borderRadius: 10, padding: "12px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Reload</button>
        {error?.digest && <span style={{ fontSize: 11, color: "#74736A" }}>ref: {error.digest}</span>}
      </body>
    </html>
  );
}
