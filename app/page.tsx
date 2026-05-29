// TEMPORARY scaffold home. Phase 1 replaces this with the ported landing page
// (app/page.tsx, SSR). It only exists so the Next.js build has a root route and
// so we can verify the foundation (CSS variables, shared components, TS) renders
// on a Vercel preview. Not for production — see docs/NEXTJS-MIGRATION.md.
import { AlbumArt } from "@/components/visual/AlbumArt";
import { Vinyl } from "@/components/visual/Vinyl";
import { Grain } from "@/components/visual/Grain";

export default function ScaffoldHome() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--land-bg)",
        color: "var(--land-ink)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 32,
        textAlign: "center",
      }}
    >
      <Grain opacity={0.18} />
      <Vinyl size={72} color="rgba(255,255,255,0.08)" label="var(--accent)" style={{ animation: "seshn-spin 12s linear infinite" }} />
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, letterSpacing: "-0.03em" }}>
          Seshn — Next.js migration
        </div>
        <p style={{ color: "var(--land-ink-3)", fontFamily: "var(--font-display)", marginTop: 8, fontSize: 14 }}>
          Scaffold is live. Phase 1 replaces this with the real landing page.
        </p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {["coast-demo", "morning-light", "seshn", "vol-1"].map((s) => (
          <AlbumArt key={s} seed={s} size={64} radius={8} />
        ))}
      </div>
      <p style={{ color: "var(--land-ink-3)", fontSize: 12, maxWidth: 420, lineHeight: 1.5 }}>
        The live app continues to serve from <code>/app/*.html</code> while pages are ported one at a time.
      </p>
    </main>
  );
}
