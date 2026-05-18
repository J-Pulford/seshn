// Seshn — wireframe atoms

const Logo = ({ size = 18 }) => (
  <span className="logo" style={{ fontSize: size }}>Seshn</span>
);

const Pill = ({ children, variant = "neutral", style }) => (
  <span className={`pill ${variant}`} style={style}>{children}</span>
);

const Avatar = ({ size = "md", role, initials, style }) => {
  const cls = size === "sm" ? "avatar sm" : size === "lg" ? "avatar lg" : size === "xl" ? "avatar xl" : "avatar";
  return (
    <span className={cls} style={style}>
      {initials || ""}
      {role && <span className="role-dot">{role}</span>}
    </span>
  );
};

const Btn = ({ children, variant = "default", size, block, style }) => {
  const cls = ["btn", variant !== "default" ? variant : "", size === "lg" ? "lg" : size === "sm" ? "sm" : "", block ? "block" : ""].filter(Boolean).join(" ");
  return <button className={cls} style={style}>{children}</button>;
};

const Input = ({ placeholder, size, style, value }) => (
  <input className={`input ${size === "lg" ? "lg" : ""}`} placeholder={placeholder} defaultValue={value} style={style} />
);

const PH = ({ w, h, label, img, soft, radius, style }) => (
  <div
    className={`ph ${img ? "ph-img" : ""} ${soft ? "ph-block soft" : ""}`}
    style={{ width: w, height: h, borderRadius: radius, ...style }}
  >
    {img ? <span>{label || "image"}</span> : (label || null)}
  </div>
);

const Line = ({ w = "100%", size = "md", style }) => {
  const cls = size === "sm" ? "ph-line sm" : size === "lg" ? "ph-line lg" : "ph-line";
  return <div className={cls} style={{ width: w, ...style }} />;
};

const Lines = ({ count = 3, last = "60%", style }) => (
  <div className="col" style={{ gap: 6, ...style }}>
    {Array.from({ length: count }).map((_, i) => (
      <Line key={i} w={i === count - 1 ? last : "100%"} />
    ))}
  </div>
);

const Audio = ({ compact, title = "Track title", artist = "Artist · 3:24", source = "SoundCloud", seed, art = true, progress = 0.32, playing }) => {
  const AA = window.AlbumArt;
  const WF = window.Waveform;
  const artSize = compact ? 28 : 42;
  return (
    <div className={`audio ${compact ? "compact" : ""}`}>
      {art && AA && <AA seed={seed || title} size={artSize} radius={compact ? 4 : 6} />}
      <span className={`play ${playing ? "playing" : ""}`} />
      <div className="col" style={{ flex: 1, gap: compact ? 2 : 4, minWidth: 0 }}>
        <div className="meta" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</b>
          <span style={{ flexShrink: 0, marginLeft: 8, fontSize: compact ? 9.5 : 10.5 }}>{source}</span>
        </div>
        {WF ? <WF seed={seed || title} height={compact ? 14 : 22} progress={progress} compact={compact} /> : <div className="wave" />}
        <div className="meta">
          <span>{artist}</span>
        </div>
      </div>
    </div>
  );
};

const Icon = ({ size = 16, kind, style }) => {
  // Simple monochrome line glyphs, drawn with CSS
  const s = { width: size, height: size, display: "inline-block", flex: "0 0 auto", ...style };
  const base = {
    width: size, height: size,
    background: "currentColor",
    WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
    WebkitMaskPosition: "center", maskPosition: "center",
    WebkitMaskSize: "contain", maskSize: "contain",
  };
  const svgs = {
    search:    `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><circle cx='11' cy='11' r='7'/><path d='m20 20-3.5-3.5'/></svg>`,
    bell:      `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'/><path d='M10 21a2 2 0 0 0 4 0'/></svg>`,
    plus:      `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='M12 5v14M5 12h14'/></svg>`,
    message:   `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='M21 12a8 8 0 0 1-12 7l-5 1 1-5a8 8 0 1 1 16-3z'/></svg>`,
    filter:    `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='M3 5h18M6 12h12M10 19h4'/></svg>`,
    check:     `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5'><path d='M5 12l5 5L20 7'/></svg>`,
    chevron:   `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='m9 6 6 6-6 6'/></svg>`,
    pin:       `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='M12 22s-7-7.5-7-13a7 7 0 1 1 14 0c0 5.5-7 13-7 13z'/><circle cx='12' cy='9' r='2.5'/></svg>`,
    star:      `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='m12 3 2.7 6 6.3.5-4.8 4.2L17.6 20 12 16.7 6.4 20l1.5-6.3L3 9.5 9.3 9z'/></svg>`,
    paperclip: `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='m21 12-8.5 8.5a5 5 0 1 1-7-7L14 5a3 3 0 1 1 4 4l-9 9a1 1 0 1 1-1.5-1.5L15 8'/></svg>`,
    sliders:   `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='M4 6h16M4 12h16M4 18h16'/><circle cx='9' cy='6' r='2'/><circle cx='15' cy='12' r='2'/><circle cx='8' cy='18' r='2'/></svg>`,
    grid:      `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><rect x='3' y='3' width='7' height='7'/><rect x='14' y='3' width='7' height='7'/><rect x='3' y='14' width='7' height='7'/><rect x='14' y='14' width='7' height='7'/></svg>`,
    list:      `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'/></svg>`,
    home:      `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='M3 11 12 3l9 8'/><path d='M5 10v10h14V10'/></svg>`,
    compass:   `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><circle cx='12' cy='12' r='9'/><path d='m9 15 2-5 5-2-2 5z'/></svg>`,
    folder:    `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='M3 6h7l2 2h9v11H3z'/></svg>`,
    user:      `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><circle cx='12' cy='8' r='4'/><path d='M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6'/></svg>`,
    google:    `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9c2.5 0 4.5 1 6 2.5'/><path d='M21 12h-9'/></svg>`,
    apple:     `<svg viewBox='0 0 24 24' fill='black'><path d='M16 3c0 2-1.5 4-3.5 4 0-2 2-4 3.5-4z'/><path d='M19 17c-.8 2-1.7 4-3.3 4-1.4 0-1.8-.8-3.4-.8s-2.1.8-3.4.8c-1.7 0-2.9-2.3-3.7-4.5C3.5 12.7 5 8 8 8c1.4 0 2.3.8 3.5.8 1.1 0 1.9-.9 3.5-.9 1.4 0 2.7.8 3.5 2-3 1.7-2.5 5.7.5 7.1z'/></svg>`,
    spark:     `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><path d='M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M18.4 5.6l-4.2 4.2M9.8 14.2l-4.2 4.2'/></svg>`,
    mic:       `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><rect x='9' y='3' width='6' height='12' rx='3'/><path d='M5 11a7 7 0 0 0 14 0M12 18v3'/></svg>`,
    gear:      `<svg viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'><circle cx='12' cy='12' r='3'/><path d='M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2'/></svg>`,
  };
  const data = svgs[kind] || svgs.spark;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(data)}")`;
  return <span style={{ ...base, ...style, WebkitMaskImage: url, maskImage: url }} />;
};

// ——— Gig card (3 contexts: feed | compact | mini) ———
const GigCard = ({ context = "feed", boost, art, role = "Vocalist", title = "Need a topline writer for an Afrobeats demo", desc, tags = ["Afrobeats", "R&B"], comp = "Paid · $200", time = "2h", name = "Maya O.", initials = "MO", roleTag = "PROD" }) => {
  const AA = window.AlbumArt;
  if (context === "mini") {
    return (
      <div className="gig" style={{ padding: 12, gap: 8, borderRadius: 12 }}>
        <div className="row" style={{ gap: 8 }}>
          <Avatar size="sm" initials={initials} />
          <span className="t-meta">{name} · {time}</span>
        </div>
        <div className="gig-title" style={{ fontSize: 13 }}>{title}</div>
        <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
          <Pill variant="accent">{role}</Pill>
          {tags.slice(0, 1).map(t => <Pill key={t}>{t}</Pill>)}
        </div>
      </div>
    );
  }
  return (
    <div className={`gig ${boost ? "boost" : ""}`}>
      <div className="gig-head">
        <Avatar size="md" initials={initials} role={roleTag} />
        <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ fontWeight: 600, fontFamily: "var(--font-display)" }}>{name}</span>
            <span className="dot" />
            <span className="t-meta">{time} ago</span>
            {boost && <Pill variant="solid" style={{ marginLeft: "auto", fontSize: 9 }}>★ Boosted</Pill>}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <Pill variant="accent">{role} needed</Pill>
            <span className="t-meta">· {comp}</span>
          </div>
        </div>
        {art && AA && <AA seed={art === true ? title : art} size={48} radius={6} />}
      </div>
      <div className="gig-title">{title}</div>
      {desc !== false && (
        <div className="col" style={{ gap: 4 }}>
          <Line />
          <Line w="84%" />
        </div>
      )}
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {tags.map(t => <Pill key={t}>{t}</Pill>)}
      </div>
      <div className="gig-foot">
        <span className="t-meta">12 applied · 3 days left</span>
        <div className="row" style={{ gap: 8 }}>
          <Btn size="sm">View</Btn>
          <Btn size="sm" variant="primary">Apply</Btn>
        </div>
      </div>
    </div>
  );
};

// ——— Browser frame ———
const Browser = ({ url = "seshn.fm/feed", children, dark }) => (
  <div className={`wf ${dark ? "dark" : ""}`}>
    <div className="chrome">
      <div className="dots"><span /><span /><span /></div>
      <div className="url">{url}</div>
      <div style={{ width: 40 }} />
    </div>
    <div style={{ position: "absolute", inset: "38px 0 0 0", overflow: "hidden" }}>
      {children}
    </div>
  </div>
);

// ——— Phone frame ———
const Phone = ({ time = "9:41", children, dark, tabbar }) => (
  <div className={`wf wf-mobile ${dark ? "dark" : ""}`}>
    <div className="phone-bar">
      <span>{time}</span>
      <div className="right">
        <span className="signal" style={{ width: 14, height: 9 }} />
        <span style={{ width: 14, height: 9, background: "transparent", border: "1px solid currentColor", borderRadius: 2 }} />
        <span className="battery" />
      </div>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 28, bottom: tabbar ? 64 : 0, overflow: "hidden" }}>
      {children}
    </div>
    {tabbar && tabbar}
  </div>
);

const MobileTabBar = ({ active = "home" }) => (
  <div className="tabbar">
    <div className={`t ${active === "home" ? "active" : ""}`}><span className="ic" />Feed</div>
    <div className={`t ${active === "browse" ? "active" : ""}`}><span className="ic" />Browse</div>
    <div className="t post"><span className="ic" /></div>
    <div className={`t ${active === "msg" ? "active" : ""}`}><span className="ic" />Inbox</div>
    <div className={`t ${active === "me" ? "active" : ""}`}><span className="ic" />You</div>
  </div>
);

window.SeshnAtoms = { Logo, Pill, Avatar, Btn, Input, PH, Line, Lines, Audio, Icon, GigCard, Browser, Phone, MobileTabBar };
Object.assign(window, window.SeshnAtoms);

// ——— Star rating (read + interactive variants) ———
const StarRow = ({ value = 0, size = 13, color = "var(--ink)" }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const fill = Math.min(1, Math.max(0, value - (i - 1)));
    stars.push(
      <span key={i} style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
        <svg viewBox="0 0 24 24" width={size} height={size} style={{ position: "absolute", inset: 0 }}>
          <path d="M12 3l2.7 6 6.3.6-4.8 4.2L17.6 20 12 16.7 6.4 20l1.5-6.2L3 9.6 9.3 9z" fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
        <span style={{ position: "absolute", inset: 0, overflow: "hidden", width: `${fill * 100}%` }}>
          <svg viewBox="0 0 24 24" width={size} height={size}>
            <path d="M12 3l2.7 6 6.3.6-4.8 4.2L17.6 20 12 16.7 6.4 20l1.5-6.2L3 9.6 9.3 9z" fill={color} />
          </svg>
        </span>
      </span>
    );
  }
  return <span style={{ display: "inline-flex", gap: 2 }}>{stars}</span>;
};

const Rating = ({ value, count, size = 13, compact, color }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    <StarRow value={value} size={size} color={color} />
    <b style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: size, color: color || "var(--ink)" }}>{value.toFixed(1)}</b>
    {!compact && count != null && <span style={{ fontSize: size - 2, color: "var(--ink-3)" }}>· {count} reviews</span>}
  </span>
);

// ——— Testimonial card ———
const Testimonial = ({ name, ini, role, rating, quote, project, date, mobile }) => (
  <div className="card" style={{ padding: mobile ? 16 : 20, display: "flex", flexDirection: "column", gap: 10, background: "var(--surface)", borderRadius: 12 }}>
    <div className="row" style={{ gap: 10 }}>
      <Avatar size="sm" initials={ini} />
      <div className="col" style={{ gap: 1, flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 6 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: mobile ? 12.5 : 13 }}>{name}</span>
          <span className="t-meta">· {role}</span>
        </div>
        <StarRow value={rating} size={11} />
      </div>
      <span className="t-meta" style={{ fontSize: 10.5 }}>{date}</span>
    </div>
    <div style={{ fontSize: mobile ? 12.5 : 13.5, lineHeight: 1.55, color: "var(--ink-2)" }}>
      <span style={{ color: "var(--accent-d)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, marginRight: 4 }}>“</span>
      {quote}
    </div>
    {project && (
      <div className="row" style={{ gap: 6, paddingTop: 8, borderTop: "1px solid var(--line-soft)" }}>
        <Pill style={{ fontSize: 10 }}>Project · {project}</Pill>
      </div>
    )}
  </div>
);

Object.assign(window, { StarRow, Rating, Testimonial });
