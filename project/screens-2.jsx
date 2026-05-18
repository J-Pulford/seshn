// Seshn — Screens part 2: Create post, Browse profiles, Project room, DMs, Pro

const { Logo, Pill, Avatar, Btn, Input, PH, Line, Lines, Audio, Icon, GigCard, Browser, Phone, MobileTabBar } = window.SeshnAtoms;
const { AlbumArt, Waveform, Marquee, Sticker, Vinyl, Cassette, Polaroid, CoverHeader, Grain, Illo, Highlight } = window.SeshnVisuals;

const FeedTopbar = window.FeedTopbar || (() => (
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
));

// ════════════════════════════════════════════════════════════════
// 6. CREATE POST FLOW
// ════════════════════════════════════════════════════════════════

const CreateProgress = ({ step }) => (
  <div className="row" style={{ gap: 8, alignItems: "center" }}>
    {[1, 2, 3].map(n => (
      <React.Fragment key={n}>
        <div className="row" style={{ gap: 8 }}>
          <span style={{
            width: 22, height: 22, borderRadius: 999,
            background: n <= step ? "var(--ink)" : "transparent",
            border: "1px solid " + (n <= step ? "var(--ink)" : "var(--line)"),
            color: n <= step ? "var(--frame)" : "var(--ink-3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11,
          }}>{n < step ? "✓" : n}</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 500, color: n <= step ? "var(--ink)" : "var(--ink-3)" }}>
            {["Brief", "Details", "Review"][n - 1]}
          </span>
        </div>
        {n < 3 && <div style={{ width: 28, height: 1, background: "var(--line)" }} />}
      </React.Fragment>
    ))}
  </div>
);

const CreateDesktop = () => (
  <Browser url="seshn.fm/post/new">
    <div className="col" style={{ height: "100%", overflowY: "auto" }}>
      <FeedTopbar />
      <div style={{ padding: "26px 56px 48px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32 }}>
        <div className="col" style={{ gap: 20 }}>
          <div className="between">
            <CreateProgress step={2} />
            <span className="t-meta">Auto-saved 2s ago</span>
          </div>
          <div>
            <div className="t-eyebrow">Step 2 of 3</div>
            <div className="t-h1" style={{ fontSize: 28, marginTop: 4 }}>Who and what.</div>
          </div>
          {/* Role */}
          <div className="col" style={{ gap: 10 }}>
            <span className="t-h3" style={{ fontSize: 14 }}>Role needed</span>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {["Vocalist", "Topline writer", "Producer", "Mixing eng.", "Drummer", "Bassist", "Songwriter", "Guitarist", "DJ", "Other"].map((r, i) => (
                <Pill key={r} variant={i === 1 ? "solid" : "neutral"}>{i === 1 && "✓ "}{r}</Pill>
              ))}
            </div>
          </div>
          {/* Genre */}
          <div className="col" style={{ gap: 10 }}>
            <span className="t-h3" style={{ fontSize: 14 }}>Genre tags <span className="t-meta">· up to 3</span></span>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {["Afrobeats", "R&B", "Soul", "Pop", "Hip-hop", "Indie", "Electronic", "Folk", "Jazz"].map((r, i) => (
                <Pill key={r} variant={i < 2 ? "accent" : "neutral"}>{i < 2 && "✓ "}{r}</Pill>
              ))}
            </div>
          </div>
          {/* Compensation */}
          <div className="col" style={{ gap: 10 }}>
            <span className="t-h3" style={{ fontSize: 14 }}>Compensation</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                ["Paid", "Fixed fee", true],
                ["Split", "Royalty / writers share", false],
                ["Trade", "Reciprocal work", false],
                ["Unpaid", "Portfolio piece", false],
              ].map(([t, s, sel]) => (
                <div key={t} className="card" style={{ padding: 12, borderColor: sel ? "var(--accent-d)" : "var(--line)", background: sel ? "var(--accent-bg)" : "var(--surface)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: sel ? "var(--accent-d)" : "var(--ink)" }}>{sel && "✓ "}{t}</div>
                  <span className="t-meta">{s}</span>
                </div>
              ))}
            </div>
            <div className="row" style={{ gap: 10 }}>
              <Input placeholder="$ Amount" value="200" style={{ maxWidth: 160 }} />
              <Input placeholder="USD" style={{ maxWidth: 100 }} />
              <Input placeholder="Deadline · Jun 14, 2026" />
            </div>
          </div>
          <div className="between" style={{ marginTop: 12, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
            <Btn>← Back · Brief</Btn>
            <Btn variant="primary" size="lg">Continue → Review</Btn>
          </div>
        </div>
        {/* Right: live preview */}
        <div className="col" style={{ gap: 12, position: "sticky", top: 0 }}>
          <div className="t-eyebrow">Live preview · feed card</div>
          <GigCard role="Topline writer" title="Topline writer wanted for Afrobeats demo" tags={["Afrobeats", "R&B"]} comp="Paid · $200" name="Maya Oduya" initials="MO" roleTag="PRO" time="just now" />
          <div className="card hairline" style={{ padding: 12 }}>
            <div className="t-eyebrow" style={{ marginBottom: 6 }}>Visibility</div>
            <div className="col" style={{ gap: 5, fontSize: 12 }}>
              <div className="row" style={{ gap: 8 }}><Icon kind="check" size={11} style={{ color: "var(--accent-d)" }} /> Posted to public feed</div>
              <div className="row" style={{ gap: 8 }}><Icon kind="check" size={11} style={{ color: "var(--accent-d)" }} /> Matches ~142 vocalists</div>
              <div className="row" style={{ gap: 8 }}><Icon kind="check" size={11} style={{ color: "var(--accent-d)" }} /> Notifications to 12 suggested</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Browser>
);

const CreateMobile = () => (
  <Phone>
    <div className="col" style={{ height: "100%" }}>
      <div className="between" style={{ padding: "10px 16px", borderBottom: "1px solid var(--line-soft)" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>New gig</span>
        <span className="t-meta">Step 2 / 3</span>
      </div>
      <div className="row" style={{ gap: 4, padding: "10px 16px" }}>
        {[1,2,3].map(n => (
          <div key={n} style={{ flex: 1, height: 3, background: n <= 2 ? "var(--ink)" : "var(--line)", borderRadius: 2 }} />
        ))}
      </div>
      <div className="col" style={{ padding: "8px 16px 12px", gap: 18, overflowY: "auto", flex: 1 }}>
        <div>
          <div className="t-h2" style={{ fontSize: 18 }}>Who and what.</div>
          <span className="t-meta">Pick the role and how you'll comp.</span>
        </div>
        <div className="col" style={{ gap: 8 }}>
          <span className="t-h3" style={{ fontSize: 13 }}>Role needed</span>
          <div className="row" style={{ gap: 5, flexWrap: "wrap" }}>
            {["Vocalist","Topline","Producer","Mix eng.","Drummer","Bassist","Other"].map((r, i) => (
              <Pill key={r} variant={i === 1 ? "solid" : "neutral"}>{i === 1 && "✓ "}{r}</Pill>
            ))}
          </div>
        </div>
        <div className="col" style={{ gap: 8 }}>
          <span className="t-h3" style={{ fontSize: 13 }}>Genres</span>
          <div className="row" style={{ gap: 5, flexWrap: "wrap" }}>
            {["Afrobeats","R&B","Soul","Pop","Hip-hop","Indie"].map((r, i) => (
              <Pill key={r} variant={i < 2 ? "accent" : "neutral"}>{i < 2 && "✓ "}{r}</Pill>
            ))}
          </div>
        </div>
        <div className="col" style={{ gap: 8 }}>
          <span className="t-h3" style={{ fontSize: 13 }}>Compensation</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["Paid", true], ["Split", false], ["Trade", false], ["Unpaid", false]].map(([t, sel]) => (
              <div key={t} className="card" style={{ padding: 10, borderColor: sel ? "var(--accent-d)" : "var(--line)", background: sel ? "var(--accent-bg)" : "var(--surface)", textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, color: sel ? "var(--accent-d)" : "var(--ink)" }}>
                {sel && "✓ "}{t}
              </div>
            ))}
          </div>
          <Input placeholder="$ Amount" value="200" />
        </div>
      </div>
      <div className="row" style={{ padding: "12px 16px", borderTop: "1px solid var(--line)", gap: 8 }}>
        <Btn block>Back</Btn>
        <Btn variant="primary" block>Continue →</Btn>
      </div>
    </div>
  </Phone>
);

// Variant: Step 3 review + boost upsell
const CreateReviewDesktop = () => (
  <Browser url="seshn.fm/post/new/review">
    <div className="col" style={{ height: "100%", overflowY: "auto" }}>
      <FeedTopbar />
      <div style={{ padding: "26px 56px 48px", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 32 }}>
        <div className="col" style={{ gap: 20 }}>
          <CreateProgress step={3} />
          <div>
            <div className="t-eyebrow">Step 3 of 3</div>
            <div className="t-h1" style={{ fontSize: 28, marginTop: 4 }}>Look it over.</div>
          </div>
          <GigCard role="Topline writer" title="Topline writer wanted for Afrobeats demo" tags={["Afrobeats", "R&B"]} comp="Paid · $200" name="Maya Oduya" initials="MO" roleTag="PRO" time="just now" />
          <div className="row" style={{ gap: 16 }}>
            <Btn>← Edit details</Btn>
            <Btn variant="primary" size="lg">Publish to feed →</Btn>
          </div>
        </div>
        {/* Boost upsell */}
        <div className="card" style={{ background: "var(--ink-black)", color: "var(--frame)", borderColor: "transparent", padding: 24 }}>
          <div className="row" style={{ gap: 8 }}>
            <Pill variant="solid">★ Boost</Pill>
            <span className="t-meta" style={{ color: "rgba(255,255,255,0.55)" }}>Optional · 7 days</span>
          </div>
          <div className="t-h2" style={{ color: "var(--frame)", fontSize: 24, marginTop: 14, lineHeight: 1.15 }}>
            Get 5× more applicants.
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 8, lineHeight: 1.5 }}>
            Pin to the top of the feed, push to matched artists, and tag with a Boosted badge for 7 days.
          </div>
          <div className="col" style={{ gap: 8, marginTop: 16, marginBottom: 16 }}>
            {["Top of the feed", "Push notification to matches", "Boosted badge & ranking"].map(t => (
              <div key={t} className="row" style={{ gap: 8 }}>
                <Icon kind="check" size={12} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)" }}>{t}</span>
              </div>
            ))}
          </div>
          <div className="between" style={{ paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--frame)" }}>$5</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>one-time, 7 days</span>
            </div>
            <Btn variant="primary">Add boost</Btn>
          </div>
        </div>
      </div>
    </div>
  </Browser>
);

// ════════════════════════════════════════════════════════════════
// 7. BROWSE PROFILES
// ════════════════════════════════════════════════════════════════

const ArtistCard = ({ name, ini, role, sub, tags, active }) => (
  <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
    <div className="row" style={{ gap: 10 }}>
      <Avatar size="lg" initials={ini} />
      <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>{name}</span>
        <span className="t-meta">{sub}</span>
        <div className="row" style={{ gap: 4, marginTop: 4 }}>
          {role.map(r => <Pill key={r} variant="accent">{r}</Pill>)}
        </div>
      </div>
    </div>
    <Lines count={2} last="65%" />
    <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
      {tags.map(t => <Pill key={t}>{t}</Pill>)}
    </div>
    <div className="gig-foot">
      <span className="t-meta">{active}</span>
      <Btn size="sm">View profile</Btn>
    </div>
  </div>
);

const BrowseDesktop = () => (
  <Browser url="seshn.fm/browse">
    <div className="col" style={{ height: "100%" }}>
      <FeedTopbar />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, padding: "20px 24px", flex: 1, overflow: "hidden" }}>
        <div className="col" style={{ gap: 22, overflowY: "auto" }}>
          <div className="col" style={{ gap: 8 }}>
            <span className="t-eyebrow">Roles</span>
            <div className="col" style={{ gap: 4 }}>
              {[["Vocalist", 142, true], ["Producer", 88, true], ["Mixing engineer", 41], ["Drummer", 22], ["Songwriter", 67], ["Guitarist", 35], ["DJ", 18]].map(([r, c, s]) => (
                <div key={r} className="between" style={{ padding: "5px 0" }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, border: "1px solid var(--line)", background: s ? "var(--ink)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {s && <Icon kind="check" size={9} style={{ color: "var(--frame)" }} />}
                    </span>
                    <span style={{ fontSize: 12.5 }}>{r}</span>
                  </div>
                  <span className="t-meta">{c}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="col" style={{ gap: 8 }}>
            <span className="t-eyebrow">Location</span>
            <Input placeholder="City or 'Remote'" />
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              <Pill variant="solid">Remote OK</Pill>
              <Pill>NYC</Pill>
              <Pill>LA</Pill>
              <Pill>+</Pill>
            </div>
          </div>
          <div className="col" style={{ gap: 8 }}>
            <span className="t-eyebrow">Availability</span>
            <div className="col" style={{ gap: 5, fontSize: 12 }}>
              {["Open to work", "Open to projects", "Busy"].map((a, i) => (
                <div key={a} className="row" style={{ gap: 8 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 999, border: "1px solid var(--line)", background: i === 0 ? "var(--ink)" : "transparent" }} />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col" style={{ gap: 16, overflowY: "auto" }}>
          <div className="between">
            <div>
              <div className="t-h2" style={{ fontSize: 20 }}>Browse artists</div>
              <span className="t-muted" style={{ fontSize: 12 }}>1,284 artists match your filters</span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <Pill variant="ghost">Newest</Pill>
              <Pill>Most active</Pill>
              <Pill variant="solid">Recommended</Pill>
              <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} />
              <Icon kind="grid" size={16} style={{ color: "var(--ink)" }} />
              <Icon kind="list" size={16} style={{ color: "var(--ink-4)" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <ArtistCard name="Nia Kassim" ini="NK" role={["Vocalist"]} sub="London · she/her" tags={["R&B", "Soul"]} active="Active now · Pro" />
            <ArtistCard name="Sam Park" ini="SP" role={["Mixing eng."]} sub="LA · he/him" tags={["Indie", "Shoegaze"]} active="Active 3h ago" />
            <ArtistCard name="Lina Vega" ini="LV" role={["Producer"]} sub="CDMX · she/her" tags={["Electronic", "Latin"]} active="Active 1d ago" />
            <ArtistCard name="Mo Daniels" ini="MD" role={["Drummer"]} sub="NYC · he/him" tags={["Soul", "Funk"]} active="Active 2h ago · Pro" />
            <ArtistCard name="Robi K." ini="RK" role={["Songwriter"]} sub="Berlin · they/them" tags={["Pop", "Electronic"]} active="Active 5h ago" />
            <ArtistCard name="Iván Reyes" ini="IR" role={["Vocalist", "Guitar"]} sub="Mexico City · he/him" tags={["Indie", "Folk"]} active="Active 8h ago" />
          </div>
        </div>
      </div>
    </div>
  </Browser>
);

const BrowseMobile = () => (
  <Phone tabbar={<MobileTabBar active="browse" />}>
    <div className="col" style={{ height: "100%" }}>
      <div className="between" style={{ padding: "10px 16px", borderBottom: "1px solid var(--line-soft)" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>Browse</span>
        <Icon kind="sliders" size={16} style={{ color: "var(--ink-2)" }} />
      </div>
      <div className="row" style={{ gap: 6, padding: "10px 14px", overflowX: "auto" }}>
        <Pill variant="solid">Recommended</Pill>
        <Pill>Vocalist</Pill>
        <Pill>Producer</Pill>
        <Pill>Mix eng.</Pill>
        <Pill>Remote</Pill>
      </div>
      <div className="col" style={{ padding: "0 14px 14px", gap: 10, overflowY: "auto", flex: 1 }}>
        <ArtistCard name="Nia Kassim" ini="NK" role={["Vocalist"]} sub="London · she/her" tags={["R&B", "Soul"]} active="Active now · Pro" />
        <ArtistCard name="Sam Park" ini="SP" role={["Mixing eng."]} sub="LA · he/him" tags={["Indie"]} active="Active 3h ago" />
        <ArtistCard name="Lina Vega" ini="LV" role={["Producer"]} sub="CDMX" tags={["Electronic"]} active="Active 1d ago" />
      </div>
    </div>
  </Phone>
);

// ════════════════════════════════════════════════════════════════
// 8. PROJECT ROOM
// ════════════════════════════════════════════════════════════════

const ChatMessage = ({ self, ini, name, time, body, audio, file }) => (
  <div className="row" style={{ gap: 10, padding: "10px 0", alignItems: "flex-start", flexDirection: self ? "row-reverse" : "row" }}>
    <Avatar size="sm" initials={ini} style={{ flex: "0 0 auto" }} />
    <div className="col" style={{ gap: 4, maxWidth: "70%", alignItems: self ? "flex-end" : "flex-start" }}>
      <div className="row" style={{ gap: 8, flexDirection: self ? "row-reverse" : "row" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12 }}>{name}</span>
        <span className="t-meta">{time}</span>
      </div>
      {body && (
        <div style={{
          padding: "10px 14px",
          background: self ? "var(--ink)" : "var(--surface-2)",
          color: self ? "var(--frame)" : "var(--ink)",
          borderRadius: 12,
          borderTopRightRadius: self ? 4 : 12,
          borderTopLeftRadius: self ? 12 : 4,
          fontSize: 13, lineHeight: 1.4,
        }}>
          {body}
        </div>
      )}
      {audio && <Audio compact title={audio.title} artist={audio.meta} source="Audio" />}
      {file && (
        <div className="row" style={{ gap: 8, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)" }}>
          <Icon kind="folder" size={14} style={{ color: "var(--ink-3)" }} />
          <div className="col">
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12 }}>{file.name}</span>
            <span className="t-meta">{file.size}</span>
          </div>
        </div>
      )}
    </div>
  </div>
);

const ProjectDesktop = () => (
  <Browser url="seshn.fm/p/sundowner-ep">
    <div className="col" style={{ height: "100%" }}>
      {/* Project header */}
      <div style={{ padding: "14px 28px", borderBottom: "1px solid var(--line)" }}>
        <div className="between">
          <div className="row" style={{ gap: 14, alignItems: "center" }}>
            <AlbumArt seed="sundowner-ep" size={56} radius={8} />
            <div className="col" style={{ gap: 4 }}>
              <span className="t-eyebrow">Project · started Apr 12</span>
              <div className="row" style={{ gap: 10 }}>
                <span className="t-h1" style={{ fontSize: 22 }}>Sundowner EP</span>
                <Pill variant="accent">In progress</Pill>
                <Sticker color="cream" size="sm" rot={-3}>Q3 • release</Sticker>
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 14 }}>
            <div className="row">
              {["MO", "NK", "TB", "SP"].map((i, k) => (
                <Avatar key={i} size="sm" initials={i} style={{ marginLeft: k > 0 ? -8 : 0, border: "2px solid var(--frame)" }} />
              ))}
              <span className="pill" style={{ marginLeft: 6, fontSize: 10 }}>+2</span>
            </div>
            <Btn size="sm">Invite</Btn>
            <Icon kind="gear" size={16} style={{ color: "var(--ink-2)" }} />
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", flex: 1, overflow: "hidden" }}>
        {/* Chat */}
        <div className="col" style={{ flex: 1 }}>
          <div className="col" style={{ flex: 1, overflowY: "auto", padding: "12px 28px" }}>
            <div className="row" style={{ gap: 10, padding: "8px 0", justifyContent: "center" }}>
              <span className="t-meta">— Today, Tuesday May 14 —</span>
            </div>
            <ChatMessage ini="MO" name="Maya Oduya" time="9:14" body="just pushed v3 of the topline. let me know if the bridge lands. ✶" />
            <ChatMessage ini="MO" name="Maya Oduya" time="9:14" audio={{ title: "sundowner_topline_v3.wav", meta: "Maya O. · 1:42" }} />
            <ChatMessage self ini="YT" name="You" time="9:21" body="oh this is the move. the pre is doing exactly what we talked about. one note — can we hold the last word in the bridge a beat longer?" />
            <ChatMessage ini="NK" name="Nia Kassim" time="9:33" body="will track that today. I'll have a stem up by EOD." />
            <ChatMessage ini="TB" name="Theo Brooks" time="9:48" file={{ name: "drum-bus_v2_groove-shift.zip", size: "84 MB · Reaper session" }} />
            <ChatMessage ini="TB" name="Theo Brooks" time="9:48" body="re-cut the hat to push behind the beat. small thing, big feel." />
          </div>
          {/* Composer */}
          <div style={{ padding: "12px 28px", borderTop: "1px solid var(--line)" }}>
            <div className="row" style={{ gap: 8, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface-2)" }}>
              <Icon kind="paperclip" size={14} style={{ color: "var(--ink-3)" }} />
              <Icon kind="mic" size={14} style={{ color: "var(--ink-3)" }} />
              <span className="t-meta" style={{ flex: 1 }}>Reply to the room…</span>
              <Btn size="sm" variant="primary">Send</Btn>
            </div>
          </div>
        </div>
        {/* Right panel */}
        <div style={{ borderLeft: "1px solid var(--line)", padding: "16px 18px", overflowY: "auto", background: "var(--surface-2)" }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Brief</div>
          <Lines count={4} last="55%" style={{ marginBottom: 16 }} />
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
            <Pill>R&B</Pill>
            <Pill>Soul</Pill>
            <Pill variant="accent">Q3 release</Pill>
          </div>
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>Moodboard</div>
          <div className="row" style={{ gap: 6, marginBottom: 18 }}>
            <AlbumArt seed="sundowner-1" size={48} radius={4} />
            <AlbumArt seed="sundowner-2" size={48} radius={4} />
            <AlbumArt seed="sundowner-3" size={48} radius={4} />
            <div style={{ width: 48, height: 48, borderRadius: 4, border: "1px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontFamily: "var(--font-display)", fontSize: 18 }}>+</div>
          </div>
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>Members · 6</div>
          <div className="col" style={{ gap: 10, marginBottom: 18 }}>
            {[
              ["Maya Oduya", "MO", "Producer · Owner"],
              ["Nia Kassim", "NK", "Vocalist"],
              ["Theo Brooks", "TB", "Drummer"],
              ["Sam Park", "SP", "Mix engineer"],
              ["Iván Reyes", "IR", "Guitar"],
              ["You", "YT", "A&R"],
            ].map(([n, i, r]) => (
              <div key={n} className="row" style={{ gap: 8 }}>
                <Avatar size="sm" initials={i} />
                <div className="col" style={{ gap: 0 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11.5 }}>{n}</span>
                  <span className="t-meta">{r}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Deadline</div>
          <div className="card" style={{ padding: 12 }}>
            <div className="row" style={{ gap: 8 }}>
              <Icon kind="pin" size={14} style={{ color: "var(--accent-d)" }} />
              <div className="col" style={{ gap: 1 }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>Aug 1, 2026</span>
                <span className="t-meta">Mix lock · 78 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Browser>
);

const ProjectMobile = () => (
  <Phone>
    <div className="col" style={{ height: "100%" }}>
      <div className="between" style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
        <Icon kind="chevron" size={16} style={{ color: "var(--ink-2)", transform: "rotate(180deg)" }} />
        <div className="col" style={{ alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13 }}>Sundowner EP</span>
          <span className="t-meta">6 members · Q3 release</span>
        </div>
        <Icon kind="gear" size={16} style={{ color: "var(--ink-2)" }} />
      </div>
      <div className="col" style={{ flex: 1, overflowY: "auto", padding: "8px 14px" }}>
        <span className="t-meta" style={{ textAlign: "center", padding: "6px 0" }}>— Today, May 14 —</span>
        <ChatMessage ini="MO" name="Maya" time="9:14" body="just pushed v3 of the topline. let me know if the bridge lands." />
        <ChatMessage ini="MO" name="Maya" time="9:14" audio={{ title: "topline_v3.wav", meta: "1:42" }} />
        <ChatMessage self ini="YT" name="You" time="9:21" body="this is the move. one note — hold the last word a beat longer?" />
        <ChatMessage ini="TB" name="Theo" time="9:48" file={{ name: "drum-bus_v2.zip", size: "84 MB" }} />
      </div>
      <div className="row" style={{ padding: "10px 14px", borderTop: "1px solid var(--line)", gap: 8, background: "var(--surface-2)" }}>
        <Icon kind="paperclip" size={14} style={{ color: "var(--ink-3)" }} />
        <Icon kind="mic" size={14} style={{ color: "var(--ink-3)" }} />
        <span className="t-meta" style={{ flex: 1, padding: "4px 10px", background: "var(--surface)", borderRadius: 999, border: "1px solid var(--line)" }}>Reply to the room…</span>
      </div>
    </div>
  </Phone>
);

// ════════════════════════════════════════════════════════════════
// 9. DIRECT MESSAGES
// ════════════════════════════════════════════════════════════════

const ConvoItem = ({ ini, name, time, last, unread, active }) => (
  <div className="row" style={{ gap: 10, padding: "10px 14px", background: active ? "var(--surface-2)" : "transparent", borderLeft: "3px solid " + (active ? "var(--ink)" : "transparent"), alignItems: "flex-start" }}>
    <Avatar initials={ini} />
    <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
      <div className="between">
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13 }}>{name}</span>
        <span className="t-meta">{time}</span>
      </div>
      <span style={{ fontSize: 12, color: unread ? "var(--ink)" : "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{last}</span>
    </div>
    {unread && <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--accent)", marginTop: 6 }} />}
  </div>
);

const DMDesktop = () => (
  <Browser url="seshn.fm/dm/nia.kassim">
    <div className="col" style={{ height: "100%" }}>
      <FeedTopbar />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", flex: 1, overflow: "hidden" }}>
        {/* Conversation list */}
        <div className="col" style={{ borderRight: "1px solid var(--line)" }}>
          <div className="col" style={{ padding: "16px 18px", gap: 10, borderBottom: "1px solid var(--line)" }}>
            <div className="between">
              <span className="t-h2" style={{ fontSize: 18 }}>Inbox</span>
              <span className="t-meta">3 unread</span>
            </div>
            <div className="row" style={{ padding: "8px 12px", background: "var(--surface-2)", borderRadius: 999, gap: 8 }}>
              <Icon kind="search" size={13} style={{ color: "var(--ink-3)" }} />
              <span className="t-meta">Search messages</span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <Pill variant="solid">All</Pill>
              <Pill>Unread</Pill>
              <Pill>Requests · 4</Pill>
            </div>
          </div>
          <div className="col" style={{ overflowY: "auto", flex: 1 }}>
            <ConvoItem ini="NK" name="Nia Kassim" time="9:33" last="will track that today. I'll have a stem up by EOD." active />
            <ConvoItem ini="TB" name="Theo Brooks" time="9:48" last="84 MB · drum-bus_v2_groove-shift" unread />
            <ConvoItem ini="SP" name="Sam Park" time="Mon" last="sounds good — sending the rough mix tonight" unread />
            <ConvoItem ini="LV" name="Lina Vega" time="Mon" last="Voice note · 0:42" unread />
            <ConvoItem ini="IR" name="Iván Reyes" time="Sun" last="thanks for the intro, will reach out!" />
            <ConvoItem ini="AL" name="Amaya L." time="May 10" last="up for a co-write tomorrow?" />
            <ConvoItem ini="RK" name="Robi K." time="May 8" last="here's the demo, let me know what you think →" />
          </div>
        </div>
        {/* Active conversation */}
        <div className="col">
          <div className="between" style={{ padding: "14px 24px", borderBottom: "1px solid var(--line)" }}>
            <div className="row" style={{ gap: 10 }}>
              <Avatar size="md" initials="NK" />
              <div className="col" style={{ gap: 1 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>Nia Kassim</span>
                  <Pill variant="solid" style={{ fontSize: 9 }}>✓ Pro</Pill>
                </div>
                <span className="t-meta">Vocalist · London · Active now</span>
              </div>
            </div>
            <div className="row" style={{ gap: 14 }}>
              <Btn size="sm">Invite to project</Btn>
              <Icon kind="bell" size={16} style={{ color: "var(--ink-3)" }} />
              <Icon kind="gear" size={16} style={{ color: "var(--ink-3)" }} />
            </div>
          </div>
          <div className="col" style={{ flex: 1, overflowY: "auto", padding: "12px 24px" }}>
            <div className="row" style={{ gap: 10, padding: "8px 0", justifyContent: "center" }}>
              <span className="t-meta">May 13</span>
            </div>
            <ChatMessage ini="NK" name="Nia" time="2:14p" body="hi! saw your post for the Afrobeats topline — really like Sunday Drives. I have a demo I think fits the vibe." />
            <ChatMessage ini="NK" name="Nia" time="2:14p" audio={{ title: "demo_nia_v1.mp3", meta: "Nia K. · 1:02" }} />
            <ChatMessage self ini="YT" name="You" time="2:31p" body="oh this is great — voice is perfect for it. want to jump on a quick call this week?" />
            <ChatMessage ini="NK" name="Nia" time="9:33" body="will track that today. I'll have a stem up by EOD." />
          </div>
          <div style={{ padding: "12px 24px", borderTop: "1px solid var(--line)" }}>
            <div className="row" style={{ gap: 8, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface-2)" }}>
              <Icon kind="paperclip" size={14} style={{ color: "var(--ink-3)" }} />
              <Icon kind="mic" size={14} style={{ color: "var(--ink-3)" }} />
              <span className="t-meta" style={{ flex: 1 }}>Message Nia…</span>
              <Btn size="sm" variant="primary">Send</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Browser>
);

const DMMobile = () => (
  <Phone tabbar={<MobileTabBar active="msg" />}>
    <div className="col" style={{ height: "100%" }}>
      <div className="col" style={{ padding: "10px 16px 8px", borderBottom: "1px solid var(--line-soft)" }}>
        <div className="between">
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18 }}>Inbox</span>
          <Icon kind="search" size={16} style={{ color: "var(--ink-2)" }} />
        </div>
        <div className="row" style={{ gap: 6, marginTop: 10 }}>
          <Pill variant="solid">All</Pill>
          <Pill>Unread · 3</Pill>
          <Pill>Requests · 4</Pill>
        </div>
      </div>
      <div className="col" style={{ overflowY: "auto", flex: 1 }}>
        <ConvoItem ini="NK" name="Nia Kassim" time="9:33" last="will track that today. stem up EOD." unread />
        <ConvoItem ini="TB" name="Theo Brooks" time="9:48" last="84 MB · drum-bus_v2" unread />
        <ConvoItem ini="SP" name="Sam Park" time="Mon" last="sending rough mix tonight" unread />
        <ConvoItem ini="LV" name="Lina Vega" time="Mon" last="Voice note · 0:42" />
        <ConvoItem ini="IR" name="Iván Reyes" time="Sun" last="thanks for the intro!" />
        <ConvoItem ini="AL" name="Amaya L." time="May 10" last="up for a co-write?" />
      </div>
    </div>
  </Phone>
);

// ════════════════════════════════════════════════════════════════
// 10. PRO UPGRADE
// ════════════════════════════════════════════════════════════════

const ProDesktop = () => (
  <Browser url="seshn.fm/pro">
    <div className="col" style={{ height: "100%", overflowY: "auto" }}>
      <div className="between" style={{ padding: "14px 32px", borderBottom: "1px solid var(--line)" }}>
        <Logo />
        <span className="t-meta">← Back to feed</span>
      </div>
      <div className="col" style={{ padding: "36px 80px", alignItems: "center", gap: 28, position: "relative" }}>
        <div style={{ position: "absolute", top: 60, left: 80, transform: "rotate(-6deg)", opacity: 0.85 }}>
          <AlbumArt seed="pro-deco-1" size={80} radius={6} />
        </div>
        <div style={{ position: "absolute", top: 110, right: 100, transform: "rotate(8deg)", opacity: 0.85 }}>
          <AlbumArt seed="pro-deco-2" size={68} radius={6} />
        </div>
        <Pill variant="accent">✴ Seshn Pro</Pill>
        <div className="t-h1" style={{ fontSize: 56, textAlign: "center", maxWidth: 720, lineHeight: 1.0, letterSpacing: "-0.03em" }}>
          Move first,<br />get <Highlight>heard</Highlight> first.
        </div>
        <span className="t-muted" style={{ fontSize: 14, maxWidth: 480, textAlign: "center" }}>
          Pro gives you the tools serious artists use to find collaborators faster — and look like one.
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, width: "100%", maxWidth: 880 }}>
          {/* Free */}
          <div className="card" style={{ padding: 28 }}>
            <div className="t-eyebrow">Free</div>
            <div className="t-h1" style={{ fontSize: 28, margin: "10px 0 4px" }}>$0</div>
            <span className="t-muted" style={{ fontSize: 12 }}>Everything to start.</span>
            <div style={{ height: 18 }} />
            <div className="col" style={{ gap: 10, fontSize: 13 }}>
              {[
                "Unlimited gig posts",
                "Apply to any post",
                "Up to 3 portfolio embeds",
                "Reply to messages you receive",
                "Basic search & filters",
              ].map(t => (
                <div key={t} className="row" style={{ gap: 10 }}>
                  <Icon kind="check" size={13} style={{ color: "var(--ink-2)" }} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ height: 22 }} />
            <Btn block>You're on Free</Btn>
          </div>
          {/* Pro */}
          <div className="card" style={{ padding: 28, background: "var(--ink-black)", color: "var(--frame)", borderColor: "transparent", position: "relative", overflow: "hidden" }}>
            <Grain opacity={0.18} />
            <div style={{ position: "absolute", top: -28, right: -28, opacity: 0.35 }}>
              <Vinyl size={150} color="rgba(255,255,255,0.06)" label="var(--accent)" style={{ animation: "seshn-spin 14s linear infinite" }} />
            </div>
            <div style={{ position: "relative" }}>
              <div className="between">
                <span className="t-eyebrow" style={{ color: "var(--accent)" }}>Pro</span>
                <Pill variant="solid" style={{ fontSize: 9 }}>Most popular</Pill>
              </div>
              <div className="row" style={{ gap: 6, alignItems: "baseline", marginTop: 10 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 600, color: "var(--frame)", letterSpacing: "-0.03em" }}>$5</span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>/ month</span>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>or $48/year — save 20%</span>
              <div style={{ height: 18 }} />
              <div className="col" style={{ gap: 10, fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                {[
                  "Verified ✓ badge",
                  "Message anyone first",
                  "Profile view analytics",
                  "Unlimited portfolio slots",
                  "Priority in search results",
                  "Boost credits — 1 / month",
                ].map(t => (
                  <div key={t} className="row" style={{ gap: 10 }}>
                    <Icon kind="check" size={13} style={{ color: "var(--accent)" }} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <div style={{ height: 22 }} />
              <Btn variant="primary" size="lg" block>Upgrade to Pro →</Btn>
              <span style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
                Cancel anytime · Powered by Stripe
              </span>
            </div>
          </div>
        </div>
        {/* Testimonials / FAQ snippet */}
        <div style={{ width: "100%", maxWidth: 880, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              ["3.2×", "more applications on boosted posts"],
              ["~4h", "average response time for Pro users"],
              ["94%", "of Pro users say they'd recommend it"],
            ].map(([n, s]) => (
              <div key={n} className="col" style={{ gap: 4 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>{n}</span>
                <span className="t-muted" style={{ fontSize: 12 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </Browser>
);

const ProMobile = () => (
  <Phone>
    <div className="col" style={{ height: "100%", overflowY: "auto" }}>
      <div className="between" style={{ padding: "10px 16px" }}>
        <Icon kind="chevron" size={16} style={{ color: "var(--ink-2)", transform: "rotate(180deg)" }} />
        <Logo size={16} />
        <div style={{ width: 16 }} />
      </div>
      <div className="col" style={{ padding: "12px 20px 0", alignItems: "center", gap: 12, textAlign: "center" }}>
        <Pill variant="accent">✶ Seshn Pro</Pill>
        <div className="t-h1" style={{ fontSize: 28, lineHeight: 1.05 }}>Move first,<br />get heard first.</div>
        <span className="t-muted" style={{ fontSize: 12 }}>Tools serious artists use to find collaborators faster.</span>
      </div>
      <div className="col" style={{ padding: "20px 16px", gap: 12 }}>
        <div className="card" style={{ padding: 18, background: "var(--ink-black)", color: "var(--frame)", borderColor: "transparent" }}>
          <div className="between">
            <span className="t-eyebrow" style={{ color: "var(--accent)" }}>Pro</span>
            <Pill variant="solid" style={{ fontSize: 9 }}>Popular</Pill>
          </div>
          <div className="row" style={{ gap: 4, alignItems: "baseline", marginTop: 8 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: "var(--frame)" }}>$5</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>/ mo</span>
          </div>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>or $48/yr — save 20%</span>
          <div style={{ height: 14 }} />
          <div className="col" style={{ gap: 8, fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
            {["Verified ✓ badge", "Message anyone first", "View analytics", "Unlimited portfolio", "Priority in search", "1 boost credit/mo"].map(t => (
              <div key={t} className="row" style={{ gap: 8 }}><Icon kind="check" size={12} style={{ color: "var(--accent)" }} /> {t}</div>
            ))}
          </div>
          <div style={{ height: 14 }} />
          <Btn variant="primary" size="lg" block>Upgrade to Pro</Btn>
          <span style={{ display: "block", textAlign: "center", marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.55)" }}>
            Cancel anytime · Stripe
          </span>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>Free · current</div>
          <div className="col" style={{ gap: 6, fontSize: 12, color: "var(--ink-2)" }}>
            <div className="row" style={{ gap: 8 }}><Icon kind="check" size={12} style={{ color: "var(--ink-3)" }} /> Unlimited posts</div>
            <div className="row" style={{ gap: 8 }}><Icon kind="check" size={12} style={{ color: "var(--ink-3)" }} /> Reply to messages received</div>
            <div className="row" style={{ gap: 8 }}><Icon kind="check" size={12} style={{ color: "var(--ink-3)" }} /> 3 portfolio embeds</div>
          </div>
        </div>
      </div>
    </div>
  </Phone>
);

window.SeshnScreens2 = {
  CreateDesktop, CreateMobile, CreateReviewDesktop,
  BrowseDesktop, BrowseMobile,
  ProjectDesktop, ProjectMobile,
  DMDesktop, DMMobile,
  ProDesktop, ProMobile,
};
Object.assign(window, window.SeshnScreens2);
