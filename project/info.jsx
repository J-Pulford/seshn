// Seshn — Info artboards: rationale, palette, type, components, empty states, dev notes

const { Logo, Pill, Avatar, Btn, Input, PH, Line, Lines, Audio, Icon, GigCard, Browser, Phone, MobileTabBar } = window.SeshnAtoms;
const { AlbumArt, Waveform, Marquee, Sticker, Vinyl, Cassette, Polaroid, CoverHeader, Grain, Illo, Highlight } = window.SeshnVisuals;

// ════════════════════════════════════════════════════════════════
// Cover / rationale
// ════════════════════════════════════════════════════════════════
const CoverCard = () => (
  <div className="wf" style={{ padding: "44px 48px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "var(--frame)" }}>
    <div>
      <Logo size={22} />
      <div style={{ height: 18 }} />
      <span className="t-eyebrow">Wireframe set · v0.1 MVP</span>
      <div className="t-h1" style={{ fontSize: 56, lineHeight: 0.98, letterSpacing: "-0.035em", marginTop: 14, maxWidth: 780 }}>
        A platform for the<br />
        people who finish<br />
        <span style={{ color: "var(--accent-d)" }}>your record.</span>
      </div>
      <div style={{ height: 30 }} />
      <div className="t-eyebrow" style={{ marginBottom: 8 }}>Rationale · 200w</div>
      <div style={{ maxWidth: 720, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-2)" }}>
        Seshn sits between three references — <b>Bandcamp</b>'s editorial calm, <b>Are.na</b>'s soft information density, and <b>Splice</b>'s utility. The wireframes are intentionally grayscale plus one accent green, because the brand color carries
        a lot of weight on its own and the layout has to read before the paint does.
        <br /><br />
        Type pairs a confident display sans for headlines (Abizhar, falling back to General Sans / Inter Tight) with a quiet body sans (Satoshi). Density is calm: generous gutters,
        a single accent, no decoration that doesn't earn it. Audio is a first-class citizen — every profile and post is built around a unified embed wrapper so SoundCloud, Spotify and YouTube look like Seshn,
        not three sites in a trench coat. Dark mode is the default elevation for the landing and project room; light mode is the working surface for feed, create, and inbox so reading scans long sessions stay legible.
        <br /><br />
        Every screen on this canvas is paired desktop ↔ mobile. Components below the screens specify the gig card variants, audio embed, tag pills, avatar+role badge, and four empty states.
      </div>
    </div>
    <div className="row" style={{ gap: 28, paddingTop: 28, borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
      <div className="col" style={{ gap: 2 }}>
        <span className="t-meta">Brand</span>
        <span className="t-h3">Seshn</span>
      </div>
      <div className="col" style={{ gap: 2 }}>
        <span className="t-meta">Output</span>
        <span className="t-h3">10 screens · 20 wireframes</span>
      </div>
      <div className="col" style={{ gap: 2 }}>
        <span className="t-meta">Fidelity</span>
        <span className="t-h3">Lo-fi · grayscale + 1 accent</span>
      </div>
      <div className="col" style={{ gap: 2 }}>
        <span className="t-meta">Build target</span>
        <span className="t-h3">Webflow / Next.js</span>
      </div>
      <div className="col" style={{ gap: 2, marginLeft: "auto" }}>
        <span className="t-meta">Drag to pan · scroll to zoom · ↗ to focus any artboard</span>
      </div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// Palette
// ════════════════════════════════════════════════════════════════
const Swatch = ({ name, hex, role, dark }) => (
  <div className="col" style={{ gap: 8 }}>
    <div style={{ height: 110, borderRadius: 10, background: hex, border: "1px solid " + (hex === "#FFFFFF" || hex === "#F4F3EF" ? "var(--line)" : "transparent"), display: "flex", alignItems: "flex-end", padding: 10 }}>
      {role && <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11, color: dark ? "var(--frame)" : "var(--ink)", background: "rgba(255,255,255,0.7)", padding: "2px 6px", borderRadius: 4 }}>{role}</span>}
    </div>
    <div className="col" style={{ gap: 1 }}>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12 }}>{name}</span>
      <span style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.04em" }}>{hex}</span>
    </div>
  </div>
);

const PaletteCard = () => (
  <div className="wf" style={{ padding: 40, overflowY: "auto" }}>
    <Logo />
    <div className="t-eyebrow" style={{ marginTop: 22 }}>03 · Color palette</div>
    <div className="t-h1" style={{ fontSize: 32, marginTop: 6 }}>Vibrant green, anchored to black.</div>
    <span className="t-muted" style={{ fontSize: 13, maxWidth: 540, display: "block", marginTop: 10 }}>
      One accent green, used sparingly. Backgrounds are warm-neutral in light mode and true black in dark mode — this is a music platform, not an enterprise tool.
    </span>
    <div className="t-eyebrow" style={{ marginTop: 30, marginBottom: 12 }}>Brand · greens</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
      <Swatch name="Primary Green" hex="#2CCB73" role="accent" />
      <Swatch name="Deep Green" hex="#1C8F56" role="accent · pressed / text" dark />
      <Swatch name="Mint Accent" hex="#63D89A" role="accent · hover" />
      <Swatch name="Soft Mint" hex="#A8EBC8" role="bg · highlight" />
      <Swatch name="Ink Black" hex="#0D0D0D" role="ink / dark frame" dark />
    </div>
    <div className="t-eyebrow" style={{ marginTop: 30, marginBottom: 12 }}>Surfaces · light</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
      <Swatch name="Background" hex="#F4F3EF" role="canvas" />
      <Swatch name="Frame" hex="#FFFFFF" role="page" />
      <Swatch name="Surface 2" hex="#F7F6F3" role="recessed / input" />
      <Swatch name="Line" hex="#D8D6D1" role="stroke" />
      <Swatch name="Line soft" hex="#ECECEA" role="hairline" />
    </div>
    <div className="t-eyebrow" style={{ marginTop: 30, marginBottom: 12 }}>Ink · text</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      <Swatch name="Ink primary" hex="#0D0D0D" role="text" dark />
      <Swatch name="Ink secondary" hex="#3A3A38" role="body" dark />
      <Swatch name="Ink muted" hex="#6E6C66" role="meta" dark />
      <Swatch name="Ink subtle" hex="#A4A29C" role="placeholder" />
    </div>
    <div className="t-eyebrow" style={{ marginTop: 30, marginBottom: 12 }}>Semantic</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, maxWidth: 540 }}>
      <Swatch name="Success" hex="#1C8F56" role="filled / verified" dark />
      <Swatch name="Danger" hex="#C0392B" role="destructive" dark />
      <Swatch name="Warn" hex="#D9A441" role="deadline" />
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// Typography
// ════════════════════════════════════════════════════════════════
const TypeCard = () => (
  <div className="wf" style={{ padding: 40, overflowY: "auto" }}>
    <Logo />
    <div className="t-eyebrow" style={{ marginTop: 22 }}>04 · Typography</div>
    <div className="t-h1" style={{ fontSize: 32, marginTop: 6 }}>Confident display, quiet body.</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginTop: 28 }}>
      {/* Display */}
      <div className="col" style={{ gap: 14 }}>
        <span className="t-eyebrow">Display</span>
        <div className="card" style={{ padding: 24 }}>
          <span className="t-meta">Abizhar · 600 (primary)<br />→ General Sans · 600 (web fallback)<br />→ Inter Tight · 600 (final fallback)</span>
          <div style={{ height: 18 }} />
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 56, letterSpacing: "-0.035em", lineHeight: 1 }}>Seshn</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 32, letterSpacing: "-0.025em", marginTop: 14 }}>Find the people who finish your record.</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.02em", marginTop: 10 }}>Heading 2 / card titles</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, marginTop: 6 }}>Heading 3 / inline</div>
        </div>
        <div className="card hairline" style={{ padding: 16 }}>
          <span className="t-eyebrow">Specimen · A a g Q 0–9</span>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 64, letterSpacing: "-0.04em", marginTop: 8, lineHeight: 1 }}>Aag Q 0123</div>
        </div>
      </div>
      {/* Body */}
      <div className="col" style={{ gap: 14 }}>
        <span className="t-eyebrow">Body</span>
        <div className="card" style={{ padding: 24 }}>
          <span className="t-meta">Satoshi · 400 / 500 (primary)<br />→ system-ui (fallback)</span>
          <div style={{ height: 18 }} />
          <p style={{ fontSize: 17, lineHeight: 1.55, margin: 0 }}>
            Body large · 17 / 26 — used for the hero subtitle and long-form bio. Calm, readable, just enough weight in the descenders to feel editorial.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.55, margin: "12px 0 0", color: "var(--ink-2)" }}>
            Body · 14 / 22 — the default. This is where 80% of the reading happens on Seshn.
          </p>
          <p style={{ fontSize: 12, lineHeight: 1.45, margin: "12px 0 0", color: "var(--ink-3)" }}>
            Meta · 12 / 17 — timestamps, helper copy, filter counts.
          </p>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", margin: "16px 0 0", color: "var(--ink-3)" }}>
            Eyebrow · 10 / 0.14em
          </p>
        </div>
        <div className="card hairline" style={{ padding: 16 }}>
          <span className="t-eyebrow">Scale (rem on 16px base)</span>
          <div className="col" style={{ marginTop: 8, gap: 4, fontSize: 12 }}>
            {[["Display XL", "56 / 3.5r"], ["Display L", "32 / 2.0r"], ["Display M", "22 / 1.375r"], ["Display S", "16 / 1.0r"], ["Body L", "17 / 1.0625r"], ["Body", "14 / 0.875r"], ["Meta", "12 / 0.75r"], ["Eyebrow", "10 / 0.625r"]].map(([k, v]) => (
              <div key={k} className="between"><span>{k}</span><span className="t-meta">{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// Component spec — gig card variants, audio embed, pills, avatar
// ════════════════════════════════════════════════════════════════
const ComponentsCard = () => (
  <div className="wf" style={{ padding: 40, overflowY: "auto", background: "var(--bg)" }}>
    <Logo />
    <div className="t-eyebrow" style={{ marginTop: 22 }}>Components · contracts</div>
    <div className="t-h1" style={{ fontSize: 32, marginTop: 6, marginBottom: 24 }}>One component, three contexts.</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
      <div className="col" style={{ gap: 8 }}>
        <span className="t-eyebrow">Gig card · feed</span>
        <span className="t-meta">Full · w 540 / pad 16</span>
        <GigCard role="Vocalist" title="Topline writer wanted for an Afrobeats demo" tags={["Afrobeats", "R&B"]} comp="Paid · $200" name="Maya O." initials="MO" roleTag="PROD" time="2h" />
      </div>
      <div className="col" style={{ gap: 8 }}>
        <span className="t-eyebrow">Gig card · related</span>
        <span className="t-meta">Mini · w 240 / pad 12</span>
        <GigCard context="mini" role="Topline" title="Topline x melody for pop ref" tags={["Pop"]} name="Lina V." initials="LV" time="1d" />
        <GigCard context="mini" role="Vocalist" title="Hook writer for an R&B groove" tags={["R&B"]} name="Sam P." initials="SP" time="4h" />
      </div>
      <div className="col" style={{ gap: 8 }}>
        <span className="t-eyebrow">Gig card · boosted</span>
        <span className="t-meta">Pinned · accent border</span>
        <GigCard boost role="Drummer" title="Live drummer · 3 NYC dates in June" tags={["Soul", "Live"]} comp="$450/show" name="Theo B." initials="TB" roleTag="ART" time="9h" />
      </div>
    </div>
    <div className="divider" style={{ margin: "28px 0" }} />
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 18 }}>
      <div className="col" style={{ gap: 10 }}>
        <span className="t-eyebrow">Audio embed · unified</span>
        <span className="t-meta">Wraps SoundCloud, Spotify, YouTube into one visual</span>
        <Audio title="Sunday Drives" artist="Maya O. ft. Lojay · 3:24" source="SoundCloud" />
        <Audio title="Coast (demo)" artist="Maya O. · 2:51" source="Spotify" />
        <Audio compact title="Hold The Line" artist="prod. Maya · 4:02" source="YouTube" />
      </div>
      <div className="col" style={{ gap: 10 }}>
        <span className="t-eyebrow">Tag pill · variants</span>
        <span className="t-meta">3 styles + 2 utility</span>
        <div className="card" style={{ padding: 16 }}>
          <div className="col" style={{ gap: 12 }}>
            <div><span className="t-meta">Neutral · roles / genres</span><br /><div className="row" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}><Pill>R&B</Pill><Pill>Vocalist</Pill><Pill>Remote</Pill></div></div>
            <div><span className="t-meta">Accent · primary role</span><br /><div className="row" style={{ gap: 6, marginTop: 4 }}><Pill variant="accent">Vocalist needed</Pill><Pill variant="accent">Producer</Pill></div></div>
            <div><span className="t-meta">Success · filled</span><br /><div className="row" style={{ gap: 6, marginTop: 4 }}><Pill variant="success">Filled</Pill><Pill variant="success">Booked</Pill></div></div>
            <div><span className="t-meta">Solid · CTA / badge</span><br /><div className="row" style={{ gap: 6, marginTop: 4 }}><Pill variant="solid">★ Boosted</Pill><Pill variant="solid">✓ Pro</Pill></div></div>
          </div>
        </div>
      </div>
      <div className="col" style={{ gap: 10 }}>
        <span className="t-eyebrow">Avatar + role badge</span>
        <span className="t-meta">4 sizes · overlay role tag</span>
        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 16, alignItems: "flex-end", marginBottom: 16 }}>
            <Avatar size="sm" initials="MO" />
            <Avatar initials="MO" role="PRO" />
            <Avatar size="lg" initials="MO" role="VOC" />
            <Avatar size="xl" initials="MO" role="MIX" />
          </div>
          <div className="t-meta">22 · 32 · 56 · 88 px<br />Role badge: 3-letter, mono, only set on primary role.</div>
        </div>
        <div className="card hairline" style={{ padding: 12 }}>
          <span className="t-eyebrow">Button states</span>
          <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <Btn variant="primary">Primary</Btn>
            <Btn>Default</Btn>
            <Btn variant="dark">Dark</Btn>
            <Btn variant="ghost">Ghost</Btn>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// Empty states
// ════════════════════════════════════════════════════════════════
const EmptyCard = ({ title, body, cta, kind, mobile }) => {
  return (
    <div className="card" style={{ padding: mobile ? 22 : 30, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: "var(--surface)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, var(--accent-bg) 0%, transparent 60%)", opacity: 0.5 }} />
      <Illo kind={kind} size={mobile ? 56 : 80} color="var(--accent-d)" style={{ position: "relative", zIndex: 1 }} />
      <div className="t-h3" style={{ fontSize: mobile ? 14 : 17, position: "relative", zIndex: 1 }}>{title}</div>
      <div className="t-muted" style={{ fontSize: mobile ? 11.5 : 13, maxWidth: 280, position: "relative", zIndex: 1 }}>{body}</div>
      <div style={{ height: 4 }} />
      <Btn variant="primary" size={mobile ? "sm" : "default"} style={{ position: "relative", zIndex: 1 }}>{cta}</Btn>
    </div>
  );
};

const EmptyStatesCard = () => (
  <div className="wf" style={{ padding: 40, overflowY: "auto", background: "var(--bg)" }}>
    <Logo />
    <div className="t-eyebrow" style={{ marginTop: 22 }}>Empty states · first impressions</div>
    <div className="t-h1" style={{ fontSize: 32, marginTop: 6, marginBottom: 6 }}>Blank, but never empty.</div>
    <span className="t-muted" style={{ fontSize: 13, maxWidth: 480, display: "block", marginBottom: 24 }}>
      Every empty state ships a glyph, a one-line "what now", and a single action. Tone should feel like a friend nudging you — not a system telling you what's missing.
    </span>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      <EmptyCard kind="compass" title="Your feed is fresh." body="Pick at least 2 roles and 1 genre and we'll surface gigs you'd actually take." cta="Tune your filters →" />
      <EmptyCard kind="mic" title="No tracks here yet." body="Drop a SoundCloud, Spotify, or YouTube link — your portfolio is how people decide." cta="Add a portfolio link" />
      <EmptyCard kind="mailbox" title="Inbox zero." body="Apply to a gig or post one — that's how conversations start on Seshn." cta="Browse the feed" />
      <EmptyCard kind="session" title="Start a project." body="Project rooms are where the actual work happens — chat, files, deadlines, audio, all in one place." cta="Create your first project" />
    </div>
    <div style={{ height: 22 }} />
    <span className="t-eyebrow">Mobile variants · stacked</span>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 12 }}>
      <EmptyCard kind="compass" title="Feed is fresh." body="Pick 2 roles + 1 genre." cta="Tune filters" mobile />
      <EmptyCard kind="mic" title="No tracks yet." body="Drop a portfolio link." cta="Add link" mobile />
      <EmptyCard kind="mailbox" title="Inbox zero." body="Apply to a gig or post one." cta="Browse" mobile />
      <EmptyCard kind="session" title="Start a project." body="Chat, files, audio." cta="New project" mobile />
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// Dev notes
// ════════════════════════════════════════════════════════════════
const DevNotesCard = () => (
  <div className="wf" style={{ padding: 40, overflowY: "auto" }}>
    <Logo />
    <div className="t-eyebrow" style={{ marginTop: 22 }}>05 · For the developer</div>
    <div className="t-h1" style={{ fontSize: 32, marginTop: 6, marginBottom: 6 }}>What could go wrong.</div>
    <span className="t-muted" style={{ fontSize: 13, maxWidth: 540, display: "block", marginBottom: 24 }}>
      Two things to design around early — both have downstream consequences if discovered late.
    </span>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
      <div className="card" style={{ padding: 26 }}>
        <div className="row" style={{ gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: 999, background: "var(--accent-bg)", color: "var(--accent-d)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13 }}>01</span>
          <div className="t-h3" style={{ fontSize: 18 }}>Audio embeds are not all equal.</div>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)", marginTop: 14 }}>
          SoundCloud, Spotify, and YouTube each return a different iframe size, theming surface, and "what happens when the link expires" behavior.
          The audio component must be a <b>wrapper</b> — a thin Seshn-styled shell with a uniform play button and metadata strip on top of the provider iframe — not a re-skin.
          <br /><br />
          <b>Specifically:</b>
          <ul style={{ paddingLeft: 18, margin: "8px 0 0", color: "var(--ink-2)" }}>
            <li>Don't trust provider thumbnails — cache & resize server-side, fall back to a Seshn-painted "no art" tile.</li>
            <li>Lazy-load iframes (intersection observer). A profile with 6 embeds otherwise loads 6 audio engines.</li>
            <li>Validate URLs on submit — reject anything that isn't an oEmbed-supported URL, surface a clear error.</li>
            <li>Track-removed states: show "this track is no longer available" with the original metadata, not a broken iframe.</li>
          </ul>
        </div>
      </div>
      <div className="card" style={{ padding: 26 }}>
        <div className="row" style={{ gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: 999, background: "var(--accent-bg)", color: "var(--accent-d)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13 }}>02</span>
          <div className="t-h3" style={{ fontSize: 18 }}>Pro vs Free gates the wrong surface, easily.</div>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)", marginTop: 14 }}>
          "Message anyone first" is the Pro feature most likely to cause confusion if it's implemented as a hard wall vs a soft prompt.
          Free users should be able to <b>reply</b> to messages they receive — and <b>apply</b> to any post — without hitting Pro friction.
          Pro only gates outbound first-contact DMs and analytics.
          <br /><br />
          <b>Specifically:</b>
          <ul style={{ paddingLeft: 18, margin: "8px 0 0", color: "var(--ink-2)" }}>
            <li>Reply-to is free forever — block-listing it would kill the feedback loop that makes the platform feel alive.</li>
            <li>Boost is a one-time purchase ($5) <em>and</em> a Pro perk (1 credit/mo). Pricing copy must not imply Pro = free boosts forever.</li>
            <li>Verified ✓ badge: only granted to Pro AND after lightweight ID/credit check. The two are bundled in UI but independent in policy.</li>
            <li>Subscription billing through Stripe — keep dunning, proration, and yearly→monthly downgrade flows out of v1 scope.</li>
          </ul>
        </div>
      </div>
    </div>
    <div className="divider" style={{ margin: "28px 0" }} />
    <div className="t-eyebrow" style={{ marginBottom: 14 }}>Out of scope for v1 — reminder</div>
    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
      {["Leaderboard", "Song feedback", "Team applications", "Payment escrow", "Mobile app"].map(t => <Pill key={t}>{t}</Pill>)}
    </div>
  </div>
);

window.SeshnInfo = { CoverCard, PaletteCard, TypeCard, ComponentsCard, EmptyStatesCard, DevNotesCard };
Object.assign(window, window.SeshnInfo);
