// Seshn marketing site content — typed port of the handoff's shared-content.js
// (the single source of all copy). Pages render from this. Treat as the schema.

export interface Pillar { n: string; h: string; b: string }
export interface Stat { big: string; h: string; p: string; src: string }
export interface HowStep { n: string; h: string; p: string; points: string[] }
export interface Feature { n: string; h: string; p: string }
export interface RoadmapItem { title: string; desc: string; state?: "shipped" | "in-progress" | "design" | "exploring" }
export interface RoadmapQuarter { q: string; status: string; tone: "live" | "next" | "later" | "vision"; h: string; tagline: string; items: RoadmapItem[] }
export interface Testimonial { name: string; ini: string; role: string; rating: number; project: string; date: string; quote: string }
export interface Suggestion { upvotes: number; body: string; tag: string }
export interface FeatureDeep { n: string; h: string; lead: string; body: string; points: string[]; solves: string }
export interface ProblemDeep { stat: string; label: string; h: string; body: string; src: string }
export interface FeeRow { path: string; cut: string; keep: string; note: string; highlight?: boolean }

export const SESHN = {
  mission: {
    eyebrow: "Our mission",
    headline: "The hardest part of making music isn't writing it — it's finding the people to make it with.",
    statement:
      "Seshn exists for the 7.94 million artists who got left behind by streaming algorithms, label gatekeepers, and the chaos of Instagram DMs. We're building the home base for the working musician — the producer with a half-finished beat, the vocalist between projects, the drummer who can play the date in June. A platform where the work is the work, ratings are real, money flows, and collaboration is the default — not the exception.",
    pillars: [
      { n: "01", h: "Trust > Followers.", b: "Every rating comes from a real session. Every profile is vetted. No fake DMs from bot accounts. The bigger your follower count, the less it matters here." },
      { n: "02", h: "The work speaks first.", b: "Profiles lead with audio, not bios. Briefs lead with the role, not the brand. We hide follower counts on purpose so what you make is what you're judged on." },
      { n: "03", h: "Artists keep what artists make.", b: "Stripe-powered payouts with one flat, visible fee: 10% on paid bookings — and that 10% covers Stripe's processing fees, so the rate you're quoted is the rate you keep 90% of. No manager, label, or agent taking a cut on top. Split and trade collabs are free, and Pro is $5/mo flat — never a slice of your fee." },
      { n: "04", h: "Built by musicians, in public.", b: "Every feature ships because someone on the team needed it on a Tuesday at 11pm. The roadmap is public. The suggestions box is open. You shape this." },
    ] as Pillar[],
    why_now: {
      h: "Why now",
      paragraphs: [
        "Independent artists now generate over half of all global music streams. The gatekeepers are gone — but so is the support system that came with them. The average musician has more reach than ever and less infrastructure than ever.",
        "Meanwhile, 64% of artists cite financial pressure as the #1 reason they leave music — up from #4 just two years ago. Streaming pays a fraction of a cent per play. Followers don't pay rent. The way through is not solo virality; it's collaboration, paid work, and a smaller circle of trusted people.",
        "Seshn is the home base for that smaller circle. The platform we wish existed when we started.",
      ],
    },
    pledge: {
      h: "Our pledge to you",
      points: [
        "Never sell your data, never train AI on your unreleased work.",
        "Keep our cut flat and visible — 10% on paid bookings, Stripe processing fees included, and nothing else stacked on top. Pro is always a flat fee, never a slice of what you earn.",
        "Public roadmap. Public changelog. If we kill a feature you love, you'll know why first.",
        "Free tier is permanent. Not a trial. Not a teaser.",
      ],
    },
  },

  stats: [
    { big: "78%", h: "of indie musicians struggle to find reliable collaborators.", p: "Ghosting. Half-finished demos. Producers who never reply. Vetting is the #1 unsolved problem in independent music.", src: "CoCreatea Indie Survey · 2025" },
    { big: "100K+", h: "songs uploaded to streaming every day.", p: "~35 per minute. Posting alone is no longer a discovery strategy. Being heard means being connected.", src: "Luminate Year-End Report · 2025" },
    { big: "77.8%", h: "earn under $15K/yr from music.", p: "64.4% cite financial pressure as the #1 reason they leave music — up from 39% in 2023.", src: "Xposure Music · State of the Industry 2025" },
    { big: "50%+", h: "of all global streams are now independent artists.", p: "57,000 musicians take 90% of streams. 7.94 million share the rest. The economics of solo virality are broken — but the door is wide open for the collaborators who organize.", src: "YouGov / IJFMR · 2025" },
  ] as Stat[],

  how: [
    { n: "01", h: "Post what you actually need.", p: "Role, genre, comp, deadline. 90 seconds. Skip the bio — your work speaks first.", points: ["One template, no resume, no follower counts", "Set paid, split, trade, or fair-deal upfront", "Boost to land at the top of every matched feed"] },
    { n: "02", h: "Find your collaborators.", p: "Filter by role, genre, comp, location. Hear the work before you read the bio. Verified ratings — no anonymous reviews.", points: ["Audio-first search — hear before you read", "Verified ratings from real sessions", "Reach out free; Pro lets you DM anyone first"] },
    { n: "03", h: "Ship the record.", p: "Project rooms with chat, audio files, stems, deadlines, voice notes — out of group DMs and onto one workspace.", points: ["Inline audio previews + waveform playback", "Members, roles, deadlines, brief — synced", "Ratings + testimonials on delivery"] },
  ] as HowStep[],

  features: [
    { n: "F.01", h: "Audio-first profiles", p: "Every profile is a portfolio you can listen to. SoundCloud, Spotify, YouTube — one unified player." },
    { n: "F.02", h: "Tag-based discovery", p: "Filter by role, genre, comp, location. Pure signal — no follower-count theatre." },
    { n: "F.03", h: "Project rooms", p: "Chat, stems, voice notes, deadlines, voice notes — without piling up in group DMs." },
    { n: "F.04", h: "Verified ratings", p: "Real reviews from people you actually worked with. No bot stars. No paid placements." },
    { n: "F.05", h: "Stripe payouts", p: "Set rate, split, or trade. One flat 10% on paid bookings — Stripe fees included; split and trade are free. Escrow ships Q3." },
    { n: "F.06", h: "Boost mode", p: "$5 puts your post at the top of every matched feed for 7 days." },
  ] as Feature[],

  roadmap: [
    { q: "Q3 · 2026", status: "shipping now", tone: "live", h: "The Foundation", tagline: "Make the core work undeniably good.", items: [
      { title: "Verified Profiles", desc: "Lightweight ID + work verification. Verified ✓ badge for Pro members.", state: "shipped" },
      { title: "Stripe Escrow", desc: "Funds held by Seshn, released on delivery. Both parties protected.", state: "in-progress" },
      { title: "Audio Studio v2", desc: "Inline waveform comments. Drop a note at 1:42. Reply chain stays with the timecode.", state: "in-progress" },
      { title: "Mobile app — public beta", desc: "iOS + Android. Push notifications for new matches, replies, and stems.", state: "in-progress" },
      { title: "Refer-a-collaborator credits", desc: "Bring in someone you've worked with — both get a month of Pro on us.", state: "shipped" },
    ] },
    { q: "Q4 · 2026", status: "in design", tone: "next", h: "The Tools", tagline: "Replace the spreadsheet, the Google Doc, the group chat.", items: [
      { title: "Splits & Royalty Sheets", desc: "Auto-generated splits from project room participation. Sign + send to PROs.", state: "design" },
      { title: "Session Calendar", desc: "Sync project deadlines to your Google / Apple calendar. Conflict detection between collaborators.", state: "design" },
      { title: "Stem Library", desc: "Reusable stems you license to other Seshn members on your own terms.", state: "design" },
      { title: "AI Brief Coach (opt-in)", desc: "Suggests missing details on your brief before you publish. Never writes the brief itself.", state: "design" },
    ] },
    { q: "Q1 · 2027", status: "exploring", tone: "later", h: "The Network", tagline: "Make the platform pull its own weight.", items: [
      { title: "Sync Licensing Marketplace", desc: "Music supervisors browse Seshn members directly. You set rates, retain rights.", state: "exploring" },
      { title: "Live Session Booking", desc: "Find + book a session musician for a specific date, in a specific city.", state: "exploring" },
      { title: "Seshn for Studios", desc: "Studios list rooms, post engineer needs, sell remote sessions. Free for venues under 5 rooms.", state: "exploring" },
      { title: "Community Channels", desc: "Genre + city channels. Closed, moderated. Like a Discord, without the discovery problem.", state: "exploring" },
    ] },
    { q: "Q2 · 2027", status: "north star", tone: "vision", h: "The Industry", tagline: "Build the layer between the bedroom and the major label.", items: [
      { title: "Investor / A&R Portal", desc: "Verified A&Rs and indie investors browse Pro members. Always opt-in. Always transparent." },
      { title: "Crowdfunded Projects", desc: "Members pledge to a project room they want to hear. Funds the recording. Splits the upside." },
      { title: "Cross-platform Royalty Tracking", desc: "Pull stream counts + earnings from every DSP into one dashboard. Pay your collaborators automatically." },
      { title: "Education + Mentorship", desc: "Pros mentor emerging artists for a flat hourly. Verified, rated, paid through Seshn." },
    ] },
  ] as RoadmapQuarter[],

  testimonials: [
    { name: "Nia Kassim", ini: "NK", role: "Vocalist · London", rating: 5, project: "Sundowner EP", date: "May 2026", quote: "I found my whole band on Seshn in three weeks. Two of them ended up on the record. No platform has ever delivered work like this." },
    { name: "Iván Reyes", ini: "IR", role: "Producer · CDMX", rating: 5, project: "Hold The Line", date: "Apr 2026", quote: "Mixed four EPs in a month. The brief format means I don't read between the lines or waste a discovery call. The work is the work." },
    { name: "Maya Oduya", ini: "MO", role: "Producer · Brooklyn", rating: 5, project: "Coast (demo)", date: "Mar 2026", quote: "Built a Pro profile, posted one brief, woke up to nine applications. The verified rating system means I don't gamble on collaborators." },
    { name: "Theo Brooks", ini: "TB", role: "Drummer · NYC", rating: 5, project: "Live run · NYC", date: "May 2026", quote: "I'm a session player. Seshn replaced three group chats, a Google sheet, and the weekly back-and-forth on Instagram DMs. Booked solid through Q3." },
    { name: "Sam Park", ini: "SP", role: "Mix eng. · LA", rating: 5, project: "Morning Light", date: "Feb 2026", quote: "Stripe payouts. Inline audio. Clear briefs. The little things add up — I haven't sent an invoice manually since I joined." },
    { name: "Lina Vega", ini: "LV", role: "Producer · CDMX", rating: 5, project: "Sundowner EP", date: "Apr 2026", quote: "I'm based in CDMX and 60% of my work is now from NYC and London artists. Seshn made my city irrelevant to my career." },
    { name: "Amaya L.", ini: "AL", role: "Songwriter · NYC", rating: 5, project: "Coast (demo)", date: "May 2026", quote: "I was the vocalist who replied to a brief at 2am thinking nothing would happen. We were tracking by Thursday. The format actually works." },
    { name: "Robi K.", ini: "RK", role: "Drummer · Berlin", rating: 5, project: "Hold The Line", date: "Mar 2026", quote: "What sold me: the rating beside every name. I'd never agreed to a remote session before. Now half my income is remote sessions for artists I've never met." },
    { name: "Mo Daniels", ini: "MD", role: "Bassist · LA", rating: 5, project: "Morning Light", date: "Apr 2026", quote: "The platform stays out of the way. No newsfeed slop. No daily 'increase your engagement' prompts. Just briefs, profiles, and the project room." },
  ] as Testimonial[],

  suggestion_examples: [
    { upvotes: 287, body: "Allow setting visibility per-portfolio-track. I want collaborators to hear my B-sides but not the public.", tag: "Profile" },
    { upvotes: 241, body: "Add Discord-style availability statuses. 'Open to work / booked through August / archived'.", tag: "Profile" },
    { upvotes: 196, body: "iOS app push for voice-note replies in project rooms.", tag: "Mobile" },
    { upvotes: 154, body: "Calendar block for tracking sessions — so collaborators can see when I'm in the studio without DMing.", tag: "Project Rooms" },
    { upvotes: 132, body: "Anonymous job posts for major-label A&Rs who don't want to show their hand early.", tag: "Discovery" },
    { upvotes: 118, body: "Lo-fi WAV preview that hides the unmastered version from anyone without project room access.", tag: "Audio" },
    { upvotes: 94, body: "Rating dimension breakdowns — 'communication' / 'on-time delivery' / 'musical fit' instead of one star score.", tag: "Trust" },
    { upvotes: 82, body: "Export full project + splits sheet as a single PDF for PRO/SOCAN registration.", tag: "Payouts" },
  ] as Suggestion[],

  featuresDeep: [
    { n: "01", h: "Audio-first profiles", lead: "Your profile is a portfolio you can press play on — not a wall of text nobody reads.", body: "Most platforms make you sell yourself in a bio. Seshn leads with the music. A unified player wraps SoundCloud, Spotify, YouTube and direct uploads into one consistent embed, so a producer in Lagos and a vocalist in London hear the same thing the same way.", points: ["Unified player for SoundCloud / Spotify / YouTube / WAV", "Pin your three strongest tracks to the top", "Private B-sides only collaborators in a room can hear", "Auto-generated waveforms — no ugly third-party embeds"], solves: "Solves: “I have 9k monthly listeners but every collab request is someone who never even heard my music.”" },
    { n: "02", h: "Tag-based discovery", lead: "Find people by what they make and how they work — not by who has the most followers.", body: "Search is built around the brief, not the brand. Filter by role, genre, compensation type, location, availability and rating. Follower counts are deliberately hidden so a 200-follower engineer with a 4.9 rating outranks a 90k-follower account that ghosts.", points: ["Filter by role, genre, comp type, location, availability", "Follower counts hidden by design", "“Open to work” / “booked” / “archived” availability states", "Save searches; get notified when a new match joins"], solves: "Solves: “every discovery tool just shows me the biggest accounts, not the right ones.”" },
    { n: "03", h: "Project rooms", lead: "One workspace per record. Chat, stems, deadlines, versions — out of the group chat forever.", body: "When a collab kicks off, spin up a private room. Inline audio with waveform comments (drop a note at 1:42 and it stays anchored there), file versioning so you never lose the take you wanted, a synced deadline, and a member list with roles. When the project ships, ratings are issued automatically.", points: ["Inline audio + waveform-anchored comments", "File versioning — v1, v2, v3 never overwrite", "Shared deadline synced to everyone's calendar", "Auto-issued ratings + testimonials on delivery"], solves: "Solves: “the project lives across three group chats, a Drive folder, and someone's voice memos.”" },
    { n: "04", h: "Verified ratings & trust", lead: "Every rating comes from a real, completed session. No anonymous reviews, no bot stars.", body: "Trust is the whole game — 78% of indie musicians say finding reliable collaborators is their #1 problem. Seshn only lets you rate someone you actually shared a project room with, and breaks the score into communication, on-time delivery and musical fit so the number means something.", points: ["Ratings only from verified completed sessions", "Breakdown: communication / timeliness / musical fit", "Verified ✓ ID badge for Pro members", "Report + review moderation, real humans"], solves: "Solves: “I agreed to a remote session and they took my deposit and vanished.”" },
    { n: "05", h: "Get paid like a pro", lead: "Set your rate, split, or trade up front. Stripe-powered. One flat 10% on paid bookings — Stripe fees included; split and trade are free.", body: "Money is stated in the brief before anyone applies, so there's no awkward DM negotiation. The client pays the rate you agreed; you keep 90%. Get paid via Stripe, hold funds in escrow (released on delivery), and generate a splits sheet straight from project-room participation for your PRO / SOCAN registration. Our only cut is a flat 10% on a paid booking — and that covers the payment processing too, so there's no separate card fee and no team commission stacked on top.", points: ["Comp type stated up front: paid / split / trade", "Stripe payouts — flat 10% on paid bookings (fees included), nothing on split/trade", "Escrow: funds released on delivery (Q3)", "Auto-generated splits sheets for PRO registration"], solves: "Solves: “we never agreed on money up front and now the song is done and it's weird.”" },
    { n: "06", h: "Boost & reach", lead: "When a brief matters, put it in front of every matched artist for seven days.", body: "Most posts reach people organically. When you need to move fast — a deadline, a label deliverable — Boost pins your brief to the top of every matched feed and sends a push to the most relevant artists. Five dollars, one-time, or a free credit every month on Pro.", points: ["Top of every matched feed for 7 days", "Push notification to your strongest matches", "Boosted badge + ranking lift", "$5 one-time, or 1 free credit/month on Pro"], solves: "Solves: “I posted a paid gig and 4 people saw it because the feed buried it.”" },
  ] as FeatureDeep[],

  problemsDeep: [
    { stat: "78%", label: "can't find reliable collaborators", h: "Discovery is broken — and trust is worse.", body: "Finding someone is hard. Trusting them is harder. Reddit and Discord are full of “how do I find a vocalist who won't ghost me” threads with no good answer. There's no vetting, no track record, no recourse when someone disappears with your stems or your deposit.", src: "CoCreatea Indie Survey 2025" },
    { stat: "100K+", label: "songs uploaded to streaming / day", h: "Visibility is no longer a strategy.", body: "More than 100,000 tracks land on streaming every single day; 47.6% of all tracks last year got fewer than ten plays. The old playbook — 'just put it out and the algorithm will find you' — is dead. What still works is a great record made by the right people. That requires collaboration, not more uploads.", src: "Spotify Loud & Clear / Luminate 2025" },
    { stat: "64%", label: "say money is why they'd quit music", h: "The economics push artists out.", body: "77.8% of independent musicians earn under $15,000/year from music, and the share citing financial pressure as the #1 reason they'd leave jumped from 39% in 2023 to 64.4% in 2025. Solo artistry is expensive and slow. Pooling skills, splitting work, and getting paid for sessions is how working musicians actually survive.", src: "Xposure State of the Industry 2025" },
    { stat: "57K", label: "artists take 90% of all streams", h: "The middle class of music vanished.", body: "Independent artists now drive over half of global streams — yet just 57,000 musicians capture 90% of them, leaving 7.94 million to share the rest. The way back isn't going viral alone; it's building a network, a reputation, and a body of collaborative work that compounds.", src: "YouGov / IJFMR 2025" },
  ] as ProblemDeep[],

  feeComparison: {
    eyebrow: "What you actually keep",
    headline: "Make more of what you earn — without a whole team taking a cut.",
    sub: "The old way to build a music career meant handing slices to a manager, an agent, a lawyer, and a label before you saw a dollar. Seshn is one flat 10% — Stripe's processing fees included — so more of every booking stays with the artist who did the work.",
    basisLabel: "On every $1,000 you earn from a paid collaboration",
    rows: [
      { path: "Major-label deal", cut: "~80% to the label", keep: "≈ $150–200", note: "A standard artist royalty is 15–20% — and the label recoups its advances before you see a cent." },
      { path: "Manager only", cut: "15–20%", keep: "≈ $800–850", note: "Just the manager's commission. A working career usually also needs an agent, a lawyer and a business manager." },
      { path: "The full team stack", cut: "~40% combined", keep: "≈ $600", note: "Manager 20% + booking agent 10% + business manager 5% + legal 5%. Every cut stacks on the last." },
      { path: "Seshn", cut: "Flat 10%", keep: "$900", note: "Stripe processing fees included. No manager, no label, no agent required to get paid.", highlight: true },
    ] as FeeRow[],
    footnote: "Industry figures are typical published ranges, not guarantees — commissions and label royalty splits vary by deal (manager 15–20%, booking agent ~10%, business manager 5%, legal ~5%; major-label artist royalties run 15–20% before the label recoups its advances). Even next to creative marketplaces — Fiverr takes 20%, AirGigs 8–15%, SoundBetter ~10% before card fees — Seshn's flat 10% is the only fee on a paid booking and includes Stripe processing. Split and trade collaborations are always free. Sources: docs/marketing-sources.md.",
  },

  meta: { brand: "Seshn", tagline: "Find the people who finish your record.", year: 2026 },
};
