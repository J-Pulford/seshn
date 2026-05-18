// Seshn — Screens part 1: Landing, Auth/Onboarding, Profile, Home Feed, Gig Detail

const { Logo, Pill, Avatar, Btn, Input, PH, Line, Lines, Audio, Icon, GigCard, Browser, Phone, MobileTabBar } = window.SeshnAtoms;
const { AlbumArt, Waveform, Marquee, Sticker, Vinyl, Cassette, Polaroid, CoverHeader, Grain, Illo, Highlight } = window.SeshnVisuals;

// Live activity marquee items (used on landing)
const MARQUEE_ITEMS = [
  "Maya O. is looking for a topline writer",
  "Theo B. posted: live drummer, 3 NYC dates",
  "Iván R. mixed 4 songs this week",
  "Nia K. joined Seshn",
  "Sam P. completed a session with Lina V.",
  "412 sessions running right now",
  "Robi K. released a demo from Seshn",
];

// ════════════════════════════════════════════════════════════════
// 1. LANDING
// ════════════════════════════════════════════════════════════════

const LandingNav = ({ mobile }) => (
  <div className="between" style={{ padding: mobile ? "14px 18px" : "18px 40px" }}>
    <Logo />
    {!mobile ? (
      <div className="row" style={{ gap: 22 }}>
        <span className="t-meta" style={{ color: "var(--ink-2)", fontWeight: 500 }}>Browse</span>
        <span className="t-meta" style={{ color: "var(--ink-2)", fontWeight: 500 }}>How it works</span>
        <span className="t-meta" style={{ color: "var(--ink-2)", fontWeight: 500 }}>Sign in</span>
        <Btn variant="primary" size="sm">Sign up</Btn>
      </div>
    ) : (
      <div className="row" style={{ gap: 12 }}>
        <span className="t-meta" style={{ fontWeight: 500 }}>Sign in</span>
        <Btn variant="primary" size="sm">Sign up</Btn>
      </div>
    )}
  </div>
);

const LandingDesktop = () => (
  <Browser url="seshn.fm" dark>
    <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
      <Grain opacity={0.18} />
      <LandingNav />
      {/* Hero */}
      <div style={{ padding: "24px 40px 22px", display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 40, alignItems: "center", position: "relative" }}>
        <div className="col" style={{ gap: 22 }}>
          <div className="row" style={{ gap: 10 }}>
            <Pill variant="accent">● Live · 412 sessions this week</Pill>
            <span className="t-meta" style={{ color: "rgba(255,255,255,0.5)" }}>v0.1 · early access</span>
          </div>
          <div className="t-h1" style={{ fontSize: 60, lineHeight: 0.98, letterSpacing: "-0.038em" }}>
            Find the people<br />who <Highlight>finish</Highlight><br />your record.
          </div>
          <div className="t-muted" style={{ fontSize: 14, maxWidth: 400, lineHeight: 1.55 }}>
            Seshn connects vocalists, producers, instrumentalists and engineers building real projects — not chasing followers.
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Btn variant="primary" size="lg">Create your profile →</Btn>
            <Btn size="lg">Browse the feed</Btn>
          </div>
          <div className="row" style={{ gap: 14, marginTop: 2, alignItems: "center" }}>
            <div className="row" style={{ marginLeft: 0 }}>
              {["MO","NK","TB","SP","LV"].map((i,k) => (
                <Avatar key={i} size="sm" initials={i} style={{ marginLeft: k > 0 ? -8 : 0, border: "2px solid var(--frame)" }} />
              ))}
            </div>
            <span className="t-meta">2,841 artists already on Seshn — from bedrooms to Abbey Road.</span>
          </div>
        </div>
        {/* Right column — collaged covers + live feed */}
        <div style={{ position: "relative" }}>
          {/* Decorative covers */}
          <div style={{ position: "absolute", top: -12, right: -8, transform: "rotate(8deg)", zIndex: 1 }}>
            <AlbumArt seed="sunday-drives" size={86} radius={4} />
          </div>
          <div style={{ position: "absolute", top: 60, left: -34, transform: "rotate(-6deg)", zIndex: 1 }}>
            <AlbumArt seed="hold-the-line" size={70} radius={4} />
          </div>
          <div style={{ position: "absolute", bottom: -24, right: 22, transform: "rotate(-4deg)", zIndex: 1 }}>
            <Sticker color="accent" rot={-6}>★ New this week</Sticker>
          </div>
          <div className="card" style={{ padding: 14, background: "var(--surface-2)", borderRadius: 16, position: "relative", zIndex: 0 }}>
            <div className="between" style={{ marginBottom: 12 }}>
              <span className="t-eyebrow">Live feed · just now</span>
              <Pill>● 3 new</Pill>
            </div>
            <div className="col" style={{ gap: 10 }}>
              <GigCard role="Vocalist" title="Topline writer wanted — Afrobeats demo" tags={["Afrobeats", "Toplines"]} comp="Paid · $200" name="Maya O." initials="MO" roleTag="PROD" time="2h" desc={false} />
              <GigCard role="Mixing eng." title="Mix 4-song indie EP, lo-fi shoegaze references" tags={["Shoegaze", "Indie"]} comp="Paid · $600" name="Iván R." initials="IR" roleTag="ART" time="5h" desc={false} />
              <GigCard role="Drummer" title="Live session drummer, NYC, 3 dates in June" tags={["Live", "Soul"]} comp="Paid · $450/show" name="Theo B." initials="TB" roleTag="ART" time="9h" desc={false} boost />
            </div>
          </div>
        </div>
      </div>
      {/* Marquee — live activity ticker */}
      <Marquee items={MARQUEE_ITEMS} dark speed={50} style={{ borderColor: "rgba(255,255,255,0.1)" }} />
      {/* Feature row */}
      <div style={{ padding: "22px 40px 0", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, marginTop: "auto" }}>
        {[
          { n: "01", t: "Post what you need", b: "Vocal, mix, session player, beat — the brief takes 90 seconds.", k: "mic" },
          { n: "02", t: "Find your collaborators", b: "Filter by role, genre, comp type, location. No follower counts.", k: "compass" },
          { n: "03", t: "Build your team", b: "Spin up a project room: chat, files, audio, deadlines, members.", k: "stems" },
        ].map(f => (
          <div key={f.n} className="col" style={{ gap: 10, padding: "18px 0" }}>
            <div className="row" style={{ gap: 10, alignItems: "center" }}>
              <Illo kind={f.k} size={36} color="var(--accent)" />
              <span className="t-eyebrow" style={{ color: "rgba(255,255,255,0.5)" }}>{f.n}</span>
            </div>
            <div className="t-h3" style={{ fontSize: 18 }}>{f.t}</div>
            <span className="t-muted" style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>{f.b}</span>
          </div>
        ))}
      </div>
      {/* Footer CTA */}
      <div style={{ padding: "18px 40px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <div className="row" style={{ gap: 10 }}>
          <Vinyl size={28} color="rgba(255,255,255,0.15)" label="var(--accent)" />
          <span className="t-muted" style={{ fontSize: 12 }}>Free to join · Pro from $5/mo</span>
        </div>
        <Btn variant="primary" size="lg">Create your profile →</Btn>
      </div>
    </div>
  </Browser>
);

const LandingMobile = () => (
  <Phone dark>
    <div className="col" style={{ height: "100%", overflowY: "auto", position: "relative" }}>
      <Grain opacity={0.16} />
      <LandingNav mobile />
      <div style={{ padding: "12px 20px 16px", position: "relative" }}>
        <div style={{ position: "absolute", top: 8, right: 16, transform: "rotate(8deg)" }}>
          <AlbumArt seed="sunday-drives" size={54} radius={4} />
        </div>
        <Pill variant="accent" style={{ marginBottom: 14 }}>● Live · 412 sessions</Pill>
        <div className="t-h1" style={{ fontSize: 34, marginBottom: 12 }}>
          Find the<br />people who<br /><Highlight>finish</Highlight> your<br />record.
        </div>
        <div className="t-muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Vocalists, producers, instrumentalists & engineers building real projects.
        </div>
        <Btn variant="primary" size="lg" block>Create your profile →</Btn>
        <div style={{ height: 8 }} />
        <Btn block>Browse the feed</Btn>
      </div>
      <Marquee items={MARQUEE_ITEMS} dark speed={40} style={{ borderColor: "rgba(255,255,255,0.1)" }} />
      <div style={{ padding: "14px 14px 14px" }}>
        <div className="between" style={{ padding: "0 6px 8px" }}>
          <span className="t-eyebrow">Live feed</span>
          <Sticker color="accent" size="sm" rot={-4}>★ New</Sticker>
        </div>
        <div className="col" style={{ gap: 8 }}>
          <GigCard role="Vocalist" title="Topline writer — Afrobeats demo" tags={["Afrobeats"]} comp="$200" name="Maya O." initials="MO" roleTag="PROD" time="2h" desc={false} />
          <GigCard role="Mixing eng." title="Mix 4-song indie EP" tags={["Shoegaze"]} comp="$600" name="Iván R." initials="IR" roleTag="ART" time="5h" desc={false} />
        </div>
      </div>
      <div style={{ padding: "8px 20px 28px", borderTop: "1px solid var(--line)" }}>
        {[
          { n: "01", t: "Post what you need", k: "mic" },
          { n: "02", t: "Find your collaborators", k: "compass" },
          { n: "03", t: "Build your team", k: "stems" },
        ].map(f => (
          <div key={f.n} className="row" style={{ gap: 14, padding: "14px 0", borderBottom: "1px solid var(--line-soft)", alignItems: "center" }}>
            <Illo kind={f.k} size={28} color="var(--accent)" />
            <span className="t-eyebrow" style={{ width: 24 }}>{f.n}</span>
            <span className="t-h3" style={{ fontSize: 15, flex: 1 }}>{f.t}</span>
            <Icon kind="chevron" size={14} style={{ color: "var(--ink-3)" }} />
          </div>
        ))}
        <div style={{ height: 16 }} />
        <Btn variant="primary" size="lg" block>Create your profile</Btn>
      </div>
    </div>
  </Phone>
);

// ════════════════════════════════════════════════════════════════
// 2. SIGN UP / LOG IN + ONBOARDING
// ════════════════════════════════════════════════════════════════

const AuthDesktop = () => (
  <Browser url="seshn.fm/join">
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%" }}>
      {/* Left: form */}
      <div className="col" style={{ padding: "40px 64px", justifyContent: "center", gap: 18 }}>
        <Logo size={20} />
        <div style={{ height: 14 }} />
        <div className="t-h1" style={{ fontSize: 36 }}>Make your first session.</div>
        <div className="t-muted" style={{ maxWidth: 360, fontSize: 13 }}>
          Create a profile, post a brief, find your collaborators. Free forever.
        </div>
        <div style={{ height: 10 }} />
        <div className="col" style={{ gap: 10, maxWidth: 360 }}>
          <Btn block size="lg" style={{ justifyContent: "flex-start" }}>
            <Icon kind="google" size={16} style={{ color: "var(--ink)", marginRight: 8 }} />
            Continue with Google
          </Btn>
          <Btn block size="lg" style={{ justifyContent: "flex-start" }}>
            <Icon kind="apple" size={16} style={{ color: "var(--ink)", marginRight: 8 }} />
            Continue with Apple
          </Btn>
          <div className="row" style={{ gap: 10, padding: "6px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span className="t-meta">or with email</span>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>
          <Input size="lg" placeholder="you@artist.fm" />
          <Btn variant="primary" size="lg" block>Send magic link →</Btn>
        </div>
        <div style={{ height: 10 }} />
        <span className="t-meta" style={{ maxWidth: 360 }}>
          By signing up you agree to Seshn's Terms and Privacy Policy.
        </span>
      </div>
      {/* Right: rotating quote */}
      <div style={{ background: "var(--ink-black)", color: "var(--frame)", padding: "40px 56px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <Grain opacity={0.22} />
        {/* Decorative covers — collaged */}
        <div style={{ position: "absolute", top: 60, right: 40, transform: "rotate(8deg)" }}>
          <AlbumArt seed="coast-demo" size={120} radius={6} />
        </div>
        <div style={{ position: "absolute", top: 130, right: 130, transform: "rotate(-6deg)" }}>
          <AlbumArt seed="morning-light" size={90} radius={6} />
        </div>
        <div style={{ position: "absolute", top: 200, right: 60, transform: "rotate(4deg)" }}>
          <Sticker color="cream" rot={4}>✶ artist · vol.1</Sticker>
        </div>
        <div style={{ position: "absolute", bottom: 110, right: 200 }}>
          <Vinyl size={56} color="rgba(255,255,255,0.08)" label="var(--accent)" style={{ animation: "seshn-spin 12s linear infinite" }} />
        </div>
        <div className="row" style={{ gap: 8, position: "relative" }}>
          <span className="pill ghost" style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}>● Featured artist · this week</span>
        </div>
        <div className="col" style={{ gap: 22, position: "relative", zIndex: 1 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 24, lineHeight: 1.25, letterSpacing: "-0.012em", color: "var(--frame)", maxWidth: 360 }}>
            "I found my whole band on Seshn in three weeks. Two of them ended up on the record."
          </span>
          <div className="row" style={{ gap: 10 }}>
            <Avatar size="md" initials="NK" style={{ background: "rgba(255,255,255,0.1)", color: "var(--frame)" }} />
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--frame)" }}>Nia Kassim</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>Vocalist · London</span>
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            {[0,1,2,3].map(i => (
              <span key={i} style={{ width: 18, height: 3, background: i === 0 ? "var(--accent)" : "rgba(255,255,255,0.2)", borderRadius: 2 }} />
            ))}
          </div>
        </div>
        <div className="row" style={{ gap: 12, justifyContent: "space-between", color: "rgba(255,255,255,0.55)", fontSize: 11, position: "relative", zIndex: 1 }}>
          <span>seshn.fm</span>
          <span>01 / 04</span>
        </div>
      </div>
    </div>
  </Browser>
);

const AuthMobile = () => (
  <Phone>
    <div className="col" style={{ height: "100%" }}>
      <div style={{ padding: "12px 20px" }}><Logo /></div>
      <div style={{ height: 160, margin: "8px 20px 18px", background: "var(--ink-black)", borderRadius: 14, padding: 18, color: "var(--frame)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <span className="pill ghost" style={{ alignSelf: "flex-start", borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)" }}>● Featured</span>
        <div className="col" style={{ gap: 10 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 14, lineHeight: 1.3, color: "var(--frame)" }}>
            "Found my whole band on Seshn in three weeks."
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>Nia K. · Vocalist, London</span>
        </div>
      </div>
      <div className="col" style={{ padding: "0 20px", gap: 10 }}>
        <div className="t-h1" style={{ fontSize: 24 }}>Make your first session.</div>
        <Btn block size="lg" style={{ justifyContent: "flex-start" }}>
          <Icon kind="google" size={14} style={{ marginRight: 8 }} />Continue with Google
        </Btn>
        <Btn block size="lg" style={{ justifyContent: "flex-start" }}>
          <Icon kind="apple" size={14} style={{ marginRight: 8 }} />Continue with Apple
        </Btn>
        <div className="row" style={{ gap: 10, padding: "4px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          <span className="t-meta">or email</span>
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>
        <Input size="lg" placeholder="you@artist.fm" />
        <Btn variant="primary" size="lg" block>Send magic link →</Btn>
      </div>
      <span className="t-meta" style={{ padding: "16px 20px", textAlign: "center" }}>
        Already on Seshn? <b style={{ color: "var(--ink)" }}>Sign in</b>
      </span>
    </div>
  </Phone>
);

const OnboardingDesktop = () => (
  <Browser url="seshn.fm/welcome/roles">
    <div className="col" style={{ height: "100%", padding: "32px 64px", alignItems: "center" }}>
      <div className="between" style={{ width: "100%", maxWidth: 720 }}>
        <Logo />
        <span className="t-meta">Step 1 of 3 · You can change all of this later</span>
      </div>
      {/* Progress */}
      <div className="row" style={{ width: "100%", maxWidth: 720, gap: 6, margin: "20px 0 30px" }}>
        <div style={{ flex: 1, height: 3, background: "var(--accent)", borderRadius: 2 }} />
        <div style={{ flex: 1, height: 3, background: "var(--line)", borderRadius: 2 }} />
        <div style={{ flex: 1, height: 3, background: "var(--line)", borderRadius: 2 }} />
      </div>
      <div className="col" style={{ maxWidth: 720, width: "100%", gap: 6, marginBottom: 22 }}>
        <span className="t-eyebrow">01 · Pick your roles</span>
        <div className="t-h1" style={{ fontSize: 32 }}>What do you bring to the room?</div>
        <span className="t-muted" style={{ fontSize: 13 }}>Pick up to 3. Your roles appear on your profile and tune the gigs you see.</span>
      </div>
      <div style={{ maxWidth: 720, width: "100%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          ["Producer", true], ["Vocalist", true], ["Songwriter", false], ["Rapper", false],
          ["Mixing eng.", false], ["Mastering", false], ["Guitarist", true], ["Drummer", false],
          ["Bassist", false], ["Keys", false], ["DJ", false], ["A&R", false],
        ].map(([r, sel]) => (
          <div key={r} className="card" style={{ padding: "14px 14px", textAlign: "center", borderColor: sel ? "var(--accent-d)" : "var(--line)", background: sel ? "var(--accent-bg)" : "var(--surface)", borderRadius: 10 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: sel ? "var(--accent-d)" : "var(--ink)" }}>
              {sel && "✓ "}{r}
            </div>
          </div>
        ))}
      </div>
      <div className="between" style={{ maxWidth: 720, width: "100%", marginTop: "auto", paddingTop: 24 }}>
        <Btn variant="ghost">Skip for now</Btn>
        <Btn variant="primary" size="lg">Continue → Genres</Btn>
      </div>
    </div>
  </Browser>
);

// ════════════════════════════════════════════════════════════════
// 3. PROFILE
// ════════════════════════════════════════════════════════════════

const ProfileDesktop = () => (
  <Browser url="seshn.fm/@maya.o">
    <div className="col" style={{ height: "100%", overflowY: "auto" }}>
      {/* Top nav */}
      <div className="between" style={{ padding: "12px 32px", borderBottom: "1px solid var(--line)" }}>
        <Logo />
        <div className="row" style={{ gap: 18 }}>
          <Icon kind="search" size={16} style={{ color: "var(--ink-2)" }} />
          <Icon kind="bell" size={16} style={{ color: "var(--ink-2)" }} />
          <Avatar size="sm" initials="YT" />
        </div>
      </div>
      {/* Cover header */}
      <div style={{ position: "relative" }}>
        <CoverHeader seed="maya-cover" height={150} />
        <div style={{ position: "absolute", left: 32, bottom: -36, display: "flex", alignItems: "flex-end", gap: 16 }}>
          <div style={{ background: "var(--frame)", padding: 4, borderRadius: "50%" }}>
            <Avatar size="xl" initials="MO" style={{ background: "var(--ph)" }} />
          </div>
        </div>
        <div style={{ position: "absolute", right: 32, bottom: 14, display: "flex", gap: 8 }}>
          <Btn style={{ backdropFilter: "blur(8px)", background: "rgba(255,255,255,0.85)" }}>Invite to project</Btn>
          <Btn variant="primary">Message</Btn>
        </div>
        <div style={{ position: "absolute", right: 220, bottom: 28 }}>
          <Sticker color="ink" rot={-4}>✓ Pro · verified</Sticker>
        </div>
      </div>
      {/* Header info */}
      <div style={{ padding: "50px 32px 18px 132px" }}>
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <span className="t-h1" style={{ fontSize: 30 }}>Maya Oduya</span>
        </div>
        <div className="row" style={{ gap: 14, marginBottom: 8, alignItems: "center" }}>
          <Rating value={4.9} count={28} size={13} />
          <span className="t-meta">· Brooklyn, NY · Active 2h ago</span>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <Pill variant="accent">Producer</Pill>
          <Pill variant="accent">Vocalist</Pill>
          <Pill>R&B</Pill>
          <Pill>Afrobeats</Pill>
          <Pill>Soul</Pill>
        </div>
      </div>
      {/* Body grid */}
      <div style={{ padding: "10px 32px 32px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
        <div className="col" style={{ gap: 22 }}>
          {/* Bio */}
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Bio</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)" }}>
              Brooklyn-based producer & vocalist working at the seam of R&B and West African pop.
              Credits with <b>Tems</b>, <b>Lojay</b>, and a few rooms I can't name yet. Open to topline,
              vocal-feature, and co-production work — paid or fair-split. Studio in Bed-Stuy.
            </div>
          </div>
          {/* Portfolio */}
          <div>
            <div className="between" style={{ marginBottom: 10 }}>
              <div className="row" style={{ gap: 10, alignItems: "baseline" }}>
                <div className="t-eyebrow">Portfolio</div>
                <Pill variant="solid" style={{ fontSize: 9 }}>▶ now playing · v3 topline</Pill>
              </div>
              <span className="t-meta">6 tracks</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Audio title="Sunday Drives" artist="Maya O. ft. Lojay · 3:24" source="SoundCloud" seed="sunday-drives" playing progress={0.42} />
              <Audio title="Coast (demo)" artist="Maya O. · 2:51" source="Spotify" seed="coast-demo" />
              <Audio title="Hold The Line" artist="prod. Maya O. · 4:02" source="YouTube" seed="hold-the-line" />
              <Audio title="Morning Light" artist="Maya O. · 3:18" source="SoundCloud" seed="morning-light" />
            </div>
          </div>
          {/* Testimonials / endorsements */}
          <div>
            <div className="between" style={{ marginBottom: 10 }}>
              <div className="row" style={{ gap: 12, alignItems: "baseline" }}>
                <div className="t-eyebrow">From collaborators</div>
                <Rating value={4.9} count={28} size={12} compact />
              </div>
              <span className="t-meta">See all 28 →</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Testimonial name="Nia Kassim" ini="NK" role="Vocalist" rating={5} date="May 2026" project="Sundowner EP"
                quote="Maya turned a sketch into a full record in two sessions. Knows when to push and when to let the song breathe." />
              <Testimonial name="Theo Brooks" ini="TB" role="Drummer" rating={5} date="Apr 2026" project="Live run · NYC"
                quote="Studio brain, performer ear. Sent stems on time and the notes were always musical, never vague." />
              <Testimonial name="Sam Park" ini="SP" role="Mixing eng." rating={4.5} date="Mar 2026" project="Coast (demo)"
                quote="Best client communicator on Seshn full stop. Clear references, clear budget, paid early." />
              <Testimonial name="Iván Reyes" ini="IR" role="Producer" rating={5} date="Feb 2026" project="Hold The Line"
                quote="We're already booking the next one. That's the highest review I can give." />
            </div>
          </div>
          {/* Recent posts */}
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Recent posts</div>
            <div className="col" style={{ gap: 10 }}>
              <GigCard role="Topline writer" title="Topline writer for an Afrobeats demo" tags={["Afrobeats", "Toplines"]} comp="Paid · $200" name="Maya Oduya" initials="MO" roleTag="PRO" time="2h" desc={false} />
              <GigCard role="Drummer" title="Live drummer for 3-show NYC run" tags={["Live", "Soul"]} comp="Paid · $450/show" name="Maya Oduya" initials="MO" roleTag="PRO" time="3d" desc={false} />
            </div>
          </div>
        </div>
        <div className="col" style={{ gap: 18 }}>
          {/* Looking for */}
          <div className="card">
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Looking for</div>
            <div className="col" style={{ gap: 10 }}>
              {[
                ["Mixing engineers", "for an EP coming in Q3"],
                ["Co-writers", "R&B / soul-leaning"],
                ["Session bassists", "NYC, paid sessions"],
              ].map(([t, s]) => (
                <div key={t} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--accent)", marginTop: 6 }} />
                  <div className="col" style={{ gap: 1 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13 }}>{t}</span>
                    <span className="t-meta">{s}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Stats */}
          <div className="card">
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>On Seshn</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                ["Projects", "12"],
                ["Collaborators", "38"],
                ["Response time", "~4h"],
                ["Member since", "2024"],
              ].map(([k, v]) => (
                <div key={k} className="col" style={{ gap: 2 }}>
                  <span className="t-meta">{k}</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Verified gear / contact (placeholder for sidebar) */}
          <div className="card hairline">
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Links</div>
            <div className="col" style={{ gap: 8 }}>
              {["Instagram", "SoundCloud", "Spotify for Artists"].map(l => (
                <div key={l} className="between">
                  <span style={{ fontSize: 13 }}>{l}</span>
                  <Icon kind="chevron" size={14} style={{ color: "var(--ink-3)" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </Browser>
);

const ProfileMobile = () => (
  <Phone tabbar={<MobileTabBar active="me" />}>
    <div className="col" style={{ height: "100%", overflowY: "auto" }}>
      <div className="between" style={{ position: "absolute", top: 32, left: 0, right: 0, padding: "10px 16px", zIndex: 2 }}>
        <Icon kind="chevron" size={16} style={{ color: "var(--frame)", transform: "rotate(180deg)" }} />
        <Icon kind="gear" size={16} style={{ color: "var(--frame)" }} />
      </div>
      <CoverHeader seed="maya-cover" height={120} />
      <div style={{ position: "relative", marginTop: -36, paddingLeft: 18 }}>
        <div style={{ background: "var(--frame)", padding: 4, borderRadius: "50%", display: "inline-block" }}>
          <Avatar size="xl" initials="MO" style={{ background: "var(--ph)" }} />
        </div>
      </div>
      <div className="col" style={{ padding: "10px 20px 0", alignItems: "flex-start", gap: 6 }}>
        <div className="row" style={{ gap: 6 }}>
          <span className="t-h1" style={{ fontSize: 22 }}>Maya Oduya</span>
          <Pill variant="solid" style={{ fontSize: 9 }}>✓ Pro</Pill>
        </div>
        <Rating value={4.9} count={28} size={12} compact />
        <span className="t-meta">Brooklyn, NY · Active 2h ago</span>
        <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
          <Pill variant="accent">Producer</Pill>
          <Pill variant="accent">Vocalist</Pill>
          <Pill>R&B</Pill>
          <Pill>Afrobeats</Pill>
        </div>
        <div className="row" style={{ gap: 8, width: "100%", marginTop: 6 }}>
          <Btn block>Invite</Btn>
          <Btn variant="primary" block>Message</Btn>
        </div>
      </div>
      <div className="col" style={{ padding: "18px 20px", gap: 16 }}>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 6 }}>Bio</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-2)" }}>
            Brooklyn-based producer & vocalist. R&B at the seam of West African pop. Credits with Tems, Lojay & rooms I can't name yet.
          </div>
        </div>
        <div>
          <div className="between" style={{ marginBottom: 8 }}>
            <div className="t-eyebrow">Portfolio</div>
            <span className="t-meta">6 tracks</span>
          </div>
          <div className="col" style={{ gap: 8 }}>
            <Audio compact title="Sunday Drives" artist="ft. Lojay · 3:24" source="SC" seed="sunday-drives" playing progress={0.42} />
            <Audio compact title="Coast (demo)" artist="2:51" source="Spotify" seed="coast-demo" />
            <Audio compact title="Hold The Line" artist="prod. Maya · 4:02" source="YT" seed="hold-the-line" />
          </div>
        </div>
        <div className="card">
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Looking for</div>
          <div className="col" style={{ gap: 6, fontSize: 12.5 }}>
            <div className="row" style={{ gap: 8 }}><span style={{ width: 5, height: 5, borderRadius: 3, background: "var(--accent)" }} /> Mixing engineers · for Q3 EP</div>
            <div className="row" style={{ gap: 8 }}><span style={{ width: 5, height: 5, borderRadius: 3, background: "var(--accent)" }} /> Co-writers · R&B / soul</div>
            <div className="row" style={{ gap: 8 }}><span style={{ width: 5, height: 5, borderRadius: 3, background: "var(--accent)" }} /> Bassists · NYC, paid</div>
          </div>
        </div>
        <div>
          <div className="between" style={{ marginBottom: 8 }}>
            <div className="t-eyebrow">From collaborators</div>
            <Rating value={4.9} count={28} size={11} compact />
          </div>
          <div className="col" style={{ gap: 8 }}>
            <Testimonial mobile name="Nia Kassim" ini="NK" role="Vocalist" rating={5} date="May 2026" project="Sundowner EP"
              quote="Maya turned a sketch into a full record in two sessions. Knows when to push and when to let the song breathe." />
            <Testimonial mobile name="Theo Brooks" ini="TB" role="Drummer" rating={5} date="Apr 2026" project="Live run · NYC"
              quote="Studio brain, performer ear. Sent stems on time, notes always musical." />
          </div>
        </div>
      </div>
    </div>
  </Phone>
);

// ════════════════════════════════════════════════════════════════
// 4. HOME FEED
// ════════════════════════════════════════════════════════════════

const FeedTopbar = () => (
  <div className="between" style={{ padding: "10px 24px", borderBottom: "1px solid var(--line)" }}>
    <div className="row" style={{ gap: 18, flex: 1 }}>
      <Logo />
      <div style={{ flex: 1, maxWidth: 360, marginLeft: 12 }}>
        <div className="row" style={{ padding: "8px 12px", background: "var(--surface-2)", borderRadius: 999, border: "1px solid var(--line)", gap: 8 }}>
          <Icon kind="search" size={13} style={{ color: "var(--ink-3)" }} />
          <span className="t-meta">Search artists, roles, genres…</span>
        </div>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Btn variant="primary" size="sm">+ Post a gig</Btn>
      <Icon kind="message" size={16} style={{ color: "var(--ink-2)" }} />
      <Icon kind="bell" size={16} style={{ color: "var(--ink-2)" }} />
      <Avatar size="sm" initials="YT" />
    </div>
  </div>
);

const FilterGroup = ({ title, items, multi }) => (
  <div className="col" style={{ gap: 8 }}>
    <span className="t-eyebrow">{title}</span>
    <div className="col" style={{ gap: 4 }}>
      {items.map(([label, count, sel]) => (
        <div key={label} className="between" style={{ padding: "5px 0" }}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ width: 14, height: 14, borderRadius: multi ? 3 : 999, border: "1px solid var(--line)", background: sel ? "var(--ink)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {sel && <Icon kind="check" size={9} style={{ color: "var(--frame)" }} />}
            </span>
            <span style={{ fontSize: 12.5, color: sel ? "var(--ink)" : "var(--ink-2)" }}>{label}</span>
          </div>
          <span className="t-meta">{count}</span>
        </div>
      ))}
    </div>
  </div>
);

const FeedDesktop = () => (
  <Browser url="seshn.fm/feed">
    <div className="col" style={{ height: "100%" }}>
      <FeedTopbar />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 280px", gap: 24, padding: "20px 24px", flex: 1, overflow: "hidden" }}>
        {/* Filters */}
        <div className="col" style={{ gap: 22, overflowY: "auto", paddingRight: 4 }}>
          <FilterGroup title="Role needed" multi items={[
            ["Vocalist", 142, true],
            ["Producer", 88, false],
            ["Mixing engineer", 41, true],
            ["Drummer", 22, false],
            ["Songwriter", 67, false],
            ["Guitarist", 35, false],
          ]} />
          <FilterGroup title="Compensation" items={[
            ["Paid", 218, true],
            ["Split / royalty", 84, false],
            ["Trade / barter", 19, false],
            ["Unpaid", 12, false],
          ]} />
          <FilterGroup title="Genre" multi items={[
            ["R&B", 92, true],
            ["Afrobeats", 38, true],
            ["Hip-hop", 121, false],
            ["Indie", 88, false],
            ["Electronic", 57, false],
          ]} />
          <FilterGroup title="Location" items={[
            ["Remote OK", 184, true],
            ["Near me", 47, false],
            ["My city", 12, false],
          ]} />
        </div>
        {/* Feed */}
        <div className="col" style={{ gap: 14, overflowY: "auto", paddingRight: 4 }}>
          <div className="between">
            <div className="t-h2" style={{ fontSize: 18 }}>Your feed <span className="t-muted" style={{ fontSize: 12, fontWeight: 400 }}>· 24 new today</span></div>
            <div className="row" style={{ gap: 6 }}>
              <Pill variant="ghost">Newest</Pill>
              <Pill>Recommended</Pill>
            </div>
          </div>
          <GigCard boost art role="Vocalist" title="Topline writer wanted for Afrobeats demo (Tems-leaning)" tags={["Afrobeats", "R&B", "Topline"]} comp="Paid · $200" name="Maya Oduya" initials="MO" roleTag="PRO" time="2h" />
          <GigCard role="Mixing engineer" title="Mix 4-song shoegaze EP, MBV-coded references" tags={["Shoegaze", "Indie"]} comp="Paid · $600" name="Iván Reyes" initials="IR" roleTag="ART" time="5h" />
          <GigCard art="theo-drummer" role="Drummer" title="Live session drummer · 3 NYC dates in June" tags={["Soul", "Live"]} comp="Paid · $450/show" name="Theo Brooks" initials="TB" roleTag="ART" time="9h" />
          <GigCard role="Songwriter" title="Co-writer for pop demo — top 40 references welcome" tags={["Pop"]} comp="Split · 50/50" name="Amaya L." initials="AL" roleTag="WRT" time="1d" />
        </div>
        {/* Right rail */}
        <div className="col" style={{ gap: 16, overflowY: "auto" }}>
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Suggested for you</div>
            <div className="col" style={{ gap: 10 }}>
              {[
                ["Nia Kassim", "NK", "Vocalist · London", "R&B"],
                ["Sam Park", "SP", "Mixing eng. · LA", "Indie"],
                ["Lina Vega", "LV", "Producer · CDMX", "Electronic"],
                ["Mo Daniels", "MD", "Drummer · NYC", "Soul"],
                ["Robi K.", "RK", "Songwriter · Berlin", "Pop"],
              ].map(([n, ini, sub, tag]) => (
                <div key={n} className="row" style={{ gap: 10 }}>
                  <Avatar initials={ini} />
                  <div className="col" style={{ gap: 1, flex: 1, minWidth: 0 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 600 }}>{n}</span>
                    <span className="t-meta">{sub}</span>
                  </div>
                  <Btn size="sm">Follow</Btn>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ background: "var(--accent-bg)", borderColor: "transparent" }}>
            <div className="t-eyebrow" style={{ color: "var(--accent-d)", marginBottom: 6 }}>Go Pro</div>
            <div className="t-h3" style={{ fontSize: 14, color: "var(--accent-d)" }}>Message anyone first, unlock analytics, get the verified badge.</div>
            <div style={{ height: 10 }} />
            <Btn variant="dark" size="sm">Upgrade — $5/mo</Btn>
          </div>
        </div>
      </div>
    </div>
  </Browser>
);

const FeedMobile = () => (
  <Phone tabbar={<MobileTabBar active="home" />}>
    <div className="col" style={{ height: "100%" }}>
      <div className="between" style={{ padding: "10px 16px", borderBottom: "1px solid var(--line-soft)" }}>
        <Logo size={16} />
        <div className="row" style={{ gap: 14 }}>
          <Icon kind="search" size={15} style={{ color: "var(--ink-2)" }} />
          <Icon kind="bell" size={15} style={{ color: "var(--ink-2)" }} />
        </div>
      </div>
      <div className="row" style={{ gap: 6, padding: "10px 14px", overflowX: "auto" }}>
        <Pill variant="solid">All · 24</Pill>
        <Pill>Vocalist</Pill>
        <Pill>Mix eng.</Pill>
        <Pill>Drummer</Pill>
        <Pill>Producer</Pill>
        <Icon kind="sliders" size={14} style={{ color: "var(--ink-2)", marginLeft: 4, alignSelf: "center" }} />
      </div>
      <div className="col" style={{ gap: 10, padding: "0 14px 14px", overflowY: "auto", flex: 1 }}>
        <GigCard boost role="Vocalist" title="Topline writer — Afrobeats demo" tags={["Afrobeats", "R&B"]} comp="$200" name="Maya O." initials="MO" roleTag="PRO" time="2h" desc={false} />
        <GigCard role="Mix eng." title="Mix 4-song shoegaze EP" tags={["Indie"]} comp="$600" name="Iván R." initials="IR" roleTag="ART" time="5h" desc={false} />
        <GigCard role="Drummer" title="Live drummer · 3 NYC dates" tags={["Soul"]} comp="$450/show" name="Theo B." initials="TB" roleTag="ART" time="9h" desc={false} />
        <GigCard role="Songwriter" title="Co-writer for pop demo" tags={["Pop"]} comp="50/50 split" name="Amaya L." initials="AL" roleTag="WRT" time="1d" desc={false} />
      </div>
    </div>
  </Phone>
);

// ════════════════════════════════════════════════════════════════
// 5. GIG DETAIL
// ════════════════════════════════════════════════════════════════

const GigDetailDesktop = () => (
  <Browser url="seshn.fm/g/topline-afrobeats-2k4">
    <div className="col" style={{ height: "100%", overflowY: "auto" }}>
      <FeedTopbar />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 28, padding: "24px 56px" }}>
        <div className="col" style={{ gap: 20 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="t-meta">← Back to feed</span>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Pill variant="solid">★ Boosted</Pill>
            <Pill variant="accent">Vocalist needed</Pill>
            <Pill>Paid · $200</Pill>
            <Pill>Remote OK</Pill>
            <Pill>Deadline · Jun 14</Pill>
          </div>
          <div className="t-h1" style={{ fontSize: 38, maxWidth: 640, lineHeight: 1.02 }}>
            Topline writer wanted for an <Highlight>Afrobeats</Highlight> demo.
          </div>
          {/* Mood / cover hero */}
          <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid var(--line)" }}>
            <CoverHeader seed="afrobeats-mood" height={160} />
            <div style={{ position: "absolute", left: 18, bottom: 14, display: "flex", gap: 10, alignItems: "center" }}>
              <AlbumArt seed="reference-track" size={64} radius={4} />
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "#0d0d0d", background: "rgba(255,255,255,0.85)", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>Reference · vibe</span>
                <span style={{ fontFamily: "var(--font-display)", color: "#0d0d0d", fontSize: 18, fontWeight: 600, textShadow: "0 1px 3px rgba(255,255,255,0.4)" }}>Coast (demo)</span>
              </div>
            </div>
            <div style={{ position: "absolute", top: 14, right: 14 }}>
              <Sticker color="ink" rot={4}>R&B · Afrobeats</Sticker>
            </div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <Avatar size="md" initials="MO" role="PRO" />
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>Maya Oduya</span>
              <span className="t-meta">Producer · Brooklyn · Posted 2h ago</span>
            </div>
          </div>
          <div className="card hairline" style={{ background: "transparent", padding: "20px 0", borderLeft: 0, borderRight: 0, borderTopColor: "var(--line)" }}>
            <Lines count={4} last="70%" />
            <div style={{ height: 14 }} />
            <Lines count={3} last="50%" />
          </div>
          {/* Reference track */}
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Reference</div>
            <Audio title="Coast (demo) — vibe reference" artist="Maya O. · 2:51" source="SoundCloud" seed="coast-demo" playing progress={0.38} />
          </div>
          {/* Apply */}
          <div className="card" style={{ background: "var(--surface-2)" }}>
            <div className="t-h2" style={{ fontSize: 18, marginBottom: 4 }}>Apply</div>
            <span className="t-muted" style={{ fontSize: 12 }}>Maya sees your pitch + 1 attached track.</span>
            <div style={{ height: 14 }} />
            <div className="col" style={{ gap: 10 }}>
              <textarea className="input" rows={4} placeholder="Short pitch — what you'd bring, references, turnaround…" style={{ resize: "none", fontFamily: "inherit" }} />
              <div className="row" style={{ gap: 10, alignItems: "stretch" }}>
                <div className="row" style={{ flex: 1, border: "1px dashed var(--line)", borderRadius: 8, padding: "8px 12px", gap: 8 }}>
                  <Icon kind="paperclip" size={14} style={{ color: "var(--ink-3)" }} />
                  <span className="t-meta">Attach a portfolio track →</span>
                </div>
                <Btn variant="primary" size="lg">Send application</Btn>
              </div>
            </div>
          </div>
          {/* Related */}
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Related posts</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <GigCard context="mini" role="Vocalist" title="Hook writer for an R&B groove" tags={["R&B"]} name="Sam P." initials="SP" time="4h" />
              <GigCard context="mini" role="Topline" title="Topline x melody for pop ref" tags={["Pop"]} name="Lina V." initials="LV" time="1d" />
            </div>
          </div>
        </div>
        {/* Sidebar — poster card */}
        <div className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="row" style={{ gap: 10, marginBottom: 12 }}>
              <Avatar size="lg" initials="MO" />
              <div className="col" style={{ gap: 1, flex: 1 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>Maya Oduya</span>
                  <Pill variant="solid" style={{ fontSize: 9 }}>✓ Pro</Pill>
                </div>
                <span className="t-meta">Producer · Vocalist · Brooklyn</span>
              </div>
            </div>
            <Lines count={2} last="70%" style={{ marginBottom: 12 }} />
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              <Pill>R&B</Pill>
              <Pill>Afrobeats</Pill>
              <Pill>Soul</Pill>
            </div>
            <div className="between" style={{ paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
              <div className="col" style={{ gap: 2 }}>
                <span className="t-meta">Response time</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>~4h</span>
              </div>
              <Btn size="sm">View profile</Btn>
            </div>
          </div>
          <div className="card hairline">
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>Application stats</div>
            <div className="col" style={{ gap: 8 }}>
              <div className="between"><span className="t-muted" style={{ fontSize: 12 }}>Applications</span><b style={{ fontFamily: "var(--font-display)" }}>12</b></div>
              <div className="between"><span className="t-muted" style={{ fontSize: 12 }}>Avg. response</span><b style={{ fontFamily: "var(--font-display)" }}>4h</b></div>
              <div className="between"><span className="t-muted" style={{ fontSize: 12 }}>Closes</span><b style={{ fontFamily: "var(--font-display)" }}>Jun 14</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Browser>
);

const GigDetailMobile = () => (
  <Phone tabbar={<MobileTabBar active="home" />}>
    <div className="col" style={{ height: "100%", overflowY: "auto" }}>
      <div className="between" style={{ padding: "10px 16px" }}>
        <Icon kind="chevron" size={16} style={{ color: "var(--ink-2)", transform: "rotate(180deg)" }} />
        <Icon kind="star" size={16} style={{ color: "var(--ink-2)" }} />
      </div>
      <div className="col" style={{ padding: "4px 20px 16px", gap: 12 }}>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <Pill variant="solid" style={{ fontSize: 9 }}>★ Boosted</Pill>
          <Pill variant="accent">Vocalist</Pill>
          <Pill>$200</Pill>
        </div>
        <div className="t-h1" style={{ fontSize: 22 }}>Topline writer wanted for an Afrobeats demo.</div>
        <div className="row" style={{ gap: 10 }}>
          <Avatar size="sm" initials="MO" role="PRO" />
          <span className="t-meta">Maya O. · 2h ago · Brooklyn</span>
        </div>
        <Lines count={4} last="60%" />
        <Audio compact title="Coast (demo) — reference" artist="Maya O. · 2:51" source="SC" />
      </div>
      <div className="col" style={{ padding: "14px 20px", background: "var(--surface-2)", borderTop: "1px solid var(--line)", gap: 10 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>Apply</span>
        <textarea className="input" rows={3} placeholder="Short pitch…" style={{ resize: "none", fontFamily: "inherit" }} />
        <div className="row" style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: "8px 12px", gap: 8 }}>
          <Icon kind="paperclip" size={13} style={{ color: "var(--ink-3)" }} />
          <span className="t-meta">Attach portfolio track</span>
        </div>
        <Btn variant="primary" size="lg" block>Send application</Btn>
      </div>
    </div>
  </Phone>
);

window.SeshnScreens1 = {
  LandingDesktop, LandingMobile,
  AuthDesktop, AuthMobile, OnboardingDesktop,
  ProfileDesktop, ProfileMobile,
  FeedDesktop, FeedMobile,
  GigDetailDesktop, GigDetailMobile,
};
Object.assign(window, window.SeshnScreens1);
