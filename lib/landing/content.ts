// Seshn marketing copy. One file, all pages read from it. Plain, direct voice , 
// no em dashes, no filler. Written like a working musician talks.

export interface Pillar { n: string; h: string; b: string }
export interface Stat { big: string; h: string; p: string; src: string }
export interface HowStep { n: string; h: string; p: string; points: string[] }
export interface Feature { n: string; h: string; p: string }
export interface RoadmapItem { title: string; desc: string; state?: "shipped" | "in-progress" | "design" | "exploring" }
export interface RoadmapQuarter { q: string; status: string; tone: "live" | "next" | "later" | "vision"; h: string; tagline: string; items: RoadmapItem[] }
export interface Suggestion { upvotes: number; body: string; tag: string }
export interface FeatureDeep { n: string; h: string; lead: string; body: string; points: string[]; solves: string }
export interface ProblemDeep { stat: string; label: string; h: string; body: string; src: string }
export interface FeeRow { path: string; cut: string; keep: string; note: string; highlight?: boolean }

export const SESHN = {
  mission: {
    eyebrow: "Our mission",
    headline: "The hard part of making music was never writing it. It's finding the right people to make it with.",
    statement:
      "We built Seshn for the millions of artists the streaming era left without a support system. The producer with a beat that's 80 percent there. The vocalist between projects. The drummer who's free the second week of June. It's a place where the work does the talking, the ratings are real, the money actually moves, and working together is normal instead of a hassle.",
    pillars: [
      { n: "01", h: "Trust beats follower count.", b: "Every rating comes off a real session. Every profile is vetted. No bot DMs. The size of your following counts for almost nothing here, and that's the point." },
      { n: "02", h: "The work goes first.", b: "Profiles lead with audio, not a bio. Briefs lead with the role, not a brand. We hide follower counts on purpose, so people judge you on what you make." },
      { n: "03", h: "You keep what you make.", b: "Payouts run through Stripe with one flat fee: 10 percent on paid bookings, and that 10 percent already covers Stripe's card fees. So the rate you agree is the rate you keep 90 percent of. No manager, label, or agent taking a slice on top. Splits and trades cost nothing, and Pro is a flat 5 dollars a month, never a cut of your work." },
      { n: "04", h: "Built by musicians, out in the open.", b: "Features ship because someone on the team needed one at 11pm on a Tuesday. The roadmap is public. The suggestion box is open. You push it where it goes." },
    ] as Pillar[],
    why_now: {
      h: "Why now",
      paragraphs: [
        "Independent artists now make more than half of all music streamed worldwide. The gatekeepers are gone, and so is everything they used to handle for you. The average musician has more reach than ever and less support than ever.",
        "At the same time, money is now the number one reason people quit music, up from fourth a couple of years ago. Streaming pays a sliver of a cent a play. Followers don't cover rent. The way through isn't going viral on your own. It's working with people, getting paid for it, and building a small circle you trust.",
        "Seshn is the home base for that circle. The thing we wanted when we started out and never had.",
      ],
    },
    pledge: {
      h: "What we promise",
      points: [
        "We will never sell your data or train AI on your unreleased work.",
        "Our fee stays flat and out in the open: 10 percent on paid bookings, card fees included, nothing stacked on top. Pro is always a flat price, never a cut of what you earn.",
        "Public roadmap, public changelog. If we ever kill a feature you rely on, you hear it from us first.",
        "The free tier is permanent. Not a trial, not a teaser.",
      ],
    },
  },

  stats: [
    { big: "96%", h: "of new music is independent or DIY.", p: "More people are going it alone than ever, with nothing that helps them find, vet, and pay the people they need. The missing piece isn't more uploads. It's a way to actually connect.", src: "Luminate Year-End Report, 2025" },
    { big: "100K+", h: "songs hit streaming every day.", p: "Roughly 35 a minute. Just putting it out there stopped being a plan a long time ago. Getting heard now comes down to who you know and who you work with.", src: "Luminate Year-End Report, 2025" },
    { big: "77.8%", h: "make under $15K a year from music.", p: "Most artists earn next to nothing from it, and money is now the top reason people walk away.", src: "Xposure Music, State of the Industry 2025" },
    { big: "0.2%", h: "of tracks pull half of all streams.", p: "About 541,000 tracks, a fifth of one percent of everything out there, take half of all global plays. Going viral solo is a lottery ticket. Building a circle and getting paid is not.", src: "Luminate Year-End Report, 2025" },
  ] as Stat[],

  how: [
    { n: "01", h: "Post what you actually need.", p: "Role, genre, pay, deadline. About 90 seconds. Skip the bio, the work speaks for you.", points: ["One simple form. No resume, no follower counts.", "Set it up front: paid, split, or trade.", "Boost it to the top of every matched feed."] },
    { n: "02", h: "Find your people.", p: "Filter by role, genre, pay, and location. Hear the work before you read a word. Ratings come off real sessions, never anonymous.", points: ["Search by sound. Listen first.", "Ratings from real, finished work.", "Reach out free. Pro lets you message anyone first."] },
    { n: "03", h: "Make the record.", p: "A room per project: chat, audio, stems, deadlines, voice notes. Out of the group chat and into one place.", points: ["Inline audio with waveform playback.", "Members, roles, deadlines, and the brief, all in sync.", "Ratings when the work ships."] },
  ] as HowStep[],

  features: [
    { n: "F.01", h: "Profiles you can hear", p: "Every profile is a portfolio you press play on. SoundCloud, Spotify, YouTube, all in one player." },
    { n: "F.02", h: "Search by what people make", p: "Filter by role, genre, pay, and location. Real signal, no follower-count theatre." },
    { n: "F.03", h: "Project rooms", p: "Chat, stems, voice notes, and deadlines in one place instead of piling up in a group chat." },
    { n: "F.04", h: "Ratings that mean something", p: "Reviews from people you actually worked with. No bot stars, no paid placements." },
    { n: "F.05", h: "Get paid through Stripe", p: "Set a rate, split, or trade. One flat 10 percent on paid bookings, card fees included. Splits and trades are free, and escrow holds the money until the work's approved." },
    { n: "F.06", h: "Boost", p: "Five dollars puts your post at the top of every matched feed for a week." },
  ] as Feature[],

  roadmap: [
    { q: "Q3 2026", status: "shipping now", tone: "live", h: "The foundation", tagline: "Get the core undeniably right.", items: [
      { title: "Verified profiles", desc: "Light ID and work checks. A verified badge for Pro members.", state: "shipped" },
      { title: "Stripe escrow", desc: "Money held by Seshn and released on delivery. Both sides covered.", state: "shipped" },
      { title: "Audio studio v2", desc: "Comment right on the waveform. Drop a note at 1:42 and the reply stays with it.", state: "in-progress" },
      { title: "Mobile app, public beta", desc: "iOS and Android, with push for new matches, replies, and stems.", state: "in-progress" },
      { title: "Refer a collaborator", desc: "Bring in someone you've worked with and you both get a month of Pro.", state: "shipped" },
    ] },
    { q: "Q4 2026", status: "in design", tone: "next", h: "The tools", tagline: "Replace the spreadsheet, the doc, and the group chat.", items: [
      { title: "Splits and royalty sheets", desc: "Splits built from who did what in the room. Sign and send to your PRO.", state: "design" },
      { title: "Session calendar", desc: "Sync project deadlines to your calendar, with clash detection between collaborators.", state: "design" },
      { title: "Stem library", desc: "Reusable stems you license to other members on your own terms.", state: "design" },
      { title: "Brief coach (opt-in)", desc: "Points out what's missing on your brief before you post it. Never writes it for you.", state: "design" },
    ] },
    { q: "Q1 2027", status: "exploring", tone: "later", h: "The network", tagline: "Make the platform carry its weight.", items: [
      { title: "Sync licensing", desc: "Music supervisors browse members directly. You set the rate and keep the rights.", state: "exploring" },
      { title: "Live session booking", desc: "Book a session player for a set date in a set city.", state: "exploring" },
      { title: "Seshn for studios", desc: "Studios list rooms, post engineer needs, and sell remote sessions. Free for venues under five rooms.", state: "exploring" },
      { title: "Community channels", desc: "Closed, moderated channels by genre and city. Like a Discord without the noise.", state: "exploring" },
    ] },
    { q: "Q2 2027", status: "north star", tone: "vision", h: "The industry", tagline: "Build the layer between the bedroom and the major.", items: [
      { title: "A&R and investor portal", desc: "Vetted A&Rs and indie investors browse Pro members. Always opt-in, always clear." },
      { title: "Crowdfunded projects", desc: "Members back a room they want to hear. It funds the recording and shares the upside." },
      { title: "Royalty tracking", desc: "Pull stream counts and earnings from every service into one place. Pay your collaborators automatically." },
      { title: "Mentorship", desc: "Pros mentor newer artists at a flat hourly rate. Vetted, rated, paid through Seshn." },
    ] },
  ] as RoadmapQuarter[],

  suggestion_examples: [
    { upvotes: 287, body: "Let me set visibility per track. I want collaborators to hear my B-sides, not the whole internet.", tag: "Profile" },
    { upvotes: 241, body: "Availability statuses like Discord. Open to work, booked through August, archived.", tag: "Profile" },
    { upvotes: 196, body: "Push notifications for voice-note replies in a project room.", tag: "Mobile" },
    { upvotes: 154, body: "A calendar block for studio days so collaborators can see when I'm in without DMing.", tag: "Project Rooms" },
    { upvotes: 132, body: "Anonymous posts for label A&Rs who don't want to tip their hand early.", tag: "Discovery" },
    { upvotes: 118, body: "A lo-fi preview that hides the unmastered version from anyone outside the room.", tag: "Audio" },
    { upvotes: 94, body: "Break ratings into communication, on-time delivery, and musical fit instead of one number.", tag: "Trust" },
    { upvotes: 82, body: "Export the full project and splits sheet as one PDF for PRO registration.", tag: "Payouts" },
  ] as Suggestion[],

  featuresDeep: [
    { n: "01", h: "Profiles you can hear", lead: "A profile you press play on, not a wall of text nobody reads.", body: "Most platforms make you sell yourself in a bio. Here the music goes first. One player wraps SoundCloud, Spotify, YouTube, and direct uploads, so a producer in Lagos and a vocalist in London hear the same thing the same way.", points: ["One player for SoundCloud, Spotify, YouTube, and WAV", "Pin your three strongest tracks up top", "Private B-sides only people in your room can hear", "Clean waveforms, no ugly third-party embeds"], solves: "For when you've got 9k monthly listeners but every request comes from someone who never heard a note of it." },
    { n: "02", h: "Search by what people make", lead: "Find people by what they make and how they work, not who has the most followers.", body: "Search is built around the brief, not the brand. Filter by role, genre, pay, location, availability, and rating. Follower counts are hidden on purpose, so a 200-follower engineer with a 4.9 outranks a 90k account that ghosts.", points: ["Filter by role, genre, pay, location, availability", "Follower counts hidden by design", "Open to work, booked, or archived statuses", "Save a search and get a ping when a match joins"], solves: "For when every search tool just shows you the biggest accounts instead of the right ones." },
    { n: "03", h: "Project rooms", lead: "One room per record. Chat, stems, deadlines, and versions, out of the group chat for good.", body: "When a collab starts, open a private room. Audio with comments pinned to the timecode, file versioning so you never lose the take you wanted, a shared deadline, and a member list with roles. When it ships, ratings go out.", points: ["Audio with comments pinned to the timecode", "File versions, so v1, v2 and v3 never overwrite", "A shared deadline on everyone's calendar", "Ratings when the work is done"], solves: "For when a project lives across three group chats, a Drive folder, and somebody's voice memos." },
    { n: "04", h: "Ratings that mean something", lead: "Every rating comes off a real, finished session. No anonymous reviews, no bot stars.", body: "Trust is the whole game. You can only rate someone you actually shared a room with, and the score breaks into communication, on-time delivery, and musical fit, so the number tells you something real.", points: ["Ratings only from real, finished work", "Broken into communication, timeliness, and fit", "Verified badge for Pro members", "Reports reviewed by real people"], solves: "For when you agreed to a remote session and they took the deposit and vanished." },
    { n: "05", h: "Get paid properly", lead: "Set your rate, split, or trade up front. Through Stripe. One flat 10 percent on paid bookings, card fees included. Splits and trades are free.", body: "The money is in the brief before anyone applies, so there's no awkward DM haggling. The client pays the rate you agreed, you keep 90 percent. You get paid through Stripe, the money sits in escrow until the work's approved, and you can pull a splits sheet straight from the room for your PRO. Our only cut is a flat 10 percent on a paid booking, and that covers the card fees too. No separate processing charge, no team commission on top.", points: ["Pay type stated up front: paid, split, or trade", "Stripe payouts, flat 10 percent with fees included, free on splits and trades", "Escrow holds the money until delivery is approved", "Splits sheets built straight from the room"], solves: "For when nobody settled the money up front and now the song's done and it's weird." },
    { n: "06", h: "Boost", lead: "When a brief matters, put it in front of every matched artist for a week.", body: "Most posts find people on their own. When you're on a clock, a deadline or a label deliverable, Boost pins your brief to the top of every matched feed and pushes it to the people who fit best. Five dollars one-time, or a free credit every month on Pro.", points: ["Top of every matched feed for 7 days", "A push to your strongest matches", "Boosted badge and a ranking lift", "Five dollars one-time, or a free monthly credit on Pro"], solves: "For when you post a paid gig and four people see it because the feed buried it." },
  ] as FeatureDeep[],

  problemsDeep: [
    { stat: "96%", label: "of new uploads are indie or DIY", h: "Discovery is broken, and trust is worse.", body: "Independent and DIY releases are now 96 percent of everything uploaded to streaming. More people working without a label than ever, and nothing that helps them find, vet, or trust a collaborator. Reddit and Discord are full of threads asking how to find a vocalist who won't ghost, with no good answer. No track record, no ratings, no recourse when someone disappears with your stems or your deposit.", src: "Luminate Year-End Report 2025" },
    { stat: "100K+", label: "songs uploaded a day", h: "Being seen stopped being a plan.", body: "More than 100,000 tracks land on streaming every day, and almost half of everything out there got fewer than ten plays last year. Put it out and let the algorithm find you is dead. What still works is a good record made by the right people, and that takes collaboration, not more uploads.", src: "Luminate 2025" },
    { stat: "64%", label: "say money is why they'd quit", h: "The money pushes people out.", body: "Most independent musicians earn under $15,000 a year from music, and money is now the top reason they'd walk away, up sharply in two years. Going it alone is slow and expensive. Sharing the work, splitting it, and getting paid for sessions is how working musicians actually keep going.", src: "Xposure State of the Industry 2025" },
    { stat: "0.2%", label: "of tracks pull half the streams", h: "The middle of the industry disappeared.", body: "About 0.2 percent of tracks, roughly 541,000 of more than 253 million, take half of all global plays, while almost half get fewer than ten a year. The way back isn't going viral alone. It's building a network, a name, and a body of work that adds up.", src: "Luminate Year-End Report 2025" },
  ] as ProblemDeep[],

  feeComparison: {
    eyebrow: "What you actually keep",
    headline: "Keep more of what you earn, without a whole team taking a cut.",
    sub: "The old way to build a career meant handing slices to a manager, an agent, a lawyer, and a label before you saw a dollar. Seshn is one flat 10 percent with Stripe's card fees already inside it, so more of every booking stays with the person who did the work.",
    basisLabel: "On every $1,000 you earn from a paid collaboration",
    rows: [
      { path: "Major-label deal", cut: "~80% to the label", keep: "about $150 to $200", note: "A standard artist royalty is 15 to 20 percent, and the label recoups its advances before you see a cent." },
      { path: "Manager only", cut: "15 to 20%", keep: "about $800 to $850", note: "Just the manager's cut. A working career usually also needs an agent, a lawyer, and a business manager." },
      { path: "The full team", cut: "~40% combined", keep: "about $600", note: "Manager 20, booking agent 10, business manager 5, legal 5. Every cut stacks on the last." },
      { path: "Seshn", cut: "Flat 10%", keep: "$900", note: "Card fees included. No manager, label, or agent needed to get paid.", highlight: true },
    ] as FeeRow[],
    footnote: "These are typical published rates, not promises, and they vary by deal: manager 15 to 20 percent, booking agent around 10, business manager 5, legal around 5, and major-label royalties of 15 to 20 percent before the label recoups its advances. Even next to other marketplaces, where Fiverr takes 20 percent, AirGigs 8 to 15, and SoundBetter around 10 before card fees, Seshn's flat 10 percent is the only fee on a paid booking and it includes Stripe processing. Splits and trades are always free. Sources in docs/marketing-sources.md.",
  },

  meta: { brand: "Seshn", tagline: "Find the people who finish your record.", year: 2026 },
};
