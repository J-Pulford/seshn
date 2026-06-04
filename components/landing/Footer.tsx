import { SESHN } from "@/lib/landing/content";

// Marketing footer — mono, 4-column. CTAs into the app point at /auth.
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-col">
          <b>SESHN.DAW</b>
          <p style={{ color: "var(--ink-2)", fontFamily: '"Inter Tight", sans-serif', fontSize: 13, lineHeight: 1.6, maxWidth: 280 }}>
            {SESHN.meta.tagline} The home base for the working musician — post a brief, find vetted collaborators, ship the record together.
          </p>
        </div>
        <div className="footer-col">
          <b>PRODUCT</b>
          <a href="/features">Features</a>
          <a href="/roadmap">Roadmap</a>
          <a href="/pro">Pricing</a>
          <a href="/auth">Start a session</a>
        </div>
        <div className="footer-col">
          <b>COMPANY</b>
          <a href="/mission">Mission</a>
          <a href="/stories">Stories</a>
          <a href="/suggestions">Suggest a feature</a>
          <a href="/privacy">Privacy</a>
        </div>
        <div className="footer-col">
          <b>SOCIAL</b>
          <a href="#">Instagram</a>
          <a href="#">TikTok</a>
          <a href="#">YouTube</a>
        </div>
      </div>
      <div className="bottom">
        <span>© {SESHN.meta.year} SESHN.DAW · v1.2.4</span>
        <span>BROOKLYN · CDMX · LDN</span>
      </div>
    </footer>
  );
}
