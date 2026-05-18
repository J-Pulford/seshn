// Seshn — landing page sections + composition

const { Logo, Pill, Avatar, Btn, Input, Icon, GigCard, Audio, StarRow, Rating, Testimonial } = window;
const { AlbumArt, Waveform, Sticker, Vinyl, Cassette, Marquee, Illo, Highlight } = window;
const { NetworkAnim, PostAnim, MatchAnim, BuildAnim,
        FeatAudio, FeatPills, FeatTyping, FeatStars, FeatPaid, FeatBoost } = window;

// ─────────────────────────────────────────────────────
// Reveal-on-scroll wrapper
const Reveal = ({ children, delay = 0, style }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add("in"), delay);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [delay]);
  return <div ref={ref} className="reveal" style={style}>{children}</div>;
};

// ─────────────────────────────────────────────────────
// NAV
const LandNav = () => (
  <nav className="land-nav">
    <div className="land-nav-inner">
      <span className="land-logo"><Logo size={20} /></span>
      <div className="links">
        <a href="#problem">The problem</a>
        <a href="#how">How it works</a>
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="#faq">FAQ</a>
        <a href="#" style={{ color: "var(--land-ink)" }}>Sign in</a>
        <button className="btn primary">Create profile</button>
      </div>
    </div>
  </nav>
);

// ─────────────────────────────────────────────────────
// HERO
const Hero = () => (
  <section className="hero">
    <div className="glow" />
    <div className="land-container">
      <div className="hero-grid">
        <div>
          <Pill className="pill accent" style={{ display: "inline-flex", padding: "4px 10px" }}>
            ● Live · 412 sessions this week
          </Pill>
          <h1>
            Find the people<br />
            who <span className="accent">finish</span><br />
            your record.
          </h1>
          <p className="sub">
            Seshn is the home base for vocalists, producers, instrumentalists and engineers building real work — not chasing followers. Post a brief in 90 seconds. Find your team by the end of the day.
          </p>
          <div className="cta-row">
            <button className="btn primary lg">Create your profile →</button>
            <button className="btn lg">Watch a 60s demo</button>
          </div>
          <div className="stat-row">
            <div className="stat"><b>2,841</b><span>artists on Seshn</span></div>
            <div className="stat"><b>412</b><span>sessions this week</span></div>
            <div className="stat"><b style={{ color: "var(--accent)" }}>$47k</b><span>paid out last month</span></div>
            <div className="stat"><b>98</b><span>cities</span></div>
          </div>
        </div>
        <div>
          <NetworkAnim />
        </div>
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────
// TRUST STRIP — marquee of "now happening on Seshn"
const TrustStrip = () => (
  <Marquee
    dark
    speed={42}
    style={{
      borderTop: "1px solid rgba(255,255,255,0.06)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(255,255,255,0.02)",
    }}
    items={[
      "Maya O. is looking for a topline writer · 2h ago",
      "Theo B. posted: live drummer, 3 NYC dates · 9h ago",
      "Iván R. mixed 4 songs this week",
      "Nia K. joined Seshn",
      "Sundowner EP just published a stem · 1h ago",
      "Sam P. completed a session with Lina V.",
      "412 sessions running right now",
      "Robi K. released a demo from Seshn",
    ]}
  />
);

// ─────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────
// THE PROBLEM — market-research backed callouts.
const Problem = () => {
  const STATS = [
    {
      big: "106,000",
      h: "songs uploaded to streaming every day.",
      p: "Roughly 35 every minute. 50 million new tracks landed in 2025 alone — 20% of every song on streaming. The noise is loud, and most of it stays unheard.",
      src: "Luminate · 2025 Year-End Music Report",
      tone: "danger",
    },
    {
      big: "47.6%",
      h: "of all streaming tracks got fewer than 10 plays last year.",
      p: "88% never crossed 1,000. 55 million songs received exactly zero plays in 2025. Posting alone isn't a strategy — being heard requires being connected.",
      src: "Luminate · Spotify catalog",
      tone: "danger",
    },
    {
      big: "77.8%",
      h: "of independent artists earn under $15,000/year from music.",
      p: "64% cite financial pressure as the #1 reason they leave music — up from #4 just two years ago. Going it alone is also going broke.",
      src: "Xposure Music · State of the Industry 2025",
      tone: "ink",
    },
    {
      big: "70%",
      h: "of indie artists who collaborated did it with someone they'd never met in person.",
      p: "More than half of every Billboard charting track in 2025 has multiple writers, producers, or features. The hits are built by teams — bedrooms only deliver demos.",
      src: "Soundplate · Indie Artist Survey 2025",
      tone: "accent",
    },
  ];
  return (
    <section className="land-section problem" id="problem">
      <div className="land-container">
        <Reveal>
          <div className="problem-intro">
            <span className="eyebrow" style={{ display: "inline-block", fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "0.14em", fontSize: 11, textTransform: "uppercase", color: "var(--accent)", marginBottom: 14 }}>The problem</span>
            <h2>The hardest part of making music has <span className="strike">nothing</span> <span style={{ color: "var(--accent)" }}>everything</span> to do with the people in the room.</h2>
            <p>It's never been easier to <i>release</i> music. It's never been harder to find the people to <i>make</i> it with.</p>
          </div>
        </Reveal>
        <div className="stat-grid">
          {STATS.map((s, i) => (
            <Reveal key={s.big} delay={i * 80}>
              <div className="stat-card">
                <div className={`big ${s.tone}`}>{s.big}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
                <div className="source">Source · {s.src}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={300}>
          <div className="problem-quote">
            <p className="line">No platform exists to connect emerging musicians with each other. <span className="accent">Until now.</span></p>
            <p className="sub">Instagram DMs. Discord servers. Friend-of-a-friend. Luck. That's the current state of the art.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────
// HOW IT WORKS — 3 step section
const Steps = () => (
  <section className="land-section" id="how">
    <div className="land-container">
      <Reveal>
        <div className="sec-head">
          <span className="eyebrow">How Seshn works</span>
          <h2>From a brief to a finished record — together.</h2>
          <p>Three honest steps. Each one is fast enough that you can do it today, not "someday when I have time."</p>
        </div>
      </Reveal>

      <div className="steps">
        {/* Step 1 — POST */}
        <Reveal>
          <div className="step">
            <div className="text">
              <span className="num">STEP 01</span>
              <h3>Post what you actually need.</h3>
              <p>The brief takes 90 seconds. Role, genre, comp type, deadline. Skip the bio. Your work speaks first.</p>
              <ul>
                <li>One template — no resume, no follower counts</li>
                <li>Set paid, split, trade, or fair-deal upfront</li>
                <li>Boost a post to put it at the top of every matched feed</li>
              </ul>
              <div style={{ marginTop: 24 }}>
                <button className="btn">Post your first gig →</button>
              </div>
            </div>
            <div className="anim"><PostAnim /></div>
          </div>
        </Reveal>

        {/* Step 2 — MATCH */}
        <Reveal>
          <div className="step reverse">
            <div className="text">
              <span className="num">STEP 02</span>
              <h3>Find the right collaborators.</h3>
              <p>Filter by role, genre, comp type, location. We surface the people whose work matches the brief — not the ones with the loudest profile.</p>
              <ul>
                <li>Audio-first search — hear before you read</li>
                <li>Verified ratings & testimonials, no anonymous reviews</li>
                <li>Reach out free; Pro lets you message anyone first</li>
              </ul>
              <div style={{ marginTop: 24 }}>
                <button className="btn">Browse 2,841 artists →</button>
              </div>
            </div>
            <div className="anim"><MatchAnim /></div>
          </div>
        </Reveal>

        {/* Step 3 — BUILD */}
        <Reveal>
          <div className="step">
            <div className="text">
              <span className="num">STEP 03</span>
              <h3>Build it in a project room.</h3>
              <p>Spin up a private space for your team. Chat, audio files, stems, deadlines, voice notes — all in one place, all out of group DMs.</p>
              <ul>
                <li>Inline audio previews & waveform playback</li>
                <li>Members, roles, deadlines, brief — synced</li>
                <li>Ratings + testimonials issued automatically on delivery</li>
              </ul>
              <div style={{ marginTop: 24 }}>
                <button className="btn">See a sample room →</button>
              </div>
            </div>
            <div className="anim"><BuildAnim /></div>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────
// FEATURES GRID
const Features = () => {
  const FEATS = [
    { t: "Audio-first profiles", b: "Every profile is a portfolio you can listen to. SoundCloud, Spotify, YouTube — unified player, instant preview.", Anim: FeatAudio },
    { t: "Tag-based discovery", b: "Filter by role, genre, comp, location. No follower-count theatre. Recommendations tuned to what you make.", Anim: FeatPills },
    { t: "Built-in project rooms", b: "Chat, stems, voice notes, deadlines — without piling up in group DMs.", Anim: FeatTyping },
    { t: "Ratings & testimonials", b: "Verified collaborators leave reviews after the session. Real signal, not vanity.", Anim: FeatStars },
    { t: "Get paid like a pro", b: "Stripe-powered payouts. Set rate, split, or trade up front. Escrow coming Q3.", Anim: FeatPaid },
    { t: "Boost when it counts", b: "Promote a post to land at the top of every matched feed for 7 days. $5.", Anim: FeatBoost },
  ];
  return (
    <section className="land-section" id="features" style={{ background: "rgba(255,255,255,0.015)" }}>
      <div className="land-container">
        <Reveal>
          <div className="sec-head">
            <span className="eyebrow">Why Seshn</span>
            <h2>Designed by artists, for the work.</h2>
            <p>Every feature exists because someone on the team needed it on a Tuesday and couldn't find it anywhere else.</p>
          </div>
        </Reveal>
        <div className="feat-grid">
          {FEATS.map(({ t, b, Anim }, i) => (
            <Reveal key={t} delay={i * 80}>
              <div className="feat-card">
                <div className="anim-slot"><Anim /></div>
                <h4>{t}</h4>
                <p>{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────
// PROJECT ROOMS DEEP DIVE
const Deep = () => (
  <section className="land-section">
    <div className="land-container">
      <div className="deep">
        <Reveal>
          <div className="text">
            <span className="eyebrow" style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "0.14em", fontSize: 11, textTransform: "uppercase", color: "var(--accent)" }}>Project rooms</span>
            <h3>The work happens here. Not in your DMs.</h3>
            <p>Project rooms are private workspaces for everyone on the record. Threads stay organized, audio plays inline, deadlines are visible, and when a project ships the team gets ratings + endorsements automatically — building real credibility on the platform.</p>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Inline audio: drop a WAV, hear it without leaving the chat",
                "File versioning: v1, v2, v3 — never lose the take you want",
                "Deadlines synced to every member's calendar",
                "End-of-session ratings build verified profiles",
              ].map(t => (
                <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "var(--land-ink-2)" }}>
                  <span style={{ color: "var(--accent)", fontWeight: 700 }}>✓</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="mock">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--land-line)", display: "flex", alignItems: "center", gap: 10 }}>
              <AlbumArt seed="deep-project" size={36} radius={6} />
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>Sundowner EP</div>
                <div style={{ fontSize: 11, color: "var(--land-ink-3)" }}>6 members · Q3 release · 78 days left</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: -8 }}>
                {["MO", "NK", "TB", "SP"].map((i, k) => (
                  <Avatar key={i} size="sm" initials={i} style={{ marginLeft: k > 0 ? -8 : 0, border: "2px solid var(--land-surface)", background: "rgba(255,255,255,0.1)", color: "var(--land-ink)" }} />
                ))}
              </div>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="row" style={{ gap: 10 }}>
                <Avatar size="sm" initials="MO" style={{ background: "rgba(255,255,255,0.1)", color: "var(--land-ink)" }} />
                <div style={{ padding: "8px 12px", background: "var(--land-surface-2)", borderRadius: 10, fontSize: 13, maxWidth: "75%", color: "var(--land-ink)" }}>
                  pushed v3 of the topline — bridge lands?
                </div>
              </div>
              <div style={{ maxWidth: 280 }}>
                <Audio compact title="sundowner_topline_v3.wav" artist="Maya · 1:42" source="" seed="deep-audio" playing progress={0.55} />
              </div>
              <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
                <div style={{ padding: "8px 12px", background: "var(--accent)", color: "#062c19", borderRadius: 10, fontSize: 13, maxWidth: "75%" }}>
                  this is the move ✶ tracking tomorrow
                </div>
                <Avatar size="sm" initials="YT" />
              </div>
              <div style={{ padding: "8px 12px", background: "rgba(44,203,115,0.08)", color: "var(--accent)", borderRadius: 8, fontSize: 11.5, fontFamily: "var(--font-display)", fontWeight: 600, alignSelf: "center" }}>
                ✓ Mix lock met · Aug 1, 2026
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────
// TESTIMONIALS
const Tests = () => {
  const TESTS = [
    { name: "Nia Kassim", role: "Vocalist · London", ini: "NK", rating: 5, quote: "I found my whole band on Seshn in three weeks. Two of them ended up on the record. I have never had a platform actually deliver work like this." },
    { name: "Iván Reyes", role: "Producer · CDMX", ini: "IR", rating: 5, quote: "Mixed four EPs in a month. The brief format means I don't have to read between the lines or waste a discovery call. The work is the work." },
    { name: "Maya Oduya", role: "Producer · Brooklyn", ini: "MO", rating: 5, quote: "Built a Pro profile, posted one brief, woke up to nine applications. The verified rating system means I don't have to gamble on collaborators." },
    { name: "Theo Brooks", role: "Drummer · NYC", ini: "TB", rating: 4.5, quote: "I'm a session player. Seshn replaced three group chats, a Google sheet, and the weekly back-and-forth on Instagram DMs. Booked solid through Q3." },
    { name: "Sam Park", role: "Mixing eng. · LA", ini: "SP", rating: 5, quote: "Stripe payouts. Inline audio. Clear briefs. The little things add up — I haven't sent an invoice manually since I joined." },
    { name: "Lina Vega", role: "Producer · Mexico City", ini: "LV", rating: 5, quote: "I'm based in CDMX and 60% of my work is now from NYC and London artists. Seshn made my city irrelevant to my career." },
  ];
  return (
    <section className="land-section">
      <div className="land-container">
        <Reveal>
          <div className="sec-head">
            <span className="eyebrow">From the room</span>
            <h2>Built on trust, measured in records.</h2>
            <p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 6, padding: "6px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 999 }}>
                <StarRow value={4.9} size={14} color="var(--accent)" />
                <b style={{ color: "var(--land-ink)", fontFamily: "var(--font-display)" }}>4.9</b>
                <span style={{ color: "var(--land-ink-3)" }}>across 12,400+ sessions</span>
              </span>
            </p>
          </div>
        </Reveal>
        <div className="tests-wrap">
          {TESTS.map((t, i) => (
            <Reveal key={t.name} delay={i * 60}>
              <div className="test-card">
                <StarRow value={t.rating} size={14} color="var(--accent)" />
                <div className="quote">{t.quote}</div>
                <div className="who">
                  <Avatar initials={t.ini} style={{ background: "rgba(255,255,255,0.1)", color: "var(--land-ink)" }} />
                  <div className="col">
                    <b>{t.name}</b>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────
// PRICING
const Pricing = () => (
  <section className="land-section" id="pricing" style={{ background: "rgba(255,255,255,0.015)" }}>
    <div className="land-container">
      <Reveal>
        <div className="sec-head">
          <span className="eyebrow">Pricing</span>
          <h2>Free forever. Pro when you're serious.</h2>
          <p>No credit card needed to start. Cancel Pro anytime. We make money so you can stop chasing it.</p>
        </div>
      </Reveal>
      <div className="price-grid">
        <Reveal>
          <div className="price-card">
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "0.14em", fontSize: 11, textTransform: "uppercase", color: "var(--land-ink-3)", marginBottom: 8 }}>Free</div>
              <div className="price"><b>$0</b><span>forever</span></div>
            </div>
            <p style={{ color: "var(--land-ink-3)", fontSize: 13, margin: 0 }}>Everything you need to start finding collaborators.</p>
            <ul>
              <li>Unlimited gig posts</li>
              <li>Apply to any post</li>
              <li>3 portfolio embeds</li>
              <li>Reply to messages</li>
              <li>Basic ratings & testimonials</li>
            </ul>
            <button className="btn lg">Start free →</button>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="price-card pro">
            <div style={{ position: "absolute", top: 18, right: 18 }}>
              <span className="pill solid">Most popular</span>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "0.14em", fontSize: 11, textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>Pro</div>
              <div className="price"><b>$5</b><span>/ month · or $48/yr (save 20%)</span></div>
            </div>
            <p style={{ color: "var(--land-ink-2)", fontSize: 13, margin: 0 }}>For artists serious enough to make this their work.</p>
            <ul>
              <li>Verified ✓ badge</li>
              <li>Message anyone first</li>
              <li>Profile view analytics</li>
              <li>Unlimited portfolio slots</li>
              <li>Priority in search</li>
              <li>1 free boost credit / month ($5 value)</li>
            </ul>
            <button className="btn primary lg">Upgrade to Pro →</button>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────
// FAQ
const FAQ = () => {
  const items = [
    ["Who is Seshn for?", "Vocalists, producers, instrumentalists, songwriters, engineers — any musician collaborating on real projects. From bedroom artists to working professionals."],
    ["Do I need to be 'somebody' to join?", "No. Seshn is a working platform, not a club. Your portfolio and your collaborators are what people look at — not your follower count."],
    ["How are payments handled?", "Through Stripe. Set your rate, split, or trade up front in the brief. Escrow (auto-release on delivery) ships in Q3 2026."],
    ["Can I use Seshn just for paid work / just for trade work?", "Both. You can filter posts and your own profile by comp type. Plenty of artists do both depending on the project."],
    ["What about IP and rights?", "Splits and IP terms are negotiated in the project room. Seshn doesn't take a cut of your work — we make money from Pro subscriptions and boosts only."],
    ["Is there an app?", "Web-first. The platform works great on mobile browsers. A native app is in our 2026 roadmap once we know what the platform should actually be."],
  ];
  return (
    <section className="land-section" id="faq">
      <div className="land-container" style={{ maxWidth: 880 }}>
        <Reveal>
          <div className="sec-head">
            <span className="eyebrow">FAQ</span>
            <h2>Questions, answered.</h2>
          </div>
        </Reveal>
        <div className="faq">
          {items.map(([q, a], i) => (
            <Reveal key={q} delay={i * 40}>
              <details className="faq-item" open={i === 0}>
                <summary>{q}</summary>
                <div className="ans">{a}</div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────
// FINAL CTA
const FinalCTA = () => (
  <section className="final-cta">
    <div className="land-container">
      <Reveal>
        <h2>Your next collaborator<br />is one post away.</h2>
        <p>Free profile · 90 seconds to your first brief · no credit card.</p>
        <form onSubmit={e => e.preventDefault()}>
          <input type="email" placeholder="you@artist.fm" />
          <button className="btn primary lg">Get started →</button>
        </form>
        <div style={{ marginTop: 24, display: "flex", gap: 18, justifyContent: "center", color: "var(--land-ink-3)", fontSize: 12 }}>
          <span>✓ Free forever</span>
          <span>✓ Cancel Pro anytime</span>
          <span>✓ Built by artists</span>
        </div>
      </Reveal>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────
// FOOTER
const Footer = () => (
  <footer className="footer">
    <div className="footer-inner">
      <div style={{ maxWidth: 280 }}>
        <Logo size={20} />
        <p style={{ marginTop: 12, color: "var(--land-ink-3)", fontSize: 13, lineHeight: 1.5 }}>
          Home base for working musicians. Made with ♥ in Brooklyn.
        </p>
      </div>
      <div className="footer-cols">
        <div className="footer-col">
          <b>Product</b>
          <a href="#">Browse</a>
          <a href="#">Post a gig</a>
          <a href="#">Pricing</a>
          <a href="#">Pro</a>
        </div>
        <div className="footer-col">
          <b>Resources</b>
          <a href="#">How it works</a>
          <a href="#">For producers</a>
          <a href="#">For vocalists</a>
          <a href="#">Stories</a>
        </div>
        <div className="footer-col">
          <b>Company</b>
          <a href="#">About</a>
          <a href="#">Careers</a>
          <a href="#">Press</a>
          <a href="#">Contact</a>
        </div>
        <div className="footer-col">
          <b>Legal</b>
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
          <a href="#">IP policy</a>
        </div>
      </div>
    </div>
    <div className="bottom">
      <span>© 2026 Seshn, Inc.</span>
      <div style={{ display: "flex", gap: 20 }}>
        <a href="#">Instagram</a>
        <a href="#">Twitter</a>
        <a href="#">YouTube</a>
      </div>
    </div>
  </footer>
);

// ─────────────────────────────────────────────────────
// MAIN
const LandingPage = () => (
  <div className="land">
    <LandNav />
    <Hero />
    <TrustStrip />
    <Problem />
    <Steps />
    <Features />
    <Deep />
    <Tests />
    <Pricing />
    <FAQ />
    <FinalCTA />
    <Footer />
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(<LandingPage />);
