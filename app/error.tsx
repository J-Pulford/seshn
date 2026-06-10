"use client";

// Route-level error boundary (renders inside the root layout). Catches render
// errors in a route subtree and offers recovery without a full reload.
// Reports to Sentry when it's configured (no-op otherwise).
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center", background: "var(--bg)" }}>
      <a href="/" className="logo" style={{ fontSize: 22, marginBottom: 4 }}>Seshn</a>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", color: "var(--ink)" }}>Something went wrong</h1>
      <p style={{ color: "var(--ink-3)", fontSize: 15, maxWidth: 440, lineHeight: 1.6 }}>
        A hiccup on our end — give it another go. If it keeps happening, let us know on the help board.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button className="btn primary" onClick={() => reset()}>Try again</button>
        <a href="/feed" className="btn">Go to feed</a>
      </div>
      {error?.digest && <span style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "ui-monospace, SFMono-Regular, monospace", marginTop: 4 }}>ref: {error.digest}</span>}
    </div>
  );
}
